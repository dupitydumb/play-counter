// Play Counter Plugin
// Tracks play counts for each song

(function () {
    'use strict';

    const PlayCounter = {
        name: 'Play Counter',
        playCounts: {},
        lastTrackId: null,
        playStartTime: null,
        MIN_PLAY_TIME: 30000, // 30 seconds minimum to count as a play

        init(api) {
            console.log('[PlayCounter] Plugin initialized');
            this.api = api;
            this.loadCounts();

            // Monitor track changes
            this.checkInterval = setInterval(() => this.checkTrack(), 1000);
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
                const track = await this.api.player.getCurrentTrack();
                const isPlaying = await this.api.player.isPlaying?.();

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
        },

        stop() {
            console.log('[PlayCounter] Plugin stopped');
        },

        destroy() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
            this.saveCounts();
            console.log('[PlayCounter] Plugin destroyed');
        }
    };

    // Register plugin globally
    window.PlayCounter = PlayCounter;
    window.AudionPlugin = PlayCounter;
})();
