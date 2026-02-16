import React from 'react';
import Editor from '@monaco-editor/react';

const EditorPanel = ({ content, onChange, disabled = false, onEditorMount, onScroll }) => {
    const handleEditorChange = (value) => {
        onChange(value || '');
    };

    return (
        <div className="h-full flex flex-col">
            <div className="bg-[#0D1117]/80 border-b border-green-500/40 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-100">Editor</h2>
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
                            useShadows: true,
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                            verticalSliderSize: 6,
                            horizontalSliderSize: 6,
                        },
                    }}
                    loading={
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                <p className="text-gray-500">Loading editor...</p>
                            </div>
                        </div>
                    }
                />
            </div>
        </div>
    );
};

export default EditorPanel;
