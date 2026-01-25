import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Health check
export const healthCheck = async () => {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.data;
};

// Generate README (returns UUID and status)
export const generateReadme = async (githubUrl, sessionId = null) => {
    const response = await axios.post(`${API_BASE_URL}/readme/generate`, {
        github_url: githubUrl,
        session_id: sessionId
    });
    return response.data; // { id: uuid, status: "pending" }
};

// Get README details (for preview - returns JSON)
export const getReadme = async (readmeId) => {
    const response = await axios.get(`${API_BASE_URL}/readme/${readmeId}`);
    return response.data; // { id, status, readme_content, repo_name, ... }
};

// Download README (returns file)
export const downloadReadme = async (readmeId) => {
    const response = await axios.get(`${API_BASE_URL}/readme/download/${readmeId}`, {
        responseType: 'blob'
    });
    return response.data;
};

// Poll for README completion
export const pollReadmeStatus = async (readmeId, maxAttempts = 30, intervalMs = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const data = await getReadme(readmeId);

        if (data.status === 'completed') {
            return data; // Success!
        } else if (data.status === 'failed') {
            throw new Error(data.readme_content || 'README generation failed');
        }

        // Still pending/processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('README generation timed out');
};