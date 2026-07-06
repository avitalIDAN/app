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
      actionName: action.actionName || ""
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
}

window.historyService = new HistoryService();