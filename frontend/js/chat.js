/**
 * GreetX — Real-Time Chat Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Transport:   Flask-SocketIO (WebSocket / long-poll fallback)
 * REST:        GET /api/conversations, GET /api/messages/<peer_id>
 * Rooms:       server-enforced dm_{min}_{max} — only friends can join
 * Pagination:  infinite scroll — scroll to top → load 50 older messages
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── Bootstrap from server-rendered data attrs ─────────────
    const shell         = document.getElementById('chat-shell');
    const ME_ID         = parseInt(shell.dataset.userId, 10);
    const ME_INITIALS   = shell.dataset.userInitials || '??';
    const OPEN_PEER_ID  = parseInt(shell.dataset.openPeerId, 10) || null;

    // ── DOM refs ──────────────────────────────────────────────
    const convList        = document.getElementById('conv-list');
    const messagesArea    = document.getElementById('messages-area');
    const msgInput        = document.getElementById('msg-input');
    const sendBtn         = document.getElementById('send-btn');
    const emojiToggleBtn  = document.getElementById('emoji-toggle-btn');
    const emojiPicker     = document.getElementById('emoji-picker');
    const reactionPicker  = document.getElementById('reaction-picker');
    const chatShell       = document.getElementById('chat-shell');
    const chatPanel       = document.getElementById('chat-panel');
    const chatBackBtn     = document.getElementById('chat-back-btn');
    const chatToast       = document.getElementById('chat-toast');
    const convSearchInput = document.getElementById('conv-search');
    const headerAvatar    = document.getElementById('chat-header-avatar');
    const headerInitials  = document.getElementById('chat-header-initials');
    const headerName      = document.getElementById('chat-header-name');
    const headerStatus    = document.getElementById('chat-header-status');
    const headerDot       = document.getElementById('chat-header-dot');
    const glassNav        = document.querySelector('.glass-nav');
    const chatHeader      = document.getElementById('chat-header');
    const chatInputBar    = document.getElementById('chat-input-bar');
    const chatEmptyState  = document.getElementById('chat-empty-state');

    // ── State ─────────────────────────────────────────────────
    let socket      = null;
    let activeConv  = null;   // { peer_id, peer_name, peer_initials, color }
    let oldestMsgId = null;   // for infinite scroll
    let loadingMore = false;
    let hasMore     = true;
    let typingTimer = null;
    let isTyping    = false;
    let convData    = [];     // cache of conversation list

    // ── Avatar gradients ──────────────────────────────────────
    const GRADIENTS = [
        'linear-gradient(135deg,#6366f1,#4f46e5)',
        'linear-gradient(135deg,#f59e0b,#d97706)',
        'linear-gradient(135deg,#10b981,#059669)',
        'linear-gradient(135deg,#8b5cf6,#7c3aed)',
        'linear-gradient(135deg,#ec4899,#db2777)',
        'linear-gradient(135deg,#3b82f6,#2563eb)',
        'linear-gradient(135deg,#f43f5e,#e11d48)',
        'linear-gradient(135deg,#14b8a6,#0d9488)',
    ];
    function gradientFor(id) { return GRADIENTS[Math.abs(id) % GRADIENTS.length]; }

    // ── Helpers ───────────────────────────────────────────────
    function escapeHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function formatTime(iso) {
        const d = new Date(iso);
        let h = d.getHours(), m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
    }

    function formatPreviewTime(iso) {
        if (!iso) return '';
        const now  = new Date();
        const date = new Date(iso);
        const diff = (now - date) / 1000;
        if (diff < 60)     return 'now';
        if (diff < 3600)   return `${Math.floor(diff/60)}m`;
        if (diff < 86400)  return `${Math.floor(diff/3600)}h`;
        if (diff < 604800) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
        return `${date.getDate()}/${date.getMonth()+1}`;
    }

    function showToast(msg, duration = 2500) {
        if (!chatToast) return;
        chatToast.textContent = msg;
        chatToast.classList.remove('hidden');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => chatToast.classList.add('hidden'), duration);
    }

    function scrollToBottom(smooth = true) {
        messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }

    function isMobile() { return window.innerWidth <= 768; }

    // ── SocketIO ──────────────────────────────────────────────
    function initSocket() {
        socket = io({ withCredentials: true });

        socket.on('connected', () => { /* authenticated */ });

        socket.on('connect_error', () => {
            showToast('⚠️ Connection issue — retrying…');
        });

        socket.on('new_message', (msg) => {
            const isActive = activeConv && (
                msg.sender_id === activeConv.peer_id ||
                msg.receiver_id === activeConv.peer_id
            );
            if (isActive) {
                removeTypingIndicator();
                messagesArea.appendChild(buildMsgRow(msg));
                appendTypingIndicator();
                scrollToBottom();
                // Mark peer's message as read
                if (!msg.is_mine) {
                    fetch(`/api/messages/${activeConv.peer_id}/read`, {
                        method: 'POST', credentials: 'same-origin'
                    });
                }
            }
            // Always update sidebar preview
            refreshSidebarItem(msg);
        });

        socket.on('typing', (data) => {
            if (activeConv && data.user_id === activeConv.peer_id) showTypingIndicator();
        });

        socket.on('stop_typing', (data) => {
            if (activeConv && data.user_id === activeConv.peer_id) hideTypingIndicator();
        });

        socket.on('error', (data) => showToast(data.message || 'Error'));
    }

    // ── Conversation list ─────────────────────────────────────
    async function loadConversations() {
        renderConvSkeletons(4);
        try {
            const res = await fetch('/api/conversations', { credentials: 'same-origin' });
            if (!res.ok) return;
            convData = await res.json();
            renderConvList(convData);

            // Auto-open peer if navigated from Friends page
            if (OPEN_PEER_ID) {
                const conv = convData.find(c => c.peer_id === OPEN_PEER_ID);
                if (conv) {
                    openConversation(conv);
                } else {
                    // Peer is a friend but no messages yet — build a minimal conv object
                    const username = shell.dataset.openPeerUsername;
                    openConversation({
                        peer_id:       OPEN_PEER_ID,
                        peer_name:     username,
                        peer_username: username,
                        peer_initials: username.slice(0, 2).toUpperCase(),
                        unread_count:  0,
                        last_message:  null,
                    });
                }
            }
        } catch (_) {
            convList.innerHTML = '<li class="conv-empty">Could not load conversations.</li>';
        }
    }

    function renderConvList(convs) {
        convList.innerHTML = '';
        if (!convs.length) {
            convList.innerHTML = '<li class="conv-empty">No conversations yet.<br>Add friends to start chatting!</li>';
            return;
        }
        convs.forEach(c => convList.appendChild(buildConvItem(c)));
    }

    function buildConvItem(c) {
        const li = document.createElement('li');
        li.className = 'conv-item';
        li.dataset.peerId = c.peer_id;
        const color   = gradientFor(c.peer_id);
        const preview = c.last_message
            ? (c.last_message.is_mine ? `You: ${c.last_message.content}` : c.last_message.content)
            : 'Start a conversation…';
        const timeStr = c.last_message ? formatPreviewTime(c.last_message.timestamp) : '';
        const unread  = c.unread_count > 0
            ? `<span class="conv-unread">${c.unread_count > 99 ? '99+' : c.unread_count}</span>`
            : '';

        li.innerHTML = `
            <div class="conv-avatar" style="background:${color};">
                <span>${escapeHtml(c.peer_initials)}</span>
                <span class="conv-status-dot"></span>
            </div>
            <div class="conv-info">
                <div class="conv-top">
                    <span class="conv-name">${escapeHtml(c.peer_name)}</span>
                    <span class="conv-time">${timeStr}</span>
                </div>
                <div class="conv-bottom">
                    <span class="conv-last">${escapeHtml(preview.slice(0, 42))}${preview.length > 42 ? '…' : ''}</span>
                    ${unread}
                </div>
            </div>`;

        li.addEventListener('click', () => openConversation(c));
        return li;
    }

    function renderConvSkeletons(n) {
        convList.innerHTML = Array(n).fill(0).map(() => `
            <li class="conv-item conv-skeleton">
                <div class="skel skel-avatar"></div>
                <div class="conv-info">
                    <div class="skel skel-line skel-name"></div>
                    <div class="skel skel-line skel-preview"></div>
                </div>
            </li>`).join('');
    }

    // ── Open conversation ─────────────────────────────────────
    async function openConversation(conv) {
        if (activeConv?.peer_id === conv.peer_id && !isMobile()) return;

        activeConv  = { ...conv, color: gradientFor(conv.peer_id) };
        window.currentChatPeerId = activeConv.peer_id;
        oldestMsgId = null;
        hasMore     = true;

        // Sidebar active state
        convList.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
        const li = convList.querySelector(`[data-peer-id="${conv.peer_id}"]`);
        if (li) {
            li.classList.add('active');
            li.querySelector('.conv-unread')?.remove();
        }

        updateHeader(activeConv);
        
        if (chatHeader) chatHeader.classList.remove('hidden');
        if (chatInputBar) chatInputBar.classList.remove('hidden');
        messagesArea.classList.remove('hidden');
        if (chatEmptyState) chatEmptyState.classList.add('hidden');

        messagesArea.innerHTML = '';
        renderMsgSkeletons(6);

        // Join SocketIO room
        socket.emit('join_room', { peer_id: conv.peer_id });

        // Load message history
        await loadMessages(conv.peer_id);

        if (isMobile()) {
            chatShell.classList.add('panel-visible');
            if (glassNav) glassNav.classList.add('nav-hidden');
        }
    }

    // ── Load messages (paginated) ─────────────────────────────
    async function loadMessages(peer_id, before_id = null) {
        if (loadingMore) return;
        loadingMore = true;

        try {
            const url = `/api/messages/${peer_id}` + (before_id ? `?before_id=${before_id}` : '');
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) throw new Error();
            const msgs = await res.json();

            if (!before_id) {
                // Initial load — clear skeletons
                messagesArea.innerHTML = '';
            }

            if (msgs.length === 0 && !before_id) {
                messagesArea.innerHTML = `
                    <div class="msg-empty-state">
                        <div class="msg-empty-icon">💬</div>
                        <p>No messages yet. Say hello!</p>
                    </div>`;
                hasMore = false;
                appendTypingIndicator();
                return;
            }

            if (msgs.length < 50) hasMore = false;

            if (before_id) {
                // Infinite scroll: prepend older messages, preserve scroll position
                const prevH = messagesArea.scrollHeight;
                // Insert a "load more" divider if needed
                if (msgs.length > 0) {
                    msgs.forEach(m => {
                        const row = buildMsgRow(m);
                        messagesArea.insertBefore(row, messagesArea.firstChild);
                    });
                    // Remove loading spinner at top
                    messagesArea.querySelector('.load-more-spinner')?.remove();
                    messagesArea.scrollTop = messagesArea.scrollHeight - prevH;
                }
            } else {
                // Insert date divider
                const divider = document.createElement('div');
                divider.className = 'msg-date-divider';
                divider.innerHTML = '<span>Today</span>';
                messagesArea.appendChild(divider);

                msgs.forEach(m => messagesArea.appendChild(buildMsgRow(m)));
                appendTypingIndicator();
                scrollToBottom(false);
            }

            if (msgs.length > 0) oldestMsgId = msgs[0].id;

        } catch (_) {
            if (!before_id) messagesArea.innerHTML = '<div class="msg-empty-state"><p>Could not load messages.</p></div>';
        } finally {
            loadingMore = false;
        }
    }

    // ── Infinite scroll ───────────────────────────────────────
    messagesArea.addEventListener('scroll', () => {
        if (messagesArea.scrollTop < 80 && hasMore && !loadingMore && activeConv) {
            // Show spinner at top
            const spinner = document.createElement('div');
            spinner.className = 'load-more-spinner';
            spinner.textContent = '⏳ Loading older messages…';
            messagesArea.insertBefore(spinner, messagesArea.firstChild);
            loadMessages(activeConv.peer_id, oldestMsgId);
        }
    });

    // ── Build message row ─────────────────────────────────────
    function buildMsgRow(msg) {
        const isMe = msg.is_mine;
        const time = formatTime(msg.timestamp);
        const row  = document.createElement('div');
        row.className    = `msg-row ${isMe ? 'outgoing' : 'incoming'}`;
        row.dataset.msgId = msg.id;

        if (isMe) {
            row.innerHTML = `
                <div class="msg-group">
                    <div class="msg-bubble outgoing" data-msg-id="${msg.id}">
                        <p>${escapeHtml(msg.content)}</p>
                        <span class="msg-time">${time}
                            <span class="msg-status ${msg.is_read ? 'read' : ''}">✓✓</span>
                        </span>
                    </div>
                </div>`;
        } else {
            const color    = activeConv?.color || gradientFor(0);
            const initials = activeConv?.peer_initials || '??';
            row.innerHTML = `
                <div class="msg-bubble-avatar" style="background:${color};">${escapeHtml(initials)}</div>
                <div class="msg-group">
                    <div class="msg-bubble incoming" data-msg-id="${msg.id}">
                        <p>${escapeHtml(msg.content)}</p>
                        <span class="msg-time">${time}</span>
                    </div>
                </div>`;
        }
        return row;
    }

    // ── Typing indicator ──────────────────────────────────────
    function appendTypingIndicator() {
        removeTypingIndicator();
        const color    = activeConv?.color || gradientFor(0);
        const initials = activeConv?.peer_initials || '??';
        const row = document.createElement('div');
        row.className = 'msg-row incoming hidden';
        row.id = 'typing-indicator';
        row.innerHTML = `
            <div class="msg-bubble-avatar" style="background:${color};">${escapeHtml(initials)}</div>
            <div class="msg-bubble incoming typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>`;
        messagesArea.appendChild(row);
    }

    function removeTypingIndicator() {
        document.getElementById('typing-indicator')?.remove();
    }

    function showTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) { el.classList.remove('hidden'); scrollToBottom(); }
    }

    function hideTypingIndicator() {
        document.getElementById('typing-indicator')?.classList.add('hidden');
    }

    function renderMsgSkeletons(n) {
        messagesArea.innerHTML = Array(n).fill(0).map((_, i) => {
            const isMe = i % 3 === 2;
            return `<div class="msg-row ${isMe ? 'outgoing' : 'incoming'} msg-skeleton-row">
                <div class="skel skel-msg${isMe ? ' skel-msg-out' : ''}"></div>
            </div>`;
        }).join('');
    }

    // ── Update header ─────────────────────────────────────────
    function updateHeader(conv) {
        headerInitials.textContent = conv.peer_initials;
        headerAvatar.style.background = conv.color;
        headerName.textContent = conv.peer_name;
        headerDot.className = 'chat-header-dot';
        headerStatus.textContent = `@${conv.peer_username}`;
    }

    // ── Sidebar preview refresh ───────────────────────────────
    function refreshSidebarItem(msg) {
        const peer_id = msg.is_mine ? msg.receiver_id : msg.sender_id;
        let li = convList.querySelector(`[data-peer-id="${peer_id}"]`);

        if (!li) {
            // New conversation — reload the sidebar
            loadConversations();
            return;
        }

        const preview = msg.is_mine ? `You: ${msg.content}` : msg.content;
        const lastEl  = li.querySelector('.conv-last');
        const timeEl  = li.querySelector('.conv-time');
        if (lastEl) lastEl.textContent = preview.slice(0, 42) + (preview.length > 42 ? '…' : '');
        if (timeEl) timeEl.textContent = 'now';

        // Unread badge (only if not the active conversation)
        if (!activeConv || activeConv.peer_id !== peer_id) {
            let badge = li.querySelector('.conv-unread');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'conv-unread';
                li.querySelector('.conv-bottom')?.appendChild(badge);
            }
            const cur = parseInt(badge.textContent, 10) || 0;
            badge.textContent = cur + 1;
        }

        // Bubble to top of list
        convList.insertBefore(li, convList.firstChild);
    }

    // ── Send message ──────────────────────────────────────────
    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text || !activeConv || !socket) return;

        socket.emit('send_message', { receiver_id: activeConv.peer_id, content: text });

        msgInput.value = '';
        msgInput.style.height = 'auto';
        sendBtn.disabled = true;

        if (isTyping) {
            socket.emit('stop_typing', { peer_id: activeConv.peer_id });
            isTyping = false;
            clearTimeout(typingTimer);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // ── Typing detection ──────────────────────────────────────
    msgInput.addEventListener('input', () => {
        msgInput.style.height = 'auto';
        msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
        sendBtn.disabled = !msgInput.value.trim();

        if (!socket || !activeConv) return;
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', { peer_id: activeConv.peer_id });
        }
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            socket.emit('stop_typing', { peer_id: activeConv.peer_id });
        }, 2500);
    });

    // ── Conversation search (sidebar filter) ──────────────────
    convSearchInput.addEventListener('input', () => {
        const q = convSearchInput.value.toLowerCase().trim();
        convList.querySelectorAll('.conv-item').forEach(li => {
            const name = (li.querySelector('.conv-name')?.textContent || '').toLowerCase();
            li.style.display = name.includes(q) ? '' : 'none';
        });
    });

    // ── Emoji picker ──────────────────────────────────────────
    emojiToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
        reactionPicker.classList.add('hidden');
    });

    emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pos = msgInput.selectionStart;
            const val = msgInput.value;
            msgInput.value = val.slice(0, pos) + btn.dataset.emoji + val.slice(pos);
            msgInput.focus();
            msgInput.selectionStart = msgInput.selectionEnd = pos + btn.dataset.emoji.length;
            sendBtn.disabled = !msgInput.value.trim();
            emojiPicker.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiToggleBtn)
            emojiPicker.classList.add('hidden');
        if (!reactionPicker.contains(e.target))
            reactionPicker.classList.add('hidden');
    });

    // ── Mobile back button ────────────────────────────────────
    chatBackBtn.addEventListener('click', () => {
        chatShell.classList.remove('panel-visible');
        if (glassNav) glassNav.classList.remove('nav-hidden');
    });

    function handleResize() {
        if (!isMobile()) {
            chatBackBtn.classList.add('hidden');
            chatShell.classList.remove('panel-visible');
            if (glassNav) glassNav.classList.remove('nav-hidden');
        } else {
            chatBackBtn.classList.remove('hidden');
        }
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // ── Action button toasts ──────────────────────────────────
    document.getElementById('voice-call-btn')?.addEventListener('click', () => showToast('📞 Voice call coming soon!'));
    document.getElementById('video-call-btn')?.addEventListener('click', () => showToast('🎥 Video call coming soon!'));
    document.getElementById('search-in-chat-btn')?.addEventListener('click', () => showToast('🔍 In-chat search coming soon!'));
    document.getElementById('chat-more-btn')?.addEventListener('click', () => showToast('⚙️ More options coming soon!'));
    document.getElementById('attach-btn')?.addEventListener('click', () => showToast('📎 File attachment coming soon!'));
    document.getElementById('sidebar-new-btn')?.addEventListener('click', () => showToast('✨ New chat — pick a friend!'));

    // ── Skeleton CSS (injected — no separate file needed) ─────
    const skStyle = document.createElement('style');
    skStyle.textContent = `
        .conv-skeleton { pointer-events: none; opacity: 0.6; }
        .skel { background: var(--clr-glass-card-header); border-radius: 8px; animation: skelPulse 1.4s ease infinite; }
        .skel-avatar  { width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; }
        .skel-line    { height: 11px; margin-bottom: 6px; }
        .skel-name    { width: 55%; }
        .skel-preview { width: 80%; }
        .msg-skeleton-row { opacity: 0.5; }
        .skel-msg     { height: 36px; width: 180px; border-radius: 14px; }
        .skel-msg-out { margin-left: auto; }
        .load-more-spinner { text-align: center; font-size: 0.78rem; color: var(--clr-text-muted); padding: 0.5rem; }
        .msg-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center;
            height:100%; gap:0.6rem; color:var(--clr-text-muted); font-size:0.9rem; }
        .msg-empty-icon { font-size: 2.5rem; }
        .conv-empty { padding: 1.5rem 1rem; font-size: 0.85rem; color: var(--clr-text-muted);
            text-align: center; line-height: 1.6; list-style: none; }
        @keyframes skelPulse {
            0%,100% { opacity: 1; } 50% { opacity: 0.4; }
        }
    `;
    document.head.appendChild(skStyle);

    // ── Boot ──────────────────────────────────────────────────
    initSocket();
    loadConversations();

})();
