/**
 * Splash Screen Module
 * Handles loading screen with preloading and progress tracking
 */

export class SplashScreen {
    constructor() {
        this.splash = document.getElementById('splash-screen');
        this.progressBar = document.getElementById('splash-progress-bar');
        this.statusText = document.getElementById('splash-status');
        this.progress = 0;
        this.minDisplayTime = 1500; // Minimum display time in ms
        this.startTime = Date.now();

        this.statusMessages = [
            'Initializing...',
            'Loading assets...',
            'Preparing content...',
            'Almost ready...'
        ];
    }

    /**
     * Initialize and start the splash screen
     */
    async init() {
        if (!this.splash) return;

        // Prevent scrolling while splash is visible
        document.body.style.overflow = 'hidden';

        try {
            await this.preloadAssets();
        } catch (error) {
            console.warn('Some assets failed to preload:', error);
        }

        // Ensure minimum display time
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.minDisplayTime - elapsed);

        await this.delay(remaining);
        this.hide();
    }

    /**
     * Preload all images and critical assets
     */
    async preloadAssets() {
        // Get all images from the page
        const images = Array.from(document.querySelectorAll('img[src]'));
        const backgroundImages = this.getBackgroundImages();

        const allAssets = [
            ...images.map(img => img.src),
            ...backgroundImages
        ].filter(src => src && !src.startsWith('data:'));

        if (allAssets.length === 0) {
            this.updateProgress(100);
            return;
        }

        let loaded = 0;
        const total = allAssets.length;

        this.updateStatus(this.statusMessages[0]);

        const loadPromises = allAssets.map(src => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    loaded++;
                    this.updateProgress((loaded / total) * 100);
                    this.updateStatusByProgress(loaded / total);
                    resolve();
                };
                img.onerror = () => {
                    loaded++;
                    this.updateProgress((loaded / total) * 100);
                    resolve(); // Don't fail on error, just continue
                };
                img.src = src;
            });
        });

        await Promise.all(loadPromises);
    }

    /**
     * Get background images from stylesheets
     */
    getBackgroundImages() {
        const images = [];
        // Check for common image elements that might have background images
        const elements = document.querySelectorAll('[style*="background"]');
        elements.forEach(el => {
            const style = el.style.backgroundImage;
            const match = style.match(/url\(['"]?(.+?)['"]?\)/);
            if (match) {
                images.push(match[1]);
            }
        });
        return images;
    }

    /**
     * Update progress bar
     */
    updateProgress(percent) {
        this.progress = Math.min(100, percent);
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
    }

    /**
     * Update status text based on progress
     */
    updateStatusByProgress(ratio) {
        let messageIndex = 0;
        if (ratio > 0.75) {
            messageIndex = 3;
        } else if (ratio > 0.5) {
            messageIndex = 2;
        } else if (ratio > 0.25) {
            messageIndex = 1;
        }
        this.updateStatus(this.statusMessages[messageIndex]);
    }

    /**
     * Update status text
     */
    updateStatus(text) {
        if (this.statusText && this.statusText.textContent !== text) {
            this.statusText.style.opacity = '0';
            setTimeout(() => {
                this.statusText.textContent = text;
                this.statusText.style.opacity = '1';
            }, 150);
        }
    }

    /**
     * Hide the splash screen
     */
    hide() {
        if (!this.splash) return;

        this.updateProgress(100);
        this.updateStatus('Welcome!');

        setTimeout(() => {
            this.splash.classList.add('hidden');
            document.body.style.overflow = '';

            // Remove splash from DOM after animation
            setTimeout(() => {
                this.splash.remove();
            }, 600);
        }, 300);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
