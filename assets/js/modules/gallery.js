/**
 * Gallery Card Stack Module
 * Smooth card stack gallery with 3D effects
 */

export class Gallery {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentIndex = 0;
        this.slides = [];
        this.autoSlideInterval = 5000;
        this.autoSlideTimer = null;
        this.isPaused = false;
        this.lightbox = null;
        this.isAnimating = false;
        this.isInView = false;
    }

    /**
     * Initialize gallery with data
     * @param {Object} galleryData - Gallery configuration from database
     */
    init(galleryData) {
        if (!this.container || !galleryData || !galleryData.images.length) return;

        this.slides = galleryData.images;
        this.autoSlideInterval = galleryData.autoSlideInterval || 5000;

        this.render();
        this.createLightbox();
        this.bindEvents();
        this.updateCardPositions();
        this.startAutoSlide();
    }

    /**
     * Render gallery HTML
     */
    render() {
        this.container.innerHTML = `
            <div class="gallery-stack" id="gallery-stack">
                ${this.slides.map((slide, index) => `
                    <div class="gallery-card position-hidden" data-index="${index}">
                        <img src="${slide.src}" alt="${slide.title}" loading="lazy">
                        <div class="gallery-card-overlay">
                            <h4 class="gallery-card-title">${slide.title}</h4>
                            <p class="gallery-card-description">${slide.description}</p>
                        </div>
                    </div>
                `).join('')}
                
                <button class="gallery-nav gallery-nav-prev" aria-label="Previous slide">
                    <i class="bx bx-chevron-left"></i>
                </button>
                <button class="gallery-nav gallery-nav-next" aria-label="Next slide">
                    <i class="bx bx-chevron-right"></i>
                </button>
            </div>
            
            <div class="gallery-progress">
                <div class="gallery-progress-bar" id="gallery-progress-bar"></div>
            </div>
            
            <div class="gallery-thumbnails" id="gallery-thumbnails">
                ${this.slides.map((slide, index) => `
                    <button class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
                            data-index="${index}" 
                            aria-label="Go to slide ${index + 1}">
                        <img src="${slide.src}" alt="${slide.title}" loading="lazy">
                    </button>
                `).join('')}
            </div>
            
            <div class="gallery-hint">
                <i class="bx bx-chevron-left"></i>
                <span>Scroll left or right to see more</span>
                <i class="bx bx-chevron-right"></i>
            </div>
        `;

        this.stack = this.container.querySelector('#gallery-stack');
        this.cards = this.container.querySelectorAll('.gallery-card');
        this.progressBar = this.container.querySelector('#gallery-progress-bar');
        this.thumbnailsContainer = this.container.querySelector('#gallery-thumbnails');
    }

    /**
     * Update card positions based on current index
     */
    updateCardPositions() {
        const total = this.slides.length;

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
            let relativePos = index - this.currentIndex;

            // Handle wrapping for infinite loop feel
            if (relativePos > total / 2) relativePos -= total;
            if (relativePos < -total / 2) relativePos += total;

            // Assign position class
            switch (relativePos) {
                case -2:
                    card.classList.add('position-left-2');
                    break;
                case -1:
                    card.classList.add('position-left-1');
                    break;
                case 0:
                    card.classList.add('position-center');
                    break;
                case 1:
                    card.classList.add('position-right-1');
                    break;
                case 2:
                    card.classList.add('position-right-2');
                    break;
                default:
                    card.classList.add('position-hidden');
            }
        });

        this.updateThumbnails();
    }

    /**
     * Update thumbnail active states
     */
    updateThumbnails() {
        const thumbnails = this.thumbnailsContainer.querySelectorAll('.gallery-thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentIndex) {
                thumb.classList.add('active');

                // Calculate scroll position to center the active thumbnail
                const container = this.thumbnailsContainer;
                const thumbLeft = thumb.offsetLeft;
                const thumbWidth = thumb.offsetWidth;
                const containerWidth = container.offsetWidth;

                const scrollPos = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);

                container.scrollTo({
                    left: scrollPos,
                    behavior: 'smooth'
                });
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    /**
     * Create lightbox element
     */
    createLightbox() {
        if (document.getElementById('gallery-lightbox')) {
            this.lightbox = document.getElementById('gallery-lightbox');
            return;
        }

        this.lightbox = document.createElement('div');
        this.lightbox.className = 'gallery-lightbox';
        this.lightbox.id = 'gallery-lightbox';
        this.lightbox.innerHTML = `
            <div class="gallery-lightbox-content">
                <img class="gallery-lightbox-image" src="" alt="">
                <div class="gallery-lightbox-caption">
                    <h4 class="gallery-lightbox-title"></h4>
                    <p class="gallery-lightbox-description"></p>
                </div>
                <div class="gallery-lightbox-hint">
                    <i class="bx bx-x"></i>
                    <span>Click outside to close</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.lightbox);

        this.lightbox.addEventListener('click', (e) => {
            if (!e.target.closest('.gallery-lightbox-image') &&
                !e.target.closest('.gallery-lightbox-caption')) {
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
        const slide = this.slides[index];
        if (!slide || !this.lightbox) return;

        const img = this.lightbox.querySelector('.gallery-lightbox-image');
        const title = this.lightbox.querySelector('.gallery-lightbox-title');
        const description = this.lightbox.querySelector('.gallery-lightbox-description');

        img.src = slide.src;
        img.alt = slide.title;
        title.textContent = slide.title;
        description.textContent = slide.description;

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
        const prevBtn = this.container.querySelector('.gallery-nav-prev');
        const nextBtn = this.container.querySelector('.gallery-nav-next');

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prev();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.next();
        });

        // Thumbnails
        this.thumbnailsContainer.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.gallery-thumbnail');
            if (thumbnail) {
                const index = parseInt(thumbnail.dataset.index);
                this.goTo(index);
            }
        });

        // Card click - open lightbox for center card
        this.cards.forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('position-center')) {
                    this.openLightbox(this.currentIndex);
                } else {
                    // Navigate to clicked card
                    const index = parseInt(card.dataset.index);
                    this.goTo(index);
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

        this.stack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.stack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });

        // Setup Intersection Observer for specialized keyboard support
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isInView = entry.isIntersecting;
            });
        }, { threshold: 0.6 });

        observer.observe(this.container);

        // Document-level key listener that checks visibility
        document.addEventListener('keydown', (e) => {
            if (!this.isInView) return;

            // Only capture if no other element has focus (input, etc)
            if (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault(); // Prevent scroll
                this.prev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault(); // Prevent scroll
                this.next();
            }
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
     * Go to specific slide
     * @param {number} index - Slide index
     */
    goTo(index) {
        if (index < 0) {
            index = this.slides.length - 1;
        } else if (index >= this.slides.length) {
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
            if (!this.isPaused && !this.isAnimating) {
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
            this.progressBar.offsetHeight;
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
     * Destroy gallery
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
