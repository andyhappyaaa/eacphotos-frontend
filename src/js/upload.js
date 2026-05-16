// Upload Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const uploadForm = document.getElementById('upload-form');

    // Initialize Turnstile
    let turnstileWidgetId = null;
    if (typeof turnstile !== 'undefined') {
        const turnstileContainer = document.getElementById('turnstile-container');
        if (turnstileContainer) {
            turnstileWidgetId = turnstile.render('#turnstile-container', {
                sitekey: import.meta.env?.VITE_TURNSTILE_SITE_KEY || window.TURNSTILE_SITE_KEY || '',
                theme: Theme.getTheme() === 'dark' ? 'dark' : 'light'
            });
        }
    }

    // Load queue info
    await loadQueueInfo();

    // Setup drag and drop
    setupDragAndDrop();

    // Setup file input
    fileInput?.addEventListener('change', handleFileSelect);

    // Setup form submission
    uploadForm?.addEventListener('submit', handleUpload);

    // Setup autocomplete
    setupAutocomplete();

    // Load queue info
    async function loadQueueInfo() {
        try {
            const response = await Auth.api('/api/upload/queue-info');
            const data = await response.json();

            const normalRemaining = document.getElementById('normal-remaining');
            const priorityRemaining = document.getElementById('priority-remaining');

            if (normalRemaining) {
                normalRemaining.textContent = `剩余: ${data.normalRemaining || 0}`;
            }
            if (priorityRemaining) {
                priorityRemaining.textContent = `剩余: ${data.priorityRemaining || 0}`;
            }
        } catch (e) {
            console.error('Failed to load queue info:', e);
        }
    }

    // Setup drag and drop
    function setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone?.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone?.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone?.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone?.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const files = e.dataTransfer.files;
            handleFiles(files);
        }
    }

    // Handle file select
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    // Handle files
    function handleFiles(files) {
        if (!fileList) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                if (file.size > 20 * 1024 * 1024) {
                    showToast(`文件 ${file.name} 超过20MB限制`, 'error');
                    return;
                }
                addFileToList(file);
            }
        });
    }

    // Add file to list
    function addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileName = file.name;
        fileItem.dataset.fileSize = file.size;

        const reader = new FileReader();
        reader.onload = (e) => {
            fileItem.innerHTML = `
                <div class="file-item-image">
                    <img src="${e.target.result}" alt="${escapeHtml(file.name)}">
                </div>
                <div class="file-item-info">
                    <div class="file-item-name">${escapeHtml(file.name)}</div>
                    <div class="file-item-size">${formatFileSize(file.size)}</div>
                    <div class="file-item-status">等待上传</div>
                </div>
                <button type="button" class="file-item-remove" data-file="${file.name}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
        };
        reader.readAsDataURL(file);

        fileList.appendChild(fileItem);

        // Remove button
        fileItem.querySelector('.file-item-remove')?.addEventListener('click', () => {
            fileItem.classList.add('removing');
            setTimeout(() => fileItem.remove(), 300);
        });
    }

    // Handle upload
    async function handleUpload(e) {
        e.preventDefault();

        if (!Auth.isLoggedIn()) {
            showToast('请先登录', 'error');
            window.location.href = '/login.html';
            return;
        }

        const files = Array.from(fileInput.files);
        if (files.length === 0) {
            showToast('请选择要上传的图片', 'error');
            return;
        }

        // Get form data
        const formData = new FormData();
        formData.append('title', document.getElementById('photo-title').value);
        formData.append('date', document.getElementById('photo-date').value);
        formData.append('registration', document.getElementById('registration').value);
        formData.append('serialNumber', document.getElementById('serial-number').value || 'N/A');
        formData.append('airline', document.getElementById('airline').value);
        formData.append('aircraftType', document.getElementById('aircraft-type').value);
        formData.append('location', document.getElementById('location').value);
        formData.append('description', document.getElementById('photo-description').value);
        formData.append('message', document.getElementById('photo-message').value);
        formData.append('isHot', document.getElementById('is-hot').checked);
        formData.append('queue', document.querySelector('input[name="queue"]:checked').value);
        formData.append('socialShare', document.getElementById('social-share').checked);

        // Get selected types
        const selectedTypes = Array.from(document.querySelectorAll('input[name="type"]:checked'))
            .map(input => input.value);
        formData.append('types', JSON.stringify(selectedTypes));

        // Add files
        files.forEach(file => {
            formData.append('photos', file);
        });

        // Get Turnstile token
        let turnstileToken = null;
        if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
            turnstileToken = turnstile.getResponse(turnstileWidgetId);
        }

        try {
            // Verify Turnstile
            if (turnstileToken) {
                await Auth.verifyTurnstile(turnstileToken);
            }

            // Upload
            await Auth.uploadPhoto(formData, (progress) => {
                showToast(`上传中: ${Math.round(progress)}%`, 'info');
            });

            showToast('上传成功，等待审核', 'success');

            // Reset form
            uploadForm.reset();
            fileList.innerHTML = '';
            fileInput.value = '';

            // Reload queue info
            await loadQueueInfo();
        } catch (error) {
            showToast(error.message, 'error');
            // Reset Turnstile
            if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
        }
    }

    // Setup autocomplete
    function setupAutocomplete() {
        setupAutocompleteField('registration', 'registration-results', '/api/autocomplete/registration');
        setupAutocompleteField('airline', 'airline-results', '/api/autocomplete/airline');
        setupAutocompleteField('aircraft-type', 'aircraft-results', '/api/autocomplete/aircraft');
        setupAutocompleteField('location', 'location-results', '/api/autocomplete/location');
    }

    function setupAutocompleteField(inputId, resultsId, endpoint) {
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

                        // Handle selection
                        results.querySelectorAll('.autocomplete-item').forEach(item => {
                            item.addEventListener('click', () => {
                                input.value = item.dataset.value;
                                results.classList.remove('show');

                                // Auto-fill related fields if available
                                if (item.dataset.related) {
                                    const related = JSON.parse(item.dataset.related);
                                    if (related.airline && document.getElementById('airline')) {
                                        document.getElementById('airline').value = related.airline;
                                    }
                                    if (related.aircraftType && document.getElementById('aircraft-type')) {
                                        document.getElementById('aircraft-type').value = related.aircraftType;
                                    }
                                }
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

        // Hide results on click outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.remove('show');
            }
        });
    }

    // Helper functions
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toast notification
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

    // Add animations
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
});
