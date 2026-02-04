import HeroButton from "./HeroButton";
import {FolderOpen} from "lucide-react";
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