// Sistema de Agendamento - Painel Administrativo

class AdminPanel {
    constructor() {
        this.services = [];
        this.schedule = {};
        this.businessInfo = {};
        this.appointments = [];
        this.currentTab = 'dashboard';
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.loadColorSettings(); // Carregar configurações de cores
        this.updateDashboard();
        this.loadServices();
        this.loadSchedule();
        this.loadBusinessInfo();
        this.loadDashboardConfig(); // Carregar configurações do dashboard
    }

    // Carregar dados salvos
    loadData() {
        this.services = JSON.parse(localStorage.getItem('services') || '[]');
        this.schedule = JSON.parse(localStorage.getItem('schedule') || '{}');
        this.businessInfo = JSON.parse(localStorage.getItem('businessInfo') || '{}');
        this.appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    }

    // Configurar event listeners
    setupEventListeners() {
        // Navegação entre abas
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Formulário de serviços
        const serviceForm = document.getElementById('serviceForm');
        serviceForm.addEventListener('submit', (e) => this.handleServiceSubmit(e));

        // Formulário de configurações da empresa
        const businessForm = document.getElementById('businessForm');
        businessForm.addEventListener('submit', (e) => this.handleBusinessSubmit(e));

        // Controles de horário
        const addTimeSlotBtn = document.getElementById('addTimeSlot');
        const validateScheduleBtn = document.getElementById('validateSchedule');
        
        addTimeSlotBtn.addEventListener('click', () => this.showTimeSlotModal());
        validateScheduleBtn.addEventListener('click', () => this.validateSchedule());

        // Filtros de agendamentos
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyAppointmentFilters());
        }

        // Exportar agendamentos
        const exportBtn = document.getElementById('exportAppointments');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAppointments());
        }

        // Modal de horário
        const timeSlotModal = document.getElementById('timeSlotModal');
        const closeBtn = timeSlotModal.querySelector('.close');
        const timeSlotForm = document.getElementById('timeSlotForm');

        closeBtn.addEventListener('click', () => this.closeTimeSlotModal());
        timeSlotForm.addEventListener('submit', (e) => this.handleTimeSlotSubmit(e));

        window.addEventListener('click', (e) => {
            if (e.target === timeSlotModal) this.closeTimeSlotModal();
        });

        // Atualizar cores em tempo real
        const colorInputs = document.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('change', () => this.updateColorsPreview());
        });

        // Configurações do dashboard
        const saveConfigBtn = document.getElementById('saveDashboardConfig');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveDashboardConfig());
        }
        const resetConfigBtn = document.getElementById('resetDashboardConfig');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => this.resetDashboardConfig());
        }
    }

    // Alternar entre abas
    switchTab(tabName) {
        // Remover classe active de todas as abas e botões
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // Ativar aba e botão selecionados
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.currentTab = tabName;

        // Atualizar conteúdo específico da aba
        if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'appointments') {
            this.loadAppointmentsTable();
        } else if (tabName === 'schedule') {
            this.loadSchedule();
        }
    }

    // Atualizar dashboard
    updateDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Contadores
        const todayAppointments = this.appointments.filter(apt => apt.date === today).length;
        const weekAppointments = this.appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= weekStart && aptDate <= weekEnd;
        }).length;

        const totalServices = this.services.length;
        const activeSlots = Object.values(this.schedule).reduce((total, day) => total + day.length, 0);

        // Calcular faturamento diário (apenas serviços realizados)
        const todayRevenue = this.calculateDailyRevenue(today);
        const weekRevenue = this.calculateWeeklyRevenue(weekStart, weekEnd);
        
        // Calcular estatísticas de agendamentos
        const confirmedAppointments = this.appointments.filter(apt => apt.status === 'confirmed').length;
        const pendingAppointments = this.appointments.filter(apt => apt.status === 'pending').length;
        const completedAppointments = this.appointments.filter(apt => apt.status === 'completed').length;
        const totalAppointments = this.appointments.length;
        
        // Calcular clientes atendidos (apenas serviços realizados)
        const uniqueClientsServed = new Set(this.appointments.filter(apt => apt.status === 'completed').map(apt => apt.clientPhone)).size;

        // Atualizar elementos
        document.getElementById('todayAppointments').textContent = todayAppointments;
        document.getElementById('weekAppointments').textContent = weekAppointments;
        document.getElementById('totalServices').textContent = totalServices;
        document.getElementById('activeSlots').textContent = activeSlots;

        // Atualizar dashboard com informações de faturamento
        this.updateDashboardCards(todayRevenue, weekRevenue, uniqueClientsServed, confirmedAppointments, pendingAppointments, completedAppointments, totalAppointments);
        
        // Carregar relatório de faturamento por serviço
        this.loadRevenueReport();
        
        // Agendamentos pendentes
        this.loadPendingAppointments();
        
        // Agendamentos confirmados
        this.loadConfirmedAppointments();
        
        // Agendamentos recentes
        this.loadRecentAppointments();
    }

    // Atualizar cards do dashboard
    updateDashboardCards(todayRevenue, weekRevenue, uniqueClientsServed, confirmedAppointments, pendingAppointments, completedAppointments, totalAppointments) {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        
        // Atualizar ou criar cards de faturamento
        let revenueCard = dashboardGrid.querySelector('.revenue-card');
        if (!revenueCard) {
            revenueCard = document.createElement('div');
            revenueCard.className = 'dashboard-card revenue-card';
            dashboardGrid.appendChild(revenueCard);
        }
        
        revenueCard.innerHTML = `
            <i class="fas fa-dollar-sign"></i>
            <h3>Faturamento Hoje</h3>
            <p>R$ ${todayRevenue.toFixed(2)}</p>
        `;

        let weekRevenueCard = dashboardGrid.querySelector('.week-revenue-card');
        if (!weekRevenueCard) {
            weekRevenueCard = document.createElement('div');
            weekRevenueCard.className = 'dashboard-card week-revenue-card';
            dashboardGrid.appendChild(weekRevenueCard);
        }
        
        weekRevenueCard.innerHTML = `
            <i class="fas fa-chart-line"></i>
            <h3>Faturamento Semana</h3>
            <p>R$ ${weekRevenue.toFixed(2)}</p>
        `;

        let clientsCard = dashboardGrid.querySelector('.clients-card');
        if (!clientsCard) {
            clientsCard = document.createElement('div');
            clientsCard.className = 'dashboard-card clients-card';
            dashboardGrid.appendChild(clientsCard);
        }
        
        clientsCard.innerHTML = `
            <i class="fas fa-users"></i>
            <h3>Clientes Atendidos</h3>
            <p>${uniqueClientsServed} únicos</p>
        `;

        let confirmedCard = dashboardGrid.querySelector('.confirmed-card');
        if (!confirmedCard) {
            confirmedCard = document.createElement('div');
            confirmedCard.className = 'dashboard-card confirmed-card';
            dashboardGrid.appendChild(confirmedCard);
        }
        
        confirmedCard.innerHTML = `
            <i class="fas fa-calendar-check"></i>
            <h3>Confirmados</h3>
            <p>${confirmedAppointments}</p>
        `;

        let pendingCard = dashboardGrid.querySelector('.pending-card');
        if (!pendingCard) {
            pendingCard = document.createElement('div');
            pendingCard.className = 'dashboard-card pending-card';
            dashboardGrid.appendChild(pendingCard);
        }
        
        pendingCard.innerHTML = `
            <i class="fas fa-clock"></i>
            <h3>Pendentes</h3>
            <p>${pendingAppointments}</p>
        `;

        let completedCard = dashboardGrid.querySelector('.completed-card');
        if (!completedCard) {
            completedCard = document.createElement('div');
            completedCard.className = 'dashboard-card completed-card';
            dashboardGrid.appendChild(completedCard);
        }
        
        completedCard.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <h3>Realizados</h3>
            <p>${completedAppointments}</p>
        `;

        let totalCard = dashboardGrid.querySelector('.total-card');
        if (!totalCard) {
            totalCard = document.createElement('div');
            totalCard.className = 'dashboard-card total-card';
            dashboardGrid.appendChild(totalCard);
        }
        
        totalCard.innerHTML = `
            <i class="fas fa-calendar-alt"></i>
            <h3>Total Geral</h3>
            <p>${totalAppointments}</p>
        `;
    }

    // Calcular faturamento diário (apenas serviços realizados)
    calculateDailyRevenue(date) {
        const dayAppointments = this.appointments.filter(apt => 
            apt.date === date && apt.status === 'completed'
        );
        
        return dayAppointments.reduce((total, apt) => {
            const service = this.services.find(s => s.id === apt.serviceId);
            return total + (service ? service.price : 0);
        }, 0);
    }

    // Calcular faturamento semanal (apenas serviços realizados)
    calculateWeeklyRevenue(startDate, endDate) {
        const weekAppointments = this.appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= startDate && aptDate <= endDate && apt.status === 'completed';
        });
        
        return weekAppointments.reduce((total, apt) => {
            const service = this.services.find(s => s.id === apt.serviceId);
            return total + (service ? service.price : 0);
        }, 0);
    }

    // Carregar relatório de faturamento por serviço
    loadRevenueReport() {
        const dashboard = document.getElementById('dashboard');
        
        // Verificar se já existe a seção de relatório
        let revenueReportSection = dashboard.querySelector('.revenue-report');
        if (!revenueReportSection) {
            revenueReportSection = document.createElement('div');
            revenueReportSection.className = 'revenue-report';
            revenueReportSection.innerHTML = `
                <h3>Relatório de Faturamento por Serviço</h3>
                <div class="revenue-chart">
                    <div id="revenueChart" class="chart-container"></div>
                </div>
            `;
            
            // Inserir após os agendamentos recentes
            const recentSection = dashboard.querySelector('.recent-appointments');
            if (recentSection) {
                recentSection.parentNode.insertBefore(revenueReportSection, recentSection.nextSibling);
            } else {
                dashboard.appendChild(revenueReportSection);
            }
        }

        this.generateRevenueChart();
    }

    // Gerar gráfico de faturamento
    generateRevenueChart() {
        const chartContainer = document.getElementById('revenueChart');
        if (!chartContainer) return;

        // Calcular faturamento por serviço nos últimos 30 dias (apenas serviços realizados)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentAppointments = this.appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= thirtyDaysAgo && apt.status === 'completed';
        });

        // Agrupar por serviço
        const serviceRevenue = {};
        recentAppointments.forEach(apt => {
            const service = this.services.find(s => s.id === apt.serviceId);
            if (service) {
                if (!serviceRevenue[service.name]) {
                    serviceRevenue[service.name] = 0;
                }
                serviceRevenue[service.name] += service.price;
            }
        });

        // Criar gráfico simples
        let chartHTML = '<div class="revenue-bars">';
        Object.entries(serviceRevenue).forEach(([serviceName, revenue]) => {
            const percentage = (revenue / Math.max(...Object.values(serviceRevenue))) * 100;
            chartHTML += `
                <div class="revenue-bar">
                    <div class="bar-label">${serviceName}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-value">R$ ${revenue.toFixed(2)}</div>
                </div>
            `;
        });
        chartHTML += '</div>';

        if (Object.keys(serviceRevenue).length === 0) {
            chartHTML = '<p style="text-align: center; color: #666;">Nenhum faturamento registrado nos últimos 30 dias.</p>';
        }

        chartContainer.innerHTML = chartHTML;
    }

    // Carregar agendamentos pendentes
    loadPendingAppointments() {
        const pendingList = document.getElementById('pendingAppointmentsList');
        if (!pendingList) return;

        const pendingAppointments = this.appointments
            .filter(apt => apt.status === 'pending')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        pendingList.innerHTML = '';

        if (pendingAppointments.length === 0) {
            pendingList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum agendamento pendente.</p>';
            return;
        }

        pendingAppointments.forEach(appointment => {
            const service = this.services.find(s => s.id === appointment.serviceId);
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item pending';
            appointmentItem.innerHTML = `
                <div class="appointment-info">
                    <h4>${appointment.clientName}</h4>
                    <p>${service ? service.name : 'N/A'} - ${this.formatDate(appointment.date)} às ${appointment.time}</p>
                    <p><strong>WhatsApp:</strong> ${appointment.clientPhone}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn-confirm" onclick="adminPanel.confirmAppointment('${appointment.id}')">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                    <button class="btn-reject" onclick="adminPanel.rejectAppointment('${appointment.id}')">
                        <i class="fas fa-times"></i> Rejeitar
                    </button>
                    <button class="btn-whatsapp" onclick="adminPanel.contactClient('${appointment.id}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            `;
            pendingList.appendChild(appointmentItem);
        });
    }

    // Carregar agendamentos confirmados
    loadConfirmedAppointments() {
        const confirmedList = document.getElementById('confirmedAppointmentsList');
        if (!confirmedList) return;

        const confirmedAppointments = this.appointments
            .filter(apt => apt.status === 'confirmed')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        confirmedList.innerHTML = '';

        if (confirmedAppointments.length === 0) {
            confirmedList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum agendamento confirmado.</p>';
            return;
        }

        confirmedAppointments.forEach(appointment => {
            const service = this.services.find(s => s.id === appointment.serviceId);
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item confirmed';
            appointmentItem.innerHTML = `
                <div class="appointment-info">
                    <h4>${appointment.clientName}</h4>
                    <p>${service ? service.name : 'N/A'} - ${this.formatDate(appointment.date)} às ${appointment.time}</p>
                    <p><strong>WhatsApp:</strong> ${appointment.clientPhone}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn-complete" onclick="adminPanel.completeAppointment('${appointment.id}')">
                        <i class="fas fa-check-double"></i> Marcar Realizado
                    </button>
                    <button class="btn-whatsapp" onclick="adminPanel.contactClient('${appointment.id}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            `;
            confirmedList.appendChild(appointmentItem);
        });
    }

    // Carregar agendamentos recentes
    loadRecentAppointments() {
        const recentList = document.getElementById('recentAppointmentsList');
        const recentAppointments = this.appointments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        recentList.innerHTML = '';

        if (recentAppointments.length === 0) {
            recentList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum agendamento ainda.</p>';
            return;
        }

        recentAppointments.forEach(appointment => {
            const service = this.services.find(s => s.id === appointment.serviceId);
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item';
            appointmentItem.innerHTML = `
                <div class="appointment-info">
                    <h4>${appointment.clientName}</h4>
                    <p>${service ? service.name : 'N/A'} - ${this.formatDate(appointment.date)} às ${appointment.time}</p>
                </div>
                <span class="appointment-status ${appointment.status}">${this.getStatusText(appointment.status)}</span>
            `;
            recentList.appendChild(appointmentItem);
        });
    }

    // Carregar serviços
    loadServices() {
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';

        if (this.services.length === 0) {
            servicesList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum serviço cadastrado ainda.</p>';
            return;
        }

        this.services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item';
            serviceItem.innerHTML = `
                <h4>${service.name}</h4>
                <div class="service-details">
                    <span class="service-price">R$ ${service.price}</span>
                    <span class="service-duration">${service.duration} min</span>
                </div>
                ${service.description ? `<div class="service-description">${service.description}</div>` : ''}
                <div class="service-actions">
                    <button class="btn-edit" onclick="adminPanel.editService('${service.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="adminPanel.deleteService('${service.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            servicesList.appendChild(serviceItem);
        });
    }

    // Manipular envio de serviço
    handleServiceSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const service = {
            id: Date.now().toString(),
            name: formData.get('serviceName'),
            price: parseFloat(formData.get('servicePrice')),
            duration: parseInt(formData.get('serviceDuration')),
            description: formData.get('serviceDescription')
        };

        this.services.push(service);
        localStorage.setItem('services', JSON.stringify(this.services));

        this.loadServices();
        this.updateDashboard();
        e.target.reset();

        // Atualizar página principal se estiver aberta
        if (typeof updateMainPage === 'function') {
            updateMainPage();
        }
    }

    // Editar serviço
    editService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        // Preencher formulário
        document.getElementById('serviceName').value = service.name;
        document.getElementById('servicePrice').value = service.price;
        document.getElementById('serviceDuration').value = service.duration;
        document.getElementById('serviceDescription').value = service.description || '';

        // Remover serviço antigo e adicionar novo
        this.services = this.services.filter(s => s.id !== serviceId);
        localStorage.setItem('services', JSON.stringify(this.services));
        this.loadServices();
    }

    // Excluir serviço
    deleteService(serviceId) {
        if (confirm('Tem certeza que deseja excluir este serviço?')) {
            this.services = this.services.filter(s => s.id !== serviceId);
            localStorage.setItem('services', JSON.stringify(this.services));
            this.loadServices();
            this.updateDashboard();

            // Atualizar página principal se estiver aberta
            if (typeof updateMainPage === 'function') {
                updateMainPage();
            }
        }
    }

    // Carregar horários
    loadSchedule() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach(day => {
            const container = document.getElementById(`${day}-slots`);
            const slots = this.schedule[day] || [];
            
            container.innerHTML = '';
            
            if (slots.length === 0) {
                container.innerHTML = '<p style="color: #666; font-size: 0.8rem;">Nenhum horário</p>';
                return;
            }

            slots.forEach(slot => {
                const slotElement = document.createElement('div');
                slotElement.className = 'time-slot available';
                slotElement.innerHTML = `
                    ${slot.time} (${slot.duration} min)
                    <button class="remove-slot" onclick="adminPanel.removeTimeSlot('${day}', '${slot.time}')">×</button>
                `;
                container.appendChild(slotElement);
            });
        });
    }

    // Mostrar modal de horário
    showTimeSlotModal() {
        document.getElementById('timeSlotModal').style.display = 'block';
    }

    // Fechar modal de horário
    closeTimeSlotModal() {
        document.getElementById('timeSlotModal').style.display = 'none';
        document.getElementById('timeSlotForm').reset();
    }

    // Manipular envio de horário
    handleTimeSlotSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const averageDuration = parseInt(formData.get('averageDuration'));
        const startTime = formData.get('startTime');
        const endTime = formData.get('endTime');
        
        // Obter dias selecionados
        const selectedDays = [];
        const dayCheckboxes = e.target.querySelectorAll('input[name="days"]:checked');
        dayCheckboxes.forEach(checkbox => {
            selectedDays.push(checkbox.value);
        });

        if (selectedDays.length === 0) {
            alert('Selecione pelo menos um dia da semana.');
            return;
        }

        // Verificar se já existem horários para os dias selecionados
        const existingDays = [];
        const newDays = [];
        
        selectedDays.forEach(day => {
            if (this.schedule[day] && this.schedule[day].length > 0) {
                existingDays.push(day);
            } else {
                newDays.push(day);
            }
        });

        let shouldProceed = true;
        let action = 'add';

        if (existingDays.length > 0 && newDays.length > 0) {
            action = confirm(`Dias com horários existentes: ${existingDays.join(', ')}\nDias novos: ${newDays.join(', ')}\n\nDeseja adicionar horários apenas para os dias novos?`) ? 'add' : 'replace';
        } else if (existingDays.length > 0) {
            action = confirm(`Já existem horários para: ${existingDays.join(', ')}\n\nDeseja substituir os horários existentes?`) ? 'replace' : 'cancel';
        }

        if (action === 'cancel') {
            return;
        }

        if (action === 'replace') {
            // Limpar horários existentes para os dias selecionados
            selectedDays.forEach(day => {
                this.schedule[day] = [];
            });
        }

        // Gerar horários para cada dia selecionado
        selectedDays.forEach(day => {
            if (!this.schedule[day]) {
                this.schedule[day] = [];
            }

            let currentTime = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);

            while (currentTime < end) {
                const timeString = currentTime.toTimeString().slice(0, 5);
                
                // Verificar se o horário já existe
                const existingSlot = this.schedule[day].find(slot => slot.time === timeString);
                if (!existingSlot) {
                    this.schedule[day].push({
                        time: timeString,
                        duration: averageDuration
                    });
                }
                
                currentTime.setMinutes(currentTime.getMinutes() + averageDuration);
            }
        });

        localStorage.setItem('schedule', JSON.stringify(this.schedule));
        this.loadSchedule();
        this.updateDashboard();
        this.closeTimeSlotModal();

        // Atualizar página principal se estiver aberta
        if (typeof updateMainPage === 'function') {
            updateMainPage();
        }

        if (action === 'replace') {
            alert(`Horários substituídos com sucesso para ${selectedDays.length} dia(s)!`);
        } else {
            alert(`Horários adicionados com sucesso para ${newDays.length} dia(s)!`);
        }
    }

    // Remover horário
    removeTimeSlot(day, time) {
        if (confirm('Tem certeza que deseja remover este horário?')) {
            this.schedule[day] = this.schedule[day].filter(slot => slot.time !== time);
            localStorage.setItem('schedule', JSON.stringify(this.schedule));
            this.loadSchedule();
            this.updateDashboard();

            // Atualizar página principal se estiver aberta
            if (typeof updateMainPage === 'function') {
                updateMainPage();
            }
        }
    }



    // Carregar informações da empresa
    loadBusinessInfo() {
        if (this.businessInfo.name) {
            document.getElementById('businessName').value = this.businessInfo.name;
        }
        if (this.businessInfo.phone) {
            document.getElementById('businessPhone').value = this.businessInfo.phone;
        }
        if (this.businessInfo.address) {
            document.getElementById('businessAddress').value = this.businessInfo.address;
        }
        if (this.businessInfo.description) {
            document.getElementById('businessDescription').value = this.businessInfo.description;
        }
        if (this.businessInfo.colors) {
            document.getElementById('primaryColor').value = this.businessInfo.colors.primary || '#4CAF50';
            document.getElementById('secondaryColor').value = this.businessInfo.colors.secondary || '#2196F3';
            document.getElementById('accentColor').value = this.businessInfo.colors.accent || '#FF9800';
        }
    }

    // Manipular envio de configurações da empresa
    handleBusinessSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        this.businessInfo = {
            name: formData.get('businessName'),
            phone: formData.get('businessPhone'),
            address: formData.get('businessAddress'),
            description: formData.get('businessDescription')
        };

        localStorage.setItem('businessInfo', JSON.stringify(this.businessInfo));
        
        // Salvar configurações de cores
        this.saveColorSettings();
        
        alert('Configurações salvas com sucesso!');

        // Atualizar página principal se estiver aberta
        if (typeof updateMainPage === 'function') {
            updateMainPage();
        }
    }

    // Atualizar preview de cores
    updateColorsPreview() {
        // Cores do cliente (index.html)
        const primaryColor = document.getElementById('primaryColor').value;
        const secondaryColor = document.getElementById('secondaryColor').value;
        const accentColor = document.getElementById('accentColor').value;

        // Cores do painel admin
        const adminPrimaryColor = document.getElementById('adminPrimaryColor').value;
        const adminSecondaryColor = document.getElementById('adminSecondaryColor').value;
        const adminAccentColor = document.getElementById('adminAccentColor').value;
        const adminBgColor = document.getElementById('adminBgColor').value;

        // Aplicar cores do cliente (serão salvas no localStorage)
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--accent-color', accentColor);

        // Aplicar cores do painel admin
        document.documentElement.style.setProperty('--admin-primary-color', adminPrimaryColor);
        document.documentElement.style.setProperty('--admin-secondary-color', adminSecondaryColor);
        document.documentElement.style.setProperty('--admin-accent-color', adminAccentColor);
        document.documentElement.style.setProperty('--admin-bg-color', adminBgColor);

        // Atualizar preview das cores do admin
        this.updateAdminColorPreview(adminPrimaryColor, adminSecondaryColor, adminAccentColor, adminBgColor);
    }

    // Atualizar preview das cores do painel admin
    updateAdminColorPreview(primary, secondary, accent, bg) {
        const previewPrimary = document.getElementById('previewPrimary');
        const previewSecondary = document.getElementById('previewSecondary');
        const previewAccent = document.getElementById('previewAccent');
        const previewBg = document.getElementById('previewBg');

        if (previewPrimary) previewPrimary.style.backgroundColor = primary;
        if (previewSecondary) previewSecondary.style.backgroundColor = secondary;
        if (previewAccent) previewAccent.style.backgroundColor = accent;
        if (previewBg) previewBg.style.backgroundColor = bg;
    }

    // Carregar configurações de cores
    loadColorSettings() {
        const colorSettings = JSON.parse(localStorage.getItem('colorSettings') || '{}');
        const adminColorSettings = JSON.parse(localStorage.getItem('adminColorSettings') || '{}');

        // Aplicar cores do cliente
        if (colorSettings.primary) {
            document.getElementById('primaryColor').value = colorSettings.primary;
            document.documentElement.style.setProperty('--primary-color', colorSettings.primary);
        }
        if (colorSettings.secondary) {
            document.getElementById('secondaryColor').value = colorSettings.secondary;
            document.documentElement.style.setProperty('--secondary-color', colorSettings.secondary);
        }
        if (colorSettings.accent) {
            document.getElementById('accentColor').value = colorSettings.accent;
            document.documentElement.style.setProperty('--accent-color', colorSettings.accent);
        }

        // Aplicar cores do painel admin
        if (adminColorSettings.primary) {
            document.getElementById('adminPrimaryColor').value = adminColorSettings.primary;
            document.documentElement.style.setProperty('--admin-primary-color', adminColorSettings.primary);
        }
        if (adminColorSettings.secondary) {
            document.getElementById('adminSecondaryColor').value = adminColorSettings.secondary;
            document.documentElement.style.setProperty('--admin-secondary-color', adminColorSettings.secondary);
        }
        if (adminColorSettings.accent) {
            document.getElementById('adminAccentColor').value = adminColorSettings.accent;
            document.documentElement.style.setProperty('--admin-accent-color', adminColorSettings.accent);
        }
        if (adminColorSettings.bg) {
            document.getElementById('adminBgColor').value = adminColorSettings.bg;
            document.documentElement.style.setProperty('--admin-bg-color', adminColorSettings.bg);
        }

        // Atualizar preview
        this.updateAdminColorPreview(
            adminColorSettings.primary || '#4CAF50',
            adminColorSettings.secondary || '#2196F3',
            adminColorSettings.accent || '#FF9800',
            adminColorSettings.bg || '#f5f7fa'
        );
    }

    // Salvar configurações de cores
    saveColorSettings() {
        const colorSettings = {
            primary: document.getElementById('primaryColor').value,
            secondary: document.getElementById('secondaryColor').value,
            accent: document.getElementById('accentColor').value
        };

        const adminColorSettings = {
            primary: document.getElementById('adminPrimaryColor').value,
            secondary: document.getElementById('adminSecondaryColor').value,
            accent: document.getElementById('adminAccentColor').value,
            bg: document.getElementById('adminBgColor').value
        };

        localStorage.setItem('colorSettings', JSON.stringify(colorSettings));
        localStorage.setItem('adminColorSettings', JSON.stringify(adminColorSettings));

        // Aplicar cores imediatamente
        this.updateColorsPreview();
        
        alert('Configurações de cores salvas com sucesso!');
    }

    // Formatar data
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Confirmar agendamento
    confirmAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id == appointmentId);
        if (!appointment) return;

        appointment.status = 'confirmed';
        appointment.confirmedAt = new Date().toISOString();
        localStorage.setItem('appointments', JSON.stringify(this.appointments));

        // Enviar confirmação via WhatsApp para o cliente
        this.sendConfirmationToClient(appointment, 'confirm');

        this.updateDashboard();
        this.loadAppointmentsTable();
        this.loadPendingAppointments();
        this.loadConfirmedAppointments();
        alert('Agendamento confirmado com sucesso!');
    }

    // Rejeitar agendamento
    rejectAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id == appointmentId);
        if (!appointment) return;

        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;

        appointment.status = 'cancelled';
        appointment.cancelledAt = new Date().toISOString();
        appointment.cancellationReason = reason;
        localStorage.setItem('appointments', JSON.stringify(this.appointments));

        // Enviar rejeição via WhatsApp para o cliente
        this.sendConfirmationToClient(appointment, 'reject', reason);

        this.updateDashboard();
        this.loadAppointmentsTable();
        this.loadPendingAppointments();
        alert('Agendamento rejeitado.');
    }

    // Marcar agendamento como realizado
    completeAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id == appointmentId);
        if (!appointment) return;

        if (confirm('Confirmar que o serviço foi realizado?')) {
            appointment.status = 'completed';
            appointment.completedAt = new Date().toISOString();
            localStorage.setItem('appointments', JSON.stringify(this.appointments));

            this.updateDashboard();
            this.loadAppointmentsTable();
            this.loadConfirmedAppointments();
            alert('Serviço marcado como realizado!');
        }
    }

    // Enviar confirmação/rejeição via WhatsApp para o cliente
    sendConfirmationToClient(appointment, action, reason = '') {
        const service = this.services.find(s => s.id === appointment.serviceId);
        
        let message = '';
        if (action === 'confirm') {
            message = `✅ *AGENDAMENTO CONFIRMADO!*

Olá ${appointment.clientName}! 

Seu agendamento foi *CONFIRMADO*:
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}
*Valor:* R$ ${service ? service.price : 'N/A'}

Aguardamos você no horário marcado!
Qualquer dúvida, entre em contato conosco.`;
        } else {
            message = `❌ *AGENDAMENTO NÃO PODE SER REALIZADO*

Olá ${appointment.clientName}! 

Infelizmente seu agendamento não pode ser realizado:
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}

*Motivo:* ${reason}

Por favor, entre em contato conosco para reagendar em outro horário disponível.`;
        }

        // Formatar número do cliente
        let clientPhone = appointment.clientPhone.replace(/\D/g, '');
        if (clientPhone.startsWith('0')) clientPhone = clientPhone.substring(1);
        if (!clientPhone.startsWith('55')) clientPhone = '55' + clientPhone;

        // Abrir WhatsApp para o cliente
        const whatsappUrl = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Enviar confirmação de realização via WhatsApp para o cliente
    sendCompletionToClient(appointment) {
        const service = this.services.find(s => s.id === appointment.serviceId);
        
        const message = `✅ *SERVIÇO REALIZADO!*

Olá ${appointment.clientName}! 

Seu serviço foi *REALIZADO* com sucesso:
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}
*Valor:* R$ ${service ? service.price : 'N/A'}

Obrigado por escolher nossos serviços!
Esperamos vê-lo(a) novamente em breve.`;

        // Formatar número do cliente
        let clientPhone = appointment.clientPhone.replace(/\D/g, '');
        if (clientPhone.startsWith('0')) clientPhone = clientPhone.substring(1);
        if (!clientPhone.startsWith('55')) clientPhone = '55' + clientPhone;

        // Abrir WhatsApp para o cliente
        const whatsappUrl = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Contatar cliente via WhatsApp
    contactClient(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id == appointmentId);
        if (!appointment) return;

        const service = this.services.find(s => s.id === appointment.serviceId);
        
        const message = `Olá ${appointment.clientName}! 

Gostaríamos de confirmar seu agendamento:
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}
*Valor:* R$ ${service ? service.price : 'N/A'}

Este horário está disponível para você?
Por favor, confirme respondendo a esta mensagem.`;

        // Formatar número do cliente
        let clientPhone = appointment.clientPhone.replace(/\D/g, '');
        if (clientPhone.startsWith('0')) clientPhone = clientPhone.substring(1);
        if (!clientPhone.startsWith('55')) clientPhone = '55' + clientPhone;

        // Abrir WhatsApp para o cliente
        const whatsappUrl = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Carregar tabela de agendamentos
    loadAppointmentsTable() {
        const tableContainer = document.getElementById('appointmentsTable');
        if (!tableContainer) return;

        // Carregar serviços no filtro
        this.loadServicesFilter();

        const filteredAppointments = this.getFilteredAppointments();
        
        if (filteredAppointments.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; color: #666;">Nenhum agendamento encontrado.</p>';
            return;
        }

        let tableHTML = `
            <table class="appointments-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Serviço</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filteredAppointments.forEach(appointment => {
            const service = this.services.find(s => s.id === appointment.serviceId);
            const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 
                               appointment.status === 'cancelled' ? 'cancelled' :
                               appointment.status === 'completed' ? 'completed' : 'pending';
            
            tableHTML += `
                <tr>
                    <td>${appointment.clientName}</td>
                    <td>${service ? service.name : 'N/A'}</td>
                    <td>${this.formatDate(appointment.date)}</td>
                    <td>${appointment.time}</td>
                    <td><span class="status-badge ${statusClass}">${this.getStatusText(appointment.status)}</span></td>
                    <td>
                        ${appointment.status === 'pending' ? `
                            <button class="btn-confirm" onclick="adminPanel.confirmAppointment('${appointment.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-reject" onclick="adminPanel.rejectAppointment('${appointment.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        ${appointment.status === 'confirmed' ? `
                            <button class="btn-complete" onclick="adminPanel.completeAppointment('${appointment.id}')">
                                <i class="fas fa-check-double"></i>
                            </button>
                        ` : ''}
                        <button class="btn-whatsapp" onclick="adminPanel.contactClient('${appointment.id}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        tableContainer.innerHTML = tableHTML;
    }

    // Carregar filtro de serviços
    loadServicesFilter() {
        const serviceFilter = document.getElementById('filterService');
        if (!serviceFilter) return;

        serviceFilter.innerHTML = '<option value="all">Todos os Serviços</option>';
        this.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            serviceFilter.appendChild(option);
        });
    }

    // Obter agendamentos filtrados
    getFilteredAppointments() {
        let filtered = [...this.appointments];

        const statusFilter = document.getElementById('filterStatus')?.value;
        const dateFilter = document.getElementById('filterDate')?.value;
        const serviceFilter = document.getElementById('filterService')?.value;

        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(apt => apt.status === statusFilter);
        }

        if (dateFilter) {
            filtered = filtered.filter(apt => apt.date === dateFilter);
        }

        if (serviceFilter && serviceFilter !== 'all') {
            filtered = filtered.filter(apt => apt.serviceId == serviceFilter);
        }

        return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Aplicar filtros
    applyAppointmentFilters() {
        this.loadAppointmentsTable();
    }

    // Exportar agendamentos
    exportAppointments() {
        const filteredAppointments = this.getFilteredAppointments();
        
        if (filteredAppointments.length === 0) {
            alert('Nenhum agendamento para exportar.');
            return;
        }

        let csvContent = 'Cliente,Serviço,Data,Horário,Status,WhatsApp\n';
        
        filteredAppointments.forEach(appointment => {
            const service = this.services.find(s => s.id === appointment.serviceId);
            csvContent += `"${appointment.clientName}","${service ? service.name : 'N/A'}","${this.formatDate(appointment.date)}","${appointment.time}","${this.getStatusText(appointment.status)}","${appointment.clientPhone}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `agendamentos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Obter texto do status
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'completed': 'Realizado',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    // Validar horários
    validateSchedule() {
        const nextAvailableDates = this.getNextAvailableDates();
        const conflictSlots = this.getConflictSlots();
        const weeklyCapacity = this.getWeeklyCapacity();
        const realDateValidation = this.validateRealDates();

        document.getElementById('nextAvailableDates').textContent = nextAvailableDates.join(', ') || 'Nenhuma';
        document.getElementById('conflictSlots').textContent = conflictSlots.length || 'Nenhum';
        document.getElementById('weeklyCapacity').textContent = weeklyCapacity;

        // Atualizar informações de validação com datas reais
        const validationInfo = document.querySelector('.validation-info');
        if (validationInfo) {
            const realDatesInfo = validationInfo.querySelector('.real-dates-info');
            if (!realDatesInfo) {
                const realDatesDiv = document.createElement('p');
                realDatesDiv.className = 'real-dates-info';
                validationInfo.appendChild(realDatesDiv);
            }
            validationInfo.querySelector('.real-dates-info').innerHTML = 
                `<strong>Próximas Datas Reais Disponíveis:</strong> <span id="realAvailableDates">${realDateValidation.join(', ') || 'Nenhuma'}</span>`;
        }

        alert('Validação concluída! Verifique as informações abaixo.');
    }

    // Validar datas reais
    validateRealDates() {
        const today = new Date();
        const availableDates = [];
        
        for (let i = 1; i <= 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayOfWeek = this.getDayOfWeek(checkDate.toISOString().split('T')[0]);
            
            if (this.schedule[dayOfWeek] && this.schedule[dayOfWeek].length > 0) {
                const dateString = checkDate.toISOString().split('T')[0];
                const bookedTimes = this.getBookedTimes(dateString);
                const availableSlots = this.schedule[dayOfWeek].filter(slot => !bookedTimes.includes(slot.time));
                
                if (availableSlots.length > 0) {
                    availableDates.push(this.formatDate(dateString));
                }
            }
        }
        
        return availableDates.slice(0, 10); // Retorna as 10 primeiras datas reais
    }

    // Obter próximas datas disponíveis
    getNextAvailableDates() {
        const today = new Date();
        const availableDates = [];
        
        for (let i = 1; i <= 14; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayOfWeek = this.getDayOfWeek(checkDate.toISOString().split('T')[0]);
            
            if (this.schedule[dayOfWeek] && this.schedule[dayOfWeek].length > 0) {
                const dateString = checkDate.toISOString().split('T')[0];
                const bookedTimes = this.getBookedTimes(dateString);
                const availableSlots = this.schedule[dayOfWeek].filter(slot => !bookedTimes.includes(slot.time));
                
                if (availableSlots.length > 0) {
                    availableDates.push(this.formatDate(dateString));
                }
            }
        }
        
        return availableDates.slice(0, 5); // Retorna apenas as 5 primeiras
    }

    // Obter horários com conflitos
    getConflictSlots() {
        const conflicts = [];
        
        Object.keys(this.schedule).forEach(day => {
            const slots = this.schedule[day];
            const bookedTimes = this.appointments
                .filter(apt => this.getDayOfWeek(apt.date) === day)
                .map(apt => apt.time);
            
            slots.forEach(slot => {
                if (bookedTimes.includes(slot.time)) {
                    conflicts.push(`${day} - ${slot.time}`);
                }
            });
        });
        
        return conflicts;
    }

    // Obter capacidade semanal
    getWeeklyCapacity() {
        let totalSlots = 0;
        Object.values(this.schedule).forEach(daySlots => {
            totalSlots += daySlots.length;
        });
        
        const bookedSlots = this.appointments.filter(apt => apt.status === 'confirmed').length;
        const availableSlots = totalSlots - bookedSlots;
        
        return `${bookedSlots}/${totalSlots} (${availableSlots} disponíveis)`;
    }

    // Obter dia da semana (método auxiliar)
    getDayOfWeek(dateString) {
        const date = new Date(dateString);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    // Obter horários já agendados (método auxiliar)
    getBookedTimes(date) {
        return this.appointments
            .filter(apt => apt.date === date && apt.status === 'confirmed')
            .map(apt => apt.time);
    }

    // Carregar configurações do dashboard
    loadDashboardConfig() {
        const dashboardConfig = JSON.parse(localStorage.getItem('dashboardConfig') || '{}');
        
        // Definir valores padrão se não existirem
        const config = {
            showTodayAppointments: dashboardConfig.showTodayAppointments !== undefined ? dashboardConfig.showTodayAppointments : true,
            showWeekAppointments: dashboardConfig.showWeekAppointments !== undefined ? dashboardConfig.showWeekAppointments : true,
            showTotalServices: dashboardConfig.showTotalServices !== undefined ? dashboardConfig.showTotalServices : true,
            showActiveSlots: dashboardConfig.showActiveSlots !== undefined ? dashboardConfig.showActiveSlots : true,
            showPendingAppointments: dashboardConfig.showPendingAppointments !== undefined ? dashboardConfig.showPendingAppointments : true,
            showConfirmedAppointments: dashboardConfig.showConfirmedAppointments !== undefined ? dashboardConfig.showConfirmedAppointments : true,
            showRecentAppointments: dashboardConfig.showRecentAppointments !== undefined ? dashboardConfig.showRecentAppointments : true
        };

        // Atualizar checkboxes se existirem
        if (document.getElementById('showTodayAppointments')) {
            document.getElementById('showTodayAppointments').checked = config.showTodayAppointments;
            document.getElementById('showWeekAppointments').checked = config.showWeekAppointments;
            document.getElementById('showTotalServices').checked = config.showTotalServices;
            document.getElementById('showActiveSlots').checked = config.showActiveSlots;
            document.getElementById('showPendingAppointments').checked = config.showPendingAppointments;
            document.getElementById('showConfirmedAppointments').checked = config.showConfirmedAppointments;
            document.getElementById('showRecentAppointments').checked = config.showRecentAppointments;
        }

        // Aplicar configurações
        this.applyDashboardConfig(config);
    }

    // Salvar configurações do dashboard
    saveDashboardConfig() {
        const dashboardConfig = {
            showTodayAppointments: document.getElementById('showTodayAppointments').checked,
            showWeekAppointments: document.getElementById('showWeekAppointments').checked,
            showTotalServices: document.getElementById('showTotalServices').checked,
            showActiveSlots: document.getElementById('showActiveSlots').checked,
            showPendingAppointments: document.getElementById('showPendingAppointments').checked,
            showConfirmedAppointments: document.getElementById('showConfirmedAppointments').checked,
            showRecentAppointments: document.getElementById('showRecentAppointments').checked
        };

        localStorage.setItem('dashboardConfig', JSON.stringify(dashboardConfig));
        this.applyDashboardConfig(dashboardConfig);
        alert('Configurações do dashboard salvas com sucesso!');
    }

    // Aplicar configurações do dashboard
    applyDashboardConfig(config) {
        // Controlar visibilidade dos cards do dashboard
        const dashboardCards = document.querySelectorAll('.dashboard-card');
        if (dashboardCards.length >= 4) {
            dashboardCards[0].style.display = config.showTodayAppointments ? 'block' : 'none';
            dashboardCards[1].style.display = config.showWeekAppointments ? 'block' : 'none';
            dashboardCards[2].style.display = config.showTotalServices ? 'block' : 'none';
            dashboardCards[3].style.display = config.showActiveSlots ? 'block' : 'none';
        }

        // Controlar visibilidade das seções
        const pendingSection = document.querySelector('.pending-appointments');
        const confirmedSection = document.querySelector('.confirmed-appointments');
        const recentSection = document.querySelector('.recent-appointments');

        if (pendingSection) pendingSection.style.display = config.showPendingAppointments ? 'block' : 'none';
        if (confirmedSection) confirmedSection.style.display = config.showConfirmedAppointments ? 'block' : 'none';
        if (recentSection) recentSection.style.display = config.showRecentAppointments ? 'block' : 'none';
    }

    // Resetar configurações do dashboard para o padrão
    resetDashboardConfig() {
        if (confirm('Tem certeza que deseja restaurar as configurações padrão do dashboard?')) {
            const defaultConfig = {
                showTodayAppointments: true,
                showWeekAppointments: true,
                showTotalServices: true,
                showActiveSlots: true,
                showPendingAppointments: true,
                showConfirmedAppointments: true,
                showRecentAppointments: true
            };

            // Atualizar checkboxes
            document.getElementById('showTodayAppointments').checked = true;
            document.getElementById('showWeekAppointments').checked = true;
            document.getElementById('showTotalServices').checked = true;
            document.getElementById('showActiveSlots').checked = true;
            document.getElementById('showPendingAppointments').checked = true;
            document.getElementById('showConfirmedAppointments').checked = true;
            document.getElementById('showRecentAppointments').checked = true;

            localStorage.setItem('dashboardConfig', JSON.stringify(defaultConfig));
            this.applyDashboardConfig(defaultConfig);
            alert('Configurações do dashboard restauradas para o padrão!');
        }
    }
}

// Inicializar painel administrativo
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
