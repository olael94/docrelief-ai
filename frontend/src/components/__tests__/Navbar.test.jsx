import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Navbar from '../Navbar';

// Mock the logo import
vi.mock('../../assets/DocRelief_Logo3.png', () => ({
  default: '/mocked-logo.png',
}));

// Helper to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Navbar', () => {
  describe('Rendering', () => {
    it('should render the navbar', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render the logo', () => {
      renderWithRouter(<Navbar />);

      const logo = screen.getByAltText('DocRelief AI');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/mocked-logo.png');
    });

    it('should render all navigation links', () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Login/Username')).toBeInTheDocument();
    });

    it('should apply correct styling classes', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('bg-gray-50');
      expect(nav).toHaveClass('rounded-4xl');
      expect(nav).toHaveClass('flex');
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href for Features link', () => {
      renderWithRouter(<Navbar />);

      const featuresLink = screen.getByText('Features').closest('a');
      expect(featuresLink).toHaveAttribute('href', '/features');
    });

    it('should have correct href for Pricing link', () => {
      renderWithRouter(<Navbar />);

      const pricingLink = screen.getByText('Pricing').closest('a');
      expect(pricingLink).toHaveAttribute('href', '/pricing');
    });

    it('should have correct href for Login link', () => {
      renderWithRouter(<Navbar />);

      const loginLink = screen.getByText('Login/Username').closest('a');
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have home link on logo', () => {
      renderWithRouter(<Navbar />);

      const logoLink = screen.getByAltText('DocRelief AI').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Logo', () => {
    it('should have cursor pointer on logo link', () => {
      renderWithRouter(<Navbar />);

      const logoLink = screen.getByAltText('DocRelief AI').closest('a');
      expect(logoLink).toHaveClass('cursor-pointer');
    });

    it('should have responsive height classes', () => {
      renderWithRouter(<Navbar />);

      const logo = screen.getByAltText('DocRelief AI');
      expect(logo).toHaveClass('h-8');
      expect(logo).toHaveClass('md:h-10');
    });
  });

  describe('Layout', () => {
    it('should have sticky positioning', () => {
      const { container } = renderWithRouter(<Navbar />);

      const stickyContainer = container.querySelector('.sticky');
      expect(stickyContainer).toBeInTheDocument();
      expect(stickyContainer).toHaveClass('top-0');
      expect(stickyContainer).toHaveClass('z-50');
    });

    it('should have space-between layout', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('justify-between');
    });

    it('should have proper nav list structure', () => {
      renderWithRouter(<Navbar />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('navbar-links');
    });
  });

  describe('Accessibility', () => {
    it('should have navigation landmark', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have proper list structure for links', () => {
      renderWithRouter(<Navbar />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('should have descriptive alt text for logo', () => {
      renderWithRouter(<Navbar />);

      const logo = screen.getByAltText('DocRelief AI');
      expect(logo).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Navbar />);

      const logoLink = screen.getByAltText('DocRelief AI').closest('a');
      logoLink.focus();
      expect(logoLink).toHaveFocus();

      // Tab through links
      await user.tab();
      const featuresLink = screen.getByText('Features').closest('a');
      expect(featuresLink).toHaveFocus();

      await user.tab();
      const pricingLink = screen.getByText('Pricing').closest('a');
      expect(pricingLink).toHaveFocus();

      await user.tab();
      const loginLink = screen.getByText('Login/Username').closest('a');
      expect(loginLink).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive padding', () => {
      const { container } = renderWithRouter(<Navbar />);

      const navbarContainer = container.querySelector('.navbar-padding');
      expect(navbarContainer).toHaveClass('pl-4');
      expect(navbarContainer).toHaveClass('pr-4');
    });

    it('should have max-width constraint', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('max-w-screen-2xl');
      expect(nav).toHaveClass('mx-auto');
    });
  });

  describe('Styling', () => {
    it('should have custom navbar classes', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('bg-navbar');
      expect(nav).toHaveClass('text-black');
      expect(nav).toHaveClass('font-bold');
    });

    it('should have rounded corners', () => {
      renderWithRouter(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('rounded-4xl');
    });

    it('should have proper spacing', () => {
      renderWithRouter(<Navbar />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('gap-4');
    });
  });
});
