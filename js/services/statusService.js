class StatusService {
  async getAll() {
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
    }

    return await localDbService.getAll("statuses");
  }

  async getAllByRoute(routeId) {
    const statuses = await this.getAll();
    return statuses.filter(s => s.routeId == routeId);
  }

  async getById(statusId, routeId) {
    const statuses = await this.getAll();
    return statuses.find(s => s.statusId == statusId && s.routeId == routeId) || null;
  }

  async getNameById(statusId, routeId) {
    const status = await this.getById(statusId, routeId);
    return status ? (status.statusName || status.name) : "";
  }

  async getActive(routeId) {
    const statuses = await this.getAll();
    return statuses.filter(s => s.isActive && s.routeId == routeId);
  }

  async getNextStatus(statusId, routeId) {
    const statuses = await this.getAll();
    const current = statuses.find(s => s.statusId == statusId && s.routeId == routeId);
    if (!current) return null;

    if (current.nextStatusId !== null && current.nextStatusId !== undefined) {
      return statuses.find(s => s.statusId == current.nextStatusId && s.routeId == routeId) || null;
    }

    return statuses.find(s =>
      s.isActive &&
      s.routeId == routeId &&
      s.orderIndex == current.orderIndex + 1
    ) || null;
  }

  async getByCode(code, routeId) {
    const statuses = await this.getAll();
    return statuses.find(s =>
      (s.statusCode === code || s.code === code) &&
      s.routeId == routeId
    ) || null;
  }
}

window.statusService = new StatusService();