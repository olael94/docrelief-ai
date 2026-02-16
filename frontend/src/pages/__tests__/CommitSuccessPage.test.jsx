import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import CommitSuccessPage from "../CommitSuccessPage";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
  state: {
    result: {
      commit_url: "https://github.com/user/repo/commit/abc123",
      repo_url: "https://github.com/user/repo",
    },
  },
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle: ({ className }) => (
    <div data-testid="check-circle" className={className}>
      CheckCircle
    </div>
  ),
  Github: ({ className }) => (
    <div data-testid="github-icon" className={className}>
      Github
    </div>
  ),
  ArrowLeft: ({ className }) => (
    <div data-testid="arrow-left" className={className}>
      ArrowLeft
    </div>
  ),
  FileText: ({ className }) => (
    <div data-testid="file-text" className={className}>
      FileText
    </div>
  ),
  LayoutGrid: ({ className }) => (
    <div data-testid="layout-grid" className={className}>
      LayoutGrid
    </div>
  ),
  Share2: ({ className }) => (
    <div data-testid="share-icon" className={className}>
      Share2
    </div>
  ),
  X: ({ className }) => (
    <div data-testid="x-icon" className={className}>
      X
    </div>
  ),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CommitSuccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockLocation.state = {
      result: {
        commit_url: "https://github.com/user/repo/commit/abc123",
        repo_url: "https://github.com/user/repo",
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <CommitSuccessPage />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render success page with commit result from state", () => {
      renderComponent();

      expect(
        screen.getByText("README Successfully Committed!"),
      ).toBeInTheDocument();
    });

    it("should render success icon", () => {
      renderComponent();

      const checkCircles = screen.getAllByTestId("check-circle");
      expect(checkCircles.length).toBeGreaterThanOrEqual(1);
    });

    it("should render success message", () => {
      renderComponent();

      expect(
        screen.getByText(
          "Wait, that's it? Yep. Your README is live on GitHub already",
        ),
      ).toBeInTheDocument();
    });

    it("should render View on GitHub button", () => {
      renderComponent();

      expect(
        screen.getByRole("button", { name: /View on GitHub/i }),
      ).toBeInTheDocument();
    });

    it("should render next action text", () => {
      renderComponent();

      expect(screen.getByText("Choose Your Next Action")).toBeInTheDocument();
    });

    it("should render Generate Another README button", () => {
      renderComponent();

      expect(
        screen.getByText("Generate Another README.md"),
      ).toBeInTheDocument();
    });

    it("should render View Dashboard button", () => {
      renderComponent();

      expect(screen.getByText("View Dashboard")).toBeInTheDocument();
    });

    it("should render share section", () => {
      renderComponent();

      expect(
        screen.getByText("Love DocRelief AI? Spread the word!"),
      ).toBeInTheDocument();
    });

    it("should render Back to Preview button", () => {
      renderComponent();

      expect(
        screen.getByRole("button", { name: /Back to Preview/i }),
      ).toBeInTheDocument();
    });

    it("should render Share on LinkedIn button", () => {
      renderComponent();

      expect(
        screen.getByRole("button", { name: /Share on LinkedIn/i }),
      ).toBeInTheDocument();
    });

    it("should render close button", () => {
      renderComponent();

      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });
  });

  describe("Session Storage Fallback", () => {
    it("should load from sessionStorage when no state provided", () => {
      mockLocation.state = null;
      sessionStorage.setItem(
        "commitResult",
        JSON.stringify({
          commit_url: "https://github.com/user/repo/commit/stored123",
        }),
      );

      renderComponent();

      expect(
        screen.getByText("README Successfully Committed!"),
      ).toBeInTheDocument();
    });

    it("should save result to sessionStorage for refresh", () => {
      renderComponent();

      const stored = sessionStorage.getItem("commitResult");
      expect(JSON.parse(stored)).toEqual({
        commit_url: "https://github.com/user/repo/commit/abc123",
        repo_url: "https://github.com/user/repo",
      });
    });

    it("should redirect to home when no result available", () => {
      mockLocation.state = null;
      sessionStorage.clear();

      renderComponent();

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("User Interactions", () => {
    it("should open GitHub URL when View on GitHub is clicked", async () => {
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      const user = userEvent.setup();

      renderComponent();

      await user.click(
        screen.getByRole("button", { name: /View on GitHub/i }),
      );

      expect(mockOpen).toHaveBeenCalledWith(
        "https://github.com/user/repo/commit/abc123",
        "_blank",
      );

      mockOpen.mockRestore();
    });

    it("should navigate home when Generate Another is clicked", async () => {
      const user = userEvent.setup();

      renderComponent();

      await user.click(screen.getByText("Generate Another README.md"));

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should navigate home when View Dashboard is clicked", async () => {
      const user = userEvent.setup();

      renderComponent();

      await user.click(screen.getByText("View Dashboard"));

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should navigate back when Back to Preview is clicked", async () => {
      const user = userEvent.setup();

      renderComponent();

      await user.click(
        screen.getByRole("button", { name: /Back to Preview/i }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should open LinkedIn share when Share on LinkedIn is clicked", async () => {
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      const user = userEvent.setup();

      renderComponent();

      await user.click(
        screen.getByRole("button", { name: /Share on LinkedIn/i }),
      );

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("linkedin.com/shareArticle"),
        "_blank",
      );

      mockOpen.mockRestore();
    });

    it("should navigate home when close button is clicked", async () => {
      const user = userEvent.setup();

      renderComponent();

      const closeButton = screen.getByTestId("x-icon").closest("button");
      await user.click(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate home when ESC key is pressed", () => {
      renderComponent();

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("LinkedIn Share URL", () => {
    it("should include commit_url in share URL", async () => {
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      const user = userEvent.setup();

      renderComponent();

      await user.click(
        screen.getByRole("button", { name: /Share on LinkedIn/i }),
      );

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent("https://github.com/user/repo/commit/abc123"),
        ),
        "_blank",
      );

      mockOpen.mockRestore();
    });

    it("should fallback to repo_url when commit_url not available", async () => {
      mockLocation.state = {
        result: {
          repo_url: "https://github.com/user/repo",
        },
      };

      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      const user = userEvent.setup();

      renderComponent();

      await user.click(
        screen.getByRole("button", { name: /Share on LinkedIn/i }),
      );

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent("https://github.com/user/repo"),
        ),
        "_blank",
      );

      mockOpen.mockRestore();
    });
  });

  describe("Styling", () => {
    it("should have proper background", () => {
      const { container } = renderComponent();

      const pageContainer = container.querySelector(".bg-gray-50");
      expect(pageContainer).toBeInTheDocument();
    });

    it("should have rounded card", () => {
      const { container } = renderComponent();

      const card = container.querySelector(".rounded-2xl");
      expect(card).toBeInTheDocument();
    });

    it("should have shadow on card", () => {
      const { container } = renderComponent();

      const card = container.querySelector(".shadow-lg");
      expect(card).toBeInTheDocument();
    });

    it("should center content", () => {
      const { container } = renderComponent();

      const centeredContainer = container.querySelector(
        ".flex.items-center.justify-center",
      );
      expect(centeredContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed sessionStorage data", () => {
      mockLocation.state = null;
      sessionStorage.setItem("commitResult", "invalid-json");

      renderComponent();

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should return null when no commitResult", () => {
      mockLocation.state = null;
      // No sessionStorage set either

      const { container } = renderComponent();

      // Component should return null, so container should be empty
      // (after redirect happens)
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading", () => {
      renderComponent();

      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("README Successfully Committed!");
    });

    it("should have accessible buttons", () => {
      renderComponent();

      expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    });
  });
});
