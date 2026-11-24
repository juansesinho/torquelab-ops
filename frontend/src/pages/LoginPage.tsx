import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input } from '../components/ui/FormField';
import { AlertBanner } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Jefe de Taller', email: 'admin@torquelab.com' },
  { label: 'Mecánico', email: 'mecanico@torquelab.com' },
  { label: 'Cliente', email: 'cliente@torquelab.com' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Demo1234!');
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500/10">
            <BrandLogo size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            TorqueLab <span className="text-orange-500">Ops</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Ingresá a la plataforma de TorqueLab Garage S.R.L.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <AlertBanner message={error} />}

            <FormField label="Email">
              <Input
                type="email"
                required
                placeholder="nombre@torquelab.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Contraseña">
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <Button type="submit" loading={loading} className="w-full">
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-2.5 text-xs font-medium text-slate-400">
              Acceso rápido Demo (clave: Demo1234!):
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.email}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fillDemo(acc.email)}
                >
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <p className="text-center text-sm text-slate-400">
          ¿Sos cliente nuevo?{' '}
          <Link to="/register" className="font-medium text-orange-400 hover:underline">
            Registrate acá
          </Link>
        </p>
      </div>
    </div>
  );
}
