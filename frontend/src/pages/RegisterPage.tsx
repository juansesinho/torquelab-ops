import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input } from '../components/ui/FormField';
import { AlertBanner } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500/10">
            <BrandLogo size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta de Cliente</h1>
          <p className="mt-1 text-sm text-slate-400">
            Seguí tus vehículos y aprobá presupuestos online.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <AlertBanner message={error} />}

            <FormField label="Nombre y Apellido">
              <Input
                type="text"
                required
                minLength={2}
                placeholder="Ej. Laura Martínez"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>

            <FormField label="Email">
              <Input
                type="email"
                required
                placeholder="laura@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Contraseña (mín. 6 caracteres)">
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <Button type="submit" loading={loading} className="w-full">
              Registrarme
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-400">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-orange-400 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
