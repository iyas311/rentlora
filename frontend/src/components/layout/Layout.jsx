import Footer from "./Footer";
import Navbar from "./Navbar";
export default function Layout({ children }) {
  return <div><Navbar /><main className="container-app py-6">{children}</main><Footer /></div>;
}
