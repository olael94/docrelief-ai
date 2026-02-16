import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import CommitSuccessModal from "../CommitSuccessModal";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Github: ({ className }) => (
    <div data-testid="github-icon" className={className}>
      Github
    </div>
  ),
  FileText: ({ className }) => (
    <div data-testid="filetext-icon" className={className}>
      FileText
    </div>
  ),
  LayoutGrid: ({ className }) => (
    <div data-testid="layoutgrid-icon" className={className}>
      LayoutGrid
    </div>
  ),
  ArrowLeft: ({ className }) => (
    <div data-testid="arrowleft-icon" className={className}>
      ArrowLeft
    </div>
  ),
  Check: ({ className }) => (
    <div data-testid="check-icon" className={className}>
      Check
    </div>
  ),
  X: ({ className }) => (
    <div data-testid="x-icon" className={className}>
      X
    </div>
  ),
}));

describe("CommitSuccessModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    commitData: {
      commit_url: "https://github.com/user/repo/commit/abc123",
      repo_url: "https://github.com/user/repo",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <BrowserRouter>
        <CommitSuccessModal {...defaultProps} {...props} />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render modal when isOpen is true", () => {
      renderModal();

      expect(
        screen.getByText("README Successfully Committed!"),
      ).toBeInTheDocument();
    });

    it("should not render modal when isOpen is false", () => {
      renderModal({ isOpen: false });

      expect(
        screen.queryByText("README Successfully Committed!"),
      ).not.toBeInTheDocument();
    });

    it("should display success message", () => {
      renderModal();

      expect(
        screen.getByText(
          "Wait, that's it? Yep. Your README is live on GitHub already",
        ),
      ).toBeInTheDocument();
    });

    it("should render success icon", () => {
      renderModal();

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("should render View on GitHub link", () => {
      renderModal();

      expect(screen.getByText("View on GitHub")).toBeInTheDocument();
    });

    it("should render action cards", () => {
      renderModal();

      expect(screen.getByText("Generate Another README.md")).toBeInTheDocument();
      expect(screen.getByText("View Dashboard")).toBeInTheDocument();
    });

    it("should render spread the word section", () => {
      renderModal();

      expect(
        screen.getByText("Love DocRelief AI? Spread the word!"),
      ).toBeInTheDocument();
    });

    it("should render Back to Preview button", () => {
      renderModal();

      expect(screen.getByText("Back to Preview")).toBeInTheDocument();
    });

    it("should render Share on LinkedIn button", () => {
      renderModal();

      expect(screen.getByText("Share on LinkedIn")).toBeInTheDocument();
    });
  });

  describe("View on GitHub Link", () => {
    it("should have correct href from commitData", () => {
      renderModal();

      const link = screen.getByText("View on GitHub").closest("a");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/user/repo/commit/abc123",
      );
    });

    it("should open in new tab", () => {
      renderModal();

      const link = screen.getByText("View on GitHub").closest("a");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should fallback to # when no commit_url provided", () => {
      renderModal({ commitData: {} });

      const link = screen.getByText("View on GitHub").closest("a");
      expect(link).toHaveAttribute("href", "#");
    });
  });

  describe("User Interactions", () => {
    it("should call onClose and navigate to dashboard when X button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      const closeButton = screen.getByTestId("x-icon").closest("button");
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should call onClose and navigate to dashboard when backdrop is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      // Find backdrop (first div with fixed positioning)
      const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/50");
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should call onClose and navigate to home when Generate Another is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      await user.click(screen.getByText("Generate Another README.md"));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should call onClose and navigate to dashboard when View Dashboard is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      await user.click(screen.getByText("View Dashboard"));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should call onClose and navigate to preview when Back to Preview is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      await user.click(screen.getByText("Back to Preview"));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/preview");
    });

    it("should open LinkedIn share when Share on LinkedIn is clicked", async () => {
      const user = userEvent.setup();
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      renderModal();

      await user.click(screen.getByText("Share on LinkedIn"));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("linkedin.com/shareArticle"),
        "_blank",
      );
      mockOpen.mockRestore();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call onClose and navigate home when ESC key is pressed", () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should not respond to ESC when modal is closed", () => {
      const onClose = vi.fn();
      renderModal({ isOpen: false, onClose });

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("LinkedIn Share URL", () => {
    it("should use commit_url in share URL when available", async () => {
      const user = userEvent.setup();
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      renderModal();

      await user.click(screen.getByText("Share on LinkedIn"));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent("https://github.com/user/repo/commit/abc123"),
        ),
        "_blank",
      );
      mockOpen.mockRestore();
    });

    it("should fallback to repo_url when commit_url is not available", async () => {
      const user = userEvent.setup();
      const mockOpen = vi.spyOn(window, "open").mockImplementation(() => {});
      renderModal({
        commitData: { repo_url: "https://github.com/user/repo" },
      });

      await user.click(screen.getByText("Share on LinkedIn"));

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
    it("should have backdrop blur effect", () => {
      renderModal();

      const backdrop = document.querySelector(".backdrop-blur-sm");
      expect(backdrop).toBeInTheDocument();
    });

    it("should have green border styling on modal", () => {
      renderModal();

      const modal = document.querySelector(".border-green-500\\/40");
      expect(modal).toBeInTheDocument();
    });

    it("should have green success icon background", () => {
      renderModal();

      const iconContainer = document.querySelector(".bg-green-500");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined commitData", () => {
      renderModal({ commitData: undefined });

      expect(
        screen.getByText("README Successfully Committed!"),
      ).toBeInTheDocument();
    });

    it("should handle null commitData", () => {
      renderModal({ commitData: null });

      expect(
        screen.getByText("README Successfully Committed!"),
      ).toBeInTheDocument();
    });

    it("should stop propagation when clicking modal content", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      // Click on modal content (not backdrop)
      const modalContent = screen
        .getByText("README Successfully Committed!")
        .closest(".relative");
      await user.click(modalContent);

      // onClose should not be called when clicking inside modal
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
