# SteaMates Development Guidelines

## Tech Stack

- **Frontend:** React.js + Vite + TailwindCSS
- **Backend:** Express.js + Node.js
- **Database:** MongoDB (Mongoose ODM)
- **AI:** Groq API (LLaMA 3.3 70B)
- **Auth:** Steam OpenID (passport-steam)
- **APIs:** CheapShark, Steam Web API

## General Guidelines

* Use responsive layouts with flexbox and grid
* Keep components small and focused
* Use TypeScript for frontend, JavaScript (ESM) for backend
* All API calls go through the Express.js server at /api/*
* Environment variables go in server/.env (never commit secrets)

## Design System

* Dark theme with slate color palette
* Use TailwindCSS utility classes
* Base font-size: 16px
* Rounded corners: rounded-xl or rounded-2xl
* Accent colors: blue-600, cyan-400, emerald-500
