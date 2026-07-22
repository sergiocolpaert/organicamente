// ==========================================================================
// ENDPOINT API DE LOGS DO SISTEMA - ORGANICAMENTE SYSTEM
// ==========================================================================

import { logEvent, getLogs } from '../_lib/logger.js';
import { isSupabaseConfigured } from '../_lib/db.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar autenticação admin
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  const token = authHeader.split(' ')[1];
  const expectedToken = process.env.GOOGLE_SHEETS_TOKEN || 'ORGANICAMENTE_ADMIN_SECRET_TOKEN_2026';
  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  // GET: Retornar histórico de logs
  if (req.method === 'GET') {
    let logs = getLogs();

    if (isSupabaseConfigured()) {
      try {
        const supabaseRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/system_logs?select=*&order=timestamp.desc&limit=100`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (supabaseRes.ok) {
          const dbLogs = await supabaseRes.json();
          if (Array.isArray(dbLogs) && dbLogs.length > 0) {
            logs = dbLogs;
          }
        }
      } catch (err) {
        console.error('Erro ao ler logs do Supabase:', err);
      }
    }

    return res.status(200).json({ success: true, logs });
  }

  // POST: Registrar novo log vindo do frontend
  if (req.method === 'POST') {
    const { level = 'ERROR', scope = 'FRONTEND', message = 'Erro não especificado', meta = {} } = req.body || {};
    const entry = await logEvent(level, scope, message, meta);
    return res.status(200).json({ success: true, entry });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
