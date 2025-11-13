type Team = {
  id: number;
  name: string;
  projectCount: number;
};

const mockTeams: Team[] = [];

export const Dashboard = () => {
  const teams = mockTeams;

  if (teams.length === 0) {
    return (
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
          Пока вы не присоединились ни к одной команде. Создайте команду, чтобы вести проект и строить обратную диаграмму
          Ганта.
        </p>
        <button
          type="button"
          style={{
            padding: "0.9rem 2.2rem",
            borderRadius: "14px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 15px 32px rgba(37, 99, 235, 0.24)",
            cursor: "pointer"
          }}
          onClick={() => {
            // TODO: заменить на реальное действие (открыть модалку/перейти на форму создания команды)
            alert("Здесь появится создание команды");
          }}
        >
          Создать команду
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "3rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem", color: "#1d4ed8" }}>Мои команды</h1>
      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {teams.map((team) => (
          <div
            key={team.id}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 14px 32px rgba(15, 23, 42, 0.12)"
            }}
          >
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#0f172a" }}>{team.name}</h2>
            <p style={{ color: "#475569" }}>Проектов: {team.projectCount}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
