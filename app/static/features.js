// ═══ Synapse v3 — Features (loaded after app.js) ═══

// ── Render Functions ──
function renderTodos(todos) {
    const el = $(contentIds.todos);
    if (!todos?.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No tasks detected.</p>'; $(countIds.todos).classList.add('hidden'); return; }
    $(countIds.todos).textContent = todos.length; $(countIds.todos).classList.remove('hidden');
    el.innerHTML = '<div class="w-full space-y-2"></div>';
    const c = el.firstChild;
    todos.forEach((t, i) => {
        const content = t.content || t; const id = t.id;
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
        const content = e.content || e; const id = e.id;
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
        const content = d.content || d; const id = d.id;
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
        const content = n.content || n; const id = n.id;
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

// ── Load Items ──
async function loadItems() {
    try {
        const res = await api('GET', '/api/items');
        if (!res.ok) return;
        const data = await res.json();
        renderTodos(data.todos); renderCalendar(data.calendar_events); renderDrafts(data.drafts); renderNotes(data.notes);
    } catch { /* silent */ }
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
        renderTodos(data.todos); renderCalendar(data.calendar_events); renderDrafts(data.drafts); renderNotes(data.notes);
        showToast('Brain dump triaged successfully!');
        textarea.value = ''; charCount.textContent = '0';
    } catch (err) {
        errorMessage.textContent = err.message; errorBanner.classList.remove('hidden');
        showToast(err.message, 'error'); resetCards();
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

// ── Templates ──
const TEMPLATES = {
    morning: "I need to prepare for today's standup meeting at 10am. Remind me to review the pull requests before lunch. Also need to email Sarah about the project timeline. Ideas: maybe we should switch to a microservices architecture for the auth module.",
    meeting: "Meeting notes from today's sync: Action items - John to update the API docs by Friday. We need to schedule a design review next Tuesday at 2pm. Follow up with the client about the new requirements. Note: the deployment pipeline needs attention.",
    weekly: "This week I completed the user dashboard feature and fixed 3 bugs. Next week I need to start the notification system, review Q2 OKRs, and prepare the sprint demo for Thursday. Reminder: submit timesheet by end of day Friday.",
    project: "Project Alpha milestones: Phase 1 - complete user auth by June 1st. Phase 2 - build the data pipeline by June 15th. Blockers: waiting on API access from vendor. Dependencies: need DevOps to set up staging environment. Email the team about the revised timeline."
};

function useTemplate(key) {
    textarea.value = TEMPLATES[key] || '';
    charCount.textContent = textarea.value.length;
    triageBtn.disabled = textarea.value.length === 0;
    textarea.focus();
    showToast('Template loaded', 'info');
}

// ── Dashboard ──
async function loadDashboard() {
    try {
        const res = await api('GET', '/api/analytics/dashboard');
        if (!res.ok) return;
        const data = await res.json();
        $('stat-total').textContent = data.total_items;
        $('stat-sessions').textContent = data.total_sessions;
        $('stat-completion').textContent = data.completion.rate + '%';
        $('stat-score').textContent = data.productivity_score;
        drawCategoryChart(data.categories);
        drawActivityChart(data.activity);
        loadPriorityMatrix();
    } catch (err) { console.error('Dashboard error:', err); }
}

function drawCategoryChart(cats) {
    const canvas = $('category-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const total = cats.todo + cats.calendar + cats.draft + cats.note;
    if (total === 0) { ctx.fillStyle = '#4b5563'; ctx.font = '13px Inter'; ctx.textAlign = 'center'; ctx.fillText('No data yet', w/2, h/2); return; }
    const data = [
        { label: 'Todos', value: cats.todo, color: '#818cf8' },
        { label: 'Events', value: cats.calendar, color: '#22d3ee' },
        { label: 'Drafts', value: cats.draft, color: '#a78bfa' },
        { label: 'Notes', value: cats.note, color: '#fbbf24' },
    ];
    const cx = w/2 - 40, cy = h/2, r = 70, ir = 40;
    let angle = -Math.PI/2;
    data.forEach(d => {
        if (d.value === 0) return;
        const slice = (d.value / total) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + slice); ctx.closePath();
        ctx.fillStyle = d.color; ctx.fill();
        angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI*2); ctx.fillStyle = '#0f0d2e'; ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 18px Inter'; ctx.textAlign = 'center'; ctx.fillText(total, cx, cy + 6);
    // Legend
    let ly = 30;
    data.forEach(d => {
        ctx.fillStyle = d.color; ctx.fillRect(w - 80, ly - 8, 10, 10);
        ctx.fillStyle = '#9ca3af'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(d.label + ' (' + d.value + ')', w - 65, ly);
        ly += 20;
    });
}

function drawActivityChart(activity) {
    const canvas = $('activity-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const days = Object.keys(activity); const values = Object.values(activity);
    const max = Math.max(...values, 1);
    const barW = (w - 60) / days.length - 6;
    const chartH = h - 40;
    ctx.fillStyle = '#4b5563'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    days.forEach((day, i) => {
        const x = 30 + i * ((w - 60) / days.length) + 3;
        const barH = (values[i] / max) * (chartH - 20);
        const gradient = ctx.createLinearGradient(x, h - 25 - barH, x, h - 25);
        gradient.addColorStop(0, '#818cf8'); gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.roundRect(x, h - 25 - barH, barW, barH, 3); ctx.fill();
        ctx.fillStyle = '#6b7280'; ctx.fillText(day.slice(5), x + barW/2, h - 10);
        if (values[i] > 0) { ctx.fillStyle = '#a5b4fc'; ctx.fillText(values[i], x + barW/2, h - 30 - barH); }
    });
}

async function loadPriorityMatrix() {
    try {
        const res = await api('GET', '/api/items');
        if (!res.ok) return;
        const data = await res.json();
        const todos = (data.todos || []).filter(t => t.status === 'active');
        const urgent = [], important = [], urgImp = [], neither = [];
        todos.forEach(t => {
            const c = t.content || t;
            const text = '<p class="text-xs py-0.5">• ' + (c.task || '') + '</p>';
            if (c.priority === 'high') urgImp.push(text);
            else if (c.priority === 'medium') important.push(text);
            else neither.push(text);
        });
        $('matrix-urgent-important').innerHTML = urgImp.join('') || '<p class="text-xs text-gray-600">None</p>';
        $('matrix-important').innerHTML = important.join('') || '<p class="text-xs text-gray-600">None</p>';
        $('matrix-urgent').innerHTML = urgent.join('') || '<p class="text-xs text-gray-600">None</p>';
        $('matrix-neither').innerHTML = neither.join('') || '<p class="text-xs text-gray-600">None</p>';
    } catch { /* silent */ }
}

// ── History ──
let historyOffset = 0;
async function loadHistory(offset = 0) {
    historyOffset = offset;
    try {
        const res = await api('GET', '/api/history?limit=10&offset=' + offset);
        if (!res.ok) return;
        const data = await res.json();
        const list = $('history-list');
        if (!data.sessions.length) { list.innerHTML = '<p class="text-gray-600 text-sm text-center py-8">No triage history yet.</p>'; return; }
        list.innerHTML = data.sessions.map(s => {
            const date = new Date(s.created_at).toLocaleString();
            const preview = s.raw_text.length > 150 ? s.raw_text.substring(0, 150) + '...' : s.raw_text;
            return '<div class="history-card animate-fade-in">' +
                '<div class="flex justify-between items-start mb-2">' +
                '<div><span class="text-xs text-indigo-400 font-medium">' + date + '</span><span class="text-xs text-gray-600 ml-2">' + s.item_count + ' items generated</span></div>' +
                '<div class="flex gap-1"><button onclick="retriage(\'' + s.id + '\')" class="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition">Re-triage</button>' +
                '<button onclick="deleteSession(' + s.id + ', this)" class="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">Delete</button></div></div>' +
                '<p class="text-sm text-gray-400">' + preview.replace(/</g, '&lt;') + '</p></div>';
        }).join('');
        // Pagination
        const pg = $('history-pagination');
        pg.innerHTML = '';
        if (offset > 0) pg.innerHTML += '<button onclick="loadHistory(' + (offset - 10) + ')" class="text-xs px-3 py-1 rounded bg-indigo-500/10 text-indigo-400">← Prev</button>';
        if (offset + 10 < data.total) pg.innerHTML += '<button onclick="loadHistory(' + (offset + 10) + ')" class="text-xs px-3 py-1 rounded bg-indigo-500/10 text-indigo-400">Next →</button>';
    } catch { /* silent */ }
}

async function retriage(sessionId) {
    try {
        const res = await api('GET', '/api/history');
        const data = await res.json();
        const session = data.sessions.find(s => s.id == sessionId);
        if (session) {
            switchTab('triage');
            textarea.value = session.raw_text;
            charCount.textContent = textarea.value.length;
            triageBtn.disabled = false;
            showToast('Text loaded — click Triage to reprocess', 'info');
        }
    } catch { showToast('Failed to load session', 'error'); }
}

async function deleteSession(sessionId, btn) {
    try {
        await api('DELETE', '/api/history/' + sessionId);
        const card = btn.closest('.history-card');
        if (card) { card.style.opacity = '0'; setTimeout(() => { card.remove(); }, 300); }
        showToast('Session deleted');
    } catch { showToast('Delete failed', 'error'); }
}

// ── Search ──
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 2) { $('search-results').classList.add('hidden'); return; }
    searchTimeout = setTimeout(async () => {
        try {
            const res = await api('GET', '/api/search?q=' + encodeURIComponent(q));
            if (!res.ok) return;
            const data = await res.json();
            const sr = $('search-results');
            const all = [...(data.todos||[]), ...(data.calendar_events||[]), ...(data.drafts||[]), ...(data.notes||[])];
            if (all.length === 0) { sr.innerHTML = '<p class="text-gray-500 text-sm">No results found.</p>'; sr.classList.remove('hidden'); return; }
            sr.innerHTML = all.slice(0, 10).map(item => {
                const c = item.content;
                const text = c.task || c.title || c.content || c.subject || '';
                return '<div class="p-2 rounded-lg hover:bg-white/[0.05] transition text-sm text-gray-300 cursor-pointer" onclick="document.getElementById(\'search-results\').classList.add(\'hidden\')">' +
                    '<span class="text-xs text-indigo-400 mr-2">' + item.category + '</span>' + text.substring(0, 80) + '</div>';
            }).join('');
            sr.classList.remove('hidden');
        } catch { /* silent */ }
    }, 300);
});
document.addEventListener('click', e => { if (!e.target.closest('#search-bar')) $('search-results').classList.add('hidden'); });

// ── Focus Mode ──
async function loadFocusTodos() {
    try {
        const res = await api('GET', '/api/items');
        if (!res.ok) return;
        const data = await res.json();
        const todos = (data.todos || []).filter(t => t.status === 'active');
        const el = $('focus-todos');
        if (!todos.length) { el.innerHTML = '<p class="text-gray-600 text-sm text-center">No active tasks. Great job! 🎉</p>'; return; }
        el.innerHTML = todos.map(t => {
            const c = t.content || t;
            const pClass = c.priority === 'high' ? 'badge-high' : c.priority === 'medium' ? 'badge-medium' : 'badge-low';
            return '<div class="focus-todo-item" data-item-id="' + t.id + '">' +
                '<button onclick="toggleComplete(' + t.id + ', this)" class="copy-btn text-gray-500 p-1"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></button>' +
                '<span class="item-text flex-1 text-sm text-gray-300">' + (c.task||'') + '</span>' +
                '<span class="' + pClass + ' text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">' + (c.priority||'') + '</span></div>';
        }).join('');
    } catch { /* silent */ }
}

// ── Pomodoro Timer ──
function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    $('timer-start-btn').classList.add('hidden');
    $('timer-pause-btn').classList.remove('hidden');
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval); timerRunning = false;
            pomodoroCount++; localStorage.setItem('synapse_pomodoros', pomodoroCount);
            $('pomodoro-count').textContent = pomodoroCount;
            $('timer-start-btn').classList.remove('hidden');
            $('timer-pause-btn').classList.add('hidden');
            showToast('🍅 Pomodoro complete! Take a break.', 'success');
            try { new Audio('data:audio/wav;base64,UklGRl9vT19teleXRBVkUgZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQ==').play(); } catch {}
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval); timerRunning = false;
    $('timer-start-btn').classList.remove('hidden');
    $('timer-pause-btn').classList.add('hidden');
}

function resetTimer() {
    pauseTimer(); timerSeconds = 25 * 60; updateTimerDisplay();
    document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
    document.querySelector('.timer-preset').classList.add('active');
}

function setTimer(mins) {
    pauseTimer(); timerSeconds = mins * 60; updateTimerDisplay();
    document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    $('timer-display').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', e => {
    // Don't trigger when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') e.target.blur();
        return;
    }
    if (e.key === '?') { $('shortcuts-modal').classList.toggle('hidden'); return; }
    if (e.key === 'Escape') {
        $('shortcuts-modal').classList.add('hidden');
        $('search-results').classList.add('hidden');
        return;
    }
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k') { e.preventDefault(); searchInput.focus(); }
        if (e.key === 'd') { e.preventDefault(); switchTab('dashboard'); }
        if (e.key === 'h') { e.preventDefault(); switchTab('history'); }
        if (e.key === 'f') { e.preventDefault(); switchTab('focus'); }
    }
});

// ── Expose globals ──
window.retriage = retriage;
window.deleteSession = deleteSession;
window.loadHistory = loadHistory;
