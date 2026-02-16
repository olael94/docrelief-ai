import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TabBar from "../TabBar";

describe("TabBar", () => {
  const mockTabs = [
    { id: "upload", label: "Upload" },
    { id: "github-public", label: "GitHub Public" },
    { id: "github-private", label: "GitHub Private" },
  ];

  const defaultProps = {
    activeTab: "upload",
    setActiveTab: vi.fn(),
    tabs: mockTabs,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all tabs", () => {
      render(<TabBar {...defaultProps} />);

      expect(screen.getByText("Upload")).toBeInTheDocument();
      expect(screen.getByText("GitHub Public")).toBeInTheDocument();
      expect(screen.getByText("GitHub Private")).toBeInTheDocument();
    });

    it("should render sliding background indicator", () => {
      const { container } = render(<TabBar {...defaultProps} />);

      const indicator = container.querySelector(".border-green-500\\/50");
      expect(indicator).toBeInTheDocument();
    });

    it("should highlight active tab", () => {
      render(<TabBar {...defaultProps} activeTab="github-public" />);

      const publicTab = screen.getByRole("button", { name: "GitHub Public" });
      expect(publicTab).toHaveClass("text-green-400");
      expect(publicTab).toHaveClass("font-bold");
    });

    it("should style inactive tabs differently", () => {
      render(<TabBar {...defaultProps} activeTab="upload" />);

      const publicTab = screen.getByRole("button", { name: "GitHub Public" });
      expect(publicTab).toHaveClass("text-gray-400");
      expect(publicTab).toHaveClass("font-medium");
    });
  });

  describe("User Interactions", () => {
    it("should call setActiveTab when a tab is clicked", async () => {
      const user = userEvent.setup();
      const setActiveTab = vi.fn();

      render(<TabBar {...defaultProps} setActiveTab={setActiveTab} />);

      await user.click(screen.getByRole("button", { name: "GitHub Public" }));

      expect(setActiveTab).toHaveBeenCalledTimes(1);
      expect(setActiveTab).toHaveBeenCalledWith("github-public");
    });

    it("should handle clicking active tab", async () => {
      const user = userEvent.setup();
      const setActiveTab = vi.fn();

      render(<TabBar {...defaultProps} setActiveTab={setActiveTab} />);

      await user.click(screen.getByRole("button", { name: "Upload" }));

      expect(setActiveTab).toHaveBeenCalledWith("upload");
    });

    it("should handle clicking different tabs sequentially", async () => {
      const user = userEvent.setup();
      const setActiveTab = vi.fn();

      render(<TabBar {...defaultProps} setActiveTab={setActiveTab} />);

      await user.click(screen.getByRole("button", { name: "GitHub Public" }));
      await user.click(screen.getByRole("button", { name: "GitHub Private" }));

      expect(setActiveTab).toHaveBeenCalledTimes(2);
      expect(setActiveTab).toHaveBeenNthCalledWith(1, "github-public");
      expect(setActiveTab).toHaveBeenNthCalledWith(2, "github-private");
    });
  });

  describe("Indicator Position", () => {
    it("should position indicator based on active tab index", () => {
      const { container } = render(
        <TabBar {...defaultProps} activeTab="github-public" />,
      );

      const indicator = container.querySelector(".border-green-500\\/50");
      const style = indicator.getAttribute("style");

      // Second tab (index 1) should be at ~33.33% (100/3)
      expect(style).toMatch(/left:\s*calc\(33\.3+%\)/);
    });

    it("should set indicator width based on number of tabs", () => {
      const { container } = render(<TabBar {...defaultProps} />);

      const indicator = container.querySelector(".border-green-500\\/50");
      const style = indicator.getAttribute("style");

      // With 3 tabs, width should be ~33.33%
      expect(style).toMatch(/width:\s*calc\(33\.3+%\)/);
    });

    it("should handle different number of tabs", () => {
      const twoTabs = [
        { id: "tab1", label: "Tab 1" },
        { id: "tab2", label: "Tab 2" },
      ];

      const { container } = render(
        <TabBar activeTab="tab1" setActiveTab={vi.fn()} tabs={twoTabs} />,
      );

      const indicator = container.querySelector(".border-green-500\\/50");
      const style = indicator.getAttribute("style");

      // With 2 tabs, width should be 50%
      expect(style).toContain("width: calc(50%)");
    });
  });

  describe("Accessibility", () => {
    it("should render tabs as buttons", () => {
      render(<TabBar {...defaultProps} />);

      mockTabs.forEach((tab) => {
        const button = screen.getByRole("button", { name: tab.label });
        expect(button.tagName).toBe("BUTTON");
      });
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      const setActiveTab = vi.fn();

      render(<TabBar {...defaultProps} setActiveTab={setActiveTab} />);

      const publicTab = screen.getByRole("button", { name: "GitHub Public" });
      publicTab.focus();

      await user.keyboard("{Enter}");

      expect(setActiveTab).toHaveBeenCalledWith("github-public");
    });

    it("should support tab key navigation", async () => {
      const user = userEvent.setup();
      render(<TabBar {...defaultProps} />);

      const firstTab = screen.getByRole("button", { name: "Upload" });
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      await user.tab();

      const secondTab = screen.getByRole("button", { name: "GitHub Public" });
      expect(secondTab).toHaveFocus();
    });
  });

  describe("Edge Cases", () => {
    it("should handle single tab", () => {
      const singleTab = [{ id: "only", label: "Only Tab" }];

      const { container } = render(
        <TabBar activeTab="only" setActiveTab={vi.fn()} tabs={singleTab} />,
      );

      expect(
        screen.getByRole("button", { name: "Only Tab" }),
      ).toBeInTheDocument();

      const indicator = container.querySelector(".border-green-500\\/50");
      const style = indicator.getAttribute("style");
      expect(style).toContain("width: calc(100%)");
    });

    it("should handle many tabs", () => {
      const manyTabs = Array.from({ length: 10 }, (_, i) => ({
        id: `tab${i}`,
        label: `Tab ${i}`,
      }));

      render(
        <TabBar activeTab="tab0" setActiveTab={vi.fn()} tabs={manyTabs} />,
      );

      manyTabs.forEach((tab) => {
        expect(
          screen.getByRole("button", { name: tab.label }),
        ).toBeInTheDocument();
      });
    });

    it("should handle tab with empty label", () => {
      const tabsWithEmpty = [
        { id: "empty", label: "" },
        { id: "normal", label: "Normal" },
      ];

      render(
        <TabBar
          activeTab="empty"
          setActiveTab={vi.fn()}
          tabs={tabsWithEmpty}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });
  });
});
