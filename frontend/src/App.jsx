import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/LandingPage";
import PreviewPage from "./pages/PreviewPage";
import LoadingPage from "./pages/LoadingPage";
import TeamPage from "./pages/TeamPage";
import GitHubCallback from "./pages/GitHubCallback";
import { healthCheck } from "./services/api";
import { useState, useEffect } from "react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import CommitPage from "./pages/CommitPage";

function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await healthCheck();
        setStatus(data.status);
      } catch (error) {
        setStatus("error");
      }
    };
    checkHealth();
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{
          top: 40, // pixels from top (adjust as needed)
          right: 40, // pixels from right (adjust as needed)
        }}
      />
      <div className="min-h-screen flex flex-col page-gradient">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/preview/:id" element={<PreviewPage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/commit" element={<CommitPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default App;
