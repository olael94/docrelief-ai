import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Github, Search, GitBranch } from 'lucide-react';
import { initiateGitHubOAuth, logoutGitHub, getUserRepositories, getRepositoryBranches, generateReadme } from '../services/api';
import RepoCard from './RepoCard';


export default function PrivateRepoTab() {
    const [githubUser, setGithubUser] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const navigate = useNavigate();

    // NEW: Repository selection state
    const [repositories, setRepositories] = useState([]); // Stores all fetched repos
    const [searchQuery, setSearchQuery] = useState(''); // Search filter text
    const [selectedRepo, setSelectedRepo] = useState(null); // Currently selected repository
    const [loading, setLoading] = useState(false); // Loading state for fetching repos

    // Branch info state (for default branch display and README warning)
    const [defaultBranch, setDefaultBranch] = useState(null); // Stores default branch info
    const [loadingBranch, setLoadingBranch] = useState(false); // Loading state for fetching branch info

    // Check for GitHub user on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('github_user');
        if (storedUser) {
            try {
                setGithubUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse GitHub user:', error);
                localStorage.removeItem('github_user');
            }
        }
    }, []);

    // Existing useEffect that checks for stored user
    useEffect(() => {
        const storedUser = localStorage.getItem('github_user');
        if (storedUser) {
            try {
                setGithubUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse GitHub user:', error);
                localStorage.removeItem('github_user');
            }
        }
    }, []);

    // NEW: Fetch repositories when user is authenticated
    useEffect(() => {
        // Only fetch if we have an authenticated GitHub user
        if (githubUser) {
            fetchRepositories();
        }
    }, [githubUser]); // Run whenever githubUser changes

    /**
     * Fetch all repositories for the authenticated user.
     * Called automatically when user connects to GitHub.
     */
    const fetchRepositories = async () => {
        setLoading(true); // Show loading spinner
        try {
            // Call the API function we created
            const data = await getUserRepositories();

            // Store repositories in state
            setRepositories(data.repositories);

            console.log(`Loaded ${data.total_count} repositories`);
        } catch (error) {
            // Show error toast (backend provides the message)
            toast.error(error.message);
            console.error('Failed to fetch repositories:', error);
        } finally {
            setLoading(false); // Hide loading spinner
        }
    };

    /**
     * Filter repositories based on search query.
     * Searches in both repository name and description.
     */
    const filteredRepos = repositories.filter(repo => {
        // If no search query, show all repos
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const name = repo.name.toLowerCase();
        const description = (repo.description || '').toLowerCase();

        // Match if query is found in name or description
        return name.includes(query) || description.includes(query);
    });

    /**
     * Handle repository selection.
     * Fetches default branch info to show branch name and README warning.
     */
    const handleRepoSelect = (repo) => {
        setSelectedRepo(repo);
        setDefaultBranch(null); // Clear previous branch info
        fetchDefaultBranch(repo);
    };

    /**
     * Fetch default branch info for the selected repository.
     * Used to display branch name and check if README already exists.
     */
    const fetchDefaultBranch = async (repo) => {
        setLoadingBranch(true);

        try {
            // Extract owner and repo name from full_name (e.g., "olael94/docrelief-ai")
            const [owner, repoName] = repo.full_name.split('/');

            // Call the API to get branches
            const data = await getRepositoryBranches(owner, repoName);

            // Find and store the default branch
            const defaultBranchInfo = data.branches.find(b => b.is_default);
            setDefaultBranch(defaultBranchInfo);

            console.log(`Default branch: ${defaultBranchInfo?.name}, Has README: ${defaultBranchInfo?.has_readme}`);
        } catch (error) {
            toast.error(error.message);
            console.error('Failed to fetch branch info:', error);
        } finally {
            setLoadingBranch(false);
        }
    };

    /**
     * Handle README generation for the selected repository.
     * Constructs the GitHub URL and initiates generation via API.
     */
    const handleGenerateReadme = async () => {
        // Validate that we have a repo selected
        if (!selectedRepo) {
            toast.error('Please select a repository');
            return;
        }

        try {
            // Show loading toast
            const loadingToast = toast.loading('Starting README generation...');

            // Use the base GitHub URL
            const githubUrl = selectedRepo.html_url;

            console.log('Generating README for:', githubUrl);

            // Get the session ID from localStorage (JWT token)
            const sessionId = localStorage.getItem('github_token');

            // Call the existing generateReadme API function
            const response = await generateReadme(githubUrl, sessionId);

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show success toast
            toast.success('README generation started!');

            // Navigate to the loading page with the readme_id
            navigate('/loading', {state: {readmeId: response.id}});

        } catch (error) {
            // Show error toast (API provides the message)
            toast.error(error.message || 'Failed to start README generation');
            console.error('Generation error:', error);
        }
    };

    const handleConnectGitHub = async () => {
        setIsConnecting(true);
        try {
            const apiResponse = await initiateGitHubOAuth();
            // Store state in sessionStorage for CSRF validation
            sessionStorage.setItem('github_oauth_state', apiResponse.state); //added apiResponse.state to backend response fix the undefined bug

            // Redirect to GitHub
            window.location.href = apiResponse.authorization_url;
        } catch (error) {
            // Error message from backend (single source of truth)
            console.error('Failed to initiate GitHub OAuth:', error); 
            toast.error(error.message);
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            // Get token before removing it
            const token = localStorage.getItem('github_token');

            // Call backend to clear session
            if (token) {
                await logoutGitHub(token);
            }

            // Clear local storage
            localStorage.removeItem('github_user');
            localStorage.removeItem('github_token');
            sessionStorage.removeItem('github_oauth_state');

            // Update UI state
            setGithubUser(null);

            // Show success message with instructions
            toast.success('Disconnected from DocRelief AI');

            // Show info about full revocation after a brief delay
            setTimeout(() => {
                toast('To fully revoke access, visit GitHub Settings → Applications → Authorized OAuth Apps', {
                    duration: 8000,
                    icon: 'ℹ️'
                });
            }, 1500);

        } catch (error) {
            console.error('Disconnect error:', error);
            // Still clear local data even if backend call fails
            localStorage.removeItem('github_user');
            localStorage.removeItem('github_token');
            sessionStorage.removeItem('github_oauth_state');
            setGithubUser(null);
            toast.success('Disconnected from DocRelief AI');
        }
    };

    // Connected state UI
    if (githubUser) {
        return (
            <div className="w-[340px] md:w-[660px] space-y-6">
                {/* Connected Banner */}
                <div className="bg-green-50 border border-green-200 rounded-4xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-900">GitHub Connected</p>
                                <p className="text-sm text-green-700">@{githubUser.github_username}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="text-sm text-gray-600 hover:text-gray-900 underline"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>

                {/* Repository Selection Container */}
                <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
                    {/* Header with search */}
                    <div className="bg-gray-50 border-b border-gray-200 p-4">
                        <h3 className="text-lg font-poppins font-bold text-gray-900 mb-3">
                            Repositories ({filteredRepos.length})
                        </h3>

                        {/* Search bar */}
                        <div className="relative">
                            {/* Search icon inside input */}
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Repository List */}
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {loading ? (
                            // Loading state
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                <p className="ml-3 text-gray-600">Loading repositories...</p>
                            </div>
                        ) : filteredRepos.length === 0 ? (
                            // Empty state
                            <div className="text-center py-12">
                                <p className="text-gray-600">
                                    {searchQuery ? 'No repositories match your search.' : 'No repositories found.'}
                                </p>
                            </div>
                        ) : (
                            // Repository cards using RepoCard component
                            filteredRepos.map(repo => (
                                <RepoCard
                                    key={repo.id}
                                    repo={repo}
                                    selected={selectedRepo?.id === repo.id}
                                    onClick={() => handleRepoSelect(repo)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Generate README Button - Shows when repo is selected */}
                {selectedRepo && (
                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                            <h3 className="text-lg font-poppins font-bold text-gray-900">
                                Generate README
                            </h3>
                            <p className="text-sm text-green-500 mt-1">
                                Repository: <span className="font-medium">{selectedRepo.name}</span>
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Default Branch Info */}
                            {loadingBranch ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                    <p className="ml-3 text-sm text-gray-600">Loading branch info...</p>
                                </div>
                            ) : defaultBranch && (
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <GitBranch className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900">
                                            Generating from branch: <span className="font-bold">{defaultBranch.name}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* README Warning - Shows when branch already has README.md */}
                            {defaultBranch?.has_readme && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-yellow-800">
                                                README.md already exists
                                            </h4>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                This branch already contains a README.md file. Generating a new README will overwrite the existing one.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <div className="flex flex-col items-center pt-2">
                                <button
                                    onClick={handleGenerateReadme}
                                    disabled={loadingBranch}
                                    className={`w-full max-w-[950px] py-3 px-4 rounded-4xl font-medium transition-all ${
                                        loadingBranch
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-[#5FDA8A] hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    {loadingBranch ? 'Loading...' : `Generate README for ${selectedRepo.name}`}
                                </button>

                                {/* Helper text */}
                                <p className="text-xs text-gray-500 text-center mt-2">
                                    This will analyze your repository and generate a professional README
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Unauthenticated UI
    return (
        <div className="w-[340px] md:w-[660px] flex flex-col items-center h-full min-h-[500px]">
            <div className="bg-white rounded-lg">
                <div className="max-w-md mx-auto text-center items-center space-y-6">
                    {/* GitHub Icon */}
                    <div className="flex justify-center mb-4">
                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                  clipRule="evenodd"/>
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-gray-900">
                        Access Private Repositories
                    </h2>

                    {/* Subtitle */}
                    <p className="text-gray-500">
                        Connect your GitHub account to generate READMEs for your private repositories
                    </p>

                    {/* Checkmark List */}
                    <div className="space-y-3 text-left">
                        <div className="flex items-start space-x-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">Private repos require authentication to access code</p>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">We need permission to read your repo structure and files</p>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">You can revoke access anytime from GitHub settings</p>
                        </div>
                    </div>

                    {/* Connect Button */}
                    <button
                        onClick={handleConnectGitHub}
                        disabled={isConnecting}
                        className="max-w-[310px] min h-[70px] mx-auto bg-black text-white px-6 py-3 rounded-3xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                  clipRule="evenodd"/>
                        </svg>
                        <span>{isConnecting ? 'Connecting...' : 'Connect GitHub Account'}</span>
                    </button>

                    {/* Security Footer */}
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Secure OAuth connection. Your credentials are never stored.<br/>
                        We only access repositories you explicitly grant permission to.
                    </p>
                </div>
            </div>
        </div>
    );
}