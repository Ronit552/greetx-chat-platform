document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnSubmit = document.getElementById('btn-submit-login');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const loginError = document.getElementById('login-error');

    // Toggle Password Visibility
    if (btnTogglePassword && passwordInput) {
        btnTogglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Switch SVG icon appropriately
            const eyeIconObj = btnTogglePassword.querySelector('.eye-icon');
            if (type === 'text') {
                eyeIconObj.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                eyeIconObj.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    }

    // Basic Validation Check
    function checkFormValidity() {
        if (emailInput.checkValidity() && passwordInput.value.length > 0) {
            btnSubmit.classList.remove('btn-locked');
        } else {
            btnSubmit.classList.add('btn-locked');
        }
    }

    emailInput.addEventListener('input', checkFormValidity);
    passwordInput.addEventListener('input', checkFormValidity);
    emailInput.addEventListener('change', checkFormValidity);
    passwordInput.addEventListener('change', checkFormValidity);
    
    // Toast Notification Function
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-popup toast-${type}`;
        toast.textContent = message;
        
        // Inline styles for glassmorphism popup
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '12px';
        toast.style.fontSize = '0.95rem';
        toast.style.fontWeight = '500';
        toast.style.color = '#ffffff';
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.WebkitBackdropFilter = 'blur(10px)';
        toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)';
        toast.style.zIndex = '9999';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        if (type === 'success') {
            toast.style.background = 'rgba(16, 185, 129, 0.8)'; // Emerald
            toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        } else {
            toast.style.background = 'rgba(239, 68, 68, 0.8)'; // Red
            toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        }

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 400);
        }, 3000);
    }

    // Real Submission handler to backend API
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (btnSubmit.classList.contains('btn-locked')) {
                // If the user hasn't filled anything
                if (!emailInput.value || !passwordInput.value) {
                    btnSubmit.classList.add('shake-error');
                    setTimeout(() => btnSubmit.classList.remove('shake-error'), 400);
                    return;
                }
                // If it's locked because fields were autofilled but input event didn't trigger, 
                // we should let it pass after syncing values.
            }
            
            btnSubmit.textContent = 'Authenticating...';
            btnSubmit.classList.add('btn-locked');
            btnSubmit.setAttribute('disabled', 'true');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passwordInput.value
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    btnSubmit.textContent = 'Success!';
                    loginError.classList.add('hidden');
                    emailInput.classList.remove('input-error');
                    passwordInput.classList.remove('input-error');
                    
                    showToast('Login successful! Welcome back.', 'success');
                    
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 1500); // Wait for toast to be visible before redirect
                } else {
                    const errorMsg = data.error || 'Invalid credentials';
                    showToast(errorMsg, 'error');
                    
                    loginError.textContent = errorMsg;
                    loginError.classList.remove('hidden');
                    loginError.classList.add('shake-error');
                    emailInput.classList.add('input-error');
                    passwordInput.classList.add('input-error');
                    
                    setTimeout(() => {
                        loginError.classList.remove('shake-error');
                    }, 500);
                    
                    btnSubmit.textContent = 'Log In';
                    btnSubmit.classList.remove('btn-locked');
                    btnSubmit.removeAttribute('disabled');
                }
            } catch (error) {
                console.error('Login error:', error);
                showToast('An error occurred. Please try again.', 'error');
                
                loginError.textContent = 'An error occurred. Please try again.';
                loginError.classList.remove('hidden');
                
                btnSubmit.textContent = 'Log In';
                btnSubmit.classList.remove('btn-locked');
                btnSubmit.removeAttribute('disabled');
            }
        });
    }

    // --- OTP Login Flow ---
    const loginStep = document.getElementById('login-step');
    const otpStep = document.getElementById('otp-step');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const otpInputGroup = document.getElementById('otp-input-group');
    const otpEmail = document.getElementById('otp-email');
    const otpCode = document.getElementById('otp-code');
    const otpError = document.getElementById('otp-error');

    if (forgotPasswordLink && otpStep && loginStep) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Sync email if typed
            if (emailInput.value) otpEmail.value = emailInput.value;

            loginStep.classList.remove('slide-in-right');
            loginStep.classList.add('slide-out-left');
            
            setTimeout(() => {
                loginStep.classList.add('hidden');
                otpStep.classList.remove('hidden');
                otpStep.classList.remove('slide-out-left');
                otpStep.classList.add('slide-in-right');
            }, 350);
        });
    }

    if (backToLoginLink && otpStep && loginStep) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();

            otpStep.classList.remove('slide-in-right');
            otpStep.classList.add('slide-out-left');
            
            setTimeout(() => {
                otpStep.classList.add('hidden');
                loginStep.classList.remove('hidden');
                loginStep.classList.remove('slide-out-left');
                loginStep.classList.add('slide-in-right');
            }, 350);
        });
    }

    if (btnSendOtp) {
        btnSendOtp.addEventListener('click', async () => {
            if (otpEmail.checkValidity() && otpEmail.value.length > 0) {
                btnSendOtp.textContent = 'Sending...';
                btnSendOtp.classList.add('btn-locked');
                
                try {
                    const res = await fetch('/api/send_otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: otpEmail.value.trim() })
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        btnSendOtp.classList.add('hidden');
                        otpInputGroup.classList.remove('hidden');
                        btnVerifyOtp.classList.remove('hidden');
                        otpEmail.setAttribute('readonly', 'true');
                        otpEmail.style.opacity = '0.7';
                        showToast('OTP sent to your email!', 'success');
                    } else {
                        showToast(data.error || 'Failed to send OTP', 'error');
                        btnSendOtp.textContent = 'Send OTP';
                        btnSendOtp.classList.remove('btn-locked');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Network error while sending OTP', 'error');
                    btnSendOtp.textContent = 'Send OTP';
                    btnSendOtp.classList.remove('btn-locked');
                }
            } else {
                otpEmail.classList.add('input-error');
                setTimeout(() => otpEmail.classList.remove('input-error'), 1000);
            }
        });
    }

    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', async () => {
            if (otpCode.value.length > 0) {
                btnVerifyOtp.textContent = 'Verifying...';
                btnVerifyOtp.classList.add('btn-locked');
                
                try {
                    const res = await fetch('/api/login_otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: otpEmail.value.trim(), otp_code: otpCode.value.trim() })
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        btnVerifyOtp.textContent = 'Success!';
                        otpError.classList.add('hidden');
                        otpCode.classList.remove('input-error');
                        showToast('Login successful!', 'success');
                        setTimeout(() => {
                            window.location.href = "/";
                        }, 1000);
                    } else {
                        btnVerifyOtp.textContent = 'Verify & Log In';
                        btnVerifyOtp.classList.remove('btn-locked');
                        otpError.textContent = data.error || 'Invalid OTP code';
                        otpError.classList.remove('hidden');
                        otpError.classList.add('shake-error');
                        otpCode.classList.add('input-error');
                        
                        setTimeout(() => {
                            otpError.classList.remove('shake-error');
                        }, 500);
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Network error during verification', 'error');
                    btnVerifyOtp.textContent = 'Verify & Log In';
                    btnVerifyOtp.classList.remove('btn-locked');
                }
            } else {
                otpCode.classList.add('input-error');
                setTimeout(() => otpCode.classList.remove('input-error'), 1000);
            }
        });
    }
});
