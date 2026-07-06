class RouteService {
  async getAll() {
    if (!permissionService.canViewTable("routes")) {
      return [];
    }

    return await localDbService.getAll("routes");
  }

  async getById(routeId) {
    if (!permissionService.canViewTable("routes")) {
      return null;
    }

    return await localDbService.getById("routes", "routeId", routeId);
  }

  async getNameById(routeId) {
    if (!permissionService.canViewTable("routes")) {
      return "";
    }

    const route = await this.getById(routeId);
    return route ? route.name : "";
  }

  async getActive() {
    if (!permissionService.canViewTable("routes")) {
      return [];
    }

    const routes = await this.getAll();
    return routes.filter(route => route.isActive);
  }

  async createRoute(route) {
    if (!permissionService.canEditTable("routes")) {
      return null;
    }

    return await localDbService.insert("routes", route, "routeId");
  }

  async updateRoute(routeId, changes) {
    if (!permissionService.canEditTable("routes")) {
      return null;
    }

    return await localDbService.update("routes", "routeId", routeId, changes);
  }

  async deleteRoute(routeId) {
    if (!permissionService.canEditTable("routes")) {
      return false;
    }

    return await localDbService.delete("routes", "routeId", routeId);
  }
}

window.routeService = new RouteService();