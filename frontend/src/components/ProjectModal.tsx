import { FormEvent, useEffect, useState } from "react";

type Project = {
  id?: number;
  name: string;
  deadline: string;
  description: string;
  creationDate?: string;
};

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  project?: Project | null;
}

export const ProjectModal = ({ isOpen, onClose, onSubmit, project }: ProjectModalProps) => {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDeadline(project.deadline || "");
      setDescription(project.description || "");
    } else {
      setName("");
      setDeadline("");
      setDescription("");
    }
    setError(null);
  }, [project, isOpen]);

  if (!isOpen) return null;

  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) {
      setDeadline("");
      setError(null);
      return;
    }

    const selectedDate = new Date(selectedValue);
    const now = new Date();

    if (selectedDate < now) {
      setError("Дедлайн не может быть в прошлом");
      setDeadline(selectedValue);
      return;
    }

    setError(null);
    setDeadline(selectedValue);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Название проекта обязательно");
      return;
    }

    if (!deadline) {
      setError("Дедлайн обязателен");
      return;
    }

    const selectedDate = new Date(deadline);
    const now = new Date();
    if (selectedDate < now) {
      setError("Дедлайн не может быть в прошлом");
      return;
    }

    setLoading(true);
    setError(null);

    onSubmit({
      id: project?.id,
      name: name.trim(),
      deadline,
      description: description.trim(),
      creationDate: project?.creationDate ?? new Date().toISOString()
    });

    setLoading(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getMinDateTime = (): string => {
    return formatDateTimeForInput(new Date());
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
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)"
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#1d4ed8" }}>
          {project ? "Редактировать проект" : "Создать проект"}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Название проекта <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название проекта"
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

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>
              Дедлайн <span style={{ color: "#dc2626" }}>*</span>
            </span>
            <div style={{ position: "relative" }}>
              <input
                type="datetime-local"
                value={deadline}
                onChange={handleDeadlineChange}
                min={getMinDateTime()}
                required
                style={{
                  padding: "0.75rem 1rem",
                  paddingRight: "1rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  width: "100%"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#475569",
                  fontSize: "1.2rem"
                }}
              >
              </span>
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500 }}>Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание проекта (необязательно)"
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
              {loading ? "Сохранение..." : project ? "Сохранить изменения" : "Создать проект"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

