/**
 * VideoLab - Lightweight Video Player
 * Minimal, efficient vanilla JavaScript video player for local files
 * With support for subtitles and converting unsupported formats
 */

class VideoLabPlayer {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('videoPlayer');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoControls = document.getElementById('videoControls');
        this.noVideoMessage = document.getElementById('noVideoMessage');
        this.openFileBtn = document.getElementById('openFileBtn');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        
        // File Picker Elements
        this.fileInput = document.getElementById('fileInput');
        this.filePickerBtn = document.getElementById('filePickerBtn');
        this.localFilesContainer = document.getElementById('localFilesContainer');
        
        // Controls
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.playbackSpeed = document.getElementById('playbackSpeed');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        
        // Subtitle Controls
        this.subtitleInput = document.getElementById('subtitleInput');
        this.subtitleBtn = document.getElementById('subtitleBtn');
        this.subtitleToggle = document.getElementById('subtitleToggle');
        this.subtitleIndicator = document.getElementById('subtitleIndicator');
        
        // Progress
        this.progressBar = document.getElementById('progressBar');
        this.progressFilled = document.getElementById('progressFilled');
        this.progressThumb = document.getElementById('progressThumb');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        
        // State
        this.localFiles = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.isConverting = false;
        
        // Subtitle state
        this.currentSubtitleTrack = null;
        this.subtitlesEnabled = true;
        
        // Supported formats (native browser support)
        this.nativeFormats = ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'm4a'];
        
        // User preferences
        this.userPreferences = {
            speed: 1,
            volume: 1,
            muted: false
        };
        
        this.init();
    }
    
    init() {
        this.loadPreferences();
        this.bindEvents();
        this.bindSpeedControls();
        this.bindSubtitleControls();
        this.setupKeyboardShortcuts();
        this.initializeUI();
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('videolab_prefs');
            if (saved) {
                this.userPreferences = { ...this.userPreferences, ...JSON.parse(saved) };
            }
        } catch (e) {}
    }
    
    savePreferences() {
        try {
            localStorage.setItem('videolab_prefs', JSON.stringify(this.userPreferences));
        } catch (e) {}
    }
    
    initializeUI() {
        this.speedSlider.value = this.userPreferences.speed;
        this.speedValue.textContent = this.userPreferences.speed.toFixed(2) + 'x';
        this.updateSpeedValueColor(this.userPreferences.speed);
        this.updateSpeedDropdown(this.userPreferences.speed);
        this.volumeSlider.value = this.userPreferences.volume;
    }
    
    applyPreferencesToVideo() {
        this.video.playbackRate = this.userPreferences.speed;
        this.video.volume = this.userPreferences.volume;
        this.video.muted = this.userPreferences.muted;
        this.updateVolumeUI();
    }
    
    // Check if format is natively supported
    isNativeFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return this.nativeFormats.includes(ext);
    }
    
    // Get file extension
    getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    // Check if it's an audio file
    isAudioFile(filename) {
        const ext = this.getExtension(filename);
        return ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext);
    }
    
    bindEvents() {
        // File picker - accept more formats
        this.fileInput.setAttribute('accept', 'video/*,audio/*,.mkv,.mov,.wmv,.flv,.m4v,.mp3,.wav,.flac');
        
        this.filePickerBtn.addEventListener('click', () => this.fileInput.click());
        this.openFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.fileInput.value = '';
        });
        
        // Click on no-video area to open file
        this.noVideoMessage.addEventListener('click', () => this.fileInput.click());
        
        // Drag and drop
        [this.videoContainer, this.noVideoMessage].forEach(el => {
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.classList.add('drag-over');
            });
            el.addEventListener('dragleave', (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
            });
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });
        });
        
        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.rewindBtn.addEventListener('click', () => this.skip(-10));
        this.forwardBtn.addEventListener('click', () => this.skip(10));
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Progress
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.progressBar.addEventListener('mousedown', () => this.startSeeking());
        
        // Video events
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('play', () => this.updatePlayState(true));
        this.video.addEventListener('pause', () => this.updatePlayState(false));
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
        this.video.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Handle playback errors (unsupported format)
        this.video.addEventListener('error', (e) => this.onVideoError(e));
    }
    
    // ==================== SUBTITLE HANDLING ====================
    
    bindSubtitleControls() {
        // Click CC button to load subtitle file
        this.subtitleBtn.addEventListener('click', () => {
            this.subtitleInput.click();
        });
        
        // Handle subtitle file selection
        this.subtitleInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadSubtitleFile(e.target.files[0]);
            }
            this.subtitleInput.value = '';
        });
        
        // Toggle subtitles on/off
        this.subtitleToggle.addEventListener('click', () => {
            this.toggleSubtitles();
        });
    }
    
    loadSubtitleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const ext = file.name.split('.').pop().toLowerCase();
            
            let vttContent;
            if (ext === 'srt') {
                vttContent = this.convertSrtToVtt(content);
            } else if (ext === 'vtt') {
                vttContent = content;
            } else if (ext === 'sub' || ext === 'ass') {
                // Basic conversion for other formats
                vttContent = this.convertToVtt(content, ext);
            } else {
                alert('Unsupported subtitle format. Please use .srt or .vtt files.');
                return;
            }
            
            this.addSubtitleTrack(vttContent, file.name);
        };
        reader.readAsText(file);
    }
    
    convertSrtToVtt(srtContent) {
        // Convert SRT to WebVTT format
        let vtt = 'WEBVTT\n\n';
        
        // Replace SRT timecodes (00:00:00,000) with VTT format (00:00:00.000)
        const lines = srtContent.trim().split(/\r?\n/);
        let result = [];
        
        for (let line of lines) {
            // Convert timestamp format
            if (line.match(/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/)) {
                line = line.replace(/,/g, '.');
            }
            result.push(line);
        }
        
        vtt += result.join('\n');
        return vtt;
    }
    
    convertToVtt(content, ext) {
        // Basic conversion - may not work for all formats
        let vtt = 'WEBVTT\n\n';
        
        if (ext === 'ass' || ext === 'ssa') {
            // Extract dialogue lines from ASS/SSA
            const lines = content.split(/\r?\n/);
            let cueIndex = 1;
            
            for (const line of lines) {
                if (line.startsWith('Dialogue:')) {
                    const parts = line.split(',');
                    if (parts.length >= 10) {
                        const start = parts[1].trim();
                        const end = parts[2].trim();
                        const text = parts.slice(9).join(',').replace(/\{[^}]*\}/g, '').trim();
                        
                        // Convert time format
                        const startTime = this.formatAssTime(start);
                        const endTime = this.formatAssTime(end);
                        
                        vtt += `${cueIndex}\n${startTime} --> ${endTime}\n${text}\n\n`;
                        cueIndex++;
                    }
                }
            }
        }
        
        return vtt;
    }
    
    formatAssTime(time) {
        // Convert ASS time (H:MM:SS.cc) to VTT time (HH:MM:SS.mmm)
        const parts = time.split(':');
        if (parts.length === 3) {
            const h = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const sAndMs = parts[2].split('.');
            const s = sAndMs[0].padStart(2, '0');
            const ms = (sAndMs[1] || '0').padEnd(3, '0').slice(0, 3);
            return `${h}:${m}:${s}.${ms}`;
        }
        return time;
    }
    
    addSubtitleTrack(vttContent, filename) {
        // Remove existing tracks
        this.removeSubtitleTrack();
        
        // Create blob URL for the VTT content
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Create and add track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = filename;
        track.srclang = 'en';
        track.src = url;
        track.default = true;
        
        this.video.appendChild(track);
        this.currentSubtitleTrack = { track, url, filename };
        
        // Wait for track to load then enable it
        track.addEventListener('load', () => {
            if (this.video.textTracks[0]) {
                this.video.textTracks[0].mode = this.subtitlesEnabled ? 'showing' : 'hidden';
            }
        });
        
        // Show toggle button and indicator
        this.subtitleToggle.style.display = 'flex';
        this.subtitleToggle.classList.remove('off');
        if (this.subtitleIndicator) {
            this.subtitleIndicator.style.display = 'inline';
            this.subtitleIndicator.textContent = `📝 ${filename}`;
        }
        
        this.subtitlesEnabled = true;
    }
    
    removeSubtitleTrack() {
        if (this.currentSubtitleTrack) {
            URL.revokeObjectURL(this.currentSubtitleTrack.url);
            if (this.currentSubtitleTrack.track.parentNode) {
                this.currentSubtitleTrack.track.parentNode.removeChild(this.currentSubtitleTrack.track);
            }
            this.currentSubtitleTrack = null;
        }
        
        // Remove all track elements
        const tracks = this.video.querySelectorAll('track');
        tracks.forEach(t => t.remove());
        
        // Hide toggle and indicator
        this.subtitleToggle.style.display = 'none';
        if (this.subtitleIndicator) {
            this.subtitleIndicator.style.display = 'none';
        }
    }
    
    toggleSubtitles() {
        if (!this.currentSubtitleTrack) return;
        
        this.subtitlesEnabled = !this.subtitlesEnabled;
        
        if (this.video.textTracks[0]) {
            this.video.textTracks[0].mode = this.subtitlesEnabled ? 'showing' : 'hidden';
        }
        
        this.subtitleToggle.classList.toggle('off', !this.subtitlesEnabled);
    }
    
    // ==================== END SUBTITLE HANDLING ====================
    
    onVideoLoaded() {
        this.updateDuration();
        this.applyPreferencesToVideo();
        // Clear any error state
        this.hideConvertPrompt();
    }
    
    onVideoError(e) {
        if (this.currentIndex < 0 || this.isConverting) return;
        
        const file = this.localFiles[this.currentIndex];
        if (!file) return;
        
        console.log('Video error:', e);
        
        // Check if format needs conversion
        if (!this.isNativeFormat(file.name)) {
            this.showConvertPrompt(file);
        }
    }
    
    showConvertPrompt(file) {
        const ext = this.getExtension(file.name).toUpperCase();
        
        // Create or update convert prompt
        let prompt = document.getElementById('convertPrompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'convertPrompt';
            prompt.className = 'convert-prompt';
            this.videoContainer.appendChild(prompt);
        }
        
        prompt.innerHTML = `
            <div class="convert-prompt-content">
                <span class="prompt-icon">⚠️</span>
                <p><strong>${ext}</strong> format is not supported by browser</p>
                <p class="prompt-subtitle">Convert to MP4 for playback?</p>
                <div class="prompt-buttons">
                    <button class="prompt-btn primary" id="convertForPlayBtn">
                        🔄 Convert & Play
                    </button>
                    <button class="prompt-btn secondary" id="skipConvertBtn">
                        Skip
                    </button>
                </div>
                <div class="convert-progress-inline" id="convertProgressInline" style="display:none;">
                    <div class="progress-text">Converting...</div>
                    <div class="progress-bar-mini">
                        <div class="progress-fill-mini" id="progressFillMini"></div>
                    </div>
                </div>
            </div>
        `;
        
        prompt.style.display = 'flex';
        this.video.classList.remove('active');
        
        // Bind buttons
        document.getElementById('convertForPlayBtn').addEventListener('click', () => {
            this.convertForPlayback(file);
        });
        
        document.getElementById('skipConvertBtn').addEventListener('click', () => {
            this.hideConvertPrompt();
            this.playNextOrShowEmpty();
        });
    }
    
    hideConvertPrompt() {
        const prompt = document.getElementById('convertPrompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }
    
    async convertForPlayback(file) {
        this.isConverting = true;
        
        const progressInline = document.getElementById('convertProgressInline');
        const progressFill = document.getElementById('progressFillMini');
        const convertBtn = document.getElementById('convertForPlayBtn');
        
        if (progressInline) progressInline.style.display = 'block';
        if (convertBtn) convertBtn.disabled = true;
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('video', file.file);
            formData.append('format', 'mp4'); // Always convert to MP4 for playback
            
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && progressFill) {
                    const pct = Math.round((e.loaded / e.total) * 40);
                    progressFill.style.width = pct + '%';
                }
            });
            
            xhr.upload.addEventListener('load', () => {
                if (progressFill) {
                    // Animate conversion progress
                    let pct = 40;
                    const interval = setInterval(() => {
                        if (pct < 90) {
                            pct += Math.random() * 3;
                            progressFill.style.width = pct + '%';
                        }
                    }, 300);
                    xhr._progressInterval = interval;
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr._progressInterval) clearInterval(xhr._progressInterval);
                
                if (xhr.status === 200) {
                    // Create blob URL for converted video
                    const blob = new Blob([xhr.response], { type: 'video/mp4' });
                    const convertedUrl = URL.createObjectURL(blob);
                    
                    // Update file entry with converted URL
                    file.convertedUrl = convertedUrl;
                    file.isConverted = true;
                    
                    if (progressFill) progressFill.style.width = '100%';
                    
                    // Play the converted video
                    setTimeout(() => {
                        this.hideConvertPrompt();
                        this.playConvertedFile(file);
                        this.isConverting = false;
                    }, 500);
                } else {
                    throw new Error('Conversion failed');
                }
            });
            
            xhr.addEventListener('error', () => {
                if (xhr._progressInterval) clearInterval(xhr._progressInterval);
                alert('Failed to convert video. Please try the Convert button in the header.');
                this.hideConvertPrompt();
                this.isConverting = false;
            });
            
            xhr.open('POST', '/api/convert');
            xhr.responseType = 'arraybuffer';
            xhr.send(formData);
            
        } catch (error) {
            console.error('Conversion error:', error);
            alert('Failed to convert: ' + error.message);
            this.isConverting = false;
        }
    }
    
    playConvertedFile(file) {
        this.video.src = file.convertedUrl;
        this.video.load();
        this.video.classList.add('active');
        this.noVideoMessage.classList.add('hidden');
        this.videoControls.classList.add('always-visible');
        this.nowPlayingTitle.textContent = file.name + ' (converted)';
        this.renderLocalFiles();
        
        this.video.play().catch(() => {});
        setTimeout(() => this.videoControls.classList.remove('always-visible'), 3000);
    }
    
    playNextOrShowEmpty() {
        if (this.currentIndex < this.localFiles.length - 1) {
            this.playFile(this.currentIndex + 1);
        } else {
            this.video.classList.remove('active');
            this.noVideoMessage.classList.remove('hidden');
            this.nowPlayingTitle.textContent = '-';
        }
    }
    
    bindSpeedControls() {
        this.playbackSpeed.addEventListener('change', (e) => {
            this.setPlaybackSpeed(parseFloat(e.target.value));
        });
        this.speedSlider.addEventListener('input', (e) => {
            this.setPlaybackSpeed(parseFloat(e.target.value), true);
        });
        this.speedSlider.addEventListener('dblclick', () => this.setPlaybackSpeed(1));
    }
    
    updateSpeedValueColor(speed) {
        this.speedValue.classList.remove('slow', 'normal', 'fast');
        if (speed < 0.9) this.speedValue.classList.add('slow');
        else if (speed > 1.1) this.speedValue.classList.add('fast');
        else this.speedValue.classList.add('normal');
    }
    
    updateSpeedDropdown(speed) {
        const match = Array.from(this.playbackSpeed.options).find(o => Math.abs(parseFloat(o.value) - speed) < 0.01);
        this.playbackSpeed.value = match ? match.value : '';
    }
    
    setPlaybackSpeed(speed, fromSlider = false) {
        speed = Math.max(0.1, Math.min(4, speed));
        this.userPreferences.speed = speed;
        this.savePreferences();
        this.video.playbackRate = speed;
        this.speedSlider.value = speed;
        this.speedValue.textContent = speed.toFixed(2) + 'x';
        this.updateSpeedValueColor(speed);
        if (!fromSlider) this.playbackSpeed.value = speed;
        else this.updateSpeedDropdown(speed);
    }
    
    adjustSpeed(delta) {
        this.setPlaybackSpeed(this.userPreferences.speed + delta);
    }
    
    handleFiles(files) {
        if (!files || files.length === 0) return;
        
        // Accept video and audio files
        const mediaFiles = Array.from(files).filter(file => 
            file.type.startsWith('video/') || 
            file.type.startsWith('audio/') ||
            /\.(mp4|webm|ogg|mkv|mov|wmv|flv|m4v|mp3|wav|flac|m4a|aac)$/i.test(file.name)
        );
        
        if (mediaFiles.length === 0) {
            alert('Please select valid video or audio files.');
            return;
        }
        
        const startIndex = this.localFiles.length;
        
        mediaFiles.forEach(file => {
            if (!this.localFiles.some(lf => lf.name === file.name && lf.size === file.size)) {
                const isAudio = this.isAudioFile(file.name);
                this.localFiles.push({
                    file,
                    url: URL.createObjectURL(file),
                    name: file.name,
                    size: file.size,
                    sizeFormatted: this.formatFileSize(file.size),
                    isAudio: isAudio,
                    isNative: this.isNativeFormat(file.name)
                });
            }
        });
        
        this.renderLocalFiles();
        this.playFile(startIndex);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    renderLocalFiles() {
        if (this.localFiles.length === 0) {
            this.localFilesContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📂</span>
                    <p>No videos loaded</p>
                    <small>Click "Add Videos" or drag & drop</small>
                </div>
            `;
            return;
        }
        
        this.localFilesContainer.innerHTML = this.localFiles.map((file, i) => {
            const icon = file.isAudio ? '🎵' : '🎬';
            const badge = !file.isNative ? '<span class="format-badge-small">⚡</span>' : '';
            const convertedBadge = file.isConverted ? '<span class="converted-badge">✓</span>' : '';
            
            return `
                <div class="local-file-item ${i === this.currentIndex ? 'active' : ''}" data-index="${i}">
                    <span class="video-item-icon">${icon}</span>
                    <div class="video-item-info">
                        <div class="video-item-name" title="${file.name}">${file.name} ${badge}${convertedBadge}</div>
                        <div class="video-item-size">${file.sizeFormatted}</div>
                    </div>
                    <button class="remove-btn" data-index="${i}" title="Remove">✕</button>
                </div>
            `;
        }).join('');
        
        this.localFilesContainer.querySelectorAll('.local-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('remove-btn')) {
                    this.playFile(parseInt(item.dataset.index));
                }
            });
        });
        
        this.localFilesContainer.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(parseInt(btn.dataset.index));
            });
        });
    }
    
    playFile(index) {
        if (index < 0 || index >= this.localFiles.length) return;
        
        this.currentIndex = index;
        const file = this.localFiles[index];
        
        this.hideConvertPrompt();
        
        // Remove subtitles when changing videos
        this.removeSubtitleTrack();
        
        // Use converted URL if available, otherwise original
        const url = file.convertedUrl || file.url;
        
        this.video.src = url;
        this.video.load();
        this.video.classList.add('active');
        this.noVideoMessage.classList.add('hidden');
        this.videoControls.classList.add('always-visible');
        
        const suffix = file.isConverted ? ' (converted)' : '';
        this.nowPlayingTitle.textContent = file.name + suffix;
        this.renderLocalFiles();
        
        this.video.play().catch(() => {});
        setTimeout(() => this.videoControls.classList.remove('always-visible'), 3000);
    }
    
    removeFile(index) {
        if (index < 0 || index >= this.localFiles.length) return;
        
        const file = this.localFiles[index];
        URL.revokeObjectURL(file.url);
        if (file.convertedUrl) URL.revokeObjectURL(file.convertedUrl);
        
        this.localFiles.splice(index, 1);
        
        if (this.currentIndex === index) {
            this.video.src = '';
            this.video.classList.remove('active');
            this.noVideoMessage.classList.remove('hidden');
            this.hideConvertPrompt();
            this.removeSubtitleTrack();
            this.nowPlayingTitle.textContent = '-';
            this.currentIndex = -1;
        } else if (this.currentIndex > index) {
            this.currentIndex--;
        }
        
        this.renderLocalFiles();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'arrowleft':
                case 'j':
                    e.preventDefault();
                    this.skip(-10);
                    break;
                case 'arrowright':
                case 'l':
                    e.preventDefault();
                    this.skip(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    this.adjustVolume(0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    this.adjustVolume(-0.1);
                    break;
                case 'm':
                    this.toggleMute();
                    break;
                case 'f':
                    this.toggleFullscreen();
                    break;
                case 'o':
                    this.fileInput.click();
                    break;
                case 'c':
                    // Toggle subtitles or open subtitle picker
                    if (this.currentSubtitleTrack) {
                        this.toggleSubtitles();
                    } else {
                        this.subtitleInput.click();
                    }
                    break;
                case ',':
                    e.preventDefault();
                    this.adjustSpeed(-0.1);
                    break;
                case '.':
                    e.preventDefault();
                    this.adjustSpeed(0.1);
                    break;
                case 'backspace':
                    e.preventDefault();
                    this.setPlaybackSpeed(1);
                    break;
                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9':
                    if (this.video.duration) {
                        this.video.currentTime = (parseInt(e.key) / 10) * this.video.duration;
                    }
                    break;
            }
        });
    }
    
    togglePlay() {
        if (!this.video.src) return;
        this.video.paused ? this.video.play() : this.video.pause();
    }
    
    updatePlayState(playing) {
        this.isPlaying = playing;
        this.playPauseBtn.querySelector('.icon-play').style.display = playing ? 'none' : 'inline';
        this.playPauseBtn.querySelector('.icon-pause').style.display = playing ? 'inline' : 'none';
    }
    
    stop() {
        this.video.pause();
        this.video.currentTime = 0;
    }
    
    skip(seconds) {
        this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seconds));
    }
    
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        this.video.currentTime = ((e.clientX - rect.left) / rect.width) * this.video.duration;
    }
    
    startSeeking() {
        const onMove = (e) => this.seek(e);
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        const pct = (this.video.currentTime / this.video.duration) * 100;
        this.progressFilled.style.width = pct + '%';
        this.progressThumb.style.left = pct + '%';
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    
    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.video.duration);
    }
    
    formatTime(s) {
        if (isNaN(s)) return '0:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        return h > 0 
            ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
            : `${m}:${sec.toString().padStart(2,'0')}`;
    }
    
    toggleMute() {
        this.video.muted = !this.video.muted;
        this.userPreferences.muted = this.video.muted;
        this.savePreferences();
    }
    
    setVolume(value) {
        value = parseFloat(value);
        this.video.volume = value;
        this.video.muted = value === 0;
        this.userPreferences.volume = value;
        this.userPreferences.muted = value === 0;
        this.savePreferences();
    }
    
    adjustVolume(delta) {
        const v = Math.max(0, Math.min(1, this.video.volume + delta));
        this.setVolume(v);
        this.volumeSlider.value = v;
    }
    
    updateVolumeUI() {
        const v = this.video.muted ? 0 : this.video.volume;
        this.volumeSlider.value = v;
        this.muteBtn.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoContainer.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }
    
    onVideoEnded() {
        if (this.currentIndex < this.localFiles.length - 1) {
            this.playFile(this.currentIndex + 1);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.videoLab = new VideoLabPlayer();
});
