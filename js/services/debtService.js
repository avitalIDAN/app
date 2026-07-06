class DebtService {
  async getAllGviaDebts() {
    if (!permissionService.canViewTable("hovgvia")) {
      return [];
    }

    return await localDbService.getAll("hovgvia");
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
    // אם אחת מטבלאות הבסיס חסומה, השירות מחזיר מערך ריק.
    // המסך עצמו אחראי להציג "אין הרשאה לנתונים".
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

  async addDebtsToCase(caseId, gviaDebts) {
    // הקמת חובות באכיפה היא כתיבה ל-hovachifa.
    if (!permissionService.canEditTable("hovachifa")) {
      return [];
    }

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

    return rows;
  }
}

window.debtService = new DebtService();