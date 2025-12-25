import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi, User } from "../api/auth";
import { Team, teamsApi } from "../api/teams";
import { ConfirmModal } from "../components/ConfirmModal";
import { CreateTeamModal } from "../components/CreateTeamModal";
import { EditTeamModal } from "../components/EditTeamModal";
import { Header } from "../components/Header";
import { TeamMembersModal } from "../components/TeamMembersModal";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [leavingTeam, setLeavingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const teamsData = await teamsApi.getAll();
      setTeams(teamsData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Слушаем событие обновления команд (например, после принятия приглашения)
    const handleTeamsUpdate = () => {
      loadData();
    };
    
    window.addEventListener("teamsUpdated", handleTeamsUpdate);
    
    return () => {
      window.removeEventListener("teamsUpdated", handleTeamsUpdate);
    };
  }, [loadData]);

  const handleCreateTeam = async (name: string) => {
    try {
      const newTeam = await teamsApi.create({ name });
      setTeams([...teams, newTeam]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create team", error);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setIsEditModalOpen(true);
  };

  const handleUpdateTeam = async (name: string) => {
    if (!editingTeam) return;
    try {
      const updatedTeam = await teamsApi.update(editingTeam.id, { name });
      setTeams(teams.map((t) => (t.id === editingTeam.id ? updatedTeam : t)));
      setIsEditModalOpen(false);
      setEditingTeam(null);
    } catch (error) {
      console.error("Failed to update team", error);
      alert("Ошибка при обновлении команды");
    }
  };

  const handleDeleteTeam = (team: Team) => {
    setDeletingTeam(team);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deletingTeam) return;
    try {
      await teamsApi.delete(deletingTeam.id);
      setTeams(teams.filter((t) => t.id !== deletingTeam.id));
      setIsDeleteModalOpen(false);
      setDeletingTeam(null);
    } catch (error) {
      console.error("Failed to delete team", error);
      alert("Ошибка при удалении команды");
      setIsDeleteModalOpen(false);
      setDeletingTeam(null);
    }
  };

  const handleLeaveTeam = (team: Team) => {
    setLeavingTeam(team);
    setIsLeaveModalOpen(true);
  };

  const handleConfirmLeaveTeam = async () => {
    if (!leavingTeam) return;
    try {
      await teamsApi.leave(leavingTeam.id);
      setTeams(teams.filter((t) => t.id !== leavingTeam.id));
      setIsLeaveModalOpen(false);
      setLeavingTeam(null);
    } catch (error) {
      console.error("Failed to leave team", error);
      alert("Ошибка при выходе из команды");
      setIsLeaveModalOpen(false);
      setLeavingTeam(null);
    }
  };

  const handleViewMembers = async (team: Team) => {
    try {
      const fullTeam = await teamsApi.getOne(team.id);
      setSelectedTeam(fullTeam);
      setIsMembersModalOpen(true);
    } catch (error) {
      console.error("Failed to load team members", error);
      alert("Ошибка при загрузке участников");
    }
  };

  const handleTeamClick = (teamId: number) => {
    navigate(`/teams/${teamId}`);
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
        {teams.length === 0 ? (
          <div
            style={{
              margin: "4rem auto",
              maxWidth: "560px",
              padding: "2.5rem",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 20px 45px rgba(30, 64, 175, 0.12)",
              textAlign: "center"
            }}
          >
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem", color: "#1d4ed8" }}>Создайте свою команду</h1>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
              Пока вы не присоединились ни к одной команде. Создайте команду, чтобы вести проект и строить обратную
              диаграмму Ганта.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                padding: "0.9rem 2.2rem",
                borderRadius: "14px",
                border: "none",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#ffffff",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                boxShadow: "0 15px 32px rgba(37, 99, 235, 0.24)",
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
              Создать команду
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <h1 style={{ fontSize: "2rem", color: "#1d4ed8" }}>Мои команды</h1>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
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
                + Создать команду
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {teams.map((team) => (
                <div
                  key={team.id}
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
                  <div
                    onClick={() => handleTeamClick(team.id)}
                    style={{
                      flex: 1,
                      cursor: "pointer",
                      minWidth: 0
                    }}
                  >
                    <h2 style={{ 
                      fontSize: "1.25rem", 
                      marginBottom: "0.5rem", 
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }} title={team.name}>
                      {team.name}
                    </h2>
                    <p style={{ color: "#475569" }}>Проектов: {team.project_count || 0}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMembers(team);
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(148, 163, 184, 0.3)",
                        background: "rgba(148, 163, 184, 0.1)",
                        color: "#64748b",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.background = "rgba(148, 163, 184, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)";
                      }}
                    >
                      Участники
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTeam(team);
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
                        transition: "all 0.15s ease"
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
                        handleLeaveTeam(team);
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        background: "rgba(245, 158, 11, 0.1)",
                        color: "#f59e0b",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Выйти
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team);
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
                        transition: "all 0.15s ease"
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
          </>
        )}
      </div>
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
      />

      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeam(null);
        }}
        onSubmit={handleUpdateTeam}
        currentName={editingTeam?.name}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTeam(null);
        }}
        onConfirm={handleConfirmDeleteTeam}
        title="Удалить команду?"
        message="Вы действительно хотите удалить команду? Все проекты этой команды также будут удалены."
        confirmText="Удалить"
        danger={true}
      />

      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setLeavingTeam(null);
        }}
        onConfirm={handleConfirmLeaveTeam}
        title="Выйти из команды?"
        message={`Вы действительно хотите выйти из команды "${leavingTeam?.name}"?`}
        confirmText="Выйти"
        danger={true}
      />

      <TeamMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => {
          setIsMembersModalOpen(false);
          setSelectedTeam(null);
        }}
        members={selectedTeam?.members || []}
        teamName={selectedTeam?.name || ""}
      />
    </div>
  );
};
