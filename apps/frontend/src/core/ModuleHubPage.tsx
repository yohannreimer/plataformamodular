// apps/frontend/src/core/ModuleHubPage.tsx
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Users, CreditCard } from 'lucide-react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import type { InternalSessionUser } from '../auth/session';
import { findAccountProduct, type AccountAccessState } from '../auth/accountAccess';
import { canAccessModule, PLATFORM_MODULES } from './modules';
import './ModuleHubPage.css';

type ModuleHubPageProps = {
  user: InternalSessionUser;
  accountAccess: AccountAccessState | null;
  onLogout: () => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function ModuleHubPage({ user, accountAccess, onLogout }: ModuleHubPageProps) {
  const userLabel = user.display_name || user.username;

  const todayLong = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const todayShort = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="hub">
      <header className="hub-topbar">
        <div className="hub-topbar__logo">
          <Link to="/app" aria-label="Prymeira — módulos">
            <img src={prymeiraLogo} alt="Prymeira" />
          </Link>
        </div>
        <div className="hub-topbar__right">
          <span className="hub-topbar__date">{todayShort}</span>
          <div className="hub-topbar__user">
            <div className="hub-topbar__avatar" aria-hidden="true">
              {initials(userLabel)}
            </div>
            <span>{userLabel}</span>
          </div>
        </div>
      </header>

      <main className="hub-body">
        <p className="hub-body__eyebrow">{todayLong}</p>
        <h1 className="hub-body__title">Seus módulos ativos</h1>

        <section className="hub-grid" aria-label="Módulos da plataforma">
          {PLATFORM_MODULES.map((mod) => {
            const productAccess = findAccountProduct(accountAccess, mod.productKey);
            const hasInternalAccess = canAccessModule(user, mod);
            const hasProductAccess = productAccess?.allowed === true;
            const accessible = hasInternalAccess && hasProductAccess;
            const locked = mod.comingSoon || !accessible;
            const Icon = mod.icon;
            const statusLabel = mod.comingSoon
              ? 'Em breve'
              : hasProductAccess
                ? hasInternalAccess ? 'Ativo' : 'Sem permissão'
                : productAccess?.status === 'trial'
                  ? 'Trial'
                  : 'Sem acesso';

            const cardInner = (
              <>
                <div className="hub-card__arrow" aria-hidden="true">
                  {locked
                    ? <Lock size={13} strokeWidth={1.75} />
                    : <ArrowRight size={14} strokeWidth={2} />
                  }
                </div>
                <div className="hub-card__icon-wrap">
                  {Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
                </div>
                <p className="hub-card__name">{mod.name}</p>
                <p className="hub-card__desc">{mod.description}</p>
                <div className="hub-card__footer">
                  <span className={`hub-card__badge ${locked ? 'hub-card__badge--locked' : ''}`.trim()}>
                    {statusLabel}
                  </span>
                  {mod.hubStat && !locked ? (
                    <span className="hub-card__stat">{mod.hubStat}</span>
                  ) : null}
                </div>
              </>
            );

            if (!locked) {
              return (
                <Link
                  key={mod.id}
                  to={mod.entryPath}
                  className="hub-card hub-card--active"
                  aria-label={`Abrir ${mod.name}`}
                >
                  {cardInner}
                </Link>
              );
            }

            return (
              <div key={mod.id} className="hub-card hub-card--locked" aria-label={mod.name}>
                {cardInner}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="hub-strip">
        <div className="hub-strip__metrics">
          <div className="hub-strip__metric">
            <Users size={13} strokeWidth={1.75} aria-hidden="true" />
            <span><strong>4</strong> técnicos em agenda hoje</span>
          </div>
          <div className="hub-strip__metric">
            <CreditCard size={13} strokeWidth={1.75} aria-hidden="true" />
            <span><strong>R$ 4.800</strong> a receber esta semana</span>
          </div>
        </div>
        <button type="button" className="hub-strip__logout" onClick={onLogout}>
          Sair
        </button>
      </footer>
    </div>
  );
}
