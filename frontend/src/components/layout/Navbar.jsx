import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="container-app flex h-16 items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">Rentlora</Link>
        <div className="hidden gap-6 md:flex"><Link to="/browse">Browse</Link>{user?.role === "host" && <Link to="/host/dashboard">Host</Link>}</div>
        <div className="flex gap-3">{user ? <><Link to="/profile">{user.name}</Link><button onClick={logout}>Logout</button></> : <><Link to="/login">Login</Link><Link to="/register">Register</Link></>}</div>
      </div>
    </nav>
  );
}
