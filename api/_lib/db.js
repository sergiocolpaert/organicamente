// ==========================================================================
// CAMADA DE DADOS E INTEGRAÇÃO SUPABASE / GOOGLE SHEETS (ORGANICAMENTE SYSTEM)
// ==========================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

// Helper para chamadas de API REST nativas ao Supabase (Ultra-rápido, ~15ms)
async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro no Supabase (${res.status}): ${errText}`);
  }
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Mapeamento: Banco PostgreSQL (snake_case) <-> Aplicação JS (camelCase)
export function mapRowFromSupabase(row) {
  if (!row) return null;
  return {
    nome: row.nome || '',
    cpf: row.cpf || '',
    email: row.email || '',
    telefone: row.telefone || '',
    cep: row.cep || '',
    endereco: row.endereco || '',
    bairro: row.bairro || '',
    regiao: row.regiao || '',
    pontoReferencia: row.ponto_referencia || 'Não informado',
    horario: row.horario || 'Horário Comercial',
    vizinho: row.vizinho || 'Deixar no local',
    comoConheceu: row.como_conheceu || 'Não informado',
    produtor: row.produtor || 'Bruno',
    diaEntrega: row.dia_entrega || 'Terça-feira',
    cestaTipo: row.cesta_tipo || 'Cesta Família',
    cestaValor: row.cesta_valor || 'R$ 180,00',
    ovosTipo: row.ovos_tipo || 'Sem Ovos',
    ovosValor: row.ovos_valor || 'R$ 0,00',
    totalMensal: row.total_mensal || 'R$ 180,00',
    primeiroPagamento: row.primeiro_pagamento || 'R$ 215,00',
    formaPagamento: row.forma_pagamento || 'PIX',
    statusAssinatura: row.status_assinatura || 'Pendente',
    statusFinanceiroManual: row.status_financeiro_manual || null,
    motivoCancelamento: row.motivo_cancelamento || '',
    motivoDetalhe: row.motivo_detalhe || '',
    dataStatusAlterado: row.data_status_alterado || null,
    observacoes: row.observacoes || '',
    dataHora: row.data_hora || row.created_at || new Date().toISOString(),
    historicoStatus: Array.isArray(row.historico_status) ? row.historico_status : []
  };
}

export function mapRowToSupabase(data) {
  const cleanCpf = String(data.cpf || '').replace(/\D/g, '');
  const prodLower = (data.produtor || '').toLowerCase();
  const produtorClean = prodLower.includes('russo') ? 'Russo' : 'Bruno';

  return {
    cpf: cleanCpf,
    nome: data.nome || '',
    email: data.email || '',
    telefone: data.telefone || '',
    cep: data.cep || '',
    endereco: data.endereco || '',
    bairro: data.bairro || '',
    regiao: data.regiao || '',
    ponto_referencia: data.pontoReferencia || 'Não informado',
    horario: data.horario || 'Horário Comercial',
    vizinho: data.vizinho || 'Deixar no local',
    como_conheceu: data.comoConheceu || 'Não informado',
    produtor: produtorClean,
    dia_entrega: data.diaEntrega || (produtorClean === 'Russo' ? 'Quarta-feira' : 'Terça-feira'),
    cesta_tipo: data.cestaTipo || 'Cesta Família',
    cesta_valor: data.cestaValor || 'R$ 180,00',
    ovos_tipo: data.ovosTipo || 'Sem Ovos',
    ovos_valor: data.ovosValor || 'R$ 0,00',
    total_mensal: data.totalMensal || 'R$ 180,00',
    primeiro_pagamento: data.primeiroPagamento || 'R$ 215,00',
    forma_pagamento: data.formaPagamento || 'PIX',
    status_assinatura: data.statusAssinatura || 'Pendente',
    status_financeiro_manual: data.statusFinanceiroManual || null,
    motivo_cancelamento: data.motivoCancelamento || '',
    motivo_detalhe: data.motivoDetalhe || '',
    data_status_alterado: data.dataStatusAlterado || null,
    observacoes: data.observacoes || '',
    data_hora: data.dataHora || new Date().toISOString(),
    historico_status: data.historicoStatus || []
  };
}

// --------------------------------------------------------------------------
// MÉTODOS CRUD NO SUPABASE
// --------------------------------------------------------------------------

export async function getSubscribersFromSupabase() {
  const rows = await supabaseFetch('/subscribers?select=*&order=data_hora.desc');
  return (rows || []).map(mapRowFromSupabase);
}

export async function createSubscriberInSupabase(data) {
  const payload = mapRowToSupabase(data);
  const rows = await supabaseFetch('/subscribers', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation, resolution=merge-duplicates' },
    body: JSON.stringify(payload)
  });
  return mapRowFromSupabase(rows ? rows[0] : payload);
}

export async function updateSubscriberInSupabase(cpf, data) {
  const cleanCpf = String(cpf).replace(/\D/g, '');
  const payload = mapRowToSupabase(data);
  const rows = await supabaseFetch(`/subscribers?cpf=eq.${cleanCpf}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return mapRowFromSupabase(rows ? rows[0] : payload);
}

export async function deleteSubscriberInSupabase(cpf) {
  const cleanCpf = String(cpf).replace(/\D/g, '');
  await supabaseFetch(`/subscribers?cpf=eq.${cleanCpf}`, {
    method: 'DELETE'
  });
  return true;
}
