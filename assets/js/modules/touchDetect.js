/**
 * Touch Detection Utility
 * Detects touch capabilities and manages body classes for optimization
 */

export class TouchDetect {
    constructor() {
        this.init();
    }

    init() {
        // Initial detection
        this.detect();

        // Listen for touch events to confirm touch usage (hybrid devices)
        window.addEventListener('touchstart', () => {
            if (!document.body.classList.contains('touch-device')) {
                this.setTouchMode(true);
            }
        }, { once: true, passive: true });
    }

    detect() {
        // Check for primary pointer type
        const isTouch = (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));

        this.setTouchMode(isTouch);
    }

    setTouchMode(isTouch) {
        if (isTouch) {
            document.body.classList.add('touch-device');
            document.body.classList.remove('no-touch');
            console.log('Touch device detected - Optimizing for touch interactions');
        } else {
            document.body.classList.add('no-touch');
            document.body.classList.remove('touch-device');
        }
    }
}
