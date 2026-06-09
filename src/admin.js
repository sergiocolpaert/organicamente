// ==========================================================================
// PAINEL ADMINISTRATIVO ORGANICAMENTE - LÓGICA PRINCIPAL (VITE/VANILLA JS)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Estado Global do Painel
  let subscribers = [];
  let filteredSubscribers = [];
  let currentFilter = 'all'; // 'all', 'bruno', 'russo', 'terca', 'quarta', 'pago', 'atrasado'
  let searchQuery = '';

  // Seletores DOM - Autenticação
  const loginContainer = document.getElementById('login-container');
  const adminDashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');

  // Seletores DOM - Tabela & Filtros
  const tableBody = document.getElementById('table-body');
  const searchInput = document.getElementById('admin-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTabsContainer = document.getElementById('filter-tabs-container');
  const tableRowsCount = document.getElementById('table-rows-count');
  const btnRefresh = document.getElementById('btn-refresh');

  // Seletores DOM - KPIs
  const kpiMrr = document.getElementById('kpi-mrr');
  const kpiActives = document.getElementById('kpi-actives');
  const kpiPending = document.getElementById('kpi-pending');
  const distBrunoQty = document.getElementById('dist-bruno-qty');
  const distRussoQty = document.getElementById('dist-russo-qty');
  const distBrunoBar = document.getElementById('dist-bruno-bar');
  const distRussoBar = document.getElementById('dist-russo-bar');

  // Seletores DOM - Side Drawer (Gaveta)
  const sideDrawer = document.getElementById('side-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerClientName = document.getElementById('drawer-client-name');
  const drawerClientStatus = document.getElementById('drawer-client-status');
  const dCpf = document.getElementById('d-cpf');
  const dEmail = document.getElementById('d-email');
  const dTelefone = document.getElementById('d-telefone');
  const dDataHora = document.getElementById('d-datahora');
  const dCesta = document.getElementById('d-cesta');
  const dOvos = document.getElementById('d-ovos');
  const dProdutor = document.getElementById('d-produtor');
  const dDiaEntrega = document.getElementById('d-diaentrega');
  const dEndereco = document.getElementById('d-endereco');
  const dBairroRegiao = document.getElementById('d-bairro-regiao');
  const dCep = document.getElementById('d-cep');
  const dReferencia = document.getElementById('d-referencia');
  const dHorario = document.getElementById('d-horario');
  const dVizinho = document.getElementById('d-vizinho');
  const dTotalMensal = document.getElementById('d-totalmensal');
  const dPrimeiroPagamento = document.getElementById('d-primeiropagamento');
  const dFormaPagamento = document.getElementById('d-forma-pagamento');
  const dVencimento = document.getElementById('d-vencimento');
  const dAsaasStatus = document.getElementById('d-asaas-status');
  const dLinkFatura = document.getElementById('d-link-fatura');
  const dRowInvoice = document.getElementById('d-row-invoice');
  const dObservacoes = document.getElementById('d-observacoes');
  const btnCopyAddress = document.getElementById('btn-copy-address');
  const linkMaps = document.getElementById('link-maps');
  const btnDrawerWhatsapp = document.getElementById('btn-drawer-whatsapp');

  // Inicializa os ícones do Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // ==========================================================================
  // 1. GERENCIAMENTO DE SESSÃO & LOGIN
  // ==========================================================================
  
  function checkSession() {
    const token = localStorage.getItem('organicamente_admin_token');
    if (token) {
      // Exibe dashboard e oculta tela de login
      loginContainer.classList.add('hidden');
      adminDashboard.classList.remove('hidden');
      fetchData();
    } else {
      // Exibe login e oculta dashboard
      loginContainer.classList.remove('hidden');
      adminDashboard.classList.add('hidden');
    }
  }

  // Evento de Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      btnLogin.disabled = true;
      const originalText = btnLogin.innerHTML;
      btnLogin.innerHTML = '<span>Verificando...</span>';
      loginErrorMsg.classList.add('hidden');

      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Retorno não-JSON de login:', res.status, res.statusText);
          if (res.status === 404) {
            showLoginError('Servidor administrativo não encontrado (Erro 404). Se estiver rodando localmente, utilize "vercel dev" para iniciar.');
          } else {
            showLoginError(`Resposta inválida do servidor (Erro ${res.status}).`);
          }
          return;
        }

        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('organicamente_admin_token', data.token);
          checkSession();
        } else {
          showLoginError(data.error || 'Usuário ou senha inválidos.');
        }
      } catch (err) {
        console.error('Erro na chamada de login:', err);
        showLoginError('Erro de conexão com o servidor administrativo.');
      } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  function showLoginError(msg) {
    loginErrorMsg.querySelector('span').textContent = msg;
    loginErrorMsg.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  // Evento de Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('organicamente_admin_token');
      checkSession();
    });
  }

  // ==========================================================================
  // 2. BUSCA DE DADOS (FETCH)
  // ==========================================================================
  
  async function fetchData() {
    const token = localStorage.getItem('organicamente_admin_token');
    if (!token) return;

    btnRefresh.classList.add('spinning');
    btnRefresh.disabled = true;
    showTableLoading();

    try {
      const res = await fetch('/api/admin/assinaturas', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        // Token inválido ou expirado
        localStorage.removeItem('organicamente_admin_token');
        checkSession();
        return;
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Retorno não-JSON de assinaturas:', res.status, res.statusText);
        throw new Error(`Resposta inválida do servidor (Erro ${res.status})`);
      }

      if (!res.ok) {
        let errMsg = 'Falha ao obter lista de assinantes';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      subscribers = await res.json();
      
      // Inverte para exibir os mais recentes no topo
      subscribers.reverse();

      applyFilters();
      calculateKpis();
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      showTableError(err.message);
    } finally {
      btnRefresh.classList.remove('spinning');
      btnRefresh.disabled = false;
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', fetchData);
  }

  // ==========================================================================
  // 3. RENDERIZAÇÃO DA TABELA & FILTROS
  // ==========================================================================
  
  function showTableLoading() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-loading">
          <div class="skeleton-row">Carregando dados das assinaturas e status do Asaas...</div>
        </td>
      </tr>
    `;
  }

  function showTableError(message) {
    const detail = message ? `<p style="font-size: 12px; color: var(--color-danger); margin-top: 8px; font-weight: 600;">Detalhe do erro: ${message}</p>` : '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div class="table-empty-box">
            <i data-lucide="alert-triangle" style="color: var(--color-danger);"></i>
            <p>Não foi possível carregar as assinaturas. Verifique as credenciais da planilha e do Asaas.</p>
            ${detail}
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderTable() {
    if (filteredSubscribers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">
            <div class="table-empty-box">
              <i data-lucide="info"></i>
              <p>Nenhum assinante encontrado com os filtros selecionados.</p>
            </div>
          </td>
        </tr>
      `;
      tableRowsCount.textContent = 'Mostrando 0 assinantes';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tableBody.innerHTML = '';

    filteredSubscribers.forEach((sub, idx) => {
      // Iniciais para o Avatar
      const initials = (sub.nome || 'U')
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();

      // Badge de Status do Asaas
      const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
      let statusClass = 'desconhecido';
      let statusLabel = 'Sem Registro';

      if (asaasStatus === 'RECEIVED' || asaasStatus === 'CONFIRMED') {
        statusClass = 'paga';
        statusLabel = 'Pago';
      } else if (asaasStatus === 'PENDING') {
        statusClass = 'pendente';
        statusLabel = 'Pendente';
      } else if (asaasStatus === 'OVERDUE') {
        statusClass = 'atrasada';
        statusLabel = 'Vencido';
      } else if (asaasStatus === 'SEM_CLIENTE' || asaasStatus === 'SEM_COBRANCA') {
        statusClass = 'sem_integracao';
        statusLabel = 'Pendente Registro';
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="cell-client">
            <div class="client-avatar">${initials}</div>
            <div class="client-info">
              <span class="client-name">${sub.nome}</span>
              <span class="client-sub">${sub.email} | ${formatPhone(sub.telefone)}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-basket">${sub.cestaTipo}</div>
          <div class="cell-basket-sub">${sub.ovosTipo}</div>
        </td>
        <td>
          <div class="font-highlight">${sub.produtor}</div>
          <div class="cell-basket-sub">${sub.diaEntrega}</div>
        </td>
        <td>
          <div class="value-highlight">${sub.totalMensal}</div>
          <div class="cell-basket-sub">Adesão: ${sub.primeiroPagamento}</div>
        </td>
        <td>
          <span class="badge ${statusClass}">${statusLabel}</span>
        </td>
        <td>
          <button class="btn-action-view" data-index="${idx}">
            <i data-lucide="eye"></i>
            <span>Ver Detalhes</span>
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    tableRowsCount.textContent = `Mostrando ${filteredSubscribers.length} de ${subscribers.length} assinantes`;

    // Event listeners para os botões "Ver Detalhes"
    const viewButtons = tableBody.querySelectorAll('.btn-action-view');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        openDrawer(filteredSubscribers[idx]);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Lógica de Filtros e Busca combinados
  function applyFilters() {
    filteredSubscribers = subscribers.filter(sub => {
      // Filtro de Busca
      const searchMatch = !searchQuery || 
        (sub.nome || '').toLowerCase().includes(searchQuery) ||
        (sub.email || '').toLowerCase().includes(searchQuery) ||
        (sub.cpf || '').replace(/\D/g, '').includes(searchQuery);

      if (!searchMatch) return false;

      // Filtro por Abas
      if (currentFilter === 'all') return true;
      
      const produtorLower = (sub.produtor || '').toLowerCase();
      if (currentFilter === 'bruno') return produtorLower.includes('bruno');
      if (currentFilter === 'russo') return produtorLower.includes('russo') || produtorLower.includes('antônio') || produtorLower.includes('antonio');
      
      const diaLower = (sub.diaEntrega || '').toLowerCase();
      if (currentFilter === 'terca') return diaLower.includes('terça') || diaLower.includes('terca');
      if (currentFilter === 'quarta') return diaLower.includes('quarta');

      const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
      if (currentFilter === 'pago') return asaasStatus === 'RECEIVED' || asaasStatus === 'CONFIRMED';
      if (currentFilter === 'atrasado') return asaasStatus === 'OVERDUE';

      return true;
    });

    renderTable();
  }

  // Listener da Busca
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchQuery) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      applyFilters();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      applyFilters();
    });
  }

  // Listener das Abas
  if (filterTabsContainer) {
    filterTabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;

      filterTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentFilter = btn.getAttribute('data-filter');
      applyFilters();
    });
  }

  // ==========================================================================
  // 4. CÁLCULO DOS KPIs DO DASHBOARD
  // ==========================================================================
  
  function calculateKpis() {
    let mrrTotal = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let brunoCount = 0;
    let russoCount = 0;

    subscribers.forEach(sub => {
      const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
      
      // Contagem de Assinantes (Ativos são todos que não estão inadimplentes e cancelados)
      if (asaasStatus !== 'OVERDUE' && asaasStatus !== 'CANCELLED') {
        activeCount++;
        
        // Conversão de valor "R$ 180,00" -> 180.00
        const valorMensalLimpo = parseFloat((sub.totalMensal || '')
          .replace(/[^\d,]/g, '')
          .replace(',', '.'));
          
        if (!isNaN(valorMensalLimpo)) {
          mrrTotal += valorMensalLimpo;
        }
      }

      // Cobranças Pendentes no Asaas
      if (asaasStatus === 'PENDING') {
        pendingCount++;
      }

      // Distribuição por Produtor
      const produtorLower = (sub.produtor || '').toLowerCase();
      if (produtorLower.includes('bruno')) {
        brunoCount++;
      } else if (produtorLower.includes('russo') || produtorLower.includes('antônio') || produtorLower.includes('antonio')) {
        russoCount++;
      }
    });

    // Atualiza KPIs no DOM
    kpiMrr.textContent = formatMoney(mrrTotal);
    kpiActives.textContent = activeCount;
    kpiPending.textContent = pendingCount;

    // Atualiza Gráfico de Distribuição
    const totalProdutores = brunoCount + russoCount;
    if (totalProdutores > 0) {
      const brunoPct = Math.round((brunoCount / totalProdutores) * 100);
      const russoPct = Math.round((russoCount / totalProdutores) * 100);

      distBrunoQty.textContent = `${brunoCount} (${brunoPct}%)`;
      distRussoQty.textContent = `${russoCount} (${russoPct}%)`;
      
      distBrunoBar.style.width = `${brunoPct}%`;
      distRussoBar.style.width = `${russoPct}%`;
    } else {
      distBrunoQty.textContent = '0 (0%)';
      distRussoQty.textContent = '0 (0%)';
      distBrunoBar.style.width = '0%';
      distRussoBar.style.width = '0%';
    }
  }

  // ==========================================================================
  // 5. DETALHES NA GAVETA (SIDE DRAWER)
  // ==========================================================================
  
  function openDrawer(sub) {
    drawerClientName.textContent = sub.nome;

    // Badge do Status Geral
    const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
    let statusClass = 'desconhecido';
    let statusLabel = 'Sem Registro';

    if (asaasStatus === 'RECEIVED' || asaasStatus === 'CONFIRMED') {
      statusClass = 'paga';
      statusLabel = 'Assinatura Ativa';
    } else if (asaasStatus === 'PENDING') {
      statusClass = 'pendente';
      statusLabel = 'Aguardando Pagamento';
    } else if (asaasStatus === 'OVERDUE') {
      statusClass = 'atrasada';
      statusLabel = 'Pagamento Atrasado';
    } else if (asaasStatus === 'SEM_CLIENTE' || asaasStatus === 'SEM_COBRANCA') {
      statusClass = 'sem_integracao';
      statusLabel = 'Pendência Asaas';
    }

    drawerClientStatus.className = `badge ${statusClass}`;
    drawerClientStatus.textContent = statusLabel;

    // Dados Pessoais
    dCpf.textContent = formatCPF(sub.cpf);
    dEmail.textContent = sub.email;
    dTelefone.textContent = formatPhone(sub.telefone);
    dDataHora.textContent = sub.dataHora ? new Date(sub.dataHora).toLocaleString('pt-BR') : 'Não informada';

    // Detalhes Cesta
    dCesta.textContent = sub.cestaTipo + ' (' + sub.cestaValor + ')';
    dOvos.textContent = sub.ovosTipo + ' (' + sub.ovosValor + ')';
    dProdutor.textContent = sub.produtor;
    dDiaEntrega.textContent = sub.diaEntrega;

    // Logística
    dEndereco.textContent = sub.endereco;
    dBairroRegiao.textContent = `${sub.bairro} / ${sub.regiao}`;
    dCep.textContent = formatCEP(sub.cep);
    dReferencia.textContent = sub.pontoReferencia;
    dHorario.textContent = sub.horario || 'Horário Comercial';
    dVizinho.textContent = sub.vizinho;

    // Financeiro
    dTotalMensal.textContent = sub.totalMensal;
    dPrimeiroPagamento.textContent = sub.primeiroPagamento;
    dFormaPagamento.textContent = sub.formaPagamento || 'PIX';
    
    if (sub.asaas && sub.asaas.dueDate) {
      dVencimento.textContent = new Date(sub.asaas.dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
    } else {
      dVencimento.textContent = 'Não gerado';
    }

    // Status Asaas
    let asaasLabel = 'Nenhum registro de faturamento ativo.';
    if (sub.asaas) {
      if (sub.asaas.status === 'RECEIVED' || sub.asaas.status === 'CONFIRMED') {
        asaasLabel = 'Última fatura confirmada (Paga)';
      } else if (sub.asaas.status === 'PENDING') {
        asaasLabel = `Aguardando pagamento do Pix/Boleto. Vencimento: ${new Date(sub.asaas.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
      } else if (sub.asaas.status === 'OVERDUE') {
        asaasLabel = 'Atrasado: Cobrança Asaas vencida e não compensada.';
      } else if (sub.asaas.status === 'SEM_CLIENTE') {
        asaasLabel = 'Erro: Cliente não foi cadastrado no painel do Asaas.';
      } else if (sub.asaas.status === 'SEM_COBRANCA') {
        asaasLabel = 'Cliente cadastrado no Asaas, mas sem cobrança ativa encontrada.';
      }
    }
    dAsaasStatus.textContent = asaasLabel;
    dAsaasStatus.className = `asaas-desc-text ${statusClass}`;

    // Link Fatura Asaas
    if (sub.asaas && sub.asaas.invoiceUrl) {
      dRowInvoice.classList.remove('hidden');
      dLinkFatura.href = sub.asaas.invoiceUrl;
    } else {
      dRowInvoice.classList.add('hidden');
    }

    // Observações
    dObservacoes.textContent = sub.observacoes || 'Nenhuma observação informada.';

    // Botão de Copiar Endereço
    btnCopyAddress.onclick = () => {
      const fullAddressText = `${sub.endereco} - ${sub.bairro}, Rio de Janeiro - RJ, CEP: ${formatCEP(sub.cep)}`;
      navigator.clipboard.writeText(fullAddressText).then(() => {
        const originalBtnText = btnCopyAddress.innerHTML;
        btnCopyAddress.innerHTML = '<i data-lucide="check"></i> <span>Endereço Copiado!</span>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btnCopyAddress.innerHTML = originalBtnText;
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      });
    };

    // Link do Google Maps
    const mapsQuery = encodeURIComponent(`${sub.endereco}, ${sub.bairro}, Rio de Janeiro - RJ`);
    linkMaps.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    // WhatsApp Direto com mensagem personalizada
    const phoneClean = (sub.telefone || '').replace(/\D/g, '');
    const primeirNome = (sub.nome || '').split(' ')[0];
    
    let zapText = `Olá, ${primeirNome}! 🌱 Tudo bem?\n\nAqui é a equipe do Organicamente. Passando para confirmar as informações de sua assinatura e entrega:\n\n` +
      `🧺 *Cesta:* ${sub.cestaTipo}\n` +
      `🥚 *Ovos:* ${sub.ovosTipo}\n` +
      `🌾 *Produtor:* ${sub.produtor} (${sub.diaEntrega})\n` +
      `🚚 *Endereço:* ${sub.endereco}\n`;

    if (asaasStatus === 'PENDING') {
      zapText += `\n*Nota:* Vimos que a sua cobrança de faturamento de adesão inicial ainda está pendente. Caso precise do link de pagamento para concluir o cadastro, segue:\n🔗 ${sub.asaas.invoiceUrl || 'Acesse o site'}\n`;
    }

    zapText += `\nQualquer dúvida, estamos à disposição por aqui! 😊`;
    
    btnDrawerWhatsapp.href = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(zapText)}`;

    // Abre a gaveta
    sideDrawer.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  }

  // Fechar Gaveta
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => {
      sideDrawer.classList.remove('active');
    });
  }

  // Fecha clicando fora da Gaveta
  if (sideDrawer) {
    sideDrawer.addEventListener('click', (e) => {
      if (e.target === sideDrawer) {
        sideDrawer.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // HELPER FUNCTIONS (FORMATADORES)
  // ==========================================================================
  
  function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function formatPhone(phone) {
    if (!phone) return '-';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  }

  function formatCPF(cpf) {
    if (!cpf) return '-';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  }

  function formatCEP(cep) {
    if (!cep) return '-';
    const clean = cep.replace(/\D/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    }
    return cep;
  }

  // Executa checagem de sessão ao carregar a página
  checkSession();
});
