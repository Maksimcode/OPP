import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Invite = {
  id: number;
  teamName: string;
  invitedBy: string;
};

interface NotificationsContextType {
  invites: Invite[];
  addInvite: (invite: Invite) => void;
  removeInvite: (inviteId: number) => void;
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

  const addInvite = useCallback((invite: Invite) => {
    setInvites((prev) => [...prev, invite]);
  }, []);

  const removeInvite = useCallback((inviteId: number) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
  }, []);

  return (
    <NotificationsContext.Provider value={{ invites, addInvite, removeInvite }}>
      {children}
    </NotificationsContext.Provider>
  );
};


