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
    const { username, password } = req.body;

    // Obtém credenciais de admin das variáveis de ambiente (com fallbacks locais para desenvolvimento)
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUser && password === adminPass) {
      // Retorna o token de segurança para requisições subsequentes
      const token = process.env.GOOGLE_SHEETS_TOKEN || 'ORGANICAMENTE_ADMIN_SECRET_TOKEN_2026';
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos.' });
    }
  } catch (error) {
    console.error('Erro na rota de login admin:', error);
    return res.status(500).json({ error: 'Erro interno no servidor administrativo.' });
  }
}
