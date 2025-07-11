const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  getApiKeyStatus: () => ipcRenderer.invoke('get-api-key-status'),
  removeApiKey: () => ipcRenderer.invoke('remove-api-key'),
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  transcribeAudio: (filePath, useAggressiveCompression) => ipcRenderer.invoke('transcribe-audio', filePath, useAggressiveCompression),
  saveSrtFile: (srtContent) => ipcRenderer.invoke('save-srt-file', srtContent),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  showFileSizeDialog: (dialogData) => ipcRenderer.invoke('show-file-size-dialog', dialogData),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Theme management
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  
  // Platform detection
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
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
  onSystemThemeChanged: (callback) => ipcRenderer.on('system-theme-changed', callback),
  
  // Listen for menu command to open settings
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  
  // Onboarding management
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  completeOnboardingStep: (stepName) => ipcRenderer.invoke('complete-onboarding-step', stepName),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
  skipOnboarding: () => ipcRenderer.invoke('skip-onboarding'),
  
  // Connectivity management
  retryConnectivityCheck: () => ipcRenderer.invoke('retry-connectivity-check'),
  getConnectivityStatus: () => ipcRenderer.invoke('get-connectivity-status'),
  
  // Listen for connectivity status changes
  onConnectivityStatus: (callback) => ipcRenderer.on('connectivity-status', callback)
});
