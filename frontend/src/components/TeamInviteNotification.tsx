type Invite = {
  id: number;
  teamName: string;
  invitedBy: string;
};

interface TeamInviteNotificationProps {
  invite: Invite;
  onAccept: (inviteId: number) => void;
  onDecline: (inviteId: number) => void;
}

export const TeamInviteNotification = ({ invite, onAccept, onDecline }: TeamInviteNotificationProps) => {
  const handleAccept = () => {
    onAccept(invite.id);
  };

  const handleDecline = () => {
    onDecline(invite.id);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.2)",
        minWidth: "320px",
        width: "100%",
        border: "2px solid rgba(59, 130, 246, 0.3)"
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
            color: "#1d4ed8"
          }}
        >
          Приглашение в команду
        </h3>
        <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>
          <strong>{invite.invitedBy}</strong> приглашает вас в команду <strong>«{invite.teamName}»</strong>
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleAccept}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            cursor: "pointer",
            transition: "transform 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Принять
        </button>
        <button
          onClick={handleDecline}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "white",
            color: "#475569",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
          }}
        >
          Отклонить
        </button>
      </div>
    </div>
  );
};

