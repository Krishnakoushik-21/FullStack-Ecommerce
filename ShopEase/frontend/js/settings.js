// Settings Controller
window.initSettings = () => {
    const isDark = document.documentElement.classList.contains('dark-theme') || localStorage.getItem('shopease_dark_mode') === 'true';
    const switchEl = document.getElementById('dark-mode-toggle-switch');
    if (switchEl) {
        switchEl.checked = isDark;
    }
};

function toggleDarkModeSetting(isChecked) {
    if (isChecked) {
        document.documentElement.classList.add('dark-theme');
        localStorage.setItem('shopease_dark_mode', 'true');
    } else {
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('shopease_dark_mode', 'false');
    }
}
