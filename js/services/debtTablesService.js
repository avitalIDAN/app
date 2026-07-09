class DebtTablesService {
  async getGroups() {
    if (!permissionService.canViewTable("groups")) return [];
    return await localDbService.getAll("groups");
  }

  async createGroup(group) {
    if (!permissionService.canEditTable("groups")) return null;

    try {
      const newGroup = await localDbService.insert("groups", {
        name: group.name
      }, "groupId");

      await this.logHistory({
        actionType: "create",
        entityType: "group",
        entityId: newGroup.groupId,
        entityLabel: newGroup.name,
        description: "יצירת קבוצה",
        beforeText: "",
        afterText: `נוצרה קבוצה ${newGroup.name}`,
        screenName: "groups",
        actionName: "createGroup",
        details: [
          { fieldName: "groupId", oldValue: "", newValue: newGroup.groupId },
          { fieldName: "name", oldValue: "", newValue: newGroup.name }
        ]
      });

      return newGroup;
    } catch (error) {
      await this.logError(error, "groups", "createGroup", "group", null);
      throw error;
    }
  }

  async updateGroup(groupId, changes) {
    if (!permissionService.canEditTable("groups")) return null;

    try {
      const oldGroup = await localDbService.getById("groups", "groupId", groupId);
      if (!oldGroup) throw new Error("Group not found");

      const updatedGroup = await localDbService.update("groups", "groupId", groupId, {
        name: changes.name
      });

      await this.logHistory({
        actionType: "update",
        entityType: "group",
        entityId: groupId,
        entityLabel: updatedGroup.name,
        description: "עדכון קבוצה",
        beforeText: `שם: ${oldGroup.name || ""}`,
        afterText: `שם: ${updatedGroup.name || ""}`,
        screenName: "groups",
        actionName: "updateGroup",
        details: this.buildChangeDetails(oldGroup, updatedGroup)
      });

      return updatedGroup;
    } catch (error) {
      await this.logError(error, "groups", "updateGroup", "group", groupId);
      throw error;
    }
  }

  async getDebtTypes() {
    if (!permissionService.canViewTable("debtTypes")) return [];
    return await localDbService.getAll("debtTypes");
  }

  async getDebtTypeGroups() {
    if (!permissionService.canViewTable("debtTypeGroups")) return [];
    return await localDbService.getAll("debtTypeGroups");
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

  async logHistory(data) {
    if (!window.historyService?.logAction) return;

    await historyService.logAction({
      ...data,
      serviceName: "DebtTablesService"
    });
  }

  async logError(error, screenName, actionName, entityType, entityId) {
    if (!window.errorLogService?.logException) return;

    try {
      await errorLogService.logException({
        error,
        screenName,
        serviceName: "DebtTablesService",
        actionName,
        entityType,
        entityId
      });
    } catch (logError) {
      console.error("Failed to write error log", logError);
    }
  }
}

window.debtTablesService = new DebtTablesService();