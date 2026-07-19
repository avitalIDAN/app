class StatusService {
  constructor() {
    // מזהים קבועים של מצבי מערכת בסיסיים.
    // הם זהים בכל המסלולים בשלב הנוכחי.
    this.systemStatusIds = Object.freeze({
      openCase: 1,
      excluded: 5
    });
  }

  getOpenCaseStatusId() {
    return this.systemStatusIds.openCase;
  }

  getExcludedStatusId() {
    return this.systemStatusIds.excluded;
  }

  async getClosedStatus(routeId) {
    const statuses = await this.getAllByRoute(routeId);

    // סגירה נקבעת לפי הגדרה עסקית, ולא לפי statusId קבוע.
    return statuses.find(status =>
      status.isClosedStatus === true &&
      status.isActive !== false
    ) || null;
  }

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

  
  // async getNextStatus(statusId, routeId) {
  //   if (!permissionService.canViewTable("statuses")) {
  //     return null;
  //   }

  //   const statuses = await this.getAll();

  //   const currentStatus = statuses.find(status =>
  //     status.statusId == statusId &&
  //     status.routeId == routeId
  //   );

  //   if (!currentStatus || currentStatus.nextStatusId == null) {
  //     return null;
  //   }

  //   const nextStatus = statuses.find(status =>
  //     status.statusId == currentStatus.nextStatusId &&
  //     status.routeId == routeId
  //   );

  //   // מצב מושבת אינו יעד תקין לקידום.
  //   return nextStatus?.isActive !== false ? nextStatus : null;
  // }

  async getNextStatus(statusId, routeId) {
    if (!permissionService.canViewTable("statuses")) {
      return null;
    }

    const statuses = await this.getAll();

    const currentStatus = statuses.find(status =>
      status.statusId == statusId &&
      status.routeId == routeId
    );

    if (!currentStatus || currentStatus.nextStatusId == null) {
      return null;
    }

    const nextStatus = statuses.find(status =>
      status.statusId == currentStatus.nextStatusId &&
      status.routeId == routeId
    );

    return nextStatus?.isActive !== false ? nextStatus : null;
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

    try {
      const newStatus = await localDbService.insert("statuses", status, "key");

      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "create",
          entityType: "status",
          entityId: newStatus.key,
          entityLabel: newStatus.statusName || newStatus.name || `מצב ${newStatus.statusId}`,
          description: "יצירת מצב",
          beforeText: "",
          afterText: `נוצר מצב ${newStatus.statusName || newStatus.name || newStatus.statusId}`,
          screenName: "statusesInRoute",
          serviceName: "StatusService",
          actionName: "createStatus",
          details: [
            { fieldName: "statusId", oldValue: "", newValue: newStatus.statusId },
            { fieldName: "routeId", oldValue: "", newValue: newStatus.routeId },
            { fieldName: "name", oldValue: "", newValue: newStatus.statusName || newStatus.name || "" }
          ]
        });
      }

      return newStatus;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "statusesInRoute",
            serviceName: "StatusService",
            actionName: "createStatus",
            entityType: "status",
            entityId: status?.statusId ?? null
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  async updateStatus(key, changes) {
    if (!permissionService.canEditTable("statuses")) {
      return null;
    }

    try {
      const oldStatus = await localDbService.getById("statuses", "key", key);
      if (!oldStatus) {
        throw new Error("Status not found");
      }

      const updatedStatus = await localDbService.update("statuses", "key", key, changes);

      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "update",
          entityType: "status",
          entityId: key,
          entityLabel: updatedStatus.statusName || updatedStatus.name || `מצב ${updatedStatus.statusId}`,
          description: "עדכון מצב",
          beforeText: `שם: ${oldStatus.statusName || oldStatus.name || ""}`,
          afterText: `שם: ${updatedStatus.statusName || updatedStatus.name || ""}`,
          screenName: "statusesInRoute",
          serviceName: "StatusService",
          actionName: "updateStatus",
          details: this.buildChangeDetails(oldStatus, updatedStatus)
        });
      }

      return updatedStatus;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "statusesInRoute",
            serviceName: "StatusService",
            actionName: "updateStatus",
            entityType: "status",
            entityId: key
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  async deleteStatus(key) {
    if (!permissionService.canEditTable("statuses")) {
      return false;
    }

    try {
      const oldStatus = await localDbService.getById("statuses", "key", key);
      if (!oldStatus) {
        throw new Error("Status not found");
      }

      const deleted = await localDbService.delete("statuses", "key", key);

      if (deleted && window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "delete",
          entityType: "status",
          entityId: key,
          entityLabel: oldStatus.statusName || oldStatus.name || `מצב ${oldStatus.statusId}`,
          description: "מחיקת מצב",
          beforeText: `נמחק מצב ${oldStatus.statusName || oldStatus.name || oldStatus.statusId}`,
          afterText: "",
          screenName: "statusesInRoute",
          serviceName: "StatusService",
          actionName: "deleteStatus",
          details: [
            { fieldName: "key", oldValue: oldStatus.key, newValue: "" },
            { fieldName: "statusId", oldValue: oldStatus.statusId, newValue: "" },
            { fieldName: "routeId", oldValue: oldStatus.routeId, newValue: "" }
          ]
        });
      }

      return deleted;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "statusesInRoute",
            serviceName: "StatusService",
            actionName: "deleteStatus",
            entityType: "status",
            entityId: key
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

window.statusService = new StatusService();