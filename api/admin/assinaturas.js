export default async function handler(req, res) {
  // Configura CORS e cabeçalhos
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  try {
    // 1. Validar a Autenticação do Admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.GOOGLE_SHEETS_TOKEN || 'ORGANICAMENTE_ADMIN_SECRET_TOKEN_2026';

    if (token !== expectedToken) {
      return res.status(401).json({ error: 'Token inválido ou sessão expirada.' });
    }

    // 2. Obter URL do Web App do Google Sheets
    const sheetsUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
    if (!sheetsUrl) {
      return res.status(500).json({ error: 'Configuração da planilha (GOOGLE_SHEETS_WEBAPP_URL) ausente na Vercel.' });
    }

    // 3. Buscar dados da planilha do Google Sheets via GET com token
    const sheetsRes = await fetch(`${sheetsUrl}?token=${token}`, {
      method: 'GET'
    });

    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      throw new Error(`Erro ao acessar planilha Google: ${errText}`);
    }

    const planData = await sheetsRes.json();

    if (planData.result === 'error') {
      throw new Error(`Erro retornado pela planilha: ${planData.message}`);
    }

    if (!Array.isArray(planData) || planData.length === 0) {
      return res.status(200).json([]);
    }

    // 4. Configurar chaves e URLs do Asaas
    const isProduction = process.env.ASAAS_ENV === 'production';
    const asaasBaseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/v3';
    
    const apiKeyBruno = process.env.ASAAS_API_KEY_BRUNO;
    const apiKeyRusso = process.env.ASAAS_API_KEY_RUSSO;

    // Estruturas para guardar caches em lote do Asaas
    // Vamos buscar os 100 clientes mais recentes e cobranças recentes de cada produtor
    let asaasCache = {
      bruno: { customersByCpf: {}, lastPaymentsByCustomerId: {} },
      russo: { customersByCpf: {}, lastPaymentsByCustomerId: {} }
    };

    // Função auxiliar para carregar lote do Asaas para um produtor específico
    async function fetchAsaasBatch(apiKey, produtorKey) {
      if (!apiKey) return;
      try {
        // Buscar clientes
        const custRes = await fetch(`${asaasBaseUrl}/customers?limit=100`, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });
        
        if (custRes.ok) {
          const custData = await custRes.json();
          if (custData.data && Array.isArray(custData.data)) {
            custData.data.forEach(c => {
              if (c.cpfCnpj) {
                const cleanCpf = c.cpfCnpj.replace(/\D/g, '');
                asaasCache[produtorKey].customersByCpf[cleanCpf] = c;
              }
            });
          }
        }

        // Buscar cobranças recentes
        const payRes = await fetch(`${asaasBaseUrl}/payments?limit=100`, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });

        if (payRes.ok) {
          const payData = await payRes.json();
          if (payData.data && Array.isArray(payData.data)) {
            // Como a lista vem ordenada da mais recente para a mais antiga, 
            // guardamos a primeira que encontrarmos para cada cliente
            payData.data.forEach(p => {
              if (p.customer && !asaasCache[produtorKey].lastPaymentsByCustomerId[p.customer]) {
                asaasCache[produtorKey].lastPaymentsByCustomerId[p.customer] = p;
              }
            });
          }
        }
      } catch (err) {
        console.error(`Erro ao carregar lote do Asaas para ${produtorKey}:`, err);
      }
    }

    // Carrega em paralelo os lotes de Bruno e Russo
    await Promise.all([
      fetchAsaasBatch(apiKeyBruno, 'bruno'),
      fetchAsaasBatch(apiKeyRusso, 'russo')
    ]);

    // Função para buscar status individual do Asaas caso o cliente não esteja no cache em lote (fallback)
    async function fetchIndividualAsaasStatus(cpfClean, produtorNome) {
      const produtorLower = produtorNome.toLowerCase();
      let apiKey = '';
      let produtorKey = '';

      if (produtorLower.includes('bruno')) {
        apiKey = apiKeyBruno;
        produtorKey = 'bruno';
      } else {
        apiKey = apiKeyRusso;
        produtorKey = 'russo';
      }

      if (!apiKey) return { status: 'SEM_INTEGRACAO', description: 'Sem chave API Asaas' };

      try {
        // 1. Procurar cliente por CPF
        const custRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${cpfClean}`, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });
        
        if (!custRes.ok) return null;
        const custData = await custRes.json();
        
        if (!custData.data || custData.data.length === 0) {
          return { status: 'SEM_CLIENTE', description: 'Não cadastrado no Asaas' };
        }

        const customerId = custData.data[0].id;

        // 2. Buscar última cobrança desse cliente
        const payRes = await fetch(`${asaasBaseUrl}/payments?customer=${customerId}&limit=1`, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });

        if (!payRes.ok) return { status: 'SEM_COBRANCA', description: 'Cliente sem cobranças' };
        const payData = await payRes.json();

        if (!payData.data || payData.data.length === 0) {
          return { status: 'SEM_COBRANCA', description: 'Cliente sem cobranças' };
        }

        const payment = payData.data[0];
        return {
          status: payment.status,
          dueDate: payment.dueDate,
          value: payment.value,
          billingType: payment.billingType,
          invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || ''
        };
      } catch (err) {
        console.error(`Erro na busca individual do Asaas para CPF ${cpfClean}:`, err);
        return null;
      }
    }

    // 5. Cruzamento dos dados da Planilha com o Cache / Fallback do Asaas
    // Executamos em lote a resolução de status para alta velocidade
    const responseData = await Promise.all(planData.map(async (row) => {
      const cpfClean = (row.cpf || '').replace(/\D/g, '');
      const produtorLower = (row.produtor || '').toLowerCase();
      
      let produtorKey = 'russo'; // Fallback padrão
      if (produtorLower.includes('bruno')) {
        produtorKey = 'bruno';
      }

      let asaasInfo = null;

      // Tenta obter do cache em lote
      const cachedCustomer = asaasCache[produtorKey].customersByCpf[cpfClean];
      if (cachedCustomer) {
        const cachedPayment = asaasCache[produtorKey].lastPaymentsByCustomerId[cachedCustomer.id];
        if (cachedPayment) {
          asaasInfo = {
            status: cachedPayment.status,
            dueDate: cachedPayment.dueDate,
            value: cachedPayment.value,
            billingType: cachedPayment.billingType,
            invoiceUrl: cachedPayment.invoiceUrl || cachedPayment.bankSlipUrl || ''
          };
        } else {
          asaasInfo = { status: 'SEM_COBRANCA', description: 'Cliente sem cobranças' };
        }
      }

      // Se não encontrou no cache, roda a busca individual em paralelo
      if (!asaasInfo && cpfClean) {
        asaasInfo = await fetchIndividualAsaasStatus(cpfClean, row.produtor);
      }

      return {
        ...row,
        asaas: asaasInfo || { status: 'DESCONHECIDO', description: 'Status indisponível no Asaas' }
      };
    }));

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Erro na rota de obter assinaturas:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor administrativo.' });
  }
}
