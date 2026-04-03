import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHub } from '../contexts/HubContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const { user, signIn } = useAuth();
  const { settings } = useHub();
  const { error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[var(--accent-gold)] mb-2">
            {settings?.hub_name || 'Family Hub'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {settings?.tagline || 'Where family comes together'}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/forgot-password" className="text-[var(--accent-gold)] hover:underline">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            Have an invite code?{' '}
            <Link to="/register" className="text-[var(--accent-gold)] hover:underline">
              Register
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
