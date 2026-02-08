import axios from 'axios';


// 1. Define the base URL from environment variable
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Health check
export const healthCheck = async () => {
    // Use the 'api' instance instead of 'axios'
    const response = await api.get('/health');
    return response.data;
};

// Generate README
export const generateReadme = async (githubUrl, sessionId = null) => {
    // Using 'api' automatically prepends the baseURL
    const response = await api.post('/api/readme/generate', {
        github_url: githubUrl,
        session_id: sessionId
    });
    return response.data;
};

// Get README details
export const getReadme = async (readmeId) => {
    const response = await api.get(`/api/readme/${readmeId}`);
    return response.data;
};

// Download README
export const downloadReadme = async (readmeId) => {
    const response = await api.get(`/api/readme/download/${readmeId}`, {
        responseType: 'blob'
    });
    return response.data;
};

// Poll for README completion
// Default: 60 attempts × 2 seconds = 120 seconds (2 minutes) timeout
export const pollReadmeStatus = async (readmeId, maxAttempts = 60, intervalMs = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const data = await getReadme(readmeId);

        if (data.status === 'completed') {
            return data;
        } else if (data.status === 'failed') {
            throw new Error(data.readme_content || 'README generation failed');
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error('README generation timed out');
};

// Upload ZIP file for README generation
export const uploadZipFile = async (file, sessionId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
        formData.append('session_id', sessionId);
    }

    const response = await api.post('/api/readme/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Update README was_downloaded flag
export const updateReadmeDownloaded = async (readmeId) => {
    try {
        const response = await api.patch(`/api/readme/${readmeId}`);
        return response.data;
    } catch (error) {
        // Silently fail - don't block user download
        console.error('Failed to update download tracking:', error);
        return null;
    }
};

// GitHub OAuth Functions
export const initiateGitHubOAuth = async () => {
    try {
        const response = await api.get('/api/auth/github/authorize');
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Failed to initiate GitHub OAuth';
        throw new Error(errorMessage);
    }
};

export const exchangeOAuthCode = async (code, state) => {
    try {
        const response = await api.post('/api/auth/github/exchange', {
            code,
            state
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Failed to complete GitHub authentication';
        throw new Error(errorMessage);
    }
};

export const getAuthStatus = async (token) => {
    try {
        const response = await api.get('/api/auth/github/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Failed to check authentication status';
        throw new Error(errorMessage);
    }
};

export const logoutGitHub = async (token) => {
    try {
        const response = await api.post('/api/auth/github/logout', {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        // Logout can fail silently - not critical
        console.error('Logout error:', error);
        return null;
    }
};

export default api;