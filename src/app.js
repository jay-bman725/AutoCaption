class AutoCaptionApp {
    constructor() {
        this.currentFile = null;
        this.currentSrt = null;
        this.apiKeySet = false;
        
        this.initializeEventListeners();
        this.setupApiKeyLoadListener();
    }

    setupApiKeyLoadListener() {
        // Listen for API key loaded event from main process
        if (window.electronAPI && window.electronAPI.onApiKeyLoaded) {
            window.electronAPI.onApiKeyLoaded((event, result) => {
                if (result.success) {
                    this.apiKeySet = true;
                    const statusDiv = document.getElementById('api-key-status');
                    this.showStatus(statusDiv, '✅ Saved API key loaded successfully!', 'success');
                    document.getElementById('upload-section').style.display = 'block';
                    document.getElementById('api-key-section').style.display = 'none';
                    document.getElementById('change-api-key-section').style.display = 'block';
                } else {
                    // Saved API key is invalid, show API key section
                    const statusDiv = document.getElementById('api-key-status');
                    this.showStatus(statusDiv, '⚠️ Saved API key is invalid. Please enter a new one.', 'error');
                }
            });
        }
    }

    initializeEventListeners() {
        // API Key setup
        document.getElementById('set-api-key-btn').addEventListener('click', () => this.setApiKey());
        document.getElementById('api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setApiKey();
        });
        document.getElementById('change-api-key-btn').addEventListener('click', () => this.showApiKeySection());

        // External links
        document.getElementById('openai-api-link').addEventListener('click', (e) => this.handleExternalLink(e));

        // File upload
        document.getElementById('select-file-btn').addEventListener('click', () => this.selectFile());
        document.getElementById('remove-file-btn').addEventListener('click', () => this.removeFile());
        
        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('click', () => this.selectFile());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Generation
        document.getElementById('generate-btn').addEventListener('click', () => this.generateCaptions());

        // Results
        document.getElementById('preview-btn').addEventListener('click', () => this.togglePreview());
        document.getElementById('copy-btn').addEventListener('click', () => this.copySrt());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadSrt());
    }

    async setApiKey() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        const statusDiv = document.getElementById('api-key-status');
        const btn = document.getElementById('set-api-key-btn');

        if (!apiKey) {
            this.showStatus(statusDiv, 'Please enter an API key', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Validating...';

        try {
            const result = await window.electronAPI.setApiKey(apiKey);
            
            if (result.success) {
                this.apiKeySet = true;
                this.showStatus(statusDiv, '✅ API key validated and saved successfully!', 'success');
                document.getElementById('upload-section').style.display = 'block';
                
                // Clear the input for security
                document.getElementById('api-key-input').value = '';
                
                setTimeout(() => {
                    document.getElementById('api-key-section').style.display = 'none';
                }, 1500);
            } else {
                this.showStatus(statusDiv, `❌ Invalid API key: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(statusDiv, `❌ Error: ${error.message}`, 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Set API Key';
    }

    async selectFile() {
        try {
            const result = await window.electronAPI.selectAudioFile();
            if (result.success) {
                this.setSelectedFile(result.filePath);
            }
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    }

    setSelectedFile(filePath) {
        this.currentFile = filePath;
        const fileName = filePath.split('/').pop();
        
        document.getElementById('file-name').textContent = fileName;
        document.getElementById('file-info').style.display = 'block';
        document.getElementById('generate-section').style.display = 'block';
        
        // Hide results if showing
        document.getElementById('results-section').style.display = 'none';
    }

    removeFile() {
        this.currentFile = null;
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('generate-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('upload-area').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('upload-area').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('upload-area').classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const audioExtensions = ['mp3', 'wav', 'mp4', 'avi', 'mov', 'mkv', 'flv', 'webm', 'm4a', 'aac', 'ogg', 'wma'];
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (audioExtensions.includes(fileExtension)) {
                this.setSelectedFile(file.path);
            } else {
                alert('Please select a valid audio or video file.');
            }
        }
    }

    async generateCaptions() {
        if (!this.currentFile) return;

        const btn = document.getElementById('generate-btn');
        const btnText = document.getElementById('generate-btn-text');
        const spinner = document.getElementById('generate-spinner');
        const statusDiv = document.getElementById('generation-status');

        btn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';

        this.showStatus(statusDiv, '🔄 Transcribing audio with OpenAI Whisper...', 'loading');

        try {
            const result = await window.electronAPI.transcribeAudio(this.currentFile);
            
            if (result.success) {
                this.currentSrt = result.srt;
                this.showStatus(statusDiv, '✅ Captions generated successfully!', 'success');
                document.getElementById('results-section').style.display = 'block';
                document.getElementById('srt-content').textContent = this.currentSrt;
            } else {
                this.showStatus(statusDiv, `❌ Error: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(statusDiv, `❌ Error: ${error.message}`, 'error');
        }

        btn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }

    togglePreview() {
        const preview = document.getElementById('srt-preview');
        const btn = document.getElementById('preview-btn');
        
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            btn.textContent = '👁️ Hide Preview';
        } else {
            preview.style.display = 'none';
            btn.textContent = '👁️ Preview';
        }
    }

    async copySrt() {
        if (!this.currentSrt) return;
        
        try {
            await navigator.clipboard.writeText(this.currentSrt);
            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    }

    async downloadSrt() {
        if (!this.currentSrt) return;

        try {
            const result = await window.electronAPI.saveSrtFile(this.currentSrt);
            if (result.success) {
                const btn = document.getElementById('download-btn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Saved!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('Error saving file:', error);
        }
    }

    handleExternalLink(e) {
        e.preventDefault();
        const url = e.target.href;
        if (window.electronAPI && window.electronAPI.openExternalUrl) {
            window.electronAPI.openExternalUrl(url);
        }
    }

    showApiKeySection() {
        document.getElementById('api-key-section').style.display = 'block';
        document.getElementById('change-api-key-section').style.display = 'none';
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('generate-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        
        // Clear any existing status
        const statusDiv = document.getElementById('api-key-status');
        statusDiv.style.display = 'none';
        
        // Focus on the input
        document.getElementById('api-key-input').focus();
    }

    showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status ${type}`;
        element.style.display = 'block';
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AutoCaptionApp();
});
