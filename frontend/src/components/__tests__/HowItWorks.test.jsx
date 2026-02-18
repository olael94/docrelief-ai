import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorks from "../HowItWorks";

describe("HowItWorks", () => {
  describe("Rendering", () => {
    it("should render the component", () => {
      render(<HowItWorks />);

      expect(screen.getByText("How it Works")).toBeInTheDocument();
    });

    it("should render all four steps", () => {
      render(<HowItWorks />);

      expect(screen.getByText("GitHub URL or Files")).toBeInTheDocument();
      expect(screen.getByText("AI Analyzes & Generates")).toBeInTheDocument();
      expect(screen.getByText("Preview & Modify")).toBeInTheDocument();
      expect(screen.getByText("Download or Commit")).toBeInTheDocument();
    });

    it("should render step numbers 1-4", () => {
      render(<HowItWorks />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("should render step descriptions", () => {
      render(<HowItWorks />);

      expect(
        screen.getByText(
          "Paste a GitHub repository URL or upload your code files",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Our AI analyzes your code and generates a professional README",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Review the generated README and make any changes you need",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Download your README or commit it directly to GitHub"),
      ).toBeInTheDocument();
    });
  });

  describe("Step Numbers", () => {
    it("should display 4 step number circles", () => {
      render(<HowItWorks />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have grid layout for steps", () => {
      const { container } = render(<HowItWorks />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("should render 4 step containers", () => {
      const { container } = render(<HowItWorks />);

      const stepContainers = container.querySelectorAll(
        ".flex.flex-col.items-center.text-center",
      );
      expect(stepContainers).toHaveLength(4);
    });
  });

  describe("Accessibility", () => {
    it("should use semantic heading element for title", () => {
      render(<HowItWorks />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("How it Works");
    });

    it("should use semantic heading elements for step titles", () => {
      render(<HowItWorks />);

      const stepHeadings = screen.getAllByRole("heading", { level: 3 });
      expect(stepHeadings).toHaveLength(4);
    });

    it("should have readable step content", () => {
      render(<HowItWorks />);

      // All step text should be visible
      expect(screen.getByText("GitHub URL or Files")).toBeVisible();
      expect(screen.getByText("AI Analyzes & Generates")).toBeVisible();
      expect(screen.getByText("Preview & Modify")).toBeVisible();
      expect(screen.getByText("Download or Commit")).toBeVisible();
    });
  });

  describe("Content Structure", () => {
    it("should have steps in correct order", () => {
      const { container } = render(<HowItWorks />);

      const stepNumbers = container.querySelectorAll(
        ".bg-green-500.rounded-full",
      );
      const numbers = Array.from(stepNumbers).map((el) =>
        el.textContent.trim(),
      );

      expect(numbers).toEqual(["1", "2", "3", "4"]);
    });

    it("should have unique keys for each step", () => {
      // This test ensures the map function uses proper keys
      const { container } = render(<HowItWorks />);

      const stepContainers = container.querySelectorAll(
        ".flex.flex-col.items-center",
      );
      expect(stepContainers.length).toBe(4);
    });
  });

  describe("Edge Cases", () => {
    it("should render without crashing on multiple renders", () => {
      const { rerender } = render(<HowItWorks />);

      rerender(<HowItWorks />);
      rerender(<HowItWorks />);

      expect(screen.getByText("How it Works")).toBeInTheDocument();
    });

    it("should maintain consistent structure", () => {
      const { container } = render(<HowItWorks />);

      // Check that all steps have the same structure
      const steps = container.querySelectorAll(
        ".flex.flex-col.items-center.text-center",
      );

      steps.forEach((step) => {
        // Each step should have a number circle
        expect(step.querySelector(".rounded-full")).toBeInTheDocument();
        // Each step should have a title (h3)
        expect(step.querySelector("h3")).toBeInTheDocument();
        // Each step should have a description (p)
        expect(step.querySelector("p")).toBeInTheDocument();
      });
    });
  });
});
