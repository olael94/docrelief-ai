import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;