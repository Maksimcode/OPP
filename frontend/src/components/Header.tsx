import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export const Header = () => {
  const navigate = useNavigate();
  const { clearAccessToken } = useAuth();

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login");
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        zIndex: 100
      }}
    >
      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1d4ed8" }}>Reverse Gantt</div>
      <button
        onClick={handleLogout}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "10px",
          border: "none",
          background: "rgba(239, 68, 68, 0.1)",
          color: "#dc2626",
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
        }}
      >
        Выйти
      </button>
    </header>
  );
};


