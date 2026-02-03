import HeroButton from "./HeroButton";
import {FolderOpen} from "lucide-react";

export default function UploadTab() {
    return (
        <>
            <div className="w-[340px] md:w-[660px] flex flex-col items-center h-full min-h-[500px]">
                <div className="bg-gray-100 rounded-3xl w-full h-[200px]">
                    <div className="p-9 flex flex-col items-center w-full justify-center">
                        <FolderOpen className="text-gray-400 w-10 h-10"/>
                        <p className="pb-2 text-gray-400">Drag & drop your zip file here or click to browse</p>
                        <p className="text-gray-400">Supported: .zip files only</p>
                        <p className="text-gray-400">Max: 10MB</p>
                    </div>
                </div>

                <h1 className="self-start pt-4 pb-4 font-fire-code text-bold">Uploaded files (0)</h1>
                <ul>
                    <li className="self-start pt-4 pb-4 font-fire-code text-bold">No files uploaded yet.</li>
                </ul>
                <div className="mt-auto mb-9">
                    <HeroButton text="Generate README from Files →"/>
                </div>
                {/* <input type="file" onChange={handleFileChange}></input> */}

            </div>
        </>
    );
}