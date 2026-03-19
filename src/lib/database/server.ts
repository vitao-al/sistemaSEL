import { createDatabaseAdapter } from './adapter';
import { AuthService, DashboardService, EleitorService, UserService } from './services';

export function createServerServices() {
  const adapter = createDatabaseAdapter({ runtime: 'server' });
  const authService = new AuthService(adapter);
  const eleitorService = new EleitorService(adapter);
  const dashboardService = new DashboardService(eleitorService);
  const userService = new UserService(adapter);

  return {
    authService,
    eleitorService,
    dashboardService,
    userService,
  };
}
