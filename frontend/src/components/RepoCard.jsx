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
            'JavaScript': 'bg-yellow-100 text-yellow-800',
            'TypeScript': 'bg-blue-100 text-blue-800',
            'Python': 'bg-green-100 text-green-800',
            'Java': 'bg-red-100 text-red-800',
            'Go': 'bg-cyan-100 text-cyan-800',
            'Rust': 'bg-orange-100 text-orange-800',
            'C++': 'bg-pink-100 text-pink-800',
            'Ruby': 'bg-red-100 text-red-800',
            'PHP': 'bg-purple-100 text-purple-800',
            'Shell': 'bg-gray-100 text-gray-800',
        };
        return colors[language] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selected
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            {/* Header: Name and Privacy Badge */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">
                        {repo.name}
                    </h4>
                </div>

                {/* Private/Public Badge */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
                    repo.private
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
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
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {repo.description || 'No description available'}
            </p>

            {/* Metadata Row: Language, Stars, Updated */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
                {/* Language */}
                {repo.language && (
                    <div className="flex items-center space-x-1">
                        <Code2 className="w-4 h-4" />
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getLanguageColor(repo.language)}`}>
                            {repo.language}
                        </span>
                    </div>
                )}

                {/* Stars */}
                <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>{repo.stargazers_count}</span>
                </div>

                {/* Last Updated */}
                <div className="text-xs">
                    Updated {formatDate(repo.updated_at)}
                </div>
            </div>
        </div>
    );
}