import {useState, useEffect} from 'react';
import toast from 'react-hot-toast';
import { initiateGitHubOAuth, logoutGitHub } from '../services/api';

export default function PrivateRepoTab() {
    const [githubUser, setGithubUser] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

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

    const handleConnectGitHub = async () => {
        setIsConnecting(true);
        try {
            // Get authorization URL and state from backend
            const {authorization_url, state} = await initiateGitHubOAuth();

            // Store state in sessionStorage for CSRF validation
            sessionStorage.setItem('github_oauth_state', state);

            // Redirect to GitHub
            window.location.href = authorization_url;
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
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"/>
                                </svg>
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

                {/* Repository selection UI will go here in Story 4 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">Repository selection coming in Story 4...</p>
                </div>
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
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor"
                                 viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"/>
                            </svg>
                            <p className="text-gray-700">Private repos require authentication to access code</p>
                        </div>
                        <div className="flex items-start space-x-3">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor"
                                 viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"/>
                            </svg>
                            <p className="text-gray-700">We need permission to read your repo structure and files</p>
                        </div>
                        <div className="flex items-start space-x-3">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor"
                                 viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"/>
                            </svg>
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