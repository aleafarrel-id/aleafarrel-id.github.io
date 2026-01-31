/**
 * Navigation Module
 * Handles navigation functionality
 */

export class Navigation {
    constructor() {
        this.nav = document.querySelector('.nav');
        this.toggle = document.querySelector('.nav-toggle');
        this.links = document.querySelector('.nav-links');
        this.init();
    }

    /**
     * Initialize navigation
     */
    init() {
        if (!this.nav) return;

        // Scroll detection for nav background
        this.handleScroll();
        window.addEventListener('scroll', () => this.handleScroll());

        // Mobile menu toggle
        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.toggleMenu());
        }

        // Close mobile menu when clicking a link
        if (this.links) {
            this.links.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    this.closeMenu();
                }
            });
        }

        // Active link highlighting
        this.updateActiveLink();
        window.addEventListener('scroll', () => this.updateActiveLink());
    }

    /**
     * Handle scroll for nav background
     */
    handleScroll() {
        if (window.scrollY > 50) {
            this.nav.classList.add('scrolled');
        } else {
            this.nav.classList.remove('scrolled');
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMenu() {
        this.toggle.classList.toggle('active');
        this.links.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    }

    /**
     * Close mobile menu
     */
    closeMenu() {
        this.toggle?.classList.remove('active');
        this.links?.classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    /**
     * Update active navigation link based on scroll position
     */
    updateActiveLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120; // Increased offset for better active state detection
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
}
