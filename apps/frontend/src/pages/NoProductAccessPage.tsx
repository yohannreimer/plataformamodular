import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import prymeiraLogo from '../assets/prymeira-logo.png';

const PRODUCT_LABELS: Record<string, string> = {
  orquestrador: 'Gestão Técnica',
  financeiro: 'Financeiro'
};

type NoProductAccessPageProps = {
  productKey: 'orquestrador' | 'financeiro';
  onLogout: () => void;
};

export function NoProductAccessPage({ productKey, onLogout }: NoProductAccessPageProps) {
  const productName = PRODUCT_LABELS[productKey] ?? productKey;

  return (
    <div className="no-access-page">
      <header className="no-access-page__topbar">
        <img src={prymeiraLogo} alt="Prymeira" />
        <button type="button" onClick={onLogout}>Sair</button>
      </header>
      <main className="no-access-page__body">
        <div className="no-access-page__icon" aria-hidden="true">
          <Lock size={22} strokeWidth={1.8} />
        </div>
        <p className="no-access-page__eyebrow">Produto bloqueado</p>
        <h1>{productName}</h1>
        <p>
          Sua conta está autenticada, mas a Prymeira Account ainda não liberou esse produto para este usuário.
        </p>
        <Link to="/app" className="no-access-page__back">
          <ArrowLeft size={15} strokeWidth={1.9} />
          Voltar ao hub
        </Link>
      </main>
    </div>
  );
}
