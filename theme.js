// theme.js
function applyTheme() {
    const toggle = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');

    const setMode = (isLight) => {
        if (isLight) {
            document.documentElement.classList.add('light-mode');
            darkIcon?.classList.remove('hidden');
            lightIcon?.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('light-mode');
            darkIcon?.classList.add('hidden');
            lightIcon?.classList.remove('hidden');
        }
    };

    // 1. Check memory immediately on every page
    const savedMode = localStorage.getItem('theme-preference');
    if (savedMode === 'light') {
        setMode(true);
    }

    // 2. Only if the button exists (Index.html), set up the clicker
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isCurrentlyLight = document.documentElement.classList.contains('light-mode');
            const nextMode = !isCurrentlyLight;
            
            setMode(nextMode);
            // 3. Save to memory so Projects/Writings can see it
            localStorage.setItem('theme-preference', nextMode ? 'light' : 'original');
        });
    }
}

document.addEventListener('DOMContentLoaded', applyTheme);