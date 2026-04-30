/* ============================================================
   FRIENDS PAGE — contacts.js
   All data fetched from the real Flask API.
   ============================================================ */

// ─── Gradient palette for avatars ───────────────────────────────────────────
const AVATAR_GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#4f46e5)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#ec4899,#db2777)',
    'linear-gradient(135deg,#3b82f6,#2563eb)',
    'linear-gradient(135deg,#f43f5e,#e11d48)',
    'linear-gradient(135deg,#0ea5e9,#0284c7)',
];

// ─── DOM refs ────────────────────────────────────────────────────────────────
const searchInput     = document.getElementById('contacts-search-input');
const filterTabEls    = document.querySelectorAll('.filter-tab');
const friendsGrid     = document.getElementById('contacts-grid');
const pendingGrid     = document.getElementById('pending-grid');
const pendingSection  = document.getElementById('pending-section');
const emptyState      = document.getElementById('contacts-empty');
const noMatchState    = document.getElementById('contacts-no-match');
const countEl         = document.getElementById('contacts-count');

// ─── App state ───────────────────────────────────────────────────────────────
let allFriends  = [];   // accepted friends array from API
let allPending  = [];   // pending requests received by me
let activeFilter = 'all';

// ─── Utility ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function gradientFor(id) {
    return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];
}

// ─── Fetch & render friends list ─────────────────────────────────────────────
async function loadFriends() {
    try {
        const res = await fetch('/api/friends', { credentials: 'same-origin' });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (!res.ok) throw new Error('Server error');

        const data  = await res.json();
        allFriends  = data.friends          || [];
        allPending  = data.pending_received || [];

        renderAll();
    } catch (e) {
        // Replace skeletons with an error state
        friendsGrid.innerHTML = `<p style="grid-column:1/-1;color:var(--clr-text-muted);text-align:center;padding:2rem">
            ⚠️ Could not load friends. Please refresh.</p>`;
    }
}

// ─── Render everything (respects activeFilter + search query) ────────────────
function renderAll() {
    const query = (searchInput?.value || '').toLowerCase().trim();

    /* ── Pending section ── */
    if (activeFilter === 'all' || activeFilter === 'pending') {
        const filteredPending = allPending.filter(u =>
            query === '' || u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
        );

        if (filteredPending.length > 0) {
            pendingSection.classList.remove('hidden');
            pendingGrid.innerHTML = filteredPending.map((u, i) => buildPendingCard(u, i)).join('');
            // bind accept/decline
            pendingGrid.querySelectorAll('.btn-accept').forEach(btn =>
                btn.addEventListener('click', () => handleAccept(btn))
            );
            pendingGrid.querySelectorAll('.btn-decline').forEach(btn =>
                btn.addEventListener('click', () => handleDecline(btn))
            );
        } else {
            pendingSection.classList.add('hidden');
            pendingGrid.innerHTML = '';
        }
    } else {
        pendingSection.classList.add('hidden');
    }

    /* ── Friends section ── */
    if (activeFilter === 'pending') {
        friendsGrid.innerHTML = '';
        countEl.textContent   = allPending.length;
        emptyState.classList.add('hidden');
        noMatchState.classList.add('hidden');
        return;
    }

    const filteredFriends = allFriends.filter(u =>
        query === '' || u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    );

    countEl.textContent = allFriends.length;

    if (allFriends.length === 0) {
        friendsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        noMatchState.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    if (filteredFriends.length === 0 && query !== '') {
        friendsGrid.innerHTML = '';
        noMatchState.classList.remove('hidden');
    } else {
        noMatchState.classList.add('hidden');
        friendsGrid.innerHTML = filteredFriends.map((u, i) => buildFriendCard(u, i)).join('');
    }
}

// ─── Card builders ────────────────────────────────────────────────────────────
function buildFriendCard(u, i) {
    const g = gradientFor(i);
    return `
    <div class="contact-card" data-name="${escapeHtml(u.name.toLowerCase())}" data-status="friend">
        <div class="contact-avatar" style="background:${g};">${escapeHtml(u.initials)}</div>
        <h3 class="contact-name">${escapeHtml(u.name)}</h3>
        <p class="contact-handle">@${escapeHtml(u.username)}</p>
        <p class="contact-bio">${escapeHtml(u.bio || '')}</p>
        <div class="contact-actions">
            <button class="btn-msg">💬 Message</button>
        </div>
    </div>`;
}

function buildPendingCard(u, i) {
    const g = gradientFor(i + 4); // offset palette so pending looks distinct
    return `
    <div class="contact-card pending-card" data-name="${escapeHtml(u.name.toLowerCase())}" data-status="pending" data-fid="${u.friendship_id}">
        <div class="contact-avatar" style="background:${g};">${escapeHtml(u.initials)}</div>
        <span class="contact-status-dot pending-dot"></span>
        <h3 class="contact-name">${escapeHtml(u.name)}</h3>
        <p class="contact-handle">@${escapeHtml(u.username)}</p>
        <p class="contact-bio">Sent you a friend request.</p>
        <div class="contact-actions">
            <button class="btn-accept" data-fid="${u.friendship_id}">✓ Accept</button>
            <button class="btn-decline" data-fid="${u.friendship_id}">✕ Decline</button>
        </div>
    </div>`;
}

// ─── Accept / Decline handlers ────────────────────────────────────────────────
async function handleAccept(btn) {
    const fid  = btn.dataset.fid;
    const card = btn.closest('.contact-card');

    btn.disabled = true;
    btn.textContent = '…';

    try {
        const res = await fetch(`/api/friends/accept/${fid}`, {
            method: 'POST', credentials: 'same-origin'
        });
        const data = await res.json();
        if (!res.ok) { btn.disabled = false; btn.textContent = '✓ Accept'; showToast(data.error, 'error'); return; }

        showToast(data.message, 'success');
        animateCardOut(card, () => loadFriends()); // refresh whole list
    } catch {
        btn.disabled = false; btn.textContent = '✓ Accept';
        showToast('Something went wrong. Try again.', 'error');
    }
}

async function handleDecline(btn) {
    const fid  = btn.dataset.fid;
    const card = btn.closest('.contact-card');

    btn.disabled = true;
    btn.textContent = '…';

    try {
        const res = await fetch(`/api/friends/decline/${fid}`, {
            method: 'POST', credentials: 'same-origin'
        });
        const data = await res.json();
        if (!res.ok) { btn.disabled = false; btn.textContent = '✕ Decline'; showToast(data.error, 'error'); return; }

        showToast('Request declined.', 'success');
        animateCardOut(card, () => loadFriends());
    } catch {
        btn.disabled = false; btn.textContent = '✕ Decline';
        showToast('Something went wrong. Try again.', 'error');
    }
}

function animateCardOut(card, callback) {
    card.style.transition = 'opacity 0.35s, transform 0.35s';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(0.9)';
    setTimeout(callback, 380);
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
filterTabEls.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabEls.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        renderAll();
    });
});

// ─── Search input (instant filter on local data) ─────────────────────────────
if (searchInput) searchInput.addEventListener('input', renderAll);

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    let toast = document.getElementById('greetx-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'greetx-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = `greetx-toast greetx-toast--${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD FRIEND MODAL — Live Real-User Search + Real API Send
// ─────────────────────────────────────────────────────────────────────────────

const addBtn          = document.getElementById('btn-add-friend');
const modalOverlay    = document.getElementById('add-friend-overlay');
const cancelBtn       = document.getElementById('modal-cancel');
const closeXBtn       = document.getElementById('modal-close-x');
const addInput        = document.getElementById('add-friend-input');
const modalStatus     = document.getElementById('modal-status');
const resultsDropdown = document.getElementById('search-results-dropdown');
const spinnerEl       = document.getElementById('search-spinner');

function openModal()  { modalOverlay.classList.remove('hidden'); addInput?.focus(); }
function closeModal() {
    modalOverlay.classList.add('hidden');
    if (addInput) addInput.value = '';
    hideResults(); hideStatus(); clearDebounce();
}

if (addBtn)    addBtn.addEventListener('click', openModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
if (closeXBtn) closeXBtn.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ── Debounce ──────────────────────────────────────────────
let debounceTimer = null;
function clearDebounce() { clearTimeout(debounceTimer); }
function debounce(fn, delay = 300) { clearDebounce(); debounceTimer = setTimeout(fn, delay); }

// ── AbortController ───────────────────────────────────────
let currentController = null;

// ── Helpers ───────────────────────────────────────────────
function showSpinner()  { spinnerEl?.classList.remove('hidden'); }
function hideSpinner()  { spinnerEl?.classList.add('hidden'); }
function showResults()  { resultsDropdown?.classList.remove('hidden'); }
function hideResults()  { resultsDropdown?.classList.add('hidden'); if (resultsDropdown) resultsDropdown.innerHTML = ''; }
function showStatus(msg, type) {
    if (!modalStatus) return;
    modalStatus.textContent = msg;
    modalStatus.className   = `modal-status ${type}`;
}
function hideStatus() {
    if (!modalStatus) return;
    modalStatus.textContent = '';
    modalStatus.className   = 'modal-status hidden';
}

// ── Search ────────────────────────────────────────────────
async function performSearch(query) {
    if (currentController) currentController.abort();
    currentController = new AbortController();

    showSpinner(); hideResults(); hideStatus();

    try {
        const res = await fetch(
            `/api/search/users?q=${encodeURIComponent(query)}`,
            { signal: currentController.signal, credentials: 'same-origin' }
        );

        if (res.status === 401) { hideSpinner(); showStatus('Please log in to search.', 'error'); return; }
        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const users = await res.json();
        hideSpinner();

        users.length === 0 ? renderEmpty(query) : renderResults(users);

    } catch (err) {
        if (err.name === 'AbortError') return;
        hideSpinner();
        showStatus('Something went wrong. Please try again.', 'error');
    }
}

if (addInput) {
    addInput.addEventListener('input', () => {
        const val = addInput.value.trim();
        if (val.length < 2) {
            clearDebounce();
            if (currentController) currentController.abort();
            hideSpinner(); hideResults(); hideStatus();
            return;
        }
        debounce(() => performSearch(val), 300);
    });
}

function renderResults(users) {
    resultsDropdown.innerHTML = users.map((u, i) => {
        const g          = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
        const safeName   = escapeHtml(u.name);
        const safeUser   = escapeHtml(u.username);
        const safeBio    = escapeHtml(u.bio || '');
        const initials   = escapeHtml(u.initials || safeUser.slice(0, 2).toUpperCase());
        const isPending  = u.relationship === 'pending_sent';

        const actionBtn = isPending
            ? `<span class="btn-pending-pill" title="Friend request sent — awaiting acceptance">
                   <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                       <circle cx="12" cy="12" r="10"></circle>
                       <polyline points="12 6 12 12 16 14"></polyline>
                   </svg>
                   Pending
               </span>`
            : `<button class="btn-add-sm" data-uid="${u.id}" data-username="${safeUser}" aria-label="Add ${safeName}">Add</button>`;

        return `
        <div class="search-result-item" data-uid="${u.id}" data-username="${safeUser}">
            <div class="search-result-avatar" style="background:${g};">${initials}</div>
            <div class="search-result-info">
                <span class="search-result-name">${safeName}</span>
                <span class="search-result-handle">@${safeUser}</span>
                ${safeBio ? `<span class="search-result-bio">${safeBio}</span>` : ''}
            </div>
            ${actionBtn}
        </div>`;
    }).join('');

    showResults();

    // Bind "Add" buttons only (pending pills have no click handler)
    resultsDropdown.querySelectorAll('.btn-add-sm').forEach(btn =>
        btn.addEventListener('click', () => handleSendRequest(btn))
    );
}


function renderEmpty(query) {
    resultsDropdown.innerHTML = `
        <div class="search-empty-state">
            <span class="search-empty-icon">🔍</span>
            <p>No users found for <strong>@${escapeHtml(query)}</strong></p>
            <span class="search-empty-hint">Try a different username or check spelling.</span>
        </div>`;
    showResults();
}

// ── Real API send friend request ─────────────────────────
async function handleSendRequest(btn) {
    const uid      = parseInt(btn.dataset.uid, 10);
    const username = btn.dataset.username;

    btn.disabled    = true;
    btn.textContent = '…';

    try {
        const res = await fetch('/api/friends/request', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ receiver_id: uid }),
        });

        const data = await res.json();

        if (res.ok) {
            // Replace the button with a pending pill (same as pre-existing pending state)
            btn.outerHTML = `
                <span class="btn-pending-pill" title="Friend request sent — awaiting acceptance">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Pending
                </span>`;
            showStatus(`Request sent to @${escapeHtml(username)}! 🎉`, 'success');
        } else {
            btn.disabled    = false;
            btn.textContent = 'Add';
            showStatus(data.error || 'Failed to send request.', 'error');
        }
    } catch {
        btn.disabled    = false;
        btn.textContent = 'Add';
        showStatus('Network error. Please try again.', 'error');
    }
}


// ─── Initial load ─────────────────────────────────────────────────────────────
loadFriends();
