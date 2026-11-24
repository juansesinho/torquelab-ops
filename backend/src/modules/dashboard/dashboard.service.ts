import { dashboardRepository } from './dashboard.repository';

export const dashboardService = {
  async getSummary() {
    return dashboardRepository.getSummary();
  },
};
