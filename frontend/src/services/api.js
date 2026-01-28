import axios from 'axios';

// 1. Define the base URL clearly
const API_BASE_URL = `http://${window.location.hostname}:8000`;

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
export const pollReadmeStatus = async (readmeId, maxAttempts = 15, intervalMs = 2000) => {
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

export default api;