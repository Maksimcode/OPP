import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { authApi } from "../api/auth";
import { useAuth } from "../hooks/useAuth";

interface LocationState {
  from?: Location;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccessToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { access_token } = await authApi.login({ email, password });
      setAccessToken(access_token);
      const state = location.state as LocationState | undefined;
      navigate(state?.from?.pathname ?? "/");
    } catch (err) {
      setError("Не удалось войти. Проверьте данные и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <header className="brand">
          <div className="brand-logo">RG</div>
          <div className="brand-title">
            <strong>Reverse Gantt</strong>
            <span>Планирование результатов командных проектов</span>
          </div>
        </header>
        <section className="auth-form">
          <h1>Вход в аккаунт</h1>
          <p className="caption">Продолжите работу над обратной диаграммой Ганта.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Введите пароль"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        </section>
        <footer className="auth-footer">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </footer>
      </div>
    </div>
  );
};
