/**
 * VideoLab - Video Converter (Tab Version)
 * Handles video format conversion
 */

class VideoConverter {
    constructor() {
        // FFmpeg status
        this.ffmpegStatus = document.getElementById('ffmpegStatus');
        
        // File selection
        this.fileInput = document.getElementById('convertFileInput');
        this.dropZone = document.getElementById('convertDropZone');
        this.dropContent = document.getElementById('convertDropContent');
        this.fileSelected = document.getElementById('convertFileSelected');
        this.fileNameDisplay = document.getElementById('convertFileName');
        this.changeFileBtn = document.getElementById('convertChangeFile');
        
        // Controls section
        this.controlsSection = document.getElementById('convertControlsSection');
        
        // Action
        this.startConvertBtn = document.getElementById('startConvert');
        this.progressSection = document.getElementById('convertProgressSection');
        this.progressFill = document.getElementById('convertProgressFill');
        this.progressText = document.getElementById('convertProgressText');
        this.progressPercent = document.getElementById('convertProgressPercent');
        
        // State
        this.selectedFile = null;
        this.ffmpegAvailable = false;
        
        this.init();
    }
    
    init() {
        this.checkFFmpeg();
        this.bindEvents();
    }
    
    async checkFFmpeg() {
        try {
            const response = await fetch('/api/ffmpeg-status');
            const data = await response.json();
            this.ffmpegAvailable = data.available;
            
            if (data.available) {
                this.ffmpegStatus.innerHTML = '<span class="status-icon">✅</span><span class="status-text">FFmpeg is available - Ready to convert</span>';
                this.ffmpegStatus.classList.add('available');
            } else {
                this.ffmpegStatus.innerHTML = '<span class="status-icon">❌</span><span class="status-text">FFmpeg not found - Install FFmpeg to enable conversion</span>';
                this.ffmpegStatus.classList.add('unavailable');
            }
        } catch (error) {
            this.ffmpegStatus.innerHTML = '<span class="status-icon">⚠️</span><span class="status-text">Could not check FFmpeg status</span>';
            this.ffmpegStatus.classList.add('unavailable');
        }
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
        
        // Convert button
        this.startConvertBtn.addEventListener('click', () => this.convertVideo());
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        this.selectedFile = file;
        this.fileNameDisplay.textContent = file.name;
        this.dropContent.style.display = 'none';
        this.fileSelected.style.display = 'flex';
        
        // Show controls
        this.controlsSection.style.display = 'block';
    }
    
    async convertVideo() {
        if (!this.selectedFile || !this.ffmpegAvailable) return;
        
        const format = document.querySelector('input[name="convertFormat"]:checked').value;
        
        this.startConvertBtn.disabled = true;
        this.progressSection.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Uploading...';
        
        try {
            const formData = new FormData();
            formData.append('video', this.selectedFile);
            formData.append('format', format);
            
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 40);
                    this.progressFill.style.width = percent + '%';
                    this.progressPercent.textContent = percent + '%';
                }
            });
            
            xhr.upload.addEventListener('load', () => {
                this.progressText.textContent = 'Converting...';
                let pct = 40;
                const interval = setInterval(() => {
                    if (pct < 90) {
                        pct += Math.random() * 3;
                        this.progressFill.style.width = pct + '%';
                        this.progressPercent.textContent = Math.round(pct) + '%';
                    }
                }, 300);
                xhr._interval = interval;
            });
            
            xhr.addEventListener('load', () => {
                if (xhr._interval) clearInterval(xhr._interval);
                
                if (xhr.status === 200) {
                    this.progressFill.style.width = '100%';
                    this.progressPercent.textContent = '100%';
                    this.progressText.textContent = 'Download starting...';
                    
                    // Download the converted file
                    const blob = new Blob([xhr.response], { type: `video/${format}` });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const originalName = this.selectedFile.name.replace(/\.[^.]+$/, '');
                    a.download = `videoLab_${originalName}.${format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    setTimeout(() => {
                        this.progressSection.style.display = 'none';
                        this.startConvertBtn.disabled = false;
                        this.progressText.textContent = 'Done!';
                    }, 1500);
                } else {
                    throw new Error('Conversion failed');
                }
            });
            
            xhr.addEventListener('error', () => {
                if (xhr._interval) clearInterval(xhr._interval);
                alert('Conversion failed. Check server logs.');
                this.progressSection.style.display = 'none';
                this.startConvertBtn.disabled = false;
            });
            
            xhr.open('POST', '/api/convert');
            xhr.responseType = 'arraybuffer';
            xhr.send(formData);
            
        } catch (error) {
            console.error('Conversion error:', error);
            alert('Failed to convert: ' + error.message);
            this.progressSection.style.display = 'none';
            this.startConvertBtn.disabled = false;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.videoConverter = new VideoConverter();
});
