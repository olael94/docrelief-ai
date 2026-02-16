import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  Github,
  ArrowLeft,
  FileText,
  LayoutGrid,
  Share2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CommitSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [commitResult, setCommitResult] = useState(null);

  useEffect(() => {
    // Get commit result from navigation state
    const result = location.state?.result;

    if (!result) {
      // Try to get from sessionStorage
      const saved = sessionStorage.getItem("commitResult");
      if (saved) {
        try {
          setCommitResult(JSON.parse(saved));
        } catch (e) {
          navigate("/");
        }
      } else {
        navigate("/");
        return;
      }
    } else {
      setCommitResult(result);
      // Save to sessionStorage for refresh persistence
      sessionStorage.setItem("commitResult", JSON.stringify(result));
    }

    // ESC key handler
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [location, navigate]);

  if (!commitResult) {
    return null;
  }

  const handleViewOnGitHub = () => {
    if (commitResult.commit_url) {
      window.open(commitResult.commit_url, "_blank");
    }
  };

  const handleGenerateAnother = () => {
    navigate("/");
  };

  const handleViewDashboard = () => {
    // For now, navigate to home (dashboard not implemented yet)
    navigate("/");
  };

  const handleBackToPreview = () => {
    navigate(-1);
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(
      commitResult.commit_url ||
        commitResult.repo_url ||
        window.location.origin,
    );
    const title = encodeURIComponent("My New README");
    const summary = encodeURIComponent(
      "Just generated a README for my project using DocRelief AI!",
    );
    window.open(
      `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${summary}`,
      "_blank",
    );
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Success message */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          README Successfully Committed!
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Wait, that's it? Yep. Your README is live on GitHub already
        </p>

        {/* View on GitHub button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleViewOnGitHub}
            className="flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </button>
        </div>

        {/* Next actions */}
        <p className="text-center text-gray-600 mb-6">
          Choose Your Next Action
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Generate Another */}
          <button
            onClick={handleGenerateAnother}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-6 text-left transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">
                Generate Another README.md
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Create documentation for another project
            </p>
          </button>

          {/* View Dashboard */}
          <button
            onClick={handleViewDashboard}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-6 text-left transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">
                View Dashboard
              </span>
            </div>
            <p className="text-sm text-gray-500">
              See all your generated READMEs
            </p>
          </button>
        </div>

        {/* Share banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p className="text-blue-700 font-medium mb-4">
            Love DocRelief AI? Spread the word!
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleBackToPreview}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-lg font-medium transition-colors border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Preview
            </button>
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-lg font-medium transition-colors border border-gray-200"
            >
              <CheckCircle className="w-4 h-4" />
              Share on LinkedIn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
