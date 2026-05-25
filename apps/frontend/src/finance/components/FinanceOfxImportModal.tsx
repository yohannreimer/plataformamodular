import { useMemo, useState } from 'react';
import type {
  FinanceAccount,
  FinanceOfxApprovalItemPayload,
  FinanceOfxApprovePayload,
  FinanceOfxApproveResult,
  FinanceOfxPreview,
  FinanceOfxPreviewPayload,
  FinanceReconciliationDraftItem
} from '../api';
import { FinanceEmptyState, FinanceMono } from './FinancePrimitives';

type FinanceOfxImportModalProps = {
  open: boolean;
  accounts: FinanceAccount[];
  onPreview: (payload: FinanceOfxPreviewPayload) => Promise<FinanceOfxPreview>;
  onApprove: (payload: FinanceOfxApprovePayload) => Promise<FinanceOfxApproveResult>;
  onClose: () => void;
  onApproved: (result: FinanceOfxApproveResult) => void;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(cents / 100);
}

function decisionLabel(item: FinanceReconciliationDraftItem) {
  if (item.decision_type === 'new_transaction') return 'Novo liquidado';
  if (item.decision_type === 'payable_match') return 'Conta a pagar';
  if (item.decision_type === 'receivable_match') return 'Conta a receber';
  if (item.decision_type === 'ledger_match') return 'Ledger';
  if (item.decision_type === 'duplicate') return 'Duplicada';
  if (item.decision_type === 'invalid') return 'Inválida';
  return 'Revisar';
}

function isSelectable(item: FinanceReconciliationDraftItem) {
  return item.confidence_band !== 'blocked' && item.decision_type !== 'duplicate' && item.decision_type !== 'invalid';
}

function isSelectedByDefault(item: FinanceReconciliationDraftItem) {
  return isSelectable(item) && (item.confidence_band === 'auto' || item.confidence_band === 'ready');
}

function buildApprovedItem(item: FinanceReconciliationDraftItem, approved: boolean): FinanceOfxApprovalItemPayload {
  return {
    draft_item_id: item.id,
    approved,
    decision_type: item.decision_type,
    save_memory: item.proposed.save_memory,
    payable_id: item.target.payable_id ?? null,
    receivable_id: item.target.receivable_id ?? null,
    financial_transaction_id: item.target.financial_transaction_id ?? null,
    financial_entity_id: item.proposed.financial_entity_id,
    financial_category_id: item.proposed.financial_category_id,
    financial_cost_center_id: item.proposed.financial_cost_center_id,
    financial_payment_method_id: item.proposed.financial_payment_method_id,
    note: item.proposed.note
  };
}

const overlayStyle = {
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.38)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: 20,
  position: 'fixed',
  zIndex: 120
} as const;

const modalStyle = {
  background: '#ffffff',
  border: '1px solid #dbe3ef',
  borderRadius: 8,
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.24)',
  maxHeight: '90vh',
  overflow: 'auto',
  width: 'min(1040px, 100%)'
} as const;

const fieldStyle = {
  color: '#475569',
  display: 'grid',
  fontSize: 12,
  fontWeight: 700,
  gap: 6
} as const;

const controlStyle = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  color: '#0f172a',
  minHeight: 36,
  padding: '0 10px'
} as const;

const primaryButtonStyle = {
  background: 'var(--accent)',
  border: 0,
  borderRadius: 8,
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 800,
  minHeight: 36,
  padding: '0 14px'
} as const;

export function FinanceOfxImportModal({
  open,
  accounts,
  onPreview,
  onApprove,
  onClose,
  onApproved
}: FinanceOfxImportModalProps) {
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [ofxText, setOfxText] = useState('');
  const [preview, setPreview] = useState<FinanceOfxPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const approvableItems = useMemo(() => (preview?.items ?? []).filter(isSelectable), [preview]);

  if (!open) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError('');
    setPreview(null);
    setSelectedIds(new Set());
    setFileName(file.name);
    setFileSize(file.size);
    setOfxText(await file.text());
  }

  async function handlePreview() {
    setLoading(true);
    setError('');

    try {
      const nextPreview = await onPreview({
        financial_account_id: financialAccountId,
        source_file_name: fileName,
        source_file_size_bytes: fileSize,
        ofx_text: ofxText
      });
      setPreview(nextPreview);
      setSelectedIds(new Set(nextPreview.items.filter(isSelectedByDefault).map((item) => item.id)));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Falha ao gerar prévia OFX.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!preview) return;

    setLoading(true);
    setError('');

    try {
      const result = await onApprove({
        financial_account_id: preview.financial_account_id,
        source_file_name: preview.source_file_name,
        source_file_size_bytes: fileSize,
        source_file_hash: preview.source_file_hash,
        ofx_text: ofxText,
        approved_items: approvableItems.map((item) => buildApprovedItem(item, selectedIds.has(item.id)))
      });
      onApproved(result);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Falha ao aprovar lote OFX.');
    } finally {
      setLoading(false);
    }
  }

  const canPreview = Boolean(financialAccountId && ofxText && !loading);
  const canApprove = Boolean(preview && selectedIds.size > 0 && !loading);

  return (
    <aside role="dialog" aria-label="Importar OFX" aria-modal="true" style={overlayStyle}>
      <div style={modalStyle}>
        <header style={{ alignItems: 'center', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 16, justifyContent: 'space-between', padding: 20 }}>
          <div>
            <small style={{ color: 'var(--accent)', display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Conciliação OFX</small>
            <h2 style={{ color: '#0f172a', fontSize: 20, margin: '5px 0 0' }}>Importar e aprovar lote</h2>
          </div>
          <button
            type="button"
            aria-label="Fechar importação OFX"
            onClick={onClose}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', cursor: 'pointer', fontSize: 20, height: 34, lineHeight: '30px', width: 34 }}
          >
            ×
          </button>
        </header>

        <div style={{ display: 'grid', gap: 16, padding: 20 }}>
          {error ? (
            <div role="alert" style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, color: '#9f1239', fontSize: 12, padding: '10px 12px' }}>
              {error}
            </div>
          ) : null}

          <section style={{ alignItems: 'end', display: 'grid', gap: 12, gridTemplateColumns: 'minmax(180px, 240px) minmax(220px, 1fr) auto' }}>
            <label style={fieldStyle}>
              Conta bancária
              <select aria-label="Conta bancária" value={financialAccountId} onChange={(event) => setFinancialAccountId(event.target.value)} style={controlStyle}>
                <option value="">Selecione</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              Arquivo OFX
              <input
                aria-label="Arquivo OFX"
                type="file"
                accept=".ofx,.OFX,application/x-ofx"
                onChange={(event) => void handleFile(event.target.files?.[0])}
                style={{ ...controlStyle, padding: '6px 10px' }}
              />
            </label>

            <button type="button" onClick={handlePreview} disabled={!canPreview} style={{ ...primaryButtonStyle, opacity: canPreview ? 1 : 0.55 }}>
              {loading ? 'Processando...' : 'Gerar prévia'}
            </button>
          </section>

          {preview ? (
            <>
              <section aria-label="Resumo da prévia" style={{ border: '1px solid #e2e8f0', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', overflow: 'hidden' }}>
                <SummaryCell label="Linhas" value={preview.summary.total_rows} />
                <SummaryCell label="Prontas" value={preview.summary.ready_count} />
                <SummaryCell label="Revisão" value={preview.summary.review_count} />
                <SummaryCell label="Bloqueadas" value={preview.summary.blocked_count} />
                <SummaryCell label="Entradas" value={formatCurrency(preview.summary.inflow_cents)} />
                <SummaryCell label="Saídas" value={formatCurrency(preview.summary.outflow_cents)} />
              </section>

              <section aria-label="Linhas da prévia" style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                {preview.items.length === 0 ? (
                  <FinanceEmptyState title="Nenhuma linha OFX encontrada." description="Confira o arquivo e gere a prévia novamente." />
                ) : (
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                    <thead style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                      <tr>
                        <th style={thStyle}>Sel.</th>
                        <th style={thStyle}>Descrição</th>
                        <th style={thStyle}>Decisão</th>
                        <th style={thStyle}>Categoria</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Confiança</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item) => {
                        const selectable = isSelectable(item);
                        return (
                          <tr key={item.id} style={{ borderTop: '1px solid #edf2f7', color: selectable ? '#0f172a' : '#64748b' }}>
                            <td style={tdStyle}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                disabled={!selectable}
                                onChange={(event) => {
                                  setSelectedIds((current) => {
                                    const next = new Set(current);
                                    if (event.target.checked) next.add(item.id);
                                    else next.delete(item.id);
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td style={{ ...tdStyle, minWidth: 220 }}>
                              <strong style={{ display: 'block', fontSize: 13 }}>{item.line.description}</strong>
                              <small style={{ color: '#64748b' }}>{item.blocking_reason ?? item.reasons[0]?.label ?? 'Sem observação'}</small>
                            </td>
                            <td style={tdStyle}>{decisionLabel(item)}</td>
                            <td style={tdStyle}>{item.proposed.financial_category_name ?? 'Sem categoria'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}><FinanceMono>{formatCurrency(item.line.amount_cents)}</FinanceMono></td>
                            <td style={{ ...tdStyle, color: selectable ? '#047857' : '#92400e', fontWeight: 800, textAlign: 'right' }}>{Math.round(item.confidence_score * 100)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              <footer style={{ alignItems: 'center', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', cursor: 'pointer', fontWeight: 700, minHeight: 36, padding: '0 14px' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleApprove} disabled={!canApprove} style={{ ...primaryButtonStyle, background: '#059669', opacity: canApprove ? 1 : 0.55 }}>
                  Aprovar lote
                </button>
              </footer>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SummaryCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ borderRight: '1px solid #e2e8f0', display: 'grid', gap: 3, padding: 12 }}>
      <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>{label}</span>
      <strong style={{ color: '#0f172a', fontSize: 14 }}><FinanceMono>{value}</FinanceMono></strong>
    </div>
  );
}

const thStyle = {
  fontSize: 11,
  fontWeight: 800,
  padding: '9px 10px',
  textTransform: 'uppercase'
} as const;

const tdStyle = {
  padding: '10px',
  verticalAlign: 'middle'
} as const;
