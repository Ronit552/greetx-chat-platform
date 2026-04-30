/* ============================================================
   NOTIFICATIONS.JS — Real-Time Notification Client
   ============================================================
   Strategy: Server-Sent Events (SSE) via EventSource.
   - Connects to GET /api/notifications/stream
   - Browser auto-reconnects on drop; Last-Event-ID header
     ensures no duplicate notifications after reconnect.
   - On each event: updates badge, prepends item to panel,
     and plays a synthesized chime via Web Audio API.
   ============================================================ */

(function () {
    'use strict';

    // ── DOM refs ─────────────────────────────────────────────
    const badge      = document.getElementById('notif-badge');
    const notifList  = document.getElementById('notif-list');
    const emptyState = document.getElementById('notif-empty-state');
    const clearBtn   = document.getElementById('notif-clear-all');
    const notifBtn   = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');

    // ── State ─────────────────────────────────────────────────
    let unreadCount = 0;
    const seenIds   = new Set();    // track rendered IDs to avoid duplicates

    // ── Avatar gradient palette ───────────────────────────────
    const GRADIENTS = [
        'linear-gradient(135deg,#6366f1,#4f46e5)',
        'linear-gradient(135deg,#f59e0b,#d97706)',
        'linear-gradient(135deg,#10b981,#059669)',
        'linear-gradient(135deg,#8b5cf6,#7c3aed)',
        'linear-gradient(135deg,#ec4899,#db2777)',
        'linear-gradient(135deg,#3b82f6,#2563eb)',
    ];

    function gradientFor(id) {
        return GRADIENTS[Math.abs(id) % GRADIENTS.length];
    }

    // ── Badge management ──────────────────────────────────────
    function updateBadge(count) {
        unreadCount = count;
        if (!badge) return;
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.toggle('hidden', count === 0);
    }

    function incrementBadge() { updateBadge(unreadCount + 1); }

    // ── Notification sound (Web Audio API — no audio files) ───
    let audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (_) { return null; }
        }
        return audioCtx;
    }

    function playChime() {
        const ctx = getAudioCtx();
        if (!ctx) return;

        // Two-note rising chime: 880 Hz → 1100 Hz
        [
            { freq: 880,  startAt: 0,    duration: 0.35 },
            { freq: 1100, startAt: 0.15, duration: 0.4  },
        ].forEach(({ freq, startAt, duration }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type            = 'sine';
            osc.frequency.value = freq;

            const t0 = ctx.currentTime + startAt;
            gain.gain.setValueAtTime(0,    t0);
            gain.gain.linearRampToValueAtTime(0.25, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

            osc.start(t0);
            osc.stop(t0 + duration + 0.05);
        });
    }

    // ── Relative time formatter ───────────────────────────────
    function relativeTime(isoString) {
        const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
        if (diff < 60)  return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // ── Notification text builder ─────────────────────────────
    function notifText(n) {
        const name = `<strong>${esc(n.from_name)}</strong>`;
        if (n.type === 'friend_request')  return `${name} sent you a friend request.`;
        if (n.type === 'friend_accepted') return `${name} accepted your friend request! 🎉`;
        return `${name} sent a notification.`;
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Render one notification item ──────────────────────────
    function renderNotif(n, prepend = true) {
        if (seenIds.has(n.id)) return;   // deduplicate
        seenIds.add(n.id);

        if (!notifList) return;

        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';

        const li = document.createElement('li');
        li.className    = 'notif-item unread';
        li.dataset.id   = n.id;
        li.dataset.type = n.type;
        li.innerHTML = `
            <div class="notif-avatar" style="background:${gradientFor(n.id)};">${esc(n.from_initials)}</div>
            <div class="notif-body">
                <p class="notif-text">${notifText(n)}</p>
                <span class="notif-time">${relativeTime(n.created_at)}</span>
            </div>
            <span class="notif-dot"></span>`;

        // Click → mark as read, close panel, and navigate
        li.addEventListener('click', () => {
            markRead([n.id], li);
            if (notifPanel) notifPanel.classList.add('hidden');
            
            // Both friend_request and friend_accepted relate to the Friends page
            if (n.type === 'friend_request' || n.type === 'friend_accepted') {
                window.location.href = '/contacts';
            }
        });

        if (prepend && notifList.firstChild) {
            notifList.insertBefore(li, notifList.firstChild);
        } else {
            notifList.appendChild(li);
        }
    }

    // ── Mark notifications as read ────────────────────────────
    async function markRead(ids, liEl) {
        try {
            await fetch('/api/notifications/mark-read', {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body:        JSON.stringify({ ids }),
            });
        } catch (_) { /* best-effort */ }

        ids.forEach(id => {
            const el = liEl || notifList?.querySelector(`[data-id="${id}"]`);
            if (el) el.classList.remove('unread');
        });
        updateBadge(Math.max(0, unreadCount - ids.length));
    }

    // ── Mark ALL as read (header button) ─────────────────────
    async function markAllRead() {
        try {
            await fetch('/api/notifications/mark-read', {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body:        JSON.stringify({}),   // empty = all
            });
        } catch (_) { /* best-effort */ }

        notifList?.querySelectorAll('.notif-item.unread')
                  .forEach(el => el.classList.remove('unread'));
        updateBadge(0);
    }

    if (clearBtn) clearBtn.addEventListener('click', markAllRead);

    // ── Load existing unread notifications on page load ───────
    // Returns the highest notification ID seen so SSE can start AFTER it.
    async function loadInitial() {
        let maxId = 0;
        try {
            const res  = await fetch('/api/notifications', { credentials: 'same-origin' });
            if (!res.ok) return 0;
            const list = await res.json();

            // Append oldest-first (list is newest-first from API, so reverse)
            [...list].reverse().forEach(n => {
                renderNotif(n, false);          // append (no sound, no badge bump)
                if (n.id > maxId) maxId = n.id;
            });
            updateBadge(list.filter(n => !n.is_read).length);
        } catch (_) { /* fail silently */ }
        return maxId;
    }

    // ── SSE connection — starts AFTER already-known max ID ─────
    function connectSSE(startAfter = 0) {
        if (!badge) return;   // not logged in

        // ?after= tells server to skip notifications already fetched by loadInitial.
        // On auto-reconnect, EventSource sends Last-Event-ID header automatically.
        const es = new EventSource(`/api/notifications/stream?after=${startAfter}`);

        es.onmessage = (event) => {
            let n;
            try { n = JSON.parse(event.data); } catch (_) { return; }

            if (!['friend_request', 'friend_accepted'].includes(n.type)) return;

            renderNotif(n, true);   // prepend — newest first
            incrementBadge();
            playChime();

            // If the Friends page is open, refresh its list
            if (typeof loadFriends === 'function') loadFriends();
        };

        es.onerror = () => { /* EventSource auto-reconnects — nothing to do */ };
    }

    // ── Bell button toggle ────────────────────────────────────
    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
                notifPanel.classList.add('hidden');
            }
        });
    }

    // ── CSS for empty state (injected so no separate CSS file needed) ─
    const style = document.createElement('style');
    style.textContent = `
        .notif-empty-state {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2rem 1rem;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            list-style: none;
        }
    `;
    document.head.appendChild(style);

    // ── Boot — load existing first, THEN open SSE from that point ─
    loadInitial().then(maxId => connectSSE(maxId));

})();
