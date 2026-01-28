import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProgressStep from '../components/ProgressStep';
import { pollReadmeStatus } from '../services/api';

const LoadingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get readmeId from navigation state
    const readmeId = location.state?.readmeId;

    // Track current step (1, 2, or 3)
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState(null);

    // Polling logic - runs when component mounts
    useEffect(() => {
        if (!readmeId) {
            setError('No README ID found');
            return;
        }

        const startPolling = async () => {
            try {
                console.log('Starting to poll for README:', readmeId);

                // Call pollReadmeStatus - it will poll every 2 seconds automatically
                const result = await pollReadmeStatus(readmeId);

                console.log('README generation completed!', result);

                // When complete, navigate to preview page
                navigate(`/preview/${readmeId}`);

            } catch (err) {
                console.error('Polling error:', err);
                setError(err.message || 'Failed to generate README');
            }
        };

        startPolling();
    }, [readmeId, navigate]);

    // Animate through steps with timers (fake progress for better UX)
    useEffect(() => {
        const timer1 = setTimeout(() => setCurrentStep(2), 5000);  // Step 2 after 5s
        const timer2 = setTimeout(() => setCurrentStep(3), 8000);  // Step 3 after 8s
        const timer3 = setTimeout(() => setCurrentStep(4), 11000);  // Step 4 after 11s

        // Cleanup timers on unmount
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    // Define the 3 steps
    const steps = [
        {number: 1, text: 'Verifying repository'},
        {number: 2, text: 'Analyzing Code Structure'},
        {number: 3, text: 'Generating Content'},
        {number: 4, text: 'Finalizing README'},
    ];

    // Function to determine step status
    const getStepStatus = (stepNumber) => {
        if (stepNumber < currentStep) return 'completed';
        if (stepNumber === currentStep) return 'active';
        return 'pending';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar/>

            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="bg-white rounded-3xl shadow-lg p-6 md:p-12 w-full max-w-[400px] md:max-w-md">
                    <h1 className="font-poppins text-3xl font-bold text-gray-900 mb-8 text-center">
                        Generating Your README
                    </h1>

                    {/* Progress Steps */}
                    <div className="space-y-2">
                        {steps.map((step) => (
                            <ProgressStep
                                key={step.number}
                                stepNumber={step.number}
                                text={step.text}
                                status={getStepStatus(step.number)}
                            />
                        ))}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingPage;