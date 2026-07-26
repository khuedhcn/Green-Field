import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Services from "./pages/Services.jsx";
import Contact from "./pages/Contact.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Labelling from "./pages/Labelling.jsx";
import Login from "./pages/Login.jsx";
import ExtraordinaryEventTraces from "./apps/ExtraordinaryEventTraces.jsx";
import RaiseTicket from "./apps/RaiseTicket.jsx";
import SupplierEval from "./apps/SupplierEval.jsx";
import OKRSystem from "./apps/OKRSystem.jsx";
import TrainingChatbot from "./apps/TrainingChatbot.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const navItems = [
  { to: "/", label: "Trang chủ" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/services", label: "Dịch vụ" },
  { to: "/contact", label: "Liên hệ" },
  { to: "/dashboard", label: "Dashboard" },
];

function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

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
          {user ? (
            <button type="button" className="greenfield-nav-logout" onClick={handleLogout}>
              Đăng xuất ({user.email})
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => isActive ? "active" : ""}>
              Đăng nhập
            </NavLink>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/labelling" element={<Labelling />} />
        <Route path="/login" element={<Login />} />
        <Route path="/extraordinary-event-traces" element={<ExtraordinaryEventTraces />} />
        <Route
          path="/raise-ticket"
          element={
            <ProtectedRoute>
              <RaiseTicket />
            </ProtectedRoute>
          }
        />
        <Route path="/supplier-eval" element={<SupplierEval />} />
        <Route path="/okr-system" element={<OKRSystem />} />
        <Route path="/training-chatbot" element={<TrainingChatbot />} />
      </Routes>
    </div>
  );
}

export default App;
