class RouteService {
  async getAll() {
    if (!authService.hasViewDBPermission("routes")) {
      return [];
    }

    return await localDbService.getAll("routes");
  }

  async getById(routeId) {
    if (!authService.hasViewDBPermission("routes")) {
      return null;
    }

    return await localDbService.getById("routes", "routeId", routeId);
  }

  async getNameById(routeId) {
    const route = await this.getById(routeId);
    return route ? route.name : "";
  }

  async getActive() {
    const routes = await this.getAll();
    return routes.filter(r => r.isActive);
  }
}

window.routeService = new RouteService();