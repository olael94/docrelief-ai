import {useState} from "react";
import Navbar from "../components/Navbar";
import TabBar from "../components/TabBar";
import PublicRepoTab from "../components/PublicRepoTab";
import UploadTab from "../components/UploadTab";
import PrivateRepoTab from "../components/PrivateRepoTab";
import HowItWorks from "../components/HowItWorks";

export default function LandingPage() {
    const [activeTab, setActiveTab] = useState('public-repo');

    const tabs = [
        {id: 'public-repo', label: 'Public Repo'},
        {id: 'upload-files', label: 'Upload Files'},
        {id: 'private-repo', label: 'Private Repo'},
    ];

    return (
        <>
            <Navbar/>

            {/* Hero Section */}
            <div className="mt-20 mb-10 flex flex-col items-center justify-center px-4">
                <h1 className="font-poppins text-5xl font-black text-center max-w-3xl">
                    Generate Professional READMEs with AI in Seconds
                </h1>
                <h2 className="mt-7 mb-7 font-fire-code text-2xl text-black text-center">
                    Stop writing READMEs from scratch. Let AI do it for you.
                </h2>

                {/* Tabbed Interface Card */}
                <div
                    className="w-[400px] md:w-[921px] h-auto md:h-[765px] pt-16 md:px-5 rounded-4xl shadow-2xl flex flex-col items-center justify-center bg-white gap-8 py-8">
                    <h1 className="font-poppins text-4xl font-bold">Generate README</h1>
                    <div className="w-[340px] md:w-[660px]">
                        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs}/>
                    </div>
                    <div className="min-h-100">
                        {activeTab === 'public-repo' && <PublicRepoTab/>}
                        {activeTab === 'upload-files' && <UploadTab/>}
                        {activeTab === 'private-repo' && <PrivateRepoTab/>}
                    </div>
                </div>

                {/* How it Works Section */}
                <HowItWorks/>
            </div>
        </>
    );
}
