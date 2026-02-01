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

        // Deteksi Mobile
        const isMobile = window.innerWidth < 768;

        // Mobile: 800ms, Desktop: 1500ms
        if (isMobile) {
            this.minDisplayTime = 800;
        }

        try {
            await this.preloadAssets();
        } catch (error) {
            console.warn('Some assets failed to preload:', error);
        }

        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.minDisplayTime - elapsed);

        await this.delay(remaining);
        this.hide();

        // Panggil lazy load setelah splash hilang
        this.lazyLoadRemainingImages();
    }

    async preloadAssets() {
        // HANYA preload aset vital (Hero & Logo)
        const criticalAssets = [
            'assets/images/img/profile.webp',
            'assets/favicon/favicon.webp'
        ];

        let loaded = 0;
        const total = criticalAssets.length;
        this.updateStatus(this.statusMessages[0]);

        const loadPromises = criticalAssets.map(src => {
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
                    resolve();
                };
                img.src = src;
            });
        });

        await Promise.all(loadPromises);
    }

    lazyLoadRemainingImages() {
        // Load sisa gambar di background agar masuk cache browser
        const otherImages = Array.from(document.querySelectorAll('img[src]'))
            .filter(img => !img.src.includes('profile.webp') && !img.src.includes('favicon'));

        otherImages.forEach(img => {
            const i = new Image();
            i.src = img.src;
        });
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
            document.body.classList.remove('no-scroll');

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
