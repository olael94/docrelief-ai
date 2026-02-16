import {useState, useEffect} from "react";
import {useSearchParams} from "react-router-dom";
import TabBar from "../components/TabBar";
import PublicRepoTab from "../components/PublicRepoTab";
import UploadTab from "../components/UploadTab";
import PrivateRepoTab from "../components/PrivateRepoTab";
import HowItWorks from "../components/HowItWorks";

export default function LandingPage() {
    const [searchParams, setSearchParams] = useSearchParams(); // For reading URL query parameters
    const [activeTab, setActiveTab] = useState('public-repo');

    const tabs = [
        {id: 'public-repo', label: 'Public Repo'},
        {id: 'upload-files', label: 'Upload Files'},
        {id: 'private-repo', label: 'Private Repo'},
    ];

    // Read tab from URL on mount and when URL changes
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && tabs.find(t => t.id === tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Update URL when tab changes
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({tab: newTab});
    };

    return (
        <>
            {/* Hero Section */}
            <div className="mt-20 mb-10 flex flex-col items-center justify-center px-4">
                <h1 className="font-urbanist text-5xl font-black text-green-500 text-center max-w-3xl">
                    Generate Professional README's with AI in Seconds
                </h1>
                <h2 className="mt-7 mb-7 font-fire-code text-2xl text-white text-center">
                    Stop writing READMEs from scratch. Let AI generate and commit directly to your GitHub.
                </h2>

                {/* How it Works Section */}
                <HowItWorks/>
                {/* Tabbed Interface Card */}
                <div
                    className="w-[400px] md:w-[921px] h-auto pt-16 md:px-5 rounded-4xl shadow-2xl flex flex-col items-center gap-8 py-8 bg-[#1C2B3A]/60 backdrop-blur-md border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                    <h1 className="font-urbanist text-4xl text-green-500 font-black">Generate README</h1>
                    <div className="w-[340px] md:w-[660px]">
                        <TabBar activeTab={activeTab} setActiveTab={handleTabChange} tabs={tabs}/>
                    </div>
                    <div className="min-h-100">
                        {activeTab === 'public-repo' && <PublicRepoTab/>}
                        {activeTab === 'upload-files' && <UploadTab/>}
                        {activeTab === 'private-repo' && <PrivateRepoTab/>}
                    </div>
                </div>
            </div>
        </>
    );
}
