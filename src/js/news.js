// News Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    await loadNews();
});

async function loadNews() {
    try {
        // Load featured news
        const featuredResponse = await Auth.api('/api/news/featured');
        const featuredData = await featuredResponse.json();

        if (featuredData.news && featuredData.news.length > 0) {
            renderFeaturedNews(featuredData.news[0]);
        }

        // Load news list
        const listResponse = await Auth.api('/api/news?limit=20');
        const listData = await listResponse.json();

        if (listData.news && listData.news.length > 0) {
            renderNewsList(listData.news);
        }
    } catch (e) {
        console.error('Failed to load news:', e);
    }
}

function renderFeaturedNews(news) {
    const container = document.getElementById('news-featured');
    if (!container) return;

    container.innerHTML = `
        <div class="news-featured-item">
            <div class="news-featured-image">
                <a href="/news-detail.html?id=${news.id}">
                    <img src="${news.image || 'https://r2.eacof.org/logo-light.png'}" alt="${escapeHtml(news.title)}">
                </a>
            </div>
            <div class="news-featured-content">
                <span class="news-category">${escapeHtml(news.category || 'News')}</span>
                <h2><a href="/news-detail.html?id=${news.id}">${escapeHtml(news.title)}</a></h2>
                <p class="news-excerpt">${escapeHtml(news.excerpt || news.content?.substring(0, 200) || '')}...</p>
                <div class="news-meta">
                    <span class="news-date">${formatDate(news.publishedAt)}</span>
                    <span class="news-author">By ${escapeHtml(news.author || 'EAC Photo')}</span>
                </div>
            </div>
        </div>
    `;
}

function renderNewsList(newsList) {
    const container = document.getElementById('news-list');
    if (!container) return;

    container.innerHTML = newsList.map(news => `
        <article class="news-card">
            <div class="news-card-image">
                <a href="/news-detail.html?id=${news.id}">
                    <img src="${news.image || 'https://r2.eacof.org/logo-light.png'}" alt="${escapeHtml(news.title)}" loading="lazy">
                </a>
            </div>
            <div class="news-card-content">
                <span class="news-category">${escapeHtml(news.category || 'News')}</span>
                <h3><a href="/news-detail.html?id=${news.id}">${escapeHtml(news.title)}</a></h3>
                <p class="news-excerpt">${escapeHtml(news.excerpt || news.content?.substring(0, 150) || '')}...</p>
                <div class="news-meta">
                    <span class="news-date">${formatDate(news.publishedAt)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
