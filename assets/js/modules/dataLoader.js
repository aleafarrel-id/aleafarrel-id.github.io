/**
 * Data Loader Module
 * Loads and parses the database.json file
 */

export class DataLoader {
    constructor() {
        this.data = null;
        this.loaded = false;
    }

    /**
     * Load data from database.json
     * @returns {Promise<Object>} The loaded data
     */
    async load() {
        if (this.loaded) {
            return this.data;
        }

        try {
            const response = await fetch('assets/database/database.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.loaded = true;
            return this.data;
        } catch (error) {
            console.error('Failed to load database:', error);
            return null;
        }
    }

    /**
     * Get profile data
     * @returns {Object|null} Profile data
     */
    getProfile() {
        return this.data?.profile || null;
    }

    /**
     * Get centralized socials
     * @returns {Object|null} Socials object
     */
    getSocials() {
        return this.data?.socials || null;
    }

    /**
     * Get navigation links
     * @returns {Array} Navigation array
     */
    getNavigation() {
        return this.data?.navigation || [];
    }

    /**
     * Get about section data
     * @returns {Object|null} About data
     */
    getAbout() {
        return this.data?.about || null;
    }

    /**
     * Get all projects
     * @returns {Array} Array of projects
     */
    getProjects() {
        return this.data?.projects || [];
    }

    /**
     * Get gallery data
     * @returns {Object|null} Gallery configuration
     */
    getGallery() {
        return this.data?.gallery || null;
    }

    /**
     * Get awards data
     * @returns {Object|null} Awards configuration
     */
    getAwards() {
        return this.data?.awards || null;
    }

    /**
     * Get all certifications
     * @returns {Array} Array of certifications
     */
    getCertifications() {
        return this.data?.certifications || [];
    }

    /**
     * Get all technologies
     * @returns {Array} Array of technologies
     */
    getTechnologies() {
        return this.data?.technologies || [];
    }

    /**
     * Get footer data
     * @returns {Object|null} Footer data
     */
    getFooter() {
        return this.data?.footer || null;
    }
}

// Create singleton instance
export const dataLoader = new DataLoader();
