import axios from 'axios';


/* Base URL is intentionally empty in production and Docker.
 * API calls use relative paths (/api/...) which are proxied by nginx (prod/Docker)
 * or Vite's dev server proxy (local development).
*/
// 1. Define the base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout to prevent infinite hangs
});

// Health check
export const healthCheck = async () => {
    // Use the 'api' instance instead of 'axios'
    const response = await api.get('/api/health');
    return response.data;
};

// Generate README
export const generateReadme = async (githubUrl, sessionId = null) => {
    // Build request config
    const config = sessionId ? {
        headers: {
            'Authorization': `Bearer ${sessionId}`
        }
    } : {};

    const response = await api.post('/api/readme/generate', 
        { github_url: githubUrl },
        config
    );
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

export const commitReadme = async (userId, readmeId, commitMessage, extendedDescription = null) => {
    try {
        const response = await api.post('/api/readme/commit', {
            user_id: userId,
            readme_id: readmeId,
            commit_message: commitMessage,
            extended_description: extendedDescription
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Failed to commit README to GitHub';
        throw new Error(errorMessage);
    }
};
// ============================================
// GitHub Repository & Branch Functions
// ============================================

/**
 * Fetch all repositories the authenticated user has access to.
 * Calls GET /api/github/repos with the user's JWT token.
 *
 * @returns {Promise} Object with total_count and repositories array
 * @throws {Error} If token is invalid/expired or request fails
 */
export const getUserRepositories = async () => {
    try {
        // Get the JWT token from localStorage (set during OAuth)
        const token = localStorage.getItem('github_token');

        if (!token) {
            throw new Error('No GitHub token found. Please connect your GitHub account.');
        }

        // Call backend with Authorization header
        const response = await api.get('/api/github/repos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Returns { total_count: number, repositories: [...] }
        return response.data;
    } catch (error) {
        // Extract error message from backend response
        const errorMessage = error.response?.data?.detail || 'Failed to fetch repositories';
        throw new Error(errorMessage);
    }
};

/**
 * Fetch branches for a specific repository.
 * Used to get default branch info and check if README exists.
 * Calls GET /api/github/repos/{owner}/{repo}/branches with the user's JWT token.
 *
 * @param {string} owner - Repository owner (e.g., "olael94")
 * @param {string} repo - Repository name (e.g., "docrelief-ai")
 * @returns {Promise} Object with branches array and default_branch name
 * @throws {Error} If token is invalid, repo not found, or request fails
 */
export const getRepositoryBranches = async (owner, repo) => {
    try {
        // Get the JWT token from localStorage
        const token = localStorage.getItem('github_token');

        if (!token) {
            throw new Error('No GitHub token found. Please connect your GitHub account.');
        }

        // Call backend with Authorization header
        const response = await api.get(`/api/github/repos/${owner}/${repo}/branches`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Returns { branches: [...], default_branch: "main" }
        return response.data;
    } catch (error) {
        // Extract error message from backend response
        const errorMessage = error.response?.data?.detail || 'Failed to fetch branches';
        throw new Error(errorMessage);
    }
};

export default api;