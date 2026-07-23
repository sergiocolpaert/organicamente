import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Estado Global do Formulário, Mapeamento de Produtores e Rotas
  // ==========================================================================
  let currentStep = 'intro'; // 'intro', 1, 2, 3, 4, 5, 6, 7
  const totalSteps = 7;
  let selectedFarmerId = 'russo'; // 'russo' ou 'bruno' (Padrão inicial)

  const farmersData = {
    russo: {
      id: 'russo',
      name: 'José Antônio Pereira (Russo)',
      origin: 'Taquara',
      deliveryDay: 'Quarta-feira',
      image: '/assets/russo.jpg',
      description: 'Russo planta com afeto em Taquara e atende a Zona Sul, Centro e Zona Norte às quartas-feiras. Sua produção foca em folhagens crocantes e legumes sazonais.',
      prices: {
        familia: { cesta: 303, frete: 61, total: 364 },
        individual: { cesta: 252, frete: 61, total: 313 },
        quinzenal: { cesta: 141, frete: 29, total: 170 },
        unitaria: { cesta: 75.5, frete: 14.5, total: 90 },
        ovos: 64
      }
    },
    bruno: {
      id: 'bruno',
      name: 'Bruno Branco',
      origin: 'Itaipava',
      deliveryDay: 'Terça ou Quarta-feira', // Dinâmico com base na região
      image: '/assets/bruno.jpg',
      description: 'Bruno lidera uma cooperativa familiar de jovens agricultores em Itaipava. Atende Barra da Tijuca, Recreio, Tijuca e Zona Sul com vegetais colhidos no dia.',
      prices: {
        familia: { cesta: 318, frete: 61, total: 379 },
        individual: { cesta: 260, frete: 61, total: 321 },
        quinzenal: { cesta: 145, frete: 29, total: 174 },
        unitaria: { cesta: 77.5, frete: 14.5, total: 92 },
        ovos: 64
      }
    }
  };

  const routesConfig = {
    russo: {
      regions: ['zona-sul', 'tijuca', 'centro-zona-norte'],
      bairros: [
        // Zona Sul
        'copacabana', 'ipanema', 'leblon', 'botafogo', 'flamengo', 'laranjeiras', 'gavea', 'jardim-botanico',
        // Tijuca
        'tijuca', 'vila-isabel', 'grajau', 'maracana', 'andarai',
        // Centro e Zona Norte
        'centro', 'santa-teresa', 'gloria', 'meier', 'ilha-do-governador'
      ]
    },
    bruno: {
      regions: ['barra-recreio', 'zona-sul', 'tijuca', 'centro-zona-norte'],
      bairros: [
        // Barra/Recreio
        'barra-da-tijuca', 'recreio-dos-bandeirantes', 'vargem-grande', 'vargem-pequena', 'jardim-oceanico',
        // Zona Sul
        'copacabana', 'ipanema', 'leblon', 'botafogo', 'flamengo', 'laranjeiras', 'gavea', 'jardim-botanico',
        // Tijuca
        'tijuca', 'vila-isabel', 'grajau',
        // Centro
        'santa-teresa'
      ]
    }
  };

  // Preços estáticos antigos de adesão
  const prices = {
    adesao: 35
  };

  // ==========================================================================
  // 2. Elementos do DOM
  // ==========================================================================
  const form = document.getElementById('signup-form');
  const stepPanes = document.querySelectorAll('.step-pane');
  const minimalProgressBar = document.getElementById('minimal-progress-bar');
  const onboardingBrand = document.getElementById('onboarding-brand');
  const formNavigationContainer = document.getElementById('form-navigation-container');
  
  const startOnboardingBtn = document.getElementById('start-onboarding-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  // Elementos do Carrinho Dinâmico Integrado no Step 7
  const summaryBasketRowName = document.querySelector('#summary-basket-row .item-name');
  const summaryBasketRowValue = document.querySelector('#summary-basket-row .item-value');
  const summaryEggsRowName = document.querySelector('#summary-eggs-row .item-name');
  const summaryEggsRowValue = document.querySelector('#summary-eggs-row .item-value');
  const summaryTotalMonthly = document.getElementById('summary-total-monthly');
  const summaryTotalInitial = document.getElementById('summary-total-initial');
  
  // Elementos do Step 1: Geolocalização
  const regionSelect = document.getElementById('region-select');
  const neighborhoodSelect = document.getElementById('neighborhood-select');
  
  // Elementos do Step 2: Escolha de Agricultor
  const farmerCardRusso = document.getElementById('farmer-card-russo');
  const farmerCardBruno = document.getElementById('farmer-card-bruno');
  const hiddenProdutor = document.getElementById('input-produtor');
  const hiddenDiaEntrega = document.getElementById('input-dia-entrega');

  // Elementos de Sucesso
  const successScreen = document.getElementById('success-screen');
  const mainContent = document.querySelector('.main-content');
  const successUserName = document.getElementById('success-user-name');
  const successBasketType = document.getElementById('success-basket-type');
  const successEggsType = document.getElementById('success-eggs-type');
  const successFarmerName = document.getElementById('success-farmer-name');
  const successDeliveryDay = document.getElementById('success-delivery-day');
  const successAddress = document.getElementById('success-address');
  const successMonthlyValue = document.getElementById('success-monthly-value');
  const successFeeValue = document.getElementById('success-fee-value');
  const successFirstPaymentValue = document.getElementById('success-first-payment-value');
  const whatsappSubmitBtn = document.getElementById('whatsapp-submit-btn');

  // Elementos do Pix
  const pixCodeInput = document.getElementById('pix-code-input');
  const pixCopyBtn = document.getElementById('pix-copy-btn');
  const pixCopyFeedback = document.getElementById('pix-copy-feedback');

  // Inputs para máscaras
  const cpfInput = document.getElementById('input-cpf');
  const telInput = document.getElementById('input-telefone');
  const cepInput = document.getElementById('input-cep');

  // Elementos Dinâmicos de Ovos e Vizinho
  const eggQuantitySelectorContainer = document.getElementById('egg-quantity-selector-container');
  const eggsQtyRadios = document.querySelectorAll('input[name="ovos_quantidade"]');
  const selectVizinho = document.getElementById('select-vizinho');
  const groupVizinhoDetalhes = document.getElementById('group-vizinho-detalhes');
  const inputVizinhoDetalhes = document.getElementById('input-vizinho-detalhes');
  
  // Forma de pagamento Asaas
  const paymentRadios = document.querySelectorAll('input[name="formaPagamento"]');

  // ==========================================================================
  // 3. Controle e Navegação de Etapas (Multi-step 100vh)
  // ==========================================================================
  function updateProgressTracker() {
    if (currentStep === 'intro') {
      minimalProgressBar.classList.add('hidden');
      onboardingBrand.classList.add('hidden');
      formNavigationContainer.classList.add('hidden');
      return;
    }


    minimalProgressBar.classList.remove('hidden');
    onboardingBrand.classList.remove('hidden');
    formNavigationContainer.classList.remove('hidden');

    // Cada passo representa 20% do funil (5 passos total)
    const percent = (currentStep / totalSteps) * 100;
    minimalProgressBar.style.setProperty('--progress-percent', `${percent}%`);
  }

  function showStep(step) {
    stepPanes.forEach((pane) => {
      pane.classList.remove('active');
      pane.classList.add('hidden');
    });

    const activePane = document.getElementById(step === 'intro' ? 'step-pane-intro' : `step-pane-${step}`);
    activePane.classList.remove('hidden');
    void activePane.offsetWidth; // Força reflow
    activePane.classList.add('active');

    // Reseta a rolagem interna do painel que está entrando
    const scrollContainer = activePane.querySelector('.step-body, .intro-panel');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // Configura botões da botoeira inferior
    if (step !== 'intro') {
      if (step === 1) {
        prevBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Início
        `;
      } else {
        prevBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar
        `;
      }

      if (step === totalSteps) {
        nextBtn.innerHTML = `
          Concluir Inscrição
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        `;
      } else {
        nextBtn.innerHTML = `
          Avançar
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        `;
      }
    }

    currentStep = step;
    updateProgressTracker();
  }

  // Ações de clique
  startOnboardingBtn.addEventListener('click', () => {
    showStep(1);
  });

  nextBtn.addEventListener('click', () => {
    if (currentStep !== 'intro') {
      if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
          showStep(currentStep + 1);
        } else {
          submitForm();
        }
      }
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep === 1) {
      showStep('intro');
    } else if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  });

  // ==========================================================================
  // 4. Atalhos de Teclado (Enter para avançar)
  // ==========================================================================
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const activeElement = document.activeElement;
      
      if (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      e.preventDefault();
      nextBtn.click();
    }
  });

  // ==========================================================================
  // 5. Máscaras de Inputs
  // ==========================================================================
  function applyMask(input, maskFn) {
    input.addEventListener('input', (e) => {
      const cursorPosition = input.selectionStart;
      const originalValue = input.value;
      const maskedValue = maskFn(originalValue);
      
      input.value = maskedValue;
      
      if (cursorPosition < originalValue.length) {
        input.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  }

  const cpfMask = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const telMask = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const cepMask = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  };

  applyMask(cpfInput, cpfMask);
  applyMask(telInput, telMask);
  applyMask(cepInput, cepMask);

  // ==========================================================================
  // 6. Integração ViaCEP
  // ==========================================================================
  cepInput.addEventListener('blur', () => {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length === 8) {
      const addressInput = document.getElementById('input-endereco');
      const neighborhoodInput = document.getElementById('input-bairro');
      
      addressInput.placeholder = 'Buscando endereço...';
      neighborhoodInput.placeholder = 'Buscando bairro...';
      
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
          if (!data.erro) {
            addressInput.value = data.logradouro || '';
            neighborhoodInput.value = data.bairro || '';
            
            deleteFieldError(addressInput);
            deleteFieldError(neighborhoodInput);
            deleteFieldError(cepInput);
            
            document.getElementById('input-numero').focus();
          } else {
            showFieldError(cepInput, 'CEP não encontrado. Digite manualmente.');
          }
        })
        .catch(() => {
          addressInput.placeholder = 'Rua das Laranjeiras';
          neighborhoodInput.placeholder = 'Laranjeiras';
        });
    }
  });

  // ==========================================================================
  // 6.5. Controle Dinâmico do Vizinho (Ausência de Entrega)
  // ==========================================================================
  if (selectVizinho && groupVizinhoDetalhes && inputVizinhoDetalhes) {
    selectVizinho.addEventListener('change', () => {
      if (selectVizinho.value === 'vizinho') {
        groupVizinhoDetalhes.style.display = 'flex';
        inputVizinhoDetalhes.setAttribute('required', 'required');
      } else {
        groupVizinhoDetalhes.style.display = 'none';
        inputVizinhoDetalhes.removeAttribute('required');
        inputVizinhoDetalhes.value = '';
        deleteFieldError(inputVizinhoDetalhes);
      }
    });

    inputVizinhoDetalhes.addEventListener('blur', () => {
      validateField(inputVizinhoDetalhes);
    });

    inputVizinhoDetalhes.addEventListener('input', () => {
      deleteFieldError(inputVizinhoDetalhes);
    });
  }

  // ==========================================================================
  // 7. Geolocalização, Bairros e Elegibilidade de Produtores
  // ==========================================================================
  const neighborhoodsByRegion = {
    'zona-sul': ['Copacabana', 'Ipanema', 'Leblon', 'Botafogo', 'Flamengo', 'Laranjeiras', 'Gávea', 'Jardim Botânico'],
    'barra-recreio': ['Barra da Tijuca', 'Recreio dos Bandeirantes', 'Vargem Grande', 'Vargem Pequena', 'Jardim Oceânico'],
    'tijuca': ['Tijuca', 'Vila Isabel', 'Grajaú', 'Maracanã', 'Andaraí'],
    'centro-zona-norte': ['Centro', 'Santa Teresa', 'Glória', 'Méier', 'Ilha do Governador']
  };

  const regionCards = document.querySelectorAll('.region-card');
  const neighborhoodTagsContainer = document.getElementById('neighborhood-tags-container');

  regionCards.forEach(card => {
    card.addEventListener('click', () => {
      regionCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const regionValue = card.getAttribute('data-value');
      regionSelect.value = regionValue;
      regionSelect.dispatchEvent(new Event('change'));
    });
  });

  regionSelect.addEventListener('change', () => {
    const region = regionSelect.value;
    const neighborhoods = neighborhoodsByRegion[region];
    
    // Limpa e reseta o select de bairros nativo
    neighborhoodSelect.innerHTML = '';
    
    // Limpa o contêiner de tags visuais
    neighborhoodTagsContainer.innerHTML = '';
    
    if (neighborhoods) {
      // Habilita select nativo e insere opção padrão
      neighborhoodSelect.disabled = false;
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      defaultOption.textContent = 'Escolha seu bairro...';
      neighborhoodSelect.appendChild(defaultOption);
      
      // Popula os bairros no select nativo e gera as tags visuais interativas
      neighborhoods.forEach((neighborhood) => {
        const val = neighborhood.toLowerCase().replace(/\s+/g, '-');
        
        // Adiciona no select nativo oculto
        const option = document.createElement('option');
        option.value = val;
        option.textContent = neighborhood;
        neighborhoodSelect.appendChild(option);
        
        // Adiciona tag de clique rápido visual
        const tagBtn = document.createElement('button');
        tagBtn.type = 'button';
        tagBtn.className = 'neighborhood-tag-btn';
        tagBtn.setAttribute('data-value', val);
        tagBtn.textContent = neighborhood;
        
        tagBtn.addEventListener('click', () => {
          const allTags = neighborhoodTagsContainer.querySelectorAll('.neighborhood-tag-btn');
          allTags.forEach(t => t.classList.remove('active'));
          tagBtn.classList.add('active');
          
          neighborhoodSelect.value = val;
          neighborhoodSelect.dispatchEvent(new Event('change'));
        });
        
        neighborhoodTagsContainer.appendChild(tagBtn);
      });
      
      deleteFieldError(regionSelect);
    } else {
      neighborhoodSelect.disabled = true;
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      defaultOption.textContent = 'Selecione a região primeiro...';
      neighborhoodSelect.appendChild(defaultOption);
      
      // Mensagem visual amigável
      const placeholder = document.createElement('p');
      placeholder.className = 'neighborhood-placeholder-text';
      placeholder.textContent = 'Selecione uma região acima para exibir os bairros atendidos...';
      neighborhoodTagsContainer.appendChild(placeholder);
    }
    
    // Reseta a seleção do agricultor se a região mudar
    hiddenProdutor.value = '';
    hiddenDiaEntrega.value = '';
    farmerCardRusso.classList.remove('active', 'disabled');
    farmerCardBruno.classList.remove('active', 'disabled');
  });

  neighborhoodSelect.addEventListener('change', () => {
    if (neighborhoodSelect.value) {
      deleteFieldError(neighborhoodSelect);
      checkFarmerAvailability();
    }
  });

  // Lógica de seleção ativa do agricultor (Passo 2)
  function selectFarmer(farmerId) {
    const farmer = farmersData[farmerId];
    if (!farmer) return;
    
    selectedFarmerId = farmerId;
    hiddenProdutor.value = farmer.name;
    
    // Determina o dia de entrega dinâmico para o Bruno com base na região
    if (farmerId === 'bruno') {
      const region = regionSelect.value;
      if (region === 'barra-recreio') {
        hiddenDiaEntrega.value = 'Terça-feira';
      } else {
        hiddenDiaEntrega.value = 'Quarta-feira';
      }
    } else {
      hiddenDiaEntrega.value = farmer.deliveryDay;
    }
    
    // Atualiza classes visuais dos cards
    if (farmerId === 'russo') {
      farmerCardRusso.classList.add('active');
      farmerCardBruno.classList.remove('active');
    } else {
      farmerCardBruno.classList.add('active');
      farmerCardRusso.classList.remove('active');
    }
    
    // Limpa erros
    const produtorError = document.getElementById('produtor-error');
    if (produtorError) {
      produtorError.textContent = '';
      produtorError.style.display = 'none';
    }
    
    // Atualiza os preços exibidos nos cards de Cesta (Passo 3)
    updateBasketCardPrices(farmerId);
    
    // Recalcula totais
    calculateTotals();
  }

  if (farmerCardRusso) {
    farmerCardRusso.addEventListener('click', () => {
      if (!farmerCardRusso.classList.contains('disabled')) {
        selectFarmer('russo');
      }
    });
  }

  if (farmerCardBruno) {
    farmerCardBruno.addEventListener('click', () => {
      if (!farmerCardBruno.classList.contains('disabled')) {
        selectFarmer('bruno');
      }
    });
  }

  function updateBasketCardPrices(farmerId) {
    const farmer = farmersData[farmerId];
    if (!farmer) return;
    
    const priceFamilia = document.getElementById('price-basket-familia');
    const priceIndividual = document.getElementById('price-basket-individual');
    const priceQuinzenal = document.getElementById('price-basket-quinzenal');
    const priceUnitaria = document.getElementById('price-basket-unitaria');
    
    if (priceFamilia) priceFamilia.textContent = farmer.prices.familia.total.toFixed(2).replace('.', ',');
    if (priceIndividual) priceIndividual.textContent = farmer.prices.individual.total.toFixed(2).replace('.', ',');
    if (priceQuinzenal) priceQuinzenal.textContent = farmer.prices.quinzenal.total.toFixed(2).replace('.', ',');
    if (priceUnitaria) priceUnitaria.textContent = farmer.prices.unitaria.total.toFixed(2).replace('.', ',');
  }

  function checkFarmerAvailability() {
    const selectedBairro = neighborhoodSelect.value;
    const selectedRegion = regionSelect.value;
    
    if (!selectedBairro) return;
    
    // Verifica se russo atende o bairro
    const russoRoutes = routesConfig.russo;
    const russoEligible = russoRoutes.bairros.includes(selectedBairro);
    
    // Verifica se bruno atende o bairro
    const brunoRoutes = routesConfig.bruno;
    const brunoEligible = brunoRoutes.bairros.includes(selectedBairro);
    
    const badgeRusso = document.getElementById('badge-russo');
    const badgeBruno = document.getElementById('badge-bruno');
    const deliveryDayBruno = document.getElementById('delivery-day-bruno');
    
    // Atualiza o dia de entrega textual do Bruno com base na rota
    if (deliveryDayBruno) {
      if (selectedRegion === 'barra-recreio') {
        deliveryDayBruno.textContent = 'Terça-feira';
      } else {
        deliveryDayBruno.textContent = 'Quarta-feira';
      }
    }
    
    // Atualiza Russo
    if (russoEligible) {
      farmerCardRusso.classList.remove('disabled');
      if (badgeRusso) {
        badgeRusso.textContent = 'Atende seu bairro';
        badgeRusso.style.backgroundColor = 'var(--color-primary-light)';
      }
    } else {
      farmerCardRusso.classList.add('disabled');
      farmerCardRusso.classList.remove('active');
      if (badgeRusso) {
        badgeRusso.textContent = 'Fora de rota';
        badgeRusso.style.backgroundColor = '#adb5bd';
      }
    }
    
    // Atualiza Bruno
    if (brunoEligible) {
      farmerCardBruno.classList.remove('disabled');
      if (badgeBruno) {
        if (selectedBairro === 'santa-teresa') {
          badgeBruno.textContent = 'Sob Confirmação';
          badgeBruno.style.backgroundColor = 'var(--color-secondary)';
        } else {
          badgeBruno.textContent = 'Atende seu bairro';
          badgeBruno.style.backgroundColor = 'var(--color-primary-light)';
        }
      }
    } else {
      farmerCardBruno.classList.add('disabled');
      farmerCardBruno.classList.remove('active');
      if (badgeBruno) {
        badgeBruno.textContent = 'Fora de rota';
        badgeBruno.style.backgroundColor = '#adb5bd';
      }
    }
    
    // Se o agricultor anteriormente selecionado foi desativado pela rota, limpa a seleção
    const activeProdutorName = hiddenProdutor.value;
    if (activeProdutorName) {
      if (activeProdutorName === farmersData.russo.name && !russoEligible) {
        hiddenProdutor.value = '';
        hiddenDiaEntrega.value = '';
        farmerCardRusso.classList.remove('active');
      } else if (activeProdutorName === farmersData.bruno.name && !brunoEligible) {
        hiddenProdutor.value = '';
        hiddenDiaEntrega.value = '';
        farmerCardBruno.classList.remove('active');
      }
    }
    
    // Pré-seleciona se apenas um agricultor for elegível
    if (russoEligible && !brunoEligible) {
      selectFarmer('russo');
    } else if (brunoEligible && !russoEligible) {
      selectFarmer('bruno');
    }
  }



  // ==========================================================================
  // 8. Cálculos Financeiros Reativos
  // ==========================================================================
  const basketRadios = document.querySelectorAll('input[name="cesta"]');
  const eggsRadios = document.querySelectorAll('input[name="ovos"]');

  // MOCK_TODAY para testes de faturamento proporcional. Defina uma data string (ex: '2026-05-15') para simular.
  const MOCK_TODAY = null;

  function getRemainingDeliveries(deliveryDayName) {
    if (!deliveryDayName) return 4;
    
    const dayMap = {
      'terça-feira': 2,
      'terça': 2,
      'quarta-feira': 3,
      'quarta': 3
    };
    
    const targetDay = dayMap[deliveryDayName.toLowerCase()] || 3;
    
    const today = MOCK_TODAY ? new Date(MOCK_TODAY) : new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let count = 0;
    
    // Contamos os dias restantes (começando a partir do dia seguinte a hoje)
    for (let d = today.getDate() + 1; d <= lastDayOfMonth; d++) {
      const dateToCheck = new Date(currentYear, currentMonth, d);
      if (dateToCheck.getDay() === targetDay) {
        count++;
      }
    }
    
    return count;
  }

  function getProportionalMultiplier(deliveryDayName, basketType) {
    if (basketType !== 'familia' && basketType !== 'individual') {
      return { multiplier: 1.0, count: 4 };
    }
    
    const count = getRemainingDeliveries(deliveryDayName);
    
    if (count === 0 || count >= 4) {
      return { multiplier: 1.0, count: count === 0 ? 4 : count };
    }
    
    return { multiplier: count * 0.25, count: count };
  }

  function updateEggCardPrices() {
    const activeBasket = Array.from(basketRadios).find(r => r.checked);
    if (!activeBasket) return;
    const basketType = activeBasket.value; // 'familia', 'individual', 'quinzenal', 'unitaria'
    
    let deliveries = 4;
    let periodText = '/mês';
    if (basketType === 'quinzenal') {
      deliveries = 2;
      periodText = '/mês';
    } else if (basketType === 'unitaria') {
      deliveries = 1;
      periodText = '';
    }

    const price1 = deliveries * 1 * 16;
    const price2 = deliveries * 2 * 16;
    const price3 = deliveries * 3 * 16;

    const qty1Span = document.getElementById('price-qty-1');
    const qty2Span = document.getElementById('price-qty-2');
    const qty3Span = document.getElementById('price-qty-3');

    if (qty1Span) qty1Span.textContent = `+R$ ${price1.toFixed(2).replace('.', ',')}${periodText}`;
    if (qty2Span) qty2Span.textContent = `+R$ ${price2.toFixed(2).replace('.', ',')}${periodText}`;
    if (qty3Span) qty3Span.textContent = `+R$ ${price3.toFixed(2).replace('.', ',')}${periodText}`;

    // Atualiza o preço exibido no card principal "Adicionar Ovos Caipiras" (#price-eggs-add)
    const activeQtyRadio = Array.from(eggsQtyRadios).find(r => r.checked) || { value: '1' };
    const currentQty = parseInt(activeQtyRadio.value, 10) || 1;
    const currentPrice = deliveries * currentQty * 16;
    const priceEggsAddSpan = document.getElementById('price-eggs-add');
    if (priceEggsAddSpan) {
      priceEggsAddSpan.textContent = `+R$ ${currentPrice.toFixed(2).replace('.', ',')}${periodText}`;
    }
  }

  function calculateTotals() {
    const activeBasket = Array.from(basketRadios).find(r => r.checked);
    if (!activeBasket) return;
    
    const basketType = activeBasket.value; // 'familia', 'individual', 'quinzenal', 'unitaria'
    const farmer = farmersData[selectedFarmerId] || farmersData.russo;
    
    const priceData = farmer.prices[basketType];
    const basketTotalValue = priceData.total;
    const basketLabel = activeBasket.getAttribute('data-label');
    
    const isQuinzenal = basketType === 'quinzenal';
    const isUnitaria = basketType === 'unitaria';
    
    const activeEggs = Array.from(eggsRadios).find(r => r.checked);
    const activeQtyRadio = Array.from(eggsQtyRadios).find(r => r.checked) || { value: '1' };
    const currentQty = parseInt(activeQtyRadio.value, 10) || 1;

    let deliveries = 4;
    if (basketType === 'quinzenal') {
      deliveries = 2;
    } else if (basketType === 'unitaria') {
      deliveries = 1;
    }

    let eggsValue = 0;
    if (activeEggs && activeEggs.value === 'adicionar') {
      eggsValue = deliveries * currentQty * 16;
    }
    
    const eggsLabel = activeEggs && activeEggs.value === 'adicionar' 
      ? `Com Ovos Caipiras (${currentQty} ${currentQty === 1 ? 'dúzia' : 'dúzias'})` 
      : 'Sem Ovos';

    const feeValue = prices.adesao;

    const monthlyTotal = isUnitaria ? 0 : (basketTotalValue + eggsValue);
    
    // Lógica Proporcional
    const deliveryDay = hiddenDiaEntrega.value || 'Quarta-feira';
    const prop = getProportionalMultiplier(deliveryDay, basketType);
    
    // Proporcional afeta valor da cesta e dos ovos no pagamento inicial
    const initialPaymentTotal = (basketTotalValue * prop.multiplier) + (eggsValue * prop.multiplier) + feeValue;
    
    const proportionalNote = prop.multiplier < 1.0 
      ? `Proporcional: ${prop.count} ${prop.count === 1 ? 'entrega' : 'entregas'} restante(s)` 
      : 'Integral';

    // Atualiza a nota explicativa do checkout
    const summaryFeeNote = document.querySelector('.fee-note');
    if (summaryFeeNote) {
      if (prop.multiplier < 1.0) {
        summaryFeeNote.innerHTML = `(Mensalidade Proporcional: ${prop.count} ${prop.count === 1 ? 'entrega restando' : 'entregas restando'} + Adesão)`;
      } else {
        if (isUnitaria) {
          summaryFeeNote.innerHTML = `(Entrega Avulsa + Adesão)`;
        } else {
          summaryFeeNote.innerHTML = `(Mensalidade Integral + Adesão)`;
        }
      }
    }

    if (summaryBasketRowName) {
      summaryBasketRowName.innerHTML = `${basketLabel} <small style="display:block; font-size:0.75rem; color:var(--color-text-secondary); font-weight:600;">(${isQuinzenal ? 'Quinzenal' : isUnitaria ? 'Entrega Avulsa' : 'Semanal'})</small>`;
      summaryBasketRowValue.textContent = `R$ ${basketTotalValue.toFixed(2).replace('.', ',')}`;
      
      summaryEggsRowName.textContent = eggsLabel;
      summaryEggsRowValue.textContent = eggsValue > 0 ? `+ R$ ${eggsValue.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
      
      summaryTotalMonthly.textContent = isUnitaria 
        ? 'R$ 0,00' 
        : `R$ ${monthlyTotal.toFixed(2).replace('.', ',')}`;
        
      summaryTotalInitial.textContent = `R$ ${initialPaymentTotal.toFixed(2).replace('.', ',')}`;
    }

    return {
      basketLabel,
      basketValue: basketTotalValue,
      basketType,
      eggsLabel,
      eggsValue,
      feeValue,
      monthlyTotal,
      initialPaymentTotal,
      proportionalMultiplier: prop.multiplier,
      remainingCount: prop.count,
      proportionalNote
    };
  }

  // Event Listeners para reatividade
  basketRadios.forEach(r => r.addEventListener('change', () => {
    updateEggCardPrices();
    calculateTotals();
  }));
  
  eggsRadios.forEach(r => r.addEventListener('change', () => {
    const activeEggs = Array.from(eggsRadios).find(opt => opt.checked);
    if (activeEggs && activeEggs.value === 'adicionar') {
      eggQuantitySelectorContainer.classList.remove('hidden');
    } else {
      eggQuantitySelectorContainer.classList.add('hidden');
    }
    updateEggCardPrices();
    calculateTotals();
  }));

  eggsQtyRadios.forEach(r => r.addEventListener('change', () => {
    updateEggCardPrices();
    calculateTotals();
  }));

  // Alterna o estilo visual do seletor de pagamento (Pix/Boleto)
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      paymentRadios.forEach(r => {
        const card = r.closest('.payment-card');
        if (card) {
          if (r.checked) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    });
  });

  updateEggCardPrices();
  calculateTotals();

  // ==========================================================================
  // 9. Validação e Feedback
  // ==========================================================================
  function showFieldError(input, message) {
    const group = input.closest('.form-group') || input.closest('.agreement-container');
    if (group) {
      group.classList.add('has-error');
    }
    
    const errorSpan = document.getElementById(`${input.name || input.id}-error`);
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.style.display = 'block';
    }
  }

  function deleteFieldError(input) {
    const group = input.closest('.form-group') || input.closest('.agreement-container');
    if (group) {
      group.classList.remove('has-error');
    }
    
    const errorSpan = document.getElementById(`${input.name || input.id}-error`);
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.style.display = 'none';
    }
  }

  const inputsToValidate = form.querySelectorAll('input[required], select[required], textarea[required]');
  inputsToValidate.forEach((input) => {
    input.addEventListener('blur', () => {
      validateField(input);
    });

    input.addEventListener('input', () => {
      deleteFieldError(input);
    });
  });

  function validateField(input) {
    if (input.type === 'checkbox') {
      if (!input.checked) {
        showFieldError(input, 'Você precisa aceitar os termos do pacto de confiança.');
        return false;
      }
      deleteFieldError(input);
      return true;
    }

    const val = input.value.trim();
    if (!val) {
      showFieldError(input, 'Este campo é de preenchimento obrigatório.');
      return false;
    }

    if (input.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        showFieldError(input, 'Por favor, insira um e-mail válido.');
        return false;
      }
    }

    if (input.name === 'telefone') {
      const numbers = val.replace(/\D/g, '');
      if (numbers.length < 10 || numbers.length > 11) {
        showFieldError(input, 'Insira um telefone/WhatsApp válido com DDD.');
        return false;
      }
    }

    if (input.name === 'cpf') {
      const numbers = val.replace(/\D/g, '');
      if (numbers.length !== 11) {
        showFieldError(input, 'CPF deve possuir 11 dígitos.');
        return false;
      }
      if (!validateCPF(numbers)) {
        showFieldError(input, 'CPF informado é inválido.');
        return false;
      }
    }

    if (input.name === 'cep') {
      const numbers = val.replace(/\D/g, '');
      if (numbers.length !== 8) {
        showFieldError(input, 'CEP inválido. Deve possuir 8 números.');
        return false;
      }
    }

    deleteFieldError(input);
    return true;
  }

  function validateCPF(cpf) {
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
  }

  function validateStep(step) {
    if (step === 'intro') return true;
    
    // Validação personalizada para o Passo 2 (Escolha do Agricultor)
    if (step === 2) {
      if (!hiddenProdutor.value) {
        const produtorError = document.getElementById('produtor-error');
        if (produtorError) {
          produtorError.textContent = 'Por favor, selecione um agricultor parceiro para prosseguir.';
          produtorError.style.display = 'block';
        }
        return false;
      } else {
        const produtorError = document.getElementById('produtor-error');
        if (produtorError) {
          produtorError.textContent = '';
          produtorError.style.display = 'none';
        }
      }
      return true;
    }
    
    const pane = document.getElementById(`step-pane-${step}`);
    const inputs = pane.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach((input) => {
      const fieldValid = validateField(input);
      if (!fieldValid) {
        isValid = false;
      }
    });

    return isValid;
  }

  // ==========================================================================
  // 10. Submissão do Formulário
  // ==========================================================================
  function submitForm() {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando...';

    const calc = calculateTotals();
    const formData = new FormData(form);
    
    // Obtenção da observação original e adição do dado do proporcional
    let obsText = formData.get('observacoes') || 'Nenhuma';
    if (calc.proportionalNote !== 'Integral') {
      obsText = obsText !== 'Nenhuma' 
        ? `${obsText} | Cobrança Proporcional: ${calc.proportionalNote}`
        : `Cobrança Proporcional: ${calc.proportionalNote}`;
    }

    // Identifica o método de pagamento selecionado (Pix ou Boleto)
    const activePayment = Array.from(paymentRadios).find(r => r.checked) || { value: 'PIX' };
    const billingType = activePayment.value; // 'PIX' ou 'BOLETO'

    const data = {
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      cpf: formData.get('cpf'),
      regiao: regionSelect.options[regionSelect.selectedIndex].text,
      produtor: hiddenProdutor.value,
      diaEntrega: hiddenDiaEntrega.value,
      cestaTipo: calc.basketLabel,
      cestaValor: `R$ ${calc.basketValue.toFixed(2).replace('.', ',')}`,
      ovosTipo: calc.eggsLabel,
      ovosValor: `R$ ${calc.eggsValue.toFixed(2).replace('.', ',')}`,
      cep: formData.get('cep'),
      endereco: `${formData.get('endereco')}, Nº ${formData.get('numero')}${formData.get('complemento') ? ' - ' + formData.get('complemento') : ''}`,
      bairro: formData.get('bairro'),
      pontoReferencia: formData.get('pontoReferencia') || 'Não informado',
      horario: "Horário Comercial",
      vizinho: selectVizinho.value === 'vizinho' && inputVizinhoDetalhes && inputVizinhoDetalhes.value.trim()
        ? `Deixar com Vizinho: ${inputVizinhoDetalhes.value.trim()}`
        : selectVizinho.options[selectVizinho.selectedIndex].text,
      comoConheceu: document.getElementById('select-comoConheceu').options[document.getElementById('select-comoConheceu').selectedIndex].text,
      observacoes: obsText,
      totalMensal: `R$ ${calc.monthlyTotal.toFixed(2).replace('.', ',')}`,
      primeiroPagamento: `R$ ${calc.initialPaymentTotal.toFixed(2).replace('.', ',')}`,
      primeiroPagamentoNota: calc.proportionalNote,
      formaPagamento: billingType,
      statusAssinatura: 'Pendente'
    };

    // Payload completo para o Asaas e ingestão no sistema
    const apiPayload = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cpf: data.cpf,
      cep: data.cep,
      endereco: formData.get('endereco'),
      numero: formData.get('numero'),
      complemento: formData.get('complemento') || '',
      bairro: data.bairro,
      regiao: data.regiao || 'Rio de Janeiro',
      pontoReferencia: data.pontoReferencia || 'Não informado',
      horario: data.horario || 'Horário Comercial',
      vizinho: data.vizinho || 'Deixar no local',
      comoConheceu: data.comoConheceu || 'Não informado',
      observacoes: data.observacoes || 'Inscrição realizada pelo formulário do site',
      produtor: data.produtor,
      diaEntrega: data.diaEntrega,
      cestaTipo: calc.basketLabel,
      cestaValor: data.cestaValor,
      ovosTipo: data.ovosTipo,
      ovosValor: data.ovosValor,
      totalMensal: data.totalMensal,
      primeiroPagamento: data.primeiroPagamento,
      valor: calc.initialPaymentTotal,
      billingType: billingType,
      dataHora: new Date().toISOString()
    };

    // Chamar backend para criar a cobrança real no Asaas
    fetch('/api/criar-pagamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Erro na resposta do servidor') });
      }
      return res.json();
    })
    .then(paymentResult => {
      // Inserir os retornos do Asaas nos dados cadastrados
      data.asaasPaymentId = paymentResult.paymentId;
      
      if (billingType === 'PIX') {
        data.pixCode = paymentResult.pixCode;
        data.pixQrCode = paymentResult.pixQrCode;
        data.bankSlipUrl = '';
      } else {
        data.pixCode = '';
        data.pixQrCode = '';
        data.bankSlipUrl = paymentResult.bankSlipUrl;
        data.invoiceUrl = paymentResult.invoiceUrl;
      }

      // Salvar os dados na Planilha Google Sheets
      const sheetsUrl = window.GOOGLE_SHEETS_WEBAPP_URL || '';
      if (sheetsUrl) {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(() => {
          proceedToSuccess(data);
        })
        .catch((err) => {
          console.error('Erro na gravação da planilha:', err);
          proceedToSuccess(data);
        });
      } else {
        proceedToSuccess(data);
      }
    })
    .catch(err => {
      console.error('Erro ao gerar cobrança no Asaas:', err);
      // Alerta amigável em caso de erro na API do Asaas e fallback de contingência
      alert(`Informação: Integração financeira em modo de contingência. A inscrição será registrada normalmente.`);
      
      data.asaasPaymentId = 'CONTINGENCIA-ESTATICA';
      data.pixCode = '00020101021226870014br.gov.bcb.pix2565pix-comunitario-organicamente-csa@bcb.gov.br5204000053039865406175.005802BR5921ORGANICAMENTE%20CSA6009SAO%20PAULO62070503***6304CA4D'; // Pix estático de contingência
      data.bankSlipUrl = '';
      data.formaPagamento = 'PIX'; // Força PIX no fallback de erro

      const sheetsUrl = window.GOOGLE_SHEETS_WEBAPP_URL || '';
      if (sheetsUrl) {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(() => {
          proceedToSuccess(data);
        })
        .catch(() => {
          proceedToSuccess(data);
        });
      } else {
        proceedToSuccess(data);
      }
    });
  }

  function proceedToSuccess(data) {
    mainContent.classList.add('hidden');
    minimalProgressBar.classList.add('hidden');
    onboardingBrand.classList.add('hidden');
    
    if (successUserName) {
      successUserName.textContent = data.nome.split(' ')[0];
    }
    successBasketType.textContent = data.cestaTipo;
    successEggsType.textContent = data.ovosTipo;
    successFarmerName.textContent = data.produtor;
    successDeliveryDay.textContent = data.diaEntrega;
    successAddress.textContent = `${data.endereco} - ${data.bairro}`;
    
    successMonthlyValue.textContent = data.totalMensal;
    successFeeValue.textContent = `R$ ${prices.adesao.toFixed(2).replace('.', ',')}`;

    // Atualiza a exibição de Pix ou Boleto dinamicamente na tela de sucesso
    const successPixBox = document.getElementById('success-pix-box');
    const successBoletoBox = document.getElementById('success-boleto-box');
    const successFirstPaymentValueBoleto = document.getElementById('success-first-payment-value-boleto');
    const boletoDownloadBtn = document.getElementById('boleto-download-btn');

    if (data.formaPagamento === 'BOLETO') {
      if (successPixBox) successPixBox.classList.add('hidden');
      if (successBoletoBox) {
        successBoletoBox.classList.remove('hidden');
        if (successFirstPaymentValueBoleto) {
          successFirstPaymentValueBoleto.textContent = data.primeiroPagamento;
        }
        if (boletoDownloadBtn) {
          boletoDownloadBtn.href = data.bankSlipUrl || data.invoiceUrl || '#';
        }
      }
    } else {
      if (successBoletoBox) successBoletoBox.classList.add('hidden');
      if (successPixBox) {
        successPixBox.classList.remove('hidden');
        if (successFirstPaymentValue) {
          successFirstPaymentValue.textContent = data.primeiroPagamento;
        }
        if (pixCodeInput && data.pixCode) {
          pixCodeInput.value = data.pixCode;
        }
      }
    }

    // Atualiza as instruções do Pix para explicar o valor proporcional se houver
    const pixInstructions = document.querySelector('.pix-instructions');
    if (pixInstructions) {
      if (data.primeiroPagamentoNota && data.primeiroPagamentoNota !== 'Integral') {
        pixInstructions.innerHTML = `Realize o pagamento do Pix Copia e Cola abaixo <strong>(${data.primeiroPagamentoNota})</strong> e envie o comprovante de adesão pelo WhatsApp para ativação final da sua entrega.`;
      } else {
        pixInstructions.textContent = `Realize o pagamento do Pix Copia e Cola abaixo e envie o comprovante de adesão pelo WhatsApp para ativação final da sua entrega.`;
      }
    }

    // Whatsapp Direct
    const paymentNoteText = data.primeiroPagamentoNota && data.primeiroPagamentoNota !== 'Integral'
      ? `(Adesão de R$ 35,00 + Mensalidade Proporcional: ${data.primeiroPagamentoNota})`
      : `(Adesão de R$ 35,00 + Mensalidade Integral)`;

    const phoneNumber = '5521996751722';
    
    let whatsappMessage = `Olá, equipe Organicamente! 🌱\n\nAcabei de finalizar minha inscrição pelo site e gostaria de confirmar minha adesão. Seguem meus dados:\n\n` +
      `👤 *Nome:* ${data.nome}\n` +
      `📞 *Tel:* ${data.telefone}\n` +
      `💳 *CPF:* ${data.cpf}\n` +
      `📍 *Região/Bairro:* ${data.regiao} / ${data.bairro}\n` +
      `🌾 *Produtor Alocado:* ${data.produtor} (${data.diaEntrega})\n` +
      `🧺 *Assinatura:* ${data.cestaTipo}\n` +
      `🥚 *Ovos:* ${data.ovosTipo}\n` +
      `🚚 *Endereço:* ${data.endereco}\n` +
      `⏰ *Janela de Horário:* ${data.horario}\n` +
      `🏡 *Onde deixar:* ${data.vizinho}\n\n` +
      `💵 *Primeiro Pagamento:* ${data.primeiroPagamento} ${paymentNoteText}\n`;

    if (data.formaPagamento === 'BOLETO') {
      whatsappMessage += `📄 *Método:* Boleto Bancário\n` +
        `🔗 *Link do Boleto:* ${data.bankSlipUrl || data.invoiceUrl}\n\n` +
        `*Aguardando compensação do boleto para ativação da assinatura!*`;
    } else {
      whatsappMessage += `⚡ *Método:* Pix\n\n` +
        `*Aguardando PIX para confirmação e ativação da assinatura!*`;
    }

    const encodedMessage = encodeURIComponent(whatsappMessage);
    whatsappSubmitBtn.href = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    successScreen.classList.remove('hidden');
  }

  // ==========================================================================
  // 11. Copiar Código Pix Copia e Cola
  // ==========================================================================
  if (pixCopyBtn && pixCodeInput && pixCopyFeedback) {
    pixCopyBtn.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pixCodeInput.value)
          .then(() => {
            showCopyFeedback();
          })
          .catch(err => {
            console.error('Erro ao copiar código Pix via Clipboard API:', err);
            fallbackCopyText();
          });
      } else {
        fallbackCopyText();
      }
    });
  }

  function showCopyFeedback() {
    pixCopyFeedback.textContent = 'Código Pix copiado!';
    
    // Altera temporariamente o visual do botão
    const originalBtnText = pixCopyBtn.innerHTML;
    pixCopyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Copiado!</span>
    `;
    pixCopyBtn.style.backgroundColor = 'var(--color-success)';
    pixCopyBtn.style.borderColor = 'var(--color-success)';
    pixCopyBtn.style.color = '#ffffff';
    
    setTimeout(() => {
      pixCopyFeedback.textContent = '';
      pixCopyBtn.innerHTML = originalBtnText;
      pixCopyBtn.style.backgroundColor = '';
      pixCopyBtn.style.borderColor = '';
      pixCopyBtn.style.color = '';
    }, 2000);
  }

  function fallbackCopyText() {
    try {
      pixCodeInput.select();
      pixCodeInput.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      if (successful) {
        showCopyFeedback();
      } else {
        pixCopyFeedback.textContent = 'Não foi possível copiar. Selecione e copie manualmente.';
      }
    } catch (err) {
      console.error('Erro no fallback de cópia do Pix:', err);
      pixCopyFeedback.textContent = 'Não foi possível copiar. Selecione e copie manualmente.';
    }
  }

  showStep('intro');
});
