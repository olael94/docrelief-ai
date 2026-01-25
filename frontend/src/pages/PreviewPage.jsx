import React, { useState } from 'react';
import { Download, RefreshCw, Github, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// EditorPanel Component with Line Numbers
const EditorPanel = ({ content, onChange, disabled = false }) => {
  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleScroll = (e) => {
    const lineNumbers = e.target.previousElementSibling;
    if (lineNumbers) {
      lineNumbers.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Editor</h2>
      </div>
      <div className="flex-1 overflow-hidden flex">
        {/* Line Numbers */}
        <div className="overflow-y-auto bg-gray-50 px-3 py-6 text-right select-none border-r border-gray-200" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="font-mono text-sm text-gray-400 leading-6">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
        </div>
        {/* Editor Textarea */}
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          disabled={disabled}
          className="flex-1 overflow-y-auto p-6 font-mono text-sm resize-none focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 bg-white leading-6"
          placeholder="# Your README content here..."
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
};

// PreviewPanel Component
const PreviewPanel = ({ content, isLoading = false }) => {
  const components = {
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        return (
          <div className="relative my-4">
            <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-white rounded">
              {language}
            </div>
            <pre className="overflow-x-auto bg-gray-900 text-gray-100 rounded-lg p-4">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }
      
      return (
        <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
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
      <div className="flex-1 overflow-y-auto bg-white px-6 py-4">
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
  const [repoUrl, setRepoUrl] = useState('https://github.com/username/repo');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(true);

  React.useEffect(() => {
    // Load initial mock content only if no repo URL is being loaded
    const mockContent = `# Welcome to DocRelief AI

Enter a GitHub repository URL above and click "Load" to generate a README.

## How to use:
1. Paste a GitHub repository URL (e.g., https://github.com/username/repo)
2. Click the "Load" button
3. Edit the generated README in the editor
4. Download or commit to GitHub`;
    
    setContent(mockContent);
    setIsLoading(false);
  }, []);

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
    setShowSuccess(false);
    await handleLoadRepository();
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCommit = () => {
    alert('GitHub commit functionality will be implemented in a future version');
  };

  const handleLoadRepository = async () => {
    if (!repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Call the backend API
      const response = await fetch('http://localhost:8000/api/readme/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: repoUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate README');
      }

      const data = await response.json();
      
      // Assuming the API returns the markdown content
      if (data.markdown || data.content) {
        setContent(data.markdown || data.content);
        setShowSuccess(true);
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load repository');
      console.error('Error loading repository:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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

      {/* Repository Info with Load Button */}
      <div className="flex items-center justify-center gap-3 mt-8 mb-6 px-6">
        <Github className="w-5 h-5 text-gray-700" />
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleLoadRepository();
            }
          }}
          placeholder="https://github.com/username/repo"
          className="flex-1 max-w-xl px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleLoadRepository}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {/* Split Screen Editor - with independent scrolling */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Editor Panel - independently scrollable */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <EditorPanel 
              content={content} 
              onChange={setContent}
              disabled={isLoading || isRegenerating}
            />
          </div>

          {/* Preview Panel - independently scrollable */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <PreviewPanel content={content} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-center pb-8">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-6 flex items-center gap-6">
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
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Download
          </button>

          <button
            onClick={handleCommit}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            <Github className="w-5 h-5" />
            Commit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;