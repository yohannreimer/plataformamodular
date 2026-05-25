import { Fragment, useMemo, useState } from 'react';
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceCostCenter,
  FinanceEntity,
  FinanceOfxApprovalItemPayload,
  FinanceOfxApprovePayload,
  FinanceOfxApproveResult,
  FinanceOfxPreview,
  FinanceOfxPreviewPayload,
  FinancePaymentMethod,
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
  entities?: FinanceEntity[];
  categories?: FinanceCategory[];
  costCenters?: FinanceCostCenter[];
  paymentMethods?: FinancePaymentMethod[];
};

type DraftItemEdit = {
  financial_entity_id: string;
  financial_entity_name: string;
  financial_category_id: string;
  financial_category_name: string;
  financial_cost_center_id: string;
  financial_cost_center_name: string;
  financial_payment_method_id: string;
  reference_name: string;
  save_memory: boolean;
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
  return item.decision_type !== 'duplicate' && item.decision_type !== 'invalid';
}

function isSelectedByDefault(item: FinanceReconciliationDraftItem) {
  return isSelectable(item) && (item.confidence_band === 'auto' || item.confidence_band === 'ready');
}

function initialEditForItem(item: FinanceReconciliationDraftItem): DraftItemEdit {
  return {
    financial_entity_id: item.proposed.financial_entity_id ?? '',
    financial_entity_name: item.proposed.financial_entity_name ?? '',
    financial_category_id: item.proposed.financial_category_id ?? '',
    financial_category_name: item.proposed.financial_category_name ?? '',
    financial_cost_center_id: item.proposed.financial_cost_center_id ?? '',
    financial_cost_center_name: item.proposed.financial_cost_center_name ?? '',
    financial_payment_method_id: item.proposed.financial_payment_method_id ?? '',
    reference_name: item.proposed.financial_entity_name ?? item.proposed.note,
    save_memory: item.proposed.save_memory
  };
}

function buildApprovedItem(item: FinanceReconciliationDraftItem, approved: boolean, edit: DraftItemEdit): FinanceOfxApprovalItemPayload {
  const decisionType = item.decision_type === 'needs_review' && approved ? 'new_transaction' : item.decision_type;
  return {
    draft_item_id: item.id,
    approved,
    decision_type: decisionType,
    save_memory: edit.save_memory,
    payable_id: item.target.payable_id ?? null,
    receivable_id: item.target.receivable_id ?? null,
    financial_transaction_id: item.target.financial_transaction_id ?? null,
    financial_entity_id: edit.financial_entity_id || null,
    financial_entity_name: edit.financial_entity_id ? null : edit.financial_entity_name.trim() || null,
    financial_category_id: edit.financial_category_id || null,
    financial_category_name: edit.financial_category_id ? null : edit.financial_category_name.trim() || null,
    financial_cost_center_id: edit.financial_cost_center_id || null,
    financial_cost_center_name: edit.financial_cost_center_id ? null : edit.financial_cost_center_name.trim() || null,
    financial_payment_method_id: edit.financial_payment_method_id || null,
    note: edit.reference_name.trim() || item.proposed.note || item.line.description
  };
}

function itemDirection(item: FinanceReconciliationDraftItem) {
  return item.line.amount_cents >= 0 ? 'Entrada' : 'Saída';
}

function exactNameMatch<T extends { id: string }>(items: T[], name: string, readName: (item: T) => string) {
  const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
  if (!normalizedName) return null;
  return items.find((item) => readName(item).trim().toLocaleLowerCase('pt-BR') === normalizedName) ?? null;
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
  width: 'min(1240px, 100%)'
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
  onApproved,
  entities = [],
  categories = [],
  costCenters = [],
  paymentMethods = []
}: FinanceOfxImportModalProps) {
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [ofxText, setOfxText] = useState('');
  const [preview, setPreview] = useState<FinanceOfxPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const [itemEdits, setItemEdits] = useState<Record<string, DraftItemEdit>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const approvableItems = useMemo(() => (preview?.items ?? []).filter(isSelectable), [preview]);

  if (!open) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError('');
    setPreview(null);
    setSelectedIds(new Set());
    setExpandedItemIds(new Set());
    setItemEdits({});
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
      setExpandedItemIds(new Set());
      setItemEdits(Object.fromEntries(nextPreview.items.map((item) => [item.id, initialEditForItem(item)])));
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
        approved_items: approvableItems.map((item) => buildApprovedItem(
          item,
          selectedIds.has(item.id),
          itemEdits[item.id] ?? initialEditForItem(item)
        ))
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
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  const updateItemEdit = (itemId: string, changes: Partial<DraftItemEdit>) => {
    setItemEdits((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? {
          financial_entity_id: '',
          financial_entity_name: '',
          financial_category_id: '',
          financial_category_name: '',
          financial_cost_center_id: '',
          financial_cost_center_name: '',
          financial_payment_method_id: '',
          reference_name: '',
          save_memory: false
        }),
        ...changes
      }
    }));
  };

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
                        <th style={thStyle}>Entidade</th>
                        <th style={thStyle}>Categoria</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Confiança</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item) => {
                        const selectable = isSelectable(item);
                        const edit = itemEdits[item.id] ?? initialEditForItem(item);
                        const expanded = expandedItemIds.has(item.id);
                        const direction = itemDirection(item);
                        const rowCategories = categories.filter((category) => category.kind === (item.line.amount_cents >= 0 ? 'income' : 'expense'));
                        const entityListId = `ofx-entities-${item.id}`;
                        const categoryListId = `ofx-categories-${item.id}`;
                        const costCenterListId = `ofx-cost-centers-${item.id}`;
                        return (
                          <Fragment key={item.id}>
                            <tr style={{ background: expanded ? '#fbfdff' : '#ffffff', borderTop: '1px solid #edf2f7', color: selectable ? '#0f172a' : '#64748b' }}>
                              <td style={tdStyle}>
                                <input
                                  aria-label={`Aprovar ${item.line.description}`}
                                  type="checkbox"
                                  checked={selectedIds.has(item.id)}
                                  disabled={!selectable}
                                  style={{ cursor: selectable ? 'pointer' : 'not-allowed', height: 18, width: 18 }}
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
                              <td style={{ ...tdStyle, minWidth: 260 }}>
                                <button
                                  type="button"
                                  disabled={!selectable}
                                  onClick={() => toggleItemExpansion(item.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 0,
                                    color: selectable ? '#475569' : '#94a3b8',
                                    cursor: selectable ? 'pointer' : 'not-allowed',
                                    display: 'block',
                                    font: 'inherit',
                                    padding: 0,
                                    textAlign: 'left',
                                    width: '100%'
                                  }}
                                >
                                  <strong style={{ color: selectable ? '#334155' : '#64748b', display: 'block', fontSize: 13 }}>
                                    {item.line.description}
                                  </strong>
                                  <small style={{ color: item.line.amount_cents >= 0 ? '#047857' : '#b45309', display: 'block', fontWeight: 800, marginTop: 3 }}>
                                    {direction} · {item.blocking_reason ?? item.reasons[0]?.label ?? 'Sem observação'}
                                  </small>
                                </button>
                              </td>
                              <td style={tdStyle}>{decisionLabel(item)}</td>
                              <td style={tdStyle}>{edit.financial_entity_name || item.proposed.financial_entity_name || 'Sem entidade'}</td>
                              <td style={tdStyle}>{edit.financial_category_name || item.proposed.financial_category_name || 'Sem categoria'}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}><FinanceMono>{formatCurrency(item.line.amount_cents)}</FinanceMono></td>
                              <td style={{ ...tdStyle, color: selectable ? '#047857' : '#92400e', fontWeight: 800, textAlign: 'right' }}>{Math.round(item.confidence_score * 100)}%</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>
                                {selectable ? (
                                  <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-label={`Editar ${item.line.description}`}
                                    onClick={() => toggleItemExpansion(item.id)}
                                    style={{
                                      background: expanded ? '#e0f2fe' : '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 8,
                                      color: '#0f172a',
                                      cursor: 'pointer',
                                      fontWeight: 800,
                                      minHeight: 32,
                                      padding: '0 12px'
                                    }}
                                  >
                                    {expanded ? 'Fechar' : 'Editar'}
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>Bloqueada</span>
                                )}
                              </td>
                            </tr>
                            {selectable && expanded ? (
                              <tr style={{ background: '#fbfdff', borderTop: '1px solid #e2e8f0' }}>
                                <td aria-hidden="true" style={tdStyle} />
                                <td colSpan={7} style={{ padding: '14px 10px 16px' }}>
                                  <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, display: 'grid', gap: 12, padding: 14 }}>
                                    <div style={{ color: '#64748b', display: 'flex', flexWrap: 'wrap', fontSize: 11, fontWeight: 800, gap: 8 }}>
                                      <span>{direction}</span>
                                      <span>Valor <FinanceMono>{formatCurrency(item.line.amount_cents)}</FinanceMono></span>
                                      <span>Texto original: {item.line.description}</span>
                                    </div>
                                    <datalist id={entityListId}>
                                      {entities.map((entity) => (
                                        <option key={entity.id} value={entity.trade_name ?? entity.legal_name} />
                                      ))}
                                    </datalist>
                                    <datalist id={categoryListId}>
                                      {rowCategories.map((category) => (
                                        <option key={category.id} value={category.name} />
                                      ))}
                                    </datalist>
                                    <datalist id={costCenterListId}>
                                      {costCenters.map((costCenter) => (
                                        <option key={costCenter.id} value={costCenter.name} />
                                      ))}
                                    </datalist>
                                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(170px, 1fr))' }}>
                                      <label style={editFieldStyle}>
                                        Entidade
                                        <input
                                          aria-label={`Entidade ${item.line.description}`}
                                          list={entityListId}
                                          placeholder={item.line.amount_cents >= 0 ? 'Cliente ou nova entidade' : 'Fornecedor ou nova entidade'}
                                          value={edit.financial_entity_name}
                                          onChange={(event) => {
                                            const name = event.target.value;
                                            const match = exactNameMatch(entities, name, (entity) => entity.trade_name ?? entity.legal_name);
                                            updateItemEdit(item.id, {
                                              financial_entity_id: match?.id ?? '',
                                              financial_entity_name: name,
                                              reference_name: edit.reference_name || name
                                            });
                                            setSelectedIds((current) => new Set(current).add(item.id));
                                          }}
                                          style={inlineControlStyle}
                                        />
                                      </label>
                                      <label style={editFieldStyle}>
                                        Categoria
                                        <input
                                          aria-label={`Categoria ${item.line.description}`}
                                          list={categoryListId}
                                          placeholder="Categoria ou nova categoria"
                                          value={edit.financial_category_name}
                                          onChange={(event) => {
                                            const name = event.target.value;
                                            const match = exactNameMatch(rowCategories, name, (category) => category.name);
                                            updateItemEdit(item.id, {
                                              financial_category_id: match?.id ?? '',
                                              financial_category_name: name
                                            });
                                            setSelectedIds((current) => new Set(current).add(item.id));
                                          }}
                                          style={inlineControlStyle}
                                        />
                                      </label>
                                      <label style={editFieldStyle}>
                                        Centro de custo
                                        <input
                                          aria-label={`Centro de custo ${item.line.description}`}
                                          list={costCenterListId}
                                          placeholder="Centro ou novo centro"
                                          value={edit.financial_cost_center_name}
                                          onChange={(event) => {
                                            const name = event.target.value;
                                            const match = exactNameMatch(costCenters, name, (costCenter) => costCenter.name);
                                            updateItemEdit(item.id, {
                                              financial_cost_center_id: match?.id ?? '',
                                              financial_cost_center_name: name
                                            });
                                            setSelectedIds((current) => new Set(current).add(item.id));
                                          }}
                                          style={inlineControlStyle}
                                        />
                                      </label>
                                      <label style={editFieldStyle}>
                                        Forma
                                        <select aria-label={`Forma de pagamento ${item.line.description}`} value={edit.financial_payment_method_id} onChange={(event) => updateItemEdit(item.id, { financial_payment_method_id: event.target.value })} style={inlineControlStyle}>
                                          <option value="">Sem forma</option>
                                          {paymentMethods.map((paymentMethod) => (
                                            <option key={paymentMethod.id} value={paymentMethod.id}>{paymentMethod.name}</option>
                                          ))}
                                        </select>
                                      </label>
                                      <label style={{ ...editFieldStyle, gridColumn: 'span 2' }}>
                                        Nome de referência
                                        <input
                                          aria-label={`Referência ${item.line.description}`}
                                          value={edit.reference_name}
                                          onChange={(event) => updateItemEdit(item.id, { reference_name: event.target.value })}
                                          placeholder="Nome limpo do lançamento"
                                          style={inlineControlStyle}
                                        />
                                      </label>
                                    </div>
                                    <label style={{ alignItems: 'center', color: '#475569', display: 'flex', fontSize: 12, fontWeight: 800, gap: 8 }}>
                                      <input aria-label={`Salvar memória ${item.line.description}`} type="checkbox" checked={edit.save_memory} onChange={(event) => updateItemEdit(item.id, { save_memory: event.target.checked })} />
                                      Salvar como memória para próximas conciliações parecidas
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
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

const editFieldStyle = {
  color: '#475569',
  display: 'grid',
  fontSize: 12,
  fontWeight: 800,
  gap: 6
} as const;

const inlineControlStyle = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  color: '#0f172a',
  fontSize: 13,
  minHeight: 38,
  padding: '0 10px',
  width: '100%'
} as const;
