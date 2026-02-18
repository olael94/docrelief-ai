import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamPage from "../TeamPage";

describe("TeamPage", () => {
  describe("Rendering", () => {
    it("should render the page", () => {
      render(<TeamPage />);

      expect(screen.getByText("Meet the Team")).toBeInTheDocument();
    });

    it("should render main heading", () => {
      render(<TeamPage />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Meet the Team");
    });
  });

  describe("Styling", () => {
    it("should have proper heading styling", () => {
      render(<TeamPage />);

      const heading = screen.getByText("Meet the Team");
      expect(heading).toHaveClass("font-poppins");
      expect(heading).toHaveClass("text-5xl");
      expect(heading).toHaveClass("font-black");
    });

    it("should center heading text", () => {
      render(<TeamPage />);

      const heading = screen.getByText("Meet the Team");
      expect(heading).toHaveClass("text-center");
    });

    it("should have margin bottom on heading", () => {
      render(<TeamPage />);

      const heading = screen.getByText("Meet the Team");
      expect(heading).toHaveClass("mb-10");
    });
  });

  describe("Layout", () => {
    it("should have flex column layout", () => {
      const { container } = render(<TeamPage />);

      const flexContainer = container.querySelector(".flex.flex-col");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should center content", () => {
      const { container } = render(<TeamPage />);

      const centeredContainer = container.querySelector(".items-center.justify-center");
      expect(centeredContainer).toBeInTheDocument();
    });

    it("should have horizontal padding", () => {
      const { container } = render(<TeamPage />);

      const paddedContainer = container.querySelector(".px-4");
      expect(paddedContainer).toBeInTheDocument();
    });

    it("should have top margin", () => {
      const { container } = render(<TeamPage />);

      const marginContainer = container.querySelector(".mt-20");
      expect(marginContainer).toBeInTheDocument();
    });

    it("should have bottom margin", () => {
      const { container } = render(<TeamPage />);

      const marginContainer = container.querySelector(".mb-20");
      expect(marginContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading", () => {
      render(<TeamPage />);

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
    });

    it("should have heading level 1", () => {
      render(<TeamPage />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Meet the Team");
    });
  });

  describe("Structure", () => {
    it("should use fragment as root", () => {
      const { container } = render(<TeamPage />);

      // The first child should be the div, not a fragment wrapper
      expect(container.firstChild.tagName).toBe("DIV");
    });

    it("should have single main container", () => {
      const { container } = render(<TeamPage />);

      const mainContainers = container.querySelectorAll(":scope > div");
      expect(mainContainers).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    it("should render without crashing on multiple renders", () => {
      const { rerender } = render(<TeamPage />);

      rerender(<TeamPage />);
      rerender(<TeamPage />);

      expect(screen.getByText("Meet the Team")).toBeInTheDocument();
    });

    it("should maintain consistent structure", () => {
      const { container: container1 } = render(<TeamPage />);
      const html1 = container1.innerHTML;

      const { container: container2 } = render(<TeamPage />);
      const html2 = container2.innerHTML;

      expect(html1).toBe(html2);
    });
  });
});
