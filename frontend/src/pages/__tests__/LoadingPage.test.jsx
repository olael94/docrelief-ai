import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import LoadingPage from "../LoadingPage";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
  state: { readmeId: "test-readme-id" },
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock the API module
vi.mock("../../services/api", () => ({
  pollReadmeStatus: vi.fn(),
}));

// Mock ProgressStep component
vi.mock("../../components/ProgressStep", () => ({
  default: ({ stepNumber, text, status }) => (
    <div data-testid={`progress-step-${stepNumber}`} data-status={status}>
      {text}
    </div>
  ),
}));

describe("LoadingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = { readmeId: "test-readme-id" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <LoadingPage />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render the loading page", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByText("Generating Your README")).toBeInTheDocument();
    });

    it("should render all four progress steps", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByTestId("progress-step-1")).toBeInTheDocument();
      expect(screen.getByTestId("progress-step-2")).toBeInTheDocument();
      expect(screen.getByTestId("progress-step-3")).toBeInTheDocument();
      expect(screen.getByTestId("progress-step-4")).toBeInTheDocument();
    });

    it("should display step text", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByText("Verifying repository")).toBeInTheDocument();
      expect(screen.getByText("Analyzing Code Structure")).toBeInTheDocument();
      expect(screen.getByText("Generating Content")).toBeInTheDocument();
      expect(screen.getByText("Finalizing README")).toBeInTheDocument();
    });
  });

  describe("Step Animation", () => {
    it("should start with step 1 active", async () => {
      vi.useFakeTimers();
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByTestId("progress-step-1")).toHaveAttribute(
        "data-status",
        "active",
      );
      expect(screen.getByTestId("progress-step-2")).toHaveAttribute(
        "data-status",
        "pending",
      );
    });

    it("should progress to step 2 after 5 seconds", async () => {
      vi.useFakeTimers();
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId("progress-step-1")).toHaveAttribute(
        "data-status",
        "completed",
      );
      expect(screen.getByTestId("progress-step-2")).toHaveAttribute(
        "data-status",
        "active",
      );
    });

    it("should progress to step 3 after 8 seconds", async () => {
      vi.useFakeTimers();
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      await act(async () => {
        vi.advanceTimersByTime(8000);
      });

      expect(screen.getByTestId("progress-step-2")).toHaveAttribute(
        "data-status",
        "completed",
      );
      expect(screen.getByTestId("progress-step-3")).toHaveAttribute(
        "data-status",
        "active",
      );
    });

    it("should progress to step 4 after 11 seconds", async () => {
      vi.useFakeTimers();
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      await act(async () => {
        vi.advanceTimersByTime(11000);
      });

      expect(screen.getByTestId("progress-step-3")).toHaveAttribute(
        "data-status",
        "completed",
      );
      expect(screen.getByTestId("progress-step-4")).toHaveAttribute(
        "data-status",
        "active",
      );
    });
  });

  describe("Polling", () => {
    it("should start polling when readmeId is provided", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(pollReadmeStatus).toHaveBeenCalledWith("test-readme-id");
    });

    it("should navigate to preview on successful poll", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockResolvedValue({
        readme_content: "# Test README",
        status: "completed",
      });

      renderComponent();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/preview/test-readme-id");
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error when no readmeId provided", async () => {
      mockLocation.state = null;

      renderComponent();

      expect(screen.getByText("No README ID found")).toBeInTheDocument();
    });

    it("should show error on polling failure", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Polling failed"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Polling failed")).toBeInTheDocument();
      });
    });

    it("should show Try Again button on error", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Error"));

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });
    });

    it("should navigate home when Try Again is clicked", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Error"));

      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Try Again/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Styling", () => {
    it("should have proper card styling", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const card = container.querySelector(".border-green-500\\/40");
      expect(card).toBeInTheDocument();
    });

    it("should have backdrop blur", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const blurredCard = container.querySelector(".backdrop-blur-md");
      expect(blurredCard).toBeInTheDocument();
    });

    it("should have rounded corners", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const roundedCard = container.querySelector(".rounded-3xl");
      expect(roundedCard).toBeInTheDocument();
    });

    it("should have proper heading styling", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      const heading = screen.getByText("Generating Your README");
      expect(heading).toHaveClass("font-urbanist");
      expect(heading).toHaveClass("text-3xl");
      expect(heading).toHaveClass("font-black");
      expect(heading).toHaveClass("text-green-500");
    });
  });

  describe("Layout", () => {
    it("should be full height", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const fullHeightContainer = container.querySelector(".min-h-screen");
      expect(fullHeightContainer).toBeInTheDocument();
    });

    it("should center content", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const centeredContainer = container.querySelector(
        ".flex.items-center.justify-center",
      );
      expect(centeredContainer).toBeInTheDocument();
    });

    it("should have responsive max-width", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const responsiveCard = container.querySelector(
        ".max-w-\\[400px\\].md\\:max-w-md",
      );
      expect(responsiveCard).toBeInTheDocument();
    });
  });

  describe("Error State Styling", () => {
    it("should have red background on error", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Error"));

      const { container } = renderComponent();

      await waitFor(() => {
        const errorBox = container.querySelector(".bg-red-50");
        expect(errorBox).toBeInTheDocument();
      });
    });

    it("should have red border on error", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Error"));

      const { container } = renderComponent();

      await waitFor(() => {
        const errorBox = container.querySelector(".border-red-200");
        expect(errorBox).toBeInTheDocument();
      });
    });

    it("should have red text on error", async () => {
      const { pollReadmeStatus } = await import("../../services/api");
      pollReadmeStatus.mockRejectedValue(new Error("Test error message"));

      renderComponent();

      await waitFor(() => {
        const errorText = screen.getByText("Test error message");
        expect(errorText).toHaveClass("text-red-600");
      });
    });
  });
});
