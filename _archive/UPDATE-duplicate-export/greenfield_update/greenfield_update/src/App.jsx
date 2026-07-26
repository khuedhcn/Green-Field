import { NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Services from "./pages/Services.jsx";
import Contact from "./pages/Contact.jsx";
import ExtraordinaryEventTraces from "./apps/ExtraordinaryEventTraces.jsx";
import RaiseTicket from "./apps/RaiseTicket.jsx";
import SupplierEval from "./apps/SupplierEval.jsx";

const navItems = [
  { to: "/", label: "Trang chủ" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/services", label: "Dịch vụ" },
  { to: "/contact", label: "Liên hệ" },
];

function App() {
  return (
    <div className="greenfield-app">
      <header className="greenfield-header">
        <div className="greenfield-brand">GreenField</div>
        <nav className="greenfield-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "active" : ""} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/extraordinary-event-traces" element={<ExtraordinaryEventTraces />} />
        <Route path="/raise-ticket" element={<RaiseTicket />} />
        <Route path="/supplier-eval" element={<SupplierEval />} />
      </Routes>
    </div>
  );
}

export default App;
