import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import PublicRepoTab from "../PublicRepoTab";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the API module
vi.mock("../../services/api", () => ({
  generateReadme: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock HeroButton component
vi.mock("../HeroButton", () => ({
  default: ({ text, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-testid="hero-button">
      {text}
    </button>
  ),
}));

describe("PublicRepoTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PublicRepoTab />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render the component", () => {
      renderComponent();

      expect(screen.getByText("Repository URL")).toBeInTheDocument();
    });

    it("should render input field", () => {
      renderComponent();

      expect(
        screen.getByPlaceholderText("https://github.com/username/repo"),
      ).toBeInTheDocument();
    });

    it("should render Generate README button", () => {
      renderComponent();

      expect(screen.getByTestId("hero-button")).toBeInTheDocument();
      expect(screen.getByText("Generate README →")).toBeInTheDocument();
    });

    it("should render helper text", () => {
      renderComponent();

      expect(
        screen.getByText("Use this tab for public Github Repositories"),
      ).toBeInTheDocument();
    });
  });

  describe("Input Field", () => {
    it("should have proper styling", () => {
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      expect(input).toHaveClass("rounded-3xl");
      expect(input).toHaveClass("border-green-500/40");
    });

    it("should update value when typing", async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");

      expect(input).toHaveValue("https://github.com/user/repo");
    });

    it("should be disabled while submitting", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      expect(input).toBeDisabled();
    });
  });

  describe("URL Validation", () => {
    it("should show error for empty URL", async () => {
      const toast = await import("react-hot-toast");
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId("hero-button"));

      expect(toast.toast.error).toHaveBeenCalledWith(
        "Please enter a valid GitHub repository URL",
      );
    });

    it("should show error for invalid URL format", async () => {
      const toast = await import("react-hot-toast");
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "not-a-valid-url");
      await user.click(screen.getByTestId("hero-button"));

      expect(toast.toast.error).toHaveBeenCalledWith(
        "Please enter a valid GitHub repository URL",
      );
    });

    it("should accept valid GitHub URL", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "123", session_token: "token" });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(generateReadme).toHaveBeenCalledWith(
          "https://github.com/user/repo",
        );
      });
    });

    it("should accept URL with trailing slash", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "123", session_token: "token" });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo/");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(generateReadme).toHaveBeenCalled();
      });
    });

    it("should accept URL with .git extension", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "123", session_token: "token" });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo.git");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(generateReadme).toHaveBeenCalled();
      });
    });
  });

  describe("Form Submission", () => {
    it("should show loading state when generating", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });

    it("should navigate to loading page on success", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "readme-123", session_token: "token" });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/loading", {
          state: { readmeId: "readme-123" },
        });
      });
    });

    it("should store session token in localStorage", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({
        id: "123",
        session_token: "test-session-token",
      });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(localStorage.getItem("session_token")).toBe("test-session-token");
      });
    });

    it("should submit on Enter key press", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "123", session_token: "token" });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo{Enter}");

      await waitFor(() => {
        expect(generateReadme).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle 403 error (private repo)", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockRejectedValue({
        response: { status: 403, data: { detail: "Private repository" } },
      });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/private-repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/connect-github", {
          state: { githubUrl: "https://github.com/user/private-repo" },
        });
      });
    });

    it("should handle 404 error", async () => {
      const { generateReadme } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      generateReadme.mockRejectedValue({
        response: { status: 404, data: { detail: "Not found" } },
      });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/nonexistent");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "Repository not found or is private. For private repos, use the 'Private Repo' tab.",
        );
      });
    });

    it("should handle 400 error", async () => {
      const { generateReadme } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      generateReadme.mockRejectedValue({
        response: { status: 400, data: { detail: "Invalid URL" } },
      });

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "Please enter a valid GitHub repository URL",
        );
      });
    });

    it("should handle network errors", async () => {
      const { generateReadme } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      generateReadme.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "Failed to connect to server. Please try again.",
        );
      });
    });

    it("should reset submitting state on error", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockRejectedValue(new Error("Error"));

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(screen.getByText("Generate README →")).toBeInTheDocument();
      });
    });
  });

  describe("Layout", () => {
    it("should have proper container styling", () => {
      const { container } = renderComponent();

      const mainContainer = container.querySelector(".w-full.flex.flex-col");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should center content", () => {
      const { container } = renderComponent();

      const centeredContainer = container.querySelector(".items-center");
      expect(centeredContainer).toBeInTheDocument();
    });

    it("should have minimum height", () => {
      const { container } = renderComponent();

      const minHeightContainer = container.querySelector(".min-h-\\[500px\\]");
      expect(minHeightContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have label for input", () => {
      renderComponent();

      expect(screen.getByText("Repository URL")).toBeInTheDocument();
    });

    it("should have placeholder text", () => {
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      expect(input).toBeInTheDocument();
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.tab();

      expect(input).toHaveFocus();
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace-only input", async () => {
      const toast = await import("react-hot-toast");
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "   ");
      await user.click(screen.getByTestId("hero-button"));

      expect(toast.toast.error).toHaveBeenCalledWith(
        "Please enter a valid GitHub repository URL",
      );
    });

    it("should not submit when already submitting", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");

      // Click multiple times
      await user.click(screen.getByTestId("hero-button"));

      // Button should show Generating and be in a state where it can't be clicked again
      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });

    it("should handle response without session_token", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockResolvedValue({ id: "123" }); // No session_token

      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(
        "https://github.com/username/repo",
      );
      await user.type(input, "https://github.com/user/repo");
      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/loading", {
          state: { readmeId: "123" },
        });
      });

      // Should not set undefined to localStorage
      expect(localStorage.getItem("session_token")).toBeNull();
    });
  });
});
