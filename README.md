# Money Magnet - Finance Management Application

A personal finance management application built with Quasar Framework (Vue 3) frontend and Hapi.js backend.

## Features

- **Authentication**: Simple login system (user: mike, password: password)
- **Financial Summary**: View income and expenses by weekly, monthly, or yearly periods
- **Transaction Management**: Add and manage income/expense transactions
- **Forecast**: Project future balance based on current spending patterns
- **Account Management**: Manage multiple accounts with balances

## Tech Stack

- **Frontend**: Quasar Framework, Vue 3, Vue Router
- **Backend**: Hapi.js
- **Database**: SQLite (better-sqlite3)

## Setup Instructions

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for the root, server, and frontend projects.

### 2. Initialize Database

```bash
npm run init:db
```

This creates the SQLite database with initial schema and seed data.

### 3. Start Development Servers

```bash
npm run dev
```

This starts both the backend server (port 3001) and frontend dev server (port 9000 or 8080).

Alternatively, you can run them separately:

```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:frontend
```

## Default Login

- **Username**: mike
- **Password**: password

## Project Structure

```
money-magnet/
├── frontend/          # Quasar app
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── layouts/   # Layout components
│   │   ├── services/  # API service layer
│   │   └── router/    # Vue Router configuration
│   └── package.json
├── server/            # Hapi backend
│   ├── routes/        # API route handlers
│   ├── db/            # Database initialization
│   └── package.json
└── package.json       # Root package.json with scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Transactions
- `GET /api/transactions` - List transactions (query: period, startDate, endDate)
- `GET /api/transactions/summary` - Get summary (query: period)
- `POST /api/transactions` - Create transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Forecast
- `GET /api/forecast` - Get balance forecast (query: targetDate)

### Accounts
- `GET /api/accounts` - List accounts
- `GET /api/accounts/:id` - Get account
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

## Development

The application is set up for local development. The frontend runs on `http://localhost:9000` (or 8080) and the backend on `http://localhost:3001`.

## Future Enhancements

- Mobile app support (Quasar Capacitor)
- JWT-based authentication
- User management
- Recurring transactions
- Budget planning
- Reports and analytics

