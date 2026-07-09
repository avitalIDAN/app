class DebtService {
  async getAllGviaDebts() {
    if (!permissionService.canViewTable("hovgvia")) {
      return [];
    }

    return await localDbService.getAll("hovgvia");
  }

  async getOriginalDebtTypes() {
  if (!permissionService.canViewTable("originalDebtTypes")) {
    return [];
  }

  return await localDbService.getAll("originalDebtTypes");
}

  async getAllAchifaDebts() {
    if (!permissionService.canViewTable("hovachifa")) {
      return [];
    }

    const rows = await localDbService.getAll("hovachifa");
    return rows.filter(row => row && Object.keys(row).length);
  }

  async getDebtTypes() {
    if (!permissionService.canViewTable("debtTypes")) {
      return [];
    }

    return await localDbService.getAll("debtTypes");
  }

  async getDebtTypeGroups() {
    if (!permissionService.canViewTable("debtTypeGroups")) {
      return [];
    }

    return await localDbService.getAll("debtTypeGroups");
  }

  async getGroups() {
    if (!permissionService.canViewTable("groups")) {
      return [];
    }

    return await localDbService.getAll("groups");
  }

  getDebtType(gviaDebt, debtTypes) {
    return debtTypes.find(t =>
      t.originalCode == gviaDebt.originalCode &&
      t.year == gviaDebt.year
    ) || null;
  }

  getGroupName(groupId, groups) {
    const group = groups.find(g => g.groupId == groupId);
    return group ? group.name : "";
  }

  sumDebts(debts) {
    return debts.reduce((total, debt) => total + Number(debt.sum || 0), 0);
  }

  buildRowKey({ idPayer, idAsset, routeId, groupId }) {
    return `${idPayer}|${idAsset}|${routeId}|${groupId}`;
  }

  async getCaseBuilderRows({ routeId, groupId = "", idPayer = "", idAsset = "" } = {}) {
    // טבלאות בסיס שחייבות להיות זמינות כדי לבנות את שורות המסך.
    // אם אחת חסומה, השירות מחזיר מערך ריק והמסך מציג הודעת הרשאה.
    if (!permissionService.canViewAllTables(["hovgvia", "debtTypes", "debtTypeGroups", "groups"])) {
      return [];
    }

    const [gviaDebts, achifaDebts, debtTypes, debtTypeGroups, groups] =
      await Promise.all([
        this.getAllGviaDebts(),
        this.getAllAchifaDebts(),
        this.getDebtTypes(),
        this.getDebtTypeGroups(),
        this.getGroups()
      ]);

    const rowsMap = new Map();

    for (const debt of gviaDebts) {
      const type = this.getDebtType(debt, debtTypes);
      if (!type) continue;

      const linkedGroups = debtTypeGroups.filter(link =>
        link.debtTypeId == type.debtTypeId &&
        link.isActive
      );

      for (const linkedGroup of linkedGroups) {
        if (groupId && linkedGroup.groupId != groupId) continue;
        if (idPayer && debt.idPayer != idPayer) continue;
        if (idAsset && debt.idAsset != idAsset) continue;

        const rowBase = {
          idPayer: debt.idPayer,
          idAsset: debt.idAsset,
          routeId: Number(routeId),
          groupId: linkedGroup.groupId,
          groupName: this.getGroupName(linkedGroup.groupId, groups)
        };

        const key = this.buildRowKey(rowBase);

        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            ...rowBase,
            debts: [],
            debtsCount: 0,
            gviaDebt: 0,
            achifaDebt: 0,
            gap: 0
          });
        }

        rowsMap.get(key).debts.push({
          ...debt,
          debtTypeId: type.debtTypeId,
          enforcementCode: type.enforcementCode,
          groupId: linkedGroup.groupId
        });
      }
    }

    for (const row of rowsMap.values()) {
      row.debtsCount = row.debts.length;
      row.gviaDebt = this.sumDebts(row.debts);

      const enforcementCodes = row.debts.map(d => d.enforcementCode);

      const matchingAchifa = achifaDebts.filter(a =>
        a.idPayer == row.idPayer &&
        a.idAsset == row.idAsset &&
        enforcementCodes.includes(a.enforcementCode)
      );

      row.achifaDebt = this.sumDebts(matchingAchifa);
      row.gap = row.gviaDebt - row.achifaDebt;
    }

    return Array.from(rowsMap.values());
  }

  async getAchifaDebtsByCase(caseId) {
    if (!permissionService.canViewTable("hovachifa")) {
      return [];
    }

    const [achifaDebts, debtTypes] = await Promise.all([
      this.getAllAchifaDebts(),
      this.getDebtTypes()
    ]);

    return achifaDebts
      .filter(debt => debt.caseId == caseId)
      .map(debt => {
        const debtType = debtTypes.find(t => t.debtTypeId == debt.debtTypeId);

        return {
          ...debt,
          debtTypeName: debtType ? debtType.name : "",
          originalCode: debtType ? debtType.originalCode : "",
          year: debtType ? debtType.year : ""
        };
      });
  }

  async getGviaDetailsForBuilderRow(row) {
    if (!permissionService.canViewAllTables(["hovgvia", "debtTypes", "debtTypeGroups"])) {
      return [];
    }

    const [gviaDebts, debtTypes, debtTypeGroups] = await Promise.all([
      this.getAllGviaDebts(),
      this.getDebtTypes(),
      this.getDebtTypeGroups()
    ]);

    return gviaDebts
      .map(debt => {
        const type = this.getDebtType(debt, debtTypes);
        if (!type) return null;

        const isInGroup = debtTypeGroups.some(link =>
          link.debtTypeId == type.debtTypeId &&
          link.groupId == row.groupId &&
          link.isActive
        );

        if (!isInGroup) return null;

        return {
          ...debt,
          debtTypeId: type.debtTypeId,
          debtTypeName: type.name,
          enforcementCode: type.enforcementCode,
          groupId: row.groupId
        };
      })
      .filter(debt =>
        debt &&
        debt.idPayer == row.idPayer &&
        debt.idAsset == row.idAsset
      );
  }

  async getAchifaDetailsForBuilderRow(row) {
    if (!permissionService.canViewAllTables(["hovachifa", "debtTypes"])) {
      return [];
    }

    const [achifaDebts, debtTypes] = await Promise.all([
      this.getAllAchifaDebts(),
      this.getDebtTypes()
    ]);

    const gviaDetails = row.debts || await this.getGviaDetailsForBuilderRow(row);
    const enforcementCodes = gviaDetails.map(debt => debt.enforcementCode);

    return achifaDebts
      .filter(debt =>
        debt.idPayer == row.idPayer &&
        debt.idAsset == row.idAsset &&
        enforcementCodes.includes(debt.enforcementCode)
      )
      .map(debt => {
        const type = debtTypes.find(t =>
          t.debtTypeId == debt.debtTypeId ||
          t.enforcementCode == debt.enforcementCode
        );

        return {
          ...debt,
          debtTypeName: type ? type.name : "",
          originalCode: type ? type.originalCode : "",
          year: type ? type.year : ""
        };
      });
  }

  async addDebtsToCase(caseId, gviaDebts) {
    // כתיבה ל-hovachifa: אם אין הרשאת עריכה, לא מבצעים פעולה.
    // בשלב הזה חסימת הרשאה אינה נרשמת כשגיאה, כדי לא להציף את errorLog.
    if (!permissionService.canEditTable("hovachifa")) {
      return [];
    }

    try {
      const achifaTable = await localDbService.getAll("hovachifa");
      const nextKey = localDbService.getNextId(achifaTable, "key");
      const now = new Date().toISOString();

      const rows = gviaDebts.map((debt, index) => ({
        key: nextKey + index,
        caseId,
        idhov: debt.idhov,
        idPayer: debt.idPayer,
        idAsset: debt.idAsset,
        enforcementCode: debt.enforcementCode,
        debtTypeId: debt.debtTypeId,
        ribit: debt.ribit,
        sum: debt.sum,
        pulledAt: now
      }));

      achifaTable.push(...rows);
      localDbService.warnMemoryOnly("hovachifa", "insert");

      const totalDebt = this.sumDebts(rows);

      // רישום היסטוריה עסקית על הוספת חובות לתיק.
      if (window.historyService?.logAction) {
        await historyService.logAction({
          actionType: "create",
          entityType: "caseDebt",
          entityId: caseId,
          entityLabel: `תיק ${caseId}`,
          description: "הוספת חובות לתיק",
          beforeText: "",
          afterText: `נוספו ${rows.length} חובות בסך ${totalDebt}`,
          screenName: "cases",
          serviceName: "DebtService",
          actionName: "addDebtsToCase",
          details: [
            { fieldName: "debtsCount", oldValue: "", newValue: rows.length },
            { fieldName: "totalDebt", oldValue: "", newValue: totalDebt }
          ]
        });
      }

      return rows;
    } catch (error) {
      // רישום שגיאה בלי ליצור לולאת שגיאות אם הלוג עצמו נכשל.
      if (window.errorLogService?.logException) {
        try {
          await errorLogService.logException({
            error,
            screenName: "cases",
            serviceName: "DebtService",
            actionName: "addDebtsToCase",
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
}

window.debtService = new DebtService();
