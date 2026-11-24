import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { NotificationItem } from '../types/domain';
import { formatDate } from '../utils/format';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    api.notifications
      .list()
      .then((res) => {
        setItems(res.notifications);
        setUnread(res.unread_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleClickItem(item: NotificationItem) {
    if (!item.is_read) {
      await api.notifications.markRead(item.id).catch(() => {});
      load();
    }
    setOpen(false);
    if (item.work_order_id) {
      navigate(`/orders/${item.work_order_id}`);
    }
  }

  async function handleMarkAll() {
    await api.notifications.markAllRead().catch(() => {});
    load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        className="relative rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:border-orange-500/50 hover:text-white transition cursor-pointer"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-slate-950">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Notificaciones ({unread})
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-orange-400 hover:underline cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {items.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">
                No tenés notificaciones por ahora.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClickItem(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition cursor-pointer ${
                    item.is_read ? 'opacity-65' : 'bg-orange-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{item.title}</span>
                    {!item.is_read && (
                      <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.message}</p>
                  <span className="mt-1 block font-mono text-[10px] text-slate-500">
                    {formatDate(item.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
