/**
 * Scroll Reveal Module
 * Reveals elements as they enter the viewport using IntersectionObserver
 * Performance optimized - no continuous scroll listeners
 */

export class ScrollReveal {
    constructor(options = {}) {
        this.options = {
            threshold: 0.15,       // Trigger when 15% visible
            rootMargin: '0px 0px -50px 0px', // Trigger slightly before fully in view
            ...options
        };

        this.observer = null;
        this.init();
    }

    /**
     * Initialize the IntersectionObserver
     */
    init() {
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Show all elements immediately
            this.revealAll();
            return;
        }

        // Create observer
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Optionally unobserve after revealing for performance
                    this.observer.unobserve(entry.target);
                }
            });
        }, this.options);

        // Observe all reveal elements
        this.observeElements();
    }

    /**
     * Find and observe all elements with reveal classes
     */
    observeElements() {
        const selectors = [
            '.reveal',
            '.reveal-fade',
            '.reveal-left',
            '.reveal-right',
            '.reveal-scale'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Don't observe elements that are already revealed
                if (!el.classList.contains('revealed')) {
                    this.observer.observe(el);
                }
            });
        });
    }

    /**
     * Reveal all elements immediately (for reduced motion)
     */
    revealAll() {
        const selectors = [
            '.reveal',
            '.reveal-fade',
            '.reveal-left',
            '.reveal-right',
            '.reveal-scale'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('revealed');
            });
        });
    }

    /**
     * Manually add reveal class to element
     */
    addReveal(element, variant = 'reveal') {
        element.classList.add(variant);
        if (this.observer) {
            this.observer.observe(element);
        }
    }

    /**
     * Disconnect observer (cleanup)
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Create singleton instance
export const scrollReveal = new ScrollReveal();
