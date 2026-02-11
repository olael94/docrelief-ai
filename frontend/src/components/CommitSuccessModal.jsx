import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, FileText, LayoutGrid, ArrowLeft, Check, X } from 'lucide-react';

export default function CommitSuccessModal({ isOpen, onClose, commitData }) {
  const navigate = useNavigate();

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
        navigate('/'); // ESC → Home
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, navigate]);

  if (!isOpen) return null;

  // Navigation handlers
  const handleXClick = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleBackdropClick = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleGenerateAnother = () => {
    onClose();
    navigate('/');
  };

  const handleViewDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleBackToPreview = () => {
    onClose();
    navigate('/preview');
  };

  const handleShareLinkedIn = () => {
    const appUrl = window.location.origin;
    const shareText = `I just used DocRelief AI to generate a professional README! Check it out: ${appUrl}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      
      {/* Modal Content */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
          {/* Close X Button - TOP RIGHT CORNER */}
          <button
            onClick={handleXClick}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              README Successfully Committed!
            </h2>
            <p className="text-gray-600">
              Wait, that's it? Yep. Your README is live on GitHub already
            </p>
          </div>

          {/* View on GitHub Button */}
          <div className="flex justify-center mb-8">
            <a
              href={commitData?.commit_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>

          {/* Choose Your Next Action Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
              Choose Your Next Action
            </h3>
            
            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Generate Another README Card */}
              <button
                onClick={handleGenerateAnother}
                className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-left cursor-pointer"
              >
                <FileText className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    Generate Another README.md
                  </span>
                  <span className="text-xs text-gray-500">
                    Create documentation for another project
                  </span>
                </div>
              </button>

              {/* View Dashboard Card */}
              <button
                onClick={handleViewDashboard}
                className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-left cursor-pointer"
              >
                <LayoutGrid className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    View Dashboard
                  </span>
                  <span className="text-xs text-gray-500">
                    See all your generated READMEs
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Spread the Word Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-900 font-semibold text-center mb-3 text-sm">
              Love DocRelief AI? Spread the word!
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Back to Preview Button */}
              <button
                onClick={handleBackToPreview}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Preview
              </button>
              
              {/* Share on LinkedIn Button */}
              <button
                onClick={handleShareLinkedIn}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <span className="w-4 h-4 flex items-center justify-center">✓</span>
                Share on LinkedIn
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
