import {
  isSupabaseConfigured,
  getSubscribersFromSupabase,
  createSubscriberInSupabase,
  updateSubscriberInSupabase,
  deleteSubscriberInSupabase,
  readServerOverrides,
  saveServerOverride
} from '../_lib/db.js';


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

    const sheetsUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL || '';
    const isProduction = process.env.ASAAS_ENV === 'production';
    const asaasBaseUrl = process.env.ASAAS_BASE_URL || (isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/v3');
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
      let planData = [];

      // 1. Tentar buscar do Supabase
      if (isSupabaseConfigured()) {
        try {
          const supabaseRows = await getSubscribersFromSupabase();
          if (Array.isArray(supabaseRows) && supabaseRows.length > 0) {
            planData = supabaseRows;
          }
        } catch (supabaseErr) {
          console.error('Erro ao consultar Supabase:', supabaseErr);
        }
      }

      // 2. Fallback: Tentar buscar do Google Sheets se Supabase estiver vazio
      if ((!planData || planData.length === 0) && sheetsUrl) {
        try {
          const sheetsRes = await fetch(`${sheetsUrl}?token=${token}`, {
            method: 'GET'
          });

          if (sheetsRes.ok) {
            const responseText = await sheetsRes.text();
            const contentType = sheetsRes.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
              const parsed = JSON.parse(responseText);
              if (Array.isArray(parsed)) {
                planData = parsed;
              }
            }
          }
        } catch (sheetsErr) {
          console.error('Erro ao consultar Google Sheets:', sheetsErr);
        }
      }

      if (!Array.isArray(planData)) {
        planData = [];
      }

      // Filtrar linhas completamente vazias ou corrompidas (sem nome nem CPF)
      planData = planData.filter(row => row && row.nome && String(row.nome).trim() !== '' && String(row.nome).trim() !== '-');

      // Aplicar overrides salvos no servidor
      const serverOverrides = readServerOverrides();
      planData = planData.map(row => {
        const cleanCpf = String(row.cpf || '').replace(/\D/g, '');
        if (serverOverrides[cleanCpf]) {
          return { ...row, ...serverOverrides[cleanCpf] };
        }
        return row;
      });

      if (planData.length === 0) {
        return res.status(200).json([]);
      }

      // Verificar se a solicitação pediu sincronização em tempo real do Asaas
      const reqUrl = req.url || '';
      const shouldSyncAsaas = reqUrl.includes('syncAsaas=true');

      // Suporte para atualização direcionada de 1 ÚNICO cliente no Asaas
      if (reqUrl.includes('cpf=')) {
        try {
          const searchParams = new URL(reqUrl, 'http://localhost').searchParams;
          const targetCpf = searchParams.get('cpf');
          if (targetCpf) {
            const cleanCpf = targetCpf.replace(/\D/g, '');
            async function fetchSingleAsaasCustomer(apiKey) {
              if (!apiKey) return null;
              try {
                const cRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${cleanCpf}`, {
                  headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
                });
                if (cRes.ok) {
                  const cData = await cRes.json();
                  if (cData.data && cData.data.length > 0) {
                    const customer = cData.data[0];
                    const pRes = await fetch(`${asaasBaseUrl}/payments?customer=${customer.id}&limit=100`, {
                      headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
                    });
                    if (pRes.ok) {
                      const pData = await pRes.json();
                      const payments = pData.data || [];
                      let totalPaid = 0;
                      let paidCount = 0;
                      const mappedPayments = payments.map(p => {
                        const isPaid = p.status === 'RECEIVED' || p.status === 'CONFIRMED';
                        if (isPaid) {
                          totalPaid += (p.value || 0);
                          paidCount++;
                        }
                        return {
                          id: p.id,
                          status: p.status,
                          dueDate: p.dueDate,
                          value: p.value,
                          billingType: p.billingType,
                          invoiceUrl: p.invoiceUrl || p.bankSlipUrl || '',
                          paymentDate: p.paymentDate || '',
                          confirmedDate: p.confirmedDate || ''
                        };
                      });

                      const lastP = payments[0] || null;
                      return {
                        status: lastP ? lastP.status : 'SEM_COBRANCA',
                        dueDate: lastP ? lastP.dueDate : '',
                        value: lastP ? lastP.value : 0,
                        billingType: lastP ? lastP.billingType : '',
                        invoiceUrl: lastP ? (lastP.invoiceUrl || lastP.bankSlipUrl || '') : '',
                        paymentDate: lastP ? (lastP.paymentDate || '') : '',
                        confirmedDate: lastP ? (lastP.confirmedDate || '') : '',
                        allPayments: mappedPayments,
                        totalPaid: totalPaid,
                        paidCount: paidCount
                      };
                    }
                  }
                }
              } catch (e) {
                console.error('Erro na consulta single Asaas:', e);
              }
              return null;
            }

            const singleAsaasInfo = (await fetchSingleAsaasCustomer(apiKeyBruno)) || (await fetchSingleAsaasCustomer(apiKeyRusso));
            if (singleAsaasInfo) {
              saveServerOverride(cleanCpf, { asaas: singleAsaasInfo });
              const subObj = planData.find(s => String(s.cpf || '').replace(/\D/g, '') === cleanCpf);
              if (subObj) {
                subObj.asaas = singleAsaasInfo;
                return res.status(200).json({ success: true, subscriber: subObj, asaas: singleAsaasInfo });
              }
            }
          }
        } catch (errSingle) {
          console.error('Erro no processamento singleAsaas:', errSingle);
        }
      }

      let asaasCache = {
        bruno: { customersByCpf: {}, allPaymentsByCustomerId: {}, lastPaymentsByCustomerId: {} },
        russo: { customersByCpf: {}, allPaymentsByCustomerId: {}, lastPaymentsByCustomerId: {} }
      };

      if (shouldSyncAsaas) {
        async function fetchAsaasBatch(apiKey, produtorKey) {
          if (!apiKey) return;
          try {
            // Clientes (até 200 registros)
            for (const offset of [0, 100]) {
              const custRes = await fetch(`${asaasBaseUrl}/customers?limit=100&offset=${offset}`, {
                method: 'GET',
                headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
              });
              if (custRes.ok) {
                const custData = await custRes.json();
                if (custData.data && custData.data.length > 0) {
                  custData.data.forEach(c => {
                    if (c.cpfCnpj) {
                      const cleanCpf = c.cpfCnpj.replace(/\D/g, '');
                      asaasCache[produtorKey].customersByCpf[cleanCpf] = c;
                    }
                  });
                } else break;
              } else break;
            }

            // Cobranças (até 200 registros)
            for (const offset of [0, 100]) {
              const payRes = await fetch(`${asaasBaseUrl}/payments?limit=100&offset=${offset}`, {
                method: 'GET',
                headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
              });
              if (payRes.ok) {
                const payData = await payRes.json();
                if (payData.data && payData.data.length > 0) {
                  payData.data.forEach(p => {
                    if (p.customer) {
                      if (!asaasCache[produtorKey].allPaymentsByCustomerId[p.customer]) {
                        asaasCache[produtorKey].allPaymentsByCustomerId[p.customer] = [];
                      }
                      asaasCache[produtorKey].allPaymentsByCustomerId[p.customer].push(p);
                      if (!asaasCache[produtorKey].lastPaymentsByCustomerId[p.customer]) {
                        asaasCache[produtorKey].lastPaymentsByCustomerId[p.customer] = p;
                      }
                    }
                  });
                } else break;
              } else break;
            }
          } catch (err) {
            console.error(`Erro ao carregar lote do Asaas para ${produtorKey}:`, err);
          }
        }

        await Promise.all([
          fetchAsaasBatch(apiKeyBruno, 'bruno'),
          fetchAsaasBatch(apiKeyRusso, 'russo')
        ]).catch(err => console.error('Erro no carregamento Asaas:', err));
      }

      // Cruzamento rápido
      const responseData = planData.map((row) => {
        const cpfClean = String(row.cpf || '').replace(/\D/g, '');
        const produtorLower = (row.produtor || '').toLowerCase();
        const produtorKey = produtorLower.includes('bruno') ? 'bruno' : 'russo';

        let asaasInfo = null;
        const cachedCustomer = asaasCache[produtorKey].customersByCpf[cpfClean];
        if (cachedCustomer) {
          const cachedPayments = asaasCache[produtorKey].allPaymentsByCustomerId[cachedCustomer.id] || [];
          const cachedPayment = asaasCache[produtorKey].lastPaymentsByCustomerId[cachedCustomer.id];
          if (cachedPayment || cachedPayments.length > 0) {
            let totalPaid = 0;
            let paidCount = 0;
            const mappedPayments = cachedPayments.map(p => {
              const isPaid = p.status === 'RECEIVED' || p.status === 'CONFIRMED';
              if (isPaid) {
                totalPaid += (p.value || 0);
                paidCount++;
              }
              return {
                id: p.id,
                status: p.status,
                dueDate: p.dueDate,
                value: p.value,
                billingType: p.billingType,
                invoiceUrl: p.invoiceUrl || p.bankSlipUrl || '',
                paymentDate: p.paymentDate || '',
                confirmedDate: p.confirmedDate || ''
              };
            });

            asaasInfo = {
              status: cachedPayment ? cachedPayment.status : 'DESCONHECIDO',
              dueDate: cachedPayment ? cachedPayment.dueDate : '',
              value: cachedPayment ? cachedPayment.value : 0,
              billingType: cachedPayment ? cachedPayment.billingType : '',
              invoiceUrl: cachedPayment ? (cachedPayment.invoiceUrl || cachedPayment.bankSlipUrl || '') : '',
              paymentDate: cachedPayment ? (cachedPayment.paymentDate || '') : '',
              confirmedDate: cachedPayment ? (cachedPayment.confirmedDate || '') : '',
              allPayments: mappedPayments,
              totalPaid: totalPaid,
              paidCount: paidCount
            };
          } else {
            asaasInfo = { status: 'SEM_COBRANCA', allPayments: [], totalPaid: 0, paidCount: 0 };
          }
        }

        if (!asaasInfo) {
          asaasInfo = { status: 'SEM_COBRANCA', allPayments: [], totalPaid: 0, paidCount: 0 };
        }

        // Determinação do status interno de assinatura (promovido de forma dinâmica se houver pagamento RECENTE)
        let statusAssinatura = row.statusAssinatura || '';
        
        let isRecentPaidInAsaas = false;
        if (asaasInfo && (asaasInfo.status === 'RECEIVED' || asaasInfo.status === 'CONFIRMED')) {
          const rawPaymentDate = asaasInfo.paymentDate || asaasInfo.confirmedDate || asaasInfo.dueDate;
          if (rawPaymentDate) {
            const pDate = new Date(rawPaymentDate.includes('T') ? rawPaymentDate : rawPaymentDate + 'T12:00:00');
            const now = new Date();
            const daysDiff = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
            // Só considera pagamento recente se ocorreu nos últimos 45 dias
            if (daysDiff <= 45) {
              isRecentPaidInAsaas = true;
            }
          }
        }

        if (!statusAssinatura) {
          // Se não há status na planilha (registro legado/antigo)
          statusAssinatura = isRecentPaidInAsaas ? 'Ativo' : 'Pendente';
        } else if (statusAssinatura === 'Pendente' && isRecentPaidInAsaas) {
          // Se está Pendente na planilha mas foi pago RECENTEMENTE no Asaas, promove para Ativo
          statusAssinatura = 'Ativo';
        }

        return {
          ...row,
          statusAssinatura: statusAssinatura,
          asaas: asaasInfo || { status: 'DESCONHECIDO' }
        };
      });

      return res.status(200).json(responseData);
    }

    // ==========================================================================
    // MÉTODO POST: CADASTRAR NOVO ASSINANTE (Sheets + Asaas)
    // ==========================================================================
    if (req.method === 'POST') {
      const data = req.body;
      data.statusAssinatura = data.statusAssinatura || 'Pendente';
      if (!data.dataHora) {
        data.dataHora = new Date().toISOString();
      }
      const prodLower = (data.produtor || '').toLowerCase();
      data.produtor = prodLower.includes('russo') ? 'Russo' : 'Bruno';

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

      // Persistir no Supabase PostgreSQL
      if (isSupabaseConfigured()) {
        try {
          await createSubscriberInSupabase(data);
        } catch (supabaseErr) {
          console.error('Erro ao salvar no Supabase:', supabaseErr);
        }
      }

      // Enviar para o Google Sheets (modo de compatibilidade/contingência)
      if (sheetsUrl) {
        try {
          await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              token: token,
              data: data
            })
          });
        } catch (sErr) {
          console.error('Erro no fallback Sheets:', sErr);
        }
      }

      return res.status(200).json({ success: true, message: 'Assinante cadastrado com sucesso!' });
    }

    // ==========================================================================
    // MÉTODO PUT: EDITAR ASSINANTE EXISTENTE
    // ==========================================================================
    if (req.method === 'PUT') {
      const data = req.body;
      if (!data.cpf) {
        return res.status(400).json({ error: 'CPF é um campo obrigatório para edição.' });
      }

      if ((data.statusAssinatura === 'Inativo' || data.statusAssinatura === 'Cancelado') && !data.dataStatusAlterado) {
        data.dataStatusAlterado = new Date().toISOString();
      }

      // Persistir no cache de overrides do servidor
      saveServerOverride(data.cpf, data);

      if (isSupabaseConfigured()) {
        try {
          await updateSubscriberInSupabase(data.cpf, data);
        } catch (supabaseErr) {
          console.error('Erro ao atualizar no Supabase:', supabaseErr);
        }
      }

      if (sheetsUrl) {
        try {
          await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              token: token,
              data: data
            })
          });
        } catch (sErr) {
          console.error('Erro no fallback Sheets:', sErr);
        }
      }

      return res.status(200).json({ success: true, message: 'Assinante atualizado com sucesso!' });
    }

    // ==========================================================================
    // MÉTODO DELETE: EXCLUIR ASSINANTE
    // ==========================================================================
    if (req.method === 'DELETE') {
      const { cpf } = req.body;
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório para exclusão.' });
      }

      if (isSupabaseConfigured()) {
        try {
          await deleteSubscriberInSupabase(cpf);
        } catch (supabaseErr) {
          console.error('Erro ao excluir no Supabase:', supabaseErr);
        }
      }

      if (sheetsUrl) {
        try {
          await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              token: token,
              data: { cpf: cpf }
            })
          });
        } catch (sErr) {
          console.error('Erro no fallback Sheets:', sErr);
        }
      }

      return res.status(200).json({ success: true, message: 'Assinante removido com sucesso!' });
    }

    return res.status(405).json({ error: 'Método não permitido.' });

  } catch (error) {
    console.error('Erro na API de assinaturas:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
