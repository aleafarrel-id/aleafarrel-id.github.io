/**
 * Modal Module
 * Handles modal open/close functionality
 */

export class Modal {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    /**
     * Initialize modal event listeners
     */
    init() {
        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.close();
            }

            // Close button
            if (e.target.closest('.modal-close')) {
                this.close();
            }

            // Open modal triggers
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                const modalId = trigger.dataset.modal;
                this.open(modalId);
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });
    }

    /**
     * Open a modal by ID
     * @param {string} modalId - The modal element ID
     */
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.activeModal = modal;
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Focus trap - focus first focusable element
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            focusable.focus();
        }
    }

    /**
     * Close the active modal
     */
    close() {
        if (!this.activeModal) return;

        this.activeModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.activeModal = null;
    }

    /**
     * Open image lightbox
     * @param {string} imageSrc - Image source URL
     * @param {string} imageAlt - Image alt text
     */
    openLightbox(imageSrc, imageAlt = '') {
        // Create lightbox if it doesn't exist
        let lightbox = document.getElementById('lightbox-modal');

        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox-modal';
            lightbox.className = 'modal-overlay modal-lightbox';
            lightbox.innerHTML = `
                <div class="modal">
                    <button class="modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="modal-body">
                        <img class="modal-lightbox-image" src="" alt="">
                    </div>
                </div>
            `;
            document.body.appendChild(lightbox);
        }

        const img = lightbox.querySelector('.modal-lightbox-image');
        img.src = imageSrc;
        img.alt = imageAlt;

        this.activeModal = lightbox;
        lightbox.classList.add('active');
        document.body.classList.add('modal-open');
    }
}
