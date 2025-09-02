// Sistema de Agendamento - JavaScript Principal

class AppointmentSystem {
    constructor() {
        this.services = [];
        this.schedule = {};
        this.businessInfo = {};
        this.appointments = [];
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateBusinessName();
        this.loadServices();
        this.setupDateValidation();
        // Removido seletor de tema local; cores vêm do admin via localStorage
        this.applyTheme('default');
        // Aplicar cores do admin ao iniciar
        if (window.SharedStore) {
            SharedStore.applyClientColorsFromStorage();
            SharedStore.onSharedChange((key) => {
                if (key === SharedStore.KEYS.colorSettings) {
                    SharedStore.applyClientColorsFromStorage();
                }
                if (key === SharedStore.KEYS.services || key === SharedStore.KEYS.schedule || key === SharedStore.KEYS.businessInfo || key === SharedStore.KEYS.appointments) {
                    this.updateData();
                }
            });
        }
    }

    // Carregar dados salvos
    loadData() {
        this.services = JSON.parse(localStorage.getItem('services') || '[]');
        this.schedule = JSON.parse(localStorage.getItem('schedule') || '{}');
        this.businessInfo = JSON.parse(localStorage.getItem('businessInfo') || '{}');
        this.appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        
        // Aplicar tema default (cores virão do admin)
        const savedTheme = 'default';
        this.applyTheme(savedTheme);
    }

    // Configurar event listeners
    setupEventListeners() {
        const form = document.getElementById('appointmentForm');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Modal
        const modal = document.getElementById('confirmationModal');
        const closeBtn = modal.querySelector('.close');
        const confirmBtn = document.getElementById('confirmWhatsApp');
        const contactBtn = document.getElementById('contactWhatsApp');

        closeBtn.addEventListener('click', () => this.closeModal());
        confirmBtn.addEventListener('click', () => this.openWhatsApp());
        contactBtn.addEventListener('click', () => this.contactBusiness());
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        // Removidos controles de modal de cores no index
    }

    // Configurar validação de datas
    setupDateValidation() {
        const dateInput = document.getElementById('dateSelect');
        const today = new Date();
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 2); // Permitir agendamento até 2 meses

        dateInput.min = today.toISOString().split('T')[0];
        dateInput.max = maxDate.toISOString().split('T')[0];
        
        dateInput.addEventListener('change', () => this.updateAvailableTimes());
    }

    // Removido seletor de temas local (tema definido pelo admin)

    // Aplicar tema
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        // Aplicar cores personalizadas do localStorage
        this.applyCustomColors();
    }

    // Aplicar cores personalizadas
    applyCustomColors() {
        const colorSettings = JSON.parse(localStorage.getItem('colorSettings') || '{}');
        const root = document.documentElement;
        
        if (colorSettings.primary) root.style.setProperty('--primary-color', colorSettings.primary);
        if (colorSettings.secondary) root.style.setProperty('--secondary-color', colorSettings.secondary);
        if (colorSettings.accent) root.style.setProperty('--accent-color', colorSettings.accent);
    }

    // Removido polling; usamos eventos de storage via SharedStore

    // Removidas funções de modal e salvamento de cores do index

    // Atualizar nome da empresa
    updateBusinessName() {
        const businessNameElement = document.getElementById('businessName');
        if (this.businessInfo.name) {
            businessNameElement.textContent = this.businessInfo.name;
        }
    }

    // Carregar serviços
    loadServices() {
        const serviceSelect = document.getElementById('serviceSelect');
        const servicesList = document.getElementById('servicesList');
        
        // Limpar opções existentes
        serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';
        servicesList.innerHTML = '';

        if (this.services.length === 0) {
            servicesList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum serviço cadastrado ainda.</p>';
            return;
        }

        // Adicionar opções ao select
        this.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - R$ ${service.price}`;
            serviceSelect.appendChild(option);
        });

        // Criar cards de serviços
        this.services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <h4>${service.name}</h4>
                <div class="price">R$ ${service.price}</div>
                <div class="duration">${service.duration} min</div>
                ${service.description ? `<p>${service.description}</p>` : ''}
            `;
            servicesList.appendChild(serviceCard);
        });
    }

    // Atualizar horários disponíveis
    updateAvailableTimes() {
        const dateInput = document.getElementById('dateSelect');
        const timeSelect = document.getElementById('timeSelect');
        const selectedDate = dateInput.value;
        
        if (!selectedDate) return;

        const dayOfWeek = this.getDayOfWeek(selectedDate);
        const availableSlots = this.schedule[dayOfWeek] || [];
        
        // Limpar opções existentes
        timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
        
        if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">Nenhum horário disponível neste dia</option>';
            return;
        }

        // Filtrar horários já agendados (incluindo pendentes)
        const bookedTimes = this.getBookedTimes(selectedDate);
        const availableTimes = availableSlots.filter(slot => !bookedTimes.includes(slot.time));

        if (availableTimes.length === 0) {
            timeSelect.innerHTML = '<option value="">Todos os horários estão ocupados neste dia</option>';
            return;
        }

        availableTimes.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.time;
            option.textContent = `${slot.time} (${slot.duration} min)`;
            timeSelect.appendChild(option);
        });

        // Mostrar quantidade de horários disponíveis
        const timeSelectContainer = timeSelect.parentElement;
        let availabilityInfo = timeSelectContainer.querySelector('.availability-info');
        if (!availabilityInfo) {
            availabilityInfo = document.createElement('div');
            availabilityInfo.className = 'availability-info';
            timeSelectContainer.appendChild(availabilityInfo);
        }
        availabilityInfo.innerHTML = `<small>${availableTimes.length} horário(s) disponível(is) em ${this.formatDate(selectedDate)}</small>`;
    }

    // Obter dia da semana
    getDayOfWeek(dateString) {
        const date = new Date(dateString);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    // Obter horários já agendados
    getBookedTimes(date) {
        return this.appointments
            .filter(apt => apt.date === date && (apt.status === 'confirmed' || apt.status === 'pending'))
            .map(apt => apt.time);
    }

    // Manipular envio do formulário
    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const appointment = {
            id: Date.now(),
            clientName: formData.get('clientName'),
            clientPhone: formData.get('clientPhone'),
            serviceId: formData.get('serviceSelect'),
            date: formData.get('dateSelect'),
            time: formData.get('timeSelect'),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Validações
        if (!this.validateAppointment(appointment)) return;

        // Salvar agendamento
        this.appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(this.appointments));
        if (window.SharedStore) {
            SharedStore.writeJSON(SharedStore.KEYS.appointments, this.appointments);
        }

        // Notificar empresa via WhatsApp sobre nova reserva
        this.notifyBusinessNewAppointment(appointment);

        // Mostrar modal de confirmação
        this.showConfirmationModal(appointment);

        // Limpar formulário
        e.target.reset();
    }

    // Validar agendamento
    validateAppointment(appointment) {
        if (!appointment.clientName || !appointment.clientPhone || 
            !appointment.serviceId || !appointment.date || !appointment.time) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }

        // Verificar se a data não é no passado
        const selectedDate = new Date(appointment.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            alert('Não é possível agendar para datas passadas.');
            return false;
        }

        // Verificar se o horário ainda está disponível
        const dayOfWeek = this.getDayOfWeek(appointment.date);
        const availableSlots = this.schedule[dayOfWeek] || [];
        const isTimeAvailable = availableSlots.some(slot => slot.time === appointment.time);
        
        if (!isTimeAvailable) {
            alert('Este horário não está disponível para este dia da semana. Por favor, escolha outro.');
            return false;
        }

        // Verificar se não há conflito (incluindo agendamentos pendentes)
        const isTimeBooked = this.appointments.some(apt => 
            apt.date === appointment.date && apt.time === appointment.time && 
            (apt.status === 'confirmed' || apt.status === 'pending')
        );
        
        if (isTimeBooked) {
            alert('Este horário já foi agendado ou está pendente de confirmação. Por favor, escolha outro.');
            return false;
        }

        // Verificar se o cliente já tem um agendamento pendente para a mesma data
        const existingPending = this.appointments.some(apt => 
            apt.clientPhone === appointment.clientPhone && 
            apt.date === appointment.date && 
            apt.status === 'pending'
        );
        
        if (existingPending) {
            alert('Você já possui um agendamento pendente para esta data. Aguarde a confirmação da empresa.');
            return false;
        }

        return true;
    }

    // Mostrar modal de confirmação
    showConfirmationModal(appointment) {
        const service = this.services.find(s => s.id === appointment.serviceId);
        const modal = document.getElementById('confirmationModal');
        const details = document.getElementById('appointmentDetails');
        
        details.innerHTML = `
            <div class="confirmation-header">
                <i class="fas fa-clock"></i>
                <h3>✅ Agendamento Realizado!</h3>
            </div>
            <div class="confirmation-details">
                <p><strong>Status:</strong> <span class="status-pending">Aguardando confirmação da empresa</span></p>
                <p><strong>Cliente:</strong> ${appointment.clientName}</p>
                <p><strong>WhatsApp:</strong> ${appointment.clientPhone}</p>
                <p><strong>Serviço:</strong> ${service ? service.name : 'N/A'}</p>
                <p><strong>Data:</strong> ${this.formatDate(appointment.date)}</p>
                <p><strong>Horário:</strong> ${appointment.time}</p>
                <p><strong>Valor:</strong> R$ ${service ? service.price : 'N/A'}</p>
            </div>
            <div class="confirmation-message">
                <p><i class="fas fa-info-circle"></i> Seu agendamento foi registrado e está aguardando confirmação da empresa. Você receberá uma confirmação via WhatsApp em breve.</p>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    // Fechar modal
    closeModal() {
        const modal = document.getElementById('confirmationModal');
        modal.style.display = 'none';
    }

    // Abrir WhatsApp
    openWhatsApp() {
        const appointment = this.appointments[this.appointments.length - 1];
        const service = this.services.find(s => s.id === appointment.serviceId);
        
        // Verificar se o WhatsApp da empresa está cadastrado
        if (!this.businessInfo.phone) {
            alert('WhatsApp da empresa não está cadastrado. Por favor, configure no painel administrativo.');
            return;
        }
        
        // Formatar número do WhatsApp da empresa
        let businessPhone = this.businessInfo.phone.replace(/\D/g, '');
        if (businessPhone.startsWith('0')) businessPhone = businessPhone.substring(1);
        if (!businessPhone.startsWith('55')) businessPhone = '55' + businessPhone;
        
        // Criar mensagem para a empresa
        const message = `🆕 *NOVO AGENDAMENTO RECEBIDO!*

*Cliente:* ${appointment.clientName}
*WhatsApp:* ${appointment.clientPhone}
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}
*Valor:* R$ ${service ? service.price : 'N/A'}

Por favor, confirme este agendamento respondendo a esta mensagem.`;

        // Abrir WhatsApp para a empresa
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        this.closeModal();
    }

    // Notificar empresa sobre nova reserva
    notifyBusinessNewAppointment(appointment) {
        // Verificar se o WhatsApp da empresa está cadastrado
        if (!this.businessInfo.phone) {
            console.log('WhatsApp da empresa não está cadastrado.');
            return;
        }
        
        const service = this.services.find(s => s.id === appointment.serviceId);
        
        // Formatar número do WhatsApp da empresa
        let businessPhone = this.businessInfo.phone.replace(/\D/g, '');
        if (businessPhone.startsWith('0')) businessPhone = businessPhone.substring(1);
        if (!businessPhone.startsWith('55')) businessPhone = '55' + businessPhone;
        
        // Criar mensagem de notificação para a empresa
        const message = `🔔 *NOVA RESERVA RECEBIDA!*

*Cliente:* ${appointment.clientName}
*WhatsApp:* ${appointment.clientPhone}
*Serviço:* ${service ? service.name : 'N/A'}
*Data:* ${this.formatDate(appointment.date)}
*Horário:* ${appointment.time}
*Valor:* R$ ${service ? service.price : 'N/A'}

⚠️ *ATENÇÃO:* Esta reserva está aguardando sua confirmação no painel administrativo.

Acesse o painel para confirmar ou rejeitar este agendamento.`;

        // Abrir WhatsApp para a empresa
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Contatar empresa via WhatsApp
    contactBusiness() {
        // Verificar se o WhatsApp da empresa está cadastrado
        if (!this.businessInfo.phone) {
            alert('WhatsApp da empresa não está cadastrado. Por favor, configure no painel administrativo.');
            return;
        }
        
        // Formatar número do WhatsApp da empresa
        let businessPhone = this.businessInfo.phone.replace(/\D/g, '');
        if (businessPhone.startsWith('0')) businessPhone = businessPhone.substring(1);
        if (!businessPhone.startsWith('55')) businessPhone = '55' + businessPhone;
        
        // Criar mensagem simples para contato
        const message = `Olá! Gostaria de falar sobre agendamentos e serviços.`;

        // Abrir WhatsApp para a empresa
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        this.closeModal();
    }

    // Formatar data
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Atualizar dados (chamado pelo painel admin)
    updateData() {
        this.loadData();
        this.loadServices();
        this.updateBusinessName();
        
        if (this.businessInfo.colors) {
            this.applyCustomColors(this.businessInfo.colors);
        }
    }
}

// Inicializar sistema quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.appointmentSystem = new AppointmentSystem();
});

// Função para o painel admin atualizar dados
function updateMainPage() {
    if (window.appointmentSystem) {
        window.appointmentSystem.updateData();
    }
}
