// Profile Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');

    // If viewing own profile, check auth
    const isOwnProfile = !userId && Auth.isLoggedIn();
    const currentUser = Auth.getCurrentUser();

    if (isOwnProfile) {
        loadProfile(currentUser.id);
    } else {
        loadProfile(userId);
    }

    // Setup tabs
    setupTabs();

    async function loadProfile(id) {
        if (!id) return;

        try {
            const response = await Auth.api(`/api/users/${id}`);
            const user = await response.json();

            // Update profile info
            document.getElementById('profile-username').textContent = user.username || 'Unknown';
            document.getElementById('profile-bio').textContent = user.bio || 'No bio yet';

            // Update avatar
            if (user.avatar) {
                document.getElementById('profile-avatar').src = user.avatar;
            }

            // Update stats
            document.getElementById('stat-photos').textContent = user.photoCount || 0;
            document.getElementById('stat-likes').textContent = user.totalLikes || 0;
            document.getElementById('stat-views').textContent = user.totalViews || 0;

            if (user.createdAt) {
                const date = new Date(user.createdAt);
                document.getElementById('stat-joined').textContent = date.toLocaleDateString();
            }

            // Update level
            updateLevel(user);

            // Load user's photos
            loadUserPhotos(id);
        } catch (e) {
            console.error('Failed to load profile:', e);
            showToast('加载用户信息失败', 'error');
        }
    }

    function updateLevel(user) {
        const levelText = document.getElementById('level-text');
        const levelProgress = document.getElementById('level-progress');
        const progressText = document.getElementById('progress-text');

        // Calculate level based on XP
        const xp = user.xp || 0;
        const level = Math.floor(xp / 100) + 1;
        const xpInLevel = xp % 100;

        const levelNames = ['新手摄影师', '初级摄影师', '中级摄影师', '高级摄影师', '资深摄影师', '专家摄影师', '大师摄影师', '传奇摄影师'];
        const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

        if (levelText) levelText.textContent = `${levelName} (Lv.${level})`;
        if (levelProgress) levelProgress.style.width = `${xpInLevel}%`;
        if (progressText) progressText.textContent = `${xpInLevel} / 100 XP`;
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.profile-tab');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding pane
                panes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `tab-${tab.dataset.tab}`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }

    async function loadUserPhotos(userId) {
        const grid = document.getElementById('profile-photos');

        try {
            const response = await Auth.api(`/api/users/${userId}/photos?limit=20`);
            const data = await response.json();

            if (data.photos && data.photos.length > 0) {
                grid.innerHTML = data.photos.map(photo => createPhotoCard(photo)).join('');
            } else {
                grid.innerHTML = `
                    <div class="empty-photos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <p>暂无作品</p>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Failed to load photos:', e);
            grid.innerHTML = `
                <div class="empty-photos">
                    <p>加载失败</p>
                </div>
            `;
        }
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
