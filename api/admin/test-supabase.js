// ==========================================================================
// ROTA API DE DIAGNÓSTICO E TESTE DE CONEXÃO SUPABASE
// ==========================================================================

import { isSupabaseConfigured, getSubscribersFromSupabase, updateSubscriberInSupabase } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  const report = {
    timestamp: new Date().toISOString(),
    isConfigured: isSupabaseConfigured(),
    supabaseUrl: SUPABASE_URL ? SUPABASE_URL.replace(/(\/\/[^.]+).*/, '$1.supabase.co') : 'NÃO CONFIGURADA',
    hasKey: Boolean(SUPABASE_KEY),
    keyType: SUPABASE_KEY.startsWith('eyJ') ? 'JWT/Bearer' : 'Desconhecida',
    tests: {}
  };

  if (!isSupabaseConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'SUPABASE_URL ou SUPABASE_KEY não estão definidas na Vercel.',
      report
    });
  }

  try {
    // Teste 1: SELECT (Leitura)
    try {
      const rows = await getSubscribersFromSupabase();
      report.tests.select = {
        success: true,
        count: rows ? rows.length : 0,
        sample: rows && rows.length > 0 ? { nome: rows[0].nome, cpf: rows[0].cpf, statusAssinatura: rows[0].statusAssinatura } : null
      };
    } catch (err) {
      report.tests.select = { success: false, error: err.message };
    }

    // Teste 2: UPDATE (Escrita / PATCH)
    if (report.tests.select && report.tests.select.sample) {
      const targetSub = report.tests.select.sample;
      try {
        const updateRes = await updateSubscriberInSupabase(targetSub.cpf, {
          ...targetSub,
          observacoes: targetSub.observacoes ? targetSub.observacoes : 'Teste de Conexão Supabase'
        });
        report.tests.update = {
          success: true,
          updatedCpf: targetSub.cpf,
          returnedData: updateRes ? { nome: updateRes.nome, status: updateRes.statusAssinatura } : null
        };
      } catch (err) {
        report.tests.update = { success: false, error: err.message };
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Diagnóstico da conexão Supabase concluído.',
      report
    });
  } catch (globalErr) {
    return res.status(500).json({
      success: false,
      error: globalErr.message,
      report
    });
  }
}
