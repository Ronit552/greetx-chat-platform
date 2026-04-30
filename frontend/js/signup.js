document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const signupForm = document.getElementById('signup-form');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const otpGroup = document.getElementById('otp-group');
    const emailVerifiedBadge = document.getElementById('email-verified-badge');
    const otpError = document.getElementById('otp-error');
    const toggleTerms = document.getElementById('toggle-terms');
    const termsBox = document.getElementById('terms-box');
    
    // Inputs Step 1
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const otpInput = document.getElementById('otp');
    const termsInput = document.getElementById('terms');
    const btnSubmitStep1 = document.getElementById('btn-submit-step-1');
    
    // Inputs Step 2
    const usernameInput = document.getElementById('username');
    const dobInput = document.getElementById('dob');
    const genderInput = document.getElementById('gender');
    const btnCompleteProfile = document.getElementById('btn-complete-profile');

    // Layout
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');

    // Show Send OTP button only when email field has some input
    emailInput.addEventListener('input', () => {
        const hasText = emailInput.value.trim().length > 0;
        if (emailVerifiedBadge.classList.contains('hidden')) {
            if (hasText) {
                btnSendOtp.classList.remove('hidden');
            } else {
                btnSendOtp.classList.add('hidden');
            }
        }
    });

    // OTP Logic (Real API)
    btnSendOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if(!email) {
            alert('Please enter a valid email address first.');
            return;
        }
        btnSendOtp.textContent = 'Sending...';
        btnSendOtp.disabled = true;

        try {
            const res = await fetch('/api/send_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (res.ok) {
                btnSendOtp.textContent = 'Sent!';
                otpGroup.classList.remove('hidden');
            } else {
                alert('Failed to send OTP: ' + (data.error || 'Unknown error'));
                btnSendOtp.textContent = 'Send OTP';
                btnSendOtp.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert('Network error while sending OTP');
            btnSendOtp.textContent = 'Send OTP';
            btnSendOtp.disabled = false;
        }
    });

    btnVerifyOtp.addEventListener('click', async () => {
        const otp = otpInput.value.trim();
        const email = emailInput.value.trim();
        if (!otp) return;
        
        btnVerifyOtp.textContent = 'Verifying...';
        btnVerifyOtp.disabled = true;
        
        try {
            const res = await fetch('/api/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            
            if (res.ok) {
                otpGroup.classList.add('hidden');
                btnSendOtp.classList.add('hidden');
                otpError.classList.add('hidden');
                
                emailVerifiedBadge.classList.remove('hidden');
                emailInput.setAttribute('readonly', 'true');
                emailInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; 
                
                checkStep1Validity();
            } else {
                otpInput.classList.add('input-error');
                otpError.textContent = data.error || 'Invalid OTP';
                otpError.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            otpError.textContent = 'Network error during verification';
            otpError.classList.remove('hidden');
        } finally {
            btnVerifyOtp.textContent = 'Verify';
            btnVerifyOtp.disabled = false;
        }
    });

    // Password Strength Indicator
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = 0;
        
        if (val.length > 5) strength += 25;
        if (val.length > 8) strength += 25;
        if (/[A-Z]/.test(val)) strength += 25;
        if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) strength += 25;

        strengthBar.style.width = strength + '%';
        
        if (strength === 0) {
            strengthBar.style.backgroundColor = 'transparent';
            strengthText.textContent = '';
        } else if (strength <= 50) {
            strengthBar.style.backgroundColor = '#ef4444'; // Red
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#ef4444';
        } else if (strength <= 75) {
            strengthBar.style.backgroundColor = '#f59e0b'; // Amber
            strengthText.textContent = 'Good';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.style.backgroundColor = '#10b981'; // Green
            strengthText.textContent = 'Strong 🔥';
            strengthText.style.color = '#10b981';
        }
    });

    // Terms Toggle
    toggleTerms.addEventListener('click', (e) => {
        e.preventDefault();
        termsBox.classList.toggle('hidden');
    });

    // Validations
    function checkStep1Validity() {
        const isNameValid = nameInput.value.trim().length > 0;
        const isPasswordValid = passwordInput.value.trim().length > 0;
        const isTermsChecked = termsInput.checked;
        const isEmailVerified = !emailVerifiedBadge.classList.contains('hidden');

        if (isNameValid && isPasswordValid && isTermsChecked && isEmailVerified) {
            btnSubmitStep1.classList.remove('btn-locked');
        } else {
            btnSubmitStep1.classList.add('btn-locked');
        }
    }

    function checkStep2Validity() {
        const isUsernameValid = usernameInput.value.trim().length > 0;
        const isDobValid = dobInput.value !== '';
        const isGenderValid = genderInput.value !== '';

        if (isUsernameValid && isDobValid && isGenderValid) {
            btnCompleteProfile.classList.remove('btn-locked');
        } else {
            btnCompleteProfile.classList.add('btn-locked');
        }
    }

    // Clear individual error glows actively on input
    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('input-error'));
        el.addEventListener('change', () => el.classList.remove('input-error'));
    });

    // Attach listeners for Step 1
    [nameInput, passwordInput, termsInput].forEach(input => {
        input.addEventListener('input', checkStep1Validity);
        input.addEventListener('change', checkStep1Validity);
    });

    // Attach listeners for Step 2
    [usernameInput, dobInput, genderInput].forEach(input => {
        input.addEventListener('input', checkStep2Validity);
        input.addEventListener('change', checkStep2Validity);
    });

    // Transition Step 1 -> Step 2
    btnSubmitStep1.addEventListener('click', () => {
        // If locked, reject and shake!
        if (btnSubmitStep1.classList.contains('btn-locked')) {
            btnSubmitStep1.classList.add('shake-error');
            setTimeout(() => btnSubmitStep1.classList.remove('shake-error'), 400);

            // Light up empty fields red
            [nameInput, passwordInput].forEach(inp => {
                if (!inp.value.trim()) inp.classList.add('input-error');
            });
            if (emailVerifiedBadge.classList.contains('hidden')) {
                emailInput.classList.add('input-error');
            }
            if (!termsInput.checked) {
                const checkmark = document.querySelector('.checkmark');
                checkmark.style.borderColor = '#ef4444';
                setTimeout(() => checkmark.style.borderColor = '', 2000);
            }
            return;
        }

        // Beautiful Slide Animation transition
        step1.classList.add('slide-out-left');
        
        setTimeout(() => {
            step1.classList.add('hidden');
            step1.classList.remove('slide-out-left'); // cleanup
            
            step2.classList.remove('hidden');
            step2.classList.add('slide-in-right');
        }, 320); // wait for out-animation to nearly finish
    });

    // Final Form Submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // If locked, reject and shake!
        if (btnCompleteProfile.classList.contains('btn-locked')) {
            btnCompleteProfile.classList.add('shake-error');
            setTimeout(() => btnCompleteProfile.classList.remove('shake-error'), 400);

            // Light up empty fields red
            [usernameInput, dobInput, genderInput].forEach(inp => {
                if (!inp.value.trim()) inp.classList.add('input-error');
            });
            return;
        }

        const originalText = btnCompleteProfile.textContent;
        btnCompleteProfile.textContent = 'Creating Account...';
        btnCompleteProfile.disabled = true;

        const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            username: usernameInput.value.trim(),
            dob: dobInput.value,
            gender: genderInput.value
        };

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Profile Completed Successfully! Welcome to GreetX.');
                window.location.href = '/profile'; // Redirect to profile contextually
            } else {
                alert('Signup failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error during signup:', error);
            alert('An error occurred. Please try again later.');
        } finally {
            btnCompleteProfile.textContent = originalText;
            btnCompleteProfile.disabled = false;
        }
    });
});
