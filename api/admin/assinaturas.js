export default async function handler(req, res) {
  // Configura CORS e cabeçalhos
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar a Autenticação do Admin (para todos os métodos)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.GOOGLE_SHEETS_TOKEN || 'ORGANICAMENTE_ADMIN_SECRET_TOKEN_2026';

    if (token !== expectedToken) {
      return res.status(401).json({ error: 'Token inválido ou sessão expirada.' });
    }

    const sheetsUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
    if (!sheetsUrl) {
      return res.status(500).json({ error: 'Configuração da planilha (GOOGLE_SHEETS_WEBAPP_URL) ausente na Vercel.' });
    }

    const isProduction = process.env.ASAAS_ENV === 'production';
    const asaasBaseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/v3';
    const apiKeyBruno = process.env.ASAAS_API_KEY_BRUNO;
    const apiKeyRusso = process.env.ASAAS_API_KEY_RUSSO;

    // Helper para determinar API Key baseada no produtor
    function getAsaasApiKey(produtorNome) {
      const prodLower = (produtorNome || '').toLowerCase();
      if (prodLower.includes('bruno')) {
        return apiKeyBruno;
      }
      return apiKeyRusso; // Fallback
    }

    // ==========================================================================
    // MÉTODO GET: LISTAR ASSINANTES (CRUZADO COM ASAAS)
    // ==========================================================================
    if (req.method === 'GET') {
      const sheetsRes = await fetch(`${sheetsUrl}?token=${token}`, {
        method: 'GET'
      });

      if (!sheetsRes.ok) {
        const errText = await sheetsRes.text();
        throw new Error(`Erro ao acessar planilha Google: ${errText}`);
      }

      const responseText = await sheetsRes.text();
      const contentType = sheetsRes.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        console.error('Resposta não-JSON do Google Sheets:', responseText.slice(0, 500));
        throw new Error('A planilha Google (Web App) retornou uma página de erro (HTML) em vez de JSON. Verifique se a variável GOOGLE_SHEETS_WEBAPP_URL na Vercel termina com "/exec" e se no Apps Script a implantação foi configurada para "Quem tem acesso: Qualquer pessoa" (Anyone).');
      }

      let planData;
      try {
        planData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Erro ao processar JSON retornado pela planilha Google.');
      }

      if (planData.result === 'error') {
        throw new Error(`Erro retornado pela planilha: ${planData.message}`);
      }

      if (!Array.isArray(planData) || planData.length === 0) {
        return res.status(200).json([]);
      }

      // Buscar faturas recentes em lote do Asaas para Bruno e Russo para otimizar velocidade
      let asaasCache = {
        bruno: { customersByCpf: {}, lastPaymentsByCustomerId: {} },
        russo: { customersByCpf: {}, lastPaymentsByCustomerId: {} }
      };

      async function fetchAsaasBatch(apiKey, produtorKey) {
        if (!apiKey) return;
        try {
          // Clientes
          const custRes = await fetch(`${asaasBaseUrl}/customers?limit=100`, {
            method: 'GET',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
          });
          if (custRes.ok) {
            const custData = await custRes.json();
            if (custData.data) {
              custData.data.forEach(c => {
                if (c.cpfCnpj) {
                  const cleanCpf = c.cpfCnpj.replace(/\D/g, '');
                  asaasCache[produtorKey].customersByCpf[cleanCpf] = c;
                }
              });
            }
          }
          // Cobranças
          const payRes = await fetch(`${asaasBaseUrl}/payments?limit=100`, {
            method: 'GET',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
          });
          if (payRes.ok) {
            const payData = await payRes.json();
            if (payData.data) {
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

      await Promise.all([
        fetchAsaasBatch(apiKeyBruno, 'bruno'),
        fetchAsaasBatch(apiKeyRusso, 'russo')
      ]);

      // Helper para busca individual (fallback)
      async function fetchIndividualAsaasStatus(cpfClean, produtorNome) {
        const apiKey = getAsaasApiKey(produtorNome);
        if (!apiKey) return null;

        try {
          const custRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${cpfClean}`, {
            method: 'GET',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
          });
          if (!custRes.ok) return null;
          const custData = await custRes.json();
          if (!custData.data || custData.data.length === 0) return { status: 'SEM_CLIENTE' };

          const customerId = custData.data[0].id;
          const payRes = await fetch(`${asaasBaseUrl}/payments?customer=${customerId}&limit=1`, {
            method: 'GET',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
          });
          if (!payRes.ok) return { status: 'SEM_COBRANCA' };
          const payData = await payRes.json();
          if (!payData.data || payData.data.length === 0) return { status: 'SEM_COBRANCA' };

          const payment = payData.data[0];
          return {
            status: payment.status,
            dueDate: payment.dueDate,
            value: payment.value,
            billingType: payment.billingType,
            invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || '',
            paymentDate: payment.paymentDate || '',
            confirmedDate: payment.confirmedDate || ''
          };
        } catch (e) {
          return null;
        }
      }

      // Cruzamento
      const responseData = await Promise.all(planData.map(async (row) => {
        const cpfClean = String(row.cpf || '').replace(/\D/g, '');
        const produtorLower = (row.produtor || '').toLowerCase();
        const produtorKey = produtorLower.includes('bruno') ? 'bruno' : 'russo';

        let asaasInfo = null;
        const cachedCustomer = asaasCache[produtorKey].customersByCpf[cpfClean];
        if (cachedCustomer) {
          const cachedPayment = asaasCache[produtorKey].lastPaymentsByCustomerId[cachedCustomer.id];
          if (cachedPayment) {
            asaasInfo = {
              status: cachedPayment.status,
              dueDate: cachedPayment.dueDate,
              value: cachedPayment.value,
              billingType: cachedPayment.billingType,
              invoiceUrl: cachedPayment.invoiceUrl || cachedPayment.bankSlipUrl || '',
              paymentDate: cachedPayment.paymentDate || '',
              confirmedDate: cachedPayment.confirmedDate || ''
            };
          } else {
            asaasInfo = { status: 'SEM_COBRANCA' };
          }
        }

        if (!asaasInfo && cpfClean) {
          asaasInfo = await fetchIndividualAsaasStatus(cpfClean, row.produtor);
        }

        // Determinação do status interno de assinatura (promovido de forma dinâmica no retorno)
        let statusAssinatura = row.statusAssinatura || '';
        const isPaidInAsaas = asaasInfo && (asaasInfo.status === 'RECEIVED' || asaasInfo.status === 'CONFIRMED');

        if (!statusAssinatura) {
          // Se não há status na planilha (registro legado/antigo)
          statusAssinatura = isPaidInAsaas ? 'Ativo' : 'Pendente';
        } else if (statusAssinatura === 'Pendente' && isPaidInAsaas) {
          // Se está Pendente na planilha mas foi pago no Asaas, promove para Ativo dinamicamente
          statusAssinatura = 'Ativo';
        }

        return {
          ...row,
          statusAssinatura: statusAssinatura,
          asaas: asaasInfo || { status: 'DESCONHECIDO' }
        };
      }));

      return res.status(200).json(responseData);
    }

    // ==========================================================================
    // MÉTODO POST: CADASTRAR NOVO ASSINANTE (Sheets + Asaas)
    // ==========================================================================
    if (req.method === 'POST') {
      const data = req.body;
      data.statusAssinatura = data.statusAssinatura || 'Pendente';
      if (!data.nome || !data.email || !data.telefone || !data.cpf || !data.cep || !data.endereco || !data.bairro || !data.produtor) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes para cadastro.' });
      }

      const apiKey = getAsaasApiKey(data.produtor);
      if (!apiKey) {
        return res.status(500).json({ error: 'Chave API Asaas para o produtor não configurada.' });
      }

      // Integrar com o Asaas
      const cpfClean = data.cpf.replace(/\D/g, '');
      const phoneClean = data.telefone.replace(/\D/g, '');
      const cepClean = data.cep.replace(/\D/g, '');

      let customerId = '';
      try {
        // 1. Procurar ou criar cliente no Asaas
        const searchRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${cpfClean}`, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
          }
        }

        if (!customerId) {
          const createRes = await fetch(`${asaasBaseUrl}/customers`, {
            method: 'POST',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.nome,
              cpfCnpj: cpfClean,
              email: data.email,
              mobilePhone: phoneClean,
              postalCode: cepClean,
              address: data.endereco,
              addressNumber: data.numero || '',
              complement: data.complemento || ''
            })
          });
          const createData = await createRes.json();
          if (createData.id) {
            customerId = createData.id;
          } else {
            throw new Error(createData.errors ? createData.errors[0].description : 'Erro ao cadastrar cliente no Asaas.');
          }
        }

        // 2. Criar cobrança inicial
        const today = new Date();
        today.setDate(today.getDate() + 2);
        const dueDate = today.toISOString().split('T')[0];
        
        // Limpar valor inicial string "R$ 180,00" -> float
        const rawValor = data.primeiroPagamento || data.totalMensal || '35.00';
        const valorLimpo = parseFloat(rawValor.replace(/[^\d,]/g, '').replace(',', '.'));

        const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
          method: 'POST',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: customerId,
            billingType: data.formaPagamento || 'PIX',
            value: isNaN(valorLimpo) ? 35.0 : valorLimpo,
            dueDate: dueDate,
            description: `Adesão Organicamente - ${data.cestaTipo || 'Assinatura'}`,
            postalService: false
          })
        });

        const paymentData = await paymentRes.json();
        if (paymentData.id) {
          data.asaasPaymentId = paymentData.id;
          data.invoiceUrl = paymentData.invoiceUrl || paymentData.bankSlipUrl || '';
        }
      } catch (asaasErr) {
        console.error('Erro de integração Asaas no cadastro admin:', asaasErr);
        // Prossegue em modo de contingência se o Asaas falhar
      }

      // Enviar para o Google Sheets
      const sheetsRes = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          token: token,
          data: data
        })
      });

      if (!sheetsRes.ok) {
        const errText = await sheetsRes.text();
        throw new Error(`Erro ao salvar na planilha: ${errText}`);
      }

      return res.status(200).json({ success: true, message: 'Assinante cadastrado com sucesso!' });
    }

    // ==========================================================================
    // MÉTODO PUT: EDITAR ASSINANTE EXISTENTE (Sheets)
    // ==========================================================================
    if (req.method === 'PUT') {
      const data = req.body;
      if (!data.cpf || !data.nome) {
        return res.status(400).json({ error: 'CPF e Nome são campos obrigatórios para edição.' });
      }

      if ((data.statusAssinatura === 'Inativo' || data.statusAssinatura === 'Cancelado') && !data.dataStatusAlterado) {
        data.dataStatusAlterado = new Date().toISOString();
      }

      // Envia requisição para a planilha com action "update"
      const sheetsRes = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          token: token,
          data: data
        })
      });

      if (!sheetsRes.ok) {
        const errText = await sheetsRes.text();
        throw new Error(`Erro ao atualizar na planilha: ${errText}`);
      }

      const resData = await sheetsRes.json();
      if (resData.result === 'error') {
        return res.status(400).json({ error: resData.message });
      }

      return res.status(200).json({ success: true, message: 'Assinante atualizado com sucesso!' });
    }

    // ==========================================================================
    // MÉTODO DELETE: EXCLUIR ASSINANTE (Sheets)
    // ==========================================================================
    if (req.method === 'DELETE') {
      const { cpf } = req.body;
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório para exclusão.' });
      }

      // Envia requisição para a planilha com action "delete"
      const sheetsRes = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          token: token,
          data: { cpf: cpf }
        })
      });

      if (!sheetsRes.ok) {
        const errText = await sheetsRes.text();
        throw new Error(`Erro ao excluir na planilha: ${errText}`);
      }

      const resData = await sheetsRes.json();
      if (resData.result === 'error') {
        return res.status(400).json({ error: resData.message });
      }

      return res.status(200).json({ success: true, message: 'Assinante excluído com sucesso!' });
    }

    return res.status(405).json({ error: 'Método não permitido.' });

  } catch (error) {
    console.error('Erro na API de assinaturas:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
