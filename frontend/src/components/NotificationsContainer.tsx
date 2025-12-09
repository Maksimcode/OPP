import { useNavigate } from "react-router-dom";

import { teamsApi } from "../api/teams";
import { useNotificationsContext } from "../context/NotificationsContext";
import { TeamInviteNotification } from "./TeamInviteNotification";

export const NotificationsContainer = () => {
  const navigate = useNavigate();
  const { invites, removeInvite, refreshInvitations } = useNotificationsContext();

  const handleAccept = async (inviteId: number) => {
    try {
      await teamsApi.respondToInvitation(inviteId, "accept");
      removeInvite(inviteId);
      await refreshInvitations();
      
      // Отправляем событие для обновления списка команд
      window.dispatchEvent(new CustomEvent("teamsUpdated"));
      
      // Можно перенаправить на страницу команды, если нужно
      // navigate(`/teams/${teamId}`);
    } catch (error) {
      console.error("Failed to accept invitation", error);
      alert("Не удалось принять приглашение");
    }
  };

  const handleDecline = async (inviteId: number) => {
    try {
      await teamsApi.respondToInvitation(inviteId, "decline");
      removeInvite(inviteId);
      await refreshInvitations();
    } catch (error) {
      console.error("Failed to decline invitation", error);
      alert("Не удалось отклонить приглашение");
    }
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

