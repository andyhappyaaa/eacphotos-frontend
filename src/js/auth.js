// Authentication System with TOTP-based request signing
const Auth = {
    // Backend API URL (configure via Vercel environment variable or default)
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:8787'
        : import.meta.env?.VITE_API_URL || '',

    // Session management
    SESSION_KEY: 'eacphoto_session',
    SESSION_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds

    // Current session data
    session: null,

    // Initialize auth system
    async init() {
        // Load session from storage
        this.loadSession();

        // Check if session is expired
        if (this.session && this.isSessionExpired()) {
            this.clearSession();
        }

        // Update UI based on auth state
        this.updateAuthUI();

        // Setup periodic session check
        setInterval(() => this.checkSession(), 60 * 1000);
    },

    // Load session from localStorage
    loadSession() {
        try {
            const stored = localStorage.getItem(this.SESSION_KEY);
            if (stored) {
                this.session = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load session:', e);
            this.clearSession();
        }
    },

    // Save session to localStorage
    saveSession() {
        if (this.session) {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.session));
        }
    },

    // Clear session
    clearSession() {
        this.session = null;
        localStorage.removeItem(this.SESSION_KEY);
    },

    // Check if session is expired
    isSessionExpired() {
        if (!this.session) return true;
        return Date.now() > this.session.expiresAt;
    },

    // Check session periodically
    checkSession() {
        if (this.session && this.isSessionExpired()) {
            this.clearSession();
            this.updateAuthUI();
        }
    },

    // Update UI based on auth state
    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.session) {
            // User is logged in
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');

            // Setup logout button
            if (logoutBtn) {
                logoutBtn.onclick = () => this.logout();
            }
        } else {
            // User is not logged in
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    },

    // Generate TOTP code for request signing
    async generateTOTP(secret, timeOffset = 0) {
        const timestamp = Math.floor(Date.now() / 1000) + timeOffset;
        const timeStep = Math.floor(timestamp / 30);

        // Import secret as base64
        const encoder = new TextEncoder();
        const secretBytes = encoder.encode(secret);

        // Convert time step to buffer (big-endian 8 bytes)
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new DataView(timeBuffer);
        timeView.setUint32(4, timeStep, false);
        timeView.setUint32(0, 0, false);

        // Import key for HMAC
        const key = await crypto.subtle.importKey(
            'raw',
            secretBytes,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );

        // Sign the time step
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            timeBuffer
        );

        // Dynamic truncation to get 6-digit code
        const hmacArray = new Uint8Array(signature);
        const offset = hmacArray[hmacArray.length - 1] & 0x0F;
        const code = (
            ((hmacArray[offset] & 0x7F) << 24) |
            ((hmacArray[offset + 1] & 0xFF) << 16) |
            ((hmacArray[offset + 2] & 0xFF) << 8) |
            (hmacArray[offset + 3] & 0xFF)
        ) % 1000000;

        return code.toString().padStart(6, '0');
    },

    // Generate auth headers for API requests
    async getAuthHeaders(bypassSession = false) {
        const secret = import.meta.env?.VITE_AUTH_SECRET || 'default-secret-change-in-production';

        // Generate codes for current, previous, and next 30-second windows
        const codes = await Promise.all([
            this.generateTOTP(secret, -30),
            this.generateTOTP(secret, 0),
            this.generateTOTP(secret, 30)
        ]);

        const headers = {
            'X-Auth-Codes': codes.join(','),
            'X-Auth-Timestamp': Date.now().toString(),
            'Content-Type': 'application/json'
        };

        // Add session token if available and not bypassing
        if (this.session && this.session.token && !bypassSession) {
            headers['Authorization'] = `Bearer ${this.session.token}`;
        }

        return headers;
    },

    // Make authenticated API request
    async api(endpoint, options = {}) {
        const url = `${this.API_URL}${endpoint}`;

        // Merge headers
        const bypassSession = options.bypassSession || false;
        const headers = await this.getAuthHeaders(bypassSession);

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            this.clearSession();
            this.updateAuthUI();
            if (!options.noRedirect) {
                window.location.href = '/login.html';
            }
            throw new Error('Unauthorized');
        }

        return response;
    },

    // Login
    async login(username, password, rememberMe, totpCode = null) {
        const response = await this.api('/api/auth/login', {
            method: 'POST',
            bypassSession: true,
            body: JSON.stringify({
                username,
                password,
                rememberMe,
                totpCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Check if 2FA is required
        if (data.requires2FA) {
            return { requires2FA: true };
        }

        // Save session
        this.session = {
            token: data.token,
            user: data.user,
            expiresAt: Date.now() + this.SESSION_DURATION,
            rememberMe: rememberMe
        };

        this.saveSession();
        this.updateAuthUI();

        return { success: true };
    },

    // Register
    async register(username, email, password, emailCode, agreeTerms) {
        const response = await this.api('/api/auth/register', {
            method: 'POST',
            bypassSession: true,
            body: JSON.stringify({
                username,
                email,
                password,
                emailCode,
                agreeTerms
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    },

    // Logout
    async logout() {
        try {
            await this.api('/api/auth/logout', {
                method: 'POST'
            });
        } catch (e) {
            console.error('Logout error:', e);
        }

        this.clearSession();
        this.updateAuthUI();
        window.location.href = '/';
    },

    // Get current user
    getCurrentUser() {
        return this.session ? this.session.user : null;
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.session !== null && !this.isSessionExpired();
    },

    // Verify 2FA code
    async verify2FA(code) {
        const response = await this.api('/api/auth/verify-2fa', {
            method: 'POST',
            bypassSession: true,
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Verification failed');
        }

        // Complete login if there's a pending session
        if (data.token && data.user) {
            this.session = {
                token: data.token,
                user: data.user,
                expiresAt: Date.now() + this.SESSION_DURATION
            };
            this.saveSession();
            this.updateAuthUI();
        }

        return data;
    },

    // Setup 2FA
    async setup2FA() {
        const response = await this.api('/api/auth/setup-2fa', {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Setup failed');
        }

        return data;
    },

    // Verify and enable 2FA
    async enable2FA(code) {
        const response = await this.api('/api/auth/enable-2fa', {
            method: 'POST',
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Enable failed');
        }

        return data;
    },

    // Send email verification code
    async sendEmailCode(email) {
        const response = await this.api('/api/auth/send-email-code', {
            method: 'POST',
            bypassSession: true,
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send code');
        }

        return data;
    },

    // Verify Turnstile token
    async verifyTurnstile(token) {
        const response = await this.api('/api/auth/verify-turnstile', {
            method: 'POST',
            bypassSession: true,
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Turnstile verification failed');
        }

        return data.success;
    },

    // Refresh session
    async refreshSession() {
        if (!this.session) return false;

        const response = await this.api('/api/auth/refresh', {
            method: 'POST'
        });

        if (!response.ok) {
            this.clearSession();
            this.updateAuthUI();
            return false;
        }

        const data = await response.json();
        this.session.token = data.token;
        this.session.expiresAt = Date.now() + this.SESSION_DURATION;
        this.saveSession();

        return true;
    },

    // Upload photo
    async uploadPhoto(formData, onProgress) {
        const secret = import.meta.env?.VITE_AUTH_SECRET || 'default-secret-change-in-production';

        // Generate codes for current, previous, and next 30-second windows
        const codes = await Promise.all([
            this.generateTOTP(secret, -30),
            this.generateTOTP(secret, 0),
            this.generateTOTP(secret, 30)
        ]);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.API_URL}/api/photos/upload`);

            // Set auth headers
            xhr.setRequestHeader('X-Auth-Codes', codes.join(','));
            xhr.setRequestHeader('X-Auth-Timestamp', Date.now().toString());

            if (this.session && this.session.token) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.session.token}`);
            }

            // Progress handler
            if (onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress((e.loaded / e.total) * 100);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(new Error('Invalid response'));
                    }
                } else {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        reject(new Error(data.message || 'Upload failed'));
                    } catch (e) {
                        reject(new Error('Upload failed'));
                    }
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error'));
            };

            xhr.send(formData);
        });
    }
};

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
