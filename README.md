# 🎧 AutoCaption

**Automatic caption generation powered by OpenAI Whisper**  
Easily transcribe and generate SRT captions from audio or video files — with a beautiful, modern interface.

> 💡 If you find this project helpful, please consider giving it a **⭐️** — it really helps support continued development!

---

## ✨ Features

- 🔑 **Plug & Play** — Just enter your OpenAI API key and you're ready to go
- 🎞 **Wide Format Support** — MP3, WAV, MP4, AVI, MOV, MKV, and more
- 🧠 **Whisper-Powered** — Uses OpenAI Whisper to generate high-quality captions
- 📝 **Preview & Edit** — View captions before exporting to SRT
- 📁 **Drag & Drop** — Upload files with ease
- 🖥 **Cross-platform** — Runs on Windows, macOS (Intel + Apple Silicon), and Linux
- 🎨 **Modern UI** — Built with Electron, designed for clarity and speed

---

## 🚀 Installation

### 🔧 From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/AutoCaption.git
   cd AutoCaption
````

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

### 📦 From GitHub Releases

Prebuilt installers for **Windows, macOS (arm64 + x64), and Linux** are available under the [Releases tab](https://github.com/your-username/AutoCaption/releases).
Just download, install, and go.

---

## 🧪 Usage

1. Launch the app (or run it with `npm start`).
2. Enter your OpenAI API key when prompted.
3. Upload an audio or video file via drag-and-drop or file picker.
4. Click **“Generate SRT Captions.”**
5. Preview and download your caption file.

---

## 🧰 Development

Start in development mode with hot-reloading and DevTools:

```bash
npm run dev
```

---

## 🏗 Building

Create platform-specific builds for distribution:

```bash
npm run build
```

---

## 🎞 Supported Formats

**Audio**: MP3, WAV, M4A, AAC, OGG, WMA
**Video**: MP4, AVI, MOV, MKV, FLV, WEBM

---

## 💻 Requirements

* Node.js 16+
* An OpenAI API key (with Whisper support)
* macOS, Windows, or Linux

---

## 🍏 macOS Users — “App is damaged” Fix

If you see a message saying **"AutoCaption is damaged and can’t be opened"**, it's just macOS being overly strict with unsigned apps.

To fix it:

```bash
xattr -cr /Applications/AutoCaption.app
```

That removes the quarantine flag. Then it should open just fine.

---

## 📄 License

[MIT License](./LICENSE)

