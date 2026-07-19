class HistoryService {
  async getAllHistory() {
    if (!permissionService.canViewTable("history")) {
      return [];
    }

    return await localDbService.getAll("history");
  }

  async getAllHistoryDetails() {
    if (!permissionService.canViewTable("historyDetails")) {
      return [];
    }

    return await localDbService.getAll("historyDetails");
  }

  async getLastActions(num) {
    const history = await this.getAllHistory();

    return history
      .slice()
      .sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate))
      .slice(0, num);
  }

  async getLastPrimaryActions(num) {
  const history = await this.getAllHistory();

  return history
    .filter(item => item.isPrimaryAction !== false)
    .slice()
    .sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate))
    .slice(0, num);
  }

  async logAction(action) {
    // כתיבת היסטוריה דורשת הרשאת עריכה לטבלת הכותרת.
    if (!permissionService.canEditTable("history")) {
      return null;
    }

    const hasDetails = Array.isArray(action.details) && action.details.length > 0;

    // אם יש פירוט שדות, נדרשת גם הרשאת עריכה לטבלת הפירוט.
    if (hasDetails && !permissionService.canEditTable("historyDetails")) {
      return null;
    }

    const history = await localDbService.getAll("history");
    const historyDetails = await localDbService.getAll("historyDetails");
    const username = authService.getCurrentUsername();
    const user = authService.getCurrentUser();

    const newHistory = {
      historyId: localDbService.getNextId(history, "historyId"),
      actionDate: new Date().toISOString(),
      userId: user ? user.userId : null,
      username,
      actionType: action.actionType,
      entityType: action.entityType,
      entityId: action.entityId,
      entityLabel: action.entityLabel || "",
      description: action.description || "",
      beforeText: action.beforeText || "",
      afterText: action.afterText || "",
      screenName: action.screenName || "",
      serviceName: action.serviceName || "",
      actionName: action.actionName || "",
      bulkOperationId: action.bulkOperationId || null,
      isPrimaryAction: action.isPrimaryAction !== false
    };

    history.push(newHistory);

    if (hasDetails) {
      action.details.forEach(detail => {
        historyDetails.push({
          detailId: localDbService.getNextId(historyDetails, "detailId"),
          historyId: newHistory.historyId,
          fieldName: detail.fieldName,
          oldValue: String(detail.oldValue ?? ""),
          newValue: String(detail.newValue ?? "")
        });
      });
    }

    localDbService.warnMemoryOnly("history", "insert");
    return newHistory;
  }


  createBulkOperationId(actionCode) {
    const now = new Date();

    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("");

    const time = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");

    // מקטין מאוד אפשרות להתנגשות בין שתי פעולות באותה שנייה.
    const uniquePart = String(Date.now()).slice(-6);

    return `BULK-${actionCode.toUpperCase()}-${date}-${time}-${uniquePart}`;
  }
}

window.historyService = new HistoryService();