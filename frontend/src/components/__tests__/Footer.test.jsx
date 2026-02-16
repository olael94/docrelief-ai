import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  beforeEach(() => {
    // Use fake timers and set the system time
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render the footer", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer).toBeInTheDocument();
    });

    it("should render as footer element", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer.tagName).toBe("FOOTER");
    });

    it("should render copyright text", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toBeInTheDocument();
    });

    it("should display current year in copyright", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      // Check that it contains a year and the copyright text (flexible for any year)
      expect(copyright).toHaveTextContent(/© \d{4} DocRelief AI/);
    });
  });

  describe("Links", () => {
    it("should render all footer links", () => {
      render(<Footer />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("Report Issue")).toBeInTheDocument();
      expect(screen.getByText("Meet the team")).toBeInTheDocument();
      expect(screen.getByText("How It Works")).toBeInTheDocument();
    });

    it("should have correct href for GitHub link", () => {
      render(<Footer />);

      const githubLink = screen.getByText("GitHub").closest("a");
      expect(githubLink).toHaveAttribute(
        "href",
        "https://github.com/olael94/docrelief-ai",
      );
    });

    it("should have correct href for Report Issue link", () => {
      render(<Footer />);

      const issueLink = screen.getByText("Report Issue").closest("a");
      expect(issueLink).toHaveAttribute(
        "href",
        "https://github.com/olael94/docrelief-ai/issues",
      );
    });

    it("should have correct href for Meet the team link", () => {
      render(<Footer />);

      const teamLink = screen.getByText("Meet the team").closest("a");
      expect(teamLink).toHaveAttribute("href", "/team");
    });

    it("should have correct href for How It Works link", () => {
      render(<Footer />);

      const howLink = screen.getByText("How It Works").closest("a");
      expect(howLink).toHaveAttribute("href", "/");
    });

    it("should render links in a list", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
    });

    it("should render correct number of list items", () => {
      render(<Footer />);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(4);
    });

    it("should have testids for all footer links", () => {
      render(<Footer />);

      expect(screen.getByTestId("footerLink0")).toBeInTheDocument();
      expect(screen.getByTestId("footerLink1")).toBeInTheDocument();
      expect(screen.getByTestId("footerLink2")).toBeInTheDocument();
      expect(screen.getByTestId("footerLink3")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have correct base styling classes", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("w-full");
      expect(footer).toHaveClass("border-t");
      expect(footer).toHaveClass("border-green-500/40");
      expect(footer).toHaveClass("backdrop-blur-md");
    });

    it("should have responsive flex layout", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("flex-col");
      expect(footer).toHaveClass("md:flex-row");
      expect(footer).toHaveClass("md:justify-between");
    });

    it("should have proper padding", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("px-10");
      expect(footer).toHaveClass("py-6");
      expect(footer).toHaveClass("md:px-36");
    });

    it("should have minimum width constraint", () => {
      render(<Footer />);

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("min-w-[420px]");
    });

    it("should have hover effect on links", () => {
      render(<Footer />);

      const link = screen.getByText("GitHub").closest("a");
      expect(link).toHaveClass("hover:text-teal-500");
      expect(link).toHaveClass("hover:underline");
    });

    it("should have transition effect on links", () => {
      render(<Footer />);

      const link = screen.getByText("GitHub").closest("a");
      expect(link).toHaveClass("transition-colors");
    });

    it("should have no underline by default on links", () => {
      render(<Footer />);

      const link = screen.getByText("GitHub").closest("a");
      expect(link).toHaveClass("no-underline");
    });

    it("should have gray text color for links", () => {
      render(<Footer />);

      const link = screen.getByText("GitHub").closest("a");
      expect(link).toHaveClass("text-gray-600");
    });
  });

  describe("Copyright Text", () => {
    it("should have correct styling for copyright", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toHaveClass("text-gray-500");
      expect(copyright).toHaveClass("text-sm");
    });

    it("should have responsive text alignment", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toHaveClass("text-center");
      expect(copyright).toHaveClass("md:text-right");
    });

    it("should have proper spacing", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toHaveClass("pt-6");
      expect(copyright).toHaveClass("md:pt-0");
    });

    it("should be a paragraph element", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright.tagName).toBe("P");
    });
  });

  describe("Layout Order", () => {
    it("should have links in order-1", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("order-1");
    });

    it("should have copyright in order-2", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toHaveClass("order-2");
    });
  });

  describe("Link Layout", () => {
    it("should have flex layout for links", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("flex");
      expect(list).toHaveClass("flex-row");
    });

    it("should have gap between links", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("gap-6");
    });

    it("should have responsive justification", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("justify-center");
      expect(list).toHaveClass("md:justify-start");
    });
  });

  describe("Dynamic Year", () => {
    it("should display a valid year format", () => {
      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      // Verify format includes year and copyright
      expect(copyright.textContent).toMatch(/© \d{4} DocRelief AI/);
    });

    it("should update year when system time changes", () => {
      vi.setSystemTime(new Date("2025-06-15"));

      render(<Footer />);

      const copyright = screen.getByTestId("footerContent");
      expect(copyright).toHaveTextContent("© 2025 DocRelief AI");
    });

    it("should get year from Date object", () => {
      // Test that component uses new Date().getFullYear()
      const { container } = render(<Footer />);
      const copyright = container.querySelector(
        '[data-testid="footerContent"]',
      );

      // Should contain a 4-digit year
      expect(copyright.textContent).toMatch(/\d{4}/);
    });
  });

  describe("Accessibility", () => {
    it("should have semantic footer element", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("should have list structure for navigation", () => {
      render(<Footer />);

      const list = screen.getByRole("list");
      const listItems = screen.getAllByRole("listitem");

      expect(list).toBeInTheDocument();
      expect(listItems.length).toBeGreaterThan(0);
    });

    it("should have clickable links", () => {
      render(<Footer />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(4);

      links.forEach((link) => {
        expect(link).toHaveAttribute("href");
      });
    });
  });

  describe("External Links", () => {
    it("should have external GitHub links", () => {
      render(<Footer />);

      const githubLink = screen.getByText("GitHub").closest("a");
      expect(githubLink?.getAttribute("href")).toContain("github.com");
    });

    it("should have external issue link", () => {
      render(<Footer />);

      const issueLink = screen.getByText("Report Issue").closest("a");
      expect(issueLink?.getAttribute("href")).toContain("github.com");
    });
  });

  describe("Internal Links", () => {
    it("should have internal team link", () => {
      render(<Footer />);

      const teamLink = screen.getByText("Meet the team").closest("a");
      expect(teamLink?.getAttribute("href")).toBe("/team");
    });

    it("should have internal home link", () => {
      render(<Footer />);

      const homeLink = screen.getByText("How It Works").closest("a");
      expect(homeLink?.getAttribute("href")).toBe("/");
    });
  });
});
