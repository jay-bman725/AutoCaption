const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const OpenAI = require('openai');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');

// Set FFmpeg path based on platform
function setFFmpegPath() {
  const platform = process.platform;
  let ffmpegPath;
  
  if (platform === 'darwin') {
    // macOS - try common locations
    const possiblePaths = [
      '/opt/homebrew/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg'
    ];
    ffmpegPath = possiblePaths.find(p => fs.existsSync(p));
  } else if (platform === 'win32') {
    // Windows - check if ffmpeg is in PATH or bundled
    ffmpegPath = 'ffmpeg'; // Assume it's in PATH
  } else {
    // Linux - check common locations
    const possiblePaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg'
    ];
    ffmpegPath = possiblePaths.find(p => fs.existsSync(p)) || 'ffmpeg';
  }
  
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('FFmpeg path set to:', ffmpegPath);
  } else {
    console.warn('FFmpeg not found at expected locations. Hoping it\'s in PATH...');
  }
}

let mainWindow;
let openai;
let updateCheckInterval;

// Current app version
const CURRENT_VERSION = '1.1.2';
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/jay-bman725/AutoCaption/refs/heads/main/version';
const CHANGELOG_URL = 'https://raw.githubusercontent.com/jay-bman725/AutoCaption/refs/heads/main/changelog.md';

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

// Convert video to audio or compress large audio files using FFmpeg
async function convertToCompressedAudio(inputPath) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(app.getPath('temp'), 'autocaption');
    const outputPath = path.join(tempDir, `processed_${Date.now()}.mp3`);
    
    // Ensure temp directory exists
    fs.mkdirSync(tempDir, { recursive: true });
    
    const fileExtension = path.extname(inputPath).toLowerCase().substring(1);
    const isVideo = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm'].includes(fileExtension);
    const originalSizeMB = getFileSizeMB(inputPath);
    
    // Send progress update
    if (mainWindow) {
      let message;
      if (isVideo) {
        message = '🔄 Converting video to MP3 audio...';
      } else {
        message = `🔄 Compressing large audio file (${originalSizeMB.toFixed(2)} MB)...`;
      }
      mainWindow.webContents.send('transcription-status', { message });
    }
    
    let ffmpegCommand = ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame');
    
    // For large files or videos, apply compression settings
    if (isVideo || originalSizeMB > 25) {
      ffmpegCommand = ffmpegCommand
        .audioBitrate(128) // Compress to 128kbps
        .audioChannels(1) // Mono to reduce file size
        .audioFrequency(22050); // Lower sample rate to reduce file size
    } else {
      // For smaller audio files that need format conversion, keep higher quality
      ffmpegCommand = ffmpegCommand
        .audioBitrate(192) // Higher quality for smaller files
        .audioChannels(2) // Keep stereo
        .audioFrequency(44100); // Keep standard sample rate
    }
    
    ffmpegCommand
      .on('progress', (progress) => {
        if (mainWindow && progress.percent) {
          const percent = Math.round(progress.percent);
          let message;
          if (isVideo) {
            message = `🔄 Converting video... ${percent}%`;
          } else {
            message = `🔄 Compressing audio... ${percent}%`;
          }
          mainWindow.webContents.send('transcription-status', { message });
        }
      })
      .on('end', () => {
        if (mainWindow) {
          const action = isVideo ? 'conversion' : 'compression';
          mainWindow.webContents.send('transcription-status', {
            message: `✅ Audio ${action} completed. Checking file size...`
          });
        }
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg processing error:', err);
        const action = isVideo ? 'Video conversion' : 'Audio compression';
        reject(new Error(`${action} failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

// Check if file is a video format
function isVideoFile(filePath) {
  const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm'];
  const extension = path.extname(filePath).toLowerCase().substring(1);
  return videoExtensions.includes(extension);
}

// Get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes / (1024 * 1024);
}

// Process audio file (check size first, compress only if needed)
async function processAudioFile(filePath) {
  try {
    const originalSizeMB = getFileSizeMB(filePath);
    const isVideo = isVideoFile(filePath);
    
    // If it's a video file, always convert to MP3
    // If it's an audio file and under 25MB, use original
    // If it's over 25MB, compress it
    if (isVideo || originalSizeMB > 25) {
      const processedPath = await convertToCompressedAudio(filePath);
      
      // Check file size after processing
      const fileSizeMB = getFileSizeMB(processedPath);
      
      if (fileSizeMB > 25) {
        // Clean up processed file
        try {
          fs.unlinkSync(processedPath);
        } catch (error) {
          console.error('Error cleaning up processed file:', error);
        }
        
        const action = isVideo ? "conversion and compression" : "compression";
        return {
          success: false,
          error: `After ${action}, file size is ${fileSizeMB.toFixed(2)} MB, which exceeds OpenAI's 25MB limit. Please use a shorter audio/video file.`,
          isFileSizeError: true
        };
      }
      
      return {
        success: true,
        processedPath,
        wasCompressed: true,
        fileSizeMB: fileSizeMB.toFixed(2)
      };
    } else {
      // Audio file under 25MB - use original
      if (mainWindow) {
        mainWindow.webContents.send('transcription-status', {
          message: `✅ Audio file is ${originalSizeMB.toFixed(2)} MB (under 25MB limit). Using original file.`
        });
      }
      
      return {
        success: true,
        processedPath: filePath,
        wasCompressed: false,
        fileSizeMB: originalSizeMB.toFixed(2)
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error processing file: ${error.message}`,
      isFileSizeError: false
    };
  }
}

// Clean up old temporary files
async function cleanupTempFiles() {
  try {
    const tempDir = path.join(app.getPath('temp'), 'autocaption');
    if (fs.existsSync(tempDir)) {
      const files = await fsPromises.readdir(tempDir);
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fsPromises.stat(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fsPromises.unlink(filePath);
          console.log('Cleaned up old temp file:', file);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
}

async function createWindow() {
  // Set up FFmpeg path
  setFFmpegPath();
  
  // Clean up old temporary files
  await cleanupTempFiles();
  
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
    // Process the audio file (always compress, then check size)
    const processResult = await processAudioFile(filePath);
    
    if (!processResult.success) {
      return processResult;
    }
    
    const { processedPath, wasCompressed, fileSizeMB } = processResult;
    
    // Send status update about file processing
    if (mainWindow) {
      mainWindow.webContents.send('transcription-status', {
        message: `✅ File compressed successfully (${fileSizeMB} MB). Starting transcription...`
      });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(processedPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    // Clean up compressed file
    try {
      fs.unlinkSync(processedPath);
    } catch (error) {
      console.error('Error cleaning up compressed file:', error);
    }

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
      const changelogResult = await fetchChangelog();
      showUpdateDialog(result, true, changelogResult);
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

// Fetch changelog from GitHub
async function fetchChangelog() {
  return new Promise((resolve) => {
    const request = https.get(CHANGELOG_URL, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          resolve({ success: true, changelog: data });
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

// Parse changelog to extract relevant entries
function parseChangelog(changelogText, latestVersion) {
  try {
    const lines = changelogText.split('\n');
    const entries = [];
    let currentEntry = null;
    let inEntry = false;
    
    for (const line of lines) {
      // Check for version header
      const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\]/);
      if (versionMatch) {
        // Save previous entry if exists
        if (currentEntry && inEntry) {
          entries.push(currentEntry);
        }
        
        const version = versionMatch[1];
        currentEntry = {
          version,
          content: [line]
        };
        inEntry = true;
        continue;
      }
      
      // If we're in an entry, add content
      if (inEntry && currentEntry) {
        // Stop when we hit the next version or end of changelog
        if (line.startsWith('## [') && !line.includes(currentEntry.version)) {
          entries.push(currentEntry);
          break;
        }
        currentEntry.content.push(line);
      }
    }
    
    // Add the last entry if exists
    if (currentEntry && inEntry) {
      entries.push(currentEntry);
    }
    
    // Return only the latest few versions (up to 3)
    return entries.slice(0, 3);
  } catch (error) {
    console.error('Error parsing changelog:', error);
    return [];
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
      const changelogResult = await fetchChangelog();
      showUpdateDialog(result, false, changelogResult);
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
      const changelogResult = await fetchChangelog();
      showUpdateDialog(result, false, changelogResult);
    }
    // Update last check time
    currentSettings.lastUpdateCheck = Date.now();
    await saveSettings(currentSettings);
  }, 60 * 60 * 1000); // Check every hour
}

// Show update dialog with custom changelog window
function showUpdateDialog(updateResult, isManual, changelogResult = null) {
  if (!mainWindow) return;
  
  if (updateResult.hasUpdate) {
    // Send update data to renderer process to show custom dialog
    const updateData = {
      currentVersion: updateResult.currentVersion,
      latestVersion: updateResult.latestVersion,
      changelog: changelogResult && changelogResult.success ? changelogResult.changelog : null
    };
    
    mainWindow.webContents.send('show-update-dialog', updateData);
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
