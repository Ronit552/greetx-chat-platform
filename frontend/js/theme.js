// Execute immediately to prevent flicker before page loads
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    // Setup initial icons based on head execution
    if (savedTheme === 'dark') {
        if(moonIcon) moonIcon.classList.add('hidden');
        if(sunIcon) sunIcon.classList.remove('hidden');
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme = 'light';
            
            if (currentTheme === 'light') {
                newTheme = 'dark';
                moonIcon.classList.add('hidden');
                sunIcon.classList.remove('hidden');
            } else {
                newTheme = 'light';
                moonIcon.classList.remove('hidden');
                sunIcon.classList.add('hidden');
            }
            
            // Set dynamic attributes
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});
