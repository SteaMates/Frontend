import { RouterProvider } from 'react-router';
import { createBrowserRouter, Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { Lists } from './pages/Lists';
import { ListDetail } from './pages/ListDetail';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Friends } from './pages/Friends';

// Placeholder components until we implement them
function NotFound() {
  return <div className="p-4 text-center">404 - Page Not Found</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "market", Component: Market },
      { path: "lists", Component: Lists },
      { path: "lists/:id", Component: ListDetail },
      { path: "friends", Component: Friends },
      { path: "profile", Component: Profile },
      { path: "login", Component: Login },
      { path: "*", Component: NotFound },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </>
  );
}
