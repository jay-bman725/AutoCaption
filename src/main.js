const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const OpenAI = require('openai');

let mainWindow;
let openai;

// Path for storing the API key
const configDir = path.join(app.getPath('userData'), 'config');
const apiKeyFile = path.join(configDir, 'api-key.json');

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
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
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
