-- ==========================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA E POLÍTICAS DE SEGURANÇA NO SUPABASE (POSTGRESQL)
-- Cole este código no "SQL Editor" do seu painel Supabase (https://supabase.com)
-- ==========================================================================

-- 1. Criação da Tabela Principal 'subscribers'
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    cep TEXT NOT NULL,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    regiao TEXT NOT NULL,
    ponto_referencia TEXT DEFAULT 'Não informado',
    horario TEXT DEFAULT 'Horário Comercial',
    vizinho TEXT DEFAULT 'Deixar no local',
    como_conheceu TEXT DEFAULT 'Não informado',
    produtor TEXT NOT NULL DEFAULT 'Bruno',
    dia_entrega TEXT NOT NULL DEFAULT 'Terça-feira',
    cesta_tipo TEXT NOT NULL DEFAULT 'Cesta Família',
    cesta_valor TEXT NOT NULL DEFAULT 'R$ 180,00',
    ovos_tipo TEXT DEFAULT 'Sem Ovos',
    ovos_valor TEXT DEFAULT 'R$ 0,00',
    total_mensal TEXT NOT NULL DEFAULT 'R$ 180,00',
    primeiro_pagamento TEXT NOT NULL DEFAULT 'R$ 215,00',
    forma_pagamento TEXT DEFAULT 'PIX',
    status_assinatura TEXT DEFAULT 'Pendente',
    status_financeiro_manual TEXT DEFAULT NULL,
    motivo_cancelamento TEXT DEFAULT '',
    motivo_detalhe TEXT DEFAULT '',
    data_status_alterado TIMESTAMPTZ DEFAULT NULL,
    observacoes TEXT DEFAULT '',
    historico_status JSONB DEFAULT '[]'::jsonb
);

-- 2. Habilitar RLS (Row Level Security) e Criar Políticas Permissivas para as APIs
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica e gerencial" ON subscribers;
CREATE POLICY "Permitir leitura publica e gerencial" ON subscribers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao" ON subscribers;
CREATE POLICY "Permitir insercao" ON subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao" ON subscribers;
CREATE POLICY "Permitir atualizacao" ON subscribers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao" ON subscribers;
CREATE POLICY "Permitir exclusao" ON subscribers FOR DELETE USING (true);

-- 3. Índices para Otimização de Busca por CPF, Nome e Status
CREATE INDEX IF NOT EXISTS idx_subscribers_cpf ON subscribers(cpf);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status_assinatura);
CREATE INDEX IF NOT EXISTS idx_subscribers_produtor ON subscribers(produtor);

-- 4. Tabela de Auditoria e Logs do Sistema (Opcional)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level TEXT NOT NULL,
    scope TEXT NOT NULL,
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso aos logs" ON system_logs;
CREATE POLICY "Permitir acesso aos logs" ON system_logs FOR ALL USING (true);

