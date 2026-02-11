import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorPanel from '../EditorPanel';

// Mock the Monaco Editor component
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount, loading, ...props }) => {
    // Simulate editor mount
    if (onMount) {
      const mockEditor = {
        onDidScrollChange: vi.fn((callback) => {
          // Store callback for testing
          mockEditor._scrollCallback = callback;
          return { dispose: vi.fn() };
        }),
        _scrollCallback: null,
      };
      setTimeout(() => onMount(mockEditor), 0);
    }

    return (
      <div data-testid="monaco-editor" data-value={value}>
        {loading}
        <textarea
          data-testid="mock-editor-textarea"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={props.options?.readOnly}
          aria-label="editor"
        />
      </div>
    );
  },
}));

describe('EditorPanel', () => {
  const defaultProps = {
    content: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the editor panel with title', () => {
      render(<EditorPanel {...defaultProps} />);

      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    it('should render the Monaco Editor component', () => {
      render(<EditorPanel {...defaultProps} />);

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should display loading state', () => {
      render(<EditorPanel {...defaultProps} />);

      expect(screen.getByText('Loading editor...')).toBeInTheDocument();
    });

    it('should render with provided content', () => {
      const content = '# Hello World\n\nThis is a test.';
      render(<EditorPanel {...defaultProps} content={content} />);

      expect(screen.getByTestId('mock-editor-textarea')).toHaveValue(content);
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when content is edited', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<EditorPanel {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      await user.type(textarea, 'N');

      expect(onChange).toHaveBeenCalled();
      // Check that the last call contains the typed character
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toContain('N');
    });

    it('should handle empty content on change', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<EditorPanel {...defaultProps} content="initial" onChange={onChange} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      await user.clear(textarea);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should not allow editing when disabled', () => {
      render(<EditorPanel {...defaultProps} disabled={true} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      expect(textarea).toHaveAttribute('readonly');
    });
  });

  describe('Callbacks', () => {
    it('should call onEditorMount when editor is mounted', async () => {
      const onEditorMount = vi.fn();

      render(<EditorPanel {...defaultProps} onEditorMount={onEditorMount} />);

      await waitFor(() => {
        expect(onEditorMount).toHaveBeenCalledTimes(1);
        expect(onEditorMount).toHaveBeenCalledWith(expect.objectContaining({
          onDidScrollChange: expect.any(Function),
        }));
      });
    });

    it('should register scroll callback when onScroll is provided', async () => {
      const onScroll = vi.fn();
      const onEditorMount = vi.fn();

      render(
        <EditorPanel
          {...defaultProps}
          onScroll={onScroll}
          onEditorMount={onEditorMount}
        />
      );

      await waitFor(() => {
        expect(onEditorMount).toHaveBeenCalled();
      });

      const editor = onEditorMount.mock.calls[0][0];
      expect(editor.onDidScrollChange).toHaveBeenCalledWith(onScroll);
    });

    it('should not register scroll callback when onScroll is not provided', async () => {
      const onEditorMount = vi.fn();

      render(<EditorPanel {...defaultProps} onEditorMount={onEditorMount} />);

      await waitFor(() => {
        expect(onEditorMount).toHaveBeenCalled();
      });

      const editor = onEditorMount.mock.calls[0][0];
      // onDidScrollChange should not be called with undefined
      expect(editor.onDidScrollChange).not.toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should use default disabled value of false', () => {
      render(<EditorPanel content="" onChange={vi.fn()} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      expect(textarea).not.toHaveAttribute('readonly');
    });

    it('should apply disabled prop correctly', () => {
      render(<EditorPanel {...defaultProps} disabled={true} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should handle content updates', () => {
      const { rerender } = render(<EditorPanel {...defaultProps} content="initial" />);

      expect(screen.getByTestId('mock-editor-textarea')).toHaveValue('initial');

      rerender(<EditorPanel {...defaultProps} content="updated" />);

      expect(screen.getByTestId('mock-editor-textarea')).toHaveValue('updated');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined value in onChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<EditorPanel {...defaultProps} content="test" onChange={onChange} />);

      const textarea = screen.getByTestId('mock-editor-textarea');
      // Use userEvent to properly trigger the change
      await user.clear(textarea);

      // Should have been called when clearing
      expect(onChange).toHaveBeenCalled();
      // Check that empty string was passed (not undefined)
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000);
      render(<EditorPanel {...defaultProps} content={longContent} />);

      expect(screen.getByTestId('mock-editor-textarea')).toHaveValue(longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = '# Title\n\n```js\nconst x = "<>&";\n```';
      render(<EditorPanel {...defaultProps} content={specialContent} />);

      expect(screen.getByTestId('mock-editor-textarea')).toHaveValue(specialContent);
    });
  });
});
