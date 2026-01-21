import { useState } from "react"
import HeroButton from "./HeroButton"
import TabBar from "./TabBar"
import PublicRepoTab from "./PublicRepoTab";
import UploadTab from "./UploadTab";
import PrivateRepoTab from "./PrivateRepoTab";

export default function Hero() {
    const [activeTab, setActiveTab] = useState('public-repo');
    
    const tabs = [
        { id: 'public-repo', label: 'Public Repo' },
        { id: 'upload-files', label: 'Upload Files' },
        { id: 'private-repo', label: 'Private Repo' },
    ];
    
    return (
        <>
        <div className="mt-20 mb-10 flex flex-col items-center justify-center">
            <h1 className="font-poppins text-5xl font-black text-center max-w-3xl">
                    Generate Professional READMEs with AI in Seconds
                </h1>
                <h2 className="mt-7 mb-7 font-fire-code font-semi text-2xl text-black text-center">
                    Stop writing READMEs from scratch. Let AI do it for you.
                </h2>
            
            <div className="pl-5 pr-5 rounded-4xl h-150 w-200 shadow-2xl flex flex-col items-center justify-center bg-white gap-4">
                <h1 className="font-poppins text-4xl font-bold ">Generate README</h1>
                <TabBar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
                <div>
                    {activeTab === 'public-repo' && <PublicRepoTab />}
                    {activeTab === 'upload-files' && <UploadTab />}
                    {activeTab === 'private-repo' && <PrivateRepoTab />}
                </div>
            </div>    
        </div>
        </>
    )
}