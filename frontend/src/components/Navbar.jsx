export default function Navbar() {
  return (
    <nav className="navbar">
      <h1 className="navbar-title">My Application</h1>
      <ul className="navbar-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  );
}