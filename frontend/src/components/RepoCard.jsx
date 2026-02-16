import { Star, Lock, Unlock, Code2 } from 'lucide-react';

/**
 * RepoCard Component
 * Displays a single repository with metadata (name, description, language, stars, privacy).
 * Shows selected state with green border and background.
 *
 * @param {Object} repo - Repository object from GitHub API
 * @param {boolean} selected - Whether this repo is currently selected
 * @param {Function} onClick - Handler function when card is clicked
 */
export default function RepoCard({ repo, selected, onClick }) {
    /**
     * Format the last updated date to be human-readable.
     * Example: "2026-02-09T22:48:28Z" -> "Feb 9, 2026"
     */
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    /**
     * Get color for language badge based on common languages.
     * Falls back to gray for unknown languages.
     */
    const getLanguageColor = (language) => {
        const colors = {
            'JavaScript': 'bg-yellow-500/20 text-yellow-300',
            'TypeScript': 'bg-blue-500/20 text-blue-300',
            'Python': 'bg-green-500/20 text-green-300',
            'Java': 'bg-red-500/20 text-red-300',
            'Go': 'bg-cyan-500/20 text-cyan-300',
            'Rust': 'bg-orange-500/20 text-orange-300',
            'C++': 'bg-pink-500/20 text-pink-300',
            'Ruby': 'bg-red-500/20 text-red-300',
            'PHP': 'bg-purple-500/20 text-purple-300',
            'Shell': 'bg-gray-500/20 text-gray-300',
        };
        return colors[language] || 'bg-gray-500/20 text-gray-300';
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selected
                    ? 'border-green-500/70 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                    : 'border-white/10 bg-white/5 hover:border-green-500/40 hover:bg-green-500/5'
            }`}
        >
            {/* Header: Name and Privacy Badge */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-100 text-lg">
                        {repo.name}
                    </h4>
                </div>

                {/* Private/Public Badge */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
                    repo.private
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/20 text-blue-300'
                }`}>
                    {repo.private ? (
                        <>
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                        </>
                    ) : (
                        <>
                            <Unlock className="w-3 h-3" />
                            <span>Public</span>
                        </>
                    )}
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {repo.description || 'No description available'}
            </p>

            {/* Metadata Row */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
                {repo.language && (
                    <div className="flex items-center space-x-1">
                        <Code2 className="w-4 h-4" />
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getLanguageColor(repo.language)}`}>
                        {repo.language}
                    </span>
                    </div>
                )}

                <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>{repo.stargazers_count}</span>
                </div>

                <div className="text-xs">
                    Updated {formatDate(repo.updated_at)}
                </div>
            </div>
        </div>
    );
}