import { FormEvent, useState } from "react";

interface InviteStudentFormProps {
  teamId: number;
  onInvite: (email: string) => Promise<void>;
}

// Простая проверка email
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const InviteStudentForm = ({ teamId, onInvite }: InviteStudentFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Введите email пользователя");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onInvite(email.trim());
      setEmail("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось отправить приглашение");
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#475569" }}>
              Email пользователя <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="example@email.com"
              required
              style={{
                padding: "0.75rem 1rem",
                border: error ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                fontSize: "1rem",
                width: "100%"
              }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            background: loading || !email.trim()
              ? "rgba(59, 130, 246, 0.5)"
              : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
            cursor: loading || !email.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            alignSelf: "flex-start"
          }}
        >
          {loading ? "Отправка..." : "Отправить приглашение"}
        </button>
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.16)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#dc2626",
              fontSize: "0.9rem"
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
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
      </form>
    </div>
  );
};
