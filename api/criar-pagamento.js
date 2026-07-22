import { isSupabaseConfigured, createSubscriberInSupabase } from './_lib/db.js';

export default async function handler(req, res) {
  // Configura CORS básico se necessário (Vercel gerencia por padrão, mas é boa prática para requisições de outras origens)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const {
      nome,
      email,
      telefone,
      cpf,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      produtor,
      valor,
      cestaTipo,
      billingType // 'PIX' ou 'BOLETO'
    } = req.body;

    if (!nome || !email || !telefone || !cpf || !cep || !endereco || !numero || !produtor || !valor || !billingType) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }

    // 1. Configurar URLs e chaves baseadas no ambiente
    const isProduction = process.env.ASAAS_ENV === 'production';
    const baseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/v3';

    // Determina a chave correta baseada no produtor alocado
    let apiKey = '';
    const produtorLower = produtor.toLowerCase();
    if (produtorLower.includes('bruno')) {
      apiKey = process.env.ASAAS_API_KEY_BRUNO;
    } else if (produtorLower.includes('russo') || produtorLower.includes('josé antônio') || produtorLower.includes('jose antonio')) {
      apiKey = process.env.ASAAS_API_KEY_RUSSO;
    } else {
      apiKey = process.env.ASAAS_API_KEY_RUSSO; // Fallback
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'Configuração da chave API do Asaas para o produtor selecionado não encontrada na Vercel.'
      });
    }

    // 2. Limpar dados para o formato do Asaas
    const cpfClean = cpf.replace(/\D/g, '');
    const phoneClean = telefone.replace(/\D/g, '');
    const cepClean = cep.replace(/\D/g, '');

    // 3. Buscar ou cadastrar cliente no Asaas
    let customerId = '';
    const searchUrl = `${baseUrl}/customers?cpfCnpj=${cpfClean}`;
    
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      throw new Error(`Erro na busca de cliente Asaas: ${errorText}`);
    }

    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      // Cadastra novo cliente no Asaas
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nome,
          cpfCnpj: cpfClean,
          email: email,
          mobilePhone: phoneClean,
          postalCode: cepClean,
          address: endereco,
          addressNumber: numero,
          complement: complemento || ''
        })
      });

      const createData = await createRes.json();
      if (createData.errors || !createData.id) {
        throw new Error(createData.errors ? createData.errors[0].description : 'Erro ao cadastrar cliente no Asaas.');
      }
      customerId = createData.id;
    }

    // 4. Criar a cobrança de vencimento curto (Hoje + 2 dias)
    const today = new Date();
    today.setDate(today.getDate() + 2);
    const dueDate = today.toISOString().split('T')[0];

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: billingType,
        value: parseFloat(valor),
        dueDate: dueDate,
        description: `Adesão Organicamente - ${cestaTipo || 'Assinatura'}`,
        postalService: false
      })
    });

    const paymentData = await paymentRes.json();
    if (paymentData.errors || !paymentData.id) {
      throw new Error(paymentData.errors ? paymentData.errors[0].description : 'Erro ao criar cobrança no Asaas.');
    }

    // 5. Se for Pix, obter o QR Code e a chave Copia e Cola
    let pixCode = '';
    let pixQrCode = '';

    if (billingType === 'PIX') {
      const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
        method: 'GET',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        }
      });

      const pixData = await pixRes.json();
      if (pixData.errors) {
        throw new Error(pixData.errors[0].description);
      }
      pixCode = pixData.payload;
      pixQrCode = pixData.encodedImage;
    }

    // 5.5. Persistir novo cliente no Supabase PostgreSQL
    if (isSupabaseConfigured()) {
      try {
        await createSubscriberInSupabase({
          nome,
          email,
          telefone,
          cpf,
          cep,
          endereco: `${endereco}, nº ${numero}${complemento ? ' - ' + complemento : ''}`,
          bairro,
          regiao: req.body.regiao || 'Rio de Janeiro',
          produtor: produtorLower.includes('russo') ? 'Russo' : 'Bruno',
          diaEntrega: req.body.diaEntrega || (produtorLower.includes('russo') ? 'Quarta-feira' : 'Terça-feira'),
          cestaTipo: cestaTipo || 'Cesta Família',
          cestaValor: `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
          ovosTipo: req.body.ovosTipo || 'Sem Ovos',
          ovosValor: req.body.ovosValor || 'R$ 0,00',
          totalMensal: `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
          primeiroPagamento: `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
          formaPagamento: billingType,
          statusAssinatura: 'Pendente',
          comoConheceu: req.body.comoConheceu || 'Site',
          observacoes: 'Inscrição realizada pelo formulário do site'
        });
      } catch (dbErr) {
        console.error('Erro ao gravar cliente no Supabase via site:', dbErr);
      }
    }

    // 6. Retornar resposta consolidada
    return res.status(200).json({
      success: true,
      paymentId: paymentData.id,
      billingType: billingType,
      pixCode: pixCode,
      pixQrCode: pixQrCode,
      bankSlipUrl: paymentData.bankSlipUrl || '', // PDF para baixar
      invoiceUrl: paymentData.invoiceUrl || '' // URL de fatura visual
    });

  } catch (error) {
    console.error('Erro na Vercel Serverless Function:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
