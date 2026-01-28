import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";
import {generateReadme} from "../services/api";
import HeroButton from "./HeroButton";

export default function PublicRepoTab() {
    const [repoUrl, setRepoUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    // Validate GitHub URL format (same regex as backend)
    const validateGitHubUrl = (url) => {
        if (!url.trim()) return false;

        // Remove trailing slash and .git if present
        const cleanUrl = url.trim().replace(/\/$/, '').replace(/\.git$/, '');

        // Pattern to match github.com/owner/repo or github.com:owner/repo
        const pattern = /github\.com[/:]([\w\.-]+)\/([\w\.-]+)/i;

        return pattern.test(cleanUrl);
    };

    const handleGenerate = async () => {
        // Validate URL format before API call
        if (!validateGitHubUrl(repoUrl)) {
            toast.error("Please enter a valid GitHub repository URL");
            return;
        }

        setIsSubmitting(true);

        try {
            // Call the API to generate README
            const response = await generateReadme(repoUrl);

            // Store session_token in localStorage
            if (response.session_token) {
                localStorage.setItem('session_token', response.session_token);
            }

            // Navigate to loading page with readme_id
            navigate('/loading', {state: {readmeId: response.id}});

        } catch (error) {
            setIsSubmitting(false);

            // Handle different error types
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.detail || "An error occurred";

                if (status === 403) {
                    // Private repository - redirect to OAuth page
                    navigate('/connect-github', {state: {githubUrl: repoUrl}});
                } else if (status === 400) {
                    // Invalid URL (shouldn't happen with frontend validation, but just in case)
                    toast.error("Please enter a valid GitHub repository URL");
                } else if (status === 404) {
                    // Repository not found OR private (GitHub returns 404 for both)
                    toast.error("Repository not found or is private. For private repos, use the 'Private Repo' tab.");
                } else {
                    // Other errors
                    toast.error(message);
                }
            } else {
                // Network or other errors
                toast.error("Failed to connect to server. Please try again.");
            }
        }
    };

    return (
        <div className="w-full flex flex-col items-center h-full min-h-[500px]">
            <h1 className="font-fire-code self-start pt-4 pb-4">Repository URL</h1>
            <input
                className="bg-navbar rounded-3xl py-3 px-8 w-[340px] md:w-[660px] text-left"
                type="text"
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleGenerate()}
                disabled={isSubmitting}
            />
            <div className="mt-6">
                <HeroButton
                    text={isSubmitting ? "Generating..." : "Generate README →"}
                    onClick={handleGenerate}
                />
            </div>
            <span className="mt-auto mb-4 text-bold">Use this tab for public Github Repositories</span>
        </div>
    );
}