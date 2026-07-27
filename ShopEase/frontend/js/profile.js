// Profile Controller
let userProfile = null;
let editProfileMode = false;
let selectedAvatarFile = null;

window.initProfile = async () => {
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        app.navigate('login');
        return;
    }

    try {
        userProfile = await ApiService.get('/profile');
        renderProfileInfo();
        cancelEditProfile(); // default back to display mode
    } catch (error) {
        console.error("Error loading profile details:", error);
    }
};

function renderProfileInfo() {
    if (!userProfile) return;

    // Display fields
    document.getElementById('profile-display-name').textContent = userProfile.name;
    document.getElementById('profile-display-email').textContent = userProfile.email;
    document.getElementById('profile-avatar').src = userProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500';

    document.getElementById('info-gender').textContent = userProfile.gender || 'Not Specified';
    document.getElementById('info-dob').textContent = userProfile.dob || 'Not Specified';

    // Populate edit fields
    document.getElementById('profile-edit-name').value = userProfile.name;
    document.getElementById('profile-edit-phone').value = userProfile.phone || '';
    document.getElementById('profile-edit-gender').value = userProfile.gender || '';
    document.getElementById('profile-edit-dob').value = userProfile.dob || '';
}

function toggleEditProfileMode() {
    editProfileMode = !editProfileMode;
    const links = document.getElementById('profile-links-wrapper');
    const form = document.getElementById('profile-form-wrapper');
    const cards = document.getElementById('profile-info-cards');
    const logoutBtn = document.getElementById('profile-logout-wrapper');
    const editToggleBtn = document.querySelector('#edit-profile-toggle-btn i');
    const cameraIcon = document.getElementById('avatar-edit-label');

    if (!links || !form || !cards || !logoutBtn) return;

    if (editProfileMode) {
        links.style.display = 'none';
        cards.style.display = 'none';
        logoutBtn.style.display = 'none';
        form.style.display = 'block';
        cameraIcon.style.display = 'flex';
        if (editToggleBtn) editToggleBtn.textContent = 'close';
    } else {
        links.style.display = 'flex';
        cards.style.display = 'grid';
        logoutBtn.style.display = 'block';
        form.style.display = 'none';
        cameraIcon.style.display = 'none';
        if (editToggleBtn) editToggleBtn.textContent = 'edit';
        renderProfileInfo(); // restore
    }
}

function cancelEditProfile() {
    editProfileMode = true;
    selectedAvatarFile = null;
    toggleEditProfileMode();
}

function previewProfileAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profile-avatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const token = localStorage.getItem('shopease_token');

    const formData = new FormData();
    formData.append('name', document.getElementById('profile-edit-name').value);
    formData.append('phone', document.getElementById('profile-edit-phone').value);
    formData.append('gender', document.getElementById('profile-edit-gender').value);
    formData.append('dob', document.getElementById('profile-edit-dob').value);

    if (selectedAvatarFile) {
        formData.append('avatar', selectedAvatarFile);
    }

    try {
        const response = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Update failed');

        userProfile = result.user;
        alert("Profile updated successfully!");
        cancelEditProfile();
    } catch (e) {
        alert(e.message);
    }
}

function logoutUser() {
    localStorage.removeItem('shopease_token');
    localStorage.removeItem('shopease_user');
    app.navigate('login');
}
