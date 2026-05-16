// Login Page Logic
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const twoFAModal = document.getElementById('2fa-modal');
    const verify2FAButton = document.getElementById('verify-2fa');
    const cancel2FAButton = document.getElementById('cancel-2fa');
    const codeInputs = twoFAModal?.querySelectorAll('.code-input');

    let loginData = null;

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

    // Handle form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // Get Turnstile token
        let turnstileToken = null;
        if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
            turnstileToken = turnstile.getResponse(turnstileWidgetId);
        }

        try {
            // Verify Turnstile first
            if (turnstileToken) {
                await Auth.verifyTurnstile(turnstileToken);
            }

            // Attempt login
            const result = await Auth.login(username, password, rememberMe);

            if (result.requires2FA) {
                // Show 2FA modal
                loginData = { username, password, rememberMe };
                twoFAModal?.classList.remove('hidden');
                twoFAModal?.classList.add('show');
                codeInputs?.[0]?.focus();
            } else {
                // Login successful, redirect
                window.location.href = '/';
            }
        } catch (error) {
            showToast(error.message, 'error');
            // Reset Turnstile
            if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
        }
    });

    // Handle 2FA code input
    codeInputs?.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);

            digits.split('').forEach((digit, i) => {
                if (codeInputs[i]) {
                    codeInputs[i].value = digit;
                }
            });

            if (digits.length === 6) {
                verify2FAButton?.focus();
            }
        });
    });

    // Verify 2FA
    verify2FAButton?.addEventListener('click', async () => {
        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6) {
            showToast('请输入完整的6位验证码', 'error');
            return;
        }

        try {
            const result = await Auth.login(
                loginData.username,
                loginData.password,
                loginData.rememberMe,
                code
            );

            if (result.success) {
                window.location.href = '/';
            }
        } catch (error) {
            showToast(error.message, 'error');
            // Clear inputs
            codeInputs.forEach(input => input.value = '');
            codeInputs[0].focus();
        }
    });

    // Cancel 2FA
    cancel2FAButton?.addEventListener('click', () => {
        twoFAModal?.classList.add('hidden');
        twoFAModal?.classList.remove('show');
        codeInputs.forEach(input => input.value = '');
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;
            }
        });
    });

    // Toast notification function
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

    // Add slide animations
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
