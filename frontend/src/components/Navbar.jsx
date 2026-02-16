import { Link } from "react-router-dom";
import logo from "../assets/DocRelief_Logo.png";
import logoShort from "../assets/DocRelief_Short_Logo2.png";

export default function Navbar() {
  return (
    <>
      {/* TODO: Add custom gray */}
      <div className="sticky top-0 z-50 navbar-padding pl-4 pr-4">
        <nav className="bg-gray-50 navbar m-4 bg-navbar rounded-4xl p-4 text-black font-bold flex justify-between items-center max-w-screen-2xl mx-auto">
          {/* Logo/Brand */}
          <Link to="/" className="navbar-brand cursor-pointer">
            <img
              src={logo}
              alt="DocRelief AI"
              className="hidden md:block h-8 md:h-10"
            />
            <img
              src={logoShort}
              alt="DocRelief AI"
              className="block md:hidden h-8 min-w-8"
            />
          </Link>

          <div className="navbar-menu">
            <ul className="navbar-links flex gap-4 text-white">
              <li>
                <Link to="/features">Features</Link>
              </li>
              <li>
                <Link to="/pricing">Pricing</Link>
              </li>
              <li className="ml-8">
                <Link to="/login">Login/Username</Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
