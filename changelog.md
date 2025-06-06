# Changelog
**All dates are in YYYY/MM/DD (Year-Month-Day)**

## [1.2.0] - 2025-01-29

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

## Notes

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
