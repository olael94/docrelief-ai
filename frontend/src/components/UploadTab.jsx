import HeroButton from "./HeroButton";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { uploadZipFile } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function UploadTab() {
const [files, setFiles] = useState([]);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isDragging, setIsDragging] = useState(false);
const fileInputRef = useRef(null);
const navigate = useNavigate();

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

        // Upload the file
        const response = await uploadZipFile(file);

        // Navigate to preview page with the UUID
        navigate(`/preview/${response.id}`);

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
            <div className="w-full flex flex-col items-center justify-center p-4">
                <div
                    className={`bg-gray-200 rounded-3xl transition-colors ${isDragging ? 'bg-gray-300 border-2 border-blue-500' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleBoxClick}
                >
                    <div className="p-6 flex flex-col items-center justify-center cursor-pointer">
                        <p className="text-4xl">{isDragging ? '↓' : '+'}</p>
                        <p className="pb-2">Drag & drop a file here or click to browse</p>
                        <p>Supported: .zip (one file only)</p>
                        <p>Max: 10MB</p>
                        <input
                            ref={fileInputRef}
                            className="hidden"
                            type="file"
                            accept=".zip"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                <h1 className="self-start pt-4 pb-4">Uploaded file</h1>
                <div className="w-full">
                    {files.length === 0 ? (
                        <p>No file uploaded yet.</p>
                    ) : (
                        <div className="flex items-center gap-2 mb-2">
                            <p>
                                {files[0].name} ({(files[0].size / 1024).toFixed(2)} KB)
                            </p>
                            <button
                                onClick={clearFile}
                                className="text-red-500 hover:text-red-700 font-bold text-xl"
                                title="Clear file"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                <HeroButton
                    text={isSubmitting ? "Uploading..." : "Generate README from Files →"}
                    onClick={handleSubmit}
                    disabled={files.length === 0 || isSubmitting}
                />
            </div>
        </>
    );
}