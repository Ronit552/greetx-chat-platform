# GreetX — Modern Chat for Modern People
<p align="center">
  <img src="frontend/assets/images/logo.png" alt="GreetX Logo" width="250"/>
</p>

GreetX is a high-performance, premium chat platform designed for real human connection. Built with a sleek **Glassmorphic** aesthetic, it offers a fast, beautiful, and secure environment for real-time communication.

---

## ✨ Core Features

### 🚀 Premium Landing Page
- **Animated Hero Section**: Featuring a live-simulated chat preview and dynamic scroll-reveal animations.
- **Interactive Product Preview**: Seamlessly switch between Chat, Contacts, and Profile views before signing up.
- **Micro-animations**: Stats counters, floating icons, and smooth anchor scrolling for an engaging first impression.

### 🔐 Secure & Modern Authentication
- **Split-Screen Layout**: Immersive visual context during the onboarding process.
- **Two-Step Registration**: A streamlined flow with real-time password strength validation and verification badges.
- **Dual Login Methods**: Support for traditional Password login (fully backend integrated) and secure **OTP (One-Time Password)** authentication.
- **Auto-fill Optimization**: Custom handling for browser autofill to maintain the glassmorphic background integrity.

### 💬 Interactive Chat Experience
- **Fluid Messaging**: Real-time delivery feel with typing indicators and read receipts.
- **Rich Interaction**: Integrated emoji picker and per-message reactions (❤️, 👍, 😂, etc.).
- **Smart Sidebar**: Searchable conversation list with online status indicators and unread badges.
- **Mock Auto-Reply**: Interactive simulation of a responsive chat environment.

### 👤 Profile & Contacts Management
- **Centralized Settings**: Two-column dashboard for editing profile details (with immutable usernames), security settings, and app preferences.
- **Live Preview**: Mock image-upload with `FileReader` previews and interactive bio character counters.
- **Contact Directory**: Manage your network with searchable public profiles and friendship statuses.

### 🔎 Real-Time User Search
- **Debounced Live Search**: 300ms debounce on every keystroke prevents excessive API calls and keeps the experience fluid.
- **AbortController Race-Safety**: In-flight requests are cancelled if the user types again before the response arrives.
- **B-Tree Index**: Explicit PostgreSQL B-Tree index (`ix_users_username_btree`) on the `username` column ensures prefix-ILIKE queries stay O(log n) at scale.
- **Smart Exclusion**: Results automatically hide the searching user themselves and anyone already connected (pending or accepted friendship).
- **XSS-Safe Rendering**: All user-supplied strings are HTML-escaped before injection into the DOM.

### 📱 Unified Mobile Experience
- **Premium Side-Drawer**: A feature-rich mobile navigation system with integrated search, profile hero card, and theme switching.
- **Responsive Notification Panel**: Centered, glassmorphic panel sitting perfectly beneath the mobile navbar.
- **Optimized UI**: Native-like experience with safe-area support, mobile-first logo scaling, and fluid transitions.

### 🌓 Global Theme Engine
- **Dark/Light Mode**: Instant theme switching powered by real-time CSS variable toggling.
- **State Persistence**: Theme choice and app preferences (notifications, privacy) are securely preserved via `localStorage` for a consistent experience across sessions.

---

## 📸 UI Gallery

### 🌐 Landing Page
![Landing Page UI](screenshots/Landing_page_UI.png)

### 💬 Chat Interface
![Chat UI](screenshots/Chat_UI.png)

### 👥 Contacts Directory
![Contact UI](screenshots/Contact_UI.png)

### 👤 User Profile
![Profile UI](screenshots/Profile_UI.png)

### 🔐 Login & OTP
![Login UI](screenshots/Login_UI.png)

### 📝 Signup Flow
![Signup Step 1](screenshots/Signup_UI(1).png)
![Signup Step 2](screenshots/Signup_UI(2).png)

---

## 🛠️ Tech Stack

- **Backend**: Python Flask (Jinja2 Templates), PostgreSQL (Database), SQLAlchemy (ORM), Flask-Mail (OTP delivery)
- **Frontend**: Vanilla HTML5, CSS3 (Modern HSL Colors, Glassmorphism, CSS Variables)
- **JavaScript**: Pure Vanilla JS (No heavy frameworks, for maximum performance)
- **Icons & Fonts**: Google Fonts (Inter, Outfit), SVG Path Icons

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/signup` | — | Register a new user (OTP pre-verified) |
| `POST` | `/api/login` | — | Password login |
| `POST` | `/api/send_otp` | — | Send 6-digit OTP to email |
| `POST` | `/api/verify_otp` | — | Verify OTP for signup |
| `POST` | `/api/login_otp` | — | OTP-based login |
| `PUT`  | `/api/profile` | 🔒 Session | Update name / bio |
| `PUT`  | `/api/profile/password` | 🔒 Session | Change password |
| `POST` | `/api/logout` | 🔒 Session | Destroy session |
| `GET`  | `/api/search/users?q=` | 🔒 Session | Live prefix-search (excludes self & friends) |
| `POST` | `/api/friends/request` | 🔒 Session | Send a friend request (bidirectional duplicate check) |
| `GET`  | `/api/friends` | 🔒 Session | Get friends list + pending incoming requests |
| `POST` | `/api/friends/accept/<id>` | 🔒 Session | Accept a pending request (receiver only) |
| `POST` | `/api/friends/decline/<id>` | 🔒 Session | Decline or cancel a request |
| `GET`  | `/api/notifications` | 🔒 Session | Get all unread notifications (page load) |
| `GET`  | `/api/notifications/stream` | 🔒 Session | SSE stream — real-time push (5s poll interval) |
| `POST` | `/api/notifications/mark-read` | 🔒 Session | Mark notification IDs as read (or all) |
| `GET`  | `/api/conversations` | 🔒 Session | All friends with last message preview + unread count |
| `GET`  | `/api/messages/<peer_id>?before_id=&limit=` | 🔒 Session | Paginated message history (newest-first, 50/page) |
| `POST` | `/api/messages/<peer_id>/read` | 🔒 Session | Mark all messages from peer as read |

**SocketIO Events (client → server)**
| Event | Payload | Action |
|-------|---------|--------|
| `join_room` | `{ peer_id }` | Join private DM room (friendship-gated) |
| `send_message` | `{ receiver_id, content }` | Persist + broadcast message to room |
| `typing` | `{ peer_id }` | Broadcast typing indicator to peer |
| `stop_typing` | `{ peer_id }` | Hide typing indicator on peer's side |

**SocketIO Events (server → client)**
| Event | Payload | When |
|-------|---------|------|
| `connected` | `{ user_id }` | On authenticated connect |
| `new_message` | message object | Message saved and broadcast to room |
| `room_joined` | `{ room, peer_id }` | Confirmation after join_room |
| `typing` | `{ user_id }` | Peer started typing |
| `stop_typing` | `{ user_id }` | Peer stopped typing |

---

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ronit552/greetx-chat-platform.git
   cd greetx-chat-platform
   ```

2. **Navigate to the backend**:
   ```bash
   cd backend
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Database**:
   - Create a `.env` file in the `backend` folder.
   - Add your database URL: `database_url="postgresql://username:password@localhost:5432/greetx_db"`
   - Note: The database will be created automatically on the first run using SQLAlchemy.

5. **Run the server**:
   ```bash
   python app.py
   ```

6. **Access the app**:
   Open `http://localhost:5000/` in your browser.

---

Built with ❤️ for modern communication.
