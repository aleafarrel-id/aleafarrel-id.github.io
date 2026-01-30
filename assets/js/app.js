/**
 * Alea Farrel Portfolio - Main Application
 * Entry point that initializes all modules
 */

import { Button } from "./modules/button.js";
import { Modal } from "./modules/modal.js";
import { Navigation } from "./modules/nav.js";
import { Timeline } from "./modules/timeline.js";
import { Gallery } from "./modules/gallery.js";
import { Awards } from "./modules/awards.js";
import { dataLoader } from "./modules/dataLoader.js";
import { ScrollReveal } from "./modules/scrollReveal.js";
import { SplashScreen } from "./modules/splash.js";
import { TouchDetect } from "./modules/touchDetect.js";

class App {
    constructor() {
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup all components
     */
    async setup() {
        // Initialize splash screen first
        this.splashScreen = new SplashScreen();
        this.touchDetect = new TouchDetect();

        // Initialize UI components
        this.button = new Button();
        this.modal = new Modal();
        this.navigation = new Navigation();

        // Load data and render dynamic content
        await this.loadContent();

        // Add reveal classes to elements
        this.addRevealClasses();

        // Initialize scroll reveal animations
        this.scrollReveal = new ScrollReveal();

        // Preload images for smooth scrolling
        this.preloadImages();

        // Initialize scroll indicator
        this.initScrollIndicator();

        // Initialize smooth scroll for anchor links
        this.initSmoothScroll();

        // Initialize image lightbox
        this.initLightbox();

        // Set dynamic copyright year
        this.setFooterYear();

        // Initialize splash screen (will preload and hide when ready)
        await this.splashScreen.init();

        console.log('Portfolio initialized successfully!');
    }

    /**
     * Load content from database and render
     */
    async loadContent() {
        const data = await dataLoader.load();
        if (!data) {
            console.error('Failed to load data');
            return;
        }

        // Render hero section
        this.renderHero(dataLoader.getProfile(), dataLoader.getSocials());

        // Render about section
        this.renderAbout(dataLoader.getAbout());

        // Render technologies
        this.renderTechnologies(dataLoader.getTechnologies());

        // Render timeline if container exists
        const timelineContainer = document.getElementById('timeline');
        if (timelineContainer) {
            const timeline = new Timeline('timeline');
            timeline.render(dataLoader.getProjects());
        }

        // Render gallery
        const galleryContainer = document.getElementById('gallery-container');
        if (galleryContainer) {
            this.gallery = new Gallery('gallery-container');
            this.gallery.init(dataLoader.getGallery());
        }

        // Render awards
        const awardsContainer = document.getElementById('awards-container');
        if (awardsContainer) {
            this.awards = new Awards('awards-container');
            this.awards.init(dataLoader.getAwards());
        }

        // Render contact section socials
        this.renderContactSocials(dataLoader.getSocials());

        // Render footer
        this.renderFooter(
            dataLoader.getProfile(),
            dataLoader.getSocials(),
            dataLoader.getNavigation(),
            dataLoader.getFooter()
        );
    }

    /**
     * Render hero section from database
     * @param {Object} profile - Profile data
     * @param {Object} socials - Socials data
     */
    renderHero(profile, socials) {
        if (!profile) return;

        // Update hero text
        const greetingEl = document.getElementById('hero-greeting');
        const firstNameEl = document.getElementById('hero-firstname');
        const lastNameEl = document.getElementById('hero-lastname');
        const titleEl = document.getElementById('hero-title');
        const bioEl = document.getElementById('hero-bio');
        const imageEl = document.getElementById('hero-image');

        if (greetingEl) greetingEl.textContent = profile.greeting || 'Hello';
        if (firstNameEl) firstNameEl.textContent = profile.firstName || 'Alea';
        if (lastNameEl) lastNameEl.textContent = profile.lastName || 'Farrel';
        if (titleEl) titleEl.textContent = profile.title || 'Developer';
        if (bioEl) bioEl.textContent = profile.bio || '';
        if (imageEl) {
            imageEl.src = profile.image;
            imageEl.alt = `${profile.name} - ${profile.title}`;
        }

        // Update hero social links
        if (socials) {
            this.updateSocialLinks('hero-socials-links', socials, 'hero-social-link');
            this.updateSocialLinks('hero-buttons-container', socials, 'btn', true);
        }
    }

    /**
     * Update social link elements
     * @param {string} containerId - Container element ID
     * @param {Object} socials - Socials data
     * @param {string} linkClass - CSS class for links
     * @param {boolean} isButton - If true, update button links
     */
    updateSocialLinks(containerId, socials, linkClass, isButton = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (isButton) {
            // Update button links
            const instagramBtn = container.querySelector('.btn-primary');
            if (instagramBtn && socials.instagram) {
                instagramBtn.href = socials.instagram.url;
            }
        } else {
            // Update icon links
            const instagramLink = container.querySelector('.instagram');
            const githubLink = container.querySelector('.github');
            const emailLink = container.querySelector('.email');

            if (instagramLink && socials.instagram) instagramLink.href = socials.instagram.url;
            if (githubLink && socials.github) githubLink.href = socials.github.url;
            if (emailLink && socials.email) emailLink.href = socials.email.url;
        }
    }

    /**
     * Render about section from database
     * @param {Object} about - About section data
     */
    renderAbout(about) {
        if (!about) return;

        // Update tagline
        const taglineEl = document.getElementById('about-tagline');
        if (taglineEl) taglineEl.textContent = about.tagline || '';

        // Render about cards
        const cardsContainer = document.getElementById('about-cards');
        if (cardsContainer && about.cards) {
            cardsContainer.innerHTML = about.cards.map(card => `
                <div class="about-card">
                    <div class="about-card-icon">
                        <i class="bx ${card.icon}"></i>
                    </div>
                    <h3 class="about-card-title">${card.title}</h3>
                    <p class="about-card-description">${card.description}</p>
                </div>
            `).join('');
        }
    }

    /**
     * Render technologies from database
     * @param {Array} technologies - Array of technology objects
     */
    renderTechnologies(technologies) {
        const container = document.getElementById('technologies-grid');
        if (!container || !technologies.length) return;

        container.innerHTML = technologies.map(tech => `
            <span class="skill-tag">
                <i class="bx ${tech.icon}"></i> ${tech.name}
            </span>
        `).join('');
    }

    /**
     * Render contact section socials
     * @param {Object} socials - Socials data
     */
    renderContactSocials(socials) {
        if (!socials) return;

        const container = document.getElementById('contact-icons');
        if (!container) return;

        container.innerHTML = `
            <a href="${socials.instagram.url}" class="contact-icon-link instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i class="bx bxl-instagram"></i>
            </a>
            <a href="${socials.github.url}" class="contact-icon-link github" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <i class="bx bxl-github"></i>
            </a>
            <a href="${socials.email.url}" class="contact-icon-link email" aria-label="Email">
                <i class="bx bxl-gmail"></i>
            </a>
        `;
    }

    /**
     * Render footer from database
     * @param {Object} profile - Profile data
     * @param {Object} socials - Socials data
     * @param {Array} navigation - Navigation links
     * @param {Object} footer - Footer data
     */
    renderFooter(profile, socials, navigation, footer) {
        // Update description
        const descEl = document.getElementById('footer-description');
        if (descEl && footer) descEl.textContent = footer.description || '';

        // Render footer navigation
        const navContainer = document.getElementById('footer-nav');
        if (navContainer && navigation.length) {
            navContainer.innerHTML = navigation.map(nav => `
                <a href="${nav.href}" class="footer-nav-link">
                    ${nav.label}
                </a>
            `).join('');
        }

        // Render footer social links
        const socialsContainer = document.getElementById('footer-socials');
        if (socialsContainer && socials) {
            socialsContainer.innerHTML = `
                <a href="${socials.instagram.url}" class="footer-social-link" target="_blank" rel="noopener noreferrer">
                    <i class="bx bxl-instagram"></i> ${socials.instagram.label}
                </a>
                <a href="${socials.github.url}" class="footer-social-link" target="_blank" rel="noopener noreferrer">
                    <i class="bx bxl-github"></i> ${socials.github.label}
                </a>
                <a href="${socials.email.url}" class="footer-social-link">
                    <i class="bx bxl-gmail"></i> ${socials.email.label}
                </a>
            `;
        }

        // Update name link
        const nameLink = document.getElementById('footer-name-link');
        if (nameLink && profile && socials) {
            nameLink.textContent = profile.name;
            nameLink.href = socials.github.url;
        }
    }

    /**
     * Initialize scroll indicator click
     */
    initScrollIndicator() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                const nextSection = document.getElementById('about');
                if (nextSection) {
                    nextSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    }

    /**
     * Initialize smooth scroll for anchor links
     */
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    // Use 'start' block to show title at top
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Initialize image lightbox for certificate images
     */
    initLightbox() {
        document.addEventListener('click', (e) => {
            const img = e.target.closest('[data-lightbox]');
            if (img) {
                this.modal.openLightbox(img.src, img.alt);
            }
        });
    }

    /**
     * Set dynamic copyright year in footer
     */
    setFooterYear() {
        const yearElement = document.getElementById('footer-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    /**
     * Preload images for smoother scrolling experience
     */
    preloadImages() {
        // Collect all image sources to preload
        const imagesToPreload = [];

        // Gallery images
        document.querySelectorAll('.gallery-card img').forEach(img => {
            if (img.src) imagesToPreload.push(img.src);
        });

        // Awards images
        document.querySelectorAll('.awards-card img').forEach(img => {
            if (img.src) imagesToPreload.push(img.src);
        });

        // Timeline/Project images
        document.querySelectorAll('.timeline-card img, .project-image').forEach(img => {
            if (img.src) imagesToPreload.push(img.src);
        });

        // Preload using Image constructor (non-blocking)
        imagesToPreload.forEach(src => {
            const img = new Image();
            img.loading = 'eager';
            img.src = src;
        });

        console.log(`Preloading ${imagesToPreload.length} images...`);
    }

    /**
     * Add reveal classes to elements for scroll animations
     */
    addRevealClasses() {
        // Section titles - fade up
        document.querySelectorAll('.section-title').forEach((el, i) => {
            el.classList.add('reveal');
        });

        // Section subtitles - fade up with delay
        document.querySelectorAll('.section-subtitle').forEach(el => {
            el.classList.add('reveal', 'reveal-delay-1');
        });

        // About cards - staggered reveal
        document.querySelectorAll('.about-card').forEach((el, i) => {
            el.classList.add('reveal');
            el.classList.add(`reveal-delay-${Math.min(i + 1, 4)}`);
        });

        // Timeline cards - alternate left/right
        document.querySelectorAll('.timeline-card').forEach((el, i) => {
            el.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
        });

        // Gallery section
        const gallerySection = document.querySelector('.gallery-container');
        if (gallerySection) {
            gallerySection.classList.add('reveal-fade');
        }

        // Awards section
        const awardsSection = document.querySelector('.awards-container');
        if (awardsSection) {
            awardsSection.classList.add('reveal-fade');
        }

        // Certification cards - scale reveal
        document.querySelectorAll('.cert-card').forEach((el, i) => {
            el.classList.add('reveal-scale');
            el.classList.add(`reveal-delay-${Math.min(i + 1, 4)}`);
        });

        // Tech items - staggered
        document.querySelectorAll('.tech-item').forEach((el, i) => {
            el.classList.add('reveal');
            el.classList.add(`reveal-delay-${(i % 4) + 1}`);
        });

        // Footer - fade up
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.classList.add('reveal');
        }
    }
}

// Initialize app
new App();