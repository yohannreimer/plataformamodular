import { afterEach, expect, test, vi } from 'vitest';
import { financeApi } from '../api';

afterEach(() => {
  vi.restoreAllMocks();
});

test('financeApi shows backend transcription errors without raw JSON leakage', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    message: 'A transcrição por IA foi interrompida pelo provedor. Use o texto capturado ou tente gravar novamente.'
  }), { status: 400 }));

  await expect(financeApi.transcribeAssistantAudio({
    audio_base64: 'abc',
    mime_type: 'audio/webm'
  })).rejects.toThrow('A transcrição por IA foi interrompida pelo provedor');
});

test('financeApi previews and approves OFX reconciliation batches', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

  const previewPayload = {
    company_id: 'company-a',
    financial_account_id: 'acc-1',
    source_file_name: 'maio.ofx',
    source_file_size_bytes: 512,
    ofx_text: '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-19.90<MEMO>TARIFA</STMTTRN></BANKTRANLIST></OFX>'
  };

  await financeApi.previewOfxReconciliation(previewPayload);
  expect(fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('/finance/reconciliation/ofx/preview'),
    expect.objectContaining({ method: 'POST', body: JSON.stringify(previewPayload) })
  );

  const approvePayload = {
    ...previewPayload,
    source_file_hash: 'abc123abc123abc123abc123abc123abc123',
    approved_items: [{
      draft_item_id: 'ofx-line-1',
      decision_type: 'new_transaction' as const,
      approved: true,
      save_memory: true,
      note: 'Tarifa'
    }]
  };

  await financeApi.approveOfxReconciliation(approvePayload);
  expect(fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('/finance/reconciliation/ofx/approve'),
    expect.objectContaining({ method: 'POST', body: JSON.stringify(approvePayload) })
  );
});
