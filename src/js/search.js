// Search Page Logic
document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    let totalPages = 1;
    let searchParams = {};

    // Setup event listeners
    setupEventListeners();

    // Load initial results (empty state)
    displayResults([]);

    function setupEventListeners() {
        // Search button
        document.getElementById('apply-filters')?.addEventListener('click', performSearch);

        // Reset button
        document.getElementById('reset-filters')?.addEventListener('click', resetFilters);

        // Show more types
        document.getElementById('show-more-types')?.addEventListener('click', () => {
            const moreTypes = document.querySelector('.more-types');
            const button = document.getElementById('show-more-types');
            moreTypes?.classList.toggle('hidden');
            button.textContent = moreTypes?.classList.contains('hidden') ? i18n.t('search.showMore') : i18n.t('nav.hide');
        });

        // Setup autocomplete
        setupAutocomplete('search-airline', 'search-airline-results', '/api/autocomplete/airline');
        setupAutocomplete('search-location', 'search-location-results', '/api/autocomplete/location');
        setupAutocomplete('search-aircraft', 'search-aircraft-results', '/api/autocomplete/aircraft');
        setupAutocomplete('search-photographer', 'search-photographer-results', '/api/autocomplete/photographer');

        // Enter key to search
        document.querySelectorAll('.search-filters input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        });
    }

    function setupAutocomplete(inputId, resultsId, endpoint) {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);

        if (!input || !results) return;

        let debounceTimer;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);

            const value = input.value.trim();
            if (value.length < 2) {
                results.classList.remove('show');
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const response = await Auth.api(`${endpoint}?q=${encodeURIComponent(value)}`);
                    const data = await response.json();

                    if (data.results && data.results.length > 0) {
                        results.innerHTML = data.results.map(item => `
                            <div class="autocomplete-item" data-value="${escapeHtml(item.value)}">
                                <span class="primary">${escapeHtml(item.label)}</span>
                                <span class="secondary">${escapeHtml(item.secondary || '')}</span>
                            </div>
                        `).join('');
                        results.classList.add('show');

                        results.querySelectorAll('.autocomplete-item').forEach(item => {
                            item.addEventListener('click', () => {
                                input.value = item.dataset.value;
                                results.classList.remove('show');
                            });
                        });
                    } else {
                        results.classList.remove('show');
                    }
                } catch (e) {
                    console.error('Autocomplete error:', e);
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.remove('show');
            }
        });
    }

    async function performSearch() {
        // Gather search parameters
        searchParams = {
            registration: document.getElementById('search-registration')?.value.trim() || '',
            airline: document.getElementById('search-airline')?.value.trim() || '',
            location: document.getElementById('search-location')?.value.trim() || '',
            aircraft: document.getElementById('search-aircraft')?.value.trim() || '',
            photographer: document.getElementById('search-photographer')?.value.trim() || '',
            dateFrom: document.getElementById('search-date-from')?.value || '',
            dateTo: document.getElementById('search-date-to')?.value || '',
            types: Array.from(document.querySelectorAll('input[name="searchType"]:checked'))
                .map(input => input.value),
            sortBy: document.getElementById('sort-by')?.value || 'latest'
        };

        currentPage = 1;
        await loadResults();
    }

    async function loadResults() {
        const grid = document.getElementById('search-results-grid');
        const resultsCount = document.getElementById('results-count');

        // Show loading
        grid.innerHTML = `
            <div class="search-loading">
                <div class="spinner"></div>
            </div>
        `;
        resultsCount.classList.add('updating');

        try {
            const queryParams = new URLSearchParams();
            Object.entries(searchParams).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => queryParams.append(key, v));
                } else if (value) {
                    queryParams.append(key, value);
                }
            });
            queryParams.append('page', currentPage);
            queryParams.append('limit', 20);

            const response = await Auth.api(`/api/photos/search?${queryParams.toString()}`);
            const data = await response.json();

            totalPages = data.totalPages || 1;

            if (data.photos && data.photos.length > 0) {
                displayResults(data.photos);
                resultsCount.textContent = `找到 ${data.total} 张照片`;
            } else {
                displayEmpty();
                resultsCount.textContent = '找到 0 张照片';
            }

            renderPagination();
        } catch (e) {
            console.error('Search error:', e);
            grid.innerHTML = `
                <div class="no-results">
                    <p>搜索失败，请稍后重试</p>
                </div>
            `;
            resultsCount.textContent = '搜索出错';
        }

        resultsCount.classList.remove('updating');
    }

    function displayResults(photos) {
        const grid = document.getElementById('search-results-grid');
        if (!grid) return;

        grid.innerHTML = photos.map(photo => createPhotoCard(photo)).join('');
    }

    function displayEmpty() {
        const grid = document.getElementById('search-results-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="no-results">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>没有找到符合条件的照片</h3>
                <p>尝试调整搜索条件</p>
            </div>
        `;
    }

    function renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo;</button>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button ${i === currentPage ? 'class="active"' : ''} data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
            html += `<button data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&raquo;</button>`;

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page !== currentPage && page >= 1 && page <= totalPages) {
                    currentPage = page;
                    loadResults();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    function resetFilters() {
        document.getElementById('search-registration').value = '';
        document.getElementById('search-airline').value = '';
        document.getElementById('search-location').value = '';
        document.getElementById('search-aircraft').value = '';
        document.getElementById('search-photographer').value = '';
        document.getElementById('search-date-from').value = '';
        document.getElementById('search-date-to').value = '';

        document.querySelectorAll('input[name="searchType"]').forEach(input => {
            input.checked = false;
        });

        document.getElementById('sort-by').value = 'latest';

        searchParams = {};
        currentPage = 1;

        displayEmpty();
        document.getElementById('results-count').textContent = '找到 0 张照片';
        document.getElementById('pagination').innerHTML = '';
    }

    function createPhotoCard(photo) {
        return `
            <div class="photo-card">
                <a href="/photo.html?id=${photo.id}">
                    <img src="${photo.thumbnail}" alt="${escapeHtml(photo.title || 'Photo')}" loading="lazy">
                </a>
                <div class="photo-info">
                    <h3 class="photo-title">
                        <a href="/photo.html?id=${photo.id}">${escapeHtml(photo.title || 'Untitled')}</a>
                    </h3>
                    <div class="photo-meta">
                        <span>${escapeHtml(photo.aircraftType || 'N/A')}</span>
                        <span>${escapeHtml(photo.registration || 'N/A')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
