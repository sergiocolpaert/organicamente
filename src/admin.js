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
  const tableRowsCount = document.getElementById('table-rows-count');
  const searchInput = document.getElementById('admin-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTabsContainer = document.getElementById('filter-tabs-container');
  const btnRefresh = document.getElementById('btn-refresh');

  // ==========================================================================
  // SISTEMA DE TOAST NOTIFICATIONS NATIVAS
  // ==========================================================================
  function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconName = 'alert-circle';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4500);
  }
  const navItems = document.querySelectorAll('.nav-item');
  const appViews = document.querySelectorAll('.app-view');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const viewTitles = {
    'view-dashboard': { title: 'Visão Geral', subtitle: 'Acompanhe os principais números e avisos do projeto' },
    'view-deliveries': { title: 'Entregas & Cestas', subtitle: 'Organize as cestas por produtor e dia de entrega' },
    'view-customers': { title: 'Clientes', subtitle: 'Gerencie a base de clientes, fichas e pagamentos' },
    'view-reports': { title: 'Relatórios Executivos', subtitle: 'Análise completa de desempenho, retenção e balanço da comunidade' },
    'view-churn': { title: 'Relatórios Executivos', subtitle: 'Análise completa de desempenho, retenção e balanço da comunidade' },
    'view-settings': { title: 'Ajustes', subtitle: 'Configurações gerais e segurança do sistema' },
    'view-system-logs': { title: 'Logs do Sistema & Auditoria', subtitle: 'Histórico de eventos, requisições de API e erros em tempo real' }
  };

  function switchView(viewId) {
    if (navItems) {
      navItems.forEach(item => {
        if (!item) return;
        if (item.getAttribute('data-view') === viewId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    if (appViews) {
      appViews.forEach(view => {
        if (!view) return;
        if (view.id === viewId) {
          view.classList.remove('hidden');
          view.classList.add('active-view');
        } else {
          view.classList.add('hidden');
          view.classList.remove('active-view');
        }
      });
    }

    if (viewTitles[viewId]) {
      if (pageTitle) pageTitle.textContent = viewTitles[viewId].title;
      if (pageSubtitle) pageSubtitle.textContent = viewTitles[viewId].subtitle;
    }

    if (viewId === 'view-reports' || viewId === 'view-churn') {
      renderReportsView();
    } else if (viewId === 'view-deliveries') {
      renderDeliveriesView();
    } else if (viewId === 'view-system-logs') {
      fetchLogs();
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
  
  // --------------------------------------------------------------------------
  // PERSISTÊNCIA REFORÇADA: CACHE LOCAL DE ALTERAÇÕES (OVERIDES CLIENTE)
  // --------------------------------------------------------------------------
  function getLocalOverrides() {
    try {
      return JSON.parse(localStorage.getItem('organicamente_subscriber_overrides') || '{}');
    } catch (_) { return {}; }
  }

  function setLocalOverride(cpf, patchData) {
    if (!cpf) return;
    const clean = String(cpf).replace(/\D/g, '');
    const current = getLocalOverrides();
    current[clean] = { ...(current[clean] || {}), ...patchData, _updatedAt: new Date().toISOString() };
    localStorage.setItem('organicamente_subscriber_overrides', JSON.stringify(current));
  }

  function applyLocalOverrides(subsList) {
    if (!Array.isArray(subsList)) return [];
    const overrides = getLocalOverrides();
    if (!overrides || Object.keys(overrides).length === 0) return subsList;

    return subsList.map(s => {
      const clean = String(s.cpf || '').replace(/\D/g, '');
      if (overrides[clean]) {
        return { ...s, ...overrides[clean] };
      }
      return s;
    });
  }

  async function fetchData(syncAsaas = false) {
    const token = localStorage.getItem('organicamente_admin_token');
    if (!token) {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      return;
    }

    if (btnRefresh) {
      btnRefresh.classList.add('spinning');
      btnRefresh.disabled = true;
    }

    if (isFirstLoad) {
      showTableLoading();
    } else if (syncAsaas) {
      showToast('🔄 Sincronizando cobranças em tempo real com Asaas & Supabase...', 'warning');
    }

    try {
      const url = syncAsaas ? '/api/admin/assinaturas?syncAsaas=true' : '/api/admin/assinaturas';
      const res = await fetch(url, {
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

      if (!res.ok) {
        throw new Error(`Falha ao obter lista de assinantes (Erro ${res.status})`);
      }

      const rawData = await res.json();
      const subsList = Array.isArray(rawData) ? rawData : [];

      // Aplicar mesclagem com cache local (Overrides)
      subscribers = applyLocalOverrides(subsList);
      subscribers.reverse();

      applyFilters();
      calculateKpis();

      if (syncAsaas) {
        showToast('✓ Sincronização com Asaas concluída com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      showTableError(err.message);
    } finally {
      if (btnRefresh) {
        btnRefresh.classList.remove('spinning');
        btnRefresh.disabled = false;
      }
      
      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        isFirstLoad = false;
      }
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => fetchData(true));
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

  function getStatusAssinaturaInfo(sub) {
    const raw = (sub.statusAssinatura || '').trim();
    if (raw === 'Pausada' || raw === 'Pausado') {
      return { label: 'Pausada', badgeClass: 'badge-pausada' };
    }
    if (raw === 'Cancelada' || raw === 'Cancelado' || raw === 'Inativo') {
      return { label: 'Cancelada', badgeClass: 'badge-cancelada' };
    }
    return { label: 'Ativa', badgeClass: 'badge-ativa' };
  }

  function getStatusFinanceiroInfo(sub) {
    if (sub.statusFinanceiroManual) {
      const raw = sub.statusFinanceiroManual.trim();
      if (raw === 'Em Dia') return { label: 'Em Dia', badgeClass: 'badge-em-dia' };
      if (raw === 'Pendente') return { label: 'Pendente', badgeClass: 'pendente' };
      if (raw === 'Atrasado') return { label: 'Atrasado', badgeClass: 'atrasada' };
      if (raw === 'Isento') return { label: 'Isento', badgeClass: 'badge-isento' };
    }

    if (sub.asaas) {
      const st = sub.asaas.status;
      if (st === 'RECEIVED' || st === 'CONFIRMED') {
        return { label: 'Em Dia', badgeClass: 'badge-em-dia' };
      }
      if (st === 'PENDING') {
        return { label: 'Pendente', badgeClass: 'pendente' };
      }
      if (st === 'OVERDUE') {
        return { label: 'Atrasado', badgeClass: 'atrasada' };
      }
    }

    return { label: 'Pendente', badgeClass: 'pendente' };
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
      if (tableRowsCount) tableRowsCount.textContent = 'Mostrando 0 assinantes';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tableBody.innerHTML = '';

    filteredSubscribers.forEach((sub) => {
      if (!sub || !sub.nome || String(sub.nome).trim() === '' || String(sub.nome).trim() === '-') return;

      const initials = (sub.nome || 'U')
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();

      const assInfo = getStatusAssinaturaInfo(sub);
      const finInfo = getStatusFinanceiroInfo(sub);

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
          <span class="badge ${assInfo.badgeClass} badge-clickable btn-quick-ass" data-cpf="${sub.cpf}" title="Clique para alterar o status da assinatura">
            <i data-lucide="tag"></i> ${assInfo.label}
          </span>
        </td>
        <td>
          <span class="badge ${finInfo.badgeClass} badge-clickable btn-quick-fin" data-cpf="${sub.cpf}" title="Clique para alterar o status financeiro">
            <i data-lucide="dollar-sign"></i> ${finInfo.label}
          </span>
        </td>
      `;

      row.addEventListener('click', () => {
        openDetailsModal(sub);
      });

      const btnAss = row.querySelector('.btn-quick-ass');
      if (btnAss) {
        btnAss.addEventListener('click', (e) => {
          e.stopPropagation();
          openQuickStatusModal(sub, 'assinatura');
        });
      }

      const btnFin = row.querySelector('.btn-quick-fin');
      if (btnFin) {
        btnFin.addEventListener('click', (e) => {
          e.stopPropagation();
          openQuickStatusModal(sub, 'financeiro');
        });
      }

      tableBody.appendChild(row);
    });

    if (tableRowsCount) tableRowsCount.textContent = `Mostrando ${filteredSubscribers.length} de ${subscribers.length} clientes`;

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

  function renderReportsView() {
    const repMrr = document.getElementById('rep-mrr');
    const repRetentionRate = document.getElementById('rep-retention-rate');
    const repNetGrowth = document.getElementById('rep-net-growth');
    const repTotalChurn = document.getElementById('rep-total-churn');
    const reasonsContainer = document.getElementById('reports-churn-reasons-container');
    const basketsContainer = document.getElementById('reports-baskets-container');
    const historyTbody = document.getElementById('reports-history-table-body');

    let totalMrr = 0;
    let activeCount = 0;
    let totalChurn = 0;
    let entries30d = 0;
    let churn30d = 0;

    const reasonsCount = {};
    const basketsCount = {};

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const historyEvents = [];

    subscribers.forEach(sub => {
      const isActive = sub.statusAssinatura === 'Ativo';
      const isInactive = sub.statusAssinatura === 'Inativo' || sub.statusAssinatura === 'Cancelado';

      if (isActive) {
        activeCount++;
        const val = parseFloat(String(sub.totalMensal || '').replace(/[^\d,]/g, '').replace(',', '.'));
        if (!isNaN(val)) totalMrr += val;

        const cType = sub.cestaTipo || 'Cesta Não Informada';
        basketsCount[cType] = (basketsCount[cType] || 0) + 1;
      }

      if (isInactive) {
        totalChurn++;
        const reason = sub.motivoCancelamento || 'Outros / Não especificado';
        reasonsCount[reason] = (reasonsCount[reason] || 0) + 1;
      }

      // 30d entries
      if (sub.dataHora) {
        const regDate = new Date(sub.dataHora);
        if (!isNaN(regDate.getTime())) {
          if (regDate >= thirtyDaysAgo) entries30d++;
          historyEvents.push({
            name: sub.nome,
            type: 'Novo Cadastro',
            produtor: sub.produtor,
            cesta: sub.cestaTipo,
            date: regDate,
            details: 'Entrada na Comunidade'
          });
        }
      }

      // 30d churn
      if (isInactive) {
        let churnDate = sub.dataStatusAlterado ? new Date(sub.dataStatusAlterado) : (sub.dataHora ? new Date(sub.dataHora) : null);
        if (churnDate && !isNaN(churnDate.getTime()) && churnDate >= thirtyDaysAgo) {
          churn30d++;
        }
        historyEvents.push({
          name: sub.nome,
          type: 'Cancelamento',
          produtor: sub.produtor,
          cesta: sub.cestaTipo,
          date: churnDate || new Date(),
          details: sub.motivoCancelamento ? `${sub.motivoCancelamento}${sub.motivoDetalhe ? ' (' + sub.motivoDetalhe + ')' : ''}` : 'Não informado'
        });
      }
    });

    if (repMrr) repMrr.textContent = formatMoney(totalMrr);
    const baseTotal = activeCount + churn30d;
    const churnRate = baseTotal > 0 ? ((churn30d / baseTotal) * 100).toFixed(1) : '0.0';
    const retentionRate = (100 - parseFloat(churnRate)).toFixed(1);

    if (repRetentionRate) repRetentionRate.textContent = `${retentionRate}%`;
    const netGrowth = entries30d - churn30d;
    if (repNetGrowth) {
      repNetGrowth.textContent = netGrowth >= 0 ? `+${netGrowth}` : `${netGrowth}`;
      repNetGrowth.style.color = netGrowth >= 0 ? 'var(--color-primary-light)' : 'var(--color-danger)';
    }
    if (repTotalChurn) repTotalChurn.textContent = totalChurn;

    // Render Churn Reasons
    if (reasonsContainer) {
      reasonsContainer.innerHTML = '';
      const totalReasons = Object.values(reasonsCount).reduce((a, b) => a + b, 0);
      if (totalReasons === 0) {
        reasonsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center;">Nenhum cancelamento registrado com motivo.</p>';
      } else {
        Object.entries(reasonsCount).sort((a, b) => b[1] - a[1]).forEach(([reason, count]) => {
          const pct = Math.round((count / totalReasons) * 100);
          const div = document.createElement('div');
          div.className = 'bar-item';
          div.innerHTML = `
            <div class="bar-label" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span><strong>${reason}</strong></span>
              <span style="color: var(--color-danger); font-weight: 600;">${count} (${pct}%)</span>
            </div>
            <div class="bar-track" style="height: 10px; background: #fee2e2; border-radius: 6px; overflow: hidden;">
              <div class="bar-fill color-danger" style="width: ${pct}%; height: 100%; background: var(--color-danger); border-radius: 6px;"></div>
            </div>
          `;
          reasonsContainer.appendChild(div);
        });
      }
    }

    // Render Baskets Distribution
    if (basketsContainer) {
      basketsContainer.innerHTML = '';
      if (activeCount === 0) {
        basketsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center;">Nenhuma cesta ativa.</p>';
      } else {
        Object.entries(basketsCount).sort((a, b) => b[1] - a[1]).forEach(([basket, count]) => {
          const pct = Math.round((count / activeCount) * 100);
          const div = document.createElement('div');
          div.className = 'bar-item';
          div.innerHTML = `
            <div class="bar-label" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span><strong>${basket}</strong></span>
              <span style="color: var(--color-primary-light); font-weight: 600;">${count} (${pct}%)</span>
            </div>
            <div class="bar-track" style="height: 10px; background: #e2e8f0; border-radius: 6px; overflow: hidden;">
              <div class="bar-fill color-bruno" style="width: ${pct}%; height: 100%; background: var(--color-secondary); border-radius: 6px;"></div>
            </div>
          `;
          basketsContainer.appendChild(div);
        });
      }
    }

    // Render History table
    if (historyTbody) {
      historyTbody.innerHTML = '';
      historyEvents.sort((a, b) => b.date - a.date);

      if (historyEvents.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Nenhum evento registrado.</td></tr>';
      } else {
        historyEvents.slice(0, 25).forEach(evt => {
          const tr = document.createElement('tr');
          const isEntry = evt.type === 'Novo Cadastro';
          const badgeClass = isEntry ? 'paga' : 'atrasada';
          const dStr = evt.date ? evt.date.toLocaleDateString('pt-BR') : '-';

          tr.innerHTML = `
            <td><strong>${evt.name}</strong></td>
            <td><span class="badge ${badgeClass}">${evt.type}</span></td>
            <td>${evt.produtor || '-'}<br><span style="font-size: 11px; color: var(--color-text-secondary);">${evt.cesta || '-'}</span></td>
            <td>${dStr}</td>
            <td><span style="font-size: 12px; color: var(--color-text-secondary);">${evt.details}</span></td>
          `;
          historyTbody.appendChild(tr);
        });
      }
    }
  }

  // Exportar Relatório Executivo (Download CSV)
  const btnExportReport = document.getElementById('btn-export-report');
  if (btnExportReport) {
    btnExportReport.addEventListener('click', () => {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "Nome;CPF;E-mail;Telefone;Produtor;Cesta;Dia Entrega;Total Mensal;Status;Motivo Cancelamento\n";

      subscribers.forEach(sub => {
        const rowStr = [
          `"${(sub.nome || '').replace(/"/g, '""')}"`,
          `"${(sub.cpf || '').replace(/"/g, '""')}"`,
          `"${(sub.email || '').replace(/"/g, '""')}"`,
          `"${(sub.telefone || '').replace(/"/g, '""')}"`,
          `"${(sub.produtor || '').replace(/"/g, '""')}"`,
          `"${(sub.cestaTipo || '').replace(/"/g, '""')}"`,
          `"${(sub.diaEntrega || '').replace(/"/g, '""')}"`,
          `"${(sub.totalMensal || '').replace(/"/g, '""')}"`,
          `"${(sub.statusAssinatura || '').replace(/"/g, '""')}"`,
          `"${(sub.motivoCancelamento || '').replace(/"/g, '""')}"`
        ].join(";");
        csvContent += rowStr + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_Executivo_Organicamente_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  function applyFilters() {
    filteredSubscribers = subscribers.filter(sub => {
      const searchMatch = !searchQuery || 
        (sub.nome || '').toLowerCase().includes(searchQuery) ||
        (sub.email || '').toLowerCase().includes(searchQuery) ||
        String(sub.cpf || '').replace(/\D/g, '').includes(searchQuery);

      if (!searchMatch) return false;

      if (currentFilter === 'all') return true;
      
      const assInfo = getStatusAssinaturaInfo(sub);
      const finInfo = getStatusFinanceiroInfo(sub);

      if (currentFilter === 'ativa') return assInfo.label === 'Ativa';
      if (currentFilter === 'pausada') return assInfo.label === 'Pausada';
      if (currentFilter === 'cancelada') return assInfo.label === 'Cancelada';
      if (currentFilter === 'atrasado') return finInfo.label === 'Atrasado';

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
  }

  // ==========================================================================
  // 5. ABERTURA DO MODAL DETALHES & ABAS INTERNALIZADAS
  // ==========================================================================
  
  function openDetailsModal(sub) {
    if (!sub || !detailsModal) return;
    selectedSubscriber = sub;
    if (modalClientName) modalClientName.textContent = sub.nome || 'Cliente';

    // Reset para modo visualização
    exitEditMode();

    // Reset de abas
    if (modalTabButtons && modalTabButtons.length > 0) {
      modalTabButtons.forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (modalTabButtons[0]) modalTabButtons[0].classList.add('active');
    }
    if (modalBodies && modalBodies.length > 0) {
      modalBodies.forEach(body => {
        if (body) body.classList.remove('active-tab');
      });
      if (modalBodies[0]) modalBodies[0].classList.add('active-tab');
    }

    // Badges dos 2 Status (Assinatura e Financeiro)
    const assInfo = getStatusAssinaturaInfo(sub);
    const finInfo = getStatusFinanceiroInfo(sub);

    const modalAssBadge = document.getElementById('modal-client-status-assinatura');
    const modalFinBadge = document.getElementById('modal-client-status-financeiro');

    if (modalAssBadge) {
      modalAssBadge.className = `badge ${assInfo.badgeClass} badge-clickable`;
      modalAssBadge.innerHTML = `<i data-lucide="tag"></i> Assinatura: ${assInfo.label}`;
      modalAssBadge.onclick = () => openQuickStatusModal(sub, 'assinatura');
    }

    if (modalFinBadge) {
      modalFinBadge.className = `badge ${finInfo.badgeClass} badge-clickable`;
      modalFinBadge.innerHTML = `<i data-lucide="dollar-sign"></i> Financeiro: ${finInfo.label}`;
      modalFinBadge.onclick = () => openQuickStatusModal(sub, 'financeiro');
    }

    // Dados Pessoais
    if (mCpf) mCpf.textContent = formatCPF(sub.cpf || '');
    if (mEmail) mEmail.textContent = sub.email || '';
    if (mTelefone) mTelefone.textContent = formatPhone(sub.telefone || '');
    if (mDataHora) mDataHora.textContent = sub.dataHora ? new Date(sub.dataHora).toLocaleString('pt-BR') : 'Não informada';

    // Detalhes Cesta
    if (mCesta) mCesta.textContent = (sub.cestaTipo || '') + ' (' + (sub.cestaValor || '') + ')';
    if (mOvos) mOvos.textContent = (sub.ovosTipo || '') + ' (' + (sub.ovosValor || '') + ')';
    if (mProdutor) mProdutor.textContent = sub.produtor || 'Bruno';
    if (mDiaEntrega) mDiaEntrega.textContent = sub.diaEntrega || '';

    // Logística
    if (mEndereco) mEndereco.textContent = sub.endereco || '';
    if (mBairroRegiao) mBairroRegiao.textContent = `${sub.bairro || ''} / ${sub.regiao || ''}`;
    if (mCep) mCep.textContent = formatCEP(sub.cep || '');
    if (mReferencia) mReferencia.textContent = sub.pontoReferencia || 'Não informado';
    if (mHorario) mHorario.textContent = sub.horario || 'Horário Comercial';
    if (mVizinho) mVizinho.textContent = sub.vizinho || 'Deixar no local';

    // Financeiro
    if (mTotalMensal) mTotalMensal.textContent = sub.totalMensal || '';
    if (mPrimeiroPagamento) mPrimeiroPagamento.textContent = sub.primeiroPagamento || '';
    if (mFormaPagamento) mFormaPagamento.textContent = sub.formaPagamento || 'PIX';
    
    if (mVencimento) {
      mVencimento.textContent = (sub.asaas && sub.asaas.dueDate) ? new Date(sub.asaas.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não gerado';
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
    if (mAsaasStatus) mAsaasStatus.textContent = asaasLabel;

    if (mRowInvoice && mLinkFatura) {
      if (sub.asaas && sub.asaas.invoiceUrl) {
        mRowInvoice.classList.remove('hidden');
        mLinkFatura.href = sub.asaas.invoiceUrl;
      } else {
        mRowInvoice.classList.add('hidden');
      }
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
    if (mObservacoes) mObservacoes.textContent = sub.observacoes || 'Nenhuma observação informada.';

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

      // Histórico de alterações manuais de status
      if (sub.historicoStatus && Array.isArray(sub.historicoStatus)) {
        sub.historicoStatus.forEach(h => {
          const markerColor = h.tipo === 'Assinatura' ? 'color-purple' : 'color-info';
          timelineHtml += `
            <div class="timeline-item">
              <div class="timeline-marker ${markerColor}"></div>
              <div class="timeline-content">
                <span class="timeline-title">Status ${h.tipo} Alterado (${h.de} → ${h.para})</span>
                <span class="timeline-date">Registrado em ${h.date}</span>
                <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px;">
                  Justificativa: ${h.motivo || 'Sem justificativa'}
                </p>
              </div>
            </div>
          `;
        });
      }

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
    if (btnModalCopyAddress) {
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
    }

    // Link do Google Maps
    if (modalLinkMaps) {
      const mapsQuery = encodeURIComponent(`${sub.endereco}, ${sub.bairro}, Rio de Janeiro - RJ`);
      modalLinkMaps.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    }

    // WhatsApp Direto
    if (modalBtnWhatsapp) {
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
    }

    // Abre o Modal
    if (detailsModal) {
      detailsModal.classList.add('active');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================================================
  // LÓGICA DO MODAL RÁPIDO DE ALTERAÇÃO DE STATUS (CLICK TO EDIT BADGES)
  // ==========================================================================
  const quickStatusModal = document.getElementById('quick-status-modal');
  const quickStatusTitle = document.getElementById('quick-status-title');
  const quickStatusSubtitle = document.getElementById('quick-status-subtitle');
  const quickStatusForm = document.getElementById('quick-status-form');
  const quickStatusSelect = document.getElementById('quick-status-select');
  const quickStatusMotivoGroup = document.getElementById('quick-status-motivo-group');
  const quickStatusMotivoSelect = document.getElementById('quick-status-motivo-select');
  const quickStatusObservacao = document.getElementById('quick-status-observacao');
  const quickStatusCpf = document.getElementById('quick-status-cpf');
  const quickStatusType = document.getElementById('quick-status-type');
  const btnCloseQuickStatusModal = document.getElementById('btn-close-quick-status-modal');
  const btnQuickStatusCancel = document.getElementById('btn-quick-status-cancel');

  function openQuickStatusModal(sub, type) {
    selectedSubscriber = sub;
    quickStatusCpf.value = sub.cpf;
    quickStatusType.value = type;
    quickStatusSubtitle.textContent = `Cliente: ${sub.nome}`;
    quickStatusObservacao.value = '';

    quickStatusSelect.innerHTML = '';
    if (type === 'assinatura') {
      quickStatusTitle.textContent = 'Alterar Status da Assinatura';
      const current = getStatusAssinaturaInfo(sub).label;

      ['Ativa', 'Pausada', 'Cancelada'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt + (opt === current ? ' (Atual)' : '');
        if (opt === current) o.selected = true;
        quickStatusSelect.appendChild(o);
      });

      const updateMotivoVis = () => {
        const val = quickStatusSelect.value;
        if (quickStatusMotivoGroup) {
          if (val === 'Pausada' || val === 'Cancelada') {
            quickStatusMotivoGroup.classList.remove('hidden');
          } else {
            quickStatusMotivoGroup.classList.add('hidden');
          }
        }
      };
      quickStatusSelect.onchange = updateMotivoVis;
      updateMotivoVis();
    } else {
      if (quickStatusTitle) quickStatusTitle.textContent = 'Alterar Status Financeiro';
      if (quickStatusMotivoGroup) quickStatusMotivoGroup.classList.add('hidden');
      const current = getStatusFinanceiroInfo(sub).label;

      ['Em Dia', 'Pendente', 'Atrasado', 'Isento'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt + (opt === current ? ' (Atual)' : '');
        if (opt === current) o.selected = true;
        quickStatusSelect.appendChild(o);
      });
      quickStatusSelect.onchange = null;
    }

    if (quickStatusModal) quickStatusModal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  }

  if (btnCloseQuickStatusModal) {
    btnCloseQuickStatusModal.addEventListener('click', () => {
      if (quickStatusModal) quickStatusModal.classList.remove('active');
    });
  }
  if (btnQuickStatusCancel) {
    btnQuickStatusCancel.addEventListener('click', () => {
      if (quickStatusModal) quickStatusModal.classList.remove('active');
    });
  }

  if (quickStatusForm) {
    quickStatusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedSubscriber) return;

      const type = quickStatusType.value;
      const newStatus = quickStatusSelect.value;
      const obs = quickStatusObservacao.value.trim();
      const motivo = (type === 'assinatura' && (newStatus === 'Pausada' || newStatus === 'Cancelada')) 
        ? quickStatusMotivoSelect.value 
        : '';

      const nowStr = new Date().toLocaleString('pt-BR');
      const oldAssStatus = getStatusAssinaturaInfo(selectedSubscriber).label;
      const oldFinStatus = getStatusFinanceiroInfo(selectedSubscriber).label;

      let historyItem = null;

      if (type === 'assinatura') {
        selectedSubscriber.statusAssinatura = newStatus;
        if (motivo) selectedSubscriber.motivoCancelamento = motivo;
        if (obs) selectedSubscriber.motivoDetalhe = obs;
        historyItem = {
          date: nowStr,
          tipo: 'Assinatura',
          de: oldAssStatus,
          para: newStatus,
          motivo: obs ? `${motivo ? motivo + ' - ' : ''}${obs}` : (motivo || 'Alteração manual')
        };
      } else {
        selectedSubscriber.statusFinanceiroManual = newStatus;
        historyItem = {
          date: nowStr,
          tipo: 'Financeiro',
          de: oldFinStatus,
          para: newStatus,
          motivo: obs || 'Alteração financeira manual'
        };
      }

      if (!selectedSubscriber.historicoStatus) {
        selectedSubscriber.historicoStatus = [];
      }
      selectedSubscriber.historicoStatus.unshift(historyItem);

      // Atualizar no array principal e salvar cache local permanente
      setLocalOverride(selectedSubscriber.cpf, {
        statusAssinatura: selectedSubscriber.statusAssinatura,
        statusFinanceiroManual: selectedSubscriber.statusFinanceiroManual,
        historicoStatus: selectedSubscriber.historicoStatus,
        motivoCancelamento: selectedSubscriber.motivoCancelamento || '',
        motivoDetalhe: selectedSubscriber.motivoDetalhe || ''
      });

      const idx = subscribers.findIndex(s => s.cpf === selectedSubscriber.cpf);
      if (idx !== -1) {
        subscribers[idx] = { ...selectedSubscriber };
      }

      // Persistir no backend
      try {
        const token = localStorage.getItem('organicamente_admin_token');
        await fetch('/api/admin/assinaturas', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cpf: selectedSubscriber.cpf,
            statusAssinatura: selectedSubscriber.statusAssinatura,
            statusFinanceiroManual: selectedSubscriber.statusFinanceiroManual,
            historicoStatus: selectedSubscriber.historicoStatus,
            motivoCancelamento: selectedSubscriber.motivoCancelamento || '',
            motivoDetalhe: selectedSubscriber.motivoDetalhe || ''
          })
        });

        showToast(`Status ${type === 'assinatura' ? 'da assinatura' : 'financeiro'} alterado para "${newStatus}"!`, 'success');
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
        showToast('Status alterado no painel!', 'success');
      }

      if (quickStatusModal) quickStatusModal.classList.remove('active');
      applyFilters();
      calculateKpis();
      if (detailsModal && detailsModal.classList.contains('active')) {
        openDetailsModal(selectedSubscriber);
      }
    });
  }

  // Listener para alternar Abas do Modal
  if (modalTabs) {
    modalTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.modal-tab-btn');
      if (!btn) return;

      if (modalTabButtons) {
        modalTabButtons.forEach(b => { if (b) b.classList.remove('active'); });
      }
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      if (modalBodies) {
        modalBodies.forEach(body => {
          if (!body) return;
          if (body.id === targetTab) {
            body.classList.add('active-tab');
          } else {
            body.classList.remove('active-tab');
          }
        });
      }
    });
  }

  // Fechar Modal
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (detailsModal) detailsModal.classList.remove('active');
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
  // 6. LÓGICA DE CADASTRO (WIZARD POR ETAPAS)
  // ==========================================================================
  
  let currentWizardStep = 1;
  const btnWizardPrev = document.getElementById('btn-wizard-prev');
  const btnWizardNext = document.getElementById('btn-wizard-next');
  const btnWizardSubmit = document.getElementById('btn-new-submit');

  function updateWizardUI() {
    for (let i = 1; i <= 3; i++) {
      const stepEl = document.getElementById(`wizard-step-${i}`);
      const indicatorEl = document.getElementById(`step-indicator-${i}`);
      const lineEl = document.getElementById(`step-line-${i}`);

      if (stepEl) {
        if (i === currentWizardStep) {
          stepEl.classList.remove('hidden');
        } else {
          stepEl.classList.add('hidden');
        }
      }

      if (indicatorEl) {
        if (i === currentWizardStep) {
          indicatorEl.className = 'step-indicator active';
        } else if (i < currentWizardStep) {
          indicatorEl.className = 'step-indicator completed';
        } else {
          indicatorEl.className = 'step-indicator';
        }
      }

      if (lineEl) {
        if (i < currentWizardStep) {
          lineEl.classList.add('active');
        } else {
          lineEl.classList.remove('active');
        }
      }
    }

    if (btnWizardPrev) btnWizardPrev.disabled = (currentWizardStep === 1);

    if (currentWizardStep === 3) {
      if (btnWizardNext) btnWizardNext.classList.add('hidden');
      if (btnWizardSubmit) btnWizardSubmit.classList.remove('hidden');
    } else {
      if (btnWizardNext) btnWizardNext.classList.remove('hidden');
      if (btnWizardSubmit) btnWizardSubmit.classList.add('hidden');
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Máscaras de Entrada Automáticas
  function applyMasks() {
    const cpfInputs = document.querySelectorAll('#new-cpf, #edit-cpf');
    cpfInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = v;
      });
    });

    const cepInputs = document.querySelectorAll('#new-cep, #edit-cep');
    cepInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 8) v = v.slice(0, 8);
        v = v.replace(/^(\d{5})(\d)/, '$1-$2');
        e.target.value = v;
      });
    });

    const phoneInputs = document.querySelectorAll('#new-telefone, #edit-telefone');
    phoneInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length <= 10) {
          v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else {
          v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
        }
        e.target.value = v;
      });
    });
  }

  applyMasks();

  // Autocompletar CEP via ViaCEP API
  const newCepInput = document.getElementById('new-cep');
  const cepSpinner = document.getElementById('cep-loading-spinner');

  if (newCepInput) {
    let lastFetchedCep = '';
    const fetchAddress = async () => {
      const cepClean = newCepInput.value.replace(/\D/g, '');
      if (cepClean.length === 8 && cepClean !== lastFetchedCep) {
        lastFetchedCep = cepClean;
        if (cepSpinner) cepSpinner.classList.remove('hidden');
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
          const data = await res.json();
          if (data.erro) {
            showToast('CEP não encontrado. Verifique o número digitado.', 'warning');
          } else {
            const endInput = document.getElementById('new-endereco');
            const bairroInput = document.getElementById('new-bairro');
            const regiaoInput = document.getElementById('new-regiao');

            if (bairroInput && data.bairro) bairroInput.value = data.bairro;
            if (endInput && data.logradouro) {
              endInput.value = data.logradouro;
              endInput.focus();
            }
            if (regiaoInput) {
              regiaoInput.value = `${data.localidade} / ${data.uf}`;
            }
            showToast('Endereço localizado e preenchido automaticamente!', 'success');
          }
        } catch (err) {
          console.error('Erro ViaCEP:', err);
        } finally {
          if (cepSpinner) cepSpinner.classList.add('hidden');
        }
      }
    };

    newCepInput.addEventListener('blur', fetchAddress);
    newCepInput.addEventListener('input', (e) => {
      const clean = e.target.value.replace(/\D/g, '');
      if (clean.length === 8) fetchAddress();
    });
  }

  function validateWizardStep(step) {
    if (step === 1) {
      const nome = document.getElementById('new-nome').value.trim();
      const cpf = document.getElementById('new-cpf').value.trim();
      const email = document.getElementById('new-email').value.trim();
      const telefone = document.getElementById('new-telefone').value.trim();
      const comoConheceu = document.getElementById('new-comoConheceu').value;

      if (!nome || !cpf || !email || !telefone || !comoConheceu) {
        showToast('Preencha os campos obrigatórios da Etapa 1 (Nome, CPF, E-mail, Telefone e Como Conheceu).', 'warning');
        return false;
      }
    } else if (step === 2) {
      const endereco = document.getElementById('new-endereco').value.trim();
      const cep = document.getElementById('new-cep').value.trim();
      const bairro = document.getElementById('new-bairro').value.trim();
      const regiao = document.getElementById('new-regiao').value.trim();

      if (!endereco || !cep || !bairro || !regiao) {
        showToast('Preencha os campos obrigatórios de endereço (CEP, Bairro, Endereço e Região).', 'warning');
        return false;
      }
    }
    return true;
  }

  if (btnWizardNext) {
    btnWizardNext.addEventListener('click', () => {
      if (validateWizardStep(currentWizardStep)) {
        if (currentWizardStep < 3) {
          currentWizardStep++;
          updateWizardUI();
        }
      }
    });
  }

  if (btnWizardPrev) {
    btnWizardPrev.addEventListener('click', () => {
      if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
      }
    });
  }

  if (btnNewSubscriber) {
    btnNewSubscriber.addEventListener('click', () => {
      currentWizardStep = 1;
      updateWizardUI();
      if (newSubscriberForm) newSubscriberForm.reset();
      if (newSubscriberModal) newSubscriberModal.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (btnCloseNewModal) {
    btnCloseNewModal.addEventListener('click', () => {
      if (newSubscriberModal) newSubscriberModal.classList.remove('active');
    });
  }

  if (btnNewCancel) {
    btnNewCancel.addEventListener('click', () => {
      if (newSubscriberModal) newSubscriberModal.classList.remove('active');
    });
  }

  if (newSubscriberModal) {
    newSubscriberModal.addEventListener('click', (e) => {
      if (e.target === newSubscriberModal) {
        newSubscriberModal.classList.remove('active');
      }
    });
  }

  // Lógica de Seleção de Cards Interativos (Agricultores e Cestas) no Wizard
  function setupWizardCards() {
    const farmerCards = document.querySelectorAll('.farmer-card');
    const basketCards = document.querySelectorAll('.basket-card');
    const inputProdutor = document.getElementById('new-produtor');
    const inputDiaEntrega = document.getElementById('new-diaentrega');
    const inputCestaTipo = document.getElementById('new-cestaTipo');
    const inputCestaValor = document.getElementById('new-cestaValor');
    const ovosSelect = document.getElementById('new-ovosTipo');
    const ovosValorInput = document.getElementById('new-ovosValor');
    const totalInput = document.getElementById('new-totalmensal');
    const primeiroInput = document.getElementById('new-primeiropagamento');

    function calculateWizardTotals() {
      if (!inputCestaTipo || !totalInput || !primeiroInput) return;
      const cestaVal = inputCestaTipo.value;
      const ovosVal = ovosSelect ? ovosSelect.value : 'Sem Ovos';

      let cestaPrice = pricesConfig.cesta[cestaVal] || 180.0;
      if (inputCestaValor) inputCestaValor.value = formatMoneyPlain(cestaPrice);

      let deliveries = 4;
      if (cestaVal === 'Cesta Quinzenal') deliveries = 2;
      else if (cestaVal === 'Entrega Avulsa (Unitária)') deliveries = 1;

      let eggsPrice = 0;
      if (ovosVal.includes('1 dúzia')) eggsPrice = 1 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('2 dúzias')) eggsPrice = 2 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('3 dúzias')) eggsPrice = 3 * deliveries * pricesConfig.eggCostPerDozen;

      if (ovosValorInput) ovosValorInput.value = formatMoneyPlain(eggsPrice);

      const totalMensal = cestaVal === 'Entrega Avulsa (Unitária)' ? 0 : (cestaPrice + eggsPrice);
      totalInput.value = formatMoneyPlain(totalMensal);

      const primeiroPagamento = cestaPrice + eggsPrice + pricesConfig.adesao;
      primeiroInput.value = formatMoneyPlain(primeiroPagamento);
    }

    farmerCards.forEach(card => {
      card.addEventListener('click', () => {
        farmerCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (inputProdutor) inputProdutor.value = card.dataset.farmer;
        if (inputDiaEntrega) inputDiaEntrega.value = card.dataset.day;
      });
    });

    basketCards.forEach(card => {
      card.addEventListener('click', () => {
        basketCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (inputCestaTipo) inputCestaTipo.value = card.dataset.basket;
        calculateWizardTotals();
      });
    });

    if (ovosSelect) {
      ovosSelect.addEventListener('change', calculateWizardTotals);
    }
  }

  function setupReactiveCalculations(formPrefix) {
    const cestaSelect = document.getElementById(`${formPrefix}-cestaTipo`);
    const cestaValorInput = document.getElementById(`${formPrefix}-cestaValor`);
    const ovosSelect = document.getElementById(`${formPrefix}-ovosTipo`);
    const ovosValorInput = document.getElementById(`${formPrefix}-ovosValor`);
    const totalInput = document.getElementById(`${formPrefix}-totalmensal`);
    const primeiroInput = document.getElementById(`${formPrefix}-primeiropagamento`);

    if (!cestaSelect || !ovosSelect) return;

    function calculate() {
      const cestaVal = cestaSelect.value;
      const ovosVal = ovosSelect.value;

      let cestaPrice = pricesConfig.cesta[cestaVal] || 0;
      if (cestaValorInput) cestaValorInput.value = formatMoneyPlain(cestaPrice);

      let deliveries = 4;
      if (cestaVal === 'Cesta Quinzenal') deliveries = 2;
      else if (cestaVal === 'Entrega Avulsa (Unitária)') deliveries = 1;

      let eggsPrice = 0;
      if (ovosVal.includes('1 dúzia')) eggsPrice = 1 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('2 dúzias')) eggsPrice = 2 * deliveries * pricesConfig.eggCostPerDozen;
      else if (ovosVal.includes('3 dúzias')) eggsPrice = 3 * deliveries * pricesConfig.eggCostPerDozen;
      
      if (ovosValorInput) ovosValorInput.value = formatMoneyPlain(eggsPrice);

      const totalMensal = cestaVal === 'Entrega Avulsa (Unitária)' ? 0 : (cestaPrice + eggsPrice);
      if (totalInput) totalInput.value = formatMoneyPlain(totalMensal);

      const primeiroPagamento = cestaPrice + eggsPrice + pricesConfig.adesao;
      if (primeiroInput) primeiroInput.value = formatMoneyPlain(primeiroPagamento);
    }

    cestaSelect.addEventListener('change', calculate);
    ovosSelect.addEventListener('change', calculate);
  }

  setupWizardCards();
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

        showToast('Assinante cadastrado com sucesso!', 'success');
        if (newSubscriberModal) newSubscriberModal.classList.remove('active');

        // Adiciona imediatamente ao array local para exibição instantânea
        subscribers.unshift(data);
        currentFilter = 'all';
        if (filterTabsContainer) {
          const allTab = filterTabsContainer.querySelector('.tab-btn[data-filter="all"]');
          if (allTab) {
            filterTabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            allTab.classList.add('active');
          }
        }
        applyFilters();
        calculateKpis();
        fetchData(); // Sincroniza em segundo plano
      } catch (err) {
        console.error(err);
        showToast(`Falha no cadastro: ${err.message}`, 'error');
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
    if (modalClientName) modalClientName.textContent = `Editar Assinante`;
    if (modalClientStatus) modalClientStatus.classList.add('hidden');
    if (modalTabs) modalTabs.classList.add('hidden');
    if (modalBodies) {
      modalBodies.forEach(body => { if (body) body.classList.remove('active-tab'); });
    }
    
    // Mostra Form de Edição e botões de edição
    if (editSubscriberForm) editSubscriberForm.classList.remove('hidden');
    if (modalViewFooter) modalViewFooter.classList.add('hidden');
    if (modalEditFooter) modalEditFooter.classList.remove('hidden');

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

    if (modalClientName) modalClientName.textContent = selectedSubscriber.nome || 'Cliente';
    if (modalClientStatus) modalClientStatus.classList.remove('hidden');
    if (modalTabs) modalTabs.classList.remove('hidden');
    
    // Volta abas ativa
    if (modalTabs) {
      const activeBtn = modalTabs.querySelector('.modal-tab-btn.active');
      if (activeBtn) {
        const activeTabId = activeBtn.getAttribute('data-tab');
        if (activeTabId) {
          const tabEl = document.getElementById(activeTabId);
          if (tabEl) tabEl.classList.add('active-tab');
        }
      }
    }

    // Oculta Formulário
    if (editSubscriberForm) editSubscriberForm.classList.add('hidden');
    if (modalViewFooter) modalViewFooter.classList.remove('hidden');
    if (modalEditFooter) modalEditFooter.classList.add('hidden');
    
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
        showToast('Por favor, selecione um motivo para o cancelamento/inativação.', 'warning');
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

      // Gravar override no cache local do cliente
      setLocalOverride(updatedData.cpf, updatedData);

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

        showToast('Cadastro atualizado com sucesso!', 'success');
        
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
        showToast(`Falha na atualização: ${err.message}`, 'error');
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

        showToast('Assinante excluído com sucesso!', 'success');
        
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
        showToast(`Falha na exclusão: ${err.message}`, 'error');
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

  // Listener para o Botão de Migração Supabase
  const btnMigrateSupabase = document.getElementById('btn-migrate-supabase');
  if (btnMigrateSupabase) {
    btnMigrateSupabase.addEventListener('click', async () => {
      btnMigrateSupabase.disabled = true;
      const originalText = btnMigrateSupabase.innerHTML;
      btnMigrateSupabase.innerHTML = '<span>Migrando dados...</span>';

      try {
        const token = localStorage.getItem('organicamente_admin_token');
        const res = await fetch('/api/admin/migrar-supabase', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Migração concluída! ${data.migratedCount} de ${data.totalCount} clientes importados para o Supabase PostgreSQL!`, 'success');
          fetchData();
        } else {
          showToast(data.error || 'Erro ao realizar a migração. Verifique as credenciais no servidor.', 'warning');
        }
      } catch (err) {
        console.error('Erro na migração:', err);
        showToast('Falha na migração para o Supabase.', 'error');
      } finally {
        btnMigrateSupabase.disabled = false;
        btnMigrateSupabase.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Listener para o Botão de Teste de Conexão Supabase
  const btnTestSupabase = document.getElementById('btn-test-supabase');
  if (btnTestSupabase) {
    btnTestSupabase.addEventListener('click', async () => {
      btnTestSupabase.disabled = true;
      const originalText = btnTestSupabase.innerHTML;
      btnTestSupabase.innerHTML = '<span>Testando...</span>';

      try {
        const token = localStorage.getItem('organicamente_admin_token');
        const res = await fetch('/api/admin/test-supabase', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const r = data.report || {};
          const selOk = r.tests?.select?.success ? 'Leitura OK' : 'Falha Leitura';
          const updOk = r.tests?.update?.success ? 'Escrita/Update OK' : (r.tests?.update?.error || 'Falha Escrita');
          showToast(`Supabase Conectado! [${selOk} | ${updOk}]`, r.tests?.update?.success ? 'success' : 'warning');
        } else {
          showToast(data.error || 'Falha ao testar conexão com o Supabase.', 'error');
        }
      } catch (err) {
        console.error('Erro no teste Supabase:', err);
        showToast('Erro ao se comunicar com o Supabase.', 'error');
      } finally {
        btnTestSupabase.disabled = false;
        btnTestSupabase.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ==========================================================================
  // LOGS DO SISTEMA & CAPTURA DE ERROS (AUDITORIA)
  // ==========================================================================
  const systemLogsModal = document.getElementById('system-logs-modal');
  const btnOpenSystemLogs = document.getElementById('btn-open-system-logs');
  const btnCloseLogsModal = document.getElementById('btn-close-logs-modal');
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');
  const logsConsoleOutput = document.getElementById('logs-console-output');

  async function fetchLogs() {
    if (!logsConsoleOutput) return;
    logsConsoleOutput.innerHTML = '<div style="color: #94a3b8;">Carregando logs do servidor...</div>';

    try {
      const token = localStorage.getItem('organicamente_admin_token');
      const res = await fetch('/api/admin/logs', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.logs) {
        if (data.logs.length === 0) {
          logsConsoleOutput.innerHTML = '<div style="color: #64748b;">Nenhum evento registrado até o momento.</div>';
        } else {
          logsConsoleOutput.innerHTML = data.logs.map(l => {
            const timeStr = new Date(l.timestamp || Date.now()).toLocaleTimeString('pt-BR');
            let levelColor = '#38bdf8'; // INFO
            if (l.level === 'ERROR') levelColor = '#f87171';
            if (l.level === 'WARN') levelColor = '#fbbf24';
            if (l.level === 'SUCCESS') levelColor = '#4ade80';

            return `
              <div style="margin-bottom: 6px; border-bottom: 1px dashed #334155; padding-bottom: 4px;">
                <span style="color: #64748b;">[${timeStr}]</span>
                <span style="color: ${levelColor}; font-weight: bold;">[${l.level}]</span>
                <span style="color: #cbd5e1; font-weight: 600;">[${l.scope || 'SYSTEM'}]</span>
                <span style="color: #f8fafc;">${l.message}</span>
                ${l.meta && Object.keys(l.meta).length > 0 ? `<div style="color: #94a3b8; font-size: 11px; margin-left: 14px;">${JSON.stringify(l.meta)}</div>` : ''}
              </div>
            `;
          }).join('');
        }
      } else {
        logsConsoleOutput.innerHTML = `<div style="color: #f87171;">Erro ao obter logs: ${data.error || 'Falha de comunicação'}</div>`;
      }
    } catch (err) {
      logsConsoleOutput.innerHTML = `<div style="color: #f87171;">Erro de conexão: ${err.message}</div>`;
    }
  }

  const btnBackToSettings = document.getElementById('btn-back-to-settings');

  if (btnOpenSystemLogs) {
    btnOpenSystemLogs.addEventListener('click', () => {
      switchView('view-system-logs');
    });
  }

  if (btnBackToSettings) {
    btnBackToSettings.addEventListener('click', () => {
      switchView('view-settings');
    });
  }

  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', fetchLogs);
  }

  // Captura global de exceções não tratadas no navegador para auditoria
  window.addEventListener('error', (event) => {
    try {
      const token = localStorage.getItem('organicamente_admin_token');
      if (token) {
        fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'ERROR',
            scope: 'FRONTEND',
            message: event.message || 'Exceção JS no navegador',
            meta: { filename: event.filename, lineno: event.lineno, colno: event.colno }
          })
        }).catch(() => {});
      }
    } catch (_) {}
  });

  // Lógica do Menu Mobile Hamburger
  const btnToggleMobileSidebar = document.getElementById('btn-toggle-mobile-sidebar');
  const appSidebar = document.querySelector('.app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  function toggleMobileSidebar() {
    if (appSidebar) appSidebar.classList.toggle('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
  }

  if (btnToggleMobileSidebar) {
    btnToggleMobileSidebar.addEventListener('click', toggleMobileSidebar);
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', toggleMobileSidebar);
  }

  if (navItems) {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (appSidebar && appSidebar.classList.contains('sidebar-open')) {
          toggleMobileSidebar();
        }
      });
    });
  }

  // Checagem inicial
  checkSession();
});
