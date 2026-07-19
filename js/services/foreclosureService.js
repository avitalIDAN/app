class ForeclosureService {
  constructor() {
    this.tables = ["foreclosureCases", "foreclosureRequests"];
  }

  canEdit(screenName) {
    return permissionService.canEditScreen(screenName) && permissionService.canEditAllTables(this.tables);
  }

  async getForeclosureCases() {
    if (!permissionService.canViewAllTables(this.tables)) return [];
    const [foreclosures, cases] = await Promise.all([
      localDbService.getAll("foreclosureCases"), caseService.getAllCases()
    ]);
    return foreclosures.map(item => ({ ...item, caseData: cases.find(c => c.caseId == item.caseId) || null }));
  }

  async getEligibleCases(manual = false) {
    const [cases, foreclosures] = await Promise.all([
      caseService.getAllCases(), localDbService.getAll("foreclosureCases")
    ]);
    return cases.filter(item => !item.isClosed &&
      (manual ? Number(item.currentStatusId) !== 4 : Number(item.currentStatusId) === 4) &&
      !foreclosures.some(foreclosure => foreclosure.caseId == item.caseId));
  }

  async openForeclosureCase(caseId, source) {
    if (!this.canEdit("foreclosureCaseBuilder")) return null;
    try {
      const [caseItem, rows] = await Promise.all([
        caseService.getCaseById(caseId), localDbService.getAll("foreclosureCases")
      ]);
      if (!caseItem) throw new Error("התיק לא נמצא");
      if (rows.some(item => item.caseId == caseId)) throw new Error("לתיק זה כבר קיים תיק עיקול");
      const row = {
        foreclosureId: localDbService.getNextId(rows, "foreclosureId"), caseId: Number(caseId), source,
        status: "ממתין ליצירת עיקול", clientType: "ת.ז.", clientNumber: String(caseItem.idPayer),
        lastName: "", firstName: "", address: "", city: "", department: "גבייה",
        createdAt: new Date().toISOString(), createdBy: authService.getCurrentUsername()
      };
      rows.push(row);
      localDbService.warnMemoryOnly("foreclosureCases", "insert");
      await this.log("create", row.foreclosureId, `נפתח תיק עיקול לתיק ${caseId}`, "foreclosureCaseBuilder");
      return row;
    } catch (error) {
      await this.logError(error, "foreclosureCaseBuilder", "openForeclosureCase", caseId);
      throw error;
    }
  }

  getAvailableActions(foreclosure, requests) {
    const pending = requests.find(item => item.foreclosureId == foreclosure.foreclosureId && item.status === "ממתין לחיתום");
    if (pending) return [pending.actionType];
    if (foreclosure.status === "ממתין ליצירת עיקול") return ["יצירת עיקול"];
    if (foreclosure.status === "עיקול פעיל") return ["ביטול עיקול", "מימוש עיקול"];
    if (foreclosure.status === "מימוש בוצע") return ["ביטול עיקול"];
    return [];
  }

  async createRequest({ foreclosureId, actionType, bank, amount }) {
    if (!this.canEdit("foreclosureProcess")) return null;
    try {
      const [foreclosures, requests] = await Promise.all([
        localDbService.getAll("foreclosureCases"), localDbService.getAll("foreclosureRequests")
      ]);
      const foreclosure = foreclosures.find(item => item.foreclosureId == foreclosureId);
      if (!foreclosure) throw new Error("תיק העיקול לא נמצא");
      if (!bank || !Number(amount) || Number(amount) <= 0) throw new Error("יש לבחור בנק ולהזין סכום חיובי");
      const availableActions = this.getAvailableActions(foreclosure, requests);
      if (!availableActions) throw new Error("התיק כבר ממתין לחיתום");
      if (!availableActions.includes(actionType)) throw new Error("הפעולה אינה תואמת את מצב תיק העיקול");
      if (requests.some(item => item.foreclosureId == foreclosureId && item.actionType === actionType && item.bank === bank && ["ממתין לחיתום", "נחתם ונשלח"].includes(item.status))) {
        throw new Error("כבר קיימת שורה פעילה לאותו בנק ולפעולה זו");
      }
      const request = {
        requestId: localDbService.getNextId(requests, "requestId"), foreclosureId: Number(foreclosureId),
        caseId: foreclosure.caseId, actionType, bank, amount: Number(amount), status: "ממתין לחיתום",
        requestedBy: authService.getCurrentUsername(), requestedAt: new Date().toISOString(), signedBy: null, signedAt: null
      };
      requests.push(request);
      foreclosure.status = "ממתין לחיתום";
      localDbService.warnMemoryOnly("foreclosureRequests", "insert");
      localDbService.warnMemoryOnly("foreclosureCases", "update");
      await this.log("create", request.requestId, `נוספה בקשת ${actionType} לבנק ${bank}`, "foreclosureProcess");
      return request;
    } catch (error) {
      await this.logError(error, "foreclosureProcess", "createRequest", foreclosureId);
      throw error;
    }
  }

  async getPendingRequests() {
    if (!permissionService.canViewAllTables(this.tables)) return [];
    return (await localDbService.getAll("foreclosureRequests")).filter(item => item.status === "ממתין לחיתום");
  }

  async signPendingRequests(signerId) {
    if (!this.canEdit("foreclosureApproval")) return null;
    if (!String(signerId || "").trim()) throw new Error("יש להזין תעודת זהות של החותם");
    try {
      const [requests, foreclosures] = await Promise.all([
        localDbService.getAll("foreclosureRequests"), localDbService.getAll("foreclosureCases")
      ]);
      const pending = requests.filter(item => item.status === "ממתין לחיתום");
      if (!pending.length) throw new Error("אין בקשות שממתינות לחיתום");
      const now = new Date().toISOString();
      pending.forEach(request => {
        request.status = "נחתם ונשלח"; request.signedBy = String(signerId).trim(); request.signedAt = now;
        const foreclosure = foreclosures.find(item => item.foreclosureId == request.foreclosureId);
        if (foreclosure) foreclosure.status = request.actionType === "יצירת עיקול" ? "עיקול פעיל" : request.actionType === "מימוש עיקול" ? "מימוש בוצע" : "עיקול בוטל";
      });
      localDbService.warnMemoryOnly("foreclosureRequests", "update");
      localDbService.warnMemoryOnly("foreclosureCases", "update");
      await this.log("approve", null, `נחתמו ונשלחו ${pending.length} בקשות עיקול`, "foreclosureApproval");
      return pending;
    } catch (error) {
      await this.logError(error, "foreclosureApproval", "signPendingRequests", null);
      throw error;
    }
  }

  async log(actionType, entityId, description, screenName) {
    if (window.historyService?.logAction) await historyService.logAction({ actionType, entityType: "foreclosure", entityId, entityLabel: description, description, afterText: description, screenName, serviceName: "ForeclosureService", actionName: actionType });
  }

  async logError(error, screenName, actionName, entityId) {
    if (window.errorLogService?.logException) await errorLogService.logException({ error, screenName, serviceName: "ForeclosureService", actionName, entityType: "foreclosure", entityId });
  }
}

window.foreclosureService = new ForeclosureService();
