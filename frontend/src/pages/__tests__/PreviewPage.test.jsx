import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import PreviewPage from "../PreviewPage";

// Mock react-router-dom
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
  getReadme: vi.fn(),
  pollReadmeStatus: vi.fn(),
  updateReadmeDownloaded: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Download: ({ className }) => (
    <div data-testid="download-icon" className={className}>
      Download
    </div>
  ),
  RefreshCw: ({ className }) => (
    <div data-testid="refresh-icon" className={className}>
      RefreshCw
    </div>
  ),
  Github: ({ className }) => (
    <div data-testid="github-icon" className={className}>
      Github
    </div>
  ),
  CheckCircle: ({ className }) => (
    <div data-testid="check-circle" className={className}>
      CheckCircle
    </div>
  ),
}));

// Mock EditorPanel
vi.mock("../../components/EditorPanel", () => ({
  default: ({ content, onChange, disabled, onEditorMount, onScroll }) => (
    <div data-testid="editor-panel" data-disabled={disabled}>
      <textarea
        data-testid="editor-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  ),
}));

// Mock PreviewPanel
vi.mock("../../components/PreviewPanel", () => ({
  default: ({ content, isLoading, previewRef }) => (
    <div
      data-testid="preview-panel"
      data-loading={isLoading}
      ref={previewRef}
    >
      {content}
    </div>
  ),
}));

describe("PreviewPage", () => {
  let originalLocation;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = {
      href: "/preview/test-readme-id",
      pathname: "/preview/test-readme-id",
      search: "",
    };

    // Mock URL methods
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:test-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location = originalLocation;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PreviewPage />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render the page", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
      });
    });

    it("should render editor and preview panels", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
        expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
      });
    });

    it("should render repository URL display", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText("https://github.com/user/repo"),
        ).toBeInTheDocument();
      });
    });

    it("should render Change Repository button", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Change Repository/i }),
        ).toBeInTheDocument();
      });
    });

    it("should render action buttons", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Regenerate/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Download/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Commit/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading state while fetching", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(
        screen.getByText("Loading repository..."),
      ).toBeInTheDocument();
    });

    it("should pass loading state to preview panel", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByTestId("preview-panel")).toHaveAttribute(
        "data-loading",
        "true",
      );
    });
  });

  describe("Empty Editor (No ID)", () => {
    it("should show empty editor when no ID", async () => {
      window.location.pathname = "/preview/preview";

      const { getReadme } = await import("../../services/api");

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
      });

      // getReadme should not be called for 'preview' ID
      expect(getReadme).not.toHaveBeenCalled();
    });
  });

  describe("Error State", () => {
    it("should show error page when README not found", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockRejectedValue(new Error("Not found"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("README Not Found")).toBeInTheDocument();
      });
    });

    it("should show Go Back Home button on error", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockRejectedValue(new Error("Not found"));

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Go Back Home/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Content Loading", () => {
    it("should load and display README content", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# My README Content",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-textarea")).toHaveValue(
          "# My README Content",
        );
      });
    });

    it("should poll for pending status", async () => {
      const { getReadme, pollReadmeStatus } = await import(
        "../../services/api"
      );
      getReadme.mockResolvedValue({
        status: "pending",
      });
      pollReadmeStatus.mockResolvedValue({
        status: "completed",
        readme_content: "# Completed README",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(pollReadmeStatus).toHaveBeenCalled();
      });
    });

    it("should show success indicator when loaded", async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test",
        repo_url: "https://github.com/user/repo",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      });
    });
  });

  describe("User Interactions", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });
    });

    it("should allow editing content", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-textarea")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("editor-textarea");
      await user.clear(textarea);
      await user.type(textarea, "# New Content");

      expect(textarea).toHaveValue("# New Content");
    });

    it("should navigate home when Change Repository is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Change Repository/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Change Repository/i }),
      );

      expect(window.location.href).toBe("/");
    });

    it("should navigate to commit page when Commit is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Commit/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/commit", expect.any(Object));
    });
  });

  describe("Download", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/testrepo",
      });
    });

    it("should create download when Download is clicked", async () => {
      const user = userEvent.setup();
      const mockClick = vi.fn();
      const mockCreateElement = vi.spyOn(document, "createElement");

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Download/i }),
        ).toBeInTheDocument();
      });

      // Mock the anchor element
      const mockAnchor = {
        href: "",
        download: "",
        click: mockClick,
      };
      mockCreateElement.mockReturnValue(mockAnchor);

      await user.click(screen.getByRole("button", { name: /Download/i }));

      expect(URL.createObjectURL).toHaveBeenCalled();

      mockCreateElement.mockRestore();
    });

    it("should show success toast on download", async () => {
      const toast = await import("react-hot-toast");
      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Download/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Download/i }));

      expect(toast.default.success).toHaveBeenCalledWith(
        "README download started!",
        expect.any(Object),
      );
    });

    it("should update download tracking", async () => {
      const { updateReadmeDownloaded } = await import("../../services/api");
      updateReadmeDownloaded.mockResolvedValue({});

      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Download/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Download/i }));

      await waitFor(() => {
        expect(updateReadmeDownloaded).toHaveBeenCalled();
      });
    });
  });

  describe("Regenerate", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test README",
        repo_url: "https://github.com/user/repo",
      });
    });

    it("should regenerate README when Regenerate is clicked", async () => {
      const { generateReadme, pollReadmeStatus } = await import(
        "../../services/api"
      );
      generateReadme.mockResolvedValue({ id: "new-readme-id" });
      pollReadmeStatus.mockResolvedValue({
        readme_content: "# Regenerated README",
      });

      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Regenerate/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Regenerate/i }));

      await waitFor(() => {
        expect(generateReadme).toHaveBeenCalledWith(
          "https://github.com/user/repo",
        );
      });
    });

    it("should disable button while regenerating", async () => {
      const { generateReadme } = await import("../../services/api");
      generateReadme.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Regenerate/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Regenerate/i }));

      expect(
        screen.getByRole("button", { name: /Regenerate/i }),
      ).toBeDisabled();
    });
  });

  describe("Commit Validation", () => {
    it("should show error when committing with preview ID", async () => {
      window.location.pathname = "/preview/preview";
      const toast = await import("react-hot-toast");

      const user = userEvent.setup();

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Commit/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Commit/i }));

      expect(toast.default.error).toHaveBeenCalledWith(
        "Please generate a README first",
      );
    });
  });

  describe("Styling", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test",
        repo_url: "https://github.com/user/repo",
      });
    });

    it("should have proper page layout", async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
      });

      const pageContainer = container.querySelector(".min-h-screen");
      expect(pageContainer).toBeInTheDocument();
    });

    it("should have grid layout for panels", async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
      });

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
    });

    it("should have green border on panels", async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
      });

      const borderedPanels = container.querySelectorAll(
        ".border-green-500\\/40",
      );
      expect(borderedPanels.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      const { getReadme } = await import("../../services/api");
      getReadme.mockResolvedValue({
        status: "completed",
        readme_content: "# Test",
        repo_url: "https://github.com/user/repo",
      });
    });

    it("should have accessible buttons", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
      });
    });
  });
});
