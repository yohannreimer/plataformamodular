// apps/frontend/src/pages/LoginPage.tsx
import { SignIn } from '@clerk/clerk-react';
import prymeiraLogo from '../assets/prymeira-logo.png';   // logotipo horizontal (painel direito)
import prymeiraSelo from '../assets/prymeira-selo.png';   // ícone/marca dourada (painel esquerdo)
import { getAppTheme } from './login-themes';
import { LoginDecoration } from './login-decorations';
import './login-fonts.css';

export function LoginPage() {
  const theme = getAppTheme();

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Painel esquerdo — identidade do app ── */}
      <div
        style={{
          width: 'min(50%, 560px)',
          background: theme.gradient,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Prymeira — ícone/marca pequena no topo esquerdo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <img
            src={prymeiraSelo}
            alt="Prymeira"
            style={{ height: 22, opacity: theme.prymeiraLogoOpacity }}
          />
        </div>

        {/* Elemento decorativo específico do app */}
        <LoginDecoration type={theme.decorativeElement} />

        {/* Identidade do app — âncora no canto inferior esquerdo */}
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 42,
              color: theme.nameColor,
              lineHeight: 0.95,
              letterSpacing: theme.nameLetterSpacing,
              textTransform: theme.nameTextTransform,
              marginBottom: 10,
            }}
          >
            {theme.name}
          </div>
          <div
            style={{
              width: 24,
              height: theme.separatorHeight,
              background: theme.separatorColor,
              borderRadius: 2,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              color: theme.taglineColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.6,
            }}
          >
            {theme.tagline[0]}
            <br />
            {theme.tagline[1]}
          </div>
        </div>
      </div>

      {/* ── Painel direito — form Clerk ── */}
      <div
        style={{
          flex: 1,
          background: '#f8f9fb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '52px 48px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo Prymeira — tamanho completo */}
          <img
            src={prymeiraLogo}
            alt="Prymeira"
            style={{ height: 22, display: 'block', marginBottom: 28 }}
          />

          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 8px',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Acesso à Plataforma
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: '#94a3b8',
              margin: '0 0 32px',
              lineHeight: 1.55,
            }}
          >
            Entre com sua conta Prymeira para validar seus produtos.
          </p>

          <SignIn
            routing="hash"
            signUpUrl="#/sign-up"
            forceRedirectUrl="/app"
            appearance={{
              variables: {
                colorPrimary: theme.clerkPrimaryColor,
                colorBackground: '#f8f9fb',
                colorInputBackground: '#ffffff',
                colorInputText: '#0f172a',
                colorText: '#0f172a',
                colorTextSecondary: '#64748b',
                borderRadius: '10px',
                fontSize: '14px',
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                  border: 'none',
                  padding: '0',
                  width: '100%',
                },
                header: { display: 'none' },
                formButtonPrimary: {
                  color: theme.clerkButtonTextColor,
                  fontWeight: '700',
                  padding: '13px 20px',
                  height: '46px',
                  fontSize: '14px',
                },
                socialButtonsBlockButton: {
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  padding: '12px 20px',
                  height: '44px',
                  gap: '10px',
                },
                socialButtonsBlockButtonText: {
                  fontSize: '14px',
                  fontWeight: '500',
                },
                formFieldInput: {
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  height: '42px',
                  padding: '0 14px',
                },
                footer: { background: 'transparent' },
                footerAction: { background: 'transparent' },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
