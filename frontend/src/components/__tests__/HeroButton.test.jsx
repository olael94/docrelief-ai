import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeroButton from '../HeroButton';

describe('HeroButton', () => {
  describe('Rendering', () => {
    it('should render button with provided text', () => {
      render(<HeroButton text="Click Me" />);

      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('should apply custom width class when provided', () => {
      render(<HeroButton text="Test" width="w-full" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('should apply default classes', () => {
      render(<HeroButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-landing');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('rounded-3xl');
    });
  });

  describe('Disabled State', () => {
    it('should be enabled by default', () => {
      render(<HeroButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveClass('opacity-50');
      expect(button).not.toHaveClass('cursor-not-allowed');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<HeroButton text="Test" disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled styles when disabled', () => {
      render(<HeroButton text="Test" disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should not apply disabled styles when enabled', () => {
      render(<HeroButton text="Test" disabled={false} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('opacity-50');
      expect(button).not.toHaveClass('cursor-not-allowed');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<HeroButton text="Test" onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<HeroButton text="Test" onClick={onClick} disabled={true} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<HeroButton text="Test" onClick={onClick} />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('should work without onClick handler', async () => {
      const user = userEvent.setup();

      render(<HeroButton text="Test" />);

      // Should not throw error
      await expect(user.click(screen.getByRole('button'))).resolves.not.toThrow();
    });
  });

  describe('Props Combinations', () => {
    it('should handle all props together', () => {
      const onClick = vi.fn();
      render(
        <HeroButton
          text="Submit"
          onClick={onClick}
          width="w-64"
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('w-64');
      expect(button).not.toBeDisabled();
    });

    it('should handle empty text', () => {
      render(<HeroButton text="" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<HeroButton text="Test" onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });

    it('should have proper button semantics', () => {
      render(<HeroButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });
});
