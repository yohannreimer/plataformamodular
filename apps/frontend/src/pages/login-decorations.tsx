// apps/frontend/src/pages/login-decorations.tsx

export function WavesDecoration() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
          top: -40, right: -35, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 70, height: 70, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.04)',
          top: -10, right: -5, pointerEvents: 'none',
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          opacity: 0.08, pointerEvents: 'none',
        }}
        viewBox="0 0 140 90"
        xmlns="http://www.w3.org/2000/svg"
        height="120"
        width="100%"
        preserveAspectRatio="none"
      >
        <path d="M-10,55 C20,20 50,75 80,45 C110,15 130,60 155,35" stroke="white" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M-10,72 C25,40 55,88 85,62 C115,36 135,72 155,52" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M-10,85 C30,60 60,95 90,75 C120,55 138,82 155,68" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </>
  );
}

export function BracketsDotsDecoration() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(240,192,64,0.07) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 16, right: 16, width: 20, height: 20,
          borderTop: '1.5px solid rgba(240,192,64,0.25)',
          borderRight: '1.5px solid rgba(240,192,64,0.25)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 16, left: 16, width: 20, height: 20,
          borderBottom: '1.5px solid rgba(240,192,64,0.18)',
          borderLeft: '1.5px solid rgba(240,192,64,0.18)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 16, right: 16, width: 20, height: 20,
          borderBottom: '1.5px solid rgba(240,192,64,0.12)',
          borderRight: '1.5px solid rgba(240,192,64,0.12)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

type DecorationProps = { type: 'waves' | 'brackets-dots' };

export function LoginDecoration({ type }: DecorationProps) {
  if (type === 'waves') return <WavesDecoration />;
  if (type === 'brackets-dots') return <BracketsDotsDecoration />;
  return null;
}
