import {Link} from 'react-router-dom';

export default function Navbar() {
    return (
        <>
            {/* TODO: Add custom gray */}
            <div className="navbar-padding pl-4 pr-4">
                <nav
                    className="bg-gray-50 navbar m-4 bg-navbar rounded-3xl p-4 text-black font-bold flex justify-between items-center max-w-screen-2xl mx-auto">
                    {/* Logo/Brand */}
                    <Link to="/" className="navbar-brand cursor-pointer">
                        <h1 className="navbar-title">DocRelief AI</h1>
                    </Link>

                    <div className="navbar-menu">
                        <ul className="navbar-links flex gap-4">
                            <li><Link to="/features">Features</Link></li>
                            <li><Link to="/pricing">Pricing</Link></li>
                            <li className="ml-8"><Link to="/login">Login/Username</Link></li>
                        </ul>
                    </div>
                </nav>
            </div>

        </>

    );
}