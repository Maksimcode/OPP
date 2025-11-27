import { Route, Routes } from "react-router-dom";

import { AuthLayout } from "./components/AuthLayout";
import { NotificationsContainer } from "./components/NotificationsContainer";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { TeamPage } from "./pages/TeamPage";
import { ProjectPage } from "./pages/ProjectPage";

function App() {
  return (
    <>
      <Routes>
        <Route element={<AuthLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/teams/:teamId" element={<TeamPage />} />
        <Route path="/teams/:teamId/projects/:projectId" element={<ProjectPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
      <NotificationsContainer />
    </>
  );
}

export default App;
