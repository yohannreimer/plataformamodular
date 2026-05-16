import { SignIn } from '@clerk/clerk-react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import prymeiraSelo from '../assets/prymeira-selo.png';

export function LoginPage() {
  return (
    <div className="login-screen">
      <div className="login-panel" aria-hidden="true">
        <img src={prymeiraSelo} alt="" className="login-panel__logo" />
        <span className="login-panel__tagline">Plataforma Modular</span>
      </div>
      <div className="login-card login-card--clerk">
        <img className="login-brand-logo" src={prymeiraLogo} alt="Prymeira" />
        <div className="login-card__intro">
          <h1>Acesso à Plataforma</h1>
          <p>Entre com sua conta Prymeira para validar seus produtos.</p>
        </div>
        <SignIn
          routing="hash"
          signUpUrl="#/sign-up"
          forceRedirectUrl="/app"
          appearance={{
            elements: {
              rootBox: 'login-clerk-root',
              card: 'login-clerk-card'
            }
          }}
        />
        <small className="login-footnote">Prymeira · Plataforma Modular</small>
      </div>
    </div>
  );
}
