export default function Navbar() {
  return (
    <>
        {/* TODO: Add custom gray */}
        <nav className="navbar bg-navbar p-4 text-black flex justify-between items-center">

        {/* TODO: Add logo icon */}
        <div className="navbar-brand">
            <h1 className="navbar-title">DocRelief AI</h1>
        </div>
        
        <div className="navbar-menu">
            <ul className="navbar-links flex gap-4">
            <li><a href="/">Features</a></li>
            <li><a href="/about">Pricing</a></li>
            <li className="ml-8"><a href="/contact">Login/Username</a></li>
        </ul>
        </div>

        

        
        </nav>
    </>
    
  );
}