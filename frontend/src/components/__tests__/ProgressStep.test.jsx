import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressStep from "../ProgressStep";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle: ({ className }) => (
    <div data-testid="check-circle" className={className}>
      CheckCircle
    </div>
  ),
  Loader2: ({ className }) => (
    <div data-testid="loader" className={className}>
      Loader2
    </div>
  ),
}));

describe("ProgressStep", () => {
  const defaultProps = {
    stepNumber: 1,
    text: "Step 1: Upload file",
    status: "pending",
  };

  describe("Rendering", () => {
    it("should render step text", () => {
      render(<ProgressStep {...defaultProps} />);

      expect(screen.getByText("Step 1: Upload file")).toBeInTheDocument();
    });

    it("should render with all required props", () => {
      render(<ProgressStep {...defaultProps} />);

      const container = screen.getByText("Step 1: Upload file").closest("div");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Status: Pending", () => {
    it("should show gray circle for pending status", () => {
      const { container } = render(
        <ProgressStep {...defaultProps} status="pending" />,
      );

      const circle = container.querySelector(".border-gray-300");
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveClass("w-6");
      expect(circle).toHaveClass("h-6");
      expect(circle).toHaveClass("rounded-full");
    });

    it("should have gray text for pending status", () => {
      render(<ProgressStep {...defaultProps} status="pending" />);

      const text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-white");
    });

    it("should not show CheckCircle for pending", () => {
      render(<ProgressStep {...defaultProps} status="pending" />);

      expect(screen.queryByTestId("check-circle")).not.toBeInTheDocument();
    });

    it("should not show Loader for pending", () => {
      render(<ProgressStep {...defaultProps} status="pending" />);

      expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    });
  });

  describe("Status: Active", () => {
    it("should show loading spinner for active status", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      const loader = screen.getByTestId("loader");
      expect(loader).toBeInTheDocument();
    });

    it("should have green text for active status", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      const text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-green-300");
    });

    it("should have spinning animation on loader", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      const loader = screen.getByTestId("loader");
      expect(loader).toHaveClass("animate-spin");
    });

    it("should have green loader color", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      const loader = screen.getByTestId("loader");
      expect(loader).toHaveClass("text-green-300");
    });

    it("should not show CheckCircle for active", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      expect(screen.queryByTestId("check-circle")).not.toBeInTheDocument();
    });
  });

  describe("Status: Completed", () => {
    it("should show check circle for completed status", () => {
      render(<ProgressStep {...defaultProps} status="completed" />);

      const checkCircle = screen.getByTestId("check-circle");
      expect(checkCircle).toBeInTheDocument();
    });

    it("should have green text for completed status", () => {
      render(<ProgressStep {...defaultProps} status="completed" />);

      const text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-green-500");
    });

    it("should have green check circle color", () => {
      render(<ProgressStep {...defaultProps} status="completed" />);

      const checkCircle = screen.getByTestId("check-circle");
      expect(checkCircle).toHaveClass("text-green-500");
    });

    it("should not show Loader for completed", () => {
      render(<ProgressStep {...defaultProps} status="completed" />);

      expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    });
  });

  describe("Icon Sizing", () => {
    it("should have consistent icon size for completed", () => {
      render(<ProgressStep {...defaultProps} status="completed" />);

      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("w-6");
      expect(icon).toHaveClass("h-6");
    });

    it("should have consistent icon size for active", () => {
      render(<ProgressStep {...defaultProps} status="active" />);

      const icon = screen.getByTestId("loader");
      expect(icon).toHaveClass("w-6");
      expect(icon).toHaveClass("h-6");
    });

    it("should have consistent icon size for pending", () => {
      const { container } = render(
        <ProgressStep {...defaultProps} status="pending" />,
      );

      const circle = container.querySelector(".rounded-full");
      expect(circle).toHaveClass("w-6");
      expect(circle).toHaveClass("h-6");
    });
  });

  describe("Layout", () => {
    it("should have flex layout with gap", () => {
      const { container } = render(<ProgressStep {...defaultProps} />);

      const flexContainer = container.querySelector(".flex.items-center.gap-4");
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("flex");
      expect(flexContainer).toHaveClass("items-center");
      expect(flexContainer).toHaveClass("gap-4");
    });

    it("should have proper padding", () => {
      const { container } = render(<ProgressStep {...defaultProps} />);

      const paddedContainer = container.querySelector(".py-4");
      expect(paddedContainer).toBeInTheDocument();
      expect(paddedContainer).toHaveClass("py-4");
    });

    it("should have flex-shrink-0 on icon container", () => {
      const { container } = render(
        <ProgressStep {...defaultProps} status="completed" />,
      );

      const iconContainer = container.querySelector(".flex-shrink-0");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Text Styling", () => {
    it("should have proper text size and weight", () => {
      render(<ProgressStep {...defaultProps} />);

      const text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-lg");
      expect(text).toHaveClass("font-medium");
    });

    it("should have transition for color changes", () => {
      render(<ProgressStep {...defaultProps} />);

      const text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("transition-colors");
    });
  });

  describe("Status Transitions", () => {
    it("should update from pending to active", () => {
      const { rerender } = render(
        <ProgressStep {...defaultProps} status="pending" />,
      );

      expect(screen.queryByTestId("loader")).not.toBeInTheDocument();

      rerender(<ProgressStep {...defaultProps} status="active" />);

      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("should update from active to completed", () => {
      const { rerender } = render(
        <ProgressStep {...defaultProps} status="active" />,
      );

      expect(screen.getByTestId("loader")).toBeInTheDocument();

      rerender(<ProgressStep {...defaultProps} status="completed" />);

      expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      expect(screen.getByTestId("check-circle")).toBeInTheDocument();
    });

    it("should update text color when status changes", () => {
      const { rerender } = render(
        <ProgressStep {...defaultProps} status="pending" />,
      );

      let text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-white");

      rerender(<ProgressStep {...defaultProps} status="active" />);

      text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-green-300");

      rerender(<ProgressStep {...defaultProps} status="completed" />);

      text = screen.getByText("Step 1: Upload file");
      expect(text).toHaveClass("text-green-500");
    });
  });

  describe("Different Step Content", () => {
    it("should render different step numbers", () => {
      render(
        <ProgressStep stepNumber={3} text="Step 3: Process" status="pending" />,
      );

      expect(screen.getByText("Step 3: Process")).toBeInTheDocument();
    });

    it("should handle long step text", () => {
      const longText =
        "This is a very long step description that should still render correctly";
      render(<ProgressStep stepNumber={1} text={longText} status="pending" />);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("should handle short step text", () => {
      render(<ProgressStep stepNumber={1} text="Done" status="completed" />);

      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty text", () => {
      const { container } = render(
        <ProgressStep stepNumber={1} text="" status="pending" />,
      );

      // Should still render the component structure
      const flexContainer = container.querySelector(".flex.items-center.gap-4");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should default to appropriate behavior with invalid status", () => {
      // Testing with an invalid status to see default behavior
      const { container } = render(
        <ProgressStep stepNumber={1} text="Test" status="invalid" />,
      );

      // Should still render without crashing
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });
});
