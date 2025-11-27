import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmModal } from "../components/ConfirmModal";
import { Header } from "../components/Header";
import { InviteStudentForm } from "../components/InviteStudentForm";
import { ProjectModal } from "../components/ProjectModal";
import { useNotificationsContext } from "../context/NotificationsContext";

type Project = {
  id: number;
  name: string;
  deadline: string;
  description: string;
  creationDate: string;
};

// Mock данные - заменить на реальные данные из API
const mockProjects: Project[] = [];

export const TeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { addInvite } = useNotificationsContext();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Mock данные для текущей команды - заменить на реальные данные из API
  const teamName = `Команда #${teamId}`;

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

  const handleProjectSubmit = (projectData: Project) => {
    if (editingProject) {
      // Обновление существующего проекта
      setProjects(
        projects.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                ...projectData,
                id: editingProject.id,
                creationDate: projectData.creationDate ?? editingProject.creationDate
              }
            : p
        )
      );
    } else {
      // Создание нового проекта
      const newProject: Project = {
        id: Date.now(),
        ...projectData,
        creationDate: projectData.creationDate ?? new Date().toISOString()
      };
      setProjects([...projects, newProject]);
    }
    setEditingProject(null);
  };

  const handleOpenProject = (project: Project) => {
    navigate(`/teams/${teamId}/projects/${project.id}`, { state: { project, teamName } });
  };

  const handleConfirmDeleteProject = () => {
    if (deletingProject) {
      setProjects(projects.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    }
  };

  const handleInviteStudent = (studentName: string) => {
    // TODO: заменить на реальный API запрос
    // В реальности приглашение будет отправлено указанному студенту, и уведомление появится у него
    // Для демо создаём уведомление для самого себя, как будто приглашение пришло от другого студента
    const newInvite = {
      id: Date.now(),
      teamName: teamName,
      invitedBy: studentName // Имя студента, который получил приглашение (для демо показываем, как будто он приглашает)
    };
    // Добавляем уведомление с небольшой задержкой для реалистичности
    setTimeout(() => {
      addInvite(newInvite);
    }, 500);
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
          <h1 style={{ fontSize: "2rem", color: "#1d4ed8" }}>Проекты команды #{teamId}</h1>
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

        <InviteStudentForm onInvite={handleInviteStudent} />

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
                <div style={{ flex: 1 }}>
                  <div
                    onClick={() => handleOpenProject(project)}
                    style={{ cursor: "pointer" }}
                  >
                    <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#0f172a" }}>
                      {project.name}
                    </h2>
                    {project.description && (
                      <p style={{ color: "#475569", marginBottom: "0.75rem" }}>{project.description}</p>
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
                <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                  <button
                    onClick={() => handleOpenProject(project)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(14, 165, 233, 0.3)",
                      background: "rgba(14, 165, 233, 0.1)",
                      color: "#0ea5e9",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    📊 Диаграмма
                  </button>
                  <button
                    onClick={() => handleEditProject(project)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    ✏️ Изменить
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    🗑️ Удалить
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

