const API_URL = '/api';

const ApiService = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('shopease_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('shopease_token');
                    localStorage.removeItem('shopease_user');
                    if (window.app) {
                        window.app.navigate('login');
                    }
                }
                throw new Error(data.error || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    },

    async requestMultipart(endpoint, formData) {
        const token = localStorage.getItem('shopease_token');
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                body: formData,
                headers
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Multipart upload failed');
            }

            return data;
        } catch (error) {
            console.error('API Multipart Error:', error.message);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};
