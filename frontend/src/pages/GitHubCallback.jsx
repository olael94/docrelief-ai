import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exchangeOAuthCode } from '../services/api';

export default function GitHubCallback() {
    const [searchParams] = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(true);
    const hasProcessed = useRef(false); // Prevent double execution in React StrictMode

    useEffect(() => {
        const processCallback = async () => {
            // Prevent double execution
            if (hasProcessed.current) return;
            hasProcessed.current = true;

            // Check if user denied authorization (from GitHub)
            const error = searchParams.get('error');
            if (error) {
                const errorDescription = searchParams.get('error_description');
                toast.error(errorDescription || 'GitHub authorization failed');

                // Wait 2 seconds so user can see the error toast before redirecting
                setTimeout(() => {
                    window.location.href = '/?tab=private-repo';
                }, 2000);
                return;
            }

            // Get code and state from URL
            const code = searchParams.get('code');
            const state = searchParams.get('state');

            // Validate we have required params
            if (!code || !state) {
                toast.error('Missing authorization parameters. Please try connecting again.');
                window.location.href = '/?tab=private-repo';
                return;
            }

            try {
                // Call backend to exchange code for token (backend validates state)
                const data = await exchangeOAuthCode(code, state);

                // Store user data and JWT in localStorage
                localStorage.setItem('github_user', JSON.stringify(data.user));
                localStorage.setItem('github_token', data.token);

                // Clear sessionStorage state
                sessionStorage.removeItem('github_oauth_state');

                // Show success message
                toast.success(`Connected as @${data.user.github_username}`);

                // Navigate to private repo tab and reload to show connected state
                window.location.href = '/?tab=private-repo';
            } catch (error) {
                // Error message comes from backend (single source of truth)
                console.error('GitHub callback error:', error);
                toast.error(error.message);
                setIsProcessing(false);
            }
        };

        processCallback();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Connecting to GitHub...</p>
                    </>
                ) : (
                    <>
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
                        <p className="text-gray-600 mb-6">An error occurred during authentication.</p>
                        <button
                            onClick={() => window.location.href = '/?tab=private'}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Return to App
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}