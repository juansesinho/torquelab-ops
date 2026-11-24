import { NotFoundError } from '../../errors/AppError';
import { notificationsRepository } from './notifications.repository';

export const notificationsService = {
  async listForUser(userId: number) {
    const notifications = await notificationsRepository.findByUser(userId);
    const unread_count = notifications.filter((n) => !n.is_read).length;
    return { notifications, unread_count };
  },

  async markAsRead(id: number, userId: number) {
    const ok = await notificationsRepository.markRead(id, userId);
    if (!ok) {
      throw new NotFoundError('Notificación no encontrada');
    }
    return { ok: true };
  },

  async markAllAsRead(userId: number) {
    await notificationsRepository.markAllRead(userId);
    return { ok: true };
  },
};
