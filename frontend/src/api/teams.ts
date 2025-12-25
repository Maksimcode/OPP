import { httpClient } from "./client";

export interface TeamMember {
  id: number;
  full_name: string;
  email: string;
}

export interface Team {
  id: number;
  name: string;
  created_at: string;
  owner_id: number;
  project_count?: number;
  members?: TeamMember[];
}

export interface CreateTeamPayload {
  name: string;
}

export interface UpdateTeamPayload {
  name: string;
}

export interface Student {
  id: number;
  email: string;
  full_name: string;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  invited_user_id: number;
  invited_by_id: number;
  status: string;
  created_at: string;
  responded_at?: string;
  team_name?: string;
  invited_by_name?: string;
  invited_user_name?: string;
}

export interface CreateInvitationPayload {
  invited_user_id: number;
}

export interface RespondToInvitationPayload {
  id: number;
  action: "accept" | "decline";
}

export const teamsApi = {
  getAll: async (): Promise<Team[]> => {
    const { data } = await httpClient.get<Team[]>("/teams");
    return data;
  },
  create: async (payload: CreateTeamPayload): Promise<Team> => {
    const { data } = await httpClient.post<Team>("/teams", payload);
    return data;
  },
  update: async (id: number, payload: UpdateTeamPayload): Promise<Team> => {
    const { data } = await httpClient.put<Team>(`/teams/${id}`, payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`/teams/${id}`);
  },
  getOne: async (id: number): Promise<Team> => {
    const { data } = await httpClient.get<Team>(`/teams/${id}`);
    return data;
  },
  searchUsers: async (query: string): Promise<Student[]> => {
    const { data } = await httpClient.get<Student[]>("/teams/search-users", {
      params: { q: query }
    });
    return data;
  },
  createInvitation: async (teamId: number, payload: CreateInvitationPayload): Promise<TeamInvitation> => {
    const { data } = await httpClient.post<TeamInvitation>(`/teams/${teamId}/invitations`, payload);
    return data;
  },
  getMyInvitations: async (): Promise<TeamInvitation[]> => {
    const { data } = await httpClient.get<TeamInvitation[]>("/teams/invitations/my");
    return data;
  },
  respondToInvitation: async (invitationId: number, action: "accept" | "decline"): Promise<void> => {
    await httpClient.post(`/teams/invitations/${invitationId}/respond`, {
      id: invitationId,
      action
    });
  },
  inviteMember: async (teamId: number, email: string): Promise<void> => {
    await httpClient.post(`/teams/${teamId}/members`, null, {
      params: { email }
    });
  },
  leave: async (teamId: number): Promise<void> => {
    await httpClient.post(`/teams/${teamId}/leave`);
  }
};

