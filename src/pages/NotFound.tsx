import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <h1 className="font-serif text-6xl text-[var(--accent-gold)] mb-4">404</h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8">Page not found</p>
        <Link to="/">
          <Button>
            <Home size={18} className="mr-2" /> Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
