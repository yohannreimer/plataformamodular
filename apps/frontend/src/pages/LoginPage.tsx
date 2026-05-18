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
          width: '42%',
          background: theme.gradient,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px',
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
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 28px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Logo Prymeira — tamanho completo */}
          <img
            src={prymeiraLogo}
            alt="Prymeira"
            style={{ height: 24, display: 'block', marginBottom: 24 }}
          />

          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#111111',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            Acesso à Plataforma
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#999999',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            Entre com sua conta Prymeira para validar seus produtos.
          </p>

          {/*
           * Clerk SignIn:
           * - card e header ocultados (usamos nosso próprio heading acima)
           * - colorPrimary define a cor do botão "Continuar" por app
           * - clerkButtonTextColor define a cor do texto do botão
           */}
          <SignIn
            routing="hash"
            signUpUrl="#/sign-up"
            forceRedirectUrl="/app"
            appearance={{
              variables: {
                colorPrimary: theme.clerkPrimaryColor,
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                  padding: '0',
                  width: '100%',
                },
                header: { display: 'none' },
                formButtonPrimary: { color: theme.clerkButtonTextColor },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
