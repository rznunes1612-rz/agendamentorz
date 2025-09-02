// Módulo compartilhado para sincronização entre admin e index

const SHARED_KEYS = {
    colorSettings: 'colorSettings',
    adminColorSettings: 'adminColorSettings',
    services: 'services',
    schedule: 'schedule',
    businessInfo: 'businessInfo',
    appointments: 'appointments',
    theme: 'theme'
};

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    // disparar um evento custom local (mesmo documento) para listeners imediatos
    document.dispatchEvent(new CustomEvent('shared:changed', { detail: { key, value } }));
}

function applyClientColorsFromStorage(root = document.documentElement) {
    const colorSettings = readJSON(SHARED_KEYS.colorSettings, {});
    if (colorSettings.primary) root.style.setProperty('--primary-color', colorSettings.primary);
    if (colorSettings.secondary) root.style.setProperty('--secondary-color', colorSettings.secondary);
    if (colorSettings.accent) root.style.setProperty('--accent-color', colorSettings.accent);
}

function applyAdminColorsFromStorage(root = document.documentElement) {
    const adminColorSettings = readJSON(SHARED_KEYS.adminColorSettings, {});
    if (adminColorSettings.primary) root.style.setProperty('--admin-primary-color', adminColorSettings.primary);
    if (adminColorSettings.secondary) root.style.setProperty('--admin-secondary-color', adminColorSettings.secondary);
    if (adminColorSettings.accent) root.style.setProperty('--admin-accent-color', adminColorSettings.accent);
    if (adminColorSettings.bg) root.style.setProperty('--admin-bg-color', adminColorSettings.bg);
}

function onSharedChange(handler) {
    // evento do mesmo documento
    document.addEventListener('shared:changed', (e) => handler(e.detail.key, e.detail.value));
    // evento cross-aba (outra aba/janela)
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        const value = (() => {
            try { return JSON.parse(e.newValue); } catch (_) { return e.newValue; }
        })();
        handler(e.key, value);
    });
}

window.SharedStore = {
    KEYS: SHARED_KEYS,
    readJSON,
    writeJSON,
    applyClientColorsFromStorage,
    applyAdminColorsFromStorage,
    onSharedChange
};


