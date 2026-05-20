// apps/frontend/src/pages/LandingPage.tsx
import {
  AlertCircle, FileSpreadsheet, Flag,
  TrendingUp, ArrowLeftRight, Landmark, Receipt,
  Kanban, Target, Users, BarChart2,
} from 'lucide-react';
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
        <div style={{ background: '#fff', border: '1px solid #dde4f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 40px rgba(10,61,107,0.13)' }}>
          {/* Chrome bar */}
          <div style={{ background: '#1e2535', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <div style={{ flex: 1, background: '#3a4455', borderRadius: 4, height: 12, margin: '0 12px' }} />
          </div>
          {/* Progress bar — key forces remount → resets animation on every change */}
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
          {/* Screenshot */}
          <img
            key={feature.src}
            src={feature.src}
            alt={feature.label}
            style={{ width: '100%', height: 460, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
          {/* Label bar */}
          <div style={{ padding: '16px 24px', borderTop: `3px solid ${primary}`, display: 'flex', alignItems: 'center', gap: 14, background: '#fff' }}>
            <div style={{ width: 36, height: 36, background: primary, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              {feature.icon}
            </div>
            <div>
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

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${primary}, #1565c0)`,
              borderRadius: 5,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Fluvia</span>
          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero — split 50/50 */}
      <section style={{ background: '#fff', padding: '72px 24px 64px' }}>
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
            <div
              style={{
                display: 'inline-block',
                background: primaryLight,
                borderRadius: 20,
                padding: '4px 14px',
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 12, color: primary, fontWeight: 700, letterSpacing: '0.04em' }}>
                Para donos de PME
              </span>
            </div>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                margin: '0 0 16px',
              }}
            >
              Empresa não quebra<br />por falta de produto.
            </h1>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
              Quebra porque o dono não olha os números.<br />O Fluvia muda isso.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={signUpUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: primary,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  width: 'fit-content',
                }}
              >
                Criar conta grátis →
              </a>
              <span style={{ fontSize: 13, color: '#999' }}>✓ Grátis pra começar · Sem cartão</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                transform: 'perspective(800px) rotateY(-8deg) rotateX(3deg)',
                boxShadow: '8px 8px 40px rgba(10,61,107,0.18)',
              }}
            >
              <div
                style={{
                  background: primary,
                  height: 32,
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
                height={200}
                style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                background: '#fff',
                border: '1px solid #e0e8ff',
                borderRadius: 10,
                padding: '10px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Lucro este mês</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>+R$12.400</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div
        style={{
          background: '#f8f9fb',
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: '#bbb',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Usado por PMEs em todo o Brasil
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center' }}>
          {[48, 38, 56, 42, 50].map((w, i) => (
            <div key={i} style={{ width: w, height: 12, background: '#ddd', borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* Problem */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            O PROBLEMA
          </p>
          <h2
            style={{
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            73% dos donos de PME não sabem<br />o lucro{' '}
            <em style={{ color: primary, fontStyle: 'normal' }}>do mês anterior.</em>
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 36, lineHeight: 1.6 }}>
            E não é por falta de inteligência. É porque o financeiro ficou espalhado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PainCard
              icon={<AlertCircle size={18} />}
              title="DRE chega semanas depois"
              sub="Do contador. Em PDF. Quando o mês já foi."
            />
            <PainCard
              icon={<FileSpreadsheet size={18} />}
              title="Fluxo de caixa no Excel"
              sub="Três abas, dois computadores, zero confiança."
            />
            <PainCard
              icon={<Flag size={18} />}
              title="Decisões grandes no chute"
              sub="Contratar, investir, cortar — sem dado nenhum."
            />
          </div>
        </div>
      </section>

      {/* Solution + Features unified */}
      <FluviaSolutionSection primary={primary} primaryLight={primaryLight} />

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #05192d, #0a3d6b)',
          padding: '88px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}
        >
          Comece hoje.<br />Em 5 minutos você já sabe<br />
          <span style={{ color: accent }}>onde está o dinheiro.</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
          Grátis pra começar. Sem cartão de crédito.
        </p>
        <a
          href={signUpUrl}
          style={{
            display: 'inline-flex',
            background: accent,
            borderRadius: 8,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 800,
            color: '#111',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,192,64,0.35)',
          }}
        >
          Criar conta grátis →
        </a>
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

// ─── Velio ─────────────────────────────────────────────────────────────────────

function VelioLandingPage() {
  const primary = '#4c1d95';
  const primaryLight = '#ede9fe';
  const primaryMedium = '#6d28d9';
  const accent = '#f0c040';
  const signUpUrl = '/';

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${primary}, ${primaryMedium})`,
              borderRadius: 5,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Velio</span>
          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero — centrado + screenshot perspectiva */}
      <section style={{ background: '#fff', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              background: primaryLight,
              borderRadius: 20,
              padding: '4px 14px',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: primaryMedium,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              Para heads de tecnologia e engenharia
            </span>
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            Menos reunião.<br />Mais entrega.
          </h1>
          <p style={{ fontSize: 17, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
            Projetos, tarefas e times num só lugar.<br />
            Do objetivo ao resultado, sem perder o fio.
          </p>
          <div
            style={{
              display: 'inline-flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            <a
              href={signUpUrl}
              style={{
                background: primary,
                color: '#fff',
                borderRadius: 8,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Criar conta grátis →
            </a>
            <span style={{ fontSize: 14, color: '#aaa' }}>Ver demo</span>
          </div>
        </div>

        {/* Screenshot com perspectiva top-down e floating cards */}
        <div
          style={{
            maxWidth: 680,
            margin: '0 auto',
            position: 'relative',
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              transform: 'perspective(900px) rotateX(6deg)',
              boxShadow: '0 12px 48px rgba(109,40,217,0.22)',
            }}
          >
            <div
              style={{
                background: '#2a1840',
                height: 28,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              <div
                style={{ flex: 1, background: '#3a2255', borderRadius: 4, height: 12, margin: '0 12px' }}
              />
            </div>
            <ScreenshotPlaceholder
              height={260}
              label="screenshot do kanban / board"
              tint={primaryLight}
              border="#d8c8f8"
            />
          </div>
          {/* Floating card — sprint */}
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              background: '#fff',
              border: `1px solid ${primaryLight}`,
              borderRadius: 10,
              padding: '10px 16px',
              boxShadow: '0 4px 16px rgba(109,40,217,0.14)',
            }}
          >
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Sprint 12</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: primaryMedium }}>84% concluído</div>
          </div>
          {/* Floating card — avatares */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: -10,
              background: '#fff',
              border: `1px solid ${primaryLight}`,
              borderRadius: 10,
              padding: '8px 14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex' }}>
              {[primary, primaryMedium, '#8b5cf6'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: '2px solid #fff',
                    marginLeft: i > 0 ? -6 : 0,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#666' }}>3 online agora</span>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div
        style={{
          background: '#f8f7ff',
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: '#bbb',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Confiado por times de tecnologia
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center' }}>
          {[48, 38, 56, 42].map((w, i) => (
            <div key={i} style={{ width: w, height: 12, background: '#e0d8f8', borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* Problem — Before/After */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            O PROBLEMA
          </p>
          <h2
            style={{
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 32px',
            }}
          >
            Seu time sabe o que<br />precisa entregar hoje?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              style={{
                background: '#fff5f5',
                border: '1px solid #ffd5d5',
                borderRadius: 10,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c00', marginBottom: 10 }}>Antes</div>
              <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
                Tarefa no WhatsApp · Deadline por email · Status &ldquo;na reunião de sexta&rdquo;
              </div>
            </div>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>
                Com Velio
              </div>
              <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
                Board visual · Prioridades claras · Progresso em tempo real
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — grid 2x2 */}
      <section style={{ background: '#f8f7ff', padding: '80px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            FUNCIONALIDADES
          </p>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 36px',
            }}
          >
            Tudo que o seu time<br />precisa para entregar.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                icon: <Kanban size={18} />,
                title: 'Board Kanban',
                desc: 'Visualize o fluxo de trabalho inteiro',
              },
              {
                icon: <Target size={18} />,
                title: 'Sprints',
                desc: 'Planejamento e rastreamento ágil',
              },
              {
                icon: <Users size={18} />,
                title: 'Time e carga',
                desc: 'Quem faz o quê, e quando',
              },
              {
                icon: <BarChart2 size={18} />,
                title: 'Métricas',
                desc: 'Velocidade, burndown, throughput',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: '#fff',
                  border: `1px solid ${primaryLight}`,
                  borderRadius: 10,
                  padding: '20px 24px',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: primaryLight,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primaryMedium,
                    marginBottom: 12,
                  }}
                >
                  {icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #1e0a4c, #4c1d95)',
          padding: '88px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}
        >
          Seu time merece<br />uma ferramenta à altura.<br />
          <span style={{ color: accent }}>Comece hoje.</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
          Grátis pra começar. Sem cartão de crédito.
        </p>
        <a
          href={signUpUrl}
          style={{
            display: 'inline-flex',
            background: accent,
            borderRadius: 8,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 800,
            color: '#111',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,192,64,0.35)',
          }}
        >
          Criar conta grátis →
        </a>
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
