import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import About from '@/pages/About';
import CreateLink from '@/pages/CreateLink';
import LinksDashboard from '@/pages/LinksDashboard';
import LinkDetails from '@/pages/LinkDetails';
import EditLink from '@/pages/EditLink';
import PagesList from '@/pages/PagesList';
import NewPage from '@/pages/NewPage';
import EditPage from '@/pages/EditPage';
import SlugResolver from '@/pages/SlugResolver';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl font-bold text-white mb-2">404</p>
      <p className="text-sm text-slate-400">Página não encontrada.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public routes with layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<About />} />
          </Route>

          {/* Login — standalone, no layout */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes with layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/links" element={<LinksDashboard />} />
            <Route path="/links/new" element={<CreateLink />} />
            <Route path="/links/:id" element={<LinkDetails />} />
            <Route path="/links/:id/edit" element={<EditLink />} />
            <Route path="/pages" element={<PagesList />} />
            <Route path="/pages/new" element={<NewPage />} />
            <Route path="/pages/:id/edit" element={<EditPage />} />
          </Route>

          {/* Dynamic slug resolver — standalone, no layout.
              Must be LAST so it doesn't intercept static routes. */}
          <Route path="/:slug" element={<SlugResolver />} />

          {/* 404 fallback */}
          <Route path="*" element={<Layout />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
