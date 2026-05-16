import { useState, type FormEvent } from 'react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import prymeiraSelo from '../assets/prymeira-selo.png';

type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await onLogin(username.trim(), password);
    if (!result.ok) {
      setError(result.message || 'Usuário ou senha inválidos.');
      setLoading(false);
      return;
    }
    setError('');
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-panel" aria-hidden="true">
        <img src={prymeiraSelo} alt="" className="login-panel__logo" />
        <span className="login-panel__tagline">Plataforma Modular</span>
      </div>
      <div className="login-card">
        <img className="login-brand-logo" src={prymeiraLogo} alt="Prymeira" />
        <div className="login-card__intro">
          <h1>Acesso à Plataforma</h1>
          <p>Ambiente interno de gestão técnica e operacional.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            Login
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Digite o login"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Digite a senha"
            />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <small className="login-footnote">Prymeira · Plataforma Modular</small>
      </div>
    </div>
  );
}
