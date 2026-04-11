# GreetX Chat Platform

Welcome to the GreetX Chat Platform! This is a modern chatting application built with a Python Flask backend.

- **Global Glassmorphic Navigation & Dark Mode Theme**: A sleek, universally available top Navbar built directly into a dynamic Jinja2 `base.html` master layout. Integrated with real-time CSS `<root>` variable toggling for instant Dark/Light theme switching securely preserved via `localStorage`.
- **Advanced Profile Settings Dashboard**: A beautifully separated two-column layout providing horizontal tabs to navigate through Edit Profile, Security, and App Preferences without cluttering user inputs. Enforces UX-driven separation of concerns.
- **Pro-Level Activity & Verification Suite**: Features real-time username availability querying, mock image-upload `FileReader` previews, and live interactive bio character counters to ensure dynamic user input checks before submission.
- **Modern Split-Screen Signup Page**: A two-step registration flow with beautiful glassmorphism aesthetics.
- **Glassmorphic Login Interface**: A cohesive authentication view featuring interactive image layers, secure auto-fill background handling, and smooth password visibility toggling.
- **OTP Login Flow**: Seamlessly embedded within the login UI, allowing users to toggle to an OTP (One-Time Password) entry form natively.
- **Mobile Responsive Design**: Features a highly optimized, single-column, mobile-first layout with clean typography, refined spacing, and a dynamically styled top-left brand logo. It relies on a distraction-free glassmorphic card format tailored for conversion.
- **Real-time form validation** with seamless browser autofill integration and **password strength indication**.
- Interactive UI elements including inline verification badges, toggle switches, and animated, premium-feel buttons.

## Screenshots

### Signup Page

![Signup Step 1](screenshots/signup_page_Screenshot%281%29.png)

![Signup Step 2](screenshots/signup_page_Screenshot%282%29.png)

## Getting Started

1. Navigate to the `backend` directory.
2. Run `python app.py` to start the Flask server.
3. Access the application in your browser (typically at `http://127.0.0.1:5000/`).