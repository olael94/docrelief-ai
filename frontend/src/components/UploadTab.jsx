import HeroButton from "./HeroButton";
import {FolderOpen} from "lucide-react";
import {useState, useRef} from "react";
import {toast} from "react-hot-toast";
import {uploadZipFile} from "../services/api";
import {useNavigate} from "react-router-dom";

export default function UploadTab() {
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    //This converts file size from bytes to human-readable format (KB or MB)
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const validateFiles = (fileList) => {
        const maxTotalSizeMB = 10;
        const maxFiles = 1;

        if (fileList.length > maxFiles) {
            toast.error(`You can only upload ${maxFiles} file at a time.`);
            return false;
        }

        let totalSize = 0;
        for (let i = 0; i < fileList.length; i++) {
            totalSize += fileList[i].size;
        }

        const totalSizeMB = totalSize / (1024 * 1024);
        if (totalSizeMB > maxTotalSizeMB) {
            toast.error(`Total file size exceeds ${maxTotalSizeMB} MB.`);
            return false;
        }

        return true;
    };

    const handleFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles.length > 0 && validateFiles(selectedFiles)) {
            setFiles(Array.from(selectedFiles));
            toast.success('File selected');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;

        // Check if file is a zip
        if (droppedFiles.length > 0) {
            const file = droppedFiles[0];
            if (!file.name.endsWith('.zip')) {
                toast.error('Only .zip files are allowed');
                return;
            }

            if (validateFiles(droppedFiles)) {
                setFiles([file]);
                toast.success('File uploaded');
            }
        }
    };

    const handleBoxClick = () => {
        fileInputRef.current?.click();
    };

    const clearFile = () => {
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.success('File cleared');
    };

    const handleSubmit = async () => {
        if (files.length === 0) {
            toast.error('Please select a file first');
            return;
        }

        setIsSubmitting(true);

        try {
            const file = files[0];

            // Get session_id from localStorage (for session tracking)
            const sessionId = localStorage.getItem('session_id');

            // Upload the file with session_id
            const response = await uploadZipFile(file, sessionId);

            // Navigate to loading with the UUID
            navigate('/loading', {
                state: {readmeId: response.id}
            });

            toast.success('File uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload file';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="w-[340px] md:w-[660px] flex flex-col items-center h-full min-h-[500px]">
                {/* This connects all the drag-and-drop event handlers to the UI */}
                <div
                    className={`bg-[#1C2B3A]/60 backdrop-blur-md rounded-3xl w-full h-[200px] cursor-pointer transition-colors ${
                        isDragging ? 'border-2 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.25)]' : 'border-2 border-dashed border-green-500/40'
                    }`}
                    onClick={handleBoxClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="p-9 flex flex-col items-center w-full justify-center">
                        <FolderOpen className="text-green-400 w-10 h-10"/>
                        <p className="pb-2 text-gray-300">Drag & drop your zip file here or click to browse</p>
                        <p className="text-gray-400">Supported: .zip files only</p>
                        <p className="text-gray-400">Max: 10MB</p>
                    </div>
                </div>

                <h1 className="self-start pt-4 pb-4 font-fire-code text-bold text-green-200">
                    Uploaded files ({files.length})
                </h1>

                {files.length > 0 ? (
                    <div
                        className="w-full mt-4 p-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div>
                                <p className="font-semibold text-gray-800">{files[0].name}</p>
                                <p className="text-sm text-gray-500">{formatFileSize(files[0].size)}</p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove file"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                ) : (
                    <p className="self-start pt-4 pb-4 font-fire-code text-white">No files uploaded yet.</p>
                )}

                <div className="mt-auto mb-9">
                    <HeroButton
                        text={isSubmitting ? "Uploading..." : "Generate README from Files →"}
                        onClick={handleSubmit}
                        disabled={files.length === 0 || isSubmitting}
                    />
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                />

            </div>
        </>
    );
}