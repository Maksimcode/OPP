interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  danger = true
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
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
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: danger ? "#dc2626" : "#1d4ed8" }}>
          {title}
        </h2>
        <p style={{ color: "#475569", marginBottom: "1.5rem", lineHeight: "1.6" }}>{message}</p>
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
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              border: "none",
              background: danger
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "white",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


