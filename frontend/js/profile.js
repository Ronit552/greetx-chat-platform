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

    // --- USERNAME VALIDATION REMOVED ---

    // --- FORM ACTIONS (MOCK) ---
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const name = document.getElementById('edit-name').value;
            const bio = document.getElementById('edit-bio').value;
            const username = document.getElementById('edit-username').value;
            
            const ogText = btnSaveProfile.textContent;
            btnSaveProfile.textContent = 'Saving...';
            btnSaveProfile.classList.add('loading');

            try {
                const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, bio, username })
                });
                const data = await res.json();
                
                if (res.ok) {
                    document.getElementById('display-name').textContent = name;
                    document.getElementById('display-bio').textContent = bio;
                    document.getElementById('display-username').textContent = '@' + username;
                    showToast('Profile updated successfully!', false);
                } else {
                    showToast(data.error || 'Failed to update profile', true);
                }
            } catch (err) {
                console.error(err);
                showToast('Network error during update', true);
            } finally {
                btnSaveProfile.textContent = ogText;
                btnSaveProfile.classList.remove('loading');
            }
        });
    }

    const btnUpdatePassword = document.getElementById('btn-update-password');
    if (btnUpdatePassword) {
        btnUpdatePassword.addEventListener('click', async () => {
            const current_password = document.getElementById('current-password').value;
            const new_password = document.getElementById('new-password').value;
            const confirm_password = document.getElementById('confirm-password').value;

            if(!current_password || !new_password || !confirm_password) {
                showToast('Please fill all password fields', true);
                return;
            }

            if(new_password !== confirm_password) {
                showToast('New passwords do not match', true);
                return;
            }

            const ogText = btnUpdatePassword.textContent;
            btnUpdatePassword.textContent = 'Updating...';
            btnUpdatePassword.classList.add('loading');
            
            try {
                const res = await fetch('/api/profile/password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password, new_password, confirm_password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                    showToast('Password updated securely!', false);
                } else {
                    showToast(data.error || 'Failed to update password', true);
                }
            } catch (err) {
                console.error(err);
                showToast('Network error during password update', true);
            } finally {
                btnUpdatePassword.textContent = ogText;
                btnUpdatePassword.classList.remove('loading');
            }
        });
    }

    const btnLogoutAll = document.getElementById('btn-logout-all');
    if (btnLogoutAll) {
        btnLogoutAll.addEventListener('click', async () => {
            if(confirm("Are you sure you want to log out completely?")) {
                showToast('Logging out...', false);
                try {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/login';
                } catch (err) {
                    showToast('Failed to logout cleanly', true);
                }
            }
        });
    }

    // --- PREFERENCES SETTINGS ---
    const themeToggle = document.getElementById('theme-toggle');
    const notifToggle = document.getElementById('notif-toggle');
    const privacyToggle = document.getElementById('privacy-toggle');

    // Initialize toggles from localStorage
    if (themeToggle) {
        themeToggle.checked = (localStorage.getItem('theme') || 'light') === 'dark';
        themeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Sync navbar icons
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            if (newTheme === 'dark') {
                if(moonIcon) moonIcon.classList.add('hidden');
                if(sunIcon) sunIcon.classList.remove('hidden');
            } else {
                if(moonIcon) moonIcon.classList.remove('hidden');
                if(sunIcon) sunIcon.classList.add('hidden');
            }
            showToast(`Theme changed to ${newTheme} mode`);
        });
    }

    if (notifToggle) {
        const notifPref = localStorage.getItem('pref_notif');
        notifToggle.checked = notifPref === null ? true : notifPref === 'true';
        
        notifToggle.addEventListener('change', (e) => {
            localStorage.setItem('pref_notif', e.target.checked);
            showToast(e.target.checked ? 'Push notifications enabled' : 'Push notifications disabled');
        });
    }

    if (privacyToggle) {
        const privPref = localStorage.getItem('pref_privacy');
        privacyToggle.checked = privPref === null ? true : privPref === 'true';
        
        privacyToggle.addEventListener('change', (e) => {
            localStorage.setItem('pref_privacy', e.target.checked);
            showToast(e.target.checked ? 'Activity status visible' : 'Activity status hidden');
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
