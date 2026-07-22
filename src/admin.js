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
  let isFirstLoad = true; // Indica se é o primeiro carregamento pós-login

  // Seletores DOM - Autenticação
  const loginContainer = document.getElementById('login-container');
  const adminDashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const loadingOverlay = document.getElementById('loading-overlay');
 
  // Seletores DOM - Roteiro de Entregas (Logística)
  const btnDeliveryReport = document.getElementById('btn-delivery-report');
  const deliveryModal = document.getElementById('delivery-modal');
  const btnCloseDeliveryModal = document.getElementById('btn-close-delivery-modal');
  const btnCloseDeliveryFooter = document.getElementById('btn-close-delivery-footer');
  const reportProdutor = document.getElementById('report-produtor');
  const reportDia = document.getElementById('report-dia');
  const btnGenerateReport = document.getElementById('btn-generate-report');
  const btnPrintReport = document.getElementById('btn-print-report');
  const reportTableBody = document.getElementById('report-table-body');
  const printSubtitle = document.getElementById('print-subtitle');

  // Seletores DOM - Tabela & Filtros
  const tableBody = document.getElementById('table-body');
  const searchInput = document.getElementById('admin-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTabsContainer = document.getElementById('filter-tabs-container');
  const tableRowsCount = document.getElementById('table-rows-count');
  const btnRefresh = document.getElementById('btn-refresh');

  // Lógica de Navegação Multi-telas (Sidebar Navigation)
  const navItems = document.querySelectorAll('.nav-item');
  const appViews = document.querySelectorAll('.app-view');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const viewTitles = {
    'view-dashboard': { title: 'Visão Geral', subtitle: 'Acompanhe os principais números e avisos do projeto' },
    'view-deliveries': { title: 'Entregas & Cestas', subtitle: 'Organize as cestas por produtor e dia de entrega' },
    'view-customers': { title: 'Clientes', subtitle: 'Gerencie a base de clientes, fichas e pagamentos' },
    'view-churn': { title: 'Cancelamentos', subtitle: 'Analise os motivos das saídas e o saldo de inscritos' },
    'view-settings': { title: 'Ajustes', subtitle: 'Configurações gerais e segurança do sistema' }
  };

  function switchView(viewId) {
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    appViews.forEach(view => {
      if (view.id === viewId) {
        view.classList.remove('hidden');
        view.classList.add('active-view');
      } else {
        view.classList.add('hidden');
        view.classList.remove('active-view');
      }
    });

    if (viewTitles[viewId]) {
      if (pageTitle) pageTitle.textContent = viewTitles[viewId].title;
      if (pageSubtitle) pageSubtitle.textContent = viewTitles[viewId].subtitle;
    }

    if (viewId === 'view-churn') {
      renderChurnView();
    } else if (viewId === 'view-deliveries') {
      renderDeliveriesView();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Seletores DOM - KPIs
  const kpiMrr = document.getElementById('kpi-mrr');
  const kpiActives = document.getElementById('kpi-actives');
  const kpiPending = document.getElementById('kpi-pending');
  const distBrunoQty = document.getElementById('dist-bruno-qty');
  const distRussoQty = document.getElementById('dist-russo-qty');
  const distBrunoBar = document.getElementById('dist-bruno-bar');
  const distRussoBar = document.getElementById('dist-russo-bar');
  const kpiEntries30d = document.getElementById('kpi-entries-30d');
  const kpiChurn30d = document.getElementById('kpi-churn-30d');
  const kpiNetGrowth = document.getElementById('kpi-net-growth');
  const kpiChurnRate = document.getElementById('kpi-churn-rate');

  // Seletores DOM - Retenção & Churn
  const btnRetentionAnalytics = document.getElementById('btn-retention-analytics');
  const retentionModal = document.getElementById('retention-analytics-modal');
  const btnCloseRetentionModal = document.getElementById('btn-close-retention-modal');
  const btnCloseRetentionFooter = document.getElementById('btn-close-retention-footer');

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
  const mValorPago = document.getElementById('m-valor-pago');
  const mDataPagamento = document.getElementById('m-data-pagamento');
  const mObservacoes = document.getElementById('m-observacoes');
  const mTimelineContainer = document.getElementById('m-timeline-container');
  const btnModalCopyAddress = document.getElementById('btn-modal-copy-address');
  const modalLinkMaps = document.getElementById('modal-link-maps');
  const modalBtnWhatsapp = document.getElementById('modal-btn-whatsapp');

  // Seletores DOM - Edição
  const editSubscriberForm = document.getElementById('edit-subscriber-form');
  const editOriginalCpf = document.getElementById('edit-original-cpf');
  const editOriginalDataHora = document.getElementById('edit-original-datahora');
  const editStatusAssinatura = document.getElementById('edit-statusAssinatura');
  const editMotivoContainer = document.getElementById('edit-motivo-container');
  const editMotivoCancelamento = document.getElementById('edit-motivoCancelamento');
  const editMotivoDetalhe = document.getElementById('edit-motivoDetalhe');
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
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
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
    if (!token) {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      return;
    }

    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
    }

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
      
      if (loadingOverlay) {
        setTimeout(() => {
          loadingOverlay.classList.add('hidden');
          isFirstLoad = false;
        }, 600);
      }
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

      // Status Interno da Assinatura (Badge Principal)
      const statusInterno = sub.statusAssinatura || 'Pendente';
      let statusClass = 'pendente';
      let statusLabel = statusInterno;

      if (statusInterno === 'Ativo') {
        statusClass = 'ativa'; // verde
      } else if (statusInterno === 'Pendente') {
        statusClass = 'pendente'; // amarelo
      } else if (statusInterno === 'Inativo') {
        statusClass = 'desconhecido'; // cinza
      } else if (statusInterno === 'Cancelado') {
        statusClass = 'atrasada'; // vermelho
      }

      // Status Financeiro do Asaas (Linha Secundária)
      const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
      let asaasLabel = 'Financeiro: Sem Registro';
      let asaasStyleColor = 'var(--color-text-secondary)';
      if (asaasStatus === 'RECEIVED' || asaasStatus === 'CONFIRMED') {
        asaasLabel = 'Financeiro: Pago';
        asaasStyleColor = 'var(--color-success)';
      } else if (asaasStatus === 'PENDING') {
        asaasLabel = 'Financeiro: Pendente';
        asaasStyleColor = 'var(--color-warning)';
      } else if (asaasStatus === 'OVERDUE') {
        asaasLabel = 'Financeiro: Atrasado';
        asaasStyleColor = 'var(--color-danger)';
      } else if (asaasStatus === 'SEM_CLIENTE') {
        asaasLabel = 'Sem Cadastro Asaas';
        asaasStyleColor = 'var(--color-text-secondary)';
      } else if (asaasStatus === 'SEM_COBRANCA') {
        asaasLabel = 'Sem Cobrança Ativa';
        asaasStyleColor = 'var(--color-text-secondary)';
      }

      const row = document.createElement('tr');
      row.className = 'clickable-row';
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
          <div class="cell-basket-sub" style="margin-top: 4px; font-size: 11px; color: ${asaasStyleColor}; font-weight: 600;">${asaasLabel}</div>
        </td>
      `;

      row.addEventListener('click', () => {
        openDetailsModal(sub);
      });

      tableBody.appendChild(row);
    });

    tableRowsCount.textContent = `Mostrando ${filteredSubscribers.length} de ${subscribers.length} clientes`;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // ==========================================================================
  // RENDERIZAÇÃO DAS NOVAS TELAS (ENTREGAS & CANCELAMENTOS)
  // ==========================================================================
  
  let deliveryFilter = 'all';

  const deliveryFilterTabs = document.getElementById('delivery-filter-tabs');
  if (deliveryFilterTabs) {
    deliveryFilterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      deliveryFilterTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      deliveryFilter = btn.getAttribute('data-filter');
      renderDeliveriesView();
    });
  }

  function renderDeliveriesView() {
    const tbody = document.getElementById('deliveries-table-body');
    if (!tbody) return;

    let list = subscribers.filter(s => s.statusAssinatura === 'Ativo');

    if (deliveryFilter === 'bruno') {
      list = list.filter(s => (s.produtor || '').toLowerCase().includes('bruno'));
    } else if (deliveryFilter === 'russo') {
      list = list.filter(s => (s.produtor || '').toLowerCase().includes('russo') || (s.produtor || '').toLowerCase().includes('antônio') || (s.produtor || '').toLowerCase().includes('antonio'));
    } else if (deliveryFilter === 'terca') {
      list = list.filter(s => (s.diaEntrega || '').toLowerCase().includes('terça') || (s.diaEntrega || '').toLowerCase().includes('terca'));
    } else if (deliveryFilter === 'quarta') {
      list = list.filter(s => (s.diaEntrega || '').toLowerCase().includes('quarta'));
    }

    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">Nenhuma entrega ativa encontrada para este filtro.</td></tr>';
      return;
    }

    list.forEach(sub => {
      const tr = document.createElement('tr');
      tr.className = 'clickable-row';
      tr.innerHTML = `
        <td><strong>${sub.nome}</strong><br><span style="font-size: 11px; color: var(--color-text-secondary);">${formatPhone(sub.telefone)}</span></td>
        <td>${sub.endereco} - ${sub.bairro}<br><span style="font-size: 11px; color: var(--color-text-secondary);">CEP: ${formatCEP(sub.cep)}</span></td>
        <td><strong>${sub.cestaTipo}</strong><br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.ovosTipo}</span></td>
        <td><span class="font-highlight">${sub.produtor}</span><br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.diaEntrega}</span></td>
        <td><span style="font-size: 12px;">${sub.horario || 'Comercial'}</span><br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.pontoReferencia || 'Sem ref.'}</span></td>
      `;
      tr.addEventListener('click', () => {
        openDetailsModal(sub);
      });
      tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function renderChurnView() {
    const reasonsContainer = document.getElementById('churn-view-reasons-container');
    const historyTbody = document.getElementById('churn-view-table-body');

    const reasonsCount = {};
    const inactiveList = [];

    subscribers.forEach(sub => {
      const isInactive = sub.statusAssinatura === 'Inativo' || sub.statusAssinatura === 'Cancelado';
      if (isInactive) {
        inactiveList.push(sub);
        const reason = sub.motivoCancelamento || 'Outros / Não especificado';
        reasonsCount[reason] = (reasonsCount[reason] || 0) + 1;
      }
    });

    if (reasonsContainer) {
      reasonsContainer.innerHTML = '';
      const total = Object.values(reasonsCount).reduce((a, b) => a + b, 0);

      if (total === 0) {
        reasonsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center;">Nenhum cancelamento ou inativação registrada com motivo.</p>';
      } else {
        Object.entries(reasonsCount)
          .sort((a, b) => b[1] - a[1])
          .forEach(([reason, count]) => {
            const pct = Math.round((count / total) * 100);
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.innerHTML = `
              <div class="bar-label" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                <span><strong>${reason}</strong></span>
                <span style="color: var(--color-danger); font-weight: 600;">${count} (${pct}%)</span>
              </div>
              <div class="bar-track" style="height: 10px; background: #fee2e2; border-radius: 6px; overflow: hidden;">
                <div class="bar-fill color-danger" style="width: ${pct}%; height: 100%; background: var(--color-danger); border-radius: 6px; transition: width 0.4s ease;"></div>
              </div>
            `;
            reasonsContainer.appendChild(barItem);
          });
      }
    }

    if (historyTbody) {
      historyTbody.innerHTML = '';

      if (inactiveList.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Nenhum cliente inativo ou cancelado no registro.</td></tr>';
      } else {
        inactiveList.forEach(sub => {
          const row = document.createElement('tr');
          const dateStr = sub.dataStatusAlterado ? new Date(sub.dataStatusAlterado).toLocaleDateString('pt-BR') : (sub.dataHora ? new Date(sub.dataHora).toLocaleDateString('pt-BR') : '-');
          const reasonStr = sub.motivoCancelamento ? `${sub.motivoCancelamento}${sub.motivoDetalhe ? ' (' + sub.motivoDetalhe + ')' : ''}` : 'Não informado';

          row.innerHTML = `
            <td><strong>${sub.nome}</strong><br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.email}</span></td>
            <td>${sub.produtor}<br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.cestaTipo}</span></td>
            <td>${dateStr}</td>
            <td><span class="badge atrasada" style="font-size: 10px;">${sub.statusAssinatura}</span><br><span style="font-size: 11px; color: var(--color-text-secondary);">${reasonStr}</span></td>
          `;
          historyTbody.appendChild(row);
        });
      }
    }
  }

  function applyFilters() {
    filteredSubscribers = subscribers.filter(sub => {
      const searchMatch = !searchQuery || 
        (sub.nome || '').toLowerCase().includes(searchQuery) ||
        (sub.email || '').toLowerCase().includes(searchQuery) ||
        String(sub.cpf || '').replace(/\D/g, '').includes(searchQuery);

      if (!searchMatch) return false;

      if (currentFilter === 'all') return true;
      
      const produtorLower = (sub.produtor || '').toLowerCase();
      if (currentFilter === 'bruno') return produtorLower.includes('bruno');
      if (currentFilter === 'russo') return produtorLower.includes('russo') || produtorLower.includes('antônio') || produtorLower.includes('antonio');
      
      const diaLower = (sub.diaEntrega || '').toLowerCase();
      if (currentFilter === 'terca') return diaLower.includes('terça') || diaLower.includes('terca');
      if (currentFilter === 'quarta') return diaLower.includes('quarta');

      if (currentFilter === 'ativo') return sub.statusAssinatura === 'Ativo';
      const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let entries30d = 0;
    let churn30d = 0;

    subscribers.forEach(sub => {
      // Assinante ativo apenas se o status interno da assinatura for 'Ativo'
      const isActive = (sub.statusAssinatura === 'Ativo');
      
      if (isActive) {
        activeCount++;
        
        const valorMensalLimpo = parseFloat(String(sub.totalMensal || '')
          .replace(/[^\d,]/g, '')
          .replace(',', '.'));
          
        if (!isNaN(valorMensalLimpo)) {
          mrrTotal += valorMensalLimpo;
        }
      }

      // Assinante pendente se o status interno da assinatura for 'Pendente'
      if (sub.statusAssinatura === 'Pendente') {
        pendingCount++;
      }

      const produtorLower = (sub.produtor || '').toLowerCase();
      if (produtorLower.includes('bruno')) {
        brunoCount++;
      } else if (produtorLower.includes('russo') || produtorLower.includes('antônio') || produtorLower.includes('antonio')) {
        russoCount++;
      }

      // Entradas nos últimos 30 dias
      if (sub.dataHora) {
        const regDate = new Date(sub.dataHora);
        if (!isNaN(regDate.getTime()) && regDate >= thirtyDaysAgo) {
          entries30d++;
        }
      }

      // Saídas / Churn nos últimos 30 dias
      const isInactive = sub.statusAssinatura === 'Inativo' || sub.statusAssinatura === 'Cancelado';
      if (isInactive) {
        const changeDateStr = sub.dataStatusAlterado || sub.dataHora;
        if (changeDateStr) {
          const changeDate = new Date(changeDateStr);
          if (!isNaN(changeDate.getTime()) && changeDate >= thirtyDaysAgo) {
            churn30d++;
          }
        }
      }
    });

    kpiMrr.textContent = formatMoney(mrrTotal);
    kpiActives.textContent = activeCount;
    kpiPending.textContent = pendingCount;

    // Métricas de Churn & Retenção
    const netGrowth = entries30d - churn30d;
    const baseTotal = activeCount + churn30d;
    const churnRate = baseTotal > 0 ? ((churn30d / baseTotal) * 100).toFixed(1) : '0.0';

    if (kpiEntries30d) kpiEntries30d.textContent = entries30d;
    if (kpiChurn30d) kpiChurn30d.textContent = churn30d;
    if (kpiNetGrowth) {
      kpiNetGrowth.textContent = (netGrowth >= 0 ? `+${netGrowth}` : `${netGrowth}`);
      kpiNetGrowth.style.color = netGrowth >= 0 ? 'var(--color-primary-light)' : 'var(--color-danger)';
    }
    if (kpiChurnRate) kpiChurnRate.textContent = `Taxa de Churn: ${churnRate}%`;

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

    generateDynamicNotifications();
  }

  // ==========================================================================
  // NOTIFICAÇÕES AUTOMÁTICAS E DINÂMICAS DO DASHBOARD
  // ==========================================================================
  
  let dismissedAlerts = new Set();

  const btnClearAlerts = document.getElementById('btn-clear-alerts');
  if (btnClearAlerts) {
    btnClearAlerts.addEventListener('click', () => {
      dismissedAlerts.clear();
      dismissedAlerts.add('ALL_CLEARED');
      const container = document.getElementById('alerts-feed-container');
      if (container) {
        container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 12px;">Todas as notificações foram limpas.</p>';
      }
    });
  }

  function generateDynamicNotifications() {
    const container = document.getElementById('alerts-feed-container');
    if (!container) return;

    if (dismissedAlerts.has('ALL_CLEARED')) {
      container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 12px;">Todas as notificações foram limpas.</p>';
      return;
    }

    container.innerHTML = '';

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let overdueCount = 0;
    let staleActiveCount = 0;
    let newThisWeekCount = 0;
    let activeDeliveriesCount = 0;

    subscribers.forEach(sub => {
      // Overdue
      if (sub.asaas && sub.asaas.status === 'OVERDUE') {
        overdueCount++;
      }

      // Stale active (>45 days since last payment)
      if (sub.statusAssinatura === 'Ativo' && sub.asaas) {
        const rawDate = sub.asaas.paymentDate || sub.asaas.confirmedDate || sub.asaas.dueDate;
        if (rawDate) {
          const pDate = new Date(rawDate.includes('T') ? rawDate : rawDate + 'T12:00:00');
          const daysDiff = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
          if (daysDiff > 45) {
            staleActiveCount++;
          }
        }
      }

      // New this week
      if (sub.dataHora) {
        const regDate = new Date(sub.dataHora);
        if (!isNaN(regDate.getTime()) && regDate >= sevenDaysAgo) {
          newThisWeekCount++;
        }
      }

      // Active deliveries
      if (sub.statusAssinatura === 'Ativo') {
        activeDeliveriesCount++;
      }
    });

    const alerts = [];

    if (overdueCount > 0 && !dismissedAlerts.has('overdue')) {
      alerts.push({
        id: 'overdue',
        type: 'danger',
        icon: 'alert-circle',
        title: 'Cobranças Atrasadas no Asaas',
        text: `Existe(m) ${overdueCount} cliente(s) com cobrança vencida/atrasada no Asaas.`
      });
    }

    if (staleActiveCount > 0 && !dismissedAlerts.has('stale')) {
      alerts.push({
        id: 'stale',
        type: 'warning',
        icon: 'clock',
        title: 'Assinaturas Ativas sem Renovação Recente',
        text: `${staleActiveCount} cliente(s) ativo(s) possuem último pagamento há mais de 45 dias. Verifique a renovação.`
      });
    }

    if (newThisWeekCount > 0 && !dismissedAlerts.has('new')) {
      alerts.push({
        id: 'new',
        type: 'info',
        icon: 'user-plus',
        title: 'Novas Inscrições na Semana',
        text: `${newThisWeekCount} novo(s) cliente(s) se cadastraram nos últimos 7 dias!`
      });
    }

    if (activeDeliveriesCount > 0 && !dismissedAlerts.has('deliveries')) {
      alerts.push({
        id: 'deliveries',
        type: 'info',
        icon: 'truck',
        title: 'Entregas da Semana Organizadas',
        text: `Total de ${activeDeliveriesCount} cestas ativas preparadas para entrega.`
      });
    }

    if (alerts.length === 0) {
      container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 12px;">Nenhuma notificação pendente no momento.</p>';
      return;
    }

    alerts.forEach(item => {
      const div = document.createElement('div');
      div.className = `alert-box-item ${item.type}`;
      div.innerHTML = `
        <i data-lucide="${item.icon}"></i>
        <div>
          <strong>${item.title}</strong>
          <p>${item.text}</p>
        </div>
        <button class="btn-dismiss-alert" data-id="${item.id}" title="Dispensar notificação">&times;</button>
      `;

      div.querySelector('.btn-dismiss-alert').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissedAlerts.add(item.id);
        div.remove();
        if (container.children.length === 0) {
          container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 12px;">Nenhuma notificação pendente no momento.</p>';
        }
      });

      container.appendChild(div);
    });

    if (window.lucide) window.lucide.createIcons();
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

    // Badge do Status Geral (Interno)
    const statusInterno = sub.statusAssinatura || 'Pendente';
    let statusClass = 'pendente';
    let statusLabel = statusInterno;

    if (statusInterno === 'Ativo') {
      statusClass = 'ativa';
    } else if (statusInterno === 'Pendente') {
      statusClass = 'pendente';
    } else if (statusInterno === 'Inativo') {
      statusClass = 'desconhecido';
    } else if (statusInterno === 'Cancelado') {
      statusClass = 'atrasada';
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

    // LTV e Contagem de Mensalidades
    const mLtvTotal = document.getElementById('m-ltv-total');
    const mLtvCount = document.getElementById('m-ltv-count');
    const mPaymentsTableBody = document.getElementById('m-payments-table-body');

    if (mLtvTotal) mLtvTotal.textContent = formatMoney(sub.asaas ? (sub.asaas.totalPaid || 0) : 0);
    if (mLtvCount) mLtvCount.textContent = `${sub.asaas ? (sub.asaas.paidCount || 0) : 0} faturas pagas`;

    // Status Asaas Atual
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

    // Tabela de Histórico de Pagamentos Asaas
    if (mPaymentsTableBody) {
      mPaymentsTableBody.innerHTML = '';
      const allPayments = (sub.asaas && sub.asaas.allPayments) ? sub.asaas.allPayments : [];
      if (allPayments.length === 0) {
        mPaymentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Nenhum pagamento registrado no Asaas.</td></tr>';
      } else {
        allPayments.forEach(p => {
          const row = document.createElement('tr');
          const dueStr = p.dueDate ? new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
          const pDate = p.paymentDate || p.confirmedDate;
          const payStr = pDate ? new Date(pDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
          
          let badgeClass = 'pendente';
          let statusText = p.status || 'DESCONHECIDO';
          if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') {
            badgeClass = 'paga';
            statusText = 'PAGO';
          } else if (p.status === 'PENDING') {
            badgeClass = 'pendente';
            statusText = 'PENDENTE';
          } else if (p.status === 'OVERDUE') {
            badgeClass = 'atrasada';
            statusText = 'ATRASADO';
          }

          const linkHtml = p.invoiceUrl 
            ? `<a href="${p.invoiceUrl}" target="_blank" style="color: var(--color-primary-light); font-weight: 600;">Ver <i data-lucide="arrow-up-right"></i></a>` 
            : '-';

          row.innerHTML = `
            <td>${dueStr}</td>
            <td>${payStr}</td>
            <td><strong>${formatMoney(p.value || 0)}</strong></td>
            <td>${p.billingType || 'PIX'}</td>
            <td><span class="badge ${badgeClass}" style="font-size: 10px;">${statusText}</span></td>
            <td>${linkHtml}</td>
          `;
          mPaymentsTableBody.appendChild(row);
        });
      }
    }

    // Observações
    mObservacoes.textContent = sub.observacoes || 'Nenhuma observação informada.';

    // Renderização da Linha do Tempo (Timeline)
    if (mTimelineContainer) {
      let timelineHtml = `
        <div class="timeline-item">
          <div class="timeline-marker color-primary"></div>
          <div class="timeline-content">
            <span class="timeline-title">Inscrição Realizada</span>
            <span class="timeline-date">${sub.dataHora ? new Date(sub.dataHora).toLocaleString('pt-BR') : 'Data não informada'}</span>
          </div>
        </div>
      `;

      const allPayments = (sub.asaas && sub.asaas.allPayments) ? sub.asaas.allPayments : [];
      if (allPayments.length > 0) {
        // Ordenar pagamentos por data (mais antigo primeiro para timeline cronológica)
        const sortedPayments = [...allPayments].reverse();
        sortedPayments.forEach(p => {
          if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') {
            const pDate = p.paymentDate || p.confirmedDate || p.dueDate;
            const formattedPDate = pDate ? new Date(pDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Confirmado';
            timelineHtml += `
              <div class="timeline-item">
                <div class="timeline-marker color-success"></div>
                <div class="timeline-content">
                  <span class="timeline-title">Pagamento Confirmado no Asaas</span>
                  <span class="timeline-date">Valor: ${formatMoney(p.value || 0)} | Forma: ${p.billingType || 'PIX'} | Data: ${formattedPDate}</span>
                </div>
              </div>
            `;
          } else if (p.status === 'PENDING') {
            timelineHtml += `
              <div class="timeline-item">
                <div class="timeline-marker color-warning"></div>
                <div class="timeline-content">
                  <span class="timeline-title">Cobrança Gerada (Pendente)</span>
                  <span class="timeline-date">Valor: ${formatMoney(p.value || 0)} | Vencimento: ${p.dueDate ? new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                </div>
              </div>
            `;
          } else if (p.status === 'OVERDUE') {
            timelineHtml += `
              <div class="timeline-item">
                <div class="timeline-marker color-danger"></div>
                <div class="timeline-content">
                  <span class="timeline-title">Cobrança Atrasada</span>
                  <span class="timeline-date">Valor: ${formatMoney(p.value || 0)} | Vencida em ${p.dueDate ? new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                </div>
              </div>
            `;
          }
        });
      } else if (sub.asaas) {
        if (sub.asaas.status === 'RECEIVED' || sub.asaas.status === 'CONFIRMED') {
          const pDate = sub.asaas.paymentDate || sub.asaas.confirmedDate || sub.asaas.dueDate;
          const formattedPDate = pDate ? new Date(pDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Confirmado';
          timelineHtml += `
            <div class="timeline-item">
              <div class="timeline-marker color-success"></div>
              <div class="timeline-content">
                <span class="timeline-title">Pagamento Confirmado no Asaas</span>
                <span class="timeline-date">Valor: ${formatMoney(sub.asaas.value || 0)} em ${formattedPDate}</span>
              </div>
            </div>
          `;
        }
      }

      if (sub.statusAssinatura === 'Inativo' || sub.statusAssinatura === 'Cancelado') {
        const statusDate = sub.dataStatusAlterado ? new Date(sub.dataStatusAlterado).toLocaleDateString('pt-BR') : 'Data não informada';
        timelineHtml += `
          <div class="timeline-item">
            <div class="timeline-marker color-danger"></div>
            <div class="timeline-content">
              <span class="timeline-title">Status Alterado para ${sub.statusAssinatura}</span>
              <span class="timeline-date">Data: ${statusDate}</span>
              <div class="timeline-desc"><strong>Motivo:</strong> ${sub.motivoCancelamento || 'Não informado'}${sub.motivoDetalhe ? ' (' + sub.motivoDetalhe + ')' : ''}</div>
            </div>
          </div>
        `;
      } else if (sub.statusAssinatura === 'Ativo') {
        timelineHtml += `
          <div class="timeline-item">
            <div class="timeline-marker color-success"></div>
            <div class="timeline-content">
              <span class="timeline-title">Assinatura Ativa & Operacional</span>
              <span class="timeline-date">Cliente ativo no plano de cestas</span>
            </div>
          </div>
        `;
      }

      mTimelineContainer.innerHTML = timelineHtml;
    }

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
    const phoneClean = String(sub.telefone || '').replace(/\D/g, '');
    const primeirNome = (sub.nome || '').split(' ')[0];
    const asaasStatus = sub.asaas ? sub.asaas.status : 'DESCONHECIDO';
    
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
        statusAssinatura: document.getElementById('new-statusAssinatura').value,
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
    const currentStatus = selectedSubscriber.statusAssinatura || 'Pendente';
    document.getElementById('edit-statusAssinatura').value = currentStatus;
    
    if (currentStatus === 'Inativo' || currentStatus === 'Cancelado') {
      if (editMotivoContainer) editMotivoContainer.classList.remove('hidden');
      if (editMotivoCancelamento) editMotivoCancelamento.value = selectedSubscriber.motivoCancelamento || '';
      if (editMotivoDetalhe) editMotivoDetalhe.value = selectedSubscriber.motivoDetalhe || '';
    } else {
      if (editMotivoContainer) editMotivoContainer.classList.add('hidden');
      if (editMotivoCancelamento) editMotivoCancelamento.value = '';
      if (editMotivoDetalhe) editMotivoDetalhe.value = '';
    }
    
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

  if (editStatusAssinatura) {
    editStatusAssinatura.addEventListener('change', () => {
      const val = editStatusAssinatura.value;
      if (val === 'Inativo' || val === 'Cancelado') {
        if (editMotivoContainer) editMotivoContainer.classList.remove('hidden');
      } else {
        if (editMotivoContainer) editMotivoContainer.classList.add('hidden');
      }
    });
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

      const statusAssinaturaVal = document.getElementById('edit-statusAssinatura').value;
      const isInactiveOrCancelled = statusAssinaturaVal === 'Inativo' || statusAssinaturaVal === 'Cancelado';

      if (isInactiveOrCancelled && editMotivoCancelamento && !editMotivoCancelamento.value) {
        alert('Por favor, selecione um motivo para o cancelamento/inativação.');
        editMotivoCancelamento.focus();
        return;
      }

      btnEditSave.disabled = true;
      const originalText = btnEditSave.innerHTML;
      btnEditSave.innerHTML = '<span>Salvando...</span>';

      const token = localStorage.getItem('organicamente_admin_token');

      let motivoCancelamentoVal = '';
      let motivoDetalheVal = '';
      let dataStatusAlteradoVal = selectedSubscriber.dataStatusAlterado || '';

      if (isInactiveOrCancelled) {
        motivoCancelamentoVal = editMotivoCancelamento ? editMotivoCancelamento.value : 'Não informado';
        motivoDetalheVal = editMotivoDetalhe ? editMotivoDetalhe.value.trim() : '';
        if (!dataStatusAlteradoVal || selectedSubscriber.statusAssinatura !== statusAssinaturaVal) {
          dataStatusAlteradoVal = new Date().toISOString();
        }
      } else {
        dataStatusAlteradoVal = '';
      }

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
        statusAssinatura: statusAssinaturaVal,
        motivoCancelamento: motivoCancelamentoVal,
        motivoDetalhe: motivoDetalheVal,
        dataStatusAlterado: dataStatusAlteradoVal,
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
  // 9. MODAL: ROTEIRO DE ENTREGAS (LOGÍSTICA)
  // ==========================================================================

  if (btnDeliveryReport) {
    btnDeliveryReport.addEventListener('click', () => {
      // Limpa tabela de resultados ao abrir
      reportTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">
            Selecione as opções acima e clique em "Gerar Roteiro".
          </td>
        </tr>
      `;
      deliveryModal.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
    });
  }

  function closeDeliveryModal() {
    deliveryModal.classList.remove('active');
  }

  if (btnCloseDeliveryModal) btnCloseDeliveryModal.addEventListener('click', closeDeliveryModal);
  if (btnCloseDeliveryFooter) btnCloseDeliveryFooter.addEventListener('click', closeDeliveryModal);
  if (deliveryModal) {
    deliveryModal.addEventListener('click', (e) => {
      if (e.target === deliveryModal) {
        closeDeliveryModal();
      }
    });
  }

  // Gera o Roteiro
  if (btnGenerateReport) {
    btnGenerateReport.addEventListener('click', () => {
      const produtorSel = reportProdutor.value;
      const diaSel = reportDia.value;

      // Filtra assinantes que:
      // 1. Estão ativos (pagamento recebido ou confirmado no Asaas)
      // 2. Pertencem ao produtor selecionado
      // 3. Pertencem ao dia de entrega selecionado
      const activeDeliveries = subscribers.filter(sub => {
        const isActive = (sub.statusAssinatura === 'Ativo');
        
        // Limpeza e match flexível de produtor
        const subProdutor = String(sub.produtor || '').toLowerCase();
        const matchesProdutor = subProdutor.includes(produtorSel.split(' ')[0].toLowerCase());
        
        // Match exato de dia de entrega
        const subDia = String(sub.diaEntrega || '').toLowerCase().trim();
        const matchesDia = subDia === diaSel.toLowerCase().trim();

        return isActive && matchesProdutor && matchesDia;
      });

      // Atualiza o subtítulo da impressão
      printSubtitle.textContent = `Produtor: ${produtorSel} | Dia de Entrega: ${diaSel} (${activeDeliveries.length} entregas ativas)`;

      if (activeDeliveries.length === 0) {
        reportTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">
              Nenhuma entrega ativa encontrada para este produtor neste dia.
            </td>
          </tr>
        `;
        return;
      }

      reportTableBody.innerHTML = '';

      activeDeliveries.forEach(sub => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <strong>${sub.nome}</strong><br>
            <span style="font-size: 11px; color: var(--color-text-secondary);">${formatPhone(sub.telefone)}</span>
          </td>
          <td>
            ${sub.endereco} - ${sub.bairro}<br>
            <span style="font-size: 11px; color: var(--color-text-secondary);">CEP: ${formatCEP(sub.cep)} | Região: ${sub.regiao}</span>
          </td>
          <td>
            <strong>${sub.cestaTipo}</strong><br>
            <span style="font-size: 11px; color: var(--color-text-secondary);">${sub.ovosTipo}</span>
          </td>
          <td>
            <span style="font-size: 12px; color: var(--color-text-secondary); font-style: italic;">
              ${sub.pontoReferencia && sub.pontoReferencia !== 'Não informado' ? `Ref: ${sub.pontoReferencia}. ` : ''}
              ${sub.vizinho && sub.vizinho !== 'Deixar no local' ? `Se ausente: ${sub.vizinho}. ` : ''}
              ${sub.observacoes && sub.observacoes !== 'Nenhuma' ? `Obs: ${sub.observacoes}` : ''}
            </span>
          </td>
        `;
        reportTableBody.appendChild(row);
      });
    });
  }

  // Ação de Impressão
  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
      window.print();
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
    const clean = String(phone).replace(/\D/g, '');
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
    const clean = String(cpf).replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  }

  function formatCEP(cep) {
    if (!cep) return '-';
    const clean = String(cep).replace(/\D/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    }
    return cep;
  }

  // ==========================================================================
  // 10. MODAL DE INTELIGÊNCIA DE RETENÇÃO & CHURN ANALYTICS
  // ==========================================================================

  if (btnRetentionAnalytics) {
    btnRetentionAnalytics.addEventListener('click', () => {
      openRetentionModal();
    });
  }

  if (btnCloseRetentionModal) {
    btnCloseRetentionModal.addEventListener('click', () => {
      retentionModal.classList.remove('active');
    });
  }

  if (btnCloseRetentionFooter) {
    btnCloseRetentionFooter.addEventListener('click', () => {
      retentionModal.classList.remove('active');
    });
  }

  function openRetentionModal() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let entries30d = 0;
    let churn30d = 0;
    let activeCount = 0;
    const reasonsCount = {};
    const inactiveList = [];

    subscribers.forEach(sub => {
      if (sub.statusAssinatura === 'Ativo') activeCount++;

      if (sub.dataHora) {
        const regDate = new Date(sub.dataHora);
        if (!isNaN(regDate.getTime()) && regDate >= thirtyDaysAgo) entries30d++;
      }

      const isInactive = sub.statusAssinatura === 'Inativo' || sub.statusAssinatura === 'Cancelado';
      if (isInactive) {
        inactiveList.push(sub);

        const changeDateStr = sub.dataStatusAlterado || sub.dataHora;
        if (changeDateStr) {
          const changeDate = new Date(changeDateStr);
          if (!isNaN(changeDate.getTime()) && changeDate >= thirtyDaysAgo) churn30d++;
        }

        const reason = sub.motivoCancelamento || 'Outros / Não especificado';
        reasonsCount[reason] = (reasonsCount[reason] || 0) + 1;
      }
    });

    const netGrowth = entries30d - churn30d;
    const baseTotal = activeCount + churn30d;
    const churnRate = baseTotal > 0 ? ((churn30d / baseTotal) * 100).toFixed(1) : '0.0';

    const modalEntries = document.getElementById('modal-kpi-entries');
    const modalChurn = document.getElementById('modal-kpi-churn');
    const modalNet = document.getElementById('modal-kpi-net');
    const modalRate = document.getElementById('modal-kpi-rate');

    if (modalEntries) modalEntries.textContent = entries30d;
    if (modalChurn) modalChurn.textContent = churn30d;
    if (modalNet) {
      modalNet.textContent = (netGrowth >= 0 ? `+${netGrowth}` : `${netGrowth}`);
      modalNet.style.color = netGrowth >= 0 ? 'var(--color-primary-light)' : 'var(--color-danger)';
    }
    if (modalRate) modalRate.textContent = `${churnRate}%`;

    // Renderização das Barras de Motivo
    const barsContainer = document.getElementById('churn-reasons-bars-container');
    if (barsContainer) {
      barsContainer.innerHTML = '';
      const totalReasons = Object.values(reasonsCount).reduce((a, b) => a + b, 0);

      if (totalReasons === 0) {
        barsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center;">Nenhum cancelamento ou inativação registrada com motivo até o momento.</p>';
      } else {
        Object.entries(reasonsCount)
          .sort((a, b) => b[1] - a[1])
          .forEach(([reason, count]) => {
            const pct = Math.round((count / totalReasons) * 100);
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.innerHTML = `
              <div class="bar-label" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                <span><strong>${reason}</strong></span>
                <span style="color: var(--color-danger); font-weight: 600;">${count} (${pct}%)</span>
              </div>
              <div class="bar-track" style="height: 10px; background: #fee2e2; border-radius: 6px; overflow: hidden;">
                <div class="bar-fill color-danger" style="width: ${pct}%; height: 100%; background: var(--color-danger); border-radius: 6px; transition: width 0.4s ease;"></div>
              </div>
            `;
            barsContainer.appendChild(barItem);
          });
      }
    }

    // Renderização da Tabela de Inativos
    const historyTbody = document.getElementById('churn-history-table-body');
    if (historyTbody) {
      historyTbody.innerHTML = '';

      if (inactiveList.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Nenhum cliente inativo ou cancelado no registro.</td></tr>';
      } else {
        inactiveList.forEach(sub => {
          const row = document.createElement('tr');
          const dateStr = sub.dataStatusAlterado ? new Date(sub.dataStatusAlterado).toLocaleDateString('pt-BR') : (sub.dataHora ? new Date(sub.dataHora).toLocaleDateString('pt-BR') : '-');
          const reasonStr = sub.motivoCancelamento ? `${sub.motivoCancelamento}${sub.motivoDetalhe ? ' (' + sub.motivoDetalhe + ')' : ''}` : 'Não informado';

          row.innerHTML = `
            <td><strong>${sub.nome}</strong><br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.email}</span></td>
            <td>${sub.produtor}<br><span style="font-size: 11px; color: var(--color-text-secondary);">${sub.cestaTipo}</span></td>
            <td>${dateStr}</td>
            <td><span class="badge atrasada" style="font-size: 10px;">${sub.statusAssinatura}</span><br><span style="font-size: 11px; color: var(--color-text-secondary);">${reasonStr}</span></td>
          `;
          historyTbody.appendChild(row);
        });
      }
    }

    if (retentionModal) retentionModal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  }

  // Checagem inicial
  checkSession();
});
