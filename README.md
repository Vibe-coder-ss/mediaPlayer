# 🎬 VideoLab

A minimal, lightweight video player with format conversion, video clipping, and subtitle support.

## Features

- ⚡ **Ultra Lightweight** - Vanilla HTML, CSS, and JavaScript
- 🚀 **Zero Upload for Playback** - Videos play directly from your disk
- 🔄 **Format Conversion** - Convert videos between popular formats
- ✂️ **Video Clipping** - Cut portions of videos with visual timeline
- 📝 **Subtitle Support** - Load SRT, VTT, ASS subtitle files
- 💾 **Memory Efficient** - Minimal server footprint
- 🎛️ **Full Controls** - Play, pause, seek, volume, speed, fullscreen
- 🖱️ **Drag & Drop** - Just drop files anywhere

## Quick Start

```bash
npm install
npm start
```

Open **http://localhost:3000**

## Running on a Custom Port

You can specify a custom port using any of these methods:

```bash
# Method 1: Pass port as argument
node server.js 8080

# Method 2: Use --port flag
node server.js --port=8080

# Method 3: Use -p flag  
node server.js -p 8080

# Method 4: Use environment variable
PORT=8080 node server.js

# Method 5: With npm (using --)
npm start -- 8080
```

### Show Help

```bash
node server.js --help
# or
npm run help
```

---

## Interface

VideoLab uses a clean **tab-based interface** with three main sections:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Player** | 🎬 | Main video player for playback |
| **Clip** | ✂️ | Cut portions of videos |
| **Convert** | 🔄 | Convert between formats |

Switch between tabs using the navigation in the header, or use keyboard shortcuts `Alt+1`, `Alt+2`, `Alt+3`.

---

## 🎬 Player Tab

The main video player with full playback controls.

### Loading Videos
- Click **"Add Videos"** in the sidebar
- **Drag & drop** video files onto the player
- Click on the player area when empty

### Playback Controls
- **Play/Pause** - Click video or ▶/⏸ button
- **Seek** - Click anywhere on the progress bar
- **Volume** - Use slider or 🔊 button
- **Speed** - Dropdown presets or fine-tune slider (0.1x - 4x)
- **Fullscreen** - Click ⛶ or press `F`

### Subtitles
1. Load a video into the player
2. Click the **CC** button in the controls
3. Select a subtitle file (.srt, .vtt, .ass)
4. Toggle subtitles on/off with the CC toggle button

**Supported subtitle formats:** SRT, VTT, ASS/SSA, SUB

---

## ✂️ Clip Tab

Create clips by extracting portions of videos.

### How to Create a Clip

1. **Select Video** - Drop a video file or click to browse
2. **Set Start Time:**
   - Drag the **left handle** (◀) on the timeline
   - Or click **📍** while video plays at desired position
   - Or type time directly (e.g., `1:30.5`)
3. **Set End Time:**
   - Drag the **right handle** (▶) on the timeline
   - Or click **📍** at the desired end position
   - Or type time directly
4. **Preview** - Click **🔁 Preview Clip** to watch selection
5. **Choose Format** - Select MP4, WebM, MKV, or MOV
6. **Create Clip** - Click the green button to process

The clip will download automatically when ready.

### Tips
- Minimum clip duration is 0.5 seconds
- Time format: `minutes:seconds.tenths` (e.g., `2:30.5`)
- The duration display updates in real-time

---

## 🔄 Convert Tab

Convert videos between different formats.

### How to Convert

1. **Select Video** - Drop a file or click to browse
2. **Choose Format:**
   - **MP4** - Universal, best compatibility
   - **WebM** - Web optimized, smaller size
   - **MKV** - High quality container
   - **MOV** - Apple/QuickTime format
   - **MP3** - Extract audio only
   - **WAV** - Lossless audio
3. **Convert** - Click to start conversion
4. File downloads automatically when complete

### Requirements
- **FFmpeg** must be installed on the server
- Install: `apt install ffmpeg` (Linux) or `brew install ffmpeg` (Mac)
- Status indicator shows if FFmpeg is available

---

## ⌨️ Keyboard Shortcuts

### Player Controls
| Key | Action |
|-----|--------|
| `Space` / `K` | Play/Pause |
| `J` / `←` | Rewind 10s |
| `L` / `→` | Forward 10s |
| `↑` / `↓` | Volume up/down |
| `M` | Mute/Unmute |
| `F` | Fullscreen |
| `O` | Open file |
| `C` | Load/Toggle subtitles |
| `,` / `.` | Speed ±0.1x |
| `Backspace` | Reset speed to 1x |
| `0-9` | Jump to 0%-90% |

### Tab Navigation
| Key | Action |
|-----|--------|
| `Alt + 1` | Player tab |
| `Alt + 2` | Clip tab |
| `Alt + 3` | Convert tab |

---

## Project Structure

```
mediaPlayer/
├── server.js           # Express server + FFmpeg APIs
├── package.json     
└── public/
    ├── index.html      # Main UI with tabs
    ├── css/style.css   # All styles
    └── js/
        ├── player.js   # Video player + subtitles
        ├── tabs.js     # Tab navigation
        ├── clipper.js  # Video clipping
        └── converter.js # Format conversion
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ffmpeg-status` | GET | Check FFmpeg availability |
| `/api/formats` | GET | List supported formats |
| `/api/convert` | POST | Convert video format |
| `/api/clip` | POST | Create video clip |

---

## Troubleshooting

### Video won't play?
- Some formats (MKV, MOV) need conversion for browser playback
- Accept the auto-convert prompt, or use the Convert tab

### Subtitles not showing?
- Load a video first, then click CC button
- Make sure subtitle file is .srt or .vtt format
- Press `C` to toggle visibility

### Conversion/Clipping fails?
- Verify FFmpeg is installed: `ffmpeg -version`
- Check server console for error messages
- Large files take longer - watch the progress bar

### Port already in use?
```bash
# Run on a different port
node server.js 8080
```

### FFmpeg not available?
```bash
# Linux
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Then restart the server
npm start
```

---

## License

MIT
