class HistoryService {
  async getAllHistory() {
    if (!authService.hasViewDBPermission("history")) {
      return [];
    }

    return await localDbService.getAll("history");
  }

  async getAllHistoryDetails() {
    if (!authService.hasViewDBPermission("history")) {
      return [];
    }

    return await localDbService.getAll("historyDetails");
  }

  async getAllNameHistory() {
    if (!authService.hasViewDBPermission("history")) {
      return [];
    }

    return await localDbService.getAll("nameHistory");
  }

  async getActionName(kodaction) {
    const actions = await this.getAllNameHistory();
    const found = actions.find(a => a.kodaction == kodaction);
    return found ? found.action : "פעולה לא ידועה";
  }

  async getLastActions(num) {
    const history = await this.getAllHistory();
    return history
      .slice()
      .sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate))
      .slice(0, num);
  }

  async logAction(action) {
    if (!authService.hasEditDBPermission("history")) {
      return null;
    }

    const history = await localDbService.getAll("history");
    const historyDetails = await localDbService.getAll("historyDetails");
    const username = authService.getCurrentUsername();

    const newHistory = {
      historyId: localDbService.getNextId(history, "historyId"),
      actionDate: new Date().toISOString(),
      userId: action.userId ?? null,
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

    if (Array.isArray(action.details)) {
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