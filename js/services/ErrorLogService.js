class ErrorLogService {
  async getAllErrors() {
    if (!permissionService.canViewTable("errorLog")) {
      return [];
    }

    return await localDbService.getAll("errorLog");
  }

  async logError(errorData) {
    // רישום שגיאה הוא כתיבה לטבלת errorLog.
    // אם המשתמש חסום מכתיבה לשם, לא ננסה לרשום כדי לא ליצור פעולה לא מורשית נוספת.
    if (!permissionService.canEditTable("errorLog")) {
      return null;
    }

    const errors = await localDbService.getAll("errorLog");
    const user = authService.getCurrentUser();

    const newError = {
      errorId: localDbService.getNextId(errors, "errorId"),
      errorDate: new Date().toISOString(),
      userId: user ? user.userId : null,
      username: user ? user.username : null,
      screenName: errorData.screenName || "",
      serviceName: errorData.serviceName || "",
      actionName: errorData.actionName || "",
      entityType: errorData.entityType || "",
      entityId: errorData.entityId ?? null,
      errorMessage: errorData.errorMessage || "",
      errorDetails: errorData.errorDetails || ""
    };

    errors.push(newError);
    localDbService.warnMemoryOnly("errorLog", "insert");

    return newError;
  }

  async logException({
    error,
    screenName = "",
    serviceName = "",
    actionName = "",
    entityType = "",
    entityId = null
  }) {
    return await this.logError({
      screenName,
      serviceName,
      actionName,
      entityType,
      entityId,
      errorMessage: error?.message || String(error),
      errorDetails: error?.stack || ""
    });
  }
}

window.errorLogService = new ErrorLogService();