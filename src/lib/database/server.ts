// Fábrica de serviços do backend para handlers da API.
// Constrói adapter e serviços de domínio por requisição.

import { createDatabaseAdapter } from './adapter';
import { AuthService, CaboService, DashboardService, EleitorService, UserService } from './services';

export function createServerServices() {
  const adapter = createDatabaseAdapter({ runtime: 'server' });
  const authService = new AuthService(adapter);
  const caboService = new CaboService(adapter);
  const eleitorService = new EleitorService(adapter);
  const dashboardService = new DashboardService(eleitorService);
  const userService = new UserService(adapter);

  return {
    authService,
    caboService,
    eleitorService,
    dashboardService,
    userService,
  };
}
