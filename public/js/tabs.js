/**
 * VideoLab - Tab Navigation
 * Handles switching between Player, Clip, and Convert tabs
 */

class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.contents = document.querySelectorAll('.tab-content');
        this.currentTab = 'player';
        
        this.init();
    }
    
    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Keyboard shortcut: 1, 2, 3 for tabs (with Alt)
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                if (e.key === '1') this.switchTab('player');
                else if (e.key === '2') this.switchTab('clip');
                else if (e.key === '3') this.switchTab('convert');
            }
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        this.contents.forEach(content => {
            const isActive = content.id === tabName + 'Tab';
            content.classList.toggle('active', isActive);
        });
        
        this.currentTab = tabName;
        
        // Pause videos when switching away
        if (tabName !== 'player' && window.videoLab) {
            const video = document.getElementById('videoPlayer');
            if (video) video.pause();
        }
        
        if (tabName !== 'clip') {
            const clipVideo = document.getElementById('clipPreviewVideo');
            if (clipVideo) clipVideo.pause();
        }
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
});
