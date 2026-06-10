import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PRYMEIRA_HUB_URL } from '../../config/urls';
import prymeiraLogo from '../../assets/prymeira-logo.png';
import { financePath, normalizeFinancePath } from '../routes';
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
  const headerMenuButtonRef = useRef<HTMLButtonElement>(null);
  const bottomMenuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const normalizedPathname = normalizeFinancePath(location.pathname);

  const currentItem = useMemo(
    () => financeNavigationItems.find((item) => {
      const itemPath = financePath(item.to);
      return normalizedPathname === itemPath || normalizedPathname.startsWith(`${itemPath}/`);
    }),
    [normalizedPathname]
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

  const isRouteActive = useCallback((item: FinanceNavigationItem) => {
    const itemPath = financePath(item.to);
    return normalizedPathname === itemPath || normalizedPathname.startsWith(`${itemPath}/`);
  }, [normalizedPathname]);

  const openMore = useCallback((trigger: HTMLButtonElement | null) => {
    lastTriggerRef.current = trigger;
    setIsMoreOpen(true);
  }, []);

  const closeMore = useCallback(() => {
    setIsMoreOpen(false);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!isMoreOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMore();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMore, isMoreOpen]);

  return (
    <>
      <header className="finance-mobile-header" aria-label="Cabeçalho financeiro mobile">
        <Link to={financePath('overview')} className="finance-mobile-header__brand" tabIndex={isMoreOpen ? -1 : undefined}>
          <img src={prymeiraLogo} alt="Prymeira" className="finance-mobile-header__logo" />
          <span>
            <strong>ERP Financeiro</strong>
            <small>{activeLabel}</small>
          </span>
        </Link>

        <button
          ref={headerMenuButtonRef}
          type="button"
          className="finance-mobile-header__menu"
          aria-label={isMoreOpen ? 'Fechar áreas financeiras' : 'Mais áreas'}
          aria-expanded={isMoreOpen}
          tabIndex={isMoreOpen ? -1 : undefined}
          onClick={() => {
            if (isMoreOpen) {
              closeMore();
              return;
            }

            openMore(headerMenuButtonRef.current);
          }}
        >
          {isMoreOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      <nav className="finance-mobile-bottom-nav" aria-label="Atalhos financeiros mobile">
        {bottomNavigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={financePath(item.to)}
            end
            className={`finance-mobile-bottom-nav__item ${isRouteActive(item) ? 'is-active' : ''}`}
            aria-current={isRouteActive(item) ? 'page' : undefined}
            tabIndex={isMoreOpen ? -1 : undefined}
          >
            <FinanceNavigationGlyph name={item.icon} />
            <span>{bottomNavigationLabels[item.to]}</span>
          </NavLink>
        ))}
        <button
          ref={bottomMenuButtonRef}
          type="button"
          className={`finance-mobile-bottom-nav__item finance-mobile-bottom-nav__more ${isMoreOpen ? 'is-active' : ''}`}
          aria-label="Mais áreas"
          aria-expanded={isMoreOpen}
          tabIndex={isMoreOpen ? -1 : undefined}
          onClick={() => openMore(bottomMenuButtonRef.current)}
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
            onClick={closeMore}
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
              <button ref={closeButtonRef} type="button" aria-label="Fechar áreas financeiras" onClick={closeMore}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="finance-mobile-more__links" aria-label="Mais atalhos financeiros">
              {overflowNavigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={financePath(item.to)}
                  end
                  className={`finance-mobile-more__link ${isRouteActive(item) ? 'is-active' : ''}`}
                  aria-current={isRouteActive(item) ? 'page' : undefined}
                  onClick={closeMore}
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
