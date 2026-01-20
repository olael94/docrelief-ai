export default function Navbar() {
  return (
    <>
        {/* TODO: Add custom gray */}
        <div className="navbar-padding pl-4 pr-4">
            <nav className=" bg-gray-50 navbar m-4 bg-navbar rounded-3xl p-4 text-black font-bold flex justify-between items-center max-w-screen-2xl mx-auto">
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
        </div>
        
    </>
    
  );
}