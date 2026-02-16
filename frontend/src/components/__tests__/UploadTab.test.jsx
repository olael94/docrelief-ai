import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import UploadTab from "../UploadTab";

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
  uploadZipFile: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  FolderOpen: ({ className }) => (
    <div data-testid="folder-icon" className={className}>
      FolderOpen
    </div>
  ),
}));

// Mock HeroButton component
vi.mock("../HeroButton", () => ({
  default: ({ text, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-testid="hero-button">
      {text}
    </button>
  ),
}));

describe("UploadTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UploadTab />
      </BrowserRouter>,
    );
  };

  const createMockFile = (name, size, type = "application/zip") => {
    const file = new File([""], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  describe("Rendering", () => {
    it("should render the component", () => {
      renderComponent();

      expect(
        screen.getByText(/Drag & drop your zip file here/),
      ).toBeInTheDocument();
    });

    it("should render folder icon", () => {
      renderComponent();

      expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
    });

    it("should render file format info", () => {
      renderComponent();

      expect(screen.getByText("Supported: .zip files only")).toBeInTheDocument();
      expect(screen.getByText("Max: 10MB")).toBeInTheDocument();
    });

    it("should render uploaded files section", () => {
      renderComponent();

      expect(screen.getByText(/Uploaded files/)).toBeInTheDocument();
    });

    it("should show no files message initially", () => {
      renderComponent();

      expect(screen.getByText("No files uploaded yet.")).toBeInTheDocument();
    });

    it("should render generate button", () => {
      renderComponent();

      expect(screen.getByTestId("hero-button")).toBeInTheDocument();
      expect(
        screen.getByText("Generate README from Files →"),
      ).toBeInTheDocument();
    });

    it("should have button disabled when no files", () => {
      renderComponent();

      expect(screen.getByTestId("hero-button")).toBeDisabled();
    });
  });

  describe("Drop Zone Styling", () => {
    it("should have proper initial styling", () => {
      const { container } = renderComponent();

      const dropZone = container.querySelector(".border-dashed");
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveClass("border-green-500/40");
    });

    it("should have cursor pointer", () => {
      const { container } = renderComponent();

      const dropZone = container.querySelector(".cursor-pointer");
      expect(dropZone).toBeInTheDocument();
    });

    it("should have rounded corners", () => {
      const { container } = renderComponent();

      const dropZone = container.querySelector(".rounded-3xl");
      expect(dropZone).toBeInTheDocument();
    });
  });

  describe("File Selection via Click", () => {
    it("should trigger file input when drop zone is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      const hiddenInput = document.querySelector('input[type="file"]');
      const clickSpy = vi.spyOn(hiddenInput, "click");

      const dropZone = screen.getByText(/Drag & drop/).closest("div");
      await user.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should accept only .zip files", () => {
      renderComponent();

      const hiddenInput = document.querySelector('input[type="file"]');
      expect(hiddenInput).toHaveAttribute("accept", ".zip");
    });

    it("should be hidden", () => {
      renderComponent();

      const hiddenInput = document.querySelector('input[type="file"]');
      expect(hiddenInput).toHaveClass("hidden");
    });
  });

  describe("File Upload", () => {
    it("should display uploaded file info", async () => {
      const toast = await import("react-hot-toast");
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.zip")).toBeInTheDocument();
      });

      expect(toast.toast.success).toHaveBeenCalledWith("File selected");
    });

    it("should display file size in KB", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 2048); // 2 KB
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("2.0 KB")).toBeInTheDocument();
      });
    });

    it("should display file size in MB for large files", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 5 * 1024 * 1024); // 5 MB
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("5.0 MB")).toBeInTheDocument();
      });
    });

    it("should enable generate button after file upload", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });
    });

    it("should update file count display", async () => {
      renderComponent();

      expect(screen.getByText("Uploaded files (0)")).toBeInTheDocument();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Uploaded files (1)")).toBeInTheDocument();
      });
    });
  });

  describe("File Validation", () => {
    it("should reject files larger than 10MB", async () => {
      const toast = await import("react-hot-toast");
      renderComponent();

      const file = createMockFile("large.zip", 11 * 1024 * 1024); // 11 MB
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "Total file size exceeds 10 MB.",
        );
      });
    });

    it("should reject multiple files", async () => {
      const toast = await import("react-hot-toast");
      renderComponent();

      const file1 = createMockFile("test1.zip", 1024);
      const file2 = createMockFile("test2.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "You can only upload 1 file at a time.",
        );
      });
    });
  });

  describe("Drag and Drop", () => {
    it("should show drag state when dragging over", () => {
      const { container } = renderComponent();

      const dropZone = container.querySelector(".cursor-pointer");

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      expect(dropZone).toHaveClass("border-green-400");
    });

    it("should remove drag state when drag leaves", () => {
      const { container } = renderComponent();

      const dropZone = container.querySelector(".cursor-pointer");

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      fireEvent.dragLeave(dropZone, {
        dataTransfer: { files: [] },
      });

      expect(dropZone).toHaveClass("border-dashed");
    });

    it("should accept dropped zip file", async () => {
      const toast = await import("react-hot-toast");
      const { container } = renderComponent();

      const file = createMockFile("dropped.zip", 1024);
      const dropZone = container.querySelector(".cursor-pointer");

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText("dropped.zip")).toBeInTheDocument();
      });

      expect(toast.toast.success).toHaveBeenCalledWith("File uploaded");
    });

    it("should reject non-zip dropped files", async () => {
      const toast = await import("react-hot-toast");
      const { container } = renderComponent();

      const file = createMockFile("test.txt", 1024, "text/plain");
      const dropZone = container.querySelector(".cursor-pointer");

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith(
          "Only .zip files are allowed",
        );
      });
    });
  });

  describe("Clear File", () => {
    it("should clear file when remove button is clicked", async () => {
      const toast = await import("react-hot-toast");
      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test.zip")).toBeInTheDocument();
      });

      // Find and click remove button
      const removeButton = screen.getByTitle("Remove file");
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("No files uploaded yet.")).toBeInTheDocument();
      });

      expect(toast.toast.success).toHaveBeenCalledWith("File cleared");
    });

    it("should disable button after clearing file", async () => {
      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      const removeButton = screen.getByTitle("Remove file");
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).toBeDisabled();
      });
    });
  });

  describe("Form Submission", () => {
    it("should disable button when no file selected", async () => {
      renderComponent();

      const button = screen.getByTestId("hero-button");
      expect(button).toBeDisabled();
    });

    it("should show uploading state when submitting", async () => {
      const { uploadZipFile } = await import("../../services/api");
      uploadZipFile.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      await user.click(screen.getByTestId("hero-button"));

      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });

    it("should navigate to loading page on success", async () => {
      const { uploadZipFile } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      uploadZipFile.mockResolvedValue({ id: "readme-123" });

      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/loading", {
          state: { readmeId: "readme-123" },
        });
      });

      expect(toast.toast.success).toHaveBeenCalledWith(
        "File uploaded successfully!",
      );
    });

    it("should pass session_id to API", async () => {
      const { uploadZipFile } = await import("../../services/api");
      uploadZipFile.mockResolvedValue({ id: "readme-123" });

      localStorage.setItem("session_id", "test-session");

      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(uploadZipFile).toHaveBeenCalledWith(
          expect.any(File),
          "test-session",
        );
      });
    });

    it("should handle API errors", async () => {
      const { uploadZipFile } = await import("../../services/api");
      const toast = await import("react-hot-toast");
      uploadZipFile.mockRejectedValue({
        response: { data: { detail: "Upload failed" } },
      });

      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith("Upload failed");
      });
    });

    it("should reset submitting state on error", async () => {
      const { uploadZipFile } = await import("../../services/api");
      uploadZipFile.mockRejectedValue(new Error("Error"));

      const user = userEvent.setup();
      renderComponent();

      const file = createMockFile("test.zip", 1024);
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("hero-button")).not.toBeDisabled();
      });

      await user.click(screen.getByTestId("hero-button"));

      await waitFor(() => {
        expect(
          screen.getByText("Generate README from Files →"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Layout", () => {
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

    it("should have minimum height", () => {
      const { container } = renderComponent();

      const minHeightContainer = container.querySelector(".min-h-\\[500px\\]");
      expect(minHeightContainer).toBeInTheDocument();
    });
  });

  describe("File Size Formatting", () => {
    it("should format bytes correctly", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 500); // 500 B
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("500 B")).toBeInTheDocument();
      });
    });

    it("should format KB correctly", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 1536); // 1.5 KB
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("1.5 KB")).toBeInTheDocument();
      });
    });

    it("should format MB correctly", async () => {
      renderComponent();

      const file = createMockFile("test.zip", 2.5 * 1024 * 1024); // 2.5 MB
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("2.5 MB")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file array", () => {
      renderComponent();

      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [] } });

      expect(screen.getByText("No files uploaded yet.")).toBeInTheDocument();
    });

    it("should handle file with long name", async () => {
      renderComponent();

      const file = createMockFile(
        "this-is-a-very-long-file-name-that-might-overflow.zip",
        1024,
      );
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "this-is-a-very-long-file-name-that-might-overflow.zip",
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
