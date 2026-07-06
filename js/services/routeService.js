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

    try {
      const newRoute = await localDbService.insert("routes", route, "routeId");

      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "create",
          entityType: "route",
          entityId: newRoute.routeId,
          entityLabel: newRoute.name || `מסלול ${newRoute.routeId}`,
          description: "יצירת מסלול",
          beforeText: "",
          afterText: `נוצר מסלול ${newRoute.name || newRoute.routeId}`,
          screenName: "routes",
          serviceName: "RouteService",
          actionName: "createRoute",
          details: [
            { fieldName: "routeId", oldValue: "", newValue: newRoute.routeId },
            { fieldName: "name", oldValue: "", newValue: newRoute.name || "" }
          ]
        });
      }

      return newRoute;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "routes",
            serviceName: "RouteService",
            actionName: "createRoute",
            entityType: "route",
            entityId: route?.routeId ?? null
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  async updateRoute(routeId, changes) {
    if (!permissionService.canEditTable("routes")) {
      return null;
    }

    try {
      const oldRoute = await localDbService.getById("routes", "routeId", routeId);
      if (!oldRoute) {
        throw new Error("Route not found");
      }

      const updatedRoute = await localDbService.update("routes", "routeId", routeId, changes);

      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "update",
          entityType: "route",
          entityId: routeId,
          entityLabel: updatedRoute.name || `מסלול ${routeId}`,
          description: "עדכון מסלול",
          beforeText: `שם: ${oldRoute.name || ""}`,
          afterText: `שם: ${updatedRoute.name || ""}`,
          screenName: "routes",
          serviceName: "RouteService",
          actionName: "updateRoute",
          details: this.buildChangeDetails(oldRoute, updatedRoute)
        });
      }

      return updatedRoute;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "routes",
            serviceName: "RouteService",
            actionName: "updateRoute",
            entityType: "route",
            entityId: routeId
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  async deleteRoute(routeId) {
    if (!permissionService.canEditTable("routes")) {
      return false;
    }

    try {
      const oldRoute = await localDbService.getById("routes", "routeId", routeId);
      if (!oldRoute) {
        throw new Error("Route not found");
      }

      const deleted = await localDbService.delete("routes", "routeId", routeId);

      if (deleted && window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "delete",
          entityType: "route",
          entityId: routeId,
          entityLabel: oldRoute.name || `מסלול ${routeId}`,
          description: "מחיקת מסלול",
          beforeText: `נמחק מסלול ${oldRoute.name || routeId}`,
          afterText: "",
          screenName: "routes",
          serviceName: "RouteService",
          actionName: "deleteRoute",
          details: [
            { fieldName: "routeId", oldValue: oldRoute.routeId, newValue: "" },
            { fieldName: "name", oldValue: oldRoute.name || "", newValue: "" }
          ]
        });
      }

      return deleted;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "routes",
            serviceName: "RouteService",
            actionName: "deleteRoute",
            entityType: "route",
            entityId: routeId
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  buildChangeDetails(oldRecord, newRecord) {
    return Object.keys(newRecord)
      .filter(key => oldRecord[key] !== newRecord[key])
      .map(key => ({
        fieldName: key,
        oldValue: oldRecord[key] ?? "",
        newValue: newRecord[key] ?? ""
      }));
  }
}

window.routeService = new RouteService();