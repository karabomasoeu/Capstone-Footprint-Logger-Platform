# Footprint Logger

A web platform that lets users track daily activities contributing to carbon emissions, view summaries, and get personalised tips to reduce their footprint.

---

## Features

- **Activity Logging** - Log transport, food, energy, and other activities with real CO₂ emission factors
- **User Accounts** - Register and log in with JWT-based authentication
- **Dashboard** - Visual charts, daily bar graphs, running totals, and a 7-day streak tracker
- **Insight Engine** - Personalised tips, weekly reduction goals, and community average comparison
- **Category Filtering** - Filter logs by transport, food, energy, or other
- **Responsive Design** - Works on desktop and mobile

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript   |
| Backend   | Node.js, Express 4                |
| Database  | MongoDB with Mongoose             |
| Auth      | JWT (JSON Web Tokens) + bcrypt    |
| Charts    | Chart.js                          |

---

## Project Structure

```
footprint-logger/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── ActivityLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── logs.js
│   │   ├── dashboard.js
│   │   └── insights.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── logger.js
│       ├── dashboard.js
│       └── insights.js
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/karabomasoeu/capstone-footprint-logger-platform.git
   cd footprint-logger
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp ../.env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

5. Open the frontend:
   - Open `frontend/index.html` in your browser, or
   - Serve it with any static file server

---

## Environment Variables

| Variable       | Description                        | Example                          |
|----------------|------------------------------------|----------------------------------|
| `PORT`         | Port the server runs on            | `5000`                           |
| `MONGO_URI`    | MongoDB connection string          | `mongodb://localhost:27017/fp`   |
| `JWT_SECRET`   | Secret key for signing JWTs        | `your-secret-key`           |
| `NODE_ENV`     | Environment mode                   | `development`                    |

---

## API Endpoints

| Method | Route                    | Auth   | Description                        |
|--------|--------------------------|--------|------------------------------------|
| POST   | /api/auth/register       | Public | Register a new user                |
| POST   | /api/auth/login          | Public | Login and receive a JWT            |
| GET    | /api/logs                | JWT    | Get all logs for the current user  |
| POST   | /api/logs                | JWT    | Create a new activity log entry    |
| DELETE | /api/logs/:id            | JWT    | Delete a specific log entry        |
| GET    | /api/dashboard           | JWT    | Get dashboard summary and charts   |
| GET    | /api/insights            | JWT    | Get personalised tips and goals    |
| GET    | /api/insights/community  | JWT    | Get community average comparison   |

---

## Emission Factors

Emission factors are sourced from:

- **Food**: Our World in Data (Poore & Nemecek, 2018)
- **Transport**: IPCC AR6 (2021)
- **Energy**: Eskom CDP Report (2023) - SA grid at 0.82 kg CO₂/kWh
- **Other**: US EPA WARM Model (2023)


