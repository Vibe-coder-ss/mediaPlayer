/**
 * VideoLab - Video Clipper (Tab Version)
 * Allows users to select start/end times and create video clips
 */

class VideoClipper {
    constructor() {
        // File selection
        this.fileInput = document.getElementById('clipFileInput');
        this.dropZone = document.getElementById('clipDropZone');
        this.dropContent = document.getElementById('clipDropContent');
        this.fileSelected = document.getElementById('clipFileSelected');
        this.fileNameDisplay = document.getElementById('clipFileName');
        this.changeFileBtn = document.getElementById('clipChangeFile');
        
        // Preview elements
        this.previewPlayer = document.getElementById('clipPreviewPlayer');
        this.previewVideo = document.getElementById('clipPreviewVideo');
        this.timeline = document.getElementById('clipTimeline');
        this.playhead = document.getElementById('clipPlayhead');
        this.clipRange = document.getElementById('clipRange');
        this.startHandle = document.getElementById('clipStartHandle');
        this.endHandle = document.getElementById('clipEndHandle');
        this.previewTimeDisplay = document.getElementById('clipPreviewTime');
        this.playBtn = document.getElementById('clipPlayBtn');
        this.previewSelectionBtn = document.getElementById('clipPreviewSelection');
        
        // Controls section
        this.controlsSection = document.getElementById('clipControlsSection');
        
        // Time inputs
        this.startTimeInput = document.getElementById('clipStartTime');
        this.endTimeInput = document.getElementById('clipEndTime');
        this.durationDisplay = document.getElementById('clipDurationDisplay');
        this.markStartBtn = document.getElementById('markStartBtn');
        this.markEndBtn = document.getElementById('markEndBtn');
        
        // Action
        this.startClipBtn = document.getElementById('startClip');
        this.progressSection = document.getElementById('clipProgressSection');
        this.progressFill = document.getElementById('clipProgressFill');
        this.progressText = document.getElementById('clipProgressText');
        this.progressPercent = document.getElementById('clipProgressPercent');
        
        // State
        this.selectedFile = null;
        this.duration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.isDragging = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // File selection
        this.dropZone.addEventListener('click', (e) => {
            if (!e.target.closest('.change-file-btn')) {
                this.fileInput.click();
            }
        });
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFileSelect(e.target.files[0]);
        });
        this.changeFileBtn.addEventListener('click', () => this.fileInput.click());
        
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // Preview video events
        this.previewVideo.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.previewVideo.addEventListener('timeupdate', () => this.updatePlayhead());
        this.previewVideo.addEventListener('play', () => this.playBtn.textContent = '⏸');
        this.previewVideo.addEventListener('pause', () => this.playBtn.textContent = '▶');
        
        // Preview controls
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.previewSelectionBtn.addEventListener('click', () => this.previewSelection());
        
        // Timeline click to seek
        this.timeline.addEventListener('click', (e) => {
            if (!e.target.classList.contains('clip-handle')) {
                this.seekToPosition(e);
            }
        });
        
        // Handle dragging
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // Touch support
        this.startHandle.addEventListener('touchstart', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('touchstart', (e) => this.startDrag(e, 'end'));
        document.addEventListener('touchmove', (e) => this.onDrag(e));
        document.addEventListener('touchend', () => this.stopDrag());
        
        // Time inputs
        this.startTimeInput.addEventListener('change', () => this.onTimeInputChange('start'));
        this.endTimeInput.addEventListener('change', () => this.onTimeInputChange('end'));
        this.markStartBtn.addEventListener('click', () => this.markTime('start'));
        this.markEndBtn.addEventListener('click', () => this.markTime('end'));
        
        // Create clip
        this.startClipBtn.addEventListener('click', () => this.createClip());
    }
    
    handleFileSelect(file) {
        if (!file || !file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }
        
        this.selectedFile = file;
        this.fileNameDisplay.textContent = file.name;
        this.dropContent.style.display = 'none';
        this.fileSelected.style.display = 'flex';
        
        // Load video preview
        const url = URL.createObjectURL(file);
        this.previewVideo.src = url;
        this.previewVideo.load();
    }
    
    onVideoLoaded() {
        this.duration = this.previewVideo.duration;
        this.startTime = 0;
        this.endTime = this.duration;
        
        // Show preview and controls
        this.previewPlayer.style.display = 'block';
        this.controlsSection.style.display = 'block';
        
        // Initialize UI
        this.updateTimeInputs();
        this.updateClipRange();
        this.updatePreviewTime();
    }
    
    togglePlay() {
        if (this.previewVideo.paused) {
            this.previewVideo.play();
        } else {
            this.previewVideo.pause();
        }
    }
    
    previewSelection() {
        this.previewVideo.currentTime = this.startTime;
        this.previewVideo.play();
        
        const checkEnd = () => {
            if (this.previewVideo.currentTime >= this.endTime) {
                this.previewVideo.pause();
                this.previewVideo.currentTime = this.startTime;
                this.previewVideo.removeEventListener('timeupdate', checkEnd);
            }
        };
        this.previewVideo.addEventListener('timeupdate', checkEnd);
    }
    
    seekToPosition(e) {
        if (this.isDragging) return;
        const rect = this.timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        this.previewVideo.currentTime = percent * this.duration;
    }
    
    updatePlayhead() {
        if (!this.duration) return;
        const percent = (this.previewVideo.currentTime / this.duration) * 100;
        this.playhead.style.left = percent + '%';
        this.updatePreviewTime();
    }
    
    updatePreviewTime() {
        const current = this.formatTime(this.previewVideo.currentTime);
        const total = this.formatTime(this.duration);
        this.previewTimeDisplay.textContent = `${current} / ${total}`;
    }
    
    startDrag(e, handle) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = handle;
        this.previewVideo.pause();
    }
    
    onDrag(e) {
        if (!this.isDragging || !this.timeline) return;
        
        const rect = this.timeline.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * this.duration;
        
        if (this.isDragging === 'start') {
            this.startTime = Math.min(time, this.endTime - 0.5);
            this.startTime = Math.max(0, this.startTime);
        } else {
            this.endTime = Math.max(time, this.startTime + 0.5);
            this.endTime = Math.min(this.duration, this.endTime);
        }
        
        this.updateClipRange();
        this.updateTimeInputs();
        this.previewVideo.currentTime = this.isDragging === 'start' ? this.startTime : this.endTime;
    }
    
    stopDrag() {
        this.isDragging = null;
    }
    
    updateClipRange() {
        if (!this.duration) return;
        
        const startPercent = (this.startTime / this.duration) * 100;
        const endPercent = (this.endTime / this.duration) * 100;
        
        this.startHandle.style.left = startPercent + '%';
        this.endHandle.style.left = endPercent + '%';
        this.clipRange.style.left = startPercent + '%';
        this.clipRange.style.width = (endPercent - startPercent) + '%';
    }
    
    updateTimeInputs() {
        this.startTimeInput.value = this.formatTime(this.startTime);
        this.endTimeInput.value = this.formatTime(this.endTime);
        this.durationDisplay.textContent = this.formatTime(this.endTime - this.startTime);
    }
    
    onTimeInputChange(which) {
        const input = which === 'start' ? this.startTimeInput : this.endTimeInput;
        const seconds = this.parseTime(input.value);
        
        if (isNaN(seconds)) {
            this.updateTimeInputs();
            return;
        }
        
        if (which === 'start') {
            this.startTime = Math.max(0, Math.min(seconds, this.endTime - 0.5));
        } else {
            this.endTime = Math.min(this.duration, Math.max(seconds, this.startTime + 0.5));
        }
        
        this.updateClipRange();
        this.updateTimeInputs();
        this.previewVideo.currentTime = which === 'start' ? this.startTime : this.endTime;
    }
    
    markTime(which) {
        const currentTime = this.previewVideo.currentTime;
        
        if (which === 'start') {
            if (currentTime < this.endTime - 0.5) {
                this.startTime = currentTime;
            }
        } else {
            if (currentTime > this.startTime + 0.5) {
                this.endTime = currentTime;
            }
        }
        
        this.updateClipRange();
        this.updateTimeInputs();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00.0';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    }
    
    parseTime(str) {
        const parts = str.split(':').map(p => parseFloat(p));
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return parseFloat(str) || 0;
    }
    
    async createClip() {
        if (!this.selectedFile) return;
        
        const format = document.querySelector('input[name="clipFormat"]:checked').value;
        
        this.startClipBtn.disabled = true;
        this.progressSection.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Uploading...';
        
        try {
            const formData = new FormData();
            formData.append('video', this.selectedFile);
            formData.append('format', format);
            formData.append('startTime', this.startTime.toFixed(3));
            formData.append('endTime', this.endTime.toFixed(3));
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 40);
                    this.progressFill.style.width = percent + '%';
                    this.progressPercent.textContent = percent + '%';
                }
            });
            
            xhr.upload.addEventListener('load', () => {
                this.progressText.textContent = 'Creating clip...';
                let pct = 40;
                const interval = setInterval(() => {
                    if (pct < 90) {
                        pct += Math.random() * 5;
                        this.progressFill.style.width = pct + '%';
                        this.progressPercent.textContent = Math.round(pct) + '%';
                    }
                }, 200);
                xhr._interval = interval;
            });
            
            xhr.addEventListener('load', () => {
                if (xhr._interval) clearInterval(xhr._interval);
                
                if (xhr.status === 200) {
                    this.progressFill.style.width = '100%';
                    this.progressPercent.textContent = '100%';
                    this.progressText.textContent = 'Download starting...';
                    
                    const blob = new Blob([xhr.response], { type: `video/${format}` });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `clip_${this.selectedFile.name.replace(/\.[^.]+$/, '')}.${format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    setTimeout(() => {
                        this.progressSection.style.display = 'none';
                        this.startClipBtn.disabled = false;
                        this.progressText.textContent = 'Done!';
                    }, 1500);
                } else {
                    throw new Error('Clip creation failed');
                }
            });
            
            xhr.addEventListener('error', () => {
                if (xhr._interval) clearInterval(xhr._interval);
                alert('Failed to create clip. Make sure FFmpeg is installed.');
                this.progressSection.style.display = 'none';
                this.startClipBtn.disabled = false;
            });
            
            xhr.open('POST', '/api/clip');
            xhr.responseType = 'arraybuffer';
            xhr.send(formData);
            
        } catch (error) {
            console.error('Clip error:', error);
            alert('Failed to create clip: ' + error.message);
            this.progressSection.style.display = 'none';
            this.startClipBtn.disabled = false;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.videoClipper = new VideoClipper();
});
