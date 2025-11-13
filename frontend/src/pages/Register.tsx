import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "../api/auth";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.register({ email, password, full_name: fullName });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      setError("Не удалось зарегистрироваться. Попробуйте снова или обратитесь к администратору.");
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
            <span>Создайте аккаунт, чтобы управлять результатами</span>
          </div>
        </header>
        <section className="auth-form">
          <h1>Регистрация</h1>
          <p className="caption">Заполните поля ниже — аккаунт активируется сразу после создания.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Имя студента
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Иван Иванов"
              />
            </label>
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
                autoComplete="new-password"
                minLength={6}
                placeholder="Минимум 6 символов"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">Успешно! Перенаправляем на вход...</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </button>
          </form>
        </section>
        <footer className="auth-footer">
          Уже зарегистрированы? <Link to="/login">Войти</Link>
        </footer>
      </div>
    </div>
  );
};
