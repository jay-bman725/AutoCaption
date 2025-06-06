# 🎧 AutoCaption

**Automatic caption generation powered by OpenAI Whisper**  
Transcribe audio or video files and generate SRT captions with ease — all through a clean, modern interface.

> 💡 If you find this project helpful, please consider giving it a **⭐️** — it really helps support continued development!

**📌 macOS Users:**  
If you encounter an “app is damaged” error, [click here for a fix](https://github.com/jay-bman725/AutoCaption/tree/main?tab=readme-ov-file#-macos-users--app-is-damaged-fix).

---

## ✨ Features

- 🔑 **Plug & Play** — Enter your OpenAI API key and get started immediately  
- 🎞 **Wide Format Support** — Supports MP3, WAV, MP4, AVI, MOV, MKV, and more  
- 🗜️ **Smart Processing** — Converts video to audio and compresses only when needed  
- 📏 **Automatic Size Optimization** — Handles OpenAI’s 25MB limit intelligently  
- 🧠 **Powered by Whisper** — Uses OpenAI Whisper for accurate, high-quality captions  
- 📝 **Preview & Edit** — View and edit captions before exporting (text only)
- 📁 **Drag & Drop** — Drop in your files or use the file picker  
- 🖥 **Cross-platform** — Compatible with Windows, macOS (Intel + Apple Silicon), and Linux  
- 🎨 **Modern UI** — Sleek, responsive interface built with Electron  
- 🌓 **Customizable Theme** — Choose Light, Dark, or follow your system setting

---

## 🚀 Installation

### 🔧 From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/AutoCaption.git
   cd AutoCaption
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Get your OpenAI API key from [OpenAI’s platform](https://platform.openai.com/api-keys)

4. Start the app:

   ```bash
   npm start
   ```

---

### 📦 Prebuilt Installers

Installers for **Windows, macOS, and Linux** are available under the [Releases tab](https://github.com/jay-bman725/AutoCaption/releases).
Just download, install, and you're good to go.

---

## 🧪 Usage

1. Launch the app (or run with `npm start`)
2. Enter your OpenAI API key when prompted
3. Upload an audio or video file via drag-and-drop or the file picker
4. Click **“Generate SRT Captions”**
5. Preview and export your SRT file

---

## 🧰 Development

Run in development mode with hot-reloading and DevTools:

```bash
npm run dev
```

---

## 🏗 Build for Distribution

Generate platform-specific builds:

```bash
npm run build
```

---

## 🎞 Supported Formats

**Audio**: MP3, WAV, M4A, AAC, OGG, WMA

**Video**: MP4, AVI, MOV, MKV, FLV, WEBM

---

## 💻 Requirements

* **Node.js**: Version 16 or higher
* **OpenAI API Key**: With Whisper access
* **FFmpeg**: Installed and accessible in your system's PATH
* **Operating System**:

  * **macOS**: Version 10.15 (Catalina) or later, supporting both Intel and Apple Silicon architectures
  * **Windows**: Windows 10 (Build 1809) or newer
  * **Linux**:

    * **AppImage Support**: Compatible with most 64-bit Linux distributions, including:

      * Ubuntu 20.04 LTS or newer
      * Fedora 33 or newer
      * Debian 10 (Buster) or newer
      * openSUSE Leap 15.2 or newer
      * **Note**: Ensure that your system has GTK 3 or higher installed, as Electron applications require it for proper functionality.
   
---

## 📦 Install FFmpeg

**macOS (with Homebrew):**

```bash
brew install ffmpeg
```

**Windows (with Chocolatey):**

```bash
choco install ffmpeg
```

**Windows (Installer from FFmpeg)**
https://ffmpeg.org/download.html

**Linux (Debian/Ubuntu):**

```bash
sudo apt update && sudo apt install ffmpeg
```

**For a more in-depth guide, visit [here](https://www.hostinger.com/tutorials/how-to-install-ffmpeg)**

---

## 🍏 macOS Users — “App is Damaged” Fix

If you get the error:
**"AutoCaption is damaged and can’t be opened"** — don’t worry. This is due to macOS being strict about unsigned apps.

Fix it with:

```bash
xattr -cr /Applications/AutoCaption.app
```

That clears the quarantine flag. The app should open normally afterward.

---

## 📝 TODO

Planned features for upcoming versions:

* 🌐 **Auto-Updater**
  Seamless updates via GitHub

* 📤 **More Export Formats**
  Support for VTT and other formats

* 🗂 **Batch Processing**
  Transcribe multiple files at once

* 🌍 **Language Selection**
  Select Whisper transcription languages

* 💾 **Transcript History**
  Save and revisit previous transcriptions

* 🔍 **Live Preview**
  Real-time subtitle rendering during playback

---

## 📄 License

Released under the [MIT License](./LICENSE)
