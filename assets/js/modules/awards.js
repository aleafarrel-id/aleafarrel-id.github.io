/**
 * Awards Card Stack Module
 * 3D card stack certificate slider with smooth transitions
 */

export class Awards {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentIndex = 0;
        this.certificates = [];
        this.autoSlideInterval = 6000;
        this.autoSlideTimer = null;
        this.isPaused = false;
        this.lightbox = null;
        this.preloadedImages = [];
        this.progressBar = null;
    }

    /**
     * Initialize awards with data
     * @param {Object} awardsData - Awards configuration from database
     */
    init(awardsData) {
        if (!this.container || !awardsData || !awardsData.certificates.length) return;

        this.certificates = awardsData.certificates;
        this.autoSlideInterval = awardsData.autoSlideInterval || 6000;

        // Preload all images first
        this.preloadImages().then(() => {
            this.render();
            this.createLightbox();
            this.bindEvents();
            this.updateCardPositions();
            this.startAutoSlide();
        });
    }

    /**
     * Preload all certificate images
     * @returns {Promise}
     */
    preloadImages() {
        const promises = this.certificates.map((cert, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages[index] = img;
                    resolve();
                };
                img.onerror = resolve;
                img.src = cert.image;
            });
        });

        return Promise.all(promises);
    }

    /**
     * Render awards HTML - 3D Card Stack
     */
    render() {
        this.container.innerHTML = `
            <div class="awards-dots" id="awards-dots">
                ${this.certificates.map((_, index) => `
                    <button class="awards-dot ${index === 0 ? 'active' : ''}" 
                            data-index="${index}" 
                            aria-label="Go to certificate ${index + 1}">
                    </button>
                `).join('')}
            </div>
            
            <div class="awards-stack" id="awards-stack">
                ${this.certificates.map((cert, index) => `
                    <div class="awards-card position-hidden" data-index="${index}">
                        <div class="awards-image-container">
                            <div class="awards-image-wrapper" data-index="${index}">
                                <img class="awards-image" 
                                     src="${cert.image}" 
                                     alt="${cert.title}" 
                                     loading="eager">
                            </div>
                        </div>
                        <div class="awards-info">
                            <span class="awards-badge">
                                <i class="bx bx-award"></i>
                                ${cert.name}
                            </span>
                            <h3 class="awards-title">${cert.title}</h3>
                            <p class="awards-description">${cert.description}</p>
                        </div>
                    </div>
                `).join('')}
                
                <button class="awards-nav awards-nav-prev" aria-label="Previous certificate">
                    <i class="bx bx-chevron-left"></i>
                </button>
                <button class="awards-nav awards-nav-next" aria-label="Next certificate">
                    <i class="bx bx-chevron-right"></i>
                </button>
            </div>
            
            <div class="awards-progress">
                <div class="awards-progress-bar" id="awards-progress-bar"></div>
            </div>
            
            <div class="awards-hint">
                <i class="bx bx-chevron-left"></i>
                <span>Scroll left or right to see more</span>
                <i class="bx bx-chevron-right"></i>
            </div>
        `;

        this.stack = this.container.querySelector('#awards-stack');
        this.cards = this.container.querySelectorAll('.awards-card');
        this.dotsContainer = this.container.querySelector('#awards-dots');
        this.progressBar = this.container.querySelector('#awards-progress-bar');
        this.prevBtn = this.container.querySelector('.awards-nav-prev');
        this.nextBtn = this.container.querySelector('.awards-nav-next');
    }

    /**
     * Create lightbox element
     */
    createLightbox() {
        if (document.getElementById('awards-lightbox')) {
            this.lightbox = document.getElementById('awards-lightbox');
            return;
        }

        this.lightbox = document.createElement('div');
        this.lightbox.className = 'awards-lightbox';
        this.lightbox.id = 'awards-lightbox';
        this.lightbox.innerHTML = `
            <div class="awards-lightbox-content">
                <img class="awards-lightbox-image" src="" alt="">
                <div class="awards-lightbox-caption">
                    <h4 class="awards-lightbox-title"></h4>
                </div>
                <div class="awards-lightbox-hint">
                    <i class="bx bx-x"></i>
                    <span>Click outside to close</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.lightbox);

        this.lightbox.addEventListener('click', (e) => {
            if (!e.target.closest('.awards-lightbox-image') &&
                !e.target.closest('.awards-lightbox-caption')) {
                this.closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.lightbox.classList.contains('active')) {
                this.closeLightbox();
            }
        });
    }

    /**
     * Open lightbox with image
     */
    openLightbox(index) {
        const cert = this.certificates[index];
        if (!cert || !this.lightbox) return;

        const img = this.lightbox.querySelector('.awards-lightbox-image');
        const title = this.lightbox.querySelector('.awards-lightbox-title');

        img.src = cert.image;
        img.alt = cert.title;
        title.textContent = cert.title;

        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.pause();
    }

    /**
     * Close lightbox
     */
    closeLightbox() {
        if (!this.lightbox) return;

        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        this.resume();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Navigation arrows
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());

        // Dots
        this.dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.awards-dot');
            if (dot) {
                const index = parseInt(dot.dataset.index);
                this.goTo(index);
            }
        });

        // Image click - open lightbox (only center card)
        this.container.querySelectorAll('.awards-image-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                const card = wrapper.closest('.awards-card');
                if (card && card.classList.contains('position-center')) {
                    const index = parseInt(wrapper.dataset.index);
                    this.openLightbox(index);
                }
            });
        });

        // Click on side cards to navigate
        this.cards.forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                if (card.classList.contains('position-left-1') || card.classList.contains('position-left-2')) {
                    this.prev();
                } else if (card.classList.contains('position-right-1') || card.classList.contains('position-right-2')) {
                    this.next();
                }
            });
        });

        // Pause on hover (only for non-touch devices)
        this.container.addEventListener('mouseenter', () => {
            if (!document.body.classList.contains('touch-device')) {
                this.pause();
            }
        });

        this.container.addEventListener('mouseleave', () => {
            if (!document.body.classList.contains('touch-device')) {
                this.resume();
            }
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
    }

    /**
     * Handle swipe gesture
     */
    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.next();
            } else {
                this.prev();
            }
        }
    }

    /**
     * Update card positions - 3D stack effect
     */
    updateCardPositions() {
        const total = this.certificates.length;

        this.cards.forEach((card, index) => {
            // Remove all position classes
            card.classList.remove(
                'position-left-2',
                'position-left-1',
                'position-center',
                'position-right-1',
                'position-right-2',
                'position-hidden'
            );

            // Calculate relative position
            let diff = index - this.currentIndex;

            // Handle wrapping for circular navigation
            if (diff > total / 2) {
                diff -= total;
            } else if (diff < -total / 2) {
                diff += total;
            }

            // Assign position class based on difference
            if (diff === 0) {
                card.classList.add('position-center');
            } else if (diff === -1) {
                card.classList.add('position-left-1');
            } else if (diff === -2) {
                card.classList.add('position-left-2');
            } else if (diff === 1) {
                card.classList.add('position-right-1');
            } else if (diff === 2) {
                card.classList.add('position-right-2');
            } else {
                card.classList.add('position-hidden');
            }
        });

        this.updateDots();
    }

    /**
     * Update dots indicator
     */
    updateDots() {
        const dots = this.dotsContainer.querySelectorAll('.awards-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });
    }

    /**
     * Go to specific slide
     * @param {number} index - Slide index
     */
    goTo(index) {
        if (index < 0) {
            index = this.certificates.length - 1;
        } else if (index >= this.certificates.length) {
            index = 0;
        }

        if (index === this.currentIndex) return;

        this.currentIndex = index;
        this.updateCardPositions();
        this.resetProgress();
    }

    /**
     * Go to next slide
     */
    next() {
        this.goTo(this.currentIndex + 1);
    }

    /**
     * Go to previous slide
     */
    prev() {
        this.goTo(this.currentIndex - 1);
    }

    /**
     * Start auto-slide
     */
    startAutoSlide() {
        // Disable autoscroll on mobile
        if (window.innerWidth <= 768) return;

        this.resetProgress();
        this.autoSlideTimer = setInterval(() => {
            if (!this.isPaused) {
                this.next();
            }
        }, this.autoSlideInterval);
    }

    /**
     * Reset progress bar animation
     */
    resetProgress() {
        if (this.progressBar) {
            this.progressBar.style.animation = 'none';
            this.progressBar.offsetHeight; // Force reflow
            this.progressBar.style.animation = null;
            this.progressBar.style.animationDuration = `${this.autoSlideInterval}ms`;
            this.progressBar.classList.add('animating');
        }
    }

    /**
     * Pause auto-slide
     */
    pause() {
        this.isPaused = true;
        if (this.progressBar) {
            this.progressBar.style.animationPlayState = 'paused';
        }
    }

    /**
     * Resume auto-slide
     */
    resume() {
        this.isPaused = false;
        if (this.progressBar) {
            this.progressBar.style.animationPlayState = 'running';
        }
    }

    /**
     * Destroy awards slider
     */
    destroy() {
        if (this.autoSlideTimer) {
            clearInterval(this.autoSlideTimer);
        }
        if (this.lightbox) {
            this.lightbox.remove();
        }
    }
}
