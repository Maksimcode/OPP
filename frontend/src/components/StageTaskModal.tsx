import { FormEvent, useEffect, useState } from "react";

export interface StageTaskFormValues {
  name: string;
  responsibles: string[];
  duration: number; // Количество дней
  feedback?: string;
  dependencies?: number[];
}

interface StageTaskModalProps {
  isOpen: boolean;
  entityLabel: "этап" | "задачу";
  teamMembers: string[];
  allAvailableEntities: { id: number; name: string; type: "stage" | "task"; disabled?: boolean }[];
  onClose: () => void;
  onSubmit: (values: StageTaskFormValues) => void;
  initialValues?: StageTaskFormValues;
}

export const StageTaskModal = ({
  isOpen,
  entityLabel,
  teamMembers,
  allAvailableEntities,
  onClose,
  onSubmit,
  initialValues
}: StageTaskModalProps) => {
  const [name, setName] = useState("");
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [depsSelectorOpen, setDepsSelectorOpen] = useState(false);
  const [duration, setDuration] = useState<number | string>("");
  const [feedback, setFeedback] = useState("");
  const [dependencies, setDependencies] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialValues && isOpen) {
      setName(initialValues.name);
      setResponsibles(initialValues.responsibles ?? []);
      setDuration(initialValues.duration ?? 1);
      setFeedback(initialValues.feedback ?? "");
      setDependencies(initialValues.dependencies ?? []);
    } else if (isOpen) {
      setName("");
      setResponsibles([]);
      setDuration("");
      setFeedback("");
      setDependencies([]);
    }
    setError(null);
    setSelectorOpen(false);
    setDepsSelectorOpen(false);
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const handleResponsibleToggle = (member: string) => {
    setResponsibles((current) =>
      current.includes(member) ? current.filter((name) => name !== member) : [...current, member]
    );
  };

  const handleDependencyToggle = (depId: number) => {
    setDependencies((current) =>
      current.includes(depId) ? current.filter((id) => id !== depId) : [...current, depId]
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Название ${entityLabel} обязательно`);
      return;
    }
    if (!responsibles.length) {
      setError("Нужно выбрать хотя бы одного ответственного");
      return;
    }
    
    const parsedDuration = parseInt(String(duration), 10);
    if (isNaN(parsedDuration) || parsedDuration < 1) {
      setError("Длительность должна быть минимум 1 день");
      return;
    }

    setLoading(true);
    onSubmit({
      name: name.trim(),
      responsibles,
      duration: Math.floor(parsedDuration),
      feedback: feedback.trim() || undefined,
      dependencies
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

          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Предшествующие (зависимости)
            </span>
            <button
              type="button"
              onClick={() => setDepsSelectorOpen((prev) => !prev)}
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
              {dependencies.length 
                ? allAvailableEntities
                    .filter(e => dependencies.includes(e.id))
                    .map(e => e.name)
                    .join(", ") 
                : "Выбрать зависимости"}
            </button>
            {depsSelectorOpen && (
              <div
                style={{
                  marginTop: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  borderRadius: "12px",
                  padding: "0.5rem",
                  maxHeight: "180px",
                  overflowY: "auto",
                  background: "#f8fafc"
                }}
              >
                {allAvailableEntities.length === 0 ? (
                  <div style={{ padding: "0.5rem", color: "#94a3b8", fontSize: "0.9rem", textAlign: "center" }}>
                    Нет доступных объектов для связей
                  </div>
                ) : (
                  allAvailableEntities.map((entity) => {
                    const isSelected = dependencies.includes(entity.id);
                    const isDisabled = entity.disabled && !isSelected;
                    return (
                      <div
                        key={entity.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "10px",
                          background: isSelected ? "rgba(59, 130, 246, 0.12)" : "transparent",
                          color: isDisabled ? "#94a3b8" : (isSelected ? "#1d4ed8" : "#0f172a"),
                          marginBottom: "2px",
                          opacity: isDisabled ? 0.6 : 1,
                          cursor: isDisabled ? "not-allowed" : "default"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.95rem" }}>{entity.name}</span>
                          <span style={{ fontSize: "0.75rem", color: isDisabled ? "#cbd5e1" : "#64748b" }}>
                            {entity.type === "stage" ? "Этап" : "Задача"}
                            {entity.disabled && !isSelected && " (Циклическая связь)"}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDependencyToggle(entity.id)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "10px",
                            border: "none",
                            fontSize: "1.2rem",
                            fontWeight: 600,
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            color: isSelected ? "#dc2626" : (isDisabled ? "#cbd5e1" : "#2563eb"),
                            background: isSelected ? "rgba(248, 113, 113, 0.15)" : (isDisabled ? "#f1f5f9" : "rgba(59, 130, 246, 0.15)")
                          }}
                        >
                          {isSelected ? "×" : "+"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Длительность (количество дней) <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={1}
              required
              placeholder="Количество дней"
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
