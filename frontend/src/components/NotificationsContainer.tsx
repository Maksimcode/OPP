import { useNotificationsContext } from "../context/NotificationsContext";
import { TeamInviteNotification } from "./TeamInviteNotification";

export const NotificationsContainer = () => {
  const { invites, removeInvite } = useNotificationsContext();

  const handleAccept = (inviteId: number) => {
    // TODO: заменить на реальный API запрос
    console.log("Приглашение принято:", inviteId);
    removeInvite(inviteId);
    // TODO: перенаправить на страницу команды или обновить список команд
  };

  const handleDecline = (inviteId: number) => {
    // TODO: заменить на реальный API запрос
    console.log("Приглашение отклонено:", inviteId);
    removeInvite(inviteId);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        zIndex: 2000,
        maxWidth: "400px"
      }}
    >
      {invites.map((invite, index) => (
        <div
          key={invite.id}
          style={{
            animation: "slideInRight 0.3s ease-out",
            animationDelay: `${index * 0.1}s`
          }}
        >
          <TeamInviteNotification
            invite={invite}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        </div>
      ))}
    </div>
  );
};

