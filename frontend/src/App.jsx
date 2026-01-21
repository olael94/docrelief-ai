import { useState, useEffect } from 'react';
import { healthCheck } from './services/api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';

function App() {
    const [status, setStatus] = useState('checking...');

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
        <>
        <Navbar />
        <Hero />
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
        </>
        
    );
}

export default App;