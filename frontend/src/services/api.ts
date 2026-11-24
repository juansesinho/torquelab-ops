import { DashboardSummary, OrderStatus, Part, User, Vehicle, WorkOrder } from '../types/domain';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'torquelab_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { message?: string }).message ?? `Error HTTP ${res.status}`;
    throw new ApiError(message, res.status, (data as { error?: string }).error);
  }

  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    me: () => request<{ user: User }>('/auth/me'),
    mechanics: () => request<{ mechanics: User[] }>('/auth/mechanics'),
    clients: () => request<{ clients: User[] }>('/auth/clients'),
  },
  vehicles: {
    list: () => request<{ vehicles: Vehicle[] }>('/vehicles'),
    create: (payload: {
      client_id?: number;
      plate: string;
      brand: string;
      model: string;
      year: number;
    }) =>
      request<{ vehicle: Vehicle }>('/vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  parts: {
    list: () => request<{ parts: Part[] }>('/parts'),
    create: (payload: {
      sku: string;
      name: string;
      stock: number;
      min_stock: number;
      unit_price: number;
    }) =>
      request<{ part: Part }>('/parts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: number,
      payload: { name?: string; min_stock?: number; unit_price?: number }
    ) =>
      request<{ part: Part }>(`/parts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    restock: (id: number, quantity: number) =>
      request<{ part: Part }>(`/parts/${id}/restock`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
  },
  orders: {
    list: (filters?: { status?: string; plate?: string; scope?: 'mine' | 'unassigned' | 'all' }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.plate) params.set('plate', filters.plate);
      if (filters?.scope) params.set('scope', filters.scope);
      const qs = params.toString();
      return request<{ orders: WorkOrder[] }>(`/orders${qs ? `?${qs}` : ''}`);
    },
    getById: (id: number) => request<{ order: WorkOrder }>(`/orders/${id}`),
    claim: (id: number) =>
      request<{ order: WorkOrder }>(`/orders/${id}/claim`, {
        method: 'POST',
      }),
    create: (payload: {
      vehicle_id: number;
      mechanic_id?: number | null;
      problem_description: string;
    }) =>
      request<{ order: WorkOrder }>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: number,
      payload: {
        mechanic_id?: number | null;
        diagnosis?: string | null;
        labor_cost?: number;
      }
    ) =>
      request<{ order: WorkOrder }>(`/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: number, status: OrderStatus) =>
      request<{ order: WorkOrder }>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    addItem: (id: number, part_id: number, quantity: number) =>
      request<{ order: WorkOrder }>(`/orders/${id}/items`, {
        method: 'POST',
        body: JSON.stringify({ part_id, quantity }),
      }),
    removeItem: (id: number, itemId: number) =>
      request<{ order: WorkOrder }>(`/orders/${id}/items/${itemId}`, {
        method: 'DELETE',
      }),
  },
  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
  },
};
