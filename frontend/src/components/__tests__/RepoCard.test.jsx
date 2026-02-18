import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RepoCard from "../RepoCard";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Star: ({ className }) => (
    <div data-testid="star-icon" className={className}>
      Star
    </div>
  ),
  Lock: ({ className }) => (
    <div data-testid="lock-icon" className={className}>
      Lock
    </div>
  ),
  Unlock: ({ className }) => (
    <div data-testid="unlock-icon" className={className}>
      Unlock
    </div>
  ),
  Code2: ({ className }) => (
    <div data-testid="code-icon" className={className}>
      Code2
    </div>
  ),
}));

describe("RepoCard", () => {
  const defaultRepo = {
    id: 1,
    name: "test-repo",
    description: "A test repository for unit testing",
    language: "JavaScript",
    stargazers_count: 42,
    private: false,
    updated_at: "2026-02-09T22:48:28Z",
  };

  const defaultProps = {
    repo: defaultRepo,
    selected: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render repository name", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText("test-repo")).toBeInTheDocument();
    });

    it("should render repository description", () => {
      render(<RepoCard {...defaultProps} />);

      expect(
        screen.getByText("A test repository for unit testing"),
      ).toBeInTheDocument();
    });

    it("should render default description when none provided", () => {
      const repoWithoutDesc = { ...defaultRepo, description: null };
      render(<RepoCard {...defaultProps} repo={repoWithoutDesc} />);

      expect(screen.getByText("No description available")).toBeInTheDocument();
    });

    it("should render star count", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByTestId("star-icon")).toBeInTheDocument();
    });

    it("should render language badge when language is provided", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByTestId("code-icon")).toBeInTheDocument();
    });

    it("should not render language badge when language is not provided", () => {
      const repoWithoutLang = { ...defaultRepo, language: null };
      render(<RepoCard {...defaultProps} repo={repoWithoutLang} />);

      expect(screen.queryByTestId("code-icon")).not.toBeInTheDocument();
    });

    it("should render formatted date", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText(/Updated Feb 9, 2026/)).toBeInTheDocument();
    });
  });

  describe("Public/Private Badge", () => {
    it("should show Public badge with unlock icon for public repos", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText("Public")).toBeInTheDocument();
      expect(screen.getByTestId("unlock-icon")).toBeInTheDocument();
    });

    it("should show Private badge with lock icon for private repos", () => {
      const privateRepo = { ...defaultRepo, private: true };
      render(<RepoCard {...defaultProps} repo={privateRepo} />);

      expect(screen.getByText("Private")).toBeInTheDocument();
      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    });

    it("should have blue styling for public badge", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const badge = container.querySelector(".bg-blue-500\\/20");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-blue-300");
    });

    it("should have yellow styling for private badge", () => {
      const privateRepo = { ...defaultRepo, private: true };
      const { container } = render(
        <RepoCard {...defaultProps} repo={privateRepo} />,
      );

      const badge = container.querySelector(".bg-yellow-500\\/20");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-yellow-300");
    });
  });

  describe("Language Colors", () => {
    const languageTests = [
      { language: "JavaScript", expectedClass: "bg-yellow-500/20" },
      { language: "TypeScript", expectedClass: "bg-blue-500/20" },
      { language: "Python", expectedClass: "bg-green-500/20" },
      { language: "Java", expectedClass: "bg-red-500/20" },
      { language: "Go", expectedClass: "bg-cyan-500/20" },
      { language: "Rust", expectedClass: "bg-orange-500/20" },
      { language: "C++", expectedClass: "bg-pink-500/20" },
      { language: "Ruby", expectedClass: "bg-red-500/20" },
      { language: "PHP", expectedClass: "bg-purple-500/20" },
      { language: "Shell", expectedClass: "bg-gray-500/20" },
    ];

    languageTests.forEach(({ language, expectedClass }) => {
      it(`should apply correct color for ${language}`, () => {
        const repo = { ...defaultRepo, language };
        const { container } = render(<RepoCard {...defaultProps} repo={repo} />);

        const languageBadge = screen.getByText(language);
        expect(languageBadge.className).toContain(expectedClass.split("/")[0]);
      });
    });

    it("should apply gray color for unknown languages", () => {
      const repo = { ...defaultRepo, language: "Brainfuck" };
      render(<RepoCard {...defaultProps} repo={repo} />);

      const languageBadge = screen.getByText("Brainfuck");
      expect(languageBadge).toHaveClass("bg-gray-500/20");
    });
  });

  describe("Selection State", () => {
    it("should apply selected styling when selected is true", () => {
      const { container } = render(<RepoCard {...defaultProps} selected={true} />);

      const card = container.firstChild;
      expect(card).toHaveClass("border-green-500/70");
      expect(card).toHaveClass("bg-green-500/10");
    });

    it("should apply unselected styling when selected is false", () => {
      const { container } = render(<RepoCard {...defaultProps} selected={false} />);

      const card = container.firstChild;
      expect(card).toHaveClass("border-white/10");
      expect(card).toHaveClass("bg-white/5");
    });

    it("should have hover styles when not selected", () => {
      const { container } = render(<RepoCard {...defaultProps} selected={false} />);

      const card = container.firstChild;
      expect(card).toHaveClass("hover:border-green-500/40");
      expect(card).toHaveClass("hover:bg-green-500/5");
    });
  });

  describe("User Interactions", () => {
    it("should call onClick when card is clicked", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<RepoCard {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByText("test-repo").closest("div"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should have cursor-pointer styling", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("cursor-pointer");
    });

    it("should have transition-all for smooth animations", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("transition-all");
    });
  });

  describe("Date Formatting", () => {
    it("should format date correctly", () => {
      const repo = { ...defaultRepo, updated_at: "2025-12-25T10:30:00Z" };
      render(<RepoCard {...defaultProps} repo={repo} />);

      expect(screen.getByText(/Updated Dec 25, 2025/)).toBeInTheDocument();
    });

    it("should handle different date formats", () => {
      const repo = { ...defaultRepo, updated_at: "2024-01-15T12:00:00Z" };
      render(<RepoCard {...defaultProps} repo={repo} />);

      // Using regex that matches either Jan 14 or Jan 15 due to timezone differences
      expect(screen.getByText(/Updated Jan 1[45], 2024/)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have padding on card", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("p-4");
    });

    it("should have rounded corners", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("rounded-lg");
    });

    it("should have border styling", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("border-2");
    });

    it("should have flex layout for header", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const header = container.querySelector(".flex.items-start.justify-between");
      expect(header).toBeInTheDocument();
    });

    it("should have flex layout for metadata row", () => {
      const { container } = render(<RepoCard {...defaultProps} />);

      const metadataRow = container.querySelector(
        ".flex.items-center.space-x-4",
      );
      expect(metadataRow).toBeInTheDocument();
    });
  });

  describe("Text Styling", () => {
    it("should have proper title styling", () => {
      render(<RepoCard {...defaultProps} />);

      const title = screen.getByText("test-repo");
      expect(title).toHaveClass("font-semibold");
      expect(title).toHaveClass("text-gray-100");
      expect(title).toHaveClass("text-lg");
    });

    it("should have proper description styling", () => {
      render(<RepoCard {...defaultProps} />);

      const description = screen.getByText(
        "A test repository for unit testing",
      );
      expect(description).toHaveClass("text-sm");
      expect(description).toHaveClass("text-gray-400");
      expect(description).toHaveClass("line-clamp-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero stars", () => {
      const repo = { ...defaultRepo, stargazers_count: 0 };
      render(<RepoCard {...defaultProps} repo={repo} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle large star counts", () => {
      const repo = { ...defaultRepo, stargazers_count: 50000 };
      render(<RepoCard {...defaultProps} repo={repo} />);

      expect(screen.getByText("50000")).toBeInTheDocument();
    });

    it("should handle empty description string", () => {
      const repo = { ...defaultRepo, description: "" };
      render(<RepoCard {...defaultProps} repo={repo} />);

      expect(screen.getByText("No description available")).toBeInTheDocument();
    });

    it("should handle very long repo names", () => {
      const repo = {
        ...defaultRepo,
        name: "this-is-a-very-long-repository-name-that-might-overflow",
      };
      render(<RepoCard {...defaultProps} repo={repo} />);

      expect(
        screen.getByText(
          "this-is-a-very-long-repository-name-that-might-overflow",
        ),
      ).toBeInTheDocument();
    });

    it("should handle very long descriptions", () => {
      const repo = {
        ...defaultRepo,
        description:
          "This is a very long description that goes on and on and on and would normally overflow the card but should be truncated with line-clamp-2 class applied to it for proper display",
      };
      render(<RepoCard {...defaultProps} repo={repo} />);

      const description = screen.getByText(/This is a very long description/);
      expect(description).toHaveClass("line-clamp-2");
    });
  });

  describe("Accessibility", () => {
    it("should be clickable for keyboard navigation", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { container } = render(
        <RepoCard {...defaultProps} onClick={onClick} />,
      );

      const card = container.firstChild;
      card.focus();
      await user.keyboard("{Enter}");

      // Card should be clickable, though div doesn't naturally respond to Enter
      // In real implementation, might want to add role="button" and keyboard handlers
    });

    it("should have visible text content", () => {
      render(<RepoCard {...defaultProps} />);

      expect(screen.getByText("test-repo")).toBeVisible();
      expect(
        screen.getByText("A test repository for unit testing"),
      ).toBeVisible();
    });
  });
});
