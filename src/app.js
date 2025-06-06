class AutoCaptionApp {
    constructor() {
        this.currentFile = null;
        this.currentSrt = null;
        this.apiKeySet = false;
        this.settings = null;
        this.currentTheme = 'system';
        this.onboardingState = {
            currentStep: 1,
            totalSteps: 4,
            completedSteps: {},
            selectedTheme: 'system'
        };
        
        this.initializeEventListeners();
        this.setupApiKeyLoadListener();
        this.setupThemeSystem();
        this.loadSettings();
        this.checkOnboardingStatus();
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

    setupThemeSystem() {
        // Listen for system theme changes
        if (window.electronAPI && window.electronAPI.onSystemThemeChanged) {
            window.electronAPI.onSystemThemeChanged((event, data) => {
                console.log('[DEBUG] System theme changed to:', data.theme);
                if (this.currentTheme === 'system') {
                    this.applyTheme(data.theme);
                }
            });
        }

        // Detect initial system theme
        this.detectAndApplyInitialTheme();
    }

    async detectAndApplyInitialTheme() {
        try {
            const result = await window.electronAPI.getSystemTheme();
            if (result.success) {
                console.log('[DEBUG] System theme detected:', result.theme);
                // Apply system theme initially
                this.applyTheme(result.theme);
            }
        } catch (error) {
            console.error('Error detecting system theme:', error);
            // Fallback to light theme
            this.applyTheme('light');
        }
    }

    applyTheme(theme) {
        const body = document.body;
        
        console.log('[DEBUG] Applying theme:', theme);
        
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else {
            body.removeAttribute('data-theme');
        }
        
        // Store current applied theme for reference
        this.appliedTheme = theme;
    }

    setTheme(themeChoice) {
        console.log('[DEBUG] Setting theme choice:', themeChoice);
        this.currentTheme = themeChoice;
        
        if (themeChoice === 'system') {
            // Apply current system theme
            this.detectAndApplyInitialTheme();
        } else {
            // Apply chosen theme directly
            this.applyTheme(themeChoice);
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
        document.getElementById('show-debug-logs-btn').addEventListener('click', () => this.openDebugLogs());

        // Theme selection
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

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

        // Onboarding
        document.getElementById('onboarding-next-btn').addEventListener('click', () => this.nextOnboardingStep());
        document.getElementById('onboarding-back-btn').addEventListener('click', () => this.previousOnboardingStep());
        document.getElementById('onboarding-skip-btn').addEventListener('click', () => this.skipOnboarding());
        document.getElementById('onboarding-finish-btn').addEventListener('click', () => this.finishOnboarding());
        
        // Onboarding API key validation
        document.getElementById('onboarding-validate-key-btn').addEventListener('click', () => this.validateOnboardingApiKey());
        document.getElementById('onboarding-api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.validateOnboardingApiKey();
        });
        
        // Onboarding theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => this.selectOnboardingTheme(option.dataset.theme));
        });
        
        // Onboarding external link
        document.getElementById('onboarding-openai-link').addEventListener('click', (e) => this.handleExternalLink(e));
        
        // Onboarding modal backdrop click to close (skip)
        document.getElementById('onboarding-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('onboarding-modal')) {
                this.skipOnboarding();
            }
        });
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
        
        // Populate theme setting
        const themeSelect = document.getElementById('theme-select');
        themeSelect.value = this.settings?.theme || 'system';
        this.currentTheme = this.settings?.theme || 'system';
        
        // Update last check info
        this.updateLastCheckInfo();
    }

    closeSettings() {
        const settingsModal = document.getElementById('settings-modal');
        settingsModal.classList.remove('show');
    }

    async saveSettings() {
        const autoCheckUpdates = document.getElementById('auto-check-updates').checked;
        const themeSelect = document.getElementById('theme-select');
        const selectedTheme = themeSelect.value;
        
        console.log('[DEBUG] Saving theme setting:', selectedTheme);
        
        const newSettings = {
            autoCheckUpdates: autoCheckUpdates,
            theme: selectedTheme
        };

        try {
            const result = await window.electronAPI.saveSettings(newSettings);
            if (result.success) {
                this.settings = result.settings;
                console.log('[DEBUG] Theme setting saved successfully:', selectedTheme);
                this.setTheme(selectedTheme);
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

    async openDebugLogs() {
        const button = document.getElementById('show-debug-logs-btn');
        const originalText = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<span>📄 Opening...</span>';
        button.disabled = true;
        
        try {
            const result = await window.electronAPI.openDebugLogs();
            if (!result.success) {
                console.error('Failed to open debug logs:', result.error);
                // Show temporary error message
                button.innerHTML = '<span>❌ Error</span>';
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            } else {
                // Show success message briefly
                button.innerHTML = '<span>✅ Opened</span>';
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1500);
            }
        } catch (error) {
            console.error('Error opening debug logs:', error);
            button.innerHTML = '<span>❌ Error</span>';
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
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
                
                // Apply saved theme
                const savedTheme = this.settings.theme || 'system';
                console.log('[DEBUG] Theme loaded from settings:', savedTheme);
                this.setTheme(savedTheme);
            } else {
                console.error('Failed to load settings:', result.error);
                this.settings = { autoCheckUpdates: true, theme: 'system' };
                console.log('[DEBUG] Theme defaulted to: system (failed to load settings)');
                this.setTheme('system');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { autoCheckUpdates: true, theme: 'system' };
            console.log('[DEBUG] Theme defaulted to: system (error loading settings)');
            this.setTheme('system');
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
            // Get the new version number from the modal
            const newVersionEl = document.getElementById('new-version');
            const newVersion = newVersionEl ? newVersionEl.textContent.trim() : null;
            
            // Construct URL with specific version tag
            const url = newVersion 
                ? `https://github.com/jay-bman725/AutoCaption/releases/tag/v${newVersion}`
                : 'https://github.com/jay-bman725/AutoCaption/releases'; // Fallback to general releases
                
            await window.electronAPI.openExternalUrl(url);
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

    // Onboarding Methods
    async checkOnboardingStatus() {
        try {
            const result = await window.electronAPI.getOnboardingStatus();
            if (result.success && result.shouldShowOnboarding) {
                console.log('[DEBUG] Showing onboarding - shouldShow:', result.shouldShowOnboarding);
                console.log('[DEBUG] Current version:', result.currentVersion, 'Onboarding version:', result.onboardingVersion);
                
                // Update completed steps from saved data
                this.onboardingState.completedSteps = result.onboardingSteps || {};
                
                // If this is a version change, mark completed steps with checkmarks
                if (result.onboardingVersion && result.onboardingVersion !== result.currentVersion) {
                    this.setupVersionUpdateOnboarding();
                }
                
                this.showOnboarding();
            } else {
                console.log('[DEBUG] Onboarding not needed');
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
        }
    }

    setupVersionUpdateOnboarding() {
        // For version updates, show what was already completed
        const steps = ['welcome', 'apiKey', 'theme', 'complete'];
        const stepIds = ['welcome', 'apikey', 'theme', 'complete'];
        
        steps.forEach((step, index) => {
            if (this.onboardingState.completedSteps[step]) {
                const statusEl = document.getElementById(`${stepIds[index]}-step-status`);
                if (statusEl) {
                    statusEl.classList.remove('error');
                    statusEl.classList.add('completed');
                    statusEl.querySelector('.status-icon').textContent = '✅';
                    statusEl.querySelector('.status-text').textContent = 'Already completed';
                }
            }
        });
    }

    showOnboarding() {
        const modal = document.getElementById('onboarding-modal');
        modal.classList.add('show');
        this.updateOnboardingStep();
    }

    hideOnboarding() {
        const modal = document.getElementById('onboarding-modal');
        modal.classList.remove('show');
    }

    updateOnboardingStep() {
        const steps = ['welcome', 'apikey', 'theme', 'complete'];
        const currentStepName = steps[this.onboardingState.currentStep - 1];
        
        // Hide all steps
        document.querySelectorAll('.onboarding-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepEl = document.getElementById(`onboarding-step-${currentStepName}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        // Update progress
        const progressFill = document.getElementById('onboarding-progress-fill');
        const stepCounter = document.getElementById('onboarding-step-counter');
        const progress = (this.onboardingState.currentStep / this.onboardingState.totalSteps) * 100;
        
        progressFill.style.width = `${progress}%`;
        stepCounter.textContent = `${this.onboardingState.currentStep} of ${this.onboardingState.totalSteps}`;
        
        // Update button visibility
        const backBtn = document.getElementById('onboarding-back-btn');
        const nextBtn = document.getElementById('onboarding-next-btn');
        const finishBtn = document.getElementById('onboarding-finish-btn');
        const skipBtn = document.getElementById('onboarding-skip-btn');
        
        backBtn.style.display = this.onboardingState.currentStep > 1 ? 'block' : 'none';
        
        if (this.onboardingState.currentStep === this.onboardingState.totalSteps) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'block';
            skipBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'block';
            finishBtn.style.display = 'none';
            skipBtn.style.display = 'block';
        }
        
        // Update step-specific UI
        this.updateStepUI(currentStepName);
    }

    updateStepUI(stepName) {
        switch (stepName) {
            case 'apikey':
                this.updateApiKeyStepUI();
                break;
            case 'theme':
                this.updateThemeStepUI();
                break;
        }
    }

    updateApiKeyStepUI() {
        const statusEl = document.getElementById('apikey-step-status');
        const nextBtn = document.getElementById('onboarding-next-btn');
        
        if (this.onboardingState.completedSteps.apiKey || this.apiKeySet) {
            statusEl.classList.remove('error');
            statusEl.classList.add('completed');
            statusEl.querySelector('.status-icon').textContent = '✅';
            statusEl.querySelector('.status-text').textContent = 'API key configured';
            nextBtn.disabled = false;
        } else {
            statusEl.classList.remove('completed');
            statusEl.querySelector('.status-icon').textContent = '⏳';
            statusEl.querySelector('.status-text').textContent = 'API key required';
            nextBtn.disabled = true;
        }
    }

    updateThemeStepUI() {
        const statusEl = document.getElementById('theme-step-status');
        const nextBtn = document.getElementById('onboarding-next-btn');
        
        if (this.onboardingState.completedSteps.theme || this.onboardingState.selectedTheme) {
            statusEl.classList.remove('error');
            statusEl.classList.add('completed');
            statusEl.querySelector('.status-icon').textContent = '✅';
            statusEl.querySelector('.status-text').textContent = 'Theme selected';
            nextBtn.disabled = false;
        }
        
        // Update theme selection UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.theme === this.onboardingState.selectedTheme) {
                option.classList.add('selected');
            }
        });
    }

    async nextOnboardingStep() {
        const steps = ['welcome', 'apikey', 'theme', 'complete'];
        const currentStepName = steps[this.onboardingState.currentStep - 1];
        
        // Validate current step
        if (!await this.validateCurrentStep(currentStepName)) {
            return;
        }
        
        // Mark current step as completed
        await this.completeOnboardingStep(currentStepName);
        
        if (this.onboardingState.currentStep < this.onboardingState.totalSteps) {
            this.onboardingState.currentStep++;
            this.updateOnboardingStep();
        }
    }

    previousOnboardingStep() {
        if (this.onboardingState.currentStep > 1) {
            this.onboardingState.currentStep--;
            this.updateOnboardingStep();
        }
    }

    async validateCurrentStep(stepName) {
        switch (stepName) {
            case 'welcome':
                return true; // Always valid
            case 'apikey':
                return this.apiKeySet || this.onboardingState.completedSteps.apiKey;
            case 'theme':
                return this.onboardingState.selectedTheme !== null;
            case 'complete':
                return true;
            default:
                return true;
        }
    }

    async completeOnboardingStep(stepName) {
        try {
            const result = await window.electronAPI.completeOnboardingStep(stepName);
            if (result.success) {
                this.onboardingState.completedSteps[stepName] = true;
                console.log(`[DEBUG] Completed onboarding step: ${stepName}`);
            }
        } catch (error) {
            console.error(`Error completing onboarding step ${stepName}:`, error);
        }
    }

    async validateOnboardingApiKey() {
        const apiKey = document.getElementById('onboarding-api-key-input').value.trim();
        const btn = document.getElementById('onboarding-validate-key-btn');
        const btnText = document.getElementById('onboarding-validate-text');
        const spinner = document.getElementById('onboarding-validate-spinner');
        const statusEl = document.getElementById('apikey-step-status');

        if (!apiKey) {
            statusEl.classList.add('error');
            statusEl.querySelector('.status-icon').textContent = '❌';
            statusEl.querySelector('.status-text').textContent = 'Please enter an API key';
            return;
        }

        btn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';

        try {
            const result = await window.electronAPI.setApiKey(apiKey);
            
            if (result.success) {
                this.apiKeySet = true;
                statusEl.classList.remove('error');
                statusEl.classList.add('completed');
                statusEl.querySelector('.status-icon').textContent = '✅';
                statusEl.querySelector('.status-text').textContent = 'API key validated and saved!';
                
                // Clear the input for security
                document.getElementById('onboarding-api-key-input').value = '';
                
                // Enable next button
                document.getElementById('onboarding-next-btn').disabled = false;
            } else {
                statusEl.classList.add('error');
                statusEl.querySelector('.status-icon').textContent = '❌';
                statusEl.querySelector('.status-text').textContent = `Invalid API key: ${result.error}`;
            }
        } catch (error) {
            statusEl.classList.add('error');
            statusEl.querySelector('.status-icon').textContent = '❌';
            statusEl.querySelector('.status-text').textContent = `Error: ${error.message}`;
        }

        btn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }

    selectOnboardingTheme(theme) {
        this.onboardingState.selectedTheme = theme;
        
        // Update UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-theme="${theme}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Apply theme immediately for preview
        this.setTheme(theme);
        
        // Update status
        const statusEl = document.getElementById('theme-step-status');
        statusEl.classList.remove('error');
        statusEl.classList.add('completed');
        statusEl.querySelector('.status-icon').textContent = '✅';
        statusEl.querySelector('.status-text').textContent = 'Theme selected';
        
        // Enable next button
        document.getElementById('onboarding-next-btn').disabled = false;
    }

    async skipOnboarding() {
        try {
            const result = await window.electronAPI.skipOnboarding();
            if (result.success) {
                console.log('[DEBUG] Onboarding skipped');
                this.hideOnboarding();
            }
        } catch (error) {
            console.error('Error skipping onboarding:', error);
        }
    }

    async finishOnboarding() {
        try {
            // Save theme selection if one was made
            if (this.onboardingState.selectedTheme) {
                const newSettings = {
                    ...this.settings,
                    theme: this.onboardingState.selectedTheme
                };
                await window.electronAPI.saveSettings(newSettings);
            }
            
            const result = await window.electronAPI.completeOnboarding();
            if (result.success) {
                console.log('[DEBUG] Onboarding completed');
                this.hideOnboarding();
                
                // Show a welcome message if this was the first time
                if (!this.onboardingState.completedSteps.complete) {
                    setTimeout(() => {
                        const statusDiv = document.getElementById('api-key-status');
                        if (statusDiv) {
                            this.showStatus(statusDiv, '🎉 Welcome to AutoCaption! You\'re ready to start generating captions.', 'success');
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error finishing onboarding:', error);
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AutoCaptionApp();
});
