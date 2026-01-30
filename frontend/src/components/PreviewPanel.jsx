import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
                        <pre className="overflow-x-auto bg-gray-900 rounded-lg p-4"
                             style={{ backgroundColor: '#161b22' }}>
                            <code className="font-mono text-sm" style={{ color: '#c9d1d9' }} {...props}>
                                {children}
                            </code>
                        </pre>
                    </div>
                );
            }

            if (!inline) {
                return (
                    <pre className="overflow-x-auto bg-gray-900 rounded-lg p-4 my-4"
                         style={{ backgroundColor: '#161b22' }}>
                        <code className="font-mono text-sm" style={{ color: '#c9d1d9' }} {...props}>
                            {children}
                        </code>
                    </pre>
                );
            }

            return (
                <code className="px-1.5 py-0.5 rounded text-sm font-mono"
                      style={{ backgroundColor: '#f3f4f6', color: '#dc2626' }} {...props}>
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
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
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

export default PreviewPanel;
