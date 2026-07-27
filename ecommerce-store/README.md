# Luxe Store - E-commerce Application

A complete, full-stack E-commerce Store web application.

## Tech Stack
**Frontend:** HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
**Backend:** Node.js, Express.js
**Database:** SQLite
**Authentication:** JSON Web Tokens (JWT) & bcrypt

## Features
- **User Authentication:** Register, Login, JWT session management, Password hashing.
- **Product Listing & Filtering:** View all products, search, and filter by categories.
- **Shopping Cart:** Add products, change quantities, remove products, view total price (stored in local storage).
- **Checkout:** Validate stock, process order, reduce stock, save order to DB.
- **Order History:** View past orders for the logged-in user.
- **Admin Dashboard:** Add, edit, and delete products (protected route).
- **UI/UX:** Modern, responsive design with glassmorphism, toast notifications, loading spinners, and clean layout.

## Setup Instructions

### Backend
1. Navigate to the backend folder: `cd ecommerce-store/backend`
2. Install dependencies: `npm install`
3. Run the server: `node server.js`
   - *Note: The SQLite database (`ecommerce.db`) will be automatically created with the necessary schemas upon starting the server.*

### Frontend
Since the frontend uses vanilla HTML/JS/CSS, it can be served using any standard HTTP server (like VS Code Live Server, or Python's `http.server`). 

1. Navigate to the frontend folder: `cd ecommerce-store/frontend`
2. Start a simple server. For example: `python3 -m http.server 8000`
3. Open your browser and navigate to `http://localhost:8000`

### Admin Access
To test the admin features, register a new user, and then manually change their role to `admin` in the SQLite database, or create a script to seed an admin user.
