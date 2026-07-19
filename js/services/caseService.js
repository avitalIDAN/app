class CaseService {
  async getAllCasesHis() {
    if (!permissionService.canViewTable("caseStatusHistory")) {
      return [];
    }

    return await localDbService.getAll("caseStatusHistory");
  }

  async getHisByCaseId(caseId) {
    const history = await this.getAllCasesHis();

    return history
      .filter(h => h.caseId == caseId)
      .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
  }

  async getLastStatusHis(caseId) {
    const history = await this.getHisByCaseId(caseId);
    return history.at(-1) || null;
  }

  async addToStatusHis(statusHistoryRecord) {
    if (!permissionService.canEditTable("caseStatusHistory")) {
      return null;
    }

    const history = await localDbService.getAll("caseStatusHistory");

    const newRecord = {
      key: localDbService.getNextId(history, "key"),
      historyId: localDbService.getNextId(history, "historyId"),
      ...statusHistoryRecord
    };

    history.push(newRecord);
    localDbService.warnMemoryOnly("caseStatusHistory", "insert");

    return newRecord;
  }

  async getAllCases() {
    if (!permissionService.canViewTable("cases")) {
      return [];
    }

    const [cases, routes, statuses, groups] = await Promise.all([
      localDbService.getAll("cases"),
      routeService.getAll(),
      statusService.getAll(),
      debtService.getGroups()
    ]);

    return cases.map(c => {
      const route = routes.find(r => r.routeId == c.routeId);
      const status = statuses.find(s =>
        s.statusId == c.currentStatusId &&
        s.routeId == c.routeId
      );
      const group = groups.find(g => g.groupId == c.groupId);

      return {
        ...c,
        routeName: route ? route.name : "",
        statusName: status ? (status.statusName || status.name) : "",
        groupName: group ? group.name : ""
      };
    });
  }

  async getNumCases() {
    const cases = await this.getAllCases();
    return cases.length;
  }

  async getNumActiveCases() {
    const cases = await this.getAllCases();
    return cases.filter(c => !c.isClosed && c.currentStatusId != 0).length;
  }

  async getNumClosedCases() {
    const cases = await this.getAllCases();
    return cases.filter(c => c.isClosed || c.currentStatusId == 0).length;
  }

  async getCaseById(caseId) {
    const cases = await this.getAllCases();
    return cases.find(c => c.caseId == caseId) || null;
  }

  async createCase({
    routeId,
    groupId,
    idPayer,
    idAsset,
    statusId = 1,
    delta = 0,
    parentCaseId = null,
    historyOptions = {}
  }) {
    const {
      isPrimaryAction = true,
      bulkOperationId = null
    } = historyOptions;
    // יצירת תיק היא פעולה כפולה:
    // 1. כתיבה ל-cases
    // 2. כתיבה ל-caseStatusHistory עבור מצב פתיחה
    if (
      !permissionService.canEditTable("cases") ||
      !permissionService.canEditTable("caseStatusHistory")
    ) {
      return null;
    }

    try {
      const cases = await localDbService.getAll("cases");
      const now = new Date().toISOString();
      const nextKey = localDbService.getNextId(cases, "key");
      const nextCaseId = localDbService.getNextId(cases, "caseId");
      const username = authService.getCurrentUsername();
      const status = await statusService.getById(statusId, routeId);

      const caseItem = {
        key: nextKey,
        caseId: nextCaseId,
        externalCaseNumber: `C-${nextCaseId}`,
        idPayer: Number(idPayer),
        idAsset: Number(idAsset),
        routeId: Number(routeId),
        groupId: Number(groupId),
        currentStatusId: Number(statusId),
        freezeMode: "NONE",
        createdBy: username,
        createdAt: now,
        updatedAt: now,
        isClosed: Number(statusId) === 0,
        closedAt: Number(statusId) === 0 ? now : null,
        delta,
        parentCaseId
      };

      cases.push(caseItem);
      localDbService.warnMemoryOnly("cases", "insert");

      await this.addToStatusHis({
        caseId: caseItem.caseId,
        routeId: caseItem.routeId,
        statusId: caseItem.currentStatusId,
        statusName: status ? (status.statusName || status.name) : "",
        changedAt: now,
        changedBy: username,
        note: "פתיחת תיק"
      });

      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "create",
          entityType: "case",
          entityId: caseItem.caseId,
          entityLabel: `תיק ${caseItem.caseId}`,
          description: "יצירת תיק",
          beforeText: "",
          afterText: `נוצר תיק ${caseItem.caseId}`,
          screenName: "cases",
          serviceName: "CaseService",
          actionName: "createCase",
          isPrimaryAction,
          bulkOperationId,
          // isPrimaryAction: historyOptions.isPrimaryAction !== false,
          details: [
            { fieldName: "caseId", oldValue: "", newValue: caseItem.caseId },
            { fieldName: "currentStatusId", oldValue: "", newValue: caseItem.currentStatusId }
          ]
        });
      }

      return caseItem;
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "cases",
            serviceName: "CaseService",
            actionName: "createCase",
            entityType: "case",
            entityId: null
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

  async _getOrderedCases() {
    const cases = await this.getAllCases();

    return cases
      .filter(c => c && c.caseId !== undefined)
      .sort((a, b) => a.caseId - b.caseId);
  }

  async getFirstCase() {
    const cases = await this._getOrderedCases();
    return cases[0] || null;
  }

  async getNextCase(caseId) {
    const cases = await this._getOrderedCases();
    if (!cases.length) return null;

    const index = cases.findIndex(c => c.caseId == caseId);

    if (index === -1) {
      return cases[0];
    }

    return cases[(index + 1) % cases.length];
  }

  async getPreCase(caseId) {
    const cases = await this._getOrderedCases();
    if (!cases.length) return null;

    const index = cases.findIndex(c => c.caseId == caseId);

    if (index === -1) {
      return cases[cases.length - 1];
    }

    return cases[(index - 1 + cases.length) % cases.length];
  }

  async getCasesByRoute(routeId) {
    const cases = await this.getAllCases();
    return cases.filter(c => c.routeId == routeId);
  }

  async getCasesByStatus(statusId, routeId = null) {
    const cases = await this.getAllCases();

    return cases.filter(c => {
      if (routeId && c.routeId != routeId) return false;
      return c.currentStatusId == statusId;
    });
  }

  async getCasesFiltered({ routeId = null, statusId = null, groupId = null } = {}) {
    const cases = await this.getAllCases();

    return cases.filter(c => {
      if (routeId && c.routeId != routeId) return false;
      if (statusId && c.currentStatusId != statusId) return false;
      if (groupId && c.groupId != groupId) return false;
      return true;
    });
  }

  async getCaseWithHistory(caseId) {
    const caseData = await this.getCaseById(caseId);
    if (!caseData) return null;

    return await this.getHisByCaseId(caseId);
  }

  async changeCaseStatus(
    caseId,
    newStatusId,
    changedBy = authService.getCurrentUsername(),
    note = "",
    historyOptions = {}
  ) {
    // שינוי מצב הוא פעולה כפולה:
    // 1. עדכון התיק
    // 2. הוספת רשומה להיסטוריית מצבים
    if (
      !permissionService.canEditTable("cases") ||
      !permissionService.canEditTable("caseStatusHistory")
    ) {
      return null;
    }

    try {
      const cases = await localDbService.getAll("cases");
      const index = cases.findIndex(c => c.caseId == caseId);

      if (index === -1) {
        throw new Error("Case not found");
      }

      const oldCase = { ...cases[index] };
      const routeId = oldCase.routeId;
      const newStatus = await statusService.getById(newStatusId, routeId);

      if (!newStatus) {
        throw new Error(`Status not found: ${newStatusId}`);
      }

      const now = new Date().toISOString();
      const isClosed = Number(newStatusId) === 0;

      cases[index] = {
        ...cases[index],
        currentStatusId: Number(newStatusId),
        updatedAt: now,
        isClosed,
        closedAt: isClosed ? now : cases[index].closedAt
      };

      localDbService.warnMemoryOnly("cases", "update");

      await this.addToStatusHis({
        caseId: cases[index].caseId,
        routeId,
        statusId: Number(newStatusId),
        statusName: newStatus.statusName || newStatus.name,
        changedAt: now,
        changedBy,
        note
      });

      if (window.historyService?.logAction) {
        const oldStatus = await statusService.getById(oldCase.currentStatusId, routeId);

        await historyService.logAction({
          actionType: "status_change",
          entityType: "case",
          entityId: cases[index].caseId,
          entityLabel: `תיק ${cases[index].caseId}`,
          description: "מעבר מצב",
          beforeText: `מצב קודם: ${oldStatus ? (oldStatus.statusName || oldStatus.name) : oldCase.currentStatusId}`,
          afterText: `מצב חדש: ${newStatus.statusName || newStatus.name}`,
          screenName: "switchingModes",
          serviceName: "CaseService",
          actionName: "changeCaseStatus",
          isPrimaryAction: historyOptions.isPrimaryAction !== false,
          details: [
            {
              fieldName: "currentStatusId",
              oldValue: oldCase.currentStatusId,
              newValue: Number(newStatusId)
            }
          ]
        });
      }

      const enrichedCases = await this.getAllCases();
      return enrichedCases.find(c => c.caseId == caseId) || cases[index];
    } catch (error) {
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "switchingModes",
            serviceName: "CaseService",
            actionName: "changeCaseStatus",
            entityType: "case",
            entityId: caseId
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }

      throw error;
    }
  }

    async logBulkSummary({
    bulkOperationId,
    actionType,
    description,
    beforeText,
    afterText,
    screenName,
    details = []
  }) {
    if (!window.historyService?.logAction) return null;

    return await historyService.logAction({
      actionType,
      entityType: "bulkOperation",
      entityId: null,
      entityLabel: description,
      description,
      beforeText,
      afterText,
      screenName,
      serviceName: "CaseService",
      actionName: "logBulkSummary",
      isPrimaryAction: true,
      bulkOperationId,
      details
    });
  }
}

window.caseService = new CaseService();