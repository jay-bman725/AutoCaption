const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  transcribeAudio: (filePath) => ipcRenderer.invoke('transcribe-audio', filePath),
  saveSrtFile: (srtContent) => ipcRenderer.invoke('save-srt-file', srtContent),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  
  // Listen for API key loaded event
  onApiKeyLoaded: (callback) => ipcRenderer.on('api-key-loaded', callback)
});
