class StatusService {
  constructor() {
    // מזהי מצבי מערכת קבועים בכל המסלולים בשלב הנוכחי.
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

  async getAll() {
    if (!permissionService.canViewTable("statuses")) {
      return [];
    }

    return localDbService.getAll("statuses");
  }

  async getAllByRoute(routeId) {
    const statuses = await this.getAll();

    return statuses.filter(status => status.routeId == routeId);
  }

  async getById(statusId, routeId) {
    const statuses = await this.getAll();

    return statuses.find(status =>
      status.statusId == statusId &&
      status.routeId == routeId
    ) || null;
  }

  async getByCode(code, routeId) {
    const statuses = await this.getAll();

    return statuses.find(status =>
      (status.statusCode === code || status.code === code) &&
      status.routeId == routeId
    ) || null;
  }

  async getNameById(statusId, routeId) {
    const status = await this.getById(statusId, routeId);

    return status ? (status.statusName || status.name) : "";
  }

  async getActive(routeId) {
    const statuses = await this.getAllByRoute(routeId);

    return statuses.filter(status => status.isActive !== false);
  }

  async getClosedStatus(routeId) {
    const statuses = await this.getAllByRoute(routeId);

    return statuses.find(status =>
      status.isClosedStatus === true &&
      status.isActive !== false
    ) || null;
  }

  async getNextStatus(statusId, routeId) {
    const currentStatus = await this.getById(statusId, routeId);

    if (!currentStatus || currentStatus.nextStatusId == null) {
      return null;
    }

    const nextStatus = await this.getById(
      currentStatus.nextStatusId,
      routeId
    );

    // אין קידום למצב מושבת.
    return nextStatus?.isActive !== false ? nextStatus : null;
  }

  async getOpenCasesCountByStatus(routeId, statusId) {
    if (!permissionService.canViewTable("cases")) {
      return null;
    }

    const cases = await caseService.getCasesByStatus(statusId, routeId);

    return cases.filter(caseItem => !caseItem.isClosed).length;
  }

  normalizeStatus(status) {
    const statusCode = String(
      status.statusCode ?? status.code ?? ""
    ).trim();

    const statusName = String(
      status.statusName ?? status.name ?? ""
    ).trim();

    const hasNextStatus =
      status.nextStatusId !== null &&
      status.nextStatusId !== undefined &&
      status.nextStatusId !== "";

    return {
      ...status,
      routeId: Number(status.routeId),
      statusId: Number(status.statusId),

      // נשמרים שני השמות הקיימים לתאימות עד לאיחוד מבנה הנתונים.
      code: statusCode,
      statusCode,

      name: statusName,
      statusName,

      isActive: status.isActive !== false,
      isSystemStatus: status.isSystemStatus === true,
      isClosedStatus: status.isClosedStatus === true,

      nextStatusId: hasNextStatus
        ? Number(status.nextStatusId)
        : null
    };
  }

  async validateStatus(status, currentKey = null) {
    if (!Number.isInteger(status.routeId) || status.routeId <= 0) {
      throw new Error("יש לבחור מסלול תקין");
    }

    if (!Number.isInteger(status.statusId) || status.statusId < 0) {
      throw new Error("יש להזין מזהה מצב תקין");
    }

    if (!status.statusCode) {
      throw new Error("יש להזין קוד מצב");
    }

    if (!status.statusName) {
      throw new Error("יש להזין שם מצב");
    }

    const statusesInRoute = await this.getAllByRoute(status.routeId);

    const duplicateId = statusesInRoute.find(item =>
      item.statusId === status.statusId &&
      item.key !== currentKey
    );

    if (duplicateId) {
      throw new Error("כבר קיים מצב עם מזהה זה במסלול");
    }

    const duplicateCode = statusesInRoute.find(item =>
      item.statusCode === status.statusCode &&
      item.key !== currentKey
    );

    if (duplicateCode) {
      throw new Error("כבר קיים מצב עם קוד זה במסלול");
    }

    if (status.nextStatusId === status.statusId) {
      throw new Error("מצב הבא אינו יכול להיות אותו מצב");
    }

    if (status.nextStatusId != null) {
      const nextStatus = statusesInRoute.find(item =>
        item.statusId === status.nextStatusId
      );

      if (!nextStatus) {
        throw new Error("המצב הבא חייב להשתייך לאותו מסלול");
      }

      if (nextStatus.isActive === false) {
        throw new Error("לא ניתן לבחור מצב מושבת כמצב הבא");
      }
    }
  }

  validateSystemStatusChanges(oldStatus, updatedStatus) {
    if (!oldStatus.isSystemStatus) {
      return;
    }

    const lockedFields = [
      "statusId",
      "statusCode",
      "isClosedStatus"
    ];

    const changedLockedField = lockedFields.find(field =>
      oldStatus[field] !== updatedStatus[field]
    );

    if (changedLockedField) {
      throw new Error(
        `לא ניתן לשנות את השדה ${changedLockedField} במצב בסיסי`
      );
    }

    if (updatedStatus.isActive === false) {
      throw new Error("לא ניתן להשבית מצב בסיסי");
    }
  }

  async createStatus(status) {
    if (!permissionService.canEditTable("statuses")) {
      return null;
    }

    try {
      const newStatus = this.normalizeStatus({
        ...status,

        // מצב שמתווסף על ידי משתמש אינו מצב מערכת.
        isActive: status.isActive !== false,
        isSystemStatus: false,
        isClosedStatus: status.isClosedStatus === true,
        nextStatusId: status.nextStatusId ?? null
      });

      await this.validateStatus(newStatus);

      const insertedStatus = await localDbService.insert(
        "statuses",
        newStatus,
        "key"
      );

      await this.logHistory({
        actionType: "create",
        entityId: insertedStatus.key,
        entityLabel: insertedStatus.statusName,
        description: "יצירת מצב",
        beforeText: "",
        afterText: `נוצר מצב ${insertedStatus.statusName}`,
        actionName: "createStatus",
        details: [
          {
            fieldName: "statusId",
            oldValue: "",
            newValue: insertedStatus.statusId
          },
          {
            fieldName: "routeId",
            oldValue: "",
            newValue: insertedStatus.routeId
          },
          {
            fieldName: "statusName",
            oldValue: "",
            newValue: insertedStatus.statusName
          }
        ]
      });

      return insertedStatus;
    } catch (error) {
      await this.logError(error, "createStatus", status?.statusId ?? null);
      throw error;
    }
  }

  async updateStatus(key, changes) {
    if (!permissionService.canEditTable("statuses")) {
      return null;
    }

    try {
      const oldStatus = await localDbService.getById(
        "statuses",
        "key",
        key
      );

      if (!oldStatus) {
        throw new Error("המצב לא נמצא");
      }

      const updatedStatus = this.normalizeStatus({
        ...oldStatus,
        ...changes
      });

      this.validateSystemStatusChanges(oldStatus, updatedStatus);
      await this.validateStatus(updatedStatus, key);

      const savedStatus = await localDbService.update(
        "statuses",
        "key",
        key,
        updatedStatus
      );

      await this.logHistory({
        actionType: "update",
        entityId: key,
        entityLabel: savedStatus.statusName,
        description: "עדכון מצב",
        beforeText: `מצב קודם: ${oldStatus.statusName || oldStatus.name}`,
        afterText: `מצב חדש: ${savedStatus.statusName}`,
        actionName: "updateStatus",
        details: this.buildChangeDetails(oldStatus, savedStatus)
      });

      return savedStatus;
    } catch (error) {
      await this.logError(error, "updateStatus", key);
      throw error;
    }
  }

  async deactivateStatus(key) {
    return this.updateStatus(key, {
      isActive: false
    });
  }

  async deleteStatus(key) {
    const error = new Error(
      "לא ניתן למחוק מצב. יש להשבית אותו במקום זאת"
    );

    await this.logError(error, "deleteStatus", key);
    throw error;
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

  async logHistory({
    actionType,
    entityId,
    entityLabel,
    description,
    beforeText,
    afterText,
    actionName,
    details
  }) {
    if (!window.historyService?.logAction) {
      return;
    }

    await historyService.logAction({
      actionType,
      entityType: "status",
      entityId,
      entityLabel,
      description,
      beforeText,
      afterText,
      screenName: "statusesInRoute",
      serviceName: "StatusService",
      actionName,
      details
    });
  }

  async logError(error, actionName, entityId) {
    if (!window.errorLogService?.logException) {
      return;
    }

    try {
      await errorLogService.logException({
        error,
        screenName: "statusesInRoute",
        serviceName: "StatusService",
        actionName,
        entityType: "status",
        entityId
      });
    } catch (logError) {
      console.error("Failed to write error log", logError);
    }
  }
}

window.statusService = new StatusService();