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
            btnSubmit.removeAttribute('disabled');
        } else {
            btnSubmit.classList.add('btn-locked');
            btnSubmit.setAttribute('disabled', 'true');
        }
    }

    emailInput.addEventListener('input', checkFormValidity);
    passwordInput.addEventListener('input', checkFormValidity);
    
    // Initial validation state
    checkFormValidity();

    // Specific Submission handler for demo mockup
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Artificial delay to simulate real network request
            btnSubmit.textContent = 'Authenticating...';
            btnSubmit.classList.add('btn-locked');
            
            setTimeout(() => {
                // If it's a demo, we can just say invalid if not a specific testing email or just pretend it's ok.
                if (emailInput.value !== 'test@greetx.com') {
                    loginError.classList.remove('hidden');
                    loginError.classList.add('shake-error');
                    emailInput.classList.add('input-error');
                    passwordInput.classList.add('input-error');
                    
                    // remove shake to allow it to be re-triggered
                    setTimeout(() => {
                        loginError.classList.remove('shake-error');
                    }, 500);
                    
                    btnSubmit.textContent = 'Log In';
                    btnSubmit.classList.remove('btn-locked');
                } else {
                    // Success logic
                    btnSubmit.textContent = 'Success!';
                    loginError.classList.add('hidden');
                    emailInput.classList.remove('input-error');
                    passwordInput.classList.remove('input-error');
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 800);
                }
            }, 1000);
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
        btnSendOtp.addEventListener('click', () => {
            if (otpEmail.checkValidity() && otpEmail.value.length > 0) {
                btnSendOtp.textContent = 'Sending...';
                btnSendOtp.classList.add('btn-locked');
                
                setTimeout(() => {
                    btnSendOtp.classList.add('hidden');
                    otpInputGroup.classList.remove('hidden');
                    btnVerifyOtp.classList.remove('hidden');
                    otpEmail.setAttribute('readonly', 'true');
                    otpEmail.style.opacity = '0.7';
                }, 800);
            } else {
                otpEmail.classList.add('input-error');
                setTimeout(() => otpEmail.classList.remove('input-error'), 1000);
            }
        });
    }

    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', () => {
            if (otpCode.value.length > 0) {
                btnVerifyOtp.textContent = 'Verifying...';
                btnVerifyOtp.classList.add('btn-locked');
                
                setTimeout(() => {
                    // Mock OTP success on '123456' else fail
                    if (otpCode.value === '123456') {
                        btnVerifyOtp.textContent = 'Success!';
                        otpError.classList.add('hidden');
                        otpCode.classList.remove('input-error');
                        setTimeout(() => {
                            window.location.href = "/";
                        }, 800);
                    } else {
                        btnVerifyOtp.textContent = 'Verify & Log In';
                        btnVerifyOtp.classList.remove('btn-locked');
                        otpError.classList.remove('hidden');
                        otpError.classList.add('shake-error');
                        otpCode.classList.add('input-error');
                        
                        setTimeout(() => {
                            otpError.classList.remove('shake-error');
                        }, 500);
                    }
                }, 1000);
            } else {
                otpCode.classList.add('input-error');
                setTimeout(() => otpCode.classList.remove('input-error'), 1000);
            }
        });
    }
});
