// Register Page Logic
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const sendCodeButton = document.getElementById('send-code');
    const twoFALSetup = document.getElementById('2fa-setup');
    const verifySetupButton = document.getElementById('verify-setup');
    const copySecretButton = document.getElementById('copy-secret');
    const codeInputs = twoFALSetup?.querySelectorAll('.code-input');

    let registrationData = null;
    let countdown = 0;
    let countdownInterval = null;

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

    // Send email verification code
    sendCodeButton?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();

        if (!email || !isValidEmail(email)) {
            showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        if (countdown > 0) {
            showToast(`请等待 ${countdown} 秒后再试`, 'warning');
            return;
        }

        sendCodeButton.disabled = true;
        sendCodeButton.textContent = '发送中...';

        try {
            await Auth.sendEmailCode(email);
            showToast('验证码已发送，请查收邮件', 'success');

            // Start countdown
            countdown = 60;
            updateSendButton();
            countdownInterval = setInterval(() => {
                countdown--;
                updateSendButton();
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
        } catch (error) {
            showToast(error.message, 'error');
            sendCodeButton.disabled = false;
            sendCodeButton.textContent = '发送验证码';
        }
    });

    // Update send button state
    function updateSendButton() {
        if (countdown > 0) {
            sendCodeButton.disabled = true;
            sendCodeButton.textContent = `${countdown}秒后重试`;
        } else {
            sendCodeButton.disabled = false;
            sendCodeButton.textContent = '发送验证码';
        }
    }

    // Handle form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const emailCode = document.getElementById('email-code').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const agreeTerms = document.getElementById('agree-terms').checked;

        // Validation
        if (!isValidUsername(username)) {
            showToast('用户名格式不正确', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        if (!/^\d{6}$/.test(emailCode)) {
            showToast('请输入6位数字验证码', 'error');
            return;
        }

        if (!isValidPassword(password)) {
            showToast('密码至少8位，包含字母和数字', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('两次输入的密码不一致', 'error');
            return;
        }

        if (!agreeTerms) {
            showToast('请同意服务条款和隐私政策', 'error');
            return;
        }

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

            // Register
            registrationData = await Auth.register(username, email, password, emailCode, agreeTerms);

            if (registrationData.requires2FASetup) {
                // Show 2FA setup
                registerForm.classList.add('hidden');
                twoFALSetup.classList.remove('hidden');
                setup2FAQrCode(registrationData.secret);
            } else {
                showToast('注册成功，请登录', 'success');
                setTimeout(() => window.location.href = '/login.html', 1500);
            }
        } catch (error) {
            showToast(error.message, 'error');
            // Reset Turnstile
            if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
        }
    });

    // Setup 2FA QR code
    function setup2FAQrCode(secret) {
        const qrContainer = document.getElementById('qrcode');
        const secretElement = document.getElementById('secret-key');

        if (qrContainer && secret) {
            qrContainer.innerHTML = '';
            const otpauth = `otpauth://totp/EACPhoto:${registrationData.username}?secret=${secret}&issuer=EACPhoto`;
            new QRCode(qrContainer, {
                text: otpauth,
                width: 200,
                height: 200,
                colorDark: Theme.getTheme() === 'dark' ? '#ffffff' : '#000000',
                colorLight: Theme.getTheme() === 'dark' ? '#1e293b' : '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        if (secretElement && secret) {
            secretElement.textContent = secret;
        }
    }

    // Copy secret
    copySecretButton?.addEventListener('click', () => {
        const secret = document.getElementById('secret-key').textContent;
        navigator.clipboard.writeText(secret).then(() => {
            showToast('密钥已复制', 'success');
        }).catch(() => {
            showToast('复制失败', 'error');
        });
    });

    // Handle 2FA verification code input
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
                verifySetupButton?.focus();
            }
        });
    });

    // Verify and complete 2FA setup
    verifySetupButton?.addEventListener('click', async () => {
        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6) {
            showToast('请输入完整的6位验证码', 'error');
            return;
        }

        try {
            await Auth.enable2FA(code);
            showToast('注册成功，请登录', 'success');
            setTimeout(() => window.location.href = '/login.html', 1500);
        } catch (error) {
            showToast(error.message, 'error');
            codeInputs.forEach(input => input.value = '');
            codeInputs[0].focus();
        }
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

    // Validation helpers
    function isValidUsername(username) {
        return /^[a-zA-Z0-9_]{3,20}$/.test(username);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPassword(password) {
        return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
    }

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

    // Cleanup countdown on page unload
    window.addEventListener('beforeunload', () => {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    });
});
