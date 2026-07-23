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

function formatBrl(val) {
  return `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
}

function calculateCestaPrice(cestaTipo) {
  const t = String(cestaTipo || '').toLowerCase();
  if (t.includes('individual')) return 130.0;
  if (t.includes('quinzenal')) return 90.0;
  if (t.includes('avulsa') || t.includes('unitária')) return 45.0;
  return 180.0; // Padrão Cesta Família
}

function calculateOvosPrice(cestaTipo, ovosTipo) {
  const o = String(ovosTipo || '').toLowerCase();
  if (!o || o.includes('sem ovos') || o.includes('não') || o.includes('nenhum')) return 0.0;

  const c = String(cestaTipo || '').toLowerCase();
  let deliveries = 4;
  if (c.includes('quinzenal')) deliveries = 2;
  if (c.includes('avulsa') || c.includes('unitária')) deliveries = 1;

  let dozens = 1;
  if (o.includes('2 dúzias') || o.includes('2 duzias')) dozens = 2;
  if (o.includes('3 dúzias') || o.includes('3 duzias')) dozens = 3;

  return dozens * deliveries * 16.0;
}

// Mapeamento: Banco PostgreSQL (snake_case) <-> Aplicação JS (camelCase)
export function mapRowFromSupabase(row) {
  if (!row) return null;

  const cestaTipo = row.cesta_tipo || 'Cesta Família';
  const ovosTipo = row.ovos_tipo || 'Sem Ovos';

  const baseCestaVal = calculateCestaPrice(cestaTipo);
  const baseOvosVal = calculateOvosPrice(cestaTipo, ovosTipo);
  const calculatedTotal = (cestaTipo.toLowerCase().includes('avulsa') ? 0 : baseCestaVal) + baseOvosVal;
  const calculatedFirstPay = baseCestaVal + baseOvosVal + 35.0;

  // Reconciliar valores se estiverem vazios ou com o fallback legado 'R$ 180,00' em cestas não-Família
  let cestaValor = row.cesta_valor;
  if (!cestaValor || (cestaValor === 'R$ 180,00' && !cestaTipo.toLowerCase().includes('família'))) {
    cestaValor = formatBrl(baseCestaVal);
  }

  let totalMensal = row.total_mensal;
  if (!totalMensal || (totalMensal === 'R$ 180,00' && !cestaTipo.toLowerCase().includes('família'))) {
    totalMensal = formatBrl(calculatedTotal);
  }

  let primeiroPagamento = row.primeiro_pagamento;
  if (!primeiroPagamento || (primeiroPagamento === 'R$ 215,00' && !cestaTipo.toLowerCase().includes('família'))) {
    primeiroPagamento = formatBrl(calculatedFirstPay);
  }

  // Normalizar nomenclatura de status para padronização ('Ativo', 'Pausado', 'Cancelado', 'Pendente')
  let statusAss = row.status_assinatura || 'Pendente';
  if (statusAss === 'Ativa') statusAss = 'Ativo';
  if (statusAss === 'Pausada') statusAss = 'Pausado';
  if (statusAss === 'Cancelada') statusAss = 'Cancelado';

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
    cestaTipo: cestaTipo,
    cestaValor: cestaValor,
    ovosTipo: ovosTipo,
    ovosValor: row.ovos_valor || formatBrl(baseOvosVal),
    totalMensal: totalMensal,
    primeiroPagamento: primeiroPagamento,
    formaPagamento: row.forma_pagamento || 'PIX',
    statusAssinatura: statusAss,
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
  const rawCpf = String(data.cpf || '');
  const cleanCpf = rawCpf.replace(/\D/g, '');
  const prodLower = (data.produtor || '').toLowerCase();
  const produtorClean = prodLower.includes('russo') ? 'Russo' : 'Bruno';

  const cestaTipo = data.cestaTipo || 'Cesta Família';
  const ovosTipo = data.ovosTipo || 'Sem Ovos';
  const baseCestaVal = calculateCestaPrice(cestaTipo);
  const baseOvosVal = calculateOvosPrice(cestaTipo, ovosTipo);
  const calculatedTotal = (cestaTipo.toLowerCase().includes('avulsa') ? 0 : baseCestaVal) + baseOvosVal;
  const calculatedFirstPay = baseCestaVal + baseOvosVal + 35.0;

  let statusAss = data.statusAssinatura || 'Pendente';
  if (statusAss === 'Ativa') statusAss = 'Ativo';
  if (statusAss === 'Pausada') statusAss = 'Pausado';
  if (statusAss === 'Cancelada') statusAss = 'Cancelado';

  return {
    cpf: cleanCpf || rawCpf,
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
    cesta_tipo: cestaTipo,
    cesta_valor: data.cestaValor || formatBrl(baseCestaVal),
    ovos_tipo: ovosTipo,
    ovos_valor: data.ovosValor || formatBrl(baseOvosVal),
    total_mensal: data.totalMensal || formatBrl(calculatedTotal),
    primeiro_pagamento: data.primeiroPagamento || formatBrl(calculatedFirstPay),
    forma_pagamento: data.formaPagamento || 'PIX',
    status_assinatura: statusAss,
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
  const rawCpf = String(cpf || '');
  const cleanCpf = rawCpf.replace(/\D/g, '');
  const payload = mapRowToSupabase(data);

  // Buscar por CPF limpo ou formatado com pontuação
  const query = `/subscribers?or=(cpf.eq.${cleanCpf},cpf.eq.${encodeURIComponent(rawCpf)})`;
  const rows = await supabaseFetch(query, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return mapRowFromSupabase(rows ? rows[0] : payload);
}

export async function deleteSubscriberInSupabase(cpf) {
  const rawCpf = String(cpf || '');
  const cleanCpf = rawCpf.replace(/\D/g, '');
  await supabaseFetch(`/subscribers?or=(cpf.eq.${cleanCpf},cpf.eq.${encodeURIComponent(rawCpf)})`, {
    method: 'DELETE'
  });
  return true;
}
