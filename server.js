const express = require('express');
const path = require('path');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const app = express();

// Port configuration priority:
// 1. Command line argument: node server.js 8080
// 2. Environment variable: PORT=8080 node server.js
// 3. Default: 3000
function getPort() {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        // Support "8080" format
        if (/^\d+$/.test(arg)) {
            return parseInt(arg);
        }
        // Support "--port=8080" format
        if (arg.startsWith('--port=')) {
            return parseInt(arg.split('=')[1]);
        }
        // Support "-p 8080" or "--port 8080" format
        if (arg === '-p' || arg === '--port') {
            const nextArg = args[i + 1];
            if (nextArg && /^\d+$/.test(nextArg)) {
                return parseInt(nextArg);
            }
        }
    }
    // Fall back to environment variable or default
    return parseInt(process.env.PORT) || 3000;
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
  VideoLab - Lightweight Video Player Server

  Usage:
    node server.js [port]           Start server on specified port
    node server.js --port=8080      Start server on port 8080
    node server.js -p 8080          Start server on port 8080

  Options:
    -p, --port    Port number (default: 3000)
    -h, --help    Show this help message

  Examples:
    node server.js                  # Runs on port 3000
    node server.js 8080             # Runs on port 8080
    node server.js --port=9000      # Runs on port 9000
    PORT=4000 node server.js        # Runs on port 4000
    `);
    process.exit(0);
}

const PORT = getPort();

// Validate port range
if (PORT < 1 || PORT > 65535) {
    console.error('❌ Error: Port must be between 1 and 65535');
    process.exit(1);
}

// Temp directory for conversions
const TEMP_DIR = path.join(os.tmpdir(), 'videolab');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: TEMP_DIR,
    filename: (req, file, cb) => {
        const uniqueName = `upload_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB limit
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Supported output formats
const FORMATS = {
    'mp4': { ext: 'mp4', codec: ['-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast'] },
    'webm': { ext: 'webm', codec: ['-c:v', 'libvpx-vp9', '-c:a', 'libopus', '-b:v', '1M'] },
    'mkv': { ext: 'mkv', codec: ['-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast'] },
    'mov': { ext: 'mov', codec: ['-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast'] },
    'mp3': { ext: 'mp3', codec: ['-vn', '-c:a', 'libmp3lame', '-q:a', '2'] },
    'wav': { ext: 'wav', codec: ['-vn', '-c:a', 'pcm_s16le'] }
};

// Check if FFmpeg is available
let ffmpegAvailable = false;
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegAvailable = true;
    console.log('✅ FFmpeg detected');
} catch (e) {
    ffmpegAvailable = false;
    console.log('⚠️  FFmpeg not found. Video conversion will not be available.');
}

// API: Check FFmpeg status
app.get('/api/ffmpeg-status', (req, res) => {
    res.json({ available: ffmpegAvailable });
});

// API: Get supported formats
app.get('/api/formats', (req, res) => {
    res.json(Object.keys(FORMATS));
});

// API: Convert video
app.post('/api/convert', upload.single('video'), (req, res) => {
    if (!ffmpegAvailable) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'FFmpeg is not installed on the server' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const targetFormat = req.body.format;
    if (!FORMATS[targetFormat]) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid format' });
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputName = `videoLab_${originalName}.${FORMATS[targetFormat].ext}`;
    const outputPath = path.join(TEMP_DIR, `out_${Date.now()}_${outputName}`);

    // Build FFmpeg command
    const args = [
        '-i', inputPath,
        '-y', // Overwrite output
        ...FORMATS[targetFormat].codec,
        outputPath
    ];

    console.log(`Converting: ${req.file.originalname} -> ${outputName}`);

    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
        // Clean up input file
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (code !== 0) {
            console.error('FFmpeg error:', stderr.slice(-500));
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
            return res.status(500).json({ error: 'Conversion failed', details: stderr.slice(-300) });
        }

        // Send the converted file
        res.download(outputPath, outputName, (err) => {
            // Clean up output file after download
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
            if (err && !res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });
    });

    ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        try { fs.unlinkSync(inputPath); } catch (e) {}
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start conversion' });
        }
    });
});

// API: Clip video (cut a portion)
app.post('/api/clip', upload.single('video'), (req, res) => {
    if (!ffmpegAvailable) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'FFmpeg is not installed on the server' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const targetFormat = req.body.format || 'mp4';
    const startTime = parseFloat(req.body.startTime) || 0;
    const endTime = parseFloat(req.body.endTime);
    
    if (!FORMATS[targetFormat]) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid format' });
    }

    if (isNaN(endTime) || endTime <= startTime) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid time range' });
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const duration = endTime - startTime;
    const outputName = `clip_${originalName}_${startTime.toFixed(1)}s-${endTime.toFixed(1)}s.${FORMATS[targetFormat].ext}`;
    const outputPath = path.join(TEMP_DIR, `clip_${Date.now()}_${outputName}`);

    // Build FFmpeg command for clipping
    // Using -ss before -i for fast seeking, then -t for duration
    const args = [
        '-ss', startTime.toString(),
        '-i', inputPath,
        '-t', duration.toString(),
        '-y', // Overwrite output
        ...FORMATS[targetFormat].codec,
        '-avoid_negative_ts', 'make_zero',
        outputPath
    ];

    console.log(`Clipping: ${req.file.originalname} [${startTime}s - ${endTime}s] -> ${outputName}`);

    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
        // Clean up input file
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (code !== 0) {
            console.error('FFmpeg clip error:', stderr.slice(-500));
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
            return res.status(500).json({ error: 'Clip creation failed', details: stderr.slice(-300) });
        }

        // Send the clipped file
        res.download(outputPath, outputName, (err) => {
            // Clean up output file after download
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
            if (err && !res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });
    });

    ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        try { fs.unlinkSync(inputPath); } catch (e) {}
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start clip creation' });
        }
    });
});

// Clean up temp files on startup
try {
    fs.readdirSync(TEMP_DIR).forEach(file => {
        try { fs.unlinkSync(path.join(TEMP_DIR, file)); } catch (e) {}
    });
} catch (e) {}

// Pad port display for alignment
const portDisplay = PORT.toString().padEnd(5);

// Start server
app.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════╗
  ║                                        ║
  ║   ▶ VideoLab - Lightweight Player      ║
  ║                                        ║
  ║   🌐 http://localhost:${portDisplay}            ║
  ║                                        ║
  ║   Features:                            ║
  ║   • Local video playback               ║
  ║   • Format conversion ${ffmpegAvailable ? '✓' : '✗ (needs FFmpeg)'}             ║
  ║   • Video clipping ${ffmpegAvailable ? '✓' : '✗ (needs FFmpeg)'}                ║
  ║   • Subtitle support ✓                 ║
  ║                                        ║
  ║   Usage: node server.js [port]         ║
  ║   Help:  node server.js --help         ║
  ║                                        ║
  ╚════════════════════════════════════════╝
    `);
});
