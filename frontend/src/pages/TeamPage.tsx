import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiProject, projectsApi } from "../api/projects";
import { teamsApi } from "../api/teams";
import { ConfirmModal } from "../components/ConfirmModal";
import { Header } from "../components/Header";
import { InviteStudentForm } from "../components/InviteStudentForm";
import { ProjectModal } from "../components/ProjectModal";
import { useNotificationsContext } from "../context/NotificationsContext";

// Локальный тип для списка проектов (данные из API, id/creationDate всегда есть)
type Project = {
  id: number;
  name: string;
  deadline: string;
  description: string;
  creationDate: string;
};

// Тип формы для ProjectModal (id/creationDate могут отсутствовать)
type ProjectForm = {
  id?: number;
  name: string;
  deadline: string;
  description: string;
  creationDate?: string;
};

export const TeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { addInvite } = useNotificationsContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamName, setTeamName] = useState(`Команда #${teamId}`);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectForm | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadData(Number(teamId));
    }
  }, [teamId]);

  const loadData = async (id: number) => {
    try {
      const [teamData, projectsData] = await Promise.all([
        teamsApi.getOne(id),
        projectsApi.getAllByTeam(id)
      ]);
      
      setTeamName(teamData.name);
      
      // Преобразуем ApiProject в локальный Project
      const mappedProjects: Project[] = projectsData.map(p => ({
        id: p.id,
        name: p.name,
        deadline: p.deadline,
        description: p.description || "",
        creationDate: p.created_at
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error("Failed to load team data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setDeletingProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleProjectSubmit = (projectData: ProjectForm) => {
    if (!teamId) return;

    void (async () => {
      try {
        if (editingProject?.id != null) {
          // Обновление существующего проекта
          const updatedProjectApi = await projectsApi.update(editingProject.id, {
            name: projectData.name,
            description: projectData.description,
            deadline: projectData.deadline
          });

          const updatedProject: Project = {
            id: updatedProjectApi.id,
            name: updatedProjectApi.name,
            deadline: updatedProjectApi.deadline,
            description: updatedProjectApi.description || "",
            creationDate: updatedProjectApi.created_at
          };

          setProjects(projects.map((p) => (p.id === editingProject.id ? updatedProject : p)));
          setIsProjectModalOpen(false);
        } else {
          // Создание нового проекта
          const newProjectApi = await projectsApi.create({
            name: projectData.name,
            description: projectData.description,
            deadline: projectData.deadline,
            team_id: Number(teamId)
          });

          const newProject: Project = {
            id: newProjectApi.id,
            name: newProjectApi.name,
            deadline: newProjectApi.deadline,
            description: newProjectApi.description || "",
            creationDate: newProjectApi.created_at
          };

          setProjects([...projects, newProject]);
          setIsProjectModalOpen(false);
        }
        setEditingProject(null);
      } catch (error) {
        console.error("Failed to save project", error);
        alert("Не удалось сохранить проект");
      }
    })();
  };

  const handleOpenProject = (project: Project) => {
    // Передаем данные проекта в state, чтобы не загружать лишний раз (хотя там будет загрузка деталей)
    // Важно: передаем ApiProject структуру если ProjectPage ожидает её, 
    // но ProjectPage сейчас тоже на моках или требует адаптации.
    // Сейчас ProjectPage адаптируем на следующем шаге.
    navigate(`/teams/${teamId}/projects/${project.id}`, { 
      state: { 
        project: {
            ...project,
            deadline: project.deadline, 
            creationDate: project.creationDate 
        }, 
        teamName 
      } 
    });
  };

  const handleConfirmDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      await projectsApi.delete(deletingProject.id);
      setProjects(projects.filter((p) => p.id !== deletingProject.id));
      setIsDeleteModalOpen(false);
      setDeletingProject(null);
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Ошибка при удалении проекта");
      setIsDeleteModalOpen(false);
      setDeletingProject(null);
    }
  };

  const handleInviteStudent = async (email: string) => {
    if (!teamId) return;
    try {
      await teamsApi.inviteMember(Number(teamId), email);
    } catch (error) {
      console.error("Failed to invite member", error);
      throw error; // Пробросим ошибку в форму
    }
  };

  const formatDeadline = (deadline: string): string => {
    const date = new Date(deadline);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div style={{ paddingTop: "80px", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "80px", minHeight: "100vh" }}>
      <Header />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            marginBottom: "1.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "white",
            color: "#475569",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          ← Назад к командам
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", color: "#1d4ed8" }}>Проекты команды {teamName}</h1>
          <button
            type="button"
            onClick={handleCreateProject}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
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
            + Создать проект
          </button>
        </div>

        <InviteStudentForm teamId={Number(teamId)} onInvite={handleInviteStudent} />

        {projects.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: "18px",
              boxShadow: "0 20px 45px rgba(30, 64, 175, 0.12)"
            }}
          >
            <p style={{ color: "#475569", fontSize: "1.1rem", marginBottom: "1rem" }}>
              В этой команде пока нет проектов
            </p>
            <p style={{ color: "#64748b" }}>Создайте первый проект, чтобы начать работу</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.12)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start"
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => handleOpenProject(project)}
                    style={{ cursor: "pointer" }}
                  >
                    <h2 style={{ 
                      fontSize: "1.25rem", 
                      marginBottom: "0.5rem", 
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {project.name}
                    </h2>
                    {project.description && (
                      <p style={{ 
                        color: "#475569", 
                        marginBottom: "0.75rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>{project.description}</p>
                    )}
                    <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                      Дедлайн: <strong>{formatDeadline(project.deadline)}</strong>
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                      Создан:{" "}
                      {new Date(project.creationDate).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem", flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProject(project);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                      fontSize: "0.9rem",
                      fontWeight: 600,
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
                    Изменить
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      fontSize: "0.9rem",
                      fontWeight: 600,
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
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleProjectSubmit}
        project={editingProject}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingProject(null);
        }}
        onConfirm={handleConfirmDeleteProject}
        title="Удалить проект?"
        message="Вы действительно хотите удалить проект?"
        confirmText="Удалить"
        danger={true}
      />
    </div>
  );
};
