import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import GitHubCallback from "../GitHubCallback";

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
  };
});

// Mock the API module
vi.mock("../../services/api", () => ({
  exchangeOAuthCode: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GitHubCallback", () => {
  let originalLocation;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockSearchParams.delete("code");
    mockSearchParams.delete("state");
    mockSearchParams.delete("error");
    mockSearchParams.delete("error_description");

    // Mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = { href: "" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>,
    );
  };

  describe("Processing State", () => {
    it("should show loading spinner initially", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByText("Connecting to GitHub...")).toBeInTheDocument();
    });

    it("should have spinning animation", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Error from GitHub", () => {
    it("should show error when user denies authorization", async () => {
      mockSearchParams.set("error", "access_denied");
      mockSearchParams.set("error_description", "The user has denied access");

      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "The user has denied access",
        );
      });
    });

    it("should show generic error when no description provided", async () => {
      mockSearchParams.set("error", "access_denied");

      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "GitHub authorization failed",
        );
      });
    });

    it("should redirect after error with delay", async () => {
      vi.useFakeTimers();
      mockSearchParams.set("error", "access_denied");

      renderComponent();

      vi.advanceTimersByTime(2000);

      expect(window.location.href).toBe("/?tab=private-repo");

      vi.useRealTimers();
    });
  });

  describe("Missing Parameters", () => {
    it("should show error when code is missing", async () => {
      mockSearchParams.set("state", "test-state");
      // No code

      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "Missing authorization parameters. Please try connecting again.",
        );
      });

      expect(window.location.href).toBe("/?tab=private-repo");
    });

    it("should show error when state is missing", async () => {
      mockSearchParams.set("code", "test-code");
      // No state

      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "Missing authorization parameters. Please try connecting again.",
        );
      });
    });
  });

  describe("Successful OAuth Exchange", () => {
    it("should exchange code for token", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(exchangeOAuthCode).toHaveBeenCalledWith(
          "test-code",
          "test-state",
        );
      });
    });

    it("should store user data in localStorage", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(localStorage.getItem("github_user")).toBe(
          JSON.stringify({ github_username: "testuser", id: 123 }),
        );
      });
    });

    it("should store token in localStorage", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(localStorage.getItem("github_token")).toBe("jwt-token");
      });
    });

    it("should clear oauth state from sessionStorage", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");
      sessionStorage.setItem("github_oauth_state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(sessionStorage.getItem("github_oauth_state")).toBeNull();
      });
    });

    it("should show success toast", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(toast.default.success).toHaveBeenCalledWith(
          "Connected as @testuser",
        );
      });
    });

    it("should redirect to private repo tab on success", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      renderComponent();

      await waitFor(() => {
        expect(window.location.href).toBe("/?tab=private-repo");
      });
    });
  });

  describe("Exchange Error", () => {
    it("should show error toast on API failure", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      exchangeOAuthCode.mockRejectedValue(new Error("Exchange failed"));

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith("Exchange failed");
      });
    });

    it("should show error state UI on failure", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockRejectedValue(new Error("Exchange failed"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Connection Failed")).toBeInTheDocument();
      });
    });

    it("should show error description", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockRejectedValue(new Error("Exchange failed"));

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText("An error occurred during authentication."),
        ).toBeInTheDocument();
      });
    });

    it("should show Return to App button on failure", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockRejectedValue(new Error("Exchange failed"));

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Return to App/i }),
        ).toBeInTheDocument();
      });
    });

    it("should redirect when Return to App is clicked", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockRejectedValue(new Error("Exchange failed"));

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Return to App/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Return to App/i }));

      expect(window.location.href).toBe("/?tab=private-repo");
    });
  });

  describe("Styling", () => {
    it("should have proper background", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const bgContainer = container.querySelector(".bg-gray-50");
      expect(bgContainer).toBeInTheDocument();
    });

    it("should be full height", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const fullHeightContainer = container.querySelector(".min-h-screen");
      expect(fullHeightContainer).toBeInTheDocument();
    });
  });

  describe("Double Execution Prevention", () => {
    it("should only process callback once", async () => {
      mockSearchParams.set("code", "test-code");
      mockSearchParams.set("state", "test-state");

      const { exchangeOAuthCode } = await import("../../services/api");
      exchangeOAuthCode.mockResolvedValue({
        user: { github_username: "testuser", id: 123 },
        token: "jwt-token",
      });

      const { rerender } = renderComponent();

      // Rerender to simulate React StrictMode double execution
      rerender(
        <BrowserRouter>
          <GitHubCallback />
        </BrowserRouter>,
      );

      await waitFor(() => {
        // Should only be called once due to useRef guard
        expect(exchangeOAuthCode).toHaveBeenCalledTimes(1);
      });
    });
  });
});
