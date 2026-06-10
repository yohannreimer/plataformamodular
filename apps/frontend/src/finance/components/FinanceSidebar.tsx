import { Link, NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  GitCompare,
  BarChart3,
  FileText,
  Database,
  Calculator,
  Settings2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { internalSessionStore } from '../../auth/session';
import { PRYMEIRA_HUB_URL } from '../../config/urls';
import type { FinanceContext } from '../api';
import prymeiraLogo from '../../assets/prymeira-logo.png';

type FinanceSidebarProps = {
  context: FinanceContext | null;
  onLogout?: () => void;
};

export const financeNavigationItems = [
  { to: 'overview', label: 'Visão Geral', icon: 'overview' },
  { to: 'transactions', label: 'Movimentações', icon: 'transactions' },
  { to: 'receivables', label: 'Contas a Receber', icon: 'receivables' },
  { to: 'payables', label: 'Contas a Pagar', icon: 'payables' },
  { to: 'reconciliation', label: 'Conciliação & Revisão', icon: 'reconciliation' },
  { to: 'cashflow', label: 'Fluxo de Caixa', icon: 'cashflow' },
  { to: 'reports', label: 'Relatórios', icon: 'reports' },
  { to: 'cadastros', label: 'Cadastros', icon: 'cadastros' },
  { to: 'simulation', label: 'Simulação', icon: 'simulation' },
  { to: 'advanced', label: 'Avançado', icon: 'advanced' }
] as const;

export type FinanceNavigationItem = (typeof financeNavigationItems)[number];

const FINANCE_ICON_MAP: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  transactions: ArrowLeftRight,
  receivables: ArrowDownToLine,
  payables: ArrowUpFromLine,
  reconciliation: GitCompare,
  cashflow: BarChart3,
  reports: FileText,
  cadastros: Database,
  simulation: Calculator,
  advanced: Settings2
};

export function FinanceNavigationGlyph({ name }: { name: string }) {
  const Icon = FINANCE_ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
}

export function FinanceSidebar({ context: _context, onLogout }: FinanceSidebarProps) {
  const currentUser = internalSessionStore.read()?.user ?? null;
  const userLabel = currentUser?.display_name || currentUser?.username || 'usuário';

  return (
    <aside className="finance-sidebar" aria-label="Navegação financeira">
      <Link to="/app" className="logo">
        <img className="logo-brand-image" src={prymeiraLogo} alt="Prymeira" />
        <small>ERP Financeiro</small>
      </Link>

      <nav className="finance-sidebar__nav" aria-label="Sitemap financeiro">
        {financeNavigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <span className="finance-sidebar__nav-icon" aria-hidden="true" style={{ opacity: isActive ? 1 : 0.7 }}>
                  <FinanceNavigationGlyph name={item.icon} />
                </span>
                <span className="finance-sidebar__nav-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-auth">
        <small aria-label="Usuário financeiro ativo">Usuário: {userLabel}</small>
        <a href={PRYMEIRA_HUB_URL} className="sidebar-back">← Voltar ao Hub</a>
        {onLogout ? (
          <button type="button" onClick={onLogout}>Sair</button>
        ) : null}
      </div>
    </aside>
  );
}
