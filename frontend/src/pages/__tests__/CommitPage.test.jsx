import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import CommitPage from "../CommitPage";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
  state: { readmeId: "test-readme-id" },
  search: "",
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
  getReadme: vi.fn(),
  commitReadme: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: ({ className }) => (
    <div data-testid="loader" className={className}>
      Loading
    </div>
  ),
  GitPullRequest: ({ className }) => (
    <div data-testid="git-pr-icon" className={className}>
      GitPullRequest
    </div>
  ),
  GitBranch: ({ className }) => (
    <div data-testid="git-branch-icon" className={className}>
      GitBranch
    </div>
  ),
  FileText: ({ className }) => (
    <div data-testid="file-icon" className={className}>
      FileText
    </div>
  ),
  Info: ({ className }) => (
    <div data-testid="info-icon" className={className}>
      Info
    </div>
  ),
  ArrowLeft: ({ className }) => (
    <div data-testid="arrow-left-icon" className={className}>
      ArrowLeft
    </div>
  ),
  Check: ({ className }) => (
    <div data-testid="check-icon" className={className}>
      Check
    </div>
  ),
}));

// Mock CommitSuccessModal
vi.mock("../../components/CommitSuccessModal", () => ({
  default: ({ isOpen, onClose, commitData }) => (
    isOpen ? (
      <div data-testid="success-modal">
        Success Modal - {commitData?.commit_url}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

describe("CommitPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <CommitPage />
      </BrowserRouter>,
    );
  };

  describe("Loading State", () => {
    it("should show loading state initially", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByText("Loading commit details...")).toBeInTheDocument();
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("should have proper loading styling", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockImplementation(() => new Promise(() => {}));

      const { container } = renderComponent();

      const loadingContainer = container.querySelector(".page-gradient");
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error when no readme ID provided", async () => {
      mockLocation.state = null;
      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith("No README ID provided");
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });

      mockLocation.state = { readmeId: "test-readme-id" }; // Reset
    });

    it("should show error page when README not found", async () => {
      mockLocation.state = { readmeId: "test-readme-id" };
      const { getReadme } = await import("../../services/api");
      getReadme.mockRejectedValue(new Error("README not found"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("README Not Found")).toBeInTheDocument();
      });
    });

    it("should show Go Back Home button on error", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockRejectedValue(new Error("Error"));

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Go Back Home/i }),
        ).toBeInTheDocument();
      });
    });

    it("should navigate home when Go Back Home is clicked", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockRejectedValue(new Error("Error"));

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Go Back Home/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Go Back Home/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Non-GitHub Auth Redirect", () => {
    it("should redirect if input_method is not github_auth", async () => {
      const { getReadme } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      getReadme.mockResolvedValue({
        input_method: "public_url",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "Only GitHub OAuth READMEs can be committed directly.",
        );
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("Successful Load", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/testuser/testrepo",
        branch: "main",
        readme_content: "# Test README",
      });
    });

    it("should display commit details header", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Commit Details")).toBeInTheDocument();
      });
    });

    it("should display commit message field", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Commit Message")).toBeInTheDocument();
      });
    });

    it("should pre-fill commit message", async () => {
      renderComponent();

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          "Add comprehensive README.md via DocRelief AI",
        );
        expect(input).toHaveValue(
          "Add comprehensive README.md via DocRelief AI",
        );
      });
    });

    it("should display extended description field", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText("Extended Description (Optional)"),
        ).toBeInTheDocument();
      });
    });

    it("should display target branch info", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Target Branch")).toBeInTheDocument();
        expect(screen.getByText("main")).toBeInTheDocument();
      });
    });

    it("should display changes section", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText("Changes to be committed:"),
        ).toBeInTheDocument();
        expect(screen.getByText("README.md")).toBeInTheDocument();
      });
    });

    it("should display repo owner and name", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("testuser/testrepo")).toBeInTheDocument();
      });
    });

    it("should display info message about overwrite", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText(/This will create a new README.md file/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Inputs", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
        branch: "main",
      });
    });

    it("should allow editing commit message", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText("Commit Message")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("Commit Message");
      await user.clear(input);
      await user.type(input, "New commit message");

      expect(input).toHaveValue("New commit message");
    });

    it("should show character count", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/\/200 characters/)).toBeInTheDocument();
      });
    });

    it("should highlight when approaching limit", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText("Commit Message")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("Commit Message");
      await user.clear(input);
      await user.type(input, "A".repeat(185));

      expect(screen.getByText("185/200 characters")).toHaveClass(
        "text-orange-400",
      );
    });

    it("should allow editing extended description", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByLabelText("Extended Description (Optional)"),
        ).toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(
        "Extended Description (Optional)",
      );
      await user.clear(textarea);
      await user.type(textarea, "Custom description");

      expect(textarea).toHaveValue("Custom description");
    });
  });

  describe("Action Buttons", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
        branch: "main",
      });
    });

    it("should display Back to Preview button", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Back to Preview/i }),
        ).toBeInTheDocument();
      });
    });

    it("should display Commit to GitHub button", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit to GitHub/i }),
        ).toBeInTheDocument();
      });
    });

    it("should navigate back when Back to Preview is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Back to Preview/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Back to Preview/i }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should disable commit button when commit message is empty", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText("Commit Message")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("Commit Message");
      await user.clear(input);

      expect(
        screen.getByRole("button", { name: /Commit to GitHub/i }),
      ).toBeDisabled();
    });

    it("should have maxLength of 200 on commit message input", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText("Commit Message")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("Commit Message");
      expect(input).toHaveAttribute("maxLength", "200");
    });
  });

  describe("Commit Submission", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
        branch: "main",
      });

      localStorage.setItem(
        "github_user",
        JSON.stringify({ id: 123, github_username: "testuser" }),
      );
    });

    it("should show committing state when submitting", async () => {
      const { commitReadme } = await import("../../services/api");
      commitReadme.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit to GitHub/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Commit to GitHub/i }),
      );

      expect(screen.getByText("Committing...")).toBeInTheDocument();
    });

    it("should show success modal on successful commit", async () => {
      const { commitReadme } = await import("../../services/api");
      commitReadme.mockResolvedValue({
        commit_url: "https://github.com/user/repo/commit/abc123",
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit to GitHub/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Commit to GitHub/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("success-modal")).toBeInTheDocument();
      });
    });

    it("should show error when not authenticated", async () => {
      localStorage.removeItem("github_user");
      const toast = await import("react-hot-toast");

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit to GitHub/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Commit to GitHub/i }),
      );

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith(
          "Please authenticate with GitHub first",
        );
      });
    });

    it("should handle commit API errors", async () => {
      const { commitReadme } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      commitReadme.mockRejectedValue({
        response: { data: { detail: "Commit failed" } },
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit to GitHub/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Commit to GitHub/i }),
      );

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith("Commit failed");
      });
    });
  });

  describe("Session Storage", () => {
    it("should save readmeId to sessionStorage", async () => {
      mockLocation.state = { readmeId: "persist-readme-id" };
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(sessionStorage.getItem("commitReadmeId")).toBe(
          "persist-readme-id",
        );
      });

      mockLocation.state = { readmeId: "test-readme-id" }; // Reset
    });

    it("should load readmeId from sessionStorage if not in state", async () => {
      mockLocation.state = null;
      sessionStorage.setItem("commitReadmeId", "stored-readme-id");

      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(getReadme).toHaveBeenCalledWith("stored-readme-id");
      });

      mockLocation.state = { readmeId: "test-readme-id" }; // Reset
    });
  });

  describe("Styling", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        input_method: "github_auth",
        repo_url: "https://github.com/user/repo",
        branch: "main",
      });
    });

    it("should have proper page gradient background", async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Commit Details")).toBeInTheDocument();
      });

      const pageContainer = container.querySelector(".page-gradient");
      expect(pageContainer).toBeInTheDocument();
    });

    it("should have proper card styling", async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Commit Details")).toBeInTheDocument();
      });

      const card = container.querySelector(".border-green-500\\/40");
      expect(card).toBeInTheDocument();
    });
  });
});
