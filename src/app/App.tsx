import { RouterProvider, createBrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { MarketTracking } from './pages/MarketTracking';
import { Lists } from './pages/Lists';
import { ListDetail } from './pages/ListDetail';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Friends } from './pages/Friends';
import { GameDetail } from './pages/GameDetail';
import { Admin } from './pages/Admin';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';

function NotFound() {
  return <div className="p-4 text-center text-slate-400">404 - Page Not Found</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "market", Component: Market },
      { path: "market/tracking", Component: MarketTracking },
      { path: "game/:id", Component: GameDetail },
      { path: "lists", Component: Lists },
      { path: "lists/:id", Component: ListDetail },
      { path: "friends", Component: Friends },
      { path: "profile", Component: Profile },
      { path: "admin", Component: Admin },
      { path: "login", Component: Login },
      { path: "*", Component: NotFound },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </NotificationsProvider>
    </AuthProvider>
  );
}