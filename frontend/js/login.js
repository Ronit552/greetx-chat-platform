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
});
