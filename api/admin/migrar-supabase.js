// ==========================================================================
// ROTA API DE MIGRAÇÃO: GOOGLE SHEETS -> SUPABASE (POSTGRESQL)
// ==========================================================================

import { isSupabaseConfigured, createSubscriberInSupabase } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    // 1. Verificar Autenticação do Admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.GOOGLE_SHEETS_TOKEN || 'ORGANICAMENTE_ADMIN_SECRET_TOKEN_2026';
    if (token !== expectedToken) {
      return res.status(401).json({ error: 'Token inválido ou sessão expirada.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        error: 'Supabase não configurado. Adicione SUPABASE_URL e SUPABASE_KEY nas variáveis de ambiente da Vercel.'
      });
    }

    const sheetsUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
    if (!sheetsUrl) {
      return res.status(400).json({ error: 'GOOGLE_SHEETS_WEBAPP_URL não configurada.' });
    }

    // 2. Buscar todos os dados da planilha Google Sheets
    const sheetsRes = await fetch(`${sheetsUrl}?token=${token}`, { method: 'GET' });
    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      throw new Error(`Erro ao acessar planilha Google: ${errText}`);
    }

    const planData = await sheetsRes.json();
    if (!Array.isArray(planData) || planData.length === 0) {
      return res.status(200).json({ success: true, migratedCount: 0, message: 'Nenhum dado encontrado na planilha para migrar.' });
    }

    // Filtrar linhas válidas
    const validRows = planData.filter(r => r && r.nome && String(r.nome).trim() !== '' && String(r.nome).trim() !== '-');

    let migratedCount = 0;
    const errors = [];

    // 3. Upsert de cada cliente no Supabase
    for (const row of validRows) {
      try {
        await createSubscriberInSupabase(row);
        migratedCount++;
      } catch (err) {
        console.error(`Erro ao migrar cliente ${row.nome} (${row.cpf}):`, err);
        errors.push({ nome: row.nome, cpf: row.cpf, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      migratedCount,
      totalCount: validRows.length,
      errorsCount: errors.length,
      errors,
      message: `Migração concluída com sucesso! ${migratedCount} assinantes foram importados para o Supabase PostgreSQL.`
    });

  } catch (error) {
    console.error('Erro na rota de migração:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao realizar migração.' });
  }
}
