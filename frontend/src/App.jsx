import {Routes, Route, Link} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import PreviewPage from './pages/PreviewPage';
import {healthCheck} from './services/api';
import {useState, useEffect} from 'react';

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
            <Toaster position="top-right"/>
            <Routes>
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/preview" element={<PreviewPage/>}/>
                <Route path="/preview/:id" element={<PreviewPage/>}/>
                {/* TODO: Add /loading route once Story 6 LoadingPage is created */}
                {/* TODO: Add /connect-github route for OAuth flow */}
            </Routes>
        </>
    );
}

export default App;
