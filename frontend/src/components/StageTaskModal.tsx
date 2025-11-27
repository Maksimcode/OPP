import { FormEvent, useEffect, useState } from "react";

export interface StageTaskFormValues {
  name: string;
  responsibles: string[];
  deadline: string;
  feedback?: string;
  creationDate: string;
}

interface StageTaskModalProps {
  isOpen: boolean;
  entityLabel: "этап" | "задачу";
  teamMembers: string[];
  onClose: () => void;
  onSubmit: (values: StageTaskFormValues) => void;
  initialValues?: StageTaskFormValues;
}

export const StageTaskModal = ({
  isOpen,
  entityLabel,
  teamMembers,
  onClose,
  onSubmit,
  initialValues
}: StageTaskModalProps) => {
  const [name, setName] = useState("");
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [feedback, setFeedback] = useState("");
  const [creationDate, setCreationDate] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialValues && isOpen) {
      setName(initialValues.name);
      setResponsibles(initialValues.responsibles ?? []);
      setDeadline(initialValues.deadline);
      setFeedback(initialValues.feedback ?? "");
      setCreationDate(initialValues.creationDate);
    } else if (isOpen) {
      setName("");
      setResponsibles([]);
      setDeadline("");
      setFeedback("");
      setCreationDate(new Date().toISOString());
    }
    setError(null);
    setSelectorOpen(false);
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const getMinDateTime = () => new Date().toISOString().slice(0, 16);

  const handleResponsibleToggle = (member: string) => {
    setResponsibles((current) =>
      current.includes(member) ? current.filter((name) => name !== member) : [...current, member]
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Название ${entityLabel} обязательно`);
      return;
    }
    if (!deadline) {
      setError("Дедлайн обязателен");
      return;
    }
    if (!responsibles.length) {
      setError("Нужно выбрать хотя бы одного ответственного");
      return;
    }
    const selectedDate = new Date(deadline);
    if (selectedDate < new Date()) {
      setError("Дедлайн не может быть в прошлом");
      return;
    }

    setLoading(true);
    onSubmit({
      name: name.trim(),
      responsibles,
      deadline,
      feedback: feedback.trim() || undefined,
      creationDate
    });
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
        zIndex: 1100
      }}
    >
      <div
        className="modal-content"
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2rem",
          width: "90%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)"
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#1d4ed8" }}>
          {initialValues ? `Редактировать ${entityLabel}` : `Новый ${entityLabel}`}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Название {entityLabel} <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Например: ${entityLabel === "этап" ? "Подготовка макетов" : "Сверстать экран авторизации"}`}
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

          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Ответственные <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectorOpen((prev) => !prev)}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "white",
                textAlign: "left",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              {responsibles.length ? responsibles.join(", ") : "Выбрать студента"}
            </button>
            {selectorOpen && (
              <div
                style={{
                  marginTop: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  borderRadius: "12px",
                  padding: "0.5rem",
                  maxHeight: "180px",
                  overflowY: "auto"
                }}
              >
                {teamMembers.map((member) => {
                  const isSelected = responsibles.includes(member);
                  return (
                    <div
                      key={member}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "10px",
                        background: isSelected ? "rgba(59, 130, 246, 0.12)" : "transparent",
                        color: isSelected ? "#1d4ed8" : "#0f172a"
                      }}
                    >
                      <span>{member}</span>
                      <button
                        type="button"
                        onClick={() => handleResponsibleToggle(member)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          border: "none",
                          fontSize: "1.2rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: isSelected ? "#dc2626" : "#2563eb",
                          background: isSelected ? "rgba(248, 113, 113, 0.15)" : "rgba(59, 130, 246, 0.15)"
                        }}
                      >
                        {isSelected ? "×" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Дедлайн <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={getMinDateTime()}
              required
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                fontSize: "1rem"
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>Обратная связь</span>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Комментарий, ссылки на материалы, критерии приёмки..."
              rows={4}
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                fontSize: "1rem",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
          </label>

          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                background: "rgba(248, 113, 113, 0.14)",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                color: "#b91c1c",
                marginBottom: "1.25rem",
                fontSize: "0.9rem"
              }}
            >
              {error}
            </div>
          )}

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
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "white",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Сохранение..." : initialValues ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
