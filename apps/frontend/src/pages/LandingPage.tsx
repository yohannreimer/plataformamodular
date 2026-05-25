// apps/frontend/src/pages/LandingPage.tsx
import {
  AlertCircle, FileSpreadsheet, Flag,
  TrendingUp, ArrowLeftRight, Landmark, Receipt,
  Kanban, Calendar, Users, Award,
} from 'lucide-react';
const prymeiraLogo = '/favicon-32.png';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getAppTheme } from './login-themes';

// ─── Shared ────────────────────────────────────────────────────────────────────

function ScreenshotPlaceholder({
  width = '100%',
  height,
  label,
  tint,
  border,
}: {
  width?: string | number;
  height: string | number;
  label: string;
  tint: string;
  border: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: tint,
        border: `1px solid ${border}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 12, color: '#aaa' }}>{label}</span>
    </div>
  );
}

function PainCard({
  icon,
  title,
  sub,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: '#fff5f5',
        border: '1px solid #ffd5d5',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: '#fee2e2',
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─── Fluvia solution (auto-rotating screenshots) ──────────────────────────────

const FLUVIA_AUTO_INTERVAL = 3800;

const fluviaSolutionFeatures = [
  { src: '/fluvia-hero-dashboard.png', icon: <TrendingUp size={16} />, label: 'Dashboard', desc: 'Visão executiva do mês — caixa, receita, resultado e alertas numa tela.' },
  { src: '/fluvia-dre.png', icon: <TrendingUp size={16} />, label: 'DRE', desc: 'Resultado do mês disponível a qualquer hora. Sem esperar o contador.' },
  { src: '/fluvia-cashflow.png', icon: <ArrowLeftRight size={16} />, label: 'Fluxo de caixa', desc: 'Projeção de entradas e saídas em 30, 60 e 90 dias.' },
  { src: '/fluvia-receivables.png', icon: <Receipt size={16} />, label: 'Contas a receber', desc: 'Veja o que está em aberto, vencendo e atrasado — tudo num lugar.' },
  { src: '/fluvia-reconciliation.png', icon: <Landmark size={16} />, label: 'Conciliação', desc: 'Importe o extrato. O Fluvia cruza com seus lançamentos automaticamente.' },
];

function FluviaSolutionSection({ primary, primaryLight }: { primary: string; primaryLight: string }) {
  const [active, setActive] = useState(0);

  // Auto-advance — timer resets whenever `active` changes (manual or auto)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(i => (i + 1) % fluviaSolutionFeatures.length);
    }, FLUVIA_AUTO_INTERVAL);
    return () => clearTimeout(timer);
  }, [active]);

  const feature = fluviaSolutionFeatures[active];

  return (
    <section style={{ background: '#f8f9fb', padding: '72px 24px 80px', borderTop: '1px solid #f0f0f0' }}>
      {/* CSS keyframe for progress bar — injected once */}
      <style>{`
        @keyframes fluviaProgress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          A SOLUÇÃO
        </p>
        <h2 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          Um lugar só.<br />Tudo que o dono precisa ver.
        </h2>
        <p style={{ fontSize: 16, color: '#666', margin: '0 0 32px', lineHeight: 1.6 }}>
          DRE, fluxo de caixa e contas num só lugar — sem precisar virar contador.
        </p>

        {/* Browser bezel */}
        <div style={{ background: '#fff', border: '1px solid #dde4f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(10,61,107,0.18), 0 8px 24px rgba(10,61,107,0.08)' }}>
          {/* Chrome bar */}
          <div style={{ background: '#1e2535', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <div style={{ flex: 1, background: '#3a4455', borderRadius: 4, height: 12, margin: '0 12px' }} />
          </div>
          {/* Progress bar — key resets CSS animation on slide change */}
          <div style={{ height: 3, background: primaryLight, position: 'relative', overflow: 'hidden' }}>
            <div
              key={active}
              style={{
                position: 'absolute',
                top: 0, left: 0, height: '100%',
                background: primary,
                animation: `fluviaProgress ${FLUVIA_AUTO_INTERVAL}ms linear forwards`,
              }}
            />
          </div>
          {/* Screenshot stack — crossfade via opacity, fixed height prevents layout shift */}
          <div style={{ position: 'relative', height: 500, overflow: 'hidden', background: '#fff' }}>
            {fluviaSolutionFeatures.map((f, i) => (
              <img
                key={f.src}
                src={f.src}
                alt={f.label}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: 'auto',
                  display: 'block',
                  opacity: i === active ? 1 : 0,
                  transition: 'opacity 0.55s ease',
                }}
              />
            ))}
            {/* Soft gradient fade at bottom — signals more content, hides hard clip */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: 80,
              background: 'linear-gradient(to bottom, transparent, #ffffff)',
              pointerEvents: 'none',
            }} />
          </div>
          {/* Label bar — transitions smoothly via opacity */}
          <div style={{ padding: '16px 24px', borderTop: `3px solid ${primary}`, display: 'flex', alignItems: 'center', gap: 14, background: '#fff' }}>
            <div style={{ width: 36, height: 36, background: primary, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, transition: 'background 0.3s' }}>
              {feature.icon}
            </div>
            <div style={{ transition: 'opacity 0.3s', opacity: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{feature.label}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{feature.desc}</div>
            </div>
          </div>
        </div>

        {/* Navigation pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {fluviaSolutionFeatures.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                border: 'none', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                transition: 'all 0.15s',
                background: active === i ? primary : '#fff',
                color: active === i ? '#fff' : '#555',
                boxShadow: active === i ? `0 4px 14px rgba(10,61,107,0.22)` : '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ opacity: active === i ? 1 : 0.5, display: 'flex' }}>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Fluvia ────────────────────────────────────────────────────────────────────

function FluviaLandingPage() {
  const primary = '#0a3d6b';
  const primaryLight = '#e8f0fe';
  const accent = '#f0c040';
  const signUpUrl = '/';

  const stats = [
    { num: '5 min', label: 'para ver o lucro do mês' },
    { num: '100%', label: 'sem instalar nada' },
    { num: 'grátis', label: 'para começar agora' },
  ];

  const painCards = [
    {
      num: '01',
      title: 'DRE chega semanas depois',
      sub: 'Do contador. Em PDF. Quando o mês já foi.',
    },
    {
      num: '02',
      title: 'Fluxo de caixa no Excel',
      sub: 'Três abas, dois computadores, zero confiança.',
    },
    {
      num: '03',
      title: 'Decisões grandes no chute',
      sub: 'Contratar, investir, cortar. Sem dado nenhum.',
    },
  ];

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      <style>{`
        @keyframes fluviaFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fluvia-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(10,61,107,0.38) !important; }
        .fluvia-accent-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(240,192,64,0.45) !important; }
        .fluvia-pill-nav:hover { opacity: 0.85; }
      `}</style>

      {/* Navbar */}
      <nav
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={prymeiraLogo} alt="Prymeira" style={{ width: 22, height: 26, display: 'block' }} />
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em' }}>Fluvia</span>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          background: 'radial-gradient(ellipse 85% 75% at 72% 50%, #c8ddf5 0%, #e2eef9 28%, #f0f5fb 55%, #f8fafe 100%)',
          padding: '88px 24px 80px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: primary }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Para donos de PME
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(48px, 5.2vw, 72px)',
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
                margin: '0 0 22px',
              }}
            >
              Empresa não quebra<br />por falta de produto<span style={{ color: accent }}>.</span>
            </h1>
            <p style={{ fontSize: 18, color: '#4a5568', lineHeight: 1.72, margin: '0 0 36px', maxWidth: 420 }}>
              Quebra porque o dono não olha os números. O Fluvia muda isso.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a
                href={signUpUrl}
                className="fluvia-cta-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: primary,
                  color: '#fff',
                  borderRadius: 10,
                  padding: '15px 32px',
                  fontSize: 16,
                  fontWeight: 800,
                  textDecoration: 'none',
                  width: 'fit-content',
                  boxShadow: '0 8px 24px rgba(10,61,107,0.3)',
                  letterSpacing: '-0.01em',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                Criar conta grátis →
              </a>
              <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> Grátis pra começar
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                transform: 'perspective(900px) rotateY(-12deg) rotateX(4deg)',
                boxShadow: '28px 32px 80px rgba(10,61,107,0.28), 0 4px 16px rgba(10,61,107,0.08)',
              }}
            >
              <div
                style={{
                  background: primary,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: 6,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  Dashboard — Fluvia
                </span>
              </div>
              <img
                src="/fluvia-hero-dashboard.png"
                alt="Dashboard Fluvia"
                width={600}
                height={230}
                style={{ width: '100%', height: 230, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -28,
                right: -20,
                background: '#fff',
                border: '1px solid rgba(10,61,107,0.08)',
                borderRadius: 14,
                padding: '14px 22px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.13)',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                Lucro este mês
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', letterSpacing: '-0.03em' }}>+R$12.400</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ background: primary, padding: '20px 24px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            gap: 56,
            alignItems: 'center',
          }}
        >
          {stats.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
              {i > 0 && (
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, letterSpacing: '-0.02em' }}>{s.num}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section style={{ padding: '72px 24px 56px', background: '#fafbfc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#cbd5e1',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            O PROBLEMA
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40, alignItems: 'start', marginBottom: 40 }}>
            <div
              style={{
                fontSize: 'clamp(80px, 9vw, 130px)',
                fontWeight: 900,
                letterSpacing: '-0.06em',
                color: primary,
                lineHeight: 1,
                opacity: 0.10,
                userSelect: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              73%
            </div>
            <div style={{ paddingTop: 12 }}>
              <h2
                style={{
                  fontSize: 'clamp(32px, 3.2vw, 46px)',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  margin: '0 0 14px',
                }}
              >
                73% dos donos de PME não sabem o lucro{' '}
                <span style={{ color: primary }}>do mês anterior.</span>
              </h2>
              <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
                E não é por falta de inteligência. É porque o financeiro ficou espalhado entre WhatsApp, planilha e o contador.
              </p>
            </div>
          </div>

          {/* Pain cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {painCards.map((card) => (
              <div
                key={card.num}
                style={{
                  background: '#fff5f5',
                  border: '1px solid #fde0e0',
                  padding: '32px 28px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', marginBottom: 20 }}>
                  {card.num}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111', lineHeight: 1.3, marginBottom: 10 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.65 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution + Features unified */}
      <FluviaSolutionSection primary={primary} primaryLight={primaryLight} />

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #05192d, #0a3d6b)',
          position: 'relative',
          overflow: 'hidden',
          padding: '104px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2
            style={{
              fontSize: 'clamp(36px, 4vw, 56px)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: '0 0 18px',
            }}
          >
            Comece hoje.<br />Em 5 minutos você já sabe<br />
            <span style={{ color: accent }}>onde está o dinheiro.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.38)', margin: '0 0 36px' }}>
            Grátis pra começar. Sem cartão de crédito.
          </p>
          <a
            href={signUpUrl}
            className="fluvia-accent-btn"
            style={{
              background: accent,
              borderRadius: 10,
              padding: '16px 40px',
              fontSize: 17,
              fontWeight: 900,
              color: '#0a0a0a',
              textDecoration: 'none',
              display: 'inline-flex',
              letterSpacing: '-0.01em',
              boxShadow: '0 8px 32px rgba(240,192,64,0.32)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            Criar conta grátis →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#fff',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <span style={{ fontSize: 13, color: '#bbb' }}>© 2026 Prymeira · Fluvia</span>
        <span style={{ fontSize: 13, color: '#bbb' }}>Termos · Privacidade</span>
      </footer>
    </div>
  );
}

// ─── Velio solution (auto-rotating screenshots) ───────────────────────────────

const VELIO_AUTO_INTERVAL = 4000;

const velioSolutionFeatures = [
  {
    src: '/velio-planning.png',
    icon: <Calendar size={16} />,
    label: 'Planejamento',
    desc: 'Mapa de 60 dias com todas as turmas e técnicos. Autoaloque encontros com um clique.',
  },
  {
    src: '/velio-calendar.png',
    icon: <Flag size={16} />,
    label: 'Calendário de Execução',
    desc: 'Visão mensal de toda a equipe. Conflitos, disponibilidade e carga por técnico de relance.',
  },
  {
    src: '/velio-portal-agenda.png',
    icon: <Users size={16} />,
    label: 'Agenda do cliente',
    desc: 'O cliente acompanha os próximos encontros no portal próprio. Sem WhatsApp, sem e-mail.',
  },
  {
    src: '/velio-portal-certs.png',
    icon: <Award size={16} />,
    label: 'Certificados automáticos',
    desc: 'Turma concluída → PDF gerado. O cliente baixa direto do portal. Nenhum trabalho manual.',
  },
  {
    src: '/velio-board.png',
    icon: <Kanban size={16} />,
    label: 'Suporte & Implementação',
    desc: 'Pendências de cada cliente num board Kanban. Backlog, prazos e chat por ticket.',
  },
];

function VelioSolutionSection({ primary, primaryLight }: { primary: string; primaryLight: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(i => (i + 1) % velioSolutionFeatures.length);
    }, VELIO_AUTO_INTERVAL);
    return () => clearTimeout(timer);
  }, [active]);

  const feature = velioSolutionFeatures[active];

  return (
    <section style={{ background: '#fafaf7', padding: '72px 24px 80px', borderTop: '1px solid #f0ece0' }}>
      <style>{`
        @keyframes velioProgress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          A SOLUÇÃO
        </p>
        <h2 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          Uma plataforma.<br />Toda a operação resolvida.
        </h2>
        <p style={{ fontSize: 16, color: '#666', margin: '0 0 32px', lineHeight: 1.6 }}>
          Do planejamento das turmas ao certificado do cliente — sem planilha, sem WhatsApp, sem Word.
        </p>

        <div style={{
          background: '#fff',
          border: '1px solid #e8e0cc',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(176,125,22,0.14), 0 8px 24px rgba(176,125,22,0.06)',
        }}>
          {/* Chrome bar */}
          <div style={{ background: '#1e1c10', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <div style={{ flex: 1, background: '#3a3820', borderRadius: 4, height: 12, margin: '0 12px' }} />
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: primaryLight, position: 'relative', overflow: 'hidden' }}>
            <div
              key={active}
              style={{
                position: 'absolute',
                top: 0, left: 0, height: '100%',
                background: primary,
                animation: `velioProgress ${VELIO_AUTO_INTERVAL}ms linear forwards`,
              }}
            />
          </div>
          {/* Screenshot stack */}
          <div style={{ position: 'relative', height: 500, overflow: 'hidden', background: '#f8f6f0' }}>
            {velioSolutionFeatures.map((f, i) => (
              <img
                key={f.src}
                src={f.src}
                alt={f.label}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: 'auto',
                  display: 'block',
                  opacity: i === active ? 1 : 0,
                  transition: 'opacity 0.55s ease',
                }}
              />
            ))}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: 80,
              background: 'linear-gradient(to bottom, transparent, #ffffff)',
              pointerEvents: 'none',
            }} />
          </div>
          {/* Label bar */}
          <div style={{
            padding: '16px 24px',
            borderTop: `3px solid ${primary}`,
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#fff',
          }}>
            <div style={{
              width: 36, height: 36,
              background: primary,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              {feature.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{feature.label}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{feature.desc}</div>
            </div>
          </div>
        </div>

        {/* Navigation pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' as const }}>
          {velioSolutionFeatures.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                border: 'none', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                transition: 'all 0.15s',
                background: active === i ? primary : '#fff',
                color: active === i ? '#fff' : '#555',
                boxShadow: active === i
                  ? '0 4px 14px rgba(176,125,22,0.28)'
                  : '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ opacity: active === i ? 1 : 0.5, display: 'flex' }}>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Velio ─────────────────────────────────────────────────────────────────────

function VelioLandingPage() {
  const primary = '#b07d16';
  const primaryLight = '#fef3c7';
  const accent = '#f0c040';
  const signUpUrl = '/';

  const stats = [
    { num: '60 dias', label: 'de mapa de planejamento' },
    { num: 'Portal', label: 'incluso para seus clientes' },
    { num: 'PDF', label: 'certificado gerado automático' },
  ];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#0a0a0a', lineHeight: 1.5 }}>
      <style>{`
        .velio-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(176,125,22,0.42) !important; }
        .velio-accent-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(240,192,64,0.48) !important; }
      `}</style>

      {/* Navbar */}
      <nav style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={prymeiraLogo} alt="Prymeira" style={{ width: 20, height: 24, display: 'block' }} />
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em' }}>Velio</span>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a href={signUpUrl} style={{
            background: primary, color: '#fff', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>Criar conta grátis</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        background: 'radial-gradient(ellipse 85% 75% at 72% 50%, #f5e8c0 0%, #faf4e0 28%, #fdf8ee 55%, #fefdf8 100%)',
        padding: '88px 24px 80px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 56, alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: primary }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: primary, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                Para empresas de treinamento técnico
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(44px, 5vw, 68px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-0.04em', margin: '0 0 22px',
            }}>
              Do planejamento<br />ao certificado<span style={{ color: accent }}>.</span><br />Tudo numa plataforma.
            </h1>
            <p style={{ fontSize: 18, color: '#4a5568', lineHeight: 1.72, margin: '0 0 36px', maxWidth: 420 }}>
              Gerencie turmas, técnicos e clientes — e ainda dê ao seu cliente um portal próprio para acompanhar cada etapa.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href={signUpUrl} className="velio-cta-btn" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: primary, color: '#fff',
                borderRadius: 10, padding: '15px 32px',
                fontSize: 16, fontWeight: 800, textDecoration: 'none',
                width: 'fit-content',
                boxShadow: '0 8px 24px rgba(176,125,22,0.28)',
                letterSpacing: '-0.01em',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>
                Criar conta grátis →
              </a>
              <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> Grátis pra começar
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 14, overflow: 'hidden',
              transform: 'perspective(900px) rotateY(-12deg) rotateX(4deg)',
              boxShadow: '28px 32px 80px rgba(176,125,22,0.22), 0 4px 16px rgba(176,125,22,0.08)',
            }}>
              <div style={{
                background: '#1e1c10', height: 34,
                display: 'flex', alignItems: 'center',
                padding: '0 16px', gap: 6,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  Planejamento de Agenda — Velio
                </span>
              </div>
              <img
                src="/velio-planning.png"
                alt="Planejamento Velio"
                width={600}
                height={230}
                style={{ width: '100%', height: 230, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
              />
            </div>
            <div style={{
              position: 'absolute', bottom: -28, right: -20,
              background: '#fff', border: '1px solid rgba(176,125,22,0.12)',
              borderRadius: 14, padding: '14px 22px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                Turmas ativas
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: primary, letterSpacing: '-0.03em' }}>12 em andamento</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ background: primary, padding: '20px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'center',
          gap: 56, alignItems: 'center',
        }}>
          {stats.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
              {i > 0 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, letterSpacing: '-0.02em' }}>{s.num}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section style={{ padding: '72px 24px 56px', background: '#fafbfc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 24 }}>
            O PROBLEMA
          </p>
          <h2 style={{
            fontSize: 'clamp(32px, 3.2vw, 46px)',
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.03em', margin: '0 0 32px',
          }}>
            Como você gerencia 8 técnicos<br />e 30 turmas simultâneas hoje?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              {
                num: '01',
                title: 'Planilha que ninguém confia',
                sub: 'Cada técnico tem a sua versão. Última atualizada? Ninguém sabe ao certo.',
              },
              {
                num: '02',
                title: 'Cliente no escuro',
                sub: 'Sua equipe sabe o que está acontecendo. O cliente fica ligando pra descobrir.',
              },
              {
                num: '03',
                title: 'Certificado na mão',
                sub: 'Turma concluída. Vem o PDF no Word, a assinatura manual e o envio por e-mail.',
              },
            ].map(card => (
              <div key={card.num} style={{
                background: '#fff5f5', border: '1px solid #fde0e0',
                borderRadius: 10, padding: '28px 24px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', marginBottom: 16 }}>{card.num}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111', lineHeight: 1.3, marginBottom: 10 }}>{card.title}</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.65 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <VelioSolutionSection primary={primary} primaryLight={primaryLight} />

      {/* CTA Final */}
      <section style={{
        background: 'linear-gradient(160deg, #15120a, #221c08)',
        position: 'relative', overflow: 'hidden',
        padding: '104px 24px', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 900, color: '#fff',
            lineHeight: 1.1, letterSpacing: '-0.03em',
            margin: '0 0 18px',
          }}>
            Mostre ao seu cliente<br />que você é organizado.<br />
            <span style={{ color: accent }}>Comece hoje.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.38)', margin: '0 0 36px' }}>
            Grátis pra começar.
          </p>
          <a href={signUpUrl} className="velio-accent-btn" style={{
            background: accent, borderRadius: 10,
            padding: '16px 40px', fontSize: 17, fontWeight: 900,
            color: '#1a1408', textDecoration: 'none',
            display: 'inline-flex', letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(240,192,64,0.32)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            Criar conta grátis →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#fff', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid #f0f0f0',
      }}>
        <span style={{ fontSize: 13, color: '#bbb' }}>© 2026 Prymeira · Velio</span>
        <span style={{ fontSize: 13, color: '#bbb' }}>Termos · Privacidade</span>
      </footer>
    </div>
  );
}

// ─── Entry point ───────────────────────────────────────────────────────────────

export function LandingPage() {
  const theme = getAppTheme();
  if (theme.name === 'Velio') return <VelioLandingPage />;
  return <FluviaLandingPage />;
}
