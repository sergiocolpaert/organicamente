// ==========================================================================
// PAINEL ADMINISTRATIVO ORGANICAMENTE - LÓGICA PRINCIPAL (VITE/VANILLA JS)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Estado Global do Painel
  let subscribers = [];
  let filteredSubscribers = [];
  let currentFilter = 'all'; 
  let searchQuery = '';
  let selectedSubscriber = null; // Guarda o assinante selecionado atualmente

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

  // Seletores DOM - Novo Assinante
  const btnNewSubscriber = document.getElementById('btn-new-subscriber');
  const newSubscriberModal = document.getElementById('new-subscriber-modal');
  const btnCloseNewModal = document.getElementById('btn-close-new-modal');
  const newSubscriberForm = document.getElementById('new-subscriber-form');
  const btnNewCancel = document.getElementById('btn-new-cancel');

  // Seletores DOM - Modal Detalhes/Edição
  const detailsModal = document.getElementById('details-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalClientName = document.getElementById('modal-client-name');
  const modalClientStatus = document.getElementById('modal-client-status');
  const modalTabs = document.querySelector('.modal-tabs');
  const modalTabButtons = document.querySelectorAll('.modal-tab-btn');
  const modalBodies = document.querySelectorAll('.modal-body');

  // Seletores DOM - Visualização Detalhes
  const mCpf = document.getElementById('m-cpf');
  const mEmail = document.getElementById('m-email');
  const mTelefone = document.getElementById('m-telefone');
  const mDataHora = document.getElementById('m-datahora');
  const mCesta = document.getElementById('m-cesta');
  const mOvos = document.getElementById('m-ovos');
  const mProdutor = document.getElementById('m-produtor');
  const mDiaEntrega = document.getElementById('m-diaentrega');
  const mEndereco = document.getElementById('m-endereco');
  const mBairroRegiao = document.getElementById('m-bairro-regiao');
  const mCep = document.getElementById('m-cep');
  const mReferencia = document.getElementById('m-referencia');
  const mHorario = document.getElementById('m-horario');
  const mVizinho = document.getElementById('m-vizinho');
  const mTotalMensal = document.getElementById('m-totalmensal');
  const mPrimeiroPagamento = document.getElementById('m-primeiropagamento');
  const mFormaPagamento = document.getElementById('m-forma-pagamento');
  const mVencimento = document.getElementById('m-vencimento');
  const mAsaasStatus = document.getElementById('m-asaas-status');
  const mAsaasBox = document.getElementById('m-asaas-box');
  const mLinkFatura = document.getElementById('m-link-fatura');
  const mRowInvoice = document.getElementById('m-row-invoice');
  const mObservacoes = document.getElementById('m-observacoes');
  const btnModalCopyAddress = document.getElementById('btn-modal-copy-address');
  const modalLinkMaps = document.getElementById('modal-link-maps');
  const modalBtnWhatsapp = document.getElementById('modal-btn-whatsapp');

  // Seletores DOM - Edição
  const editSubscriberForm = document.getElementById('edit-subscriber-form');
  const editOriginalCpf = document.getElementById('edit-original-cpf');
  const editOriginalDataHora = document.getElementById('edit-original-datahora');
  const modalViewFooter = document.getElementById('modal-view-footer');
  const modalEditFooter = document.getElementById('modal-edit-footer');
  const btnModalEdit = document.getElementById('btn-modal-edit');
  const btnModalDelete = document.getElementById('btn-modal-delete');
  const btnEditCancel = document.getElementById('btn-edit-cancel');
  const btnEditSave = document.getElementById('btn-edit-save');

  // Seletores DOM - Confirmação Exclusão
  const confirmDeleteModal = document.getElementById('confirm-delete-modal');
  const deleteClientName = document.getElementById('delete-client-name');
  const btnDeleteCancel = document.getElementById('btn-delete-cancel');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

  // Inicializa os ícones do Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Preços CSA padrão para cálculos reativos nos cadastros e edições
  const pricesConfig = {
    cesta: {
      'Cesta Família': 180.0,
      'Cesta Individual': 130.0,
      'Cesta Quinzenal': 90.0,
      'Entrega Avulsa (Unitária)': 45.0
    },
    eggCostPerDozen: 16.0,
    adesao: 35.0
  };

  // ==========================================================================
  // 1. GERENCIAMENTO DE SESSÃO & LOGIN
  // ==========================================================================
  
  function checkSession() {
    const token = localStorage.getItem('organicamente_admin_token');
    if (token) {
      loginContainer.classList.add('hidden');
      adminDashboard.classList.remove('hidden');
      fetchData();
    } else {
      loginContainer.classList.remove('hidden');
      adminDashboard.classList.add('hidden');
    }
  }

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
          if (res.status === 404) {
            showLoginError('Servidor não encontrado (Erro 404). Se estiver rodando localmente, utilize "vercel dev".');
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

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('organicamente_admin_token');
      checkSession();
    });
  }

  // ==========================================================================
  // 2. BUSCA DE DADOS (GET)
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
        localStorage.removeItem('organicamente_admin_token');
        checkSession();
        return;
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Resposta inválida do servidor (Erro ${res.status})`);
      }

      if (!res.ok) {
        let errMsg = 'Falha ao obter lista de assinantes';
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      subscribers = await res.json();
      
      // Ordenação mais recente no topo
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
      const initials = (sub.nome || 'U')
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();

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

    const viewButtons = tableBody.querySelectorAll('.btn-action-view');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        openDetailsModal(filteredSubscribers[idx]);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function applyFilters() {
    filteredSubscribers = subscribers.filter(sub => {
      const searchMatch = !searchQuery || 
        (sub.nome || '').toLowerCase().includes(searchQuery) ||
        (sub.email || '').toLowerCase().includes(searchQuery) ||
        (sub.cpf || '').replace(/\D/g, '').includes(searchQuery);

      if (!searchMatch) return false;

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
      
      if (asaasStatus !== 'OVERDUE' && asaasStatus !== 'CANCELLED') {
        activeCount++;
        
        const valorMensalLimpo = parseFloat((sub.totalMensal || '')
          .replace(/[^\d,]/g, '')
          .replace(',', '.'));
          
        if (!isNaN(valorMensalLimpo)) {
          mrrTotal += valorMensalLimpo;
        }
      }

      if (asaasStatus === 'PENDING') {
        pendingCount++;
      }

      const produtorLower = (sub.produtor || '').toLowerCase();
      if (produtorLower.includes('bruno')) {
        brunoCount++;
      } else if (produtorLower.includes('russo') || produtorLower.includes('antônio') || produtorLower.includes('antonio')) {
        russoCount++;
      }
    });

    kpiMrr.textContent = formatMoney(mrrTotal);
    kpiActives.textContent = activeCount;
    kpiPending.textContent = pendingCount;

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
  // 5. ABERTURA DO MODAL DETALHES & ABAS INTERNALIZADAS
  // ==========================================================================
  
  function openDetailsModal(sub) {
    selectedSubscriber = sub;
    modalClientName.textContent = sub.nome;

    // Reset para modo visualização
    exitEditMode();

    // Reset de abas
    modalTabButtons.forEach(btn => btn.classList.remove('active'));
    modalTabButtons[0].classList.add('active');
    modalBodies.forEach(body => body.classList.remove('active-tab'));
    modalBodies[0].classList.add('active-tab');

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

    modalClientStatus.className = `badge ${statusClass}`;
    modalClientStatus.textContent = statusLabel;

    // Dados Pessoais
    mCpf.textContent = formatCPF(sub.cpf);
    mEmail.textContent = sub.email;
    mTelefone.textContent = formatPhone(sub.telefone);
    mDataHora.textContent = sub.dataHora ? new Date(sub.dataHora).toLocaleString('pt-BR') : 'Não informada';

    // Detalhes Cesta
    mCesta.textContent = sub.cestaTipo + ' (' + sub.cestaValor + ')';
    mOvos.textContent = sub.ovosTipo + ' (' + sub.ovosValor + ')';
    mProdutor.textContent = sub.produtor;
    mDiaEntrega.textContent = sub.diaEntrega;

    // Logística
    mEndereco.textContent = sub.endereco;
    mBairroRegiao.textContent = `${sub.bairro} / ${sub.regiao}`;
    mCep.textContent = formatCEP(sub.cep);
    mReferencia.textContent = sub.pontoReferencia || 'Não informado';
    mHorario.textContent = sub.horario || 'Horário Comercial';
    mVizinho.textContent = sub.vizinho || 'Deixar no local';

    // Financeiro
    mTotalMensal.textContent = sub.totalMensal;
    mPrimeiroPagamento.textContent = sub.primeiroPagamento;
    mFormaPagamento.textContent = sub.formaPagamento || 'PIX';
    
    if (sub.asaas && sub.asaas.dueDate) {
      mVencimento.textContent = new Date(sub.asaas.dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
    } else {
      mVencimento.textContent = 'Não gerado';
    }

    // Status Asaas
    let asaasLabel = 'Nenhum faturamento registrado.';
    if (sub.asaas) {
      if (sub.asaas.status === 'RECEIVED' || sub.asaas.status === 'CONFIRMED') {
        asaasLabel = 'Última fatura paga';
      } else if (sub.asaas.status === 'PENDING') {
        asaasLabel = `Pendente. Vencimento: ${new Date(sub.asaas.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
      } else if (sub.asaas.status === 'OVERDUE') {
        asaasLabel = 'Atrasado: Cobrança vencida no Asaas.';
      } else if (sub.asaas.status === 'SEM_CLIENTE') {
        asaasLabel = 'Cliente não cadastrado no Asaas.';
      } else if (sub.asaas.status === 'SEM_COBRANCA') {
        asaasLabel = 'Cliente no Asaas, sem cobrança ativa.';
      }
    }
    mAsaasStatus.textContent = asaasLabel;
    mAsaasStatus.className = `asaas-desc-text ${statusClass}`;

    if (sub.asaas && sub.asaas.invoiceUrl) {
      mRowInvoice.classList.remove('hidden');
      mLinkFatura.href = sub.asaas.invoiceUrl;
    } else {
      mRowInvoice.classList.add('hidden');
    }

    // Observações
    mObservacoes.textContent = sub.observacoes || 'Nenhuma observação informada.';

    // Botão de Copiar Endereço
    btnModalCopyAddress.onclick = () => {
      const fullAddressText = `${sub.endereco} - ${sub.bairro}, Rio de Janeiro - RJ, CEP: ${formatCEP(sub.cep)}`;
      navigator.clipboard.writeText(fullAddressText).then(() => {
        const originalText = btnModalCopyAddress.innerHTML;
        btnModalCopyAddress.innerHTML = '<i data-lucide="check"></i> <span>Copiado!</span>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btnModalCopyAddress.innerHTML = originalText;
          if (window.lucide) window.lucide.createIcons();
        }, 1500);
      });
    };

    // Link do Google Maps
    const mapsQuery = encodeURIComponent(`${sub.endereco}, ${sub.bairro}, Rio de Janeiro - RJ`);
    modalLinkMaps.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    // WhatsApp Direto
    const phoneClean = (sub.telefone || '').replace(/\D/g, '');
    const primeirNome = (sub.nome || '').split(' ')[0];
    
    let zapText = `Olá, ${primeirNome}! 🌱 Tudo bem?\n\nAqui é a equipe do Organicamente. Passando para confirmar as informações de sua assinatura:\n\n` +
      `🧺 *Cesta:* ${sub.cestaTipo}\n` +
      `🥚 *Ovos:* ${sub.ovosTipo}\n` +
      `🌾 *Produtor:* ${sub.produtor} (${sub.diaEntrega})\n` +
      `🚚 *Endereço:* ${sub.endereco}\n`;

    if (asaasStatus === 'PENDING') {
      zapText += `\n*Nota:* A sua cobrança inicial ainda está pendente. Segue o link para pagamento:\n🔗 ${sub.asaas.invoiceUrl || 'Acesse o site'}\n`;
    }

    zapText += `\nQualquer dúvida, estamos à disposição! 😊`;
    modalBtnWhatsapp.href = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(zapText)}`;

    // Abre o Modal
    detailsModal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  }

  // Listener para alternar Abas do Modal
  if (modalTabs) {
    modalTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.modal-tab-btn');
      if (!btn) return;

      modalTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      modalBodies.forEach(body => {
        if (body.id === targetTab) {
          body.classList.add('active-tab');
        } else {
          body.classList.remove('active-tab');
        }
      });
    });
  }

  // Fechar Modal
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      detailsModal.classList.remove('active');
    });
  }

  // Fechar clicando fora do Modal
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) {
        detailsModal.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // 6. LÓGICA DE CADASTRO (CRIAR)
  // ==========================================================================
  
  if (btnNewSubscriber) {
    btnNewSubscriber.addEventListener('click', () => {
      newSubscriberForm.reset();
      newSubscriberModal.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (btnCloseNewModal) {
    btnCloseNewModal.addEventListener('click', () => {
      newSubscriberModal.classList.remove('active');
    });
  }

  if (btnNewCancel) {
    btnNewCancel.addEventListener('click', () => {
      newSubscriberModal.classList.remove('active');
    });
  }

  if (newSubscriberModal) {
    newSubscriberModal.addEventListener('click', (e) => {
      if (e.target === newSubscriberModal) {
        newSubscriberModal.classList.remove('active');
      }
    });
  }

  // Cálculos automáticos reativos no formulário de cadastro
  function setupReactiveCalculations(formPrefix) {
    const cestaSelect = document.getElementById(`${formPrefix}-cestaTipo`);
    const cestaValorInput = document.getElementById(`${formPrefix}-cestaValor`);
    const ovosSelect = document.getElementById(`${formPrefix}-ovosTipo`);
    const ovosValorInput = document.getElementById(`${formPrefix}-ovosValor`);
    const totalInput = document.getElementById(`${formPrefix}-totalmensal`);
    const primeiroInput = document.getElementById(`${formPrefix}-primeiropagamento`);

    function calculate() {
      const cestaVal = cestaSelect.value;
      const ovosVal = ovosSelect.value;

      // Cesta valor base
      let cestaPrice = pricesConfig.cesta[cestaVal] || 0;
      cestaValorInput.value = formatMoneyPlain(cestaPrice);

      // Quantidade de entregas
      let deliveries = 4;
      if (cestaVal === 'Cesta Quinzenal') {
        deliveries = 2;
      } else if (cestaVal === 'Entrega Avulsa (Unitária)') {
        deliveries = 1;
      }

      // Ovos valor
      let eggsPrice = 0;
      if (ovosVal.includes('1 dúzia')) eggsPrice = 1 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('2 dúzias')) eggsPrice = 2 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('3 dúzias')) eggsPrice = 3 * deliveries * pricesConfig.eggCostPerDozen;
      
      ovosValorInput.value = formatMoneyPlain(eggsPrice);

      // Totais
      const totalMensal = cestaVal === 'Entrega Avulsa (Unitária)' ? 0 : (cestaPrice + eggsPrice);
      totalInput.value = formatMoneyPlain(totalMensal);

      // Primeiro pagamento = Cesta + Ovos + Adesão
      const primeiroPagamento = cestaPrice + eggsPrice + pricesConfig.adesao;
      primeiroInput.value = formatMoneyPlain(primeiroPagamento);
    }

    if (cestaSelect && ovosSelect) {
      cestaSelect.addEventListener('change', calculate);
      ovosSelect.addEventListener('change', calculate);
    }
  }

  setupReactiveCalculations('new');
  setupReactiveCalculations('edit');

  // Submit Cadastro
  if (newSubscriberForm) {
    newSubscriberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('btn-new-submit');
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Gravando...</span>';

      const token = localStorage.getItem('organicamente_admin_token');
      
      // Coleta dados
      const data = {
        nome: document.getElementById('new-nome').value.trim(),
        email: document.getElementById('new-email').value.trim(),
        telefone: document.getElementById('new-telefone').value.trim(),
        cpf: document.getElementById('new-cpf').value.trim(),
        regiao: document.getElementById('new-regiao').value.trim(),
        bairro: document.getElementById('new-bairro').value.trim(),
        produtor: document.getElementById('new-produtor').value,
        diaEntrega: document.getElementById('new-diaentrega').value,
        cestaTipo: document.getElementById('new-cestaTipo').value,
        cestaValor: document.getElementById('new-cestaValor').value,
        ovosTipo: document.getElementById('new-ovosTipo').value,
        ovosValor: document.getElementById('new-ovosValor').value,
        cep: document.getElementById('new-cep').value.trim(),
        endereco: document.getElementById('new-endereco').value.trim(),
        pontoReferencia: document.getElementById('new-referencia').value.trim() || 'Não informado',
        horario: document.getElementById('new-horario').value.trim() || 'Horário Comercial',
        vizinho: document.getElementById('new-vizinho').value.trim() || 'Deixar no local',
        comoConheceu: document.getElementById('new-comoConheceu').value.trim() || 'Não informado',
        observacoes: document.getElementById('new-observacoes').value.trim() || 'Nenhuma',
        totalMensal: document.getElementById('new-totalmensal').value,
        primeiroPagamento: document.getElementById('new-primeiropagamento').value,
        formaPagamento: document.getElementById('new-forma-pagamento').value
      };

      try {
        const res = await fetch('/api/admin/assinaturas', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao cadastrar novo assinante.');
        }

        alert('Assinante cadastrado com sucesso!');
        newSubscriberModal.classList.remove('active');
        fetchData(); // Recarrega
      } catch (err) {
        console.error(err);
        alert(`Falha no cadastro: ${err.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ==========================================================================
  // 7. LÓGICA DE EDIÇÃO (UPDATE)
  // ==========================================================================
  
  if (btnModalEdit) {
    btnModalEdit.addEventListener('click', () => {
      enterEditMode();
    });
  }

  if (btnEditCancel) {
    btnEditCancel.addEventListener('click', () => {
      exitEditMode();
    });
  }

  function enterEditMode() {
    if (!selectedSubscriber) return;

    // Altera título e esconde visualização
    modalClientName.textContent = `Editar Assinante`;
    modalClientStatus.classList.add('hidden');
    modalTabs.classList.add('hidden');
    modalBodies.forEach(body => body.classList.remove('active-tab'));
    
    // Mostra Form de Edição e botões de edição
    editSubscriberForm.classList.remove('hidden');
    modalViewFooter.classList.add('hidden');
    modalEditFooter.classList.remove('hidden');

    // Popula formulário de edição
    editOriginalCpf.value = selectedSubscriber.cpf;
    editOriginalDataHora.value = selectedSubscriber.dataHora || '';
    
    document.getElementById('edit-nome').value = selectedSubscriber.nome || '';
    document.getElementById('edit-cpf').value = selectedSubscriber.cpf || '';
    document.getElementById('edit-email').value = selectedSubscriber.email || '';
    document.getElementById('edit-telefone').value = selectedSubscriber.telefone || '';
    document.getElementById('edit-endereco').value = selectedSubscriber.endereco || '';
    document.getElementById('edit-cep').value = selectedSubscriber.cep || '';
    document.getElementById('edit-bairro').value = selectedSubscriber.bairro || '';
    document.getElementById('edit-regiao').value = selectedSubscriber.regiao || '';
    document.getElementById('edit-referencia').value = selectedSubscriber.pontoReferencia || '';
    document.getElementById('edit-vizinho').value = selectedSubscriber.vizinho || '';
    document.getElementById('edit-horario').value = selectedSubscriber.horario || '';
    document.getElementById('edit-comoConheceu').value = selectedSubscriber.comoConheceu || '';
    document.getElementById('edit-observacoes').value = selectedSubscriber.observacoes || '';
    
    // Selects
    document.getElementById('edit-produtor').value = selectedSubscriber.produtor || 'Russo e Família';
    document.getElementById('edit-diaentrega').value = selectedSubscriber.diaEntrega || 'Quarta-feira';
    document.getElementById('edit-cestaTipo').value = selectedSubscriber.cestaTipo || 'Cesta Individual';
    document.getElementById('edit-ovosTipo').value = selectedSubscriber.ovosTipo || 'Sem Ovos';
    document.getElementById('edit-forma-pagamento').value = selectedSubscriber.formaPagamento || 'PIX';

    // Valores
    document.getElementById('edit-cestaValor').value = selectedSubscriber.cestaValor || 'R$ 0,00';
    document.getElementById('edit-ovosValor').value = selectedSubscriber.ovosValor || 'R$ 0,00';
    document.getElementById('edit-totalmensal').value = selectedSubscriber.totalMensal || 'R$ 0,00';
    document.getElementById('edit-primeiropagamento').value = selectedSubscriber.primeiroPagamento || 'R$ 0,00';

    if (window.lucide) window.lucide.createIcons();
  }

  function exitEditMode() {
    if (!selectedSubscriber) return;

    modalClientName.textContent = selectedSubscriber.nome;
    modalClientStatus.classList.remove('hidden');
    modalTabs.classList.remove('hidden');
    
    // Volta abas ativa
    const activeTabId = modalTabs.querySelector('.modal-tab-btn.active').getAttribute('data-tab');
    document.getElementById(activeTabId).classList.add('active-tab');

    // Oculta Formulário
    editSubscriberForm.classList.add('hidden');
    modalViewFooter.classList.remove('hidden');
    modalEditFooter.classList.add('hidden');
    
    if (window.lucide) window.lucide.createIcons();
  }

  // Evento Salvar Edição
  if (btnEditSave) {
    btnEditSave.addEventListener('click', async () => {
      // Validações básicas de HTML
      if (!editSubscriberForm.reportValidity()) return;

      btnEditSave.disabled = true;
      const originalText = btnEditSave.innerHTML;
      btnEditSave.innerHTML = '<span>Salvando...</span>';

      const token = localStorage.getItem('organicamente_admin_token');

      // Coleta dados
      const updatedData = {
        nome: document.getElementById('edit-nome').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        telefone: document.getElementById('edit-telefone').value.trim(),
        cpf: editOriginalCpf.value, // CPF atua como chave
        regiao: document.getElementById('edit-regiao').value.trim(),
        bairro: document.getElementById('edit-bairro').value.trim(),
        produtor: document.getElementById('edit-produtor').value,
        diaEntrega: document.getElementById('edit-diaentrega').value,
        cestaTipo: document.getElementById('edit-cestaTipo').value,
        cestaValor: document.getElementById('edit-cestaValor').value,
        ovosTipo: document.getElementById('edit-ovosTipo').value,
        ovosValor: document.getElementById('edit-ovosValor').value,
        cep: document.getElementById('edit-cep').value.trim(),
        endereco: document.getElementById('edit-endereco').value.trim(),
        pontoReferencia: document.getElementById('edit-referencia').value.trim() || 'Não informado',
        horario: document.getElementById('edit-horario').value.trim() || 'Horário Comercial',
        vizinho: document.getElementById('edit-vizinho').value.trim() || 'Deixar no local',
        comoConheceu: document.getElementById('edit-comoConheceu').value.trim() || 'Não informado',
        observacoes: document.getElementById('edit-observacoes').value.trim() || 'Nenhuma',
        totalMensal: document.getElementById('edit-totalmensal').value,
        primeiroPagamento: document.getElementById('edit-primeiropagamento').value,
        formaPagamento: document.getElementById('edit-forma-pagamento').value,
        dataHora: editOriginalDataHora.value
      };

      try {
        const res = await fetch('/api/admin/assinaturas', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao salvar alterações.');
        }

        alert('Cadastro atualizado com sucesso!');
        
        // Atualiza objeto local e tabela imediatamente
        selectedSubscriber = {
          ...selectedSubscriber,
          ...updatedData
        };

        // Atualiza no array principal
        const idx = subscribers.findIndex(s => s.cpf === selectedSubscriber.cpf);
        if (idx !== -1) {
          subscribers[idx] = {
            ...subscribers[idx],
            ...updatedData
          };
        }

        exitEditMode();
        openDetailsModal(selectedSubscriber); // Recarrega visualização
        applyFilters();
        calculateKpis();
      } catch (err) {
        console.error(err);
        alert(`Falha na atualização: ${err.message}`);
      } finally {
        btnEditSave.disabled = false;
        btnEditSave.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ==========================================================================
  // 8. LÓGICA DE EXCLUSÃO (DELETE)
  // ==========================================================================
  
  if (btnModalDelete) {
    btnModalDelete.addEventListener('click', () => {
      if (!selectedSubscriber) return;
      deleteClientName.textContent = selectedSubscriber.nome;
      confirmDeleteModal.classList.add('active');
    });
  }

  if (btnDeleteCancel) {
    btnDeleteCancel.addEventListener('click', () => {
      confirmDeleteModal.classList.remove('active');
    });
  }

  if (confirmDeleteModal) {
    confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target === confirmDeleteModal) {
        confirmDeleteModal.classList.remove('active');
      }
    });
  }

  if (btnDeleteConfirm) {
    btnDeleteConfirm.addEventListener('click', async () => {
      if (!selectedSubscriber) return;

      btnDeleteConfirm.disabled = true;
      btnDeleteConfirm.textContent = 'Excluindo...';

      const token = localStorage.getItem('organicamente_admin_token');
      const cpfToDelete = selectedSubscriber.cpf;

      try {
        const res = await fetch('/api/admin/assinaturas', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cpf: cpfToDelete })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao excluir assinante.');
        }

        alert('Assinante excluído com sucesso!');
        
        // Remove do array principal
        subscribers = subscribers.filter(s => s.cpf !== cpfToDelete);

        // Fecha modais
        confirmDeleteModal.classList.remove('active');
        detailsModal.classList.remove('active');

        // Atualiza tabela
        applyFilters();
        calculateKpis();
      } catch (err) {
        console.error(err);
        alert(`Falha na exclusão: ${err.message}`);
      } finally {
        btnDeleteConfirm.disabled = false;
        btnDeleteConfirm.textContent = 'Sim, Excluir';
      }
    });
  }

  // ==========================================================================
  // HELPER FUNCTIONS (FORMATADORES)
  // ==========================================================================
  
  function formatMoneyPlain(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }

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

  // Checagem inicial
  checkSession();
});
