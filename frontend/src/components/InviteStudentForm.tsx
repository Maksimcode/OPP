import { FormEvent, useState } from "react";

interface InviteStudentFormProps {
  onInvite: (studentName: string) => void;
}

export const InviteStudentForm = ({ onInvite }: InviteStudentFormProps) => {
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    setLoading(true);
    onInvite(studentName.trim());
    setStudentName("");
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.12)",
        marginBottom: "2rem"
      }}
    >
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#1d4ed8" }}>Пригласить студента в команду</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#475569" }}>Имя студента</span>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Введите имя или email студента"
              required
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                fontSize: "1rem",
                width: "100%"
              }}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !studentName.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            background: loading || !studentName.trim()
              ? "rgba(59, 130, 246, 0.5)"
              : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
            cursor: loading || !studentName.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap"
          }}
        >
          {loading ? "Отправка..." : "Отправить приглашение"}
        </button>
      </form>
      {success && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            background: "rgba(74, 222, 128, 0.16)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            color: "#15803d",
            fontSize: "0.9rem"
          }}
        >
          ✓ Приглашение успешно отправлено!
        </div>
      )}
    </div>
  );
};


