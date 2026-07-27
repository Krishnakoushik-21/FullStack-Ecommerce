# ShopEase

ShopEase is a full-stack e-commerce web application. It features a modern, responsive UI designed for desktop displays, offering a premium shopping experience.

## Links

- 🌐 **Live Website:** [shopease-demo.com](https://shopease-demo.com) *(Placeholder)*
- 📱 **Android App:** [Download on Google Play](#) *(Placeholder)*
- 🍏 **iOS App:** [Download on the App Store](#) *(Placeholder)*

## Tech Stack

### Frontend
- **HTML5 & CSS3:** Semantic markup and modern CSS styling with dark mode support.
- **Vanilla JavaScript:** Custom SPA (Single Page Application) routing and dynamic DOM manipulation without heavy frameworks.
- **Responsive Design:** A fully responsive grid system supporting various desktop viewports, transitioned from a mobile-first approach to a full-width desktop layout.

### Backend
- **Node.js & Express.js:** RESTful API server.
- **SQLite:** Lightweight, serverless relational database for storing users, products, orders, and application data.
- **Authentication:** JWT (JSON Web Tokens) for secure, stateless user sessions, along with `bcrypt` for password hashing.

## Features

- **User Authentication:** Secure registration and login using JWT.
- **Google Sign-In:** Seamless OAuth 2.0 authentication integrated via Google Identity Services (`google-auth-library`).
- **Product Catalog:** Browse products across various categories.
- **Search:** Quickly search for products, brands, or categories.
- **Shopping Cart:** Add products to cart, manage quantities, and proceed to checkout.
- **Wishlist:** Save favorite products for later.
- **Order Management:** View order history and order success tracking.
- **User Profile:** Manage user settings and profile details.
- **Dark Mode:** Built-in theme toggling stored in local storage for user preference retention.

## Project Structure

```
ShopEase/
├── backend/
│   ├── controllers/      # Route logic handlers
│   ├── database/         # Database configuration and schema setup
│   ├── middleware/       # Express middleware (e.g., auth checks)
│   ├── models/           # Database interaction logic
│   ├── routes/           # Express API route definitions
│   ├── services/         # Business logic
│   ├── uploads/          # User-uploaded files (e.g., images)
│   ├── package.json      # Backend dependencies
│   └── server.js         # Main Express server entry point
└── frontend/
    ├── assets/           # Images and static resources
    ├── css/              # Stylesheets (home, login, responsive, etc.)
    ├── js/               # Frontend logic (app.js, api.js, auth.js, etc.)
    ├── pages/            # HTML partials/views for SPA
    ├── index.html        # Main HTML file (Entry point)
    ├── manifest.json     # PWA manifest
    └── service-worker.js # PWA service worker
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ShopEase
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the `backend` directory and configure any necessary environment variables (e.g., `PORT`, `JWT_SECRET`).

4. **Run the Application:**
   ```bash
   npm start
   ```
   Or if you are developing, you can use `node server.js` inside the `backend` directory. 
   The server will run on the specified port (default 3000) and serve the frontend statically.

5. **Access the App:**
   Open your browser and navigate to `http://localhost:3000`.

## Architecture Details

- **Single Page Application (SPA):** The frontend relies on a custom javascript router (`app.js`) to load different views into the main `index.html` container without full page reloads.
- **API First:** The backend acts purely as a REST API, communicating with the frontend via JSON. This cleanly separates concerns between the UI and data layers.
