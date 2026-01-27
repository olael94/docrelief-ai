import React, { useState } from 'react';
import { Download, RefreshCw, Github, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateReadme, getReadme, pollReadmeStatus, updateReadmeDownloaded } from '../services/api';
import Editor from '@monaco-editor/react';
import toast, { Toaster } from 'react-hot-toast';

// EditorPanel Component with Line Numbers
// EditorPanel Component with Monaco Editor
const EditorPanel = ({ content, onChange, disabled = false, onEditorMount, onScroll }) => {
  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  return (
      <div className="h-full flex flex-col">
        <div className="bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Editor</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={handleEditorChange}
              onMount={(editor) => {
                if (onEditorMount) onEditorMount(editor);
                if (onScroll) {
                  editor.onDidScrollChange(onScroll);
                }
              }}
              theme="vs-dark"
              options={{
                readOnly: disabled,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
                lineHeight: 24,
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  verticalSliderSize: 10,
                  horizontalSliderSize: 10,
                },
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-500">Loading editor...</p>
                  </div>
                </div>
              }
          />
        </div>
      </div>
  );
};

// PreviewPanel Component
const PreviewPanel = ({ content, isLoading = false, previewRef }) => {
  const components = {
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        return (
          <div className="relative my-4">
            <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-white rounded z-10">
              {language}
            </div>
            <pre className="overflow-x-auto bg-gray-900 rounded-lg p-4" style={{ backgroundColor: '#161b22' }}>
              <code className="font-mono text-sm" style={{ color: '#c9d1d9' }} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }
      
      if (!inline) {
        return (
          <pre className="overflow-x-auto bg-gray-900 rounded-lg p-4 my-4" style={{ backgroundColor: '#161b22' }}>
            <code className="font-mono text-sm" style={{ color: '#c9d1d9' }} {...props}>
              {children}
            </code>
          </pre>
        );
      }
      
      return (
        <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ backgroundColor: '#f3f4f6', color: '#dc2626' }} {...props}>
          {children}
        </code>
      );
    },
    
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    
    thead: ({ children }) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    
    th: ({ children }) => (
      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
        {children}
      </th>
    ),
    
    td: ({ children }) => (
      <td className="border border-gray-300 px-4 py-2 text-gray-700">
        {children}
      </td>
    ),
    
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200">
        {children}
      </h1>
    ),
    
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
        {children}
      </h2>
    ),
    
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
        {children}
      </h3>
    ),
    
    p: ({ children }) => (
      <p className="text-gray-700 my-3 leading-relaxed">
        {children}
      </p>
    ),
    
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-3 space-y-1 text-gray-700">
        {children}
      </ul>
    ),
    
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-3 space-y-1 text-gray-700">
        {children}
      </ol>
    ),
    
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600">
        {children}
      </blockquote>
    ),
    
    a: ({ href, children }) => (
      <a 
        href={href} 
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Preview</h2>
      </div>
      <div ref={previewRef} className="flex-1 overflow-y-auto bg-white px-6 py-4 preview-panel-scroll">
        <div className="max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {content || '# Your README will appear here\n\nStart typing in the editor to see the live preview...'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

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

  // Load README on component mount
  // React.useEffect(() => {
  //   const loadReadme = async () => {
  //     if (!readmeId || readmeId === 'preview') {
  //       setError('No README ID provided');
  //       setIsLoading(false);
  //       return;
  //     }

  //     try {
  //       setIsLoading(true);
  //       console.log('Loading README with ID:', readmeId);

  //       const readmeData = await getReadme(readmeId);
  //       console.log('README loaded:', readmeData);

  //       if (readmeData.status === 'completed') {
  //         setContent(readmeData.readme_content || '');
  //         setRepoUrl(readmeData.repo_url || '');
  //         setShowSuccess(true);
  //       } else if (readmeData.status === 'pending' || readmeData.status === 'processing') {
  //         console.log('README still processing, polling...');
  //         const completedData = await pollReadmeStatus(readmeId);
  //         setContent(completedData.readme_content || '');
  //         setRepoUrl(completedData.repo_url || '');
  //         setShowSuccess(true);
  //       } else if (readmeData.status === 'failed') {
  //         throw new Error(readmeData.readme_content || 'README generation failed');
  //       }

  //     } catch (err) {
  //       setError(err.message || 'Failed to load README');
  //       console.error('Error loading README:', err);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   loadReadme();
  // }, [readmeId]);

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
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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

      const { id: newReadmeId } = await generateReadme(repoUrl);
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

      const blob = new Blob([content], { type: 'text/markdown' });
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
      <div className="min-h-screen md:h-screen flex flex-col bg-gray-50">
      {/* Toast Container */}
      <Toaster position="top-right" />
      {/* Header */}
      <header className="bg-gray-200 rounded-full mx-6 mt-6 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">[Logo] DocRelief AI</div>
          <nav className="flex gap-8 items-center text-gray-900">
            <a href="#" className="hover:text-gray-600 transition-colors">Features</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Pricing</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Login/Username</a>
          </nav>
        </div>
      </header>

      {/* Repository Info - Read Only */}
      <div className="flex items-center justify-center gap-3 mt-8 mb-6 px-6">
        <Github className="w-5 h-5 text-gray-700" />
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
          <div className="bg-white rounded-3xl shadow-sm md:overflow-hidden flex flex-col min-h-[400px] max-h-[600px] md:h-full">
            <EditorPanel
                content={content}
                onChange={setContent}
                disabled={isLoading || isRegenerating}
                onEditorMount={handleEditorMount}
                onScroll={handleEditorScroll}
            />
          </div>

          {/* Preview Panel - independently scrollable */}
          <div className="bg-white rounded-3xl shadow-sm md:overflow-hidden flex flex-col min-h-[400px] max-h-[600px] md:h-full">
            <PreviewPanel
                content={content}
                isLoading={isLoading || isRegenerating}
                previewRef={previewRef}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-center pb-8">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Success Message */}
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <div className="text-sm font-medium leading-tight">
                  README<br />generated<br />successfully
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
              <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>

            {/* Download Button*/}
            <button
              onClick={handleDownload}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>

            {/* Commit Button*/}
            <button
              onClick={handleCommit}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
              <Github className="w-5 h-5" />
              Commit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;