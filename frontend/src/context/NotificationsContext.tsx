import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

import { TeamInvitation, teamsApi } from "../api/teams";

type Invite = {
  id: number;
  teamName: string;
  invitedBy: string;
  teamId: number;
};

interface NotificationsContextType {
  invites: Invite[];
  addInvite: (invite: Invite) => void;
  removeInvite: (inviteId: number) => void;
  loadInvitations: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsContext must be used within NotificationsProvider");
  }
  return context;
};

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider = ({ children }: NotificationsProviderProps) => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiInvites = await teamsApi.getMyInvitations();
      const mappedInvites: Invite[] = apiInvites.map(inv => ({
        id: inv.id,
        teamName: inv.team_name || "Команда",
        invitedBy: inv.invited_by_name || "Пользователь",
        teamId: inv.team_id
      }));
      setInvites(mappedInvites);
    } catch (error) {
      console.error("Failed to load invitations", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInvitations = useCallback(async () => {
    await loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    // Загружаем приглашения при монтировании компонента
    loadInvitations();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadInvitations, 30000);
    return () => clearInterval(interval);
  }, [loadInvitations]);

  const addInvite = useCallback((invite: Invite) => {
    setInvites((prev) => [...prev, invite]);
  }, []);

  const removeInvite = useCallback((inviteId: number) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
  }, []);

  return (
    <NotificationsContext.Provider value={{ invites, addInvite, removeInvite, loadInvitations, refreshInvitations }}>
      {children}
    </NotificationsContext.Provider>
  );
};


