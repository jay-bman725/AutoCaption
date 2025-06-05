# AutoCaption

🎬 Automatic caption generation app using OpenAI Whisper

## Features

- **Easy Setup**: Simply enter your OpenAI API key to get started
- **File Upload**: Drag-and-drop or browse for audio/video files
- **Multiple Formats**: Supports MP3, WAV, MP4, AVI, MOV, MKV, and more
- **Instant Generation**: Generate SRT caption files with one click
- **Preview & Export**: Preview captions before downloading
- **Modern UI**: Beautiful, responsive interface built with Electron

## Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd AutoCaption
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Get your OpenAI API key from the [OpenAI Platform](https://platform.openai.com/api-keys)

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. Enter your OpenAI API key when prompted

3. Upload an audio or video file by dragging and dropping or clicking "Browse Files"

4. Click "Generate SRT Captions" to create captions using OpenAI Whisper

5. Preview, copy, or download your generated captions

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Building

Build the application for distribution:
```bash
npm run build
```

## Supported File Formats

- **Audio**: MP3, WAV, M4A, AAC, OGG, WMA
- **Video**: MP4, AVI, MOV, MKV, FLV, WEBM

## Requirements

- Node.js 16+ 
- OpenAI API key with Whisper access
- macOS, Windows, or Linux

## License

MIT License
