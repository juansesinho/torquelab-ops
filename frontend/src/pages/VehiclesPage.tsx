import { Plus } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input, Select } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, EmptyState, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Vehicle } from '../types/domain';

export function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2022');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.vehicles.list();
      setVehicles(res.vehicles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
    if (user?.role === 'admin') {
      api.auth.clients().then((r) => setClients(r.clients)).catch(() => {});
    }
  }, [loadVehicles, user?.role]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.vehicles.create({
        ...(user?.role === 'admin' ? { client_id: Number(clientId) } : {}),
        plate,
        brand,
        model,
        year: Number(year),
      });
      setModalOpen(false);
      setPlate('');
      setBrand('');
      setModel('');
      await loadVehicles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar vehículo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehículos"
        subtitle="Flota registrada y estado de órdenes activas por patente."
        action={
          (user?.role === 'admin' || user?.role === 'client') && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Registrar Vehículo
            </Button>
          )
        }
      />

      {error && <AlertBanner message={error} />}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando vehículos...</p>
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No hay vehículos registrados"
          description="Registrá un vehículo para poder asociarle órdenes de trabajo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-orange-400">
                    {v.plate}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{v.year}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {v.brand} {v.model}
                </h3>
                <p className="text-xs text-slate-400">Titular: {v.client_name}</p>
              </div>

              <div className="border-t border-slate-800 pt-3">
                {v.active_order_id && v.active_order_status ? (
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/orders/${v.active_order_id}`}
                      className="font-mono text-xs font-semibold text-orange-400 hover:underline"
                    >
                      {v.active_order_code}
                    </Link>
                    <StatusBadge status={v.active_order_status} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Sin orden activa en taller</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Registrar Vehículo" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <AlertBanner message={formError} />}

          {user?.role === 'admin' && (
            <FormField label="Cliente propietario">
              <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Patente">
            <Input
              required
              placeholder="Ej. AF492KL"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Marca">
              <Input
                required
                placeholder="Toyota"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </FormField>
            <FormField label="Modelo">
              <Input
                required
                placeholder="Corolla"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Año">
            <Input
              type="number"
              min={1950}
              max={2100}
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar Vehículo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
