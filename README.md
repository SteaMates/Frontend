# SteaMates Frontend

React web app for SteaMates — game recommendations, Steam integration, and AI assistant.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 6
- **Styling:** TailwindCSS 4 + shadcn/ui (Radix)
- **Routing:** React Router 7
- **HTTP:** Axios
- **Animations:** Motion (Framer Motion)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Environment Variables (optional)

Create a `.env` file to override defaults:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `""` (uses Vite proxy to localhost:3001) |

In development, the Vite proxy automatically forwards `/api/*` requests to the backend on port 3001. No `.env` file is needed if the backend is running locally.

For production builds, set `VITE_API_URL` to the deployed backend URL:

```bash
VITE_API_URL=https://your-backend.onrender.com
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── main.tsx                    # App entry point
├── lib/
│   └── api.ts                  # Axios config (API base URL)
├── app/
│   ├── App.tsx                 # Router + routes
│   ├── components/
│   │   ├── ai/
│   │   │   └── AssistantModal.tsx   # AI chatbot (Groq)
│   │   ├── layout/
│   │   │   └── Layout.tsx           # Main layout + sidebar
│   │   ├── market/
│   │   │   └── DealCard.tsx         # Game deal card
│   │   └── ui/                      # shadcn/ui components
│   └── pages/
│       ├── Home.tsx            # Dashboard
│       ├── Market.tsx          # Game deals (CheapShark)
│       ├── Friends.tsx         # Steam friends list
│       ├── Profile.tsx         # Steam profile + games
│       ├── Login.tsx           # Steam OpenID login
│       ├── Lists.tsx           # Game lists
│       └── ListDetail.tsx      # List detail view
└── styles/
    ├── index.css
    ├── tailwind.css
    ├── theme.css
    └── fonts.css
```

## Connecting to Backend

**Local development:** Run the [SteaMates Backend](https://github.com/SteaMates/Backend) on port 3001. The Vite proxy handles the rest automatically.

**Production:** Set `VITE_API_URL` to the deployed backend URL before building.
