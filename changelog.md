# Changelog
**All dates are in YYYY/MM/DD (Year-Month-Day)**

## [1.5.0] - 2025-06-07

### Added
- **Enhanced File Size Handling**: Advanced file size management system for files over 25MB
  - Native dialog with three user options when files exceed size limit after initial compression:
    - "Try Heavy Compression" - Uses aggressive compression (64kbps, mono, 16kHz) with quality reduction warning
    - "Choose Different File" - Returns to file selection dialog
    - "Cancel" - Cancels the transcription process
  - Recursive compression attempts with user choice at each step
  - Detailed file size reporting showing original size, compressed size, and compression results
  - Enhanced status messages with compression progress feedback

- **Application Menu Enhancement**: Added reload functionality for improved user experience
  - New "Reload" menu item in application menu
  - Keyboard shortcuts: Command+R (macOS) and Ctrl+R (Windows/Linux)
  - Integrated into existing streamlined menu structure

- **UI Layout Improvements**: Relocated settings button for better user interface design
  - Moved settings button from top-right header position to bottom of interface
  - Wide-styled button design for improved accessibility and visual prominence
  - Positioned after footer for logical UI flow

### Enhanced
- **Audio Processing Pipeline**: Improved compression system with multiple quality levels
  - Standard compression (128kbps, stereo, 44.1kHz) for initial size reduction
  - Aggressive compression option (64kbps, mono, 16kHz) for maximum file size reduction
  - Smart compression parameter passing throughout the audio processing chain
  - Enhanced error handling with detailed compression status reporting

- **User Experience**: Streamlined file size management workflow
  - Clear user choice dialogs instead of hard failures for oversized files
  - Informative status messages throughout compression process
  - Better error messaging with actionable options
  - Preserved original file safety during compression attempts

- **IPC Communication**: Extended inter-process communication for new features
  - New 'show-file-size-dialog' handler for native dialog display
  - Enhanced 'transcribe-audio' handler with aggressive compression parameter support
  - Improved error response structure with detailed compression metadata

### Technical
- **File Processing**: Enhanced `convertToCompressedAudio()` function with `useAggressiveCompression` parameter
- **Error Handling**: Modified `processAudioFile()` to return comprehensive error information including compression options
- **Dialog System**: Implemented native dialog for file size management using Electron's dialog API
- **CSS Enhancements**: Added comprehensive styling for relocated settings button
  - New `.btn-settings` and `.settings-section` classes
  - Gradient background with hover effects
  - Dark theme compatibility
  - Removed all shadow effects as per design requirements
- **Menu System**: Enhanced `createApplicationMenu()` with reload functionality and proper keyboard shortcuts

### Fixed
- **File Size Error Handling**: Replaced hard failures with user-friendly choice dialogs when files exceed 25MB after compression
- **Settings Button Positioning**: Corrected initial positioning issue where button appeared above footer instead of after footer
- **UI Responsiveness**: Improved layout flow with properly positioned settings section

## [1.4.3] - 2025-06-07

### Added
- **Simplified Custom Menu**: Implemented a streamlined application menu with essential functionality
  - Reduced menu to only include the "AutoCaption" menu for a cleaner interface
  - Focused menu items on core functionality: Check for Updates, Settings, and Quit
  - Enhanced user experience with more minimal, task-focused menu structure

### Technical
- Implemented custom `createApplicationMenu()` function to define a streamlined menu structure

## [1.4.2] - 2025-01-07

### Fixed
- **Dark Theme Display Issues**: Resolved multiple areas where light/white sections appeared incorrectly in dark mode
  - **File Info Background**: Fixed green gradient background that remained light in dark mode - now uses proper dark theme variant with subtle green tinting
  - **SRT Preview Panel**: Corrected light gray background that didn't respect dark theme - now uses dark slate backgrounds
  - **Update Modal Info**: Fixed blue info sections that stayed light - now uses dark theme compatible blue tinting
  - **Changelog Headers**: Fixed purple gradient headers that ignored dark theme - now uses dark variants with proper contrast
  - **Danger Buttons**: Corrected red buttons that used hardcoded colors - now uses theme-aware red variants with better dark mode visibility
  - **Theme Preview Components**: Fixed preview elements that showed incorrect colors - now properly reflects actual theme appearance
  - **Scrollbars**: Updated gradient scrollbars to be theme-aware instead of always light
  - **Form Controls**: Fixed checkboxes and other controls that didn't properly theme

### Enhanced
- **CSS Variables System**: Extended existing theme system with 20+ new CSS custom properties for comprehensive dark theme coverage
- **Color Consistency**: Replaced all remaining hardcoded color values with CSS variable references for complete theme integration
- **Dark Theme Coverage**: Achieved 100% dark theme compatibility across all UI components and sections
- **Theme Transitions**: Maintained smooth 0.3s transitions for all newly themed elements

### Technical
- Added new CSS variables for file info, SRT preview, update modal, changelog, and button components
- Converted 13 hardcoded gradients to use CSS variable system
- Extended both light and dark theme variable definitions with proper contrast ratios
- Maintained backward compatibility with existing theme switching functionality
- Enhanced theme preview accuracy to match actual application appearance

## [1.4.1] - 2025-06-06

### Fixed
- **Critical File Deletion Bug**: Fixed issue where original audio files under 25MB were being incorrectly deleted after transcription
  - Problem: Cleanup logic was unconditionally deleting the `processedPath` after transcription, but for files under 25MB, `processedPath` pointed to the original file instead of a temporary processed file
  - Solution: Added conditional cleanup that only deletes files when `wasCompressed` is true (indicating a temporary file was created)
  - Impact: Original user files are now preserved when they don't require processing or compression
  - Debug logging now correctly indicates when no cleanup is needed vs. when temporary files are cleaned up

### Technical
- Modified transcription cleanup logic in `main.js` to check `wasCompressed` flag before file deletion
- Added proper logging to distinguish between temporary file cleanup and original file preservation
- Enhanced debug messaging to provide clearer feedback about file processing and cleanup operations

## [1.4.0] - 2025-06-06

### Added
- **API Key Management in Settings**: Complete API key management functionality within the settings modal
  - Current API key status display showing whether an API key is configured
  - Change API Key button that redirects to the main API key input section
  - Remove API Key button with confirmation dialog for secure key removal
  - Real-time status updates when API key state changes
- **Enhanced Settings Modal**: Expanded settings with dedicated API Key Management section
  - Visual status indicators (✅ configured, ❌ not configured, 🔄 checking)
  - Responsive button layout for API key actions
  - Professional styling with danger button for removal action
- **Backend API Key Operations**: New IPC handlers for comprehensive API key management
  - `get-api-key-status`: Check if API key exists without exposing the actual key
  - `remove-api-key`: Securely delete API key file and clear OpenAI instance
  - Enhanced error handling and logging for all API key operations

### Enhanced
- **User Experience**: Streamlined API key management workflow
  - Users can now manage their API key entirely from the settings without navigating away
  - Clear visual feedback for all API key operations
  - Confirmation dialogs prevent accidental key removal
- **Security**: Improved API key handling
  - API key status checking without exposing sensitive data
  - Secure removal process that clears both file storage and memory
  - Better separation of concerns between status checking and key access

### Technical
- Added `updateApiKeyStatus()`, `changeApiKeyFromSettings()`, and `removeApiKeyFromSettings()` methods
- Extended preload.js with `getApiKeyStatus` and `removeApiKey` functions
- Enhanced main.js with secure API key management IPC handlers
- Improved error handling and user feedback throughout the API key lifecycle

## [1.3.0] - 2025-06-06

### Added
- **Comprehensive Onboarding System**: Complete first-time user experience with guided setup
  - Multi-step onboarding modal with 4 key steps: Welcome, API Key Setup, Theme Selection, and Completion
  - Feature introduction with visual explanations of app capabilities
  - Interactive API key validation within onboarding flow
  - Theme selection with live preview during setup
  - Progress tracking with step indicators and navigation controls
- **Version-Aware Onboarding**: Smart onboarding system that re-runs for app updates
  - Tracks onboarding completion by app version
  - Automatically shows onboarding when app version changes
  - Marks previously completed steps as "done" during version upgrades
  - Allows users to skip through familiar steps
- **Enhanced UI State Management**: Improved application initialization and state handling
  - Fixed API key loading race condition that caused incorrect UI state
  - Added proper initialization sequence for UI components
  - Better handling of async API key validation on app startup
- **Onboarding Persistence**: Complete state management for onboarding progress
  - Individual step completion tracking
  - Theme selection persistence during onboarding
  - Graceful handling of interrupted onboarding sessions

### Enhanced
- **Settings Schema**: Extended application settings to support onboarding state
  - Added `onboardingCompleted`, `onboardingVersion`, and `onboardingSteps` tracking
  - Backwards compatibility with existing user settings
- **IPC Communication**: New inter-process communication handlers for onboarding
  - `get-onboarding-status`: Determines if onboarding should be shown
  - `complete-onboarding-step`: Tracks individual step completion
  - `complete-onboarding`: Marks entire onboarding as finished
  - `skip-onboarding`: Allows users to bypass the onboarding process
- **User Experience**: Significantly improved first-time user experience
  - Clear explanation of app features and capabilities
  - Guided API key setup with real-time validation
  - Visual theme selection with immediate preview
  - Professional completion screen with next steps

### Fixed
- **API Key State Persistence**: Fixed issue where refreshing the application (Ctrl/Cmd+R) would incorrectly prompt for API key entry even when one was already configured
  - Resolved race condition in API key loading during application refresh
  - Improved state management to properly restore UI state after page reload

### Technical
- Enhanced `AutoCaptionApp` constructor with proper initialization order
- Added comprehensive onboarding state management in frontend
- Implemented `checkOnboardingStatus()` and `setupVersionUpdateOnboarding()` methods
- Created responsive onboarding modal with mobile-friendly design
- Added extensive CSS styling for onboarding components with hover effects and transitions

## [1.2.0] - 2025-06-06

### Added
- **Dark Mode Support**: Complete dark mode implementation with automatic system theme detection
- **Theme Selection**: User-configurable theme settings with three options:
  - System Default (automatically follows OS theme)
  - Light Mode (forced light theme)
  - Dark Mode (forced dark theme)
- **CSS Variables System**: Comprehensive CSS custom properties system with 60+ variables for seamless theme switching
- **Smooth Transitions**: 0.3s ease transitions for all theme changes across the entire UI
- **Theme Persistence**: User theme preferences are saved and restored across app sessions
- **System Theme Monitoring**: Real-time detection and application of OS theme changes
- **Debug Logging**: Comprehensive theme detection and application logging for troubleshooting

### Enhanced
- **Settings Panel**: Added theme selection dropdown to the settings modal
- **Color System**: Converted all hardcoded color values to CSS variables for dynamic theming
- **IPC Communication**: Enhanced inter-process communication for theme management between main and renderer processes
- **User Experience**: Improved visual consistency across light and dark themes
- **Accessibility**: Better contrast ratios and readability in both light and dark modes

### Technical
- Integrated Electron's `nativeTheme` API for system theme detection
- Added theme-related IPC handlers in main process
- Implemented `setupThemeSystem()` for theme initialization
- Added `detectAndApplyInitialTheme()` for startup theme detection
- Created `applyTheme()` and `setTheme()` methods for theme management
- Enhanced preload script with theme-related IPC methods

## [1.1.3] - 2025-06-06

### Added
- **Debug Logging System**: Comprehensive debug logging infrastructure for troubleshooting
- Debug log file creation with automatic rotation (5MB max size, 5 file rotation)
- Debug logs stored in application data directory (`userData/logs/debug.log`)
- "Show Debug Logs" button in Settings panel for easy access to log files
- Debug logging throughout main application processes including:
  - Application startup and window creation
  - API key operations and validation
  - File selection and transcription workflows
  - Audio processing and FFmpeg operations
  - Settings management
  - Update checking functionality

### Enhanced
- Improved troubleshooting capabilities for users and developers
- Better error tracking and application state monitoring
- Enhanced support workflow with detailed logging information

## [1.1.2] - 2025-06-06

### Changed
- Enhanced update download functionality to direct users to specific version release pages
- Update "Download Update" button now navigates to the exact version tag URL (e.g., `/releases/tag/v1.1.2`) instead of the general releases page
- Improved user experience when downloading updates by eliminating the need to search for the correct version

## [1.1.1] - 2025-06-06 

### Added
- Changelog notification system - users are now notified when updates are available
- In-app changelog viewer to display release notes
- Update notification popup with changelog details

### Changed
- Improved update detection mechanism
- Enhanced user experience for version updates

## [1.1.0] - 2025-06-05

### Added
- **Video Support**: Added ability to process video files for automatic captioning
- **Compression**: Implemented audio/video compression to optimize file sizes
- Support for multiple video formats (MP4, AVI, MOV, MKV)
- Batch processing for multiple video files
- Compression quality settings in preferences

### Enhanced
- Improved caption accuracy for video content
- Better performance with compressed media files
- Enhanced UI to handle video file selection

### Fixed
- Memory usage optimization when processing large files
- Stability improvements for long-duration media

## [1.0.0] - 2025-06-05

### Added
- **Initial Release**: AutoCaption application for automatic audio transcription
- Support for audio file formats (MP3, WAV, M4A, FLAC)
- Real-time audio transcription
- Export captions in multiple formats (SRT, VTT, TXT)
- Simple and intuitive user interface
- Drag and drop file support
- Basic audio processing capabilities
- Settings panel for customization
- Cross-platform support (Windows, macOS, Linux)

### Features
- High-accuracy speech-to-text conversion
- Multiple language support
- Adjustable transcription speed
- Caption timing synchronization
- Export options with customizable formatting

---

# Notes

### Version Naming Convention
- **Major version** (x.0.0): Significant new features or breaking changes
- **Minor version** (x.y.0): New features and enhancements
- **Patch version** (x.y.z): Bug fixes and small improvements

### Upcoming Features
- Real-time live captioning
- AI-powered caption editing suggestions
- Cloud sync for projects
- Custom vocabulary training
- Advanced audio enhancement filters

All notable changes to AutoCaption will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
