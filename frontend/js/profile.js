document.addEventListener('DOMContentLoaded', () => {

    // --- TAB NAVIGATION ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    function switchTab(targetId) {
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        tabContents.forEach(content => {
            if (content.id === targetId) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-target'));
        });
    });

    // Quick Edit Button
    const btnQuickEdit = document.getElementById('btn-quick-edit');
    if (btnQuickEdit) {
        btnQuickEdit.addEventListener('click', () => {
            switchTab('tab-edit');
            // Scroll to form smoothly
            document.querySelector('.right-column').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- IMAGE UPLOAD PREVIEW ---
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreviewImg = document.getElementById('form-avatar-preview');
    const avatarInitials = document.getElementById('form-preview-initials');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

    if (avatarUpload) {
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Size Validation (2MB)
                if (file.size > 2 * 1024 * 1024) {
                    showToast('File must be smaller than 2MB', true);
                    return;
                }

                // Type validation
                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                    showToast('Only JPG/PNG images are allowed', true);
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreviewImg.src = e.target.result;
                    avatarPreviewImg.classList.remove('hidden');
                    if(avatarInitials) avatarInitials.classList.add('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveAvatar) {
        btnRemoveAvatar.addEventListener('click', () => {
            avatarUpload.value = '';
            avatarPreviewImg.src = '';
            avatarPreviewImg.classList.add('hidden');
            if(avatarInitials) avatarInitials.classList.remove('hidden');
        });
    }

    // --- BIO CHARACTER COUNTER ---
    const bioInput = document.getElementById('edit-bio');
    const bioCounter = document.getElementById('bio-counter');

    if (bioInput && bioCounter) {
        const limit = parseInt(bioInput.getAttribute('maxlength') || 150);

        bioInput.addEventListener('input', () => {
            const current = bioInput.value.length;
            bioCounter.textContent = `${current}/${limit}`;

            // Reset classes
            bioCounter.classList.remove('warning', 'error');

            if (current >= limit) {
                bioCounter.classList.add('error');
            } else if (current >= limit - 20) {
                bioCounter.classList.add('warning');
            }
        });
        
        // Init trigger
        bioInput.dispatchEvent(new Event('input'));
    }

    // --- USERNAME AVAILABILITY DEBOUNCE (MOCK API) ---
    const usernameInput = document.getElementById('edit-username');
    const usernameStatus = document.getElementById('username-status');
    const usernameLoader = document.getElementById('username-loader');
    let debounceTimer;

    const takenUsernames = ['admin', 'johndoe', 'greetx', 'test'];

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const val = usernameInput.value.trim().toLowerCase();
            
            // Hide previous badges and show loader
            usernameStatus.classList.add('hidden');
            usernameStatus.classList.remove('available', 'taken');
            
            if (val.length < 3) {
                usernameLoader.classList.add('hidden');
                usernameStatus.textContent = 'Too short';
                usernameStatus.classList.add('taken', 'hidden'); 
                return;
            }

            usernameLoader.classList.remove('hidden');

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Mock API Delay over
                usernameLoader.classList.add('hidden');
                usernameStatus.classList.remove('hidden');

                if (takenUsernames.includes(val)) {
                    if (val === 'johndoe') {
                        // Current user
                        usernameStatus.textContent = 'Current';
                        usernameStatus.classList.add('available');
                    } else {
                        usernameStatus.textContent = 'Taken';
                        usernameStatus.classList.add('taken');
                    }
                } else {
                    usernameStatus.textContent = 'Available';
                    usernameStatus.classList.add('available');
                }
            }, 600); // 600ms debounce
        });
    }

    // --- FORM ACTIONS (MOCK) ---
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            const ogText = btnSaveProfile.textContent;
            btnSaveProfile.textContent = 'Saving...';
            btnSaveProfile.classList.add('loading');

            setTimeout(() => {
                btnSaveProfile.textContent = ogText;
                btnSaveProfile.classList.remove('loading');
                
                // Mock updating the Display Name & Bio in the header
                document.getElementById('display-name').textContent = document.getElementById('edit-name').value;
                document.getElementById('display-bio').textContent = document.getElementById('edit-bio').value;

                // Sync Username if valid
                if (usernameStatus.classList.contains('available') && usernameInput.value.trim() !== '') {
                    document.getElementById('display-username').textContent = '@' + usernameInput.value.trim();
                }

                showToast('Profile updated successfully!', false);
            }, 1000);
        });
    }

    const btnUpdatePassword = document.getElementById('btn-update-password');
    if (btnUpdatePassword) {
        btnUpdatePassword.addEventListener('click', () => {
            const current = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if(!current || !newPass || !confirmPass) {
                showToast('Please fill all password fields', true);
                return;
            }

            if(newPass !== confirmPass) {
                showToast('New passwords do not match', true);
                return;
            }

            const ogText = btnUpdatePassword.textContent;
            btnUpdatePassword.textContent = 'Updating...';
            btnUpdatePassword.classList.add('loading');
            
            setTimeout(() => {
                btnUpdatePassword.textContent = ogText;
                btnUpdatePassword.classList.remove('loading');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                showToast('Password updated securely!', false);
            }, 1200);
        });
    }

    const btnLogoutAll = document.getElementById('btn-logout-all');
    if (btnLogoutAll) {
        btnLogoutAll.addEventListener('click', () => {
            if(confirm("Are you sure you want to log out from all other devices?")) {
                showToast('Logging out of active sessions...', false);
                setTimeout(() => { showToast('Sessions terminated.', false); }, 1500);
            }
        });
    }

    // --- TOAST SYSTEM ---
    const toast = document.getElementById('toast-notification');
    let toastTimeout;

    function showToast(message, isError = false) {
        if (!toast) return;

        const icon = toast.querySelector('.toast-icon');
        const text = toast.querySelector('.toast-message');

        text.textContent = message;
        
        if (isError) {
            icon.textContent = '⚠️';
            toast.style.background = '#991b1b'; // Red
            toast.style.border = '1px solid #fca5a5';
        } else {
            icon.textContent = '✅';
            toast.style.background = '#1e293b'; // Dark blue/gray
            toast.style.border = 'none';
        }

        toast.classList.remove('hidden');

        // Reset animation logic
        toast.style.animation = 'none';
        toast.offsetHeight; /* trigger reflow */
        toast.style.animation = null; 

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    }
});
