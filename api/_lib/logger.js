// ==========================================================================
// SISTEMA INTERNO DE LOGS E AUDITORIA - ORGANICAMENTE SYSTEM
// ==========================================================================

import { isSupabaseConfigured } from './db.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Fila de logs em memória para acesso rápido
const inMemoryLogs = [];
const MAX_LOGS = 100;

export async function logEvent(level, scope, message, meta = {}) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(), // 'INFO', 'WARN', 'ERROR', 'SUCCESS'
    scope, // 'AUTH', 'ASAAS', 'SUPABASE', 'SHEETS', 'FRONTEND', 'SYSTEM'
    message,
    meta: typeof meta === 'object' ? meta : { detail: String(meta) }
  };

  // Adiciona na memória local da função serverless
  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.pop();
  }

  console.log(`[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.scope}] ${logEntry.message}`, logEntry.meta);

  // Se Supabase estiver configurado, envia silenciosamente para a tabela 'system_logs'
  if (isSupabaseConfigured() && SUPABASE_URL && SUPABASE_KEY) {
    try {
      fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/system_logs`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          scope: logEntry.scope,
          message: logEntry.message,
          meta: logEntry.meta
        })
      }).catch(() => {});
    } catch (_) {}
  }

  return logEntry;
}

export function getLogs() {
  return inMemoryLogs;
}
