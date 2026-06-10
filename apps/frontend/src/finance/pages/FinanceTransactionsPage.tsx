import { FinanceTransactionsDesktopView } from '../components/FinanceTransactionsDesktopView';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';

export function FinanceTransactionsPage() {
  const controller = useFinanceTransactionsController();
  return <FinanceTransactionsDesktopView controller={controller} />;
}
