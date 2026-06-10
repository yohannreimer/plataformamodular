import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PRYMEIRA_HUB_URL } from '../../config/urls';
import prymeiraLogo from '../../assets/prymeira-logo.png';
import { FinanceNavigationGlyph, financeNavigationItems, type FinanceNavigationItem } from './FinanceSidebar';

type FinanceMobileNavigationProps = {
  userLabel: string;
  onLogout?: () => void;
};

const bottomNavigationKeys = ['overview', 'transactions', 'receivables', 'payables'] as const;
type BottomNavigationKey = (typeof bottomNavigationKeys)[number];
type BottomNavigationItem = Extract<FinanceNavigationItem, { to: BottomNavigationKey }>;

const bottomNavigationKeySet = new Set<string>(bottomNavigationKeys);

const bottomNavigationLabels: Record<BottomNavigationKey, string> = {
  overview: 'Visão Geral',
  transactions: 'Movimentações',
  receivables: 'Receber',
  payables: 'Pagar'
};

function isBottomNavigationItem(item: FinanceNavigationItem): item is BottomNavigationItem {
  return bottomNavigationKeySet.has(item.to);
}

export function FinanceMobileNavigation({ userLabel, onLogout }: FinanceMobileNavigationProps) {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const currentItem = useMemo(
    () => financeNavigationItems.find((item) => location.pathname.endsWith(`/financeiro/${item.to}`)),
    [location.pathname]
  );

  const bottomNavigationItems = useMemo(
    () => financeNavigationItems.filter(isBottomNavigationItem),
    []
  );

  const overflowNavigationItems = useMemo(
    () => financeNavigationItems.filter((item) => !bottomNavigationKeySet.has(item.to)),
    []
  );

  const activeLabel = currentItem?.label ?? 'Visão Geral';

  return (
    <>
      <header className="finance-mobile-header" aria-label="Cabeçalho financeiro mobile">
        <Link to="/financeiro/overview" className="finance-mobile-header__brand">
          <img src={prymeiraLogo} alt="Prymeira" className="finance-mobile-header__logo" />
          <span>
            <strong>ERP Financeiro</strong>
            <small>{activeLabel}</small>
          </span>
        </Link>

        <button
          type="button"
          className="finance-mobile-header__menu"
          aria-label={isMoreOpen ? 'Fechar áreas financeiras' : 'Mais áreas'}
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen((current) => !current)}
        >
          {isMoreOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      <nav className="finance-mobile-bottom-nav" aria-label="Atalhos financeiros mobile">
        {bottomNavigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={`/financeiro/${item.to}`}
            end
            className={({ isActive }) => `finance-mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`}
          >
            <FinanceNavigationGlyph name={item.icon} />
            <span>{bottomNavigationLabels[item.to]}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`finance-mobile-bottom-nav__item finance-mobile-bottom-nav__more ${isMoreOpen ? 'is-active' : ''}`}
          aria-label="Mais áreas"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen(true)}
        >
          <Menu size={16} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {isMoreOpen ? (
        <div className="finance-mobile-more">
          <button
            type="button"
            className="finance-mobile-more__scrim"
            aria-label="Fechar áreas financeiras"
            onClick={() => setIsMoreOpen(false)}
          />
          <section
            className="finance-mobile-more__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mais áreas do financeiro"
          >
            <div className="finance-mobile-more__header">
              <div>
                <small>Usuário financeiro</small>
                <strong>{userLabel}</strong>
              </div>
              <button type="button" aria-label="Fechar áreas financeiras" onClick={() => setIsMoreOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="finance-mobile-more__links" aria-label="Mais atalhos financeiros">
              {overflowNavigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/financeiro/${item.to}`}
                  end
                  className={({ isActive }) => `finance-mobile-more__link ${isActive ? 'is-active' : ''}`}
                  onClick={() => setIsMoreOpen(false)}
                >
                  <FinanceNavigationGlyph name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <footer className="finance-mobile-more__footer">
              <a href={PRYMEIRA_HUB_URL}>Voltar ao Hub</a>
              {onLogout ? (
                <button type="button" onClick={onLogout}>
                  Sair
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
