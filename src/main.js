const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const OpenAI = require('openai');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');

// Internet connectivity checking
let isOnline = true;
let connectivityCheckInterval;
let connectivityRetryInterval;
const CONNECTIVITY_CHECK_INTERVAL = 10000; // 10 seconds
const CONNECTIVITY_RETRY_INTERVAL = 30000; // 30 seconds when offline
const CONNECTIVITY_TIMEOUT = 5000; // 5 seconds timeout

// Check internet connectivity by trying to reach Google
function checkInternetConnectivity() {
  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'google.com',
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: CONNECTIVITY_TIMEOUT
    }, (res) => {
      resolve(true);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.setTimeout(CONNECTIVITY_TIMEOUT);
    request.end();
  });
}

// Handle connectivity state changes
async function handleConnectivityChange(online) {
  const wasOnline = isOnline;
  isOnline = online;

  logger.info(`Connectivity status changed: ${online ? 'online' : 'offline'}`);

  if (mainWindow) {
    mainWindow.webContents.send('connectivity-status', { isOnline: online });
  }

  // If we just went offline, start more frequent retry checking
  if (wasOnline && !online) {
    logger.info('Device went offline, starting retry interval');
    startConnectivityRetryInterval();
  }
  // If we just came back online, stop retry checking and resume normal checking
  else if (!wasOnline && online) {
    logger.info('Device came back online, stopping retry interval');
    stopConnectivityRetryInterval();
  }
}

// Start normal connectivity checking (every 10 seconds)
function startConnectivityChecking() {
  logger.info('Starting connectivity checking');
  
  // Initial check
  checkInternetConnectivity().then(handleConnectivityChange);
  
  // Set up regular checking
  connectivityCheckInterval = setInterval(async () => {
    if (isOnline) { // Only do regular checks when we think we're online
      const online = await checkInternetConnectivity();
      if (online !== isOnline) {
        await handleConnectivityChange(online);
      }
    }
  }, CONNECTIVITY_CHECK_INTERVAL);
}

// Start aggressive retry checking (every 30 seconds when offline)
function startConnectivityRetryInterval() {
  if (connectivityRetryInterval) {
    clearInterval(connectivityRetryInterval);
  }
  
  connectivityRetryInterval = setInterval(async () => {
    logger.debug('Retry connectivity check (offline state)');
    const online = await checkInternetConnectivity();
    if (online !== isOnline) {
      await handleConnectivityChange(online);
    }
  }, CONNECTIVITY_RETRY_INTERVAL);
}

// Stop retry checking
function stopConnectivityRetryInterval() {
  if (connectivityRetryInterval) {
    clearInterval(connectivityRetryInterval);
    connectivityRetryInterval = null;
  }
}

// Stop all connectivity checking
function stopConnectivityChecking() {
  logger.info('Stopping connectivity checking');
  if (connectivityCheckInterval) {
    clearInterval(connectivityCheckInterval);
    connectivityCheckInterval = null;
  }
  stopConnectivityRetryInterval();
}

// Debug logging setup
const debugLogsDir = path.join(app.getPath('userData'), 'logs');
const debugLogFile = path.join(debugLogsDir, 'debug.log');
const maxLogSize = 5 * 1024 * 1024; // 5MB
const maxLogFiles = 5;

// Ensure logs directory exists
async function ensureLogsDir() {
  try {
    await fsPromises.mkdir(debugLogsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating logs directory:', error);
  }
}

// Rotate log files if they get too large
async function rotateLogFiles() {
  try {
    const stats = await fsPromises.stat(debugLogFile);
    if (stats.size > maxLogSize) {
      // Rotate existing files
      for (let i = maxLogFiles - 1; i >= 1; i--) {
        const oldFile = `${debugLogFile}.${i}`;
        const newFile = `${debugLogFile}.${i + 1}`;
        try {
          await fsPromises.rename(oldFile, newFile);
        } catch (error) {
          // File might not exist, ignore
        }
      }
      // Move current log to .1
      await fsPromises.rename(debugLogFile, `${debugLogFile}.1`);
    }
  } catch (error) {
    // Log file might not exist, ignore
  }
}

// Debug logging function
async function debugLog(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
  
  // Also log to console
  console.log(`[DEBUG] ${message}`, ...args);
  
  try {
    await ensureLogsDir();
    await rotateLogFiles();
    await fsPromises.appendFile(debugLogFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Error writing to debug log:', error);
  }
}

// Convenience logging functions
const logger = {
  info: (message, ...args) => debugLog('info', message, ...args),
  error: (message, ...args) => debugLog('error', message, ...args),
  warn: (message, ...args) => debugLog('warn', message, ...args),
  debug: (message, ...args) => debugLog('debug', message, ...args)
};

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
const CURRENT_VERSION = '1.5.2';
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/jay-bman725/AutoCaption/refs/heads/main/version';
const CHANGELOG_URL = 'https://raw.githubusercontent.com/jay-bman725/AutoCaption/refs/heads/main/changelog.md';

// Path for storing the API key and settings
const configDir = path.join(app.getPath('userData'), 'config');
const apiKeyFile = path.join(configDir, 'api-key.json');
const settingsFile = path.join(configDir, 'settings.json');

// Default settings
const defaultSettings = {
  autoCheckUpdates: true,
  lastUpdateCheck: null,
  theme: 'system',
  onboardingCompleted: false,
  onboardingVersion: null,
  onboardingSteps: {
    welcome: false,
    apiKey: false,
    theme: false,
    complete: false
  }
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
    logger.info('Attempting to save API key');
    await ensureConfigDir();
    const config = { apiKey };
    await fsPromises.writeFile(apiKeyFile, JSON.stringify(config, null, 2), 'utf8');
    logger.info('API key saved successfully');
    return true;
  } catch (error) {
    logger.error('Error saving API key:', error);
    console.error('Error saving API key:', error);
    return false;
  }
}

// Load API key from file
async function loadApiKey() {
  try {
    logger.debug('Loading API key from file');
    const data = await fsPromises.readFile(apiKeyFile, 'utf8');
    const config = JSON.parse(data);
    logger.info('API key loaded successfully');
    return config.apiKey;
  } catch (error) {
    logger.debug('API key file not found or invalid, returning null');
    // File doesn't exist or is invalid, return null
    return null;
  }
}

// Initialize OpenAI with API key
function initializeOpenAI(apiKey) {
  logger.info('Initializing OpenAI client');
  openai = new OpenAI({
    apiKey: apiKey
  });
}

// Convert video to audio or compress large audio files using FFmpeg
async function convertToCompressedAudio(inputPath, useAggressiveCompression = false) {
  return new Promise((resolve, reject) => {
    logger.debug('Starting FFmpeg conversion/compression for:', inputPath, 'aggressive:', useAggressiveCompression);
    const tempDir = path.join(app.getPath('temp'), 'autocaption');
    const outputPath = path.join(tempDir, `processed_${Date.now()}.mp3`);
    
    // Ensure temp directory exists
    fs.mkdirSync(tempDir, { recursive: true });
    
    const fileExtension = path.extname(inputPath).toLowerCase().substring(1);
    const isVideo = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm'].includes(fileExtension);
    const originalSizeMB = getFileSizeMB(inputPath);
    
    logger.info(`Converting ${isVideo ? 'video' : 'audio'} file: ${originalSizeMB.toFixed(2)}MB, aggressive: ${useAggressiveCompression}`);
    
    // Send progress update
    if (mainWindow) {
      let message;
      if (isVideo) {
        message = useAggressiveCompression ? '🔄 Converting video with heavy compression...' : '🔄 Converting video to MP3 audio...';
      } else {
        message = useAggressiveCompression ? `🔄 Applying heavy compression (${originalSizeMB.toFixed(2)} MB)...` : `🔄 Compressing large audio file (${originalSizeMB.toFixed(2)} MB)...`;
      }
      mainWindow.webContents.send('transcription-status', { message });
    }
    
    let ffmpegCommand = ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame');
    
    if (useAggressiveCompression) {
      // Heavy compression settings - may reduce quality significantly
      ffmpegCommand = ffmpegCommand
        .audioBitrate(64) // Very low bitrate
        .audioChannels(1) // Mono
        .audioFrequency(16000); // Lower sample rate
    } else if (isVideo || originalSizeMB > 25) {
      // Standard compression settings
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
            message = useAggressiveCompression ? `🔄 Converting with heavy compression... ${percent}%` : `🔄 Converting video... ${percent}%`;
          } else {
            message = useAggressiveCompression ? `🔄 Heavy compression... ${percent}%` : `🔄 Compressing audio... ${percent}%`;
          }
          mainWindow.webContents.send('transcription-status', { message });
        }
      })
      .on('end', () => {
        if (mainWindow) {
          const action = isVideo ? 'conversion' : 'compression';
          const compressionType = useAggressiveCompression ? 'heavy compression' : action;
          mainWindow.webContents.send('transcription-status', {
            message: `✅ Audio ${compressionType} completed. Checking file size...`
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
async function processAudioFile(filePath, useAggressiveCompression = false) {
  try {
    logger.info('Processing audio file:', filePath, 'aggressive:', useAggressiveCompression);
    const originalSizeMB = getFileSizeMB(filePath);
    const isVideo = isVideoFile(filePath);
    
    logger.debug(`File info: size=${originalSizeMB.toFixed(2)}MB, isVideo=${isVideo}, aggressive=${useAggressiveCompression}`);
    
    // If it's a video file, always convert to MP3
    // If it's an audio file and under 25MB, use original
    // If it's over 25MB, compress it
    if (isVideo || originalSizeMB > 25) {
      logger.info(`File needs processing (size: ${originalSizeMB.toFixed(2)}MB, isVideo: ${isVideo}, aggressive: ${useAggressiveCompression})`);
      const processedPath = await convertToCompressedAudio(filePath, useAggressiveCompression);
      
      // Check file size after processing
      const fileSizeMB = getFileSizeMB(processedPath);
      logger.debug(`Processed file size: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > 25) {
        logger.error(`Processed file still too large: ${fileSizeMB.toFixed(2)}MB`);
        // Clean up processed file
        try {
          fs.unlinkSync(processedPath);
        } catch (error) {
          logger.warn('Error cleaning up processed file:', error);
          console.error('Error cleaning up processed file:', error);
        }
        
        const action = isVideo ? "conversion and compression" : "compression";
        
        // If we haven't tried aggressive compression yet, offer that option
        if (!useAggressiveCompression) {
          return {
            success: false,
            error: `After ${action}, file size is ${fileSizeMB.toFixed(2)} MB, which exceeds OpenAI's 25MB limit.`,
            isFileSizeError: true,
            canCompressMore: true,
            originalSizeMB: originalSizeMB.toFixed(2),
            currentSizeMB: fileSizeMB.toFixed(2)
          };
        } else {
          // Already tried aggressive compression, no more options
          return {
            success: false,
            error: `Even after heavy compression, file size is ${fileSizeMB.toFixed(2)} MB, which exceeds OpenAI's 25MB limit. Please use a shorter audio/video file.`,
            isFileSizeError: true,
            canCompressMore: false,
            originalSizeMB: originalSizeMB.toFixed(2),
            currentSizeMB: fileSizeMB.toFixed(2)
          };
        }
      }
      
      logger.info(`File processed successfully: ${fileSizeMB.toFixed(2)}MB`);
      return {
        success: true,
        processedPath,
        wasCompressed: true,
        fileSizeMB: fileSizeMB.toFixed(2)
      };
    } else {
      // Audio file under 25MB - use original
      logger.info(`Using original file (${originalSizeMB.toFixed(2)}MB, under 25MB limit)`);
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
    logger.error('Error processing audio file:', error);
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
  logger.info('Creating main window');
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

  logger.debug('Loading main HTML file');
  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', async () => {
    logger.info('Main window ready to show');
    // Try to load saved API key
    const savedApiKey = await loadApiKey();
    if (savedApiKey) {
      try {
        initializeOpenAI(savedApiKey);
        // Test the API key
        await openai.models.list();
        logger.info('Saved API key is valid');
        // Send the saved API key status to renderer
        mainWindow.webContents.send('api-key-loaded', { success: true });
      } catch (error) {
        logger.warn('Saved API key is invalid:', error);
        console.error('Saved API key is invalid:', error);
        // Send failure status to renderer
        mainWindow.webContents.send('api-key-loaded', { success: false });
      }
    } else {
      logger.debug('No saved API key found');
    }
    
    // Start automatic update checking
    await startAutoUpdateCheck();
    
    // Start connectivity checking
    startConnectivityChecking();
    
    logger.info('Showing main window');
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    logger.debug('Development mode detected, opening DevTools');
    mainWindow.webContents.openDevTools();
  }
}

// Create application menu
function createApplicationMenu() {
  logger.info('Creating application menu');
  const template = [
    {
      label: 'AutoCaption',
      submenu: [
        {
          label: 'Check for Updates',
          click: async () => {
            logger.info('Check for Updates menu item clicked');
            if (mainWindow) {
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
              } catch (error) {
                logger.error('Error checking for updates:', error);
              }
            }
          }
        },
        {
          label: 'Settings',
          click: () => {
            logger.info('Settings menu item clicked');
            if (mainWindow) {
              mainWindow.webContents.send('open-settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
          click: () => { app.quit(); }
        },
        {
          label: 'Reload',
          accelerator: process.platform === 'darwin' ? 'Command+R' : 'Ctrl+R',
          click: () => {
            logger.info('Reload menu item clicked');
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  logger.info('AutoCaption application starting up', { version: CURRENT_VERSION });
  createApplicationMenu();
  await createWindow();
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  stopAutoUpdateCheck();
  stopConnectivityChecking();
  if (process.platform !== 'darwin') {
    logger.info('Quitting application');
    app.quit();
  }
});

app.on('activate', () => {
  logger.debug('Application activated');
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
    logger.info('Setting API key');
    // Save the API key to file
    const saved = await saveApiKey(apiKey);
    if (!saved) {
      logger.error('Failed to save API key to file');
      return { success: false, error: 'Failed to save API key' };
    }

    initializeOpenAI(apiKey);
    
    // Test the API key
    logger.debug('Testing API key by listing models');
    await openai.models.list();
    logger.info('API key validation successful');
    return { success: true };
  } catch (error) {
    logger.error('API key validation failed:', error);
    return { success: false, error: error.message };
  }
});

// Get API key status
ipcMain.handle('get-api-key-status', async () => {
  try {
    const apiKey = await loadApiKey();
    return { 
      success: true, 
      hasApiKey: apiKey !== null && apiKey !== undefined && apiKey.trim().length > 0 
    };
  } catch (error) {
    logger.error('Error checking API key status:', error);
    return { success: false, error: error.message };
  }
});

// Remove API key
ipcMain.handle('remove-api-key', async () => {
  try {
    logger.info('Removing API key');
    // Remove the API key file
    if (fs.existsSync(apiKeyFile)) {
      await fsPromises.unlink(apiKeyFile);
      logger.info('API key file removed successfully');
    }
    
    // Clear the OpenAI instance
    openai = null;
    
    return { success: true };
  } catch (error) {
    logger.error('Error removing API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-audio-file', async () => {
  logger.info('Opening file selection dialog');
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
    logger.info('File selected:', result.filePaths[0]);
    return { success: true, filePath: result.filePaths[0] };
  }
  logger.debug('File selection canceled');
  return { success: false };
});

// Show file size choice dialog
ipcMain.handle('show-file-size-dialog', async (event, dialogData) => {
  logger.info('Showing file size dialog');
  
  const options = {
    type: 'question',
    buttons: ['Try Heavy Compression', 'Choose Different File', 'Cancel'],
    defaultId: 0,
    title: 'File Too Large',
    message: 'File size exceeds 25MB limit',
    detail: `Original size: ${dialogData.originalSizeMB} MB\nAfter compression: ${dialogData.currentSizeMB} MB\n\nOptions:\n• Try heavy compression (may reduce audio quality)\n• Choose a different file\n• Cancel transcription`
  };

  const result = await dialog.showMessageBox(mainWindow, options);
  
  logger.debug('File size dialog result:', result.response);
  
  // Return the user's choice
  switch (result.response) {
    case 0: // Try Heavy Compression
      return { action: 'compress', cancelled: false };
    case 1: // Choose Different File
      return { action: 'selectFile', cancelled: false };
    case 2: // Cancel
    default:
      return { action: 'cancel', cancelled: true };
  }
});

ipcMain.handle('transcribe-audio', async (event, filePath, useAggressiveCompression = false) => {
  if (!openai) {
    logger.error('Transcription attempted without API key set');
    return { success: false, error: 'API key not set' };
  }

  try {
    logger.info('Starting transcription for file:', filePath, 'aggressive:', useAggressiveCompression);
    // Process the audio file (always compress, then check size)
    const processResult = await processAudioFile(filePath, useAggressiveCompression);
    
    if (!processResult.success) {
      logger.error('Audio file processing failed:', processResult.error);
      return processResult;
    }
    
    const { processedPath, wasCompressed, fileSizeMB } = processResult;
    logger.info(`Audio processing complete. Size: ${fileSizeMB}MB, Compressed: ${wasCompressed}`);
    
    // Send status update about file processing
    if (mainWindow) {
      mainWindow.webContents.send('transcription-status', {
        message: `✅ File compressed successfully (${fileSizeMB} MB). Starting transcription...`
      });
    }

    logger.debug('Sending file to OpenAI Whisper for transcription');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(processedPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    logger.info('Transcription completed successfully');

    // Clean up temporary processed file (only if it was compressed/converted)
    if (wasCompressed) {
      try {
        fs.unlinkSync(processedPath);
        logger.debug('Cleaned up temporary processed file');
      } catch (error) {
        logger.warn('Error cleaning up temporary processed file:', error);
        console.error('Error cleaning up temporary processed file:', error);
      }
    } else {
      logger.debug('No cleanup needed - original file was used');
    }

    return { success: true, srt: transcription };
  } catch (error) {
    logger.error('Transcription failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-srt-file', async (event, srtContent) => {
  logger.info('Saving SRT file');
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
      logger.info('SRT file saved successfully:', result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      logger.error('Error saving SRT file:', error);
      return { success: false, error: error.message };
    }
  }
  logger.debug('SRT file save canceled');
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

// Open debug logs
ipcMain.handle('open-debug-logs', async () => {
  try {
    logger.info('Opening debug logs file');
    await ensureLogsDir();
    
    // Check if debug log file exists
    if (!fs.existsSync(debugLogFile)) {
      logger.warn('Debug log file does not exist, creating it');
      await fsPromises.writeFile(debugLogFile, '# AutoCaption Debug Logs\n\n', 'utf8');
    }
    
    // Open the debug log file with the system's default text editor
    await shell.openPath(debugLogFile);
    return { success: true };
  } catch (error) {
    logger.error('Error opening debug logs:', error);
    return { success: false, error: error.message };
  }
});

// Theme management
ipcMain.handle('get-system-theme', async () => {
  try {
    return {
      success: true,
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    };
  } catch (error) {
    logger.error('Error getting system theme:', error);
    return { success: false, error: error.message };
  }
});

// Listen for system theme changes
nativeTheme.on('updated', () => {
  if (mainWindow) {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.send('system-theme-changed', { theme });
  }
});

// Platform detection
ipcMain.handle('get-platform', async () => {
  try {
    return {
      success: true,
      platform: process.platform
    };
  } catch (error) {
    logger.error('Error getting platform:', error);
    return { success: false, error: error.message };
  }
});

// Connectivity management
ipcMain.handle('retry-connectivity-check', async () => {
  try {
    logger.info('Manual connectivity retry requested');
    const online = await checkInternetConnectivity();
    if (online !== isOnline) {
      await handleConnectivityChange(online);
    }
    return { success: true, isOnline: online };
  } catch (error) {
    logger.error('Error during manual connectivity retry:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-connectivity-status', async () => {
  try {
    return { success: true, isOnline };
  } catch (error) {
    logger.error('Error getting connectivity status:', error);
    return { success: false, error: error.message };
  }
});

// Onboarding IPC handlers
ipcMain.handle('get-onboarding-status', async () => {
  try {
    const settings = await loadSettings();
    return {
      success: true,
      shouldShowOnboarding: !settings.onboardingCompleted || settings.onboardingVersion !== CURRENT_VERSION,
      onboardingSteps: settings.onboardingSteps || defaultSettings.onboardingSteps,
      currentVersion: CURRENT_VERSION,
      onboardingVersion: settings.onboardingVersion
    };
  } catch (error) {
    logger.error('Error getting onboarding status:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('complete-onboarding-step', async (event, stepName) => {
  try {
    const settings = await loadSettings();
    if (!settings.onboardingSteps) {
      settings.onboardingSteps = { ...defaultSettings.onboardingSteps };
    }
    settings.onboardingSteps[stepName] = true;
    
    const saved = await saveSettings(settings);
    return { success: saved };
  } catch (error) {
    logger.error('Error completing onboarding step:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('complete-onboarding', async () => {
  try {
    const settings = await loadSettings();
    settings.onboardingCompleted = true;
    settings.onboardingVersion = CURRENT_VERSION;
    settings.onboardingSteps = {
      welcome: true,
      apiKey: true,
      theme: true,
      complete: true
    };
    
    const saved = await saveSettings(settings);
    return { success: saved };
  } catch (error) {
    logger.error('Error completing onboarding:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('skip-onboarding', async () => {
  try {
    const settings = await loadSettings();
    settings.onboardingCompleted = true;
    settings.onboardingVersion = CURRENT_VERSION;
    // Mark as completed but don't mark individual steps as done
    // so if onboarding is triggered again, it shows what still needs to be done
    
    const saved = await saveSettings(settings);
    return { success: saved };
  } catch (error) {
    logger.error('Error skipping onboarding:', error);
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
