import { httpClient } from "./client";

export interface ApiTask {
  id: number;
  name: string;
  duration: number;
  is_completed: boolean;
  responsibles: string[];
  feedback?: string;
  dependencies: number[];
  stage_id: number;
}

export interface ApiStage {
  id: number;
  name: string;
  duration: number;
  is_completed: boolean;
  responsibles: string[];
  feedback?: string;
  dependencies: number[];
  tasks: ApiTask[];
  project_id: number;
}

export interface ApiProject {
  id: number;
  name: string;
  description?: string;
  deadline: string;
  created_at: string;
  team_id: number;
  stages: ApiStage[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  deadline: string;
  team_id: number;
}

export interface UpdateProjectPayload {
  name: string;
  description?: string;
  deadline: string;
}

export interface CreateTaskPayload {
  name: string;
  duration?: number;
  is_completed?: boolean;
  responsibles?: string[];
  feedback?: string;
  dependencies?: number[];
}

export interface CreateStagePayload {
  name: string;
  duration?: number;
  is_completed?: boolean;
  responsibles?: string[];
  feedback?: string;
  dependencies?: number[];
  tasks?: CreateTaskPayload[];
}

export const projectsApi = {
  create: async (payload: CreateProjectPayload): Promise<ApiProject> => {
    const { data } = await httpClient.post<ApiProject>("/projects", payload);
    return data;
  },
  update: async (id: number, payload: UpdateProjectPayload): Promise<ApiProject> => {
    const { data } = await httpClient.put<ApiProject>(`/projects/${id}`, payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`/projects/${id}`);
  },
  getAllByTeam: async (teamId: number): Promise<ApiProject[]> => {
    const { data } = await httpClient.get<ApiProject[]>("/projects", {
      params: { team_id: teamId }
    });
    return data;
  },
  getOne: async (id: number): Promise<ApiProject> => {
    const { data } = await httpClient.get<ApiProject>(`/projects/${id}`);
    return data;
  },
  updateStages: async (projectId: number, stages: CreateStagePayload[]): Promise<ApiStage[]> => {
    const { data } = await httpClient.put<ApiStage[]>(`/projects/${projectId}/stages`, stages);
    return data;
  }
};

