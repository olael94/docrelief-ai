import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewPanel from '../PreviewPanel';

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children, components }) => {
    // Simple mock that renders markdown content
    return <div data-testid="markdown-content">{children}</div>;
  },
}));

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

describe('PreviewPanel', () => {
  describe('Rendering', () => {
    it('should render preview panel with title', () => {
      render(<PreviewPanel content="" />);

      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should render markdown content', () => {
      const content = '# Hello World';
      render(<PreviewPanel content={content} />);

      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-content')).toHaveTextContent(content);
    });

    it('should render default placeholder when content is empty', () => {
      render(<PreviewPanel content="" />);

      const markdown = screen.getByTestId('markdown-content');
      expect(markdown).toHaveTextContent('Your README will appear here');
    });

    it('should render default placeholder when content is not provided', () => {
      render(<PreviewPanel />);

      const markdown = screen.getByTestId('markdown-content');
      expect(markdown).toHaveTextContent('Your README will appear here');
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(<PreviewPanel content="" isLoading={true} />);

      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    });

    it('should show spinner during loading', () => {
      const { container } = render(<PreviewPanel content="" isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show content during loading', () => {
      render(<PreviewPanel content="# Test" isLoading={true} />);

      expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
    });

    it('should show content when not loading', () => {
      render(<PreviewPanel content="# Test" isLoading={false} />);

      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
    });

    it('should default to not loading', () => {
      render(<PreviewPanel content="# Test" />);

      expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render simple markdown', () => {
      const content = '# Title\n\nThis is a paragraph.';
      render(<PreviewPanel content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('# Title');
      expect(markdownContent).toHaveTextContent('This is a paragraph');
    });

    it('should render complex markdown with code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      render(<PreviewPanel content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('javascript');
      expect(markdownContent).toHaveTextContent('const x = 1');
    });

    it('should render markdown with lists', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      render(<PreviewPanel content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('Item 1');
      expect(markdownContent).toHaveTextContent('Item 2');
      expect(markdownContent).toHaveTextContent('Item 3');
    });

    it('should render markdown with tables', () => {
      const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      render(<PreviewPanel content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('Header 1');
      expect(markdownContent).toHaveTextContent('Header 2');
      expect(markdownContent).toHaveTextContent('Cell 1');
      expect(markdownContent).toHaveTextContent('Cell 2');
    });
  });

  describe('Ref Handling', () => {
    it('should accept and attach previewRef', () => {
      const ref = { current: null };
      render(<PreviewPanel content="test" previewRef={ref} />);

      // The ref should be attached to the scrollable container
      expect(ref.current).toBeTruthy();
    });

    it('should work without previewRef', () => {
      expect(() => render(<PreviewPanel content="test" />)).not.toThrow();
    });
  });

  describe('Styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<PreviewPanel content="" />);

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('h-full');
      expect(mainDiv).toHaveClass('flex');
      expect(mainDiv).toHaveClass('flex-col');
    });

    it('should have scrollable content area', () => {
      const { container } = render(<PreviewPanel content="" />);

      const scrollArea = container.querySelector('.overflow-y-auto');
      expect(scrollArea).toBeInTheDocument();
      expect(scrollArea).toHaveClass('preview-panel-scroll');
    });

    it('should have white background for content', () => {
      const { container } = render(<PreviewPanel content="" />);

      const contentArea = container.querySelector('.bg-white');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render header with proper styling', () => {
      render(<PreviewPanel content="" />);

      const header = screen.getByText('Preview').parentElement;
      expect(header).toHaveClass('bg-gray-100');
      expect(header).toHaveClass('px-6');
      expect(header).toHaveClass('py-4');
    });

    it('should render title as h2', () => {
      render(<PreviewPanel content="" />);

      const title = screen.getByText('Preview');
      expect(title.tagName).toBe('H2');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-bold');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null content', () => {
      render(<PreviewPanel content={null} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('Your README will appear here');
    });

    it('should handle undefined content', () => {
      render(<PreviewPanel content={undefined} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('Your README will appear here');
    });

    it('should handle very long content', () => {
      const longContent = '# Title\n\n' + 'paragraph '.repeat(1000);
      render(<PreviewPanel content={longContent} />);

      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialContent = '# Title with <>&"\'';
      render(<PreviewPanel content={specialContent} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent('Title with');
    });
  });

  describe('Layout Structure', () => {
    it('should maintain flex layout structure', () => {
      const { container } = render(<PreviewPanel content="test" />);

      const flexContainer = container.querySelector('.flex-1');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have proper padding for content', () => {
      const { container } = render(<PreviewPanel content="test" />);

      const contentArea = container.querySelector('.px-6.py-4');
      expect(contentArea).toBeInTheDocument();
    });
  });
});
