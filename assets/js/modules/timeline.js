/**
 * Timeline Module
 * Renders timeline items from data with compact card design
 */

export class Timeline {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.lightbox = null;
        this.currentIndex = 0;
        this.navUp = null;
        this.navDown = null;
    }

    /**
     * Render timeline with projects
     * @param {Array} projects - Array of project objects
     */
    render(projects) {
        if (!this.container || !projects.length) return;

        this.projects = projects;

        this.container.innerHTML = projects.map((project, index) => `
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
        `).join('');

        this.createNavigationButtons();
        this.createLightbox();
        this.bindEvents();
        this.updateNavButtons();
    }

    /**
     * Create navigation buttons
     */
    createNavigationButtons() {
        const timelineContainer = this.container.closest('.timeline-container');
        if (!timelineContainer) return;

        // Create nav container
        const nav = document.createElement('div');
        nav.className = 'timeline-nav';
        nav.innerHTML = `
            <button class="timeline-nav-btn" id="timeline-nav-up" aria-label="Previous project">
                <i class="bx bx-chevron-up"></i>
            </button>
            <button class="timeline-nav-btn" id="timeline-nav-down" aria-label="Next project">
                <i class="bx bx-chevron-down"></i>
            </button>
        `;
        timelineContainer.appendChild(nav);

        this.navUp = nav.querySelector('#timeline-nav-up');
        this.navDown = nav.querySelector('#timeline-nav-down');
    }

    /**
     * Navigate to specific project
     */
    navigateToProject(index) {
        if (index < 0 || index >= this.projects.length) return;

        this.currentIndex = index;
        const items = this.container.querySelectorAll('.timeline-item');
        const targetItem = items[index];

        if (targetItem) {
            const timelineContainer = this.container.closest('.timeline-container');
            if (timelineContainer) {
                const containerRect = timelineContainer.getBoundingClientRect();
                const itemRect = targetItem.getBoundingClientRect();
                const scrollOffset = itemRect.top - containerRect.top + timelineContainer.scrollTop - (containerRect.height / 2) + (itemRect.height / 2);

                timelineContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        }

        this.updateNavButtons();
    }

    /**
     * Update navigation button states
     */
    updateNavButtons() {
        if (this.navUp) {
            if (this.currentIndex <= 0) {
                this.navUp.classList.add('disabled');
            } else {
                this.navUp.classList.remove('disabled');
            }
        }

        if (this.navDown) {
            if (this.currentIndex >= this.projects.length - 1) {
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

        // Close on background click
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.lightbox.classList.contains('active')) {
                this.closeLightbox();
            }
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



        // Navigation button events
        if (this.navUp) {
            this.navUp.addEventListener('click', () => {
                if (this.currentIndex > 0) {
                    this.navigateToProject(this.currentIndex - 1);
                }
            });
        }

        if (this.navDown) {
            this.navDown.addEventListener('click', () => {
                if (this.currentIndex < this.projects.length - 1) {
                    this.navigateToProject(this.currentIndex + 1);
                }
            });
        }
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
