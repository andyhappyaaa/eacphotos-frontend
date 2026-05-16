// Index Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Load featured photos
    await loadFeaturedPhotos();

    // Load stats
    await loadStats();

    // Load latest photos
    await loadLatestPhotos();
});

// Load featured photos
async function loadFeaturedPhotos() {
    try {
        const response = await Auth.api('/api/photos/featured');
        const data = await response.json();

        if (data.photos && data.photos.length > 0) {
            // Main featured photo
            const mainFeatured = document.getElementById('featured-main');
            if (mainFeatured && data.photos[0]) {
                mainFeatured.innerHTML = `
                    <a href="/photo.html?id=${data.photos[0].id}">
                        <img src="${data.photos[0].thumbnail}" alt="${escapeHtml(data.photos[0].title || 'Featured')}">
                        <div class="photo-overlay">
                            <h3>${escapeHtml(data.photos[0].title || 'Untitled')}</h3>
                            <p>${escapeHtml(data.photos[0].aircraftType || '')} · ${escapeHtml(data.photos[0].registration || '')}</p>
                        </div>
                    </a>
                `;
            }

            // Side featured photos
            for (let i = 1; i <= 4; i++) {
                const sideItem = document.getElementById(`featured-${i}`);
                if (sideItem && data.photos[i]) {
                    sideItem.innerHTML = `
                        <a href="/photo.html?id=${data.photos[i].id}">
                            <img src="${data.photos[i].thumbnail}" alt="${escapeHtml(data.photos[i].title || 'Featured')}">
                        </a>
                    `;
                }
            }
        }
    } catch (e) {
        console.error('Failed to load featured photos:', e);
    }
}

// Load stats
async function loadStats() {
    try {
        const response = await Auth.api('/api/stats');
        const data = await response.json();

        animateNumber('stat-photos', data.photos || 0);
        animateNumber('stat-users', data.users || 0);
        animateNumber('stat-airlines', data.airlines || 0);
        animateNumber('stat-aircraft', data.aircraft || 0);
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

// Animate number counter
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Load latest photos
async function loadLatestPhotos(page = 1) {
    try {
        const response = await Auth.api(`/api/photos/latest?page=${page}&limit=12`);
        const data = await response.json();

        const grid = document.getElementById('latest-photos');
        if (!grid) return;

        if (data.photos && data.photos.length > 0) {
            grid.innerHTML = data.photos.map(photo => createPhotoCard(photo)).join('');
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>${i18n.t('search.empty')}</p>
                </div>
            `;
        }
    } catch (e) {
        console.error('Failed to load latest photos:', e);
        const grid = document.getElementById('latest-photos');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>加载失败，请稍后重试</p>
                </div>
            `;
        }
    }
}

// Create photo card HTML
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
