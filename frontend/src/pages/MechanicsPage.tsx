import { Mail, Plus, Wrench } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, EmptyState, PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';
import { User } from '../types/domain';

export function MechanicsPage() {
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.mechanics();
      setMechanics(res.mechanics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar mecánicos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.auth.createMechanic({ name, email, password });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo dar de alta al mecánico');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo de Mecánicos"
        subtitle="Alta y listado del personal técnico habilitado para tomar órdenes y presupuestar."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Alta de Mecánico
          </Button>
        }
      />

      {error && <AlertBanner message={error} />}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando equipo...</p>
      ) : mechanics.length === 0 ? (
        <EmptyState
          title="No hay mecánicos registrados"
          description="Dá de alta al primer mecánico para asignarle órdenes de trabajo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mechanics.map((m) => (
            <Card key={m.id} className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shrink-0">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{m.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {m.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                    Mecánico
                  </span>
                  {(m.active_orders_count ?? 0) === 0 ? (
                    <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      Disponible
                    </span>
                  ) : (
                    <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                      {m.active_orders_count} activa{(m.active_orders_count ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Alta de Nuevo Mecánico" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <AlertBanner message={formError} />}
          <FormField label="Nombre y Apellido">
            <Input
              required
              minLength={2}
              placeholder="Ej. Franco Álvarez"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label="Email corporativo">
            <Input
              type="email"
              required
              placeholder="franco.mec@torquelab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Contraseña inicial (mín. 6 caracteres)">
            <Input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Crear Mecánico
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
