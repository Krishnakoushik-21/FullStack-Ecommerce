# LuxeStore - Waydroid Mobile-First PWA

A full-stack, Progressive Web Application (PWA) specifically optimized for the Waydroid (Android) environment. It features a native app-like Material Design 3 interface, offline support via Service Workers, and smooth CSS-based swipe and page transition animations.

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Single Page Application architecture)
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

## Core Features
- **Mobile-First UI:** Built specifically for mobile screens with a static Bottom Navigation bar and safe area insets.
- **Progressive Web App (PWA):** Installable in Chromium on Waydroid. Includes `manifest.json`, high-res icons (192x192 & 512x512), and an offline-capable Service Worker.
- **Material Design 3:** Custom CSS implementation of Google's MD3 tokens, including native Dark Mode and Light Mode support via media queries.
- **Animations:** Fluid `slideInRight`, `slideOutLeft`, and `fadeIn` page transitions without relying on heavy JS libraries like React or Vue.
- **Authentication:** Secure JWT-based Login and Registration. Prepared for future MSG91 OTP integration.
- **Shopping Flow:** Categories, Product Discovery, Shopping Cart with real-time totals, and Favorites/Wishlist management.
- **Smart Checkout:** Integrates the HTML5 Geolocation API with an OpenStreetMap fallback to automatically autofill user address, city, and pincode. Supports COD and UPI payment selections.
- **Order Management:** Processes orders via backend SQLite transactions and displays order history in the User Profile.

## Project Structure
```text
waydroid_pwa_ecommerce/
├── backend/
│   ├── database.js          # SQLite Schema and seeding
│   ├── server.js            # Express Entry Point
│   ├── middleware/
│   │   └── auth.js          # JWT Validation
│   └── routes/
│       ├── auth.js          # Login, Reg, OTP
│       ├── products.js      # Fetch products & categories
│       └── orders.js        # Checkout & Order History
└── frontend/
    ├── index.html           # Main SPA HTML container
    ├── manifest.json        # PWA configuration
    ├── service-worker.js    # Offline caching logic
    ├── css/
    │   ├── style.css        # MD3 Tokens and Global UI
    │   ├── animations.css   # Page transitions and ripples
    │   └── responsive.css   # Mobile-first constraints
    └── js/
        ├── app.js           # Vanilla JS SPA Router & Logic
        ├── api.js           # API Wrapper
        ├── auth.js          # Auth State Management
        └── geolocation.js   # Geolocation API integration
```

## Setup & Run Instructions

### 1. Start the Backend
```bash
cd backend
npm install
npm start
```
*The SQLite database (`database.sqlite`) will automatically initialize and seed itself with dummy products upon the first run. The server runs on port 3000.*

### 2. Start the Frontend
Since this is a PWA that relies on Service Workers and API fetch calls, it must be served via a web server (do not just open the HTML file directly).
```bash
# Using Python
cd frontend
python3 -m http.server 8000

# Or using Node 'serve'
npx serve frontend -p 8000
```

### 3. Usage in Waydroid
1. Open the **Chromium Browser** inside Waydroid.
2. Navigate to your host machine's local IP address and the frontend port (e.g., `http://192.168.1.5:8000`).
3. You will be prompted to **Install App** to your Waydroid launcher.
4. Once installed, test the app in full-screen mode. You can also disable Waydroid's internet access to test the Service Worker's offline caching capabilities.
