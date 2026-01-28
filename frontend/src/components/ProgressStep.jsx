import React from 'react';
import {CheckCircle, Loader2} from 'lucide-react';

const ProgressStep = ({stepNumber, text, status}) => {
    // status can be: 'pending' | 'active' | 'completed'

    // Determine icon based on status
    const getIcon = () => {
        if (status === 'completed') {
            return <CheckCircle className="w-6 h-6 text-green-500"/>;
        } else if (status === 'active') {
            return <Loader2 className="w-6 h-6 text-green-500 animate-spin"/>;
        } else {
            // pending - show gray circle
            return (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300"/>
            );
        }
    };

    // Determine text color based on status
    const getTextColor = () => {
        if (status === 'completed') return 'text-green-600';
        if (status === 'active') return 'text-green-300';
        return 'text-gray-400';
    };

    return (
        <div className="flex items-center gap-4 py-4">
            {/* Step Icon */}
            <div className="flex-shrink-0">
                {getIcon()}
            </div>

            {/* Step Text */}
            <div className={`text-lg font-medium transition-colors ${getTextColor()}`}>
                {text}
            </div>
        </div>
    );
};

export default ProgressStep;