// ——— Contacts filter & search ———
const searchInput  = document.getElementById('contacts-search-input');
const filterTabs   = document.querySelectorAll('.filter-tab');
const cards        = document.querySelectorAll('.contact-card');
const emptyState   = document.getElementById('contacts-empty');
const countEl      = document.getElementById('contacts-count');

let activeFilter = 'all';

function applyFilters() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    let visible = 0;

    cards.forEach(card => {
        const name   = card.dataset.name || '';
        const status = card.dataset.status || '';

        const matchSearch = name.includes(query) || query === '';
        const matchFilter = activeFilter === 'all' || status === activeFilter;

        if (matchSearch && matchFilter) {
            card.style.display = '';
            visible++;
        } else {
            card.style.display = 'none';
        }
    });

    if (countEl) countEl.textContent = visible;
    if (emptyState) emptyState.classList.toggle('hidden', visible > 0);
}

// Search listener
if (searchInput) searchInput.addEventListener('input', applyFilters);

// Filter tab listener
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        applyFilters();
    });
});

// ——— Accept / Decline pending requests ———
document.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', () => {
        const card = btn.closest('.contact-card');
        if (!card) return;

        // Animate out then remove pending state
        card.style.transition = 'opacity 0.4s, transform 0.4s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            card.dataset.status = 'online';
            card.classList.remove('pending-card');
            card.style.opacity = '';
            card.style.transform = '';
            const dot = card.querySelector('.contact-status-dot');
            if (dot) { dot.classList.remove('pending-dot'); dot.classList.add('online'); }
            const actionsDiv = card.querySelector('.contact-actions');
            const bio = card.querySelector('.contact-bio');
            if (bio) bio.textContent = 'Now a contact! 🎉';
            if (actionsDiv) {
                actionsDiv.innerHTML = `<button class="btn-msg">💬 Message</button>
                                        <button class="btn-more">···</button>`;
                // Re-bind btn-msg (no real nav needed)
            }
            applyFilters();
        }, 350);
    });
});

document.querySelectorAll('.btn-decline').forEach(btn => {
    btn.addEventListener('click', () => {
        const card = btn.closest('.contact-card');
        if (!card) return;
        card.style.transition = 'opacity 0.4s, transform 0.4s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            card.remove();
            applyFilters();
        }, 400);
    });
});

// ——— Add Friend Modal ———
const addBtn        = document.getElementById('btn-add-friend');
const modalOverlay  = document.getElementById('add-friend-overlay');
const cancelBtn     = document.getElementById('modal-cancel');
const sendBtn       = document.getElementById('modal-send');
const addInput      = document.getElementById('add-friend-input');
const modalStatus   = document.getElementById('modal-status');

const fakeUsers     = ['alice', 'bob_dev', 'charlie23', 'diana_ux', 'ethan.code'];
const takenMessages = {
    'alice':      'Request sent to @alice! ✅',
    'bob_dev':    'Request sent to @bob_dev! ✅',
    'charlie23':  'Request sent to @charlie23! ✅',
    'diana_ux':   'Request sent to @diana_ux! ✅',
    'ethan.code': 'Request sent to @ethan.code! ✅',
};

if (addBtn) addBtn.addEventListener('click', () => modalOverlay.classList.remove('hidden'));

if (cancelBtn) cancelBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    if (addInput) addInput.value = '';
    if (modalStatus) { modalStatus.textContent = ''; modalStatus.className = 'modal-status hidden'; }
});

if (sendBtn) sendBtn.addEventListener('click', () => {
    const val = (addInput?.value || '').toLowerCase().trim();
    if (!val) {
        showStatus('Please enter a username.', 'error');
        return;
    }
    if (fakeUsers.includes(val)) {
        showStatus(takenMessages[val], 'success');
    } else {
        showStatus(`No user "@${val}" found on GreetX.`, 'error');
    }
});

function showStatus(msg, type) {
    if (!modalStatus) return;
    modalStatus.textContent = msg;
    modalStatus.className = `modal-status ${type}`;
}
