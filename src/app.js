class AutoCaptionApp {
    constructor() {
        this.currentFile = null;
        this.currentSrt = null;
        this.apiKeySet = false;
        this.settings = null;
        
        this.initializeEventListeners();
        this.setupApiKeyLoadListener();
        this.loadSettings();
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
        
        // Listen for transcription status updates
        if (window.electronAPI && window.electronAPI.onTranscriptionStatus) {
            window.electronAPI.onTranscriptionStatus((event, status) => {
                const statusDiv = document.getElementById('generation-status');
                this.showStatus(statusDiv, status.message, 'loading');
            });
        }
        
        // Listen for update dialog
        if (window.electronAPI && window.electronAPI.onShowUpdateDialog) {
            window.electronAPI.onShowUpdateDialog((event, updateData) => {
                this.showUpdateDialog(updateData);
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

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            console.log('Settings button clicked');
            this.openSettings();
        });
        document.getElementById('close-settings-btn').addEventListener('click', () => this.closeSettings());
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancel-settings-btn').addEventListener('click', () => this.closeSettings());
        document.getElementById('manual-check-updates-btn').addEventListener('click', () => this.checkForUpdates());

        // Modal backdrop click to close
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settings-modal')) {
                this.closeSettings();
            }
        });

        // Update modal events
        document.getElementById('close-update-btn').addEventListener('click', () => this.closeUpdateDialog());
        document.getElementById('download-update-btn').addEventListener('click', () => this.downloadUpdate());
        document.getElementById('later-update-btn').addEventListener('click', () => this.closeUpdateDialog());
        
        // Update modal backdrop click to close
        document.getElementById('update-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('update-modal')) {
                this.closeUpdateDialog();
            }
        });

        // Window resize listener for responsive changelog height
        window.addEventListener('resize', () => {
            const modal = document.getElementById('update-modal');
            if (modal && modal.classList.contains('show')) {
                this.adjustChangelogHeight();
            }
        });

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
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm'];
        const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'wma'];
        const isVideo = videoExtensions.includes(fileExtension);
        const isAudio = audioExtensions.includes(fileExtension);
        
        // Show file processing info
        let fileInfoText = fileName;
        if (isVideo) {
            fileInfoText += ' (will be converted to MP3)';
        } else if (isAudio) {
            fileInfoText += ' (will check size & compress if needed)';
        }
        
        document.getElementById('file-name').textContent = fileInfoText;
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

        this.showStatus(statusDiv, '🔄 Processing file and preparing for transcription...', 'loading');

        try {
            const result = await window.electronAPI.transcribeAudio(this.currentFile);
            
            if (result.success) {
                this.currentSrt = result.srt;
                this.showStatus(statusDiv, '✅ Captions generated successfully!', 'success');
                document.getElementById('results-section').style.display = 'block';
                document.getElementById('srt-content').textContent = this.currentSrt;
            } else {
                // Check if it's a file size error for special handling
                if (result.isFileSizeError) {
                    this.showStatus(statusDiv, `🚫 ${result.error} Please select a shorter audio/video file and try again.`, 'error');
                } else {
                    this.showStatus(statusDiv, `❌ Error: ${result.error}`, 'error');
                }
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

    async openSettings() {
        console.log('openSettings called');
        const settingsModal = document.getElementById('settings-modal');
        console.log('settingsModal:', settingsModal);
        settingsModal.classList.add('show');
        
        // Load current settings
        await this.loadSettings();
        
        // Populate settings fields
        const autoCheckUpdates = document.getElementById('auto-check-updates');
        autoCheckUpdates.checked = this.settings?.autoCheckUpdates !== false;
        
        // Update last check info
        this.updateLastCheckInfo();
    }

    closeSettings() {
        const settingsModal = document.getElementById('settings-modal');
        settingsModal.classList.remove('show');
    }

    async saveSettings() {
        const autoCheckUpdates = document.getElementById('auto-check-updates').checked;
        
        const newSettings = {
            autoCheckUpdates: autoCheckUpdates
        };

        try {
            const result = await window.electronAPI.saveSettings(newSettings);
            if (result.success) {
                this.settings = result.settings;
                this.closeSettings();
            } else {
                console.error('Failed to save settings:', result.error);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async checkForUpdates() {
        const button = document.getElementById('manual-check-updates-btn');
        const originalText = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<span>🔄 Checking...</span>';
        button.disabled = true;
        
        try {
            const result = await window.electronAPI.checkForUpdates();
            // The main process handles showing the dialog
            this.updateLastCheckInfo();
        } catch (error) {
            console.error('Error checking for updates:', error);
        } finally {
            // Restore button state
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    updateLastCheckInfo() {
        const lastCheckInfo = document.getElementById('last-check-info');
        if (this.settings?.lastUpdateCheck) {
            const lastCheck = new Date(this.settings.lastUpdateCheck);
            const now = new Date();
            const timeDiff = now - lastCheck;
            const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
            
            if (hoursDiff < 1) {
                lastCheckInfo.textContent = 'Last checked: Less than an hour ago';
            } else if (hoursDiff === 1) {
                lastCheckInfo.textContent = 'Last checked: 1 hour ago';
            } else if (hoursDiff < 24) {
                lastCheckInfo.textContent = `Last checked: ${hoursDiff} hours ago`;
            } else {
                const daysDiff = Math.floor(hoursDiff / 24);
                lastCheckInfo.textContent = `Last checked: ${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
            }
        } else {
            lastCheckInfo.textContent = 'Never checked for updates';
        }
    }

    showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status ${type}`;
        element.style.display = 'block';
    }

    async loadSettings() {
        try {
            const result = await window.electronAPI.getSettings();
            if (result.success) {
                this.settings = result.settings;
            } else {
                console.error('Failed to load settings:', result.error);
                this.settings = { autoCheckUpdates: true };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { autoCheckUpdates: true };
        }
    }

    showUpdateDialog(updateData) {
        const modal = document.getElementById('update-modal');
        const currentVersionEl = document.getElementById('current-version');
        const newVersionEl = document.getElementById('new-version');
        const changelogContentEl = document.getElementById('changelog-content');

        // Set version info
        currentVersionEl.textContent = updateData.currentVersion;
        newVersionEl.textContent = updateData.latestVersion;

        // Set changelog content
        if (updateData.changelog) {
            changelogContentEl.innerHTML = this.markdownToHtml(updateData.changelog);
        } else {
            changelogContentEl.innerHTML = '<p><em>Changelog not available</em></p>';
        }

        // Show modal
        modal.classList.add('show');
        
        // Adjust changelog container height dynamically
        setTimeout(() => this.adjustChangelogHeight(), 100);
    }

    adjustChangelogHeight() {
        const modal = document.getElementById('update-modal');
        const modalContent = modal.querySelector('.update-modal-content');
        const changelogContainer = document.getElementById('changelog-container');
        
        if (!modalContent || !changelogContainer) return;

        // Get viewport height
        const viewportHeight = window.innerHeight;
        
        // Get modal content current height
        const modalRect = modalContent.getBoundingClientRect();
        
        // Get header and footer heights
        const header = modalContent.querySelector('.modal-header');
        const footer = modalContent.querySelector('.modal-footer');
        const updateInfo = modalContent.querySelector('.update-info');
        const changelogHeader = modalContent.querySelector('.changelog-section h3');
        
        const headerHeight = header ? header.offsetHeight : 0;
        const footerHeight = footer ? footer.offsetHeight : 0;
        const updateInfoHeight = updateInfo ? updateInfo.offsetHeight : 0;
        const changelogHeaderHeight = changelogHeader ? changelogHeader.offsetHeight : 0;
        
        // Calculate margins and padding (approximate)
        const modalPadding = 40; // Modal padding
        const bodyPadding = 40; // Modal body padding
        const margins = 80; // Various margins and spacing
        
        // Calculate maximum available height for changelog
        const maxModalHeight = viewportHeight * 0.85; // 85vh
        const fixedElementsHeight = headerHeight + footerHeight + updateInfoHeight + changelogHeaderHeight + modalPadding + bodyPadding + margins;
        
        let maxChangelogHeight = maxModalHeight - fixedElementsHeight;
        
        // Set minimum and maximum constraints
        const minHeight = window.innerWidth <= 768 ? 120 : 150; // Mobile vs desktop
        const absoluteMaxHeight = window.innerWidth <= 768 ? 300 : 500;
        
        maxChangelogHeight = Math.max(minHeight, Math.min(maxChangelogHeight, absoluteMaxHeight));
        
        // Apply the calculated height
        changelogContainer.style.maxHeight = `${maxChangelogHeight}px`;
        changelogContainer.style.height = `${maxChangelogHeight}px`;
    }

    closeUpdateDialog() {
        const modal = document.getElementById('update-modal');
        modal.classList.remove('show');
    }

    async downloadUpdate() {
        try {
            await window.electronAPI.openExternalUrl('https://github.com/jay-bman725/AutoCaption/releases');
            this.closeUpdateDialog();
        } catch (error) {
            console.error('Error opening releases page:', error);
        }
    }

    markdownToHtml(markdown) {
        // Simple markdown to HTML converter specifically for changelog
        let html = markdown;

        // Convert headers
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        html = html.replace(/^## \[(.*?)\] - (.*$)/gm, '<h2>$1 - $2</h2>'); // Version headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

        // Convert bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convert inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Convert lists - handle nested lists
        const lines = html.split('\n');
        let inList = false;
        let processedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Check if this is a list item
            if (trimmedLine.match(/^- /)) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                processedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
            } else {
                // Close list if we were in one
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                
                // Handle other content
                if (trimmedLine === '') {
                    processedLines.push('<br>');
                } else if (!trimmedLine.match(/^<[h1-6]|^<hr/)) {
                    if (!trimmedLine.match(/^<.*>.*<\/.*>$/)) {
                        processedLines.push(`<p>${trimmedLine}</p>`);
                    } else {
                        processedLines.push(line);
                    }
                } else {
                    processedLines.push(line);
                }
            }
        }
        
        // Close list if still open
        if (inList) {
            processedLines.push('</ul>');
        }

        html = processedLines.join('\n');

        // Clean up extra breaks and empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/(<br>\s*){2,}/g, '<br>');
        html = html.replace(/<br>\s*<h/g, '<h'); // Remove breaks before headers
        html = html.replace(/<\/h[1-6]>\s*<br>/g, (match) => match.replace('<br>', '')); // Remove breaks after headers

        return html;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AutoCaptionApp();
});
