import { useState } from 'react';

export default function TabBar() {
    const [activeTab, setActiveTab] = useState('public-repo');
    const tabs = [
        { id: 'public-repo', label: 'Public Repo' },
        { id: 'upload-files', label: 'Upload Files' },
        { id: 'private-repo', label: 'Private Repo' },
    ];

    return (
        <div className="flex gap-2 bg-gray-50 p-1 rounded-3xl w-fit">
        {tabs.map((tab) => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-3xl font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                ? 'bg-navbar text-black shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            >
            {tab.label}
            </button>
        ))}
        </div>
  );
}