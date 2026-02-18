import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import LandingPage from "../LandingPage";

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

// Mock child components
vi.mock("../../components/TabBar", () => ({
  default: ({ activeTab, setActiveTab, tabs }) => (
    <div data-testid="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          data-active={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../components/PublicRepoTab", () => ({
  default: () => <div data-testid="public-repo-tab">Public Repo Tab</div>,
}));

vi.mock("../../components/UploadTab", () => ({
  default: () => <div data-testid="upload-tab">Upload Tab</div>,
}));

vi.mock("../../components/PrivateRepoTab", () => ({
  default: () => <div data-testid="private-repo-tab">Private Repo Tab</div>,
}));

vi.mock("../../components/HowItWorks", () => ({
  default: () => <div data-testid="how-it-works">How It Works</div>,
}));

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("tab");
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render the page", () => {
      renderComponent();

      expect(
        screen.getByText("Generate Professional README's with AI in Seconds"),
      ).toBeInTheDocument();
    });

    it("should render hero section", () => {
      renderComponent();

      expect(
        screen.getByText(
          "Stop writing READMEs from scratch. Let AI generate and commit directly to your GitHub.",
        ),
      ).toBeInTheDocument();
    });

    it("should render How It Works section", () => {
      renderComponent();

      expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
    });

    it("should render Generate README heading", () => {
      renderComponent();

      expect(screen.getByText("Generate README")).toBeInTheDocument();
    });

    it("should render TabBar", () => {
      renderComponent();

      expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    });

    it("should render all tab buttons", () => {
      renderComponent();

      expect(screen.getByTestId("tab-public-repo")).toBeInTheDocument();
      expect(screen.getByTestId("tab-upload-files")).toBeInTheDocument();
      expect(screen.getByTestId("tab-private-repo")).toBeInTheDocument();
    });
  });

  describe("Default Tab", () => {
    it("should show public-repo tab by default", () => {
      renderComponent();

      expect(screen.getByTestId("public-repo-tab")).toBeInTheDocument();
    });

    it("should not show other tabs by default", () => {
      renderComponent();

      expect(screen.queryByTestId("upload-tab")).not.toBeInTheDocument();
      expect(screen.queryByTestId("private-repo-tab")).not.toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should switch to Upload Files tab when clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId("tab-upload-files"));

      expect(screen.getByTestId("upload-tab")).toBeInTheDocument();
      expect(
        screen.queryByTestId("public-repo-tab"),
      ).not.toBeInTheDocument();
    });

    it("should switch to Private Repo tab when clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId("tab-private-repo"));

      expect(screen.getByTestId("private-repo-tab")).toBeInTheDocument();
      expect(
        screen.queryByTestId("public-repo-tab"),
      ).not.toBeInTheDocument();
    });

    it("should switch back to Public Repo tab", async () => {
      const user = userEvent.setup();
      renderComponent();

      // Go to another tab first
      await user.click(screen.getByTestId("tab-upload-files"));
      expect(screen.getByTestId("upload-tab")).toBeInTheDocument();

      // Go back to public repo
      await user.click(screen.getByTestId("tab-public-repo"));
      expect(screen.getByTestId("public-repo-tab")).toBeInTheDocument();
    });

    it("should update URL params when tab changes", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId("tab-upload-files"));

      expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: "upload-files" });
    });
  });

  describe("URL Tab Parameter", () => {
    it("should load tab from URL parameter", () => {
      mockSearchParams.set("tab", "private-repo");

      renderComponent();

      expect(screen.getByTestId("private-repo-tab")).toBeInTheDocument();
    });

    it("should load upload-files tab from URL", () => {
      mockSearchParams.set("tab", "upload-files");

      renderComponent();

      expect(screen.getByTestId("upload-tab")).toBeInTheDocument();
    });

    it("should fallback to public-repo for invalid tab param", () => {
      mockSearchParams.set("tab", "invalid-tab");

      renderComponent();

      expect(screen.getByTestId("public-repo-tab")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have proper heading styling", () => {
      renderComponent();

      const heading = screen.getByText(
        "Generate Professional README's with AI in Seconds",
      );
      expect(heading).toHaveClass("font-urbanist");
      expect(heading).toHaveClass("text-5xl");
      expect(heading).toHaveClass("font-black");
      expect(heading).toHaveClass("text-green-500");
    });

    it("should have proper subtitle styling", () => {
      renderComponent();

      const subtitle = screen.getByText(
        /Stop writing READMEs from scratch/,
      );
      expect(subtitle).toHaveClass("font-fire-code");
      expect(subtitle).toHaveClass("text-white");
    });

    it("should have proper card styling", () => {
      const { container } = renderComponent();

      const card = container.querySelector(".rounded-4xl.shadow-2xl");
      expect(card).toBeInTheDocument();
    });

    it("should have green border on card", () => {
      const { container } = renderComponent();

      const borderedCard = container.querySelector(".border-green-500\\/40");
      expect(borderedCard).toBeInTheDocument();
    });

    it("should have backdrop blur", () => {
      const { container } = renderComponent();

      const blurredCard = container.querySelector(".backdrop-blur-md");
      expect(blurredCard).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have top margin for hero section", () => {
      const { container } = renderComponent();

      const heroSection = container.querySelector(".mt-20");
      expect(heroSection).toBeInTheDocument();
    });

    it("should center content", () => {
      const { container } = renderComponent();

      const centeredContainer = container.querySelector(
        ".flex.flex-col.items-center",
      );
      expect(centeredContainer).toBeInTheDocument();
    });

    it("should have responsive width on card", () => {
      const { container } = renderComponent();

      const responsiveCard = container.querySelector(
        ".w-\\[400px\\].md\\:w-\\[921px\\]",
      );
      expect(responsiveCard).toBeInTheDocument();
    });

    it("should have padding on card", () => {
      const { container } = renderComponent();

      const paddedCard = container.querySelector(".pt-16");
      expect(paddedCard).toBeInTheDocument();
    });
  });

  describe("Generate README Heading", () => {
    it("should have proper styling", () => {
      renderComponent();

      const heading = screen.getByText("Generate README");
      expect(heading).toHaveClass("font-urbanist");
      expect(heading).toHaveClass("text-4xl");
      expect(heading).toHaveClass("text-green-500");
      expect(heading).toHaveClass("font-black");
    });
  });

  describe("Tab Container", () => {
    it("should have responsive width", () => {
      const { container } = renderComponent();

      const tabContainer = container.querySelector(
        ".w-\\[340px\\].md\\:w-\\[660px\\]",
      );
      expect(tabContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have main headings", () => {
      renderComponent();

      const h1Headings = screen.getAllByRole("heading", { level: 1 });
      expect(h1Headings.length).toBe(2); // Hero heading + "Generate README" heading
    });

    it("should have subheading", () => {
      renderComponent();

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("should have tab buttons", () => {
      renderComponent();

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple tab switches", async () => {
      const user = userEvent.setup();
      renderComponent();

      // Switch multiple times
      await user.click(screen.getByTestId("tab-upload-files"));
      await user.click(screen.getByTestId("tab-private-repo"));
      await user.click(screen.getByTestId("tab-public-repo"));
      await user.click(screen.getByTestId("tab-upload-files"));

      expect(screen.getByTestId("upload-tab")).toBeInTheDocument();
    });

    it("should handle clicking same tab multiple times", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId("tab-public-repo"));
      await user.click(screen.getByTestId("tab-public-repo"));
      await user.click(screen.getByTestId("tab-public-repo"));

      expect(screen.getByTestId("public-repo-tab")).toBeInTheDocument();
    });
  });
});
