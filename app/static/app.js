// ═══ Synapse v3 — Core Application Logic ═══

// ── State ──
let authMode = 'login';
let authToken = localStorage.getItem('synapse_token');
let currentUser = localStorage.getItem('synapse_user');
let currentTheme = localStorage.getItem('synapse_theme') || 'dark';
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;
let pomodoroCount = parseInt(localStorage.getItem('synapse_pomodoros') || '0');
let searchTimeout = null;

// ── DOM Elements ──
const $ = id => document.getElementById(id);
const textarea = $('brain-dump-input');
const triageBtn = $('triage-btn');
const btnText = $('btn-text');
const btnIcon = $('btn-icon');
const btnSpinner = $('btn-spinner');
const charCount = $('char-count');
const errorBanner = $('error-banner');
const errorMessage = $('error-message');
const toastContainer = $('toast-container');
const authOverlay = $('auth-overlay');
const appContainer = $('app-container');
const authForm = $('auth-form');
const authError = $('auth-error');
const searchInput = $('search-input');

const contentIds = { todos:'todo-content', calendar_events:'calendar-content', drafts:'drafts-content', notes:'notes-content' };
const countIds = { todos:'todo-count', calendar_events:'calendar-count', drafts:'drafts-count', notes:'notes-count' };

// ── API Helper ──
async function api(method, path, body) {
    const opts = { method, headers: {} };
    if (authToken) opts.headers['Authorization'] = 'Bearer ' + authToken;
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return res;
}

// ── Toast ──
function showToast(message, type='success') {
    const toast = document.createElement('div');
    const colors = { success:'bg-green-900/80 border-green-700/50 text-green-200', error:'bg-red-900/80 border-red-700/50 text-red-200', info:'bg-indigo-900/80 border-indigo-700/50 text-indigo-200' };
    toast.className = 'toast-in px-4 py-2.5 rounded-xl backdrop-blur border text-sm font-medium ' + (colors[type]||colors.info);
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.replace('toast-in','toast-out'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// ── Theme ──
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('synapse_theme', currentTheme);
    applyTheme();
}
function applyTheme() {
    document.documentElement.classList.toggle('light', currentTheme === 'light');
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    $('theme-icon-dark').classList.toggle('hidden', currentTheme === 'light');
    $('theme-icon-light').classList.toggle('hidden', currentTheme === 'dark');
}

// ── Auth ──
function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    $('username-field').classList.toggle('hidden', authMode === 'login');
    $('auth-subtitle').textContent = authMode === 'login' ? 'Sign in to your account' : 'Create a new account';
    $('auth-btn-text').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    $('auth-toggle-text').textContent = authMode === 'login' ? "Don't have an account?" : 'Already have an account?';
    $('auth-toggle-btn').textContent = authMode === 'login' ? 'Create one' : 'Sign in';
    authError.classList.add('hidden');
}

authForm.addEventListener('submit', async e => {
    e.preventDefault();
    authError.classList.add('hidden');
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const username = $('auth-username').value.trim();
    if (authMode === 'register' && !username) { authError.textContent = 'Username is required'; authError.classList.remove('hidden'); return; }
    try {
        const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
        const body = authMode === 'login' ? { email, password } : { email, username, password };
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');
        authToken = data.access_token;
        currentUser = data.username;
        localStorage.setItem('synapse_token', authToken);
        localStorage.setItem('synapse_user', currentUser);
        showApp();
    } catch (err) { authError.textContent = err.message; authError.classList.remove('hidden'); }
});

function showApp() {
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
    $('user-greeting').textContent = 'Hey, ' + currentUser + ' 👋';
    loadItems();
}

function logout() {
    authToken = null; currentUser = null;
    localStorage.removeItem('synapse_token');
    localStorage.removeItem('synapse_user');
    appContainer.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    authForm.reset();
    resetCards();
}

// ── Tab Navigation ──
function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    $('tab-' + tab).classList.remove('hidden');
    document.querySelector('[data-tab="'+tab+'"]').classList.add('active');
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'history') loadHistory();
    if (tab === 'focus') loadFocusTodos();
}

// ── Init ──
applyTheme();
$('pomodoro-count').textContent = pomodoroCount;
if (authToken && currentUser) showApp();

// ── Textarea ──
textarea.addEventListener('input', () => { const l = textarea.value.length; charCount.textContent = l; triageBtn.disabled = l === 0; });

// ── Markdown renderer ──
function renderMd(text) {
    if (!text) return '';
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/^- (.+)$/gm, '<span class="block ml-2">• $1</span>').replace(/\n/g, '<br>');
}

// ── Copy ──
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => showToast('Failed to copy','error'));
}

// ── Skeleton ──
function showSkeletons() {
    Object.values(contentIds).forEach(id => {
        $(id).innerHTML = '<div class="w-full space-y-3"><div class="skeleton-line h-4 w-3/4"></div><div class="skeleton-line h-4 w-full"></div><div class="skeleton-line h-4 w-5/6"></div></div>';
    });
    Object.values(countIds).forEach(id => $(id).classList.add('hidden'));
}

function resetCards() {
    const msgs = { 'todo-content':'Your tasks will appear here after triaging.', 'calendar-content':'Detected events and dates will show here.', 'drafts-content':'AI-drafted emails and messages appear here.', 'notes-content':'Random thoughts and ideas will be captured here.' };
    Object.entries(msgs).forEach(([id, msg]) => { $(id).innerHTML = '<p class="text-gray-600 text-sm text-center">' + msg + '</p>'; });
}

// ── Action Buttons ──
function actionBtns(itemId, copyText, category) {
    const enc = copyText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return '<div class="flex items-center gap-1 flex-shrink-0">' +
        (category === 'todo' ? '<button onclick="toggleComplete(' + itemId + ', this)" class="copy-btn text-gray-500 p-1" title="Toggle complete"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></button>' : '') +
        '<button onclick="copyToClipboard(\'' + enc + '\')" class="copy-btn text-gray-500 p-1" title="Copy"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>' +
        '<button onclick="deleteItem(' + itemId + ', this)" class="copy-btn text-gray-500 hover:!text-red-400 p-1" title="Delete"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
        '</div>';
}

// ── Inline Edit ──
function startEdit(el, itemId, field) {
    const span = el;
    const oldText = span.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.value = oldText; input.className = 'inline-edit text-sm';
    span.replaceWith(input); input.focus(); input.select();
    async function save() {
        const newText = input.value.trim();
        if (!newText || newText === oldText) { input.replaceWith(span); return; }
        try {
            const res = await api('GET', '/api/items');
            const allData = await res.json();
            let currentContent = null;
            for (const items of Object.values(allData)) {
                const found = items.find(i => i.id === itemId);
                if (found) { currentContent = {...found.content}; break; }
            }
            if (currentContent) { currentContent[field] = newText; await api('PUT', '/api/items/' + itemId, { content: currentContent }); }
            span.textContent = newText; input.replaceWith(span);
            showToast('Item updated');
        } catch { span.textContent = oldText; input.replaceWith(span); showToast('Update failed','error'); }
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { input.value = oldText; input.blur(); } });
}

// ── Toggle Complete ──
async function toggleComplete(itemId, btn) {
    const row = btn.closest('[data-item-id]');
    if (!row) return;
    const isCompleted = row.classList.contains('item-completed');
    const newStatus = isCompleted ? 'active' : 'completed';
    try {
        await api('PUT', '/api/items/' + itemId, { status: newStatus });
        row.classList.toggle('item-completed');
        showToast(newStatus === 'completed' ? 'Marked complete' : 'Marked active');
    } catch { showToast('Failed to update','error'); }
}

// ── Delete Item ──
async function deleteItem(itemId, btn) {
    const row = btn.closest('[data-item-id]');
    if (!row) return;
    try {
        await api('DELETE', '/api/items/' + itemId);
        row.style.opacity = '0'; row.style.transform = 'translateX(20px)'; row.style.transition = 'all 0.3s';
        setTimeout(() => row.remove(), 300);
        showToast('Item deleted');
    } catch { showToast('Delete failed','error'); }
}

// ── Globals ──
window.toggleAuthMode = toggleAuthMode;
window.copyToClipboard = copyToClipboard;
window.startEdit = startEdit;
window.toggleComplete = toggleComplete;
window.deleteItem = deleteItem;
window.logout = logout;
window.exportCSV = exportCSV;
window.switchTab = switchTab;
window.toggleTheme = toggleTheme;
window.useTemplate = useTemplate;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.setTimer = setTimer;
