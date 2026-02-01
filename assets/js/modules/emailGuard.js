/**
 * Email Guard Module
 * Safe email button generation and handling
 */

/**
 * Generate encrypted email button HTML
 * @param {string} user - Email username
 * @param {string} domain - Email domain
 * @param {string} subject - Email subject
 * @param {string} label - Button text
 * @param {string} iconClass - Icon CSS class
 * @param {string} customClass - Button CSS class
 * @returns {string} Button HTML
 */
export function getEncryptedButtonHTML(user, domain, subject = '', label = '', iconClass = '', customClass = '') {
    const encUser = btoa(user);
    const encDomain = btoa(domain);
    const encSubject = btoa(subject);

    // Determine if we need to show label or just icon
    const content = label
        ? `<i class="${iconClass}"></i> ${label}`
        : `<i class="${iconClass}"></i>`;

    return `
        <a href="javascript:void(0)" 
           class="${customClass}" 
           data-u="${encUser}" 
           data-d="${encDomain}" 
           data-s="${encSubject}"
           aria-label="${label || 'Email'}"
           role="button">
            ${content}
        </a>
    `.trim();
}

/**
 * Initialize email guard listener
 */
export function initEmailGuard() {
    document.addEventListener('click', (e) => {
        // Delegate click to encrypted buttons
        const btn = e.target.closest('[data-u][data-d]');

        if (btn) {
            e.preventDefault();

            try {
                const user = atob(btn.dataset.u);
                const domain = atob(btn.dataset.d);
                const subject = btn.dataset.s ? atob(btn.dataset.s) : '';

                const email = `${user}@${domain}`;
                const mailto = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

                window.location.href = mailto;
            } catch (error) {
                console.error('Email decode failed:', error);
            }
        }
    });

    console.log('Email Guard Initialized');
}
