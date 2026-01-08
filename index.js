// Play Counter Plugin
// Tracks play counts for each song and displays them in the UI

(function () {
    'use strict';

    const PlayCounter = {
        name: 'Play Counter',
        playCounts: {},
        lastTrackId: null,
        playStartTime: null,
        MIN_PLAY_TIME: 30000, // 30 seconds minimum to count as a play
        uiElement: null,

        init(api) {
            console.log('[PlayCounter] Plugin initialized');
            this.api = api;
            this.loadCounts();
            this.injectStyles();
            this.createUI();

            // Monitor track changes
            this.checkInterval = setInterval(() => this.checkTrack(), 1000);
            // Update UI periodically
            this.uiInterval = setInterval(() => this.updateUI(), 500);
        },

        injectStyles() {
            // Inject CSS for the play counter display
            const style = document.createElement('style');
            style.id = 'play-counter-styles';
            style.textContent = `
                #play-counter-widget {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    background: linear-gradient(135deg, rgba(88, 28, 135, 0.95), rgba(139, 92, 246, 0.95));
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 16px 20px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    min-width: 200px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(300px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                #play-counter-widget h3 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.9);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                #play-counter-widget h3::before {
                    content: '🎵';
                    font-size: 16px;
                }

                .play-counter-current {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 12px;
                }

                .play-counter-track-name {
                    font-size: 13px;
                    font-weight: 500;
                    color: white;
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .play-counter-count {
                    font-size: 24px;
                    font-weight: 700;
                    color: #fbbf24;
                    text-align: center;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .play-counter-label {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.7);
                    text-align: center;
                    margin-top: 2px;
                }

                .play-counter-stats {
                    display: flex;
                    gap: 8px;
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.7);
                }

                .play-counter-stat {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    padding: 6px 8px;
                    text-align: center;
                }

                .play-counter-stat-value {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                    margin-bottom: 2px;
                }

                .play-counter-no-track {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 12px;
                    padding: 8px;
                }
            `;
            document.head.appendChild(style);
            console.log('[PlayCounter] Styles injected');
        },

        createUI() {
            // Create the UI widget
            const widget = document.createElement('div');
            widget.id = 'play-counter-widget';
            widget.innerHTML = `
                <h3>Play Counter</h3>
                <div class="play-counter-current">
                    <div class="play-counter-track-name" id="pc-track-name">No track playing</div>
                    <div class="play-counter-count" id="pc-count">0</div>
                    <div class="play-counter-label">plays</div>
                </div>
                <div class="play-counter-stats">
                    <div class="play-counter-stat">
                        <span class="play-counter-stat-value" id="pc-total">0</span>
                        <span>Total Tracks</span>
                    </div>
                    <div class="play-counter-stat">
                        <span class="play-counter-stat-value" id="pc-total-plays">0</span>
                        <span>Total Plays</span>
                    </div>
                </div>
            `;
            document.body.appendChild(widget);
            this.uiElement = widget;
            console.log('[PlayCounter] UI created');
        },

        updateUI() {
            if (!this.uiElement || !this.api?.player?.getCurrentTrack) return;

            try {
                const track = this.api.player.getCurrentTrack();
                const trackNameEl = document.getElementById('pc-track-name');
                const countEl = document.getElementById('pc-count');
                const totalEl = document.getElementById('pc-total');
                const totalPlaysEl = document.getElementById('pc-total-plays');

                if (track) {
                    const count = this.getCount(track.id);
                    const trackName = track.title || 'Unknown Track';
                    const artist = track.artist || 'Unknown Artist';

                    trackNameEl.textContent = `${trackName} - ${artist}`;
                    countEl.textContent = count;
                } else {
                    trackNameEl.textContent = 'No track playing';
                    countEl.textContent = '0';
                }

                // Update stats
                const totalTracks = Object.keys(this.playCounts).length;
                const totalPlays = Object.values(this.playCounts).reduce((sum, count) => sum + count, 0);

                totalEl.textContent = totalTracks;
                totalPlaysEl.textContent = totalPlays;
            } catch (err) {
                console.error('[PlayCounter] UI update error:', err);
            }
        },

        async loadCounts() {
            if (!this.api?.storage?.get) return;

            try {
                const saved = await this.api.storage.get('playCounts');
                if (saved) {
                    this.playCounts = JSON.parse(saved);
                    console.log('[PlayCounter] Loaded counts:', Object.keys(this.playCounts).length);
                }
            } catch (err) {
                console.error('[PlayCounter] Failed to load counts:', err);
            }
        },

        async saveCounts() {
            if (!this.api?.storage?.set) return;

            try {
                await this.api.storage.set('playCounts', JSON.stringify(this.playCounts));
            } catch (err) {
                console.error('[PlayCounter] Failed to save counts:', err);
            }
        },

        async checkTrack() {
            if (!this.api?.player?.getCurrentTrack) return;

            try {
                const track = this.api.player.getCurrentTrack();
                const isPlaying = this.api.player.isPlaying?.();

                if (!track) return;

                // New track started
                if (track.id !== this.lastTrackId) {
                    // Count previous track if played long enough
                    if (this.lastTrackId && this.playStartTime) {
                        const playDuration = Date.now() - this.playStartTime;
                        if (playDuration >= this.MIN_PLAY_TIME) {
                            this.incrementCount(this.lastTrackId);
                        }
                    }

                    this.lastTrackId = track.id;
                    this.playStartTime = isPlaying ? Date.now() : null;
                } else if (isPlaying && !this.playStartTime) {
                    // Track resumed
                    this.playStartTime = Date.now();
                } else if (!isPlaying && this.playStartTime) {
                    // Track paused
                    this.playStartTime = null;
                }
            } catch (err) {
                console.error('[PlayCounter] Error:', err);
            }
        },

        incrementCount(trackId) {
            this.playCounts[trackId] = (this.playCounts[trackId] || 0) + 1;
            console.log(`[PlayCounter] Track ${trackId} played ${this.playCounts[trackId]} times`);
            this.saveCounts();
            this.updateUI(); // Update UI immediately when count changes
        },

        getCount(trackId) {
            return this.playCounts[trackId] || 0;
        },

        getTopTracks(limit = 10) {
            return Object.entries(this.playCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit);
        },

        start() {
            console.log('[PlayCounter] Plugin started');
            if (this.uiElement) {
                this.uiElement.style.display = 'block';
            }
        },

        stop() {
            console.log('[PlayCounter] Plugin stopped');
            if (this.uiElement) {
                this.uiElement.style.display = 'none';
            }
        },

        destroy() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
            if (this.uiInterval) {
                clearInterval(this.uiInterval);
            }
            if (this.uiElement) {
                this.uiElement.remove();
            }
            const styleEl = document.getElementById('play-counter-styles');
            if (styleEl) {
                styleEl.remove();
            }
            this.saveCounts();
            console.log('[PlayCounter] Plugin destroyed');
        }
    };

    // Register plugin globally
    window.PlayCounter = PlayCounter;
    window.AudionPlugin = PlayCounter;
})();
