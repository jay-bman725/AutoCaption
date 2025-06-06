const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const OpenAI = require('openai');
const https = require('https');

let mainWindow;
let openai;
let updateCheckInterval;

// Current app version
const CURRENT_VERSION = '1.0.0';
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/jay-bman725/AutoCaption/refs/heads/main/version';

// Path for storing the API key and settings
const configDir = path.join(app.getPath('userData'), 'config');
const apiKeyFile = path.join(configDir, 'api-key.json');
const settingsFile = path.join(configDir, 'settings.json');

// Default settings
const defaultSettings = {
  autoCheckUpdates: true,
  lastUpdateCheck: null
};

// Ensure config directory exists
async function ensureConfigDir() {
  try {
    await fsPromises.mkdir(configDir, { recursive: true });
  } catch (error) {
    console.error('Error creating config directory:', error);
  }
}

// Save API key to file
async function saveApiKey(apiKey) {
  try {
    await ensureConfigDir();
    const config = { apiKey };
    await fsPromises.writeFile(apiKeyFile, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
}

// Load API key from file
async function loadApiKey() {
  try {
    const data = await fsPromises.readFile(apiKeyFile, 'utf8');
    const config = JSON.parse(data);
    return config.apiKey;
  } catch (error) {
    // File doesn't exist or is invalid, return null
    return null;
  }
}

// Initialize OpenAI with API key
function initializeOpenAI(apiKey) {
  openai = new OpenAI({
    apiKey: apiKey
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', async () => {
    // Try to load saved API key
    const savedApiKey = await loadApiKey();
    if (savedApiKey) {
      try {
        initializeOpenAI(savedApiKey);
        // Test the API key
        await openai.models.list();
        // Send the saved API key status to renderer
        mainWindow.webContents.send('api-key-loaded', { success: true });
      } catch (error) {
        console.error('Saved API key is invalid:', error);
        // Send failure status to renderer
        mainWindow.webContents.send('api-key-loaded', { success: false });
      }
    }
    
    // Start automatic update checking
    await startAutoUpdateCheck();
    
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopAutoUpdateCheck();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-api-key', async (event, apiKey) => {
  try {
    // Save the API key to file
    const saved = await saveApiKey(apiKey);
    if (!saved) {
      return { success: false, error: 'Failed to save API key' };
    }

    initializeOpenAI(apiKey);
    
    // Test the API key
    await openai.models.list();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3', 'wav', 'mp4', 'avi', 'mov', 'mkv', 'flv', 'webm', 'm4a', 'aac', 'ogg', 'wma']
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, filePath: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('transcribe-audio', async (event, filePath) => {
  if (!openai) {
    return { success: false, error: 'API key not set' };
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    return { success: true, srt: transcription };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-srt-file', async (event, srtContent) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'captions.srt',
    filters: [
      { name: 'SubRip Files', extensions: ['srt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    try {
      await fsPromises.writeFile(result.filePath, srtContent, 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

// Settings IPC handlers
ipcMain.handle('get-settings', async () => {
  try {
    const settings = await loadSettings();
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  try {
    const currentSettings = await loadSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    const saved = await saveSettings(updatedSettings);
    
    if (saved) {
      // Restart or stop auto update checking based on new settings
      stopAutoUpdateCheck();
      if (updatedSettings.autoCheckUpdates) {
        await startAutoUpdateCheck();
      }
      return { success: true, settings: updatedSettings };
    } else {
      return { success: false, error: 'Failed to save settings' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Manual update check
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await checkForUpdates();
    if (result.success) {
      showUpdateDialog(result, true);
      // Update last check time
      const settings = await loadSettings();
      settings.lastUpdateCheck = Date.now();
      await saveSettings(settings);
    }
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load settings from file
async function loadSettings() {
  try {
    const data = await fsPromises.readFile(settingsFile, 'utf8');
    const settings = JSON.parse(data);
    return { ...defaultSettings, ...settings };
  } catch (error) {
    // File doesn't exist or is invalid, return default settings
    return defaultSettings;
  }
}

// Save settings to file
async function saveSettings(settings) {
  try {
    await ensureConfigDir();
    await fsPromises.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Check for updates
async function checkForUpdates() {
  return new Promise((resolve) => {
    const request = https.get(UPDATE_CHECK_URL, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const latestVersion = data.trim();
          const hasUpdate = compareVersions(CURRENT_VERSION, latestVersion);
          resolve({
            success: true,
            hasUpdate,
            currentVersion: CURRENT_VERSION,
            latestVersion
          });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    });
    
    request.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

// Compare version strings (returns true if latestVersion is newer than currentVersion)
function compareVersions(current, latest) {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  
  return false;
}

// Start automatic update checking
async function startAutoUpdateCheck() {
  const settings = await loadSettings();
  if (!settings.autoCheckUpdates) return;
  
  // Check immediately on startup
  setTimeout(async () => {
    const result = await checkForUpdates();
    if (result.success && result.hasUpdate && mainWindow) {
      showUpdateDialog(result, false);
    }
    // Update last check time
    const updatedSettings = await loadSettings();
    updatedSettings.lastUpdateCheck = Date.now();
    await saveSettings(updatedSettings);
  }, 5000); // Wait 5 seconds after startup
  
  // Set up hourly checks
  updateCheckInterval = setInterval(async () => {
    const currentSettings = await loadSettings();
    if (!currentSettings.autoCheckUpdates) return;
    
    const result = await checkForUpdates();
    if (result.success && result.hasUpdate && mainWindow) {
      showUpdateDialog(result, false);
    }
    // Update last check time
    currentSettings.lastUpdateCheck = Date.now();
    await saveSettings(currentSettings);
  }, 60 * 60 * 1000); // Check every hour
}

// Show update dialog
function showUpdateDialog(updateResult, isManual) {
  if (!mainWindow) return;
  
  if (updateResult.hasUpdate) {
    const options = {
      type: 'info',
      title: 'Update Available',
      message: `A new version of AutoCaption is available!`,
      detail: `Current version: ${updateResult.currentVersion}\nNew version: ${updateResult.latestVersion}\n\nWould you like to download the update?`,
      buttons: ['Download Update', 'Later'],
      defaultId: 0
    };
    
    dialog.showMessageBox(mainWindow, options).then((response) => {
      if (response.response === 0) {
        // Open GitHub releases page
        shell.openExternal('https://github.com/jay-bman725/AutoCaption/releases');
      }
    });
  } else if (isManual) {
    // Only show "no updates" dialog if manually triggered
    const options = {
      type: 'info',
      title: 'No Updates Available',
      message: 'You are running the latest version of AutoCaption.',
      detail: `Current version: ${updateResult.currentVersion}`,
      buttons: ['OK']
    };
    
    dialog.showMessageBox(mainWindow, options);
  }
}

// Stop automatic update checking
function stopAutoUpdateCheck() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

// Start update checking interval on app ready
app.whenReady().then(async () => {
  const settings = await loadSettings();
  if (settings.autoCheckUpdates) {
    updateCheckInterval = setInterval(checkForUpdates, 60 * 60 * 1000); // Check every hour
  }
});
