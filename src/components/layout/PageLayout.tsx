import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function PageLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header />
      <main className="pb-20 lg:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
