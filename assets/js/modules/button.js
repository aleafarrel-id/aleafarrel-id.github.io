/**
 * Button Module
 * Handles button interactions and ripple effects
 */

export class Button {
    constructor() {
        this.init();
    }

    /**
     * Initialize button interactions
     */
    init() {
        // Add ripple effect to all buttons with .btn-ripple class
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-ripple');
            if (button) {
                this.createRipple(e, button);
            }
        });
    }

    /**
     * Create ripple effect on button
     * @param {Event} e - Click event
     * @param {HTMLElement} button - Button element
     */
    createRipple(e, button) {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        ripple.classList.add('ripple');

        // Remove existing ripples
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 600);
    }
}

// Add ripple styles dynamically
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
