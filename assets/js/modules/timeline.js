/**
 * Timeline Module
 * Renders timeline items from data with compact card design
 * Includes Projects Overlay with search & category filter
 */

export class Timeline {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.lightbox = null;
        this.overlay = null;
        this.currentIndex = 0;
        this.navUp = null;
        this.navDown = null;
        this.projects = [];
        this.activeCategory = 'All';
        this.searchQuery = '';
        this.debounceTimer = null;
    }

    /**
     * Render timeline with projects
     * @param {Array} projects - Array of project objects
     */
    render(projects) {
        if (!this.container || !projects.length) return;

        this.projects = projects;

        this.container.innerHTML = `
            <div class="timeline-list">
                ${projects.map((project, index) => `
                <div class="timeline-item" data-index="${index}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-card">
                        <div class="timeline-card-image" data-index="${index}">
                            <img 
                                src="${project.image}" 
                                alt="${project.name}" 
                                loading="lazy"
                            >
                            <div class="timeline-card-overlay">
                                <span class="timeline-card-number">${String(index + 1).padStart(2, '0')}</span>
                                <h3 class="timeline-card-title">${project.name}</h3>
                            </div>
                        </div>
                        <div class="timeline-card-details">
                            <p class="timeline-card-description">${project.description}</p>
                            <div class="timeline-card-tags">
                                ${project.tags.map(tag => `<span class="timeline-card-tag">${tag}</span>`).join('')}
                            </div>
                            <a href="${project.link}" class="timeline-card-link" target="_blank" rel="noopener noreferrer">
                                View Project <i class="bx bx-right-arrow-alt"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `).join('')}
            </div>
        `;

        this.createNavigationButtons();
        this.createLightbox();
        this.createOverlay();
        this.bindEvents();
        this.updateNavButtons();
    }

    /**
     * Create navigation buttons (up, down, expand)
     */
    createNavigationButtons() {
        const timelineWrapper = this.container.closest('.timeline-container');
        if (!timelineWrapper) return;

        const nav = document.createElement('div');
        nav.className = 'timeline-nav';
        nav.innerHTML = `
            <button class="timeline-nav-btn" id="timeline-nav-expand" aria-label="Expand all projects">
                <i class="bx bx-expand-alt"></i>
            </button>
            <button class="timeline-nav-btn" id="timeline-nav-up" aria-label="Scroll up">
                <i class="bx bx-chevron-up"></i>
            </button>
            <button class="timeline-nav-btn" id="timeline-nav-down" aria-label="Scroll down">
                <i class="bx bx-chevron-down"></i>
            </button>
        `;
        timelineWrapper.appendChild(nav);

        this.navUp = nav.querySelector('#timeline-nav-up');
        this.navDown = nav.querySelector('#timeline-nav-down');
        this.navExpand = nav.querySelector('#timeline-nav-expand');
    }

    /**
     * Scroll content by amount
     * @param {number} amount - Pixels to scroll
     */
    scrollContent(amount) {
        if (!this.container) return;

        this.container.scrollBy({
            top: amount,
            behavior: 'smooth'
        });
    }

    /**
     * Update navigation button states based on scroll position
     */
    updateNavButtons() {
        if (!this.container) return;

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const isAtTop = scrollTop <= 5;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 5;

        if (this.navUp) {
            if (isAtTop) {
                this.navUp.classList.add('disabled');
            } else {
                this.navUp.classList.remove('disabled');
            }
        }

        if (this.navDown) {
            if (isAtBottom) {
                this.navDown.classList.add('disabled');
            } else {
                this.navDown.classList.remove('disabled');
            }
        }
    }

    /**
     * Create lightbox element
     */
    createLightbox() {
        if (document.getElementById('project-lightbox')) {
            this.lightbox = document.getElementById('project-lightbox');
            return;
        }

        this.lightbox = document.createElement('div');
        this.lightbox.className = 'project-lightbox';
        this.lightbox.id = 'project-lightbox';
        this.lightbox.innerHTML = `
            <div class="project-lightbox-content">
                <img class="project-lightbox-image" src="" alt="">
                <div class="project-lightbox-caption">
                    <h4 class="project-lightbox-title"></h4>
                    <p class="project-lightbox-description"></p>
                </div>
            </div>
        `;
        document.body.appendChild(this.lightbox);

        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
    }

    /**
     * Create projects overlay element
     */
    createOverlay() {
        if (document.getElementById('projects-overlay')) {
            this.overlay = document.getElementById('projects-overlay');
            return;
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'projects-overlay';
        this.overlay.id = 'projects-overlay';
        this.overlay.innerHTML = `
            <div class="projects-overlay-container">
                <div class="projects-overlay-header">
                    <div class="projects-overlay-title-row">
                        <h3 class="projects-overlay-title">
                            <i class="bx bx-folder-open"></i> All Projects
                        </h3>
                        <button class="projects-overlay-close" aria-label="Close overlay">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                    <div class="projects-overlay-controls">
                        <div class="projects-overlay-search">
                            <i class="bx bx-search"></i>
                            <input 
                                type="text" 
                                class="projects-overlay-search-input" 
                                placeholder="Quick search projects..."
                                autocomplete="off"
                            >
                        </div>
                        <div class="projects-overlay-filters">
                            <button class="projects-overlay-filter active" data-category="All">All</button>
                            <button class="projects-overlay-filter" data-category="Desktop">
                                <i class="bx bx-desktop"></i> Desktop
                            </button>
                            <button class="projects-overlay-filter" data-category="Web">
                                <i class="bx bx-globe"></i> Web
                            </button>
                            <button class="projects-overlay-filter" data-category="CLI">
                                <i class="bx bx-terminal"></i> CLI
                            </button>
                        </div>
                    </div>
                </div>
                <div class="projects-overlay-body">
                    <div class="projects-overlay-grid" id="projects-overlay-grid">
                        <!-- Cards rendered dynamically -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Bind overlay-specific events
        this.bindOverlayEvents();
    }

    /**
     * Bind overlay events (separated for clarity)
     */
    bindOverlayEvents() {
        if (!this.overlay) return;

        // Close button
        this.overlay.querySelector('.projects-overlay-close').addEventListener('click', () => {
            this.closeOverlay();
        });

        // Background click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeOverlay();
            }
        });

        // Search input with debounce - triggers after 2+ chars
        const searchInput = this.overlay.querySelector('.projects-overlay-search-input');
        searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                // Only search if 2+ chars or empty (reset)
                if (query.length >= 2 || query.length === 0) {
                    this.searchQuery = query;
                    this.renderOverlayGrid();
                }
            }, 150);
        });

        // Filter buttons
        this.overlay.querySelectorAll('.projects-overlay-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                this.overlay.querySelectorAll('.projects-overlay-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeCategory = btn.dataset.category;
                this.renderOverlayGrid();
            });
        });
    }

    /**
     * Open the projects overlay
     */
    openOverlay() {
        if (!this.overlay) return;

        // Reset state
        this.searchQuery = '';
        this.activeCategory = 'All';

        // Reset UI
        const searchInput = this.overlay.querySelector('.projects-overlay-search-input');
        if (searchInput) searchInput.value = '';

        this.overlay.querySelectorAll('.projects-overlay-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'All');
        });

        // Render grid
        this.renderOverlayGrid();

        // Show overlay
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus search input after animation
        setTimeout(() => {
            if (searchInput) searchInput.focus();
        }, 400);
    }

    /**
     * Close the projects overlay
     */
    closeOverlay() {
        if (!this.overlay) return;

        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Render the overlay grid based on current search/filter state
     */
    renderOverlayGrid() {
        const grid = this.overlay.querySelector('#projects-overlay-grid');
        if (!grid) return;

        // Filter projects
        let filtered = this.projects.filter(project => {
            // Category filter
            if (this.activeCategory !== 'All' && project.category !== this.activeCategory) {
                return false;
            }

            // Search filter (case-insensitive)
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const matchName = project.name.toLowerCase().includes(query);
                const matchDesc = project.description.toLowerCase().includes(query);
                const matchTags = project.tags.some(tag => tag.toLowerCase().includes(query));
                return matchName || matchDesc || matchTags;
            }

            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="projects-overlay-empty">
                    <i class="bx bx-search-alt"></i>
                    <p>No projects found</p>
                    <span>Try adjusting your search or filter</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(project => `
            <div class="projects-overlay-card">
                <div class="projects-overlay-card-image" data-project-id="${project.id}">
                    <img src="${project.image}" alt="${project.name}" loading="lazy">
                    <span class="projects-overlay-card-category">${project.category || ''}</span>
                </div>
                <div class="projects-overlay-card-body">
                    <h4 class="projects-overlay-card-title">${project.name}</h4>
                    <p class="projects-overlay-card-desc">${project.description}</p>
                    <div class="projects-overlay-card-tags">
                        ${project.tags.map(tag => `<span class="projects-overlay-card-tag">${tag}</span>`).join('')}
                    </div>
                    <a href="${project.link}" class="projects-overlay-card-link" target="_blank" rel="noopener noreferrer">
                        View Project <i class="bx bx-right-arrow-alt"></i>
                    </a>
                </div>
            </div>
        `).join('');

        // Bind image click events for lightbox
        this.bindOverlayGridEvents();
    }

    /**
     * Bind click events on overlay grid card images
     */
    bindOverlayGridEvents() {
        const grid = this.overlay.querySelector('#projects-overlay-grid');
        if (!grid) return;

        grid.querySelectorAll('.projects-overlay-card-image').forEach(imageWrapper => {
            imageWrapper.style.cursor = 'pointer';
            imageWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = parseInt(imageWrapper.dataset.projectId);
                const index = this.projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    this.openLightbox(index);
                }
            });
        });
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Image click - open lightbox
        this.container.querySelectorAll('.timeline-card-image').forEach(imageWrapper => {
            imageWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(imageWrapper.dataset.index);
                this.openLightbox(index);
            });
        });

        // Scroll event to update buttons
        this.container.addEventListener('scroll', () => {
            this.updateNavButtons();
        });

        // Navigation button events
        const SCROLL_AMOUNT = 200;

        if (this.navUp) {
            this.navUp.addEventListener('click', () => {
                this.scrollContent(-SCROLL_AMOUNT);
            });
        }

        if (this.navDown) {
            this.navDown.addEventListener('click', () => {
                this.scrollContent(SCROLL_AMOUNT);
            });
        }

        // Expand button
        if (this.navExpand) {
            this.navExpand.addEventListener('click', () => {
                this.openOverlay();
            });
        }

        // Escape key for both lightbox and overlay
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.overlay && this.overlay.classList.contains('active')) {
                    this.closeOverlay();
                } else if (this.lightbox && this.lightbox.classList.contains('active')) {
                    this.closeLightbox();
                }
            }
        });
    }

    /**
     * Open lightbox
     */
    openLightbox(index) {
        const project = this.projects[index];
        if (!project || !this.lightbox) return;

        const img = this.lightbox.querySelector('.project-lightbox-image');
        const title = this.lightbox.querySelector('.project-lightbox-title');
        const description = this.lightbox.querySelector('.project-lightbox-description');

        img.src = project.image;
        img.alt = project.name;
        title.textContent = project.name;
        description.textContent = project.description;

        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close lightbox
     */
    closeLightbox() {
        if (!this.lightbox) return;

        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}
