import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PreviewPanel = ({ content, isLoading = false, previewRef }) => {
  const components = {
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";

      if (!inline && language) {
        return (
          <div className="relative my-4 bg-[#161b22] rounded-lg">
            <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-white rounded z-10">
              {language}
            </div>
            <pre
              className="overflow-x-auto bg-gray-900 rounded-lg p-4"
              style={{ backgroundColor: "#161b22" }}
            >
              <code
                className="font-mono text-sm"
                style={{ color: "#c9d1d9" }}
                {...props}
              >
                {children}
              </code>
            </pre>
          </div>
        );
      }

      if (!inline) {
        return (
          <pre
            className="overflow-x-auto bg-gray-900 rounded-lg p-4 my-4"
            style={{ backgroundColor: "#161b22" }}
          >
            <code
              className="font-mono text-sm"
              style={{ color: "#c9d1d9" }}
              {...props}
            >
              {children}
            </code>
          </pre>
        );
      }

      return (
        <code
          className="px-1.5 py-0.5 rounded text-sm font-mono"
          style={{ backgroundColor: "#1C2B3A", color: "#4ade80" }}
          {...props}
        >
          {children}
        </code>
      );
    },

    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-green-500/20">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => <thead className="bg-[#1C2B3A]">{children}</thead>,

    th: ({ children }) => (
      <th className="border border-green-500/20 px-4 py-2 text-left font-semibold text-gray-100">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="border border-green-500/20 px-4 py-2 text-gray-300">
        {children}
      </td>
    ),

    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-gray-100 mt-6 mb-4 pb-2 border-b border-green-500/20">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-gray-100 mt-6 mb-3">
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-gray-100 mt-4 mb-2">
        {children}
      </h3>
    ),

    p: ({ children, node }) => {
      // Check if children contains block-level elements like pre/code blocks
      const hasBlockChild = node?.children?.some(
        (child) =>
          child.type === "element" &&
          (child.tagName === "pre" || child.tagName === "code"),
      );

      // If it has block children, use a div instead of <p> to avoid invalid nesting,
      // but keep the same text styling so the surrounding text doesn't go black.
      if (hasBlockChild) {
        return <div className="text-gray-300 my-3 leading-relaxed">{children}</div>;
      }

      return <p className="text-gray-300 my-3 leading-relaxed">{children}</p>;
    },

    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 my-3 space-y-1 text-gray-300">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 my-3 space-y-1 text-gray-300">
        {children}
      </ol>
    ),

    li: ({ children }) => {
      const childArray = React.Children.toArray(children);

      // Helper: extract children from inside our custom p wrapper (function component)
      // Use plain array concat instead of React.Children.toArray to avoid key collisions
      const unwrap = (child) =>
        child && typeof child.type === "function"
          ? [].concat(child.props?.children || [])
          : [child];

      // Flatten one level: look inside p wrappers so we can find <strong>
      const flattened = childArray.flatMap(unwrap);

      const strongIdx = flattened.findIndex((c) => c?.type === "strong");

      if (strongIdx !== -1) {
        const before = flattened.slice(0, strongIdx + 1);
        const after = flattened
          .slice(strongIdx + 1)
          .filter((c) => !(typeof c === "string" && c.trim() === ""));

        if (after.length > 0) {
          return (
            <li className="text-gray-300 pl-1">
              {before.map((c, i) => React.isValidElement(c) ? React.cloneElement(c, { key: `before-${i}` }) : c)}
              <div className="mt-1">
                {after.map((c, i) => React.isValidElement(c) ? React.cloneElement(c, { key: `after-${i}` }) : c)}
              </div>
            </li>
          );
        }
      }

      return <li className="text-gray-300 pl-1">{children}</li>;
    },

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-green-500/40 pl-4 my-4 italic text-gray-400">
        {children}
      </blockquote>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        className="text-green-400 hover:text-green-300 underline"
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
        <div className="bg-[#0D1117]/80 border-b border-green-500/40 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-100">Preview</h2>
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
      <div className="bg-[#0D1117]/80 border-b border-green-500/40 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-100">Preview</h2>
      </div>
      <div
        ref={previewRef}
        className="flex-1 overflow-y-auto bg-[#0D1117] px-6 py-4 preview-panel-scroll"
      >
        <div className="max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content ||
              "# Your README will appear here\n\nStart typing in the editor to see the live preview..."}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
