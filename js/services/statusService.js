class StatusService {
  async getAll() {
    if (!permissionService.canViewTable("statuses")) {
      return [];
    }

    return await localDbService.getAll("statuses");
  }

  async getAllByRoute(routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return [];
    }

    const statuses = await this.getAll();
    return statuses.filter(status => status.routeId == routeId);
  }

  async getById(statusId, routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return null;
    }

    const statuses = await this.getAll();

    return statuses.find(status =>
      status.statusId == statusId &&
      status.routeId == routeId
    ) || null;
  }

  async getNameById(statusId, routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return "";
    }

    const status = await this.getById(statusId, routeId);
    return status ? (status.statusName || status.name) : "";
  }

  async getActive(routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return [];
    }

    const statuses = await this.getAll();

    return statuses.filter(status =>
      status.isActive &&
      status.routeId == routeId
    );
  }

  async getNextStatus(statusId, routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return null;
    }

    const statuses = await this.getAll();

    const current = statuses.find(status =>
      status.statusId == statusId &&
      status.routeId == routeId
    );

    if (!current) return null;

    if (current.nextStatusId !== null && current.nextStatusId !== undefined) {
      return statuses.find(status =>
        status.statusId == current.nextStatusId &&
        status.routeId == routeId
      ) || null;
    }

    return statuses.find(status =>
      status.isActive &&
      status.routeId == routeId &&
      status.orderIndex == current.orderIndex + 1
    ) || null;
  }

  async getByCode(code, routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return null;
    }

    const statuses = await this.getAll();

    return statuses.find(status =>
      (status.statusCode === code || status.code === code) &&
      status.routeId == routeId
    ) || null;
  }

  async createStatus(status) {
    if (!permissionService.canEditTable("statuses")) {
      return null;
    }

    return await localDbService.insert("statuses", status, "key");
  }

  async updateStatus(key, changes) {
    if (!permissionService.canEditTable("statuses")) {
      return null;
    }

    return await localDbService.update("statuses", "key", key, changes);
  }

  async deleteStatus(key) {
    if (!permissionService.canEditTable("statuses")) {
      return false;
    }

    return await localDbService.delete("statuses", "key", key);
  }
}

window.statusService = new StatusService();