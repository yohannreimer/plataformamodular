import { FinanceTransactionsDesktopView } from '../components/FinanceTransactionsDesktopView';
import { FinanceTransactionsMobileView } from '../components/FinanceTransactionsMobileView';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';

export function FinanceTransactionsPage({ forceMobile = false }: { forceMobile?: boolean }) {
  const controller = useFinanceTransactionsController();

  if (forceMobile) {
    return <FinanceTransactionsMobileView controller={controller} />;
  }

  return (
    <>
      <div className="finance-transactions-desktop-runtime">
        <FinanceTransactionsDesktopView controller={controller} />
      </div>
      <div className="finance-transactions-mobile-runtime">
        <FinanceTransactionsMobileView controller={controller} />
      </div>
    </>
  );
}
