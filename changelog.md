# Changelog
**All dates are in YYYY/MM/DD (Year-Month-Day)**

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
