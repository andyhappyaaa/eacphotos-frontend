// Theme Management (Dark/Light Mode)
const Theme = {
    THEME_KEY: 'eacphoto_theme',
    currentTheme: 'light',

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }

        this.applyTheme();
        this.setupListeners();
    },

    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            localStorage.setItem(this.THEME_KEY, theme);
            this.applyTheme();
            this.updateLogo();
        }
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    applyTheme() {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(this.currentTheme);
        this.updateLogo();
    },

    updateLogo() {
        const navLogo = document.getElementById('nav-logo');
        if (navLogo && navLogo.querySelector('img')) {
            const img = navLogo.querySelector('img');
            if (this.currentTheme === 'dark') {
                img.src = 'https://r2.eacof.org/logo-dark.png';
            } else {
                img.src = 'https://r2.eacof.org/logo-light.png';
            }
        }
    },

    setupListeners() {
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only change if user hasn't set a preference
            if (!localStorage.getItem(this.THEME_KEY)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    getTheme() {
        return this.currentTheme;
    }
};

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Theme.init());
} else {
    Theme.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
}
