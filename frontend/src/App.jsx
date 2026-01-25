import { Routes, Route, Link } from 'react-router-dom';
import PreviewPage from './pages/PreviewPage';
import { healthCheck } from './services/api';
import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('checking...');
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await healthCheck();
        setStatus(data.status);
      } catch (error) {
        setStatus('error');
      }
    };
    checkHealth();
  }, []);

  return (

         <Routes>
          <Route 
            path="/" 
            element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    DocRelief AI
                </h1>
                <p className="text-xl text-gray-600">
                    Backend Status: <span className="font-semibold">{status}</span>
                </p>
            </div>
        </div>
            } 
          />
          
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/preview/:id" element={<PreviewPage />} />
        </Routes>
  );
}

export default App;
