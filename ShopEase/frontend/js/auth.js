const AuthService = {
    isAuthenticated() {
        return !!localStorage.getItem('shopease_token');
    },

    getToken() {
        return localStorage.getItem('shopease_token');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('shopease_user'));
        } catch (e) {
            return null;
        }
    },

    async login(email, password) {
        try {
            const data = await ApiService.post('/auth/login', { email, password });
            localStorage.setItem('shopease_token', data.token);
            localStorage.setItem('shopease_user', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            throw error;
        }
    },

    async googleLogin(token) {
        try {
            const data = await ApiService.post('/auth/google', { token });
            localStorage.setItem('shopease_token', data.token);
            localStorage.setItem('shopease_user', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            throw error;
        }
    },

    async register(formData) {
        try {
            const data = await ApiService.requestMultipart('/auth/register', formData);
            localStorage.setItem('shopease_token', data.token);
            localStorage.setItem('shopease_user', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('shopease_token');
        localStorage.removeItem('shopease_user');
        if (window.app) {
            window.app.navigate('login', 'fade');
        }
    }
};

// Initializer hooks called when templates are loaded into DOM
window.initLogin = () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('btn-login-submit');

        submitBtn.disabled = true;
        submitBtn.innerText = 'Signing In...';

        try {
            await AuthService.login(email, password);
            window.app.navigate('home');
        } catch (err) {
            alert(err.message || 'Login failed');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Login';
        }
    });

    // Initialize Google Login
    if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
            client_id: '216508243858-ebn4q5ee8i6p12bcn28l09nu5j92j5cu.apps.googleusercontent.com', // Replaced with actual Client ID in .env
            callback: handleGoogleCredentialResponse
        });
        const googleBtn = document.getElementById('google-signin-btn');
        if (googleBtn) {
            window.google.accounts.id.renderButton(
                googleBtn,
                { theme: "outline", size: "large", width: googleBtn.offsetWidth || 300, shape: "pill" }
            );
        }
    }
};

async function handleGoogleCredentialResponse(response) {
    if (response.credential) {
        try {
            await AuthService.googleLogin(response.credential);
            window.app.navigate('home');
        } catch (err) {
            alert(err.message || 'Google Login failed');
        }
    }
}


window.initRegister = () => {
    const regForm = document.getElementById('register-form');
    const avatarInput = document.getElementById('reg-avatar');
    const previewContainer = document.getElementById('avatar-preview-container');
    const previewImg = document.getElementById('avatar-img-preview');
    const placeholderIcon = document.getElementById('avatar-placeholder-icon');

    if (!regForm) return;

    // Trigger file chooser on avatar click
    previewContainer.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholderIcon.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const gender = document.getElementById('reg-gender').value;
        const dob = document.getElementById('reg-dob').value;
        const submitBtn = document.getElementById('btn-register-submit');

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating Account...';

        const formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('gender', gender);
        formData.append('dob', dob);
        
        if (avatarInput.files[0]) {
            formData.append('avatar', avatarInput.files[0]);
        }

        try {
            await AuthService.register(formData);
            window.app.navigate('home');
        } catch (err) {
            alert(err.message || 'Registration failed');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Register';
        }
    });
};
