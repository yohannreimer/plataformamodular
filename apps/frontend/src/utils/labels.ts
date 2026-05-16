export function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    Planejada: 'Planejada',
    Aguardando_quorum: 'Aguardando quórum',
    Confirmada: 'Confirmada',
    Concluida: 'Concluída',
    Cancelada: 'Cancelada',
    Previsto: 'Previsto',
    Confirmado: 'Confirmado',
    Executado: 'Executado',
    Cancelado: 'Cancelado',
    Nao_iniciado: 'Não iniciado',
    Planejado: 'Planejado',
    Em_execucao: 'Em execução',
    Concluido: 'Concluído',
    Ativo: 'Ativo',
    Inativo: 'Inativo',
    Em_treinamento: 'Em treinamento',
    Finalizado: 'Finalizado',
    Alta: 'Alta',
    Normal: 'Normal',
    Baixa: 'Baixa',
    Parado: 'Parado',
    Aguardando_liberacao: 'Aguardando liberação',
    Turma_Online: 'Turma online',
    Exclusivo_Online: 'Exclusivo online',
    Presencial: 'Presencial',
    Nosso: 'Nosso',
    Terceiro: 'Terceiro',
    Integral: 'Integral',
    Meio_periodo: 'Meio período',
    Online: 'Online',
    Hibrida: 'Híbrida',
    Em_andamento: 'Em andamento',
    Visita_cliente: 'Visita cliente',
    Pre_vendas: 'Pré-vendas',
    Pos_vendas: 'Pós-vendas',
    Implementacao: 'Implementação',
    Reuniao: 'Reunião',
    Outro: 'Outro',
    Em_processo: 'Em processo',
    Stand_by: 'Stand by',
    Aprovado: 'Aprovado',
    Reprovado: 'Reprovado',
    Banco_de_talentos: 'Banco de talentos',
    Triagem: 'Triagem',
    Primeira_entrevista: 'Primeira entrevista',
    Segunda_fase: 'Segunda fase',
    Final: 'Final'
  };
  return labels[value] ?? value.replace(/_/g, ' ');
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export function statusTone(raw: string | null | undefined): StatusTone {
  const s = (raw ?? '').toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (/confirmad|ativ|concluido|aprovad|encerrad/.test(s)) return 'success';
  if (/cancelad|reprovad|erro|falh/.test(s)) return 'danger';
  if (/pendente|aguardando|em andamento|rascunho|parcial/.test(s)) return 'warning';
  if (/informac|info/.test(s)) return 'info';
  return 'neutral';
}
