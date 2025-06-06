const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  transcribeAudio: (filePath) => ipcRenderer.invoke('transcribe-audio', filePath),
  saveSrtFile: (srtContent) => ipcRenderer.invoke('save-srt-file', srtContent),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Theme management
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  
  // Update checking
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Debug logs
  openDebugLogs: () => ipcRenderer.invoke('open-debug-logs'),
  
  // Listen for API key loaded event
  onApiKeyLoaded: (callback) => ipcRenderer.on('api-key-loaded', callback),
  
  // Listen for transcription status updates
  onTranscriptionStatus: (callback) => ipcRenderer.on('transcription-status', callback),
  
  // Listen for update dialog
  onShowUpdateDialog: (callback) => ipcRenderer.on('show-update-dialog', callback),
  
  // Listen for system theme changes
  onSystemThemeChanged: (callback) => ipcRenderer.on('system-theme-changed', callback)
});
