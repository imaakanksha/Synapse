// ═══════════════════════════════════════════════════════
// Synapse v2 — Frontend Application Logic
// ═══════════════════════════════════════════════════════

// ── State ──
let authMode = 'login'; // 'login' | 'register'
let authToken = localStorage.getItem('synapse_token');
let currentUser = localStorage.getItem('synapse_user');

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

// ── Init ──
if (authToken && currentUser) showApp(); 

// ── Textarea ──
textarea.addEventListener('input', () => { const l = textarea.value.length; charCount.textContent = l; triageBtn.disabled = l === 0; });

// ── Markdown renderer (minimal) ──
function renderMd(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<span class="block ml-2">• $1</span>')
        .replace(/\n/g, '<br>');
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

// ── Action Buttons HTML ──
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
            // Find the item to get its current content
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

// ── Render Functions ──
function renderTodos(todos) {
    const el = $(contentIds.todos);
    if (!todos?.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No tasks detected.</p>'; $(countIds.todos).classList.add('hidden'); return; }
    $(countIds.todos).textContent = todos.length; $(countIds.todos).classList.remove('hidden');
    el.innerHTML = '<div class="w-full space-y-2"></div>';
    const c = el.firstChild;
    todos.forEach((t, i) => {
        const content = t.content || t;
        const id = t.id;
        const pClass = content.priority === 'high' ? 'badge-high' : content.priority === 'medium' ? 'badge-medium' : 'badge-low';
        const completed = t.status === 'completed';
        const div = document.createElement('div');
        div.className = 'animate-fade-in flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors' + (completed ? ' item-completed' : '');
        div.style.animationDelay = i * 60 + 'ms';
        div.setAttribute('data-item-id', id);
        div.innerHTML = '<span class="item-text text-sm flex-1 text-gray-300 cursor-pointer" ondblclick="startEdit(this,' + id + ',\'task\')">' + (content.task||'') + '</span>' +
            '<span class="' + pClass + ' text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">' + (content.priority||'') + '</span>' +
            actionBtns(id, content.task||'', 'todo');
        c.appendChild(div);
    });
}

function renderCalendar(events) {
    const el = $(contentIds.calendar_events);
    if (!events?.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No events detected.</p>'; $(countIds.calendar_events).classList.add('hidden'); return; }
    $(countIds.calendar_events).textContent = events.length; $(countIds.calendar_events).classList.remove('hidden');
    el.innerHTML = '<div class="w-full space-y-2"></div>';
    const c = el.firstChild;
    events.forEach((e, i) => {
        const content = e.content || e;
        const id = e.id;
        const div = document.createElement('div');
        div.className = 'animate-fade-in flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors';
        div.style.animationDelay = i * 60 + 'ms';
        div.setAttribute('data-item-id', id);
        let dateStr = content.date || '';
        if (dateStr.includes('T')) { try { const d = new Date(dateStr); dateStr = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); } catch{} }
        else { dateStr = dateStr + (content.time ? ' · ' + content.time : ''); }
        div.innerHTML = '<div class="flex-1"><p class="text-sm text-gray-300 font-medium cursor-pointer" ondblclick="startEdit(this,' + id + ',\'title\')">' + (content.title||'') + '</p><p class="text-xs text-cyan-400/70 mt-0.5">' + dateStr + '</p></div>' +
            actionBtns(id, (content.title||'') + ' — ' + (content.date||''), 'calendar');
        c.appendChild(div);
    });
}

function renderDrafts(drafts) {
    const el = $(contentIds.drafts);
    if (!drafts?.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No communications detected.</p>'; $(countIds.drafts).classList.add('hidden'); return; }
    $(countIds.drafts).textContent = drafts.length; $(countIds.drafts).classList.remove('hidden');
    el.innerHTML = '<div class="w-full space-y-2"></div>';
    const c = el.firstChild;
    drafts.forEach((d, i) => {
        const content = d.content || d;
        const id = d.id;
        const div = document.createElement('div');
        div.className = 'animate-fade-in p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors';
        div.style.animationDelay = i * 60 + 'ms';
        div.setAttribute('data-item-id', id);
        div.innerHTML = '<div class="flex items-start justify-between gap-2"><div class="flex-1"><p class="text-xs text-purple-400/70 mb-1">To: ' + (content.recipient||'') + ' &middot; ' + (content.subject||'') + '</p><p class="text-sm text-gray-300 line-clamp-3">' + (content.body||'') + '</p></div>' +
            actionBtns(id, 'To: ' + (content.recipient||'') + '\nSubject: ' + (content.subject||'') + '\n\n' + (content.body||''), 'draft') + '</div>';
        c.appendChild(div);
    });
}

function renderNotes(notes) {
    const el = $(contentIds.notes);
    if (!notes?.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No notes detected.</p>'; $(countIds.notes).classList.add('hidden'); return; }
    $(countIds.notes).textContent = notes.length; $(countIds.notes).classList.remove('hidden');
    el.innerHTML = '<div class="w-full space-y-2"></div>';
    const c = el.firstChild;
    notes.forEach((n, i) => {
        const content = n.content || n;
        const id = n.id;
        const text = typeof content === 'string' ? content : content.content || '';
        const div = document.createElement('div');
        div.className = 'animate-fade-in flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors';
        div.style.animationDelay = i * 60 + 'ms';
        div.setAttribute('data-item-id', id);
        div.innerHTML = '<span class="text-amber-400/80 mt-0.5">💡</span><span class="item-text text-sm flex-1 text-gray-300 cursor-pointer" ondblclick="startEdit(this,' + id + ',\'content\')">' + renderMd(text) + '</span>' +
            actionBtns(id, text, 'note');
        c.appendChild(div);
    });
}

// ── Load persisted items ──
async function loadItems() {
    try {
        const res = await api('GET', '/api/items');
        if (!res.ok) return;
        const data = await res.json();
        renderTodos(data.todos);
        renderCalendar(data.calendar_events);
        renderDrafts(data.drafts);
        renderNotes(data.notes);
    } catch { /* silent fail on first load */ }
}

// ── Loading State ──
function setLoading(on) {
    if (on) { btnText.textContent='Triaging...'; btnIcon.classList.add('hidden'); btnSpinner.classList.remove('hidden'); triageBtn.disabled=true; textarea.disabled=true; showSkeletons(); }
    else { btnText.textContent='Triage'; btnIcon.classList.remove('hidden'); btnSpinner.classList.add('hidden'); triageBtn.disabled=textarea.value.length===0; textarea.disabled=false; }
}

// ── Triage ──
async function triage() {
    const text = textarea.value.trim();
    if (!text) return;
    errorBanner.classList.add('hidden');
    setLoading(true);
    try {
        const res = await api('POST', '/api/triage', { text });
        if (!res.ok) { const err = await res.json().catch(()=>({detail:'Unknown error'})); throw new Error(err.detail || 'Server error (' + res.status + ')'); }
        const data = await res.json();
        renderTodos(data.todos);
        renderCalendar(data.calendar_events);
        renderDrafts(data.drafts);
        renderNotes(data.notes);
        showToast('Brain dump triaged successfully!');
        textarea.value = ''; charCount.textContent = '0';
    } catch (err) {
        errorMessage.textContent = err.message; errorBanner.classList.remove('hidden');
        showToast(err.message, 'error');
        resetCards();
    } finally { setLoading(false); }
}

triageBtn.addEventListener('click', triage);
textarea.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); triage(); } });

// ── CSV Export ──
async function exportCSV() {
    try {
        const res = await api('GET', '/api/items/export');
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'synapse_export.csv'; a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported!');
    } catch (err) { showToast(err.message, 'error'); }
}

// Make functions globally accessible
window.toggleAuthMode = toggleAuthMode;
window.copyToClipboard = copyToClipboard;
window.startEdit = startEdit;
window.toggleComplete = toggleComplete;
window.deleteItem = deleteItem;
window.logout = logout;
window.exportCSV = exportCSV;
