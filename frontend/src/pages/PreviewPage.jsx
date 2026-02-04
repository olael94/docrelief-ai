import React, {useState} from 'react';
import {Download, RefreshCw, Github, CheckCircle} from 'lucide-react';
import {generateReadme, getReadme, pollReadmeStatus, updateReadmeDownloaded} from '../services/api';
import toast, {Toaster} from 'react-hot-toast';
import EditorPanel from '../components/EditorPanel.jsx';
import PreviewPanel from '../components/PreviewPanel.jsx';

// Main PreviewPage Component
const PreviewPage = () => {
    // Get readme_id from URL params (passed from Landing Page)
    const params = new URLSearchParams(window.location.search);
    // This will either be the readme ID or 'preview' for local editing
    const [readmeId, setReadmeId] = useState(
        params.get('id') || window.location.pathname.split('/').pop()
    );

    const [repoUrl, setRepoUrl] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Refs for editor and preview panels
    const editorRef = React.useRef(null);
    const previewRef = React.useRef(null);
    const isScrollingRef = React.useRef(false);


    React.useEffect(() => {
        const loadReadme = async () => {
            // If no ID is found, just show an empty editor instead of an error
            if (!readmeId || readmeId === 'preview') {
                setContent('# New README\n\nStart typing here to see the preview...');
                setRepoUrl('New Project');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const readmeData = await getReadme(readmeId);

                if (readmeData.status === 'completed') {
                    setContent(readmeData.readme_content || '');
                    setRepoUrl(readmeData.repo_url || '');
                    setShowSuccess(true);
                } else if (readmeData.status === 'pending' || readmeData.status === 'processing') {
                    const completedData = await pollReadmeStatus(readmeId);
                    setContent(completedData.readme_content || '');
                    setRepoUrl(completedData.repo_url || '');
                    setShowSuccess(true);
                }
            } catch (err) {
                // Even if the API fails, let the user keep the editor open
                console.error('Error loading README:', err);
                setError('Could not fetch from server, but you can still edit locally.');
                setIsLoading(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadReadme();
    }, [readmeId]);

    // Scroll sync functions
    const handleEditorMount = React.useCallback((editor) => {
        editorRef.current = editor;
    }, []);

    const handleEditorScroll = React.useCallback((e) => {
        if (isScrollingRef.current || !previewRef.current || !editorRef.current) return;

        isScrollingRef.current = true;

        try {
            const editor = editorRef.current;
            const preview = previewRef.current;

            const scrollTop = e.scrollTop;
            const scrollHeight = Math.max(1, e.scrollHeight - editor.getLayoutInfo().height);
            const scrollPercentage = Math.min(1, Math.max(0, scrollTop / scrollHeight));

            const previewScrollHeight = Math.max(1, preview.scrollHeight - preview.clientHeight);
            preview.scrollTop = scrollPercentage * previewScrollHeight;
        } catch (error) {
            console.error('Editor scroll sync error:', error);
        } finally {
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 50);
        }
    }, []);

    const handlePreviewScroll = React.useCallback(() => {
        if (isScrollingRef.current || !previewRef.current || !editorRef.current) return;

        isScrollingRef.current = true;

        try {
            const editor = editorRef.current;
            const preview = previewRef.current;

            const scrollTop = preview.scrollTop;
            const scrollHeight = Math.max(1, preview.scrollHeight - preview.clientHeight);
            const scrollPercentage = Math.min(1, Math.max(0, scrollTop / scrollHeight));

            const editorScrollHeight = Math.max(1, editor.getScrollHeight() - editor.getLayoutInfo().height);
            editor.setScrollTop(scrollPercentage * editorScrollHeight);
        } catch (error) {
            console.error('Preview scroll sync error:', error);
        } finally {
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 50);
        }
    }, []);

// Attach preview scroll listener
    React.useEffect(() => {
        const preview = previewRef.current;
        if (!preview) return;

        preview.addEventListener('scroll', handlePreviewScroll);
        return () => {
            preview.removeEventListener('scroll', handlePreviewScroll);
        };
    }, [handlePreviewScroll, content, isLoading]);


    // Show error page if there's an error and no content
    if (error && !content) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="mb-6">
                        <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">README Not Found</h1>
                    <p className="text-gray-600 mb-8">
                        The README you're looking for doesn't exist or has been removed.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                        Go Back Home
                    </button>
                </div>
            </div>
        );
    }

    const handleRegenerate = async () => {
        if (!repoUrl) {
            setError('Repository URL not available');
            return;
        }

        setShowSuccess(false);
        setIsRegenerating(true);

        try {
            console.log('Regenerating README for:', repoUrl);

            const {id: newReadmeId} = await generateReadme(repoUrl);
            console.log('New generation started:', newReadmeId);

            const readmeData = await pollReadmeStatus(newReadmeId);
            console.log('Regeneration completed!', readmeData);

            if (readmeData.readme_content) {
                setContent(readmeData.readme_content);
                setShowSuccess(true);
                // UPDATE: Set the new readme ID so downloads track the right record
                setReadmeId(newReadmeId);
            }

        } catch (err) {
            setError(err.message || 'Failed to regenerate README');
            console.error('Error regenerating:', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleDownload = async () => {
        try {
            console.log('=== DOWNLOAD DEBUG ===');
            console.log('Current readmeId:', readmeId);
            console.log('readmeId type:', typeof readmeId);

            // Extract repo name from URL for dynamic filename
            let filename = 'README.md'; // default

            if (repoUrl) {
                try {
                    // Extract repo name from GitHub URL
                    // Format: https://github.com/username/repo-name
                    const urlParts = repoUrl.split('/');
                    const repoName = urlParts[urlParts.length - 1]; // Get last part

                    if (repoName && repoName.trim() !== '') {
                        filename = `${repoName}-README.md`;
                    }
                } catch (error) {
                    console.error('Error extracting repo name:', error);
                    // Fall back to default filename
                }
            }

            const blob = new Blob([content], {type: 'text/markdown'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            // Show success toast
            toast.success('README download started!', {
                duration: 5000,
            });

            // Update database tracking (silent fail - don't block user)
            if (readmeId && readmeId !== 'preview') {
                console.log('Calling updateReadmeDownloaded with ID:', readmeId);
                const result = await updateReadmeDownloaded(readmeId);
                console.log('Update result:', result);
            } else {
                console.log('Skipping database update - readmeId:', readmeId);
            }
        } catch (error) {
            // Show error toast
            console.error('Download failed:', error);
            toast.error('Download failed. Please try again.', {
                duration: 5000,
            });
        }
    };

    const handleCommit = () => {
        alert('GitHub commit functionality will be implemented in a future version');
    };

    const handleChangeRepository = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen md:h-screen flex flex-col ">
            {/* Repository Info - Read Only */}
            <div className="flex items-center justify-center gap-3 mt-8 mb-6 px-6">
                <Github className="w-5 h-5 text-gray-700"/>
                <div className="flex-1 max-w-xl px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {repoUrl || 'Loading repository...'}
                </div>
                <button
                    onClick={handleChangeRepository}
                    className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                    Change Repository
                </button>
            </div>

            {/* Split Screen Editor - with independent scrolling */}
            <div className="flex-1 px-6 pb-6 overflow-hidden md:h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-full">
                    {/* Editor Panel - independently scrollable */}
                    <div
                        className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[600px] max-h-[600px] md:h-full">
                        <EditorPanel
                            content={content}
                            onChange={setContent}
                            disabled={isLoading || isRegenerating}
                            onEditorMount={handleEditorMount}
                            onScroll={handleEditorScroll}
                        />
                    </div>

                    {/* Preview Panel - independently scrollable */}
                    <div
                        className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[600px] max-h-[600px] md:h-full">
                        <PreviewPanel
                            content={content}
                            isLoading={isLoading || isRegenerating}
                            previewRef={previewRef}
                        />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-center pb-30">
                <div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Success Message */}
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-green-500">
                                <CheckCircle className="w-5 h-5"/>
                                <div className="text-sm font-medium leading-tight">
                                    README<br/>generated<br/>successfully
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {/* Regenerate Button*/}
                        <button
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`}/>
                            Regenerate
                        </button>

                        {/* Download Button*/}
                        <button
                            onClick={handleDownload}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                        >
                            <Download className="w-5 h-5"/>
                            Download
                        </button>

                        {/* Commit Button*/}
                        <button
                            onClick={handleCommit}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
                        >
                            <Github className="w-5 h-5"/>
                            Commit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewPage;