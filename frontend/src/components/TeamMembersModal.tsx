import React from "react";
import { TeamMember } from "../api/teams";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  teamName: string;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({ isOpen, onClose, members, teamName }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        className="modal-content"
        style={{
          background: "white",
          borderRadius: "18px",
          padding: "2rem",
          width: "90%",
          maxWidth: "480px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#1d4ed8" }}>Участники команды</h2>
          <p style={{ color: "#475569", fontSize: "1rem" }}>{teamName}</p>
        </div>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "0.75rem", 
          maxHeight: "350px", 
          overflowY: "auto",
          paddingRight: "0.5rem" 
        }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                background: "#f8fafc"
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                {member.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "1rem" }}>{member.full_name}</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {member.email}
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p style={{ textAlign: "center", color: "#64748b", padding: "1.5rem" }}>В команде пока нет участников</p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "white",
              color: "#475569",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

