import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePuterStore } from '../lib/puter';

// Do not mount private route effects until the authenticated owner is known.
export default function PrivateBoundary({ children }: { children: ReactNode }) {
  const { auth, isLoading } = usePuterStore();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && (!auth.isAuthenticated || !auth.user)) navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
  }, [isLoading, auth.isAuthenticated, auth.user, location.pathname, navigate]);
  if (isLoading) return <main aria-busy="true">Verifying your session…</main>;
  if (!auth.isAuthenticated || !auth.user) return <main>Sign in to access your private resumes.</main>;
  return <div key={auth.user.uuid}>{children}</div>;
}
