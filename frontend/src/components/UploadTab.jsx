import HeroButton from "./HeroButton";

export default function UploadTab() {
    return (
        <>
            <div className="w-full flex flex-col items-center justify-center p-4">
                <div className="bg-gray-200 rounded-3xl">
                    <div className="p-6 flex flex-col items-center justify-center">
                        <p>+</p>
                        <p className="pb-2">Drag & drop files here or click to browse</p>
                        <p>Supported: .py .js . java .tsx .cpp .go .rs</p>
                        <p>Max: 50 files * 10MB total</p>
                    </div>
                </div>

                <h1 className="self-start pt-4 pb-4">Uploaded files (0)</h1>
                <ul>
                    <li>No files uploaded yet.</li>
                </ul>

                <HeroButton text="Generate README from Files →"/>

                {/* <input type="file" onChange={handleFileChange}></input> */}

            </div>
        </>
    );
}