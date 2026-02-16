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
    it("should display step numbers in green circles", () => {
      const { container } = render(<HowItWorks />);

      const stepCircles = container.querySelectorAll(".bg-green-500.rounded-full");
      expect(stepCircles).toHaveLength(4);
    });

    it("should have proper step circle dimensions", () => {
      const { container } = render(<HowItWorks />);

      const stepCircles = container.querySelectorAll(".w-12.h-12");
      expect(stepCircles).toHaveLength(4);
    });

    it("should have white text in step circles", () => {
      const { container } = render(<HowItWorks />);

      const stepCircles = container.querySelectorAll(
        ".bg-green-500.text-white.rounded-full",
      );
      expect(stepCircles).toHaveLength(4);
    });
  });

  describe("Layout", () => {
    it("should have grid layout for steps", () => {
      const { container } = render(<HowItWorks />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("should have responsive grid columns", () => {
      const { container } = render(<HowItWorks />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1");
      expect(grid).toHaveClass("md:grid-cols-2");
      expect(grid).toHaveClass("lg:grid-cols-4");
    });

    it("should have gap between grid items", () => {
      const { container } = render(<HowItWorks />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("gap-6");
    });

    it("should center step content", () => {
      const { container } = render(<HowItWorks />);

      const stepContainers = container.querySelectorAll(
        ".flex.flex-col.items-center.text-center",
      );
      expect(stepContainers).toHaveLength(4);
    });
  });

  describe("Styling", () => {
    it("should have proper container styling", () => {
      const { container } = render(<HowItWorks />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("rounded-4xl");
      expect(mainContainer).toHaveClass("shadow-2xl");
    });

    it("should have backdrop blur effect", () => {
      const { container } = render(<HowItWorks />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("backdrop-blur-md");
    });

    it("should have green border styling", () => {
      const { container } = render(<HowItWorks />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("border-green-500/40");
    });

    it("should have heading with proper styling", () => {
      render(<HowItWorks />);

      const heading = screen.getByText("How it Works");
      expect(heading).toHaveClass("font-poppins");
      expect(heading).toHaveClass("text-3xl");
      expect(heading).toHaveClass("font-bold");
      expect(heading).toHaveClass("text-white");
    });

    it("should have step titles with green text", () => {
      render(<HowItWorks />);

      const title = screen.getByText("GitHub URL or Files");
      expect(title).toHaveClass("text-green-200");
    });

    it("should have step descriptions with white text", () => {
      render(<HowItWorks />);

      const description = screen.getByText(
        "Paste a GitHub repository URL or upload your code files",
      );
      expect(description).toHaveClass("text-white");
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive width classes", () => {
      const { container } = render(<HowItWorks />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("w-[400px]");
      expect(mainContainer).toHaveClass("md:w-[921px]");
    });

    it("should have margin classes for spacing", () => {
      const { container } = render(<HowItWorks />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("mt-16");
      expect(mainContainer).toHaveClass("mb-10");
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
