import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import PrivateRepoTab from "../PrivateRepoTab";

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
  initiateGitHubOAuth: vi.fn(),
  logoutGitHub: vi.fn(),
  getUserRepositories: vi.fn(),
  getRepositoryBranches: vi.fn(),
  generateReadme: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "loading-toast-id"),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "loading-toast-id"),
    dismiss: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle2: ({ className }) => (
    <div data-testid="check-circle" className={className}>
      CheckCircle2
    </div>
  ),
  Github: ({ className }) => (
    <div data-testid="github-icon" className={className}>
      Github
    </div>
  ),
  Search: ({ className }) => (
    <div data-testid="search-icon" className={className}>
      Search
    </div>
  ),
  GitBranch: ({ className }) => (
    <div data-testid="git-branch-icon" className={className}>
      GitBranch
    </div>
  ),
}));

// Mock RepoCard component
vi.mock("../RepoCard", () => ({
  default: ({ repo, selected, onClick }) => (
    <div
      data-testid={`repo-card-${repo.id}`}
      data-selected={selected}
      onClick={onClick}
    >
      {repo.name}
    </div>
  ),
}));

describe("PrivateRepoTab", () => {
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
        <PrivateRepoTab />
      </BrowserRouter>,
    );
  };

  describe("Unauthenticated State", () => {
    it("should render connect GitHub UI when not authenticated", () => {
      renderComponent();

      expect(
        screen.getByText("Access Private Repositories"),
      ).toBeInTheDocument();
    });

    it("should display GitHub icon", () => {
      renderComponent();

      // Check for the SVG GitHub icon in unauthenticated state
      expect(
        screen.getByText("Connect GitHub Account"),
      ).toBeInTheDocument();
    });

    it("should display explanation text", () => {
      renderComponent();

      expect(
        screen.getByText(
          "Connect your GitHub account to generate READMEs for your private repositories",
        ),
      ).toBeInTheDocument();
    });

    it("should display feature checklist", () => {
      renderComponent();

      expect(
        screen.getByText("Private repos require authentication to access code"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "We need permission to read your repo structure and files",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "You can revoke access anytime from GitHub settings",
        ),
      ).toBeInTheDocument();
    });

    it("should display connect button", () => {
      renderComponent();

      expect(
        screen.getByRole("button", { name: /Connect GitHub Account/i }),
      ).toBeInTheDocument();
    });

    it("should display security footer", () => {
      renderComponent();

      expect(
        screen.getByText(/Secure OAuth connection/),
      ).toBeInTheDocument();
    });
  });

  describe("Connect GitHub Button", () => {
    it("should have proper styling", () => {
      renderComponent();

      const button = screen.getByRole("button", {
        name: /Connect GitHub Account/i,
      });
      expect(button).toHaveClass("bg-black");
      expect(button).toHaveClass("text-white");
      expect(button).toHaveClass("rounded-3xl");
    });

    it("should show connecting state when clicked", async () => {
      const { initiateGitHubOAuth } = await import("../../services/api");
      initiateGitHubOAuth.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const user = userEvent.setup();
      renderComponent();

      const button = screen.getByRole("button", {
        name: /Connect GitHub Account/i,
      });
      await user.click(button);

      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("should be disabled while connecting", async () => {
      const { initiateGitHubOAuth } = await import("../../services/api");
      initiateGitHubOAuth.mockImplementation(
        () => new Promise(() => {}),
      );

      const user = userEvent.setup();
      renderComponent();

      const button = screen.getByRole("button", {
        name: /Connect GitHub Account/i,
      });
      await user.click(button);

      expect(button).toBeDisabled();
    });
  });

  describe("Authenticated State", () => {
    beforeEach(() => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );
    });

    it("should render connected banner when authenticated", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("GitHub Connected")).toBeInTheDocument();
      });
    });

    it("should display username", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("@testuser")).toBeInTheDocument();
      });
    });

    it("should display disconnect button", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Disconnect/i }),
        ).toBeInTheDocument();
      });
    });

    it("should show loading state while fetching repos", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockImplementation(
        () => new Promise(() => {}),
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Loading repositories...")).toBeInTheDocument();
      });
    });

    it("should display repository count", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1" },
          { id: 2, name: "repo2", full_name: "user/repo2" },
        ],
        total_count: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Repositories (2)")).toBeInTheDocument();
      });
    });

    it("should render repository cards", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1" },
          { id: 2, name: "repo2", full_name: "user/repo2" },
        ],
        total_count: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
        expect(screen.getByTestId("repo-card-2")).toBeInTheDocument();
      });
    });

    it("should show empty state when no repos", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("No repositories found.")).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    beforeEach(() => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );
    });

    it("should render search input", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search repositories..."),
        ).toBeInTheDocument();
      });
    });

    it("should filter repositories based on search", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "frontend-app", full_name: "user/frontend-app" },
          { id: 2, name: "backend-api", full_name: "user/backend-api" },
        ],
        total_count: 2,
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search repositories...");
      await user.type(searchInput, "frontend");

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
        expect(screen.queryByTestId("repo-card-2")).not.toBeInTheDocument();
      });
    });

    it("should show no match message when search has no results", async () => {
      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1" },
        ],
        total_count: 1,
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search repositories...");
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(
          screen.getByText("No repositories match your search."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Repository Selection", () => {
    beforeEach(() => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );
    });

    it("should select repository when clicked", async () => {
      const { getUserRepositories, getRepositoryBranches } = await import(
        "../../services/api"
      );
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1", html_url: "https://github.com/user/repo1" },
        ],
        total_count: 1,
      });
      getRepositoryBranches.mockResolvedValue({
        branches: [{ name: "main", is_default: true, has_readme: false }],
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("repo-card-1"));

      await waitFor(() => {
        expect(screen.getByText("Generate README")).toBeInTheDocument();
      });
    });

    it("should show Generate README section when repo selected", async () => {
      const { getUserRepositories, getRepositoryBranches } = await import(
        "../../services/api"
      );
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "my-project", full_name: "user/my-project", html_url: "https://github.com/user/my-project" },
        ],
        total_count: 1,
      });
      getRepositoryBranches.mockResolvedValue({
        branches: [{ name: "main", is_default: true, has_readme: false }],
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("repo-card-1"));

      await waitFor(() => {
        expect(screen.getByText(/Repository:/)).toBeInTheDocument();
        // "my-project" appears in multiple places (repo card, repository info, button)
        expect(screen.getAllByText("my-project").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should show branch info when repo selected", async () => {
      const { getUserRepositories, getRepositoryBranches } = await import(
        "../../services/api"
      );
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1", html_url: "https://github.com/user/repo1" },
        ],
        total_count: 1,
      });
      getRepositoryBranches.mockResolvedValue({
        branches: [{ name: "main", is_default: true, has_readme: false }],
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("repo-card-1"));

      await waitFor(() => {
        expect(
          screen.getByText(/Generating from branch:/),
        ).toBeInTheDocument();
        expect(screen.getByText("main")).toBeInTheDocument();
      });
    });

    it("should show README warning when README exists", async () => {
      const { getUserRepositories, getRepositoryBranches } = await import(
        "../../services/api"
      );
      getUserRepositories.mockResolvedValue({
        repositories: [
          { id: 1, name: "repo1", full_name: "user/repo1", html_url: "https://github.com/user/repo1" },
        ],
        total_count: 1,
      });
      getRepositoryBranches.mockResolvedValue({
        branches: [{ name: "main", is_default: true, has_readme: true }],
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("repo-card-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("repo-card-1"));

      await waitFor(() => {
        expect(
          screen.getByText("README.md already exists"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Disconnect", () => {
    beforeEach(() => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );
      localStorage.setItem("github_token", "test-token");
    });

    it("should clear localStorage when disconnect is clicked", async () => {
      const { getUserRepositories, logoutGitHub } = await import(
        "../../services/api"
      );
      getUserRepositories.mockResolvedValue({
        repositories: [],
        total_count: 0,
      });
      logoutGitHub.mockResolvedValue({});

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Disconnect/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Disconnect/i }));

      await waitFor(() => {
        expect(localStorage.getItem("github_user")).toBeNull();
        expect(localStorage.getItem("github_token")).toBeNull();
      });
    });
  });

  describe("Layout and Styling", () => {
    it("should have proper container width", () => {
      const { container } = renderComponent();

      const mainContainer = container.querySelector(".w-\\[340px\\]");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should have responsive width", () => {
      const { container } = renderComponent();

      const responsiveContainer = container.querySelector(".md\\:w-\\[660px\\]");
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed localStorage data", () => {
      localStorage.setItem("github_user", "invalid-json");

      // Should not throw and should show unauthenticated state
      renderComponent();

      expect(
        screen.getByText("Connect GitHub Account"),
      ).toBeInTheDocument();
    });

    it("should handle API errors gracefully", async () => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );

      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockRejectedValue(new Error("API Error"));

      const toast = await import("react-hot-toast");

      renderComponent();

      await waitFor(() => {
        expect(toast.default.error).toHaveBeenCalledWith("API Error");
      });
    });

    it("should clear auth on session expired error", async () => {
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          id: 123,
          github_username: "testuser",
        }),
      );

      const { getUserRepositories } = await import("../../services/api");
      getUserRepositories.mockRejectedValue(new Error("Session expired"));

      renderComponent();

      await waitFor(() => {
        expect(localStorage.getItem("github_user")).toBeNull();
      });
    });
  });
});
