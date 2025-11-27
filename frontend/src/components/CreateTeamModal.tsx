import { FormEvent, useState } from "react";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const CreateTeamModal = ({ isOpen, onClose, onSubmit }: CreateTeamModalProps) => {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    onSubmit(teamName.trim());
    setTeamName("");
    setLoading(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        className="modal-content"
        style={{
          background: "white",
          borderRadius: "18px",
          padding: "2rem",
          width: "90%",
          maxWidth: "480px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)"
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#1d4ed8" }}>Создать команду</h2>
        <p style={{ color: "#475569", marginBottom: "1.5rem" }}>Введите название команды</p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569" }}>Название команды</span>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Например: Команда разработки"
              required
              autoFocus
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                fontSize: "1rem"
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "white",
                color: "#475569",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "white",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                opacity: loading || !teamName.trim() ? 0.7 : 1
              }}
            >
              {loading ? "Создаём..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


