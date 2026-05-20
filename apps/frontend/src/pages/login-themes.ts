// apps/frontend/src/pages/login-themes.ts

export type AppTheme = {
  name: string;
  tagline: [string, string];
  gradient: string;
  nameColor: string;
  taglineColor: string;
  separatorColor: string;
  separatorHeight: number;
  fontFamily: string;
  nameLetterSpacing: string;
  nameTextTransform: 'none' | 'uppercase';
  prymeiraLogoOpacity: number;
  decorativeElement: 'waves' | 'brackets-dots';
  clerkPrimaryColor: string;
  clerkButtonTextColor: string;
};

const themes: Record<string, AppTheme> = {
  fluvia: {
    name: 'Fluvia',
    tagline: ['Gestão', 'Financeira'],
    gradient: 'linear-gradient(175deg, #05192d 0%, #0a3d6b 50%, #0d52a0 100%)',
    nameColor: '#ffffff',
    taglineColor: 'rgba(255,255,255,0.38)',
    separatorColor: 'rgba(255,255,255,0.25)',
    separatorHeight: 2,
    fontFamily: "'DM Serif Display', serif",
    nameLetterSpacing: '-0.5px',
    nameTextTransform: 'none',
    prymeiraLogoOpacity: 0.4,
    decorativeElement: 'waves',
    clerkPrimaryColor: '#0a3d6b',
    clerkButtonTextColor: '#ffffff',
  },
  velio: {
    name: 'Velio',
    tagline: ['Gestão', 'Técnica'],
    gradient: 'linear-gradient(175deg, #0b0b08 0%, #14120a 50%, #1e1806 100%)',
    nameColor: '#f0c040',
    taglineColor: 'rgba(240,192,64,0.28)',
    separatorColor: 'rgba(240,192,64,0.3)',
    separatorHeight: 2,
    fontFamily: "'Space Grotesk', sans-serif",
    nameLetterSpacing: '-1px',
    nameTextTransform: 'none',
    prymeiraLogoOpacity: 0.28,
    decorativeElement: 'brackets-dots',
    clerkPrimaryColor: '#1a1204',
    clerkButtonTextColor: '#f0c040',
  },
};

/**
 * Detecta o tema pelo hostname do deploy.
 * velio.prymeiradigital.com.br → velio
 * fluvia.prymeiradigital.com.br (e localhost) → fluvia
 */
export function getAppTheme(): AppTheme {
  const hostname = window.location.hostname;
  if (hostname.includes('velio')) return themes.velio;
  // Dev override: ?theme=velio in URL (e.g. /landing?theme=velio)
  if (typeof window !== 'undefined' && window.location.search.includes('theme=velio')) return themes.velio;
  return themes.fluvia;
}
