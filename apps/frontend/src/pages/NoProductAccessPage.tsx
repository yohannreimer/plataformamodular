import { useEffect, useMemo } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import { productAccessDeniedUrl } from '../config/urls';

const PRODUCT_LABELS: Record<string, string> = {
  orquestrador: 'Velio',
  financeiro: 'Fluvia'
};

type NoProductAccessPageProps = {
  productKey: 'orquestrador' | 'financeiro';
  onLogout: () => void;
};

export function NoProductAccessPage({ productKey, onLogout }: NoProductAccessPageProps) {
  const productName = PRODUCT_LABELS[productKey] ?? productKey;
  const hubAccessUrl = useMemo(() => productAccessDeniedUrl(productKey, {
    reason: 'no_entitlement',
    returnUrl: window.location.href
  }), [productKey]);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    window.location.assign(hubAccessUrl);
  }, [hubAccessUrl]);

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
          Sua conta está autenticada, mas a Prymeira Account ainda não liberou esse produto. Estamos levando você ao Hub para revisar o acesso.
        </p>
        <a href={hubAccessUrl} className="no-access-page__back">
          <ArrowLeft size={15} strokeWidth={1.9} />
          Voltar ao Hub
        </a>
      </main>
    </div>
  );
}
