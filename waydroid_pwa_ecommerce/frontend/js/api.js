const API_URL = 'http://localhost:3000/api';

class ApiService {
    static getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    static async get(endpoint) {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    static async post(endpoint, data) {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP error! status: ${res.status}`);
            return json;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
}
