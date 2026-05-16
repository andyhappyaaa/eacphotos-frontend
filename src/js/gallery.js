// Gallery Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    let currentPage = 1;
    let totalPages = 1;
    let currentFilter = 'all';
    let currentSort = 'latest';

    // Load initial photos
    await loadGallery();

    // Setup filter tabs
    setupFilterTabs();

    // Setup sort
    setupSort();

    // Setup photo modal
    setupPhotoModal();

    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');

        try {
            const queryParams = new URLSearchParams();
            if (currentFilter !== 'all') {
                queryParams.append('type', currentFilter);
            }
            queryParams.append('sort', currentSort);
            queryParams.append('page', currentPage);
            queryParams.append('limit', 20);

            const response = await Auth.api(`/api/photos/gallery?${queryParams.toString()}`);
            const data = await response.json();

            totalPages = data.totalPages || 1;

            if (data.photos && data.photos.length > 0) {
                grid.innerHTML = data.photos.map(photo => createPhotoCard(photo)).join('');
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <p>暂无照片</p>
                    </div>
                `;
            }

            renderPagination();
        } catch (e) {
            console.error('Failed to load gallery:', e);
            grid.innerHTML = `
                <div class="empty-state">
                    <p>加载失败，请稍后重试</p>
                </div>
            `;
        }
    }

    function setupFilterTabs() {
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update filter and reload
                currentFilter = tab.dataset.filter;
                currentPage = 1;
                loadGallery();
            });
        });
    }

    function setupSort() {
        const sortSelect = document.getElementById('gallery-sort');
        sortSelect?.addEventListener('change', (e) => {
            currentSort = e.target.value;
            currentPage = 1;
            loadGallery();
        });
    }

    function setupPhotoModal() {
        const modal = document.getElementById('photo-modal');
        const closeBtn = modal?.querySelector('.modal-close');

        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Setup photo card clicks
        document.addEventListener('click', (e) => {
            const photoCard = e.target.closest('.photo-card');
            if (photoCard) {
                const link = photoCard.querySelector('a');
                if (link) {
                    const photoId = new URL(link.href).searchParams.get('id');
                    if (photoId) {
                        e.preventDefault();
                        openPhotoModal(photoId);
                    }
                }
            }
        });

        // Setup modal actions
        document.getElementById('modal-like')?.addEventListener('click', handleLike);
        document.getElementById('modal-download')?.addEventListener('click', handleDownload);
        document.getElementById('modal-share')?.addEventListener('click', handleShare);
    }

    async function openPhotoModal(photoId) {
        const modal = document.getElementById('photo-modal');
        if (!modal) return;

        try {
            const response = await Auth.api(`/api/photos/${photoId}`);
            const photo = await response.json();

            // Update modal content
            document.getElementById('modal-photo').src = photo.url;
            document.getElementById('modal-title').textContent = photo.title || 'Untitled';
            document.getElementById('modal-date').textContent = photo.date || 'N/A';
            document.getElementById('modal-registration').textContent = photo.registration || 'N/A';
            document.getElementById('modal-aircraft').textContent = photo.aircraftType || 'N/A';
            document.getElementById('modal-airline').textContent = photo.airline || 'N/A';
            document.getElementById('modal-location').textContent = photo.location || 'N/A';
            document.getElementById('modal-description').textContent = photo.description || '';
            document.getElementById('modal-like-count').textContent = photo.likes || 0;

            // Photographer link
            const photographerLink = document.getElementById('modal-photographer');
            if (photographerLink) {
                photographerLink.textContent = photo.photographer?.username || 'Unknown';
                photographerLink.href = `/profile.html?user=${photo.photographer?.id || ''}`;
            }

            // Tags
            const tagsContainer = document.getElementById('modal-tags');
            if (tagsContainer) {
                if (photo.types && photo.types.length > 0) {
                    tagsContainer.innerHTML = photo.types.map(type =>
                        `<span class="photo-tag">${type}</span>`
                    ).join('');
                } else {
                    tagsContainer.innerHTML = '';
                }
            }

            // Show modal
            modal.classList.add('show');

            // Store photo ID for actions
            modal.dataset.photoId = photoId;
        } catch (e) {
            console.error('Failed to load photo:', e);
            showToast('加载照片失败', 'error');
        }
    }

    async function handleLike() {
        if (!Auth.isLoggedIn()) {
            showToast('请先登录', 'warning');
            return;
        }

        const modal = document.getElementById('photo-modal');
        const photoId = modal?.dataset.photoId;
        if (!photoId) return;

        try {
            const response = await Auth.api(`/api/photos/${photoId}/like`, {
                method: 'POST'
            });
            const data = await response.json();

            const likeCount = document.getElementById('modal-like-count');
            if (likeCount) {
                likeCount.textContent = data.likes || 0;
            }

            showToast(data.liked ? '已点赞' : '已取消点赞', 'success');
        } catch (e) {
            console.error('Like error:', e);
            showToast('操作失败', 'error');
        }
    }

    async function handleDownload() {
        const modal = document.getElementById('photo-modal');
        const photoId = modal?.dataset.photoId;
        if (!photoId) return;

        try {
            const response = await Auth.api(`/api/photos/${photoId}/download`);
            const data = await response.json();

            // Download the file
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = data.filename || 'photo.jpg';
            link.click();

            showToast('开始下载', 'success');
        } catch (e) {
            console.error('Download error:', e);
            showToast('下载失败', 'error');
        }
    }

    function handleShare() {
        const modal = document.getElementById('photo-modal');
        const photoId = modal?.dataset.photoId;
        const url = window.location.origin + `/photo.html?id=${photoId}`;

        if (navigator.share) {
            navigator.share({
                title: 'EAC Photo',
                url: url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => {
                showToast('链接已复制', 'success');
            }).catch(() => {
                showToast('复制失败', 'error');
            });
        }
    }

    function renderPagination() {
        const container = document.getElementById('gallery-pagination');
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
                    loadGallery();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
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

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background-color: var(--bg-card);
            color: var(--text-primary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            border-left: 4px solid ${type === 'error' ? 'var(--error-color)' : type === 'success' ? 'var(--success-color)' : 'var(--info-color)'};
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
