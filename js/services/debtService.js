class DebtService {
  GVIA_PATH = "data/externalDB/hovgvia.json";
  ACHIFA_PATH = "data/internalDB/hovachifa.json";
  TYPES_PATH = "data/internalDB/debtTypes.json";
  GROUPS_PATH = "data/internalDB/groups.json";

  gviaDebts = [];
  achifaDebts = [];
  debtTypes = [];
  groups = [];

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async getAllGviaDebts() {
    if (!this.gviaDebts.length) {
      this.gviaDebts = await this.load(this.GVIA_PATH);
    }
    return this.gviaDebts;
  }

  async getAllAchifaDebts() {
    if (!this.achifaDebts.length) {
      const rows = await this.load(this.ACHIFA_PATH);
      this.achifaDebts = rows.filter(row => row && Object.keys(row).length);
    }
    return this.achifaDebts;
  }

  async getDebtTypes() {
    if (!this.debtTypes.length) {
      this.debtTypes = await this.load(this.TYPES_PATH);
    }
    return this.debtTypes;
  }

  async getGroups() {
    if (!this.groups.length) {
      this.groups = await this.load(this.GROUPS_PATH);
    }
    return this.groups;
  }

  getDebtType(gviaDebt, debtTypes) {
    return debtTypes.find(t =>
      t.originalCode == gviaDebt.originalCode &&
      t.year == gviaDebt.year
    );
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

  // async getCaseBuilderRows({ routeId, groupId = "" } = {}) {
  //   const [gviaDebts, achifaDebts, debtTypes, groups] = await Promise.all([
  //     this.getAllGviaDebts(),
  //     this.getAllAchifaDebts(),
  //     this.getDebtTypes(),
  //     this.getGroups()
  //   ]);

  //   const rowsMap = new Map();

  //   for (const debt of gviaDebts) {
  //     const type = this.getDebtType(debt, debtTypes);
  //     if (!type) continue;
  //     if (groupId && type.groupId != groupId) continue;

  //     const rowBase = {
  //       idPayer: debt.idPayer,
  //       idAsset: debt.idAsset,
  //       routeId: Number(routeId),
  //       groupId: type.groupId,
  //       groupName: this.getGroupName(type.groupId, groups)
  //     };

  //     const key = this.buildRowKey(rowBase);

  //     if (!rowsMap.has(key)) {
  //       rowsMap.set(key, {
  //         ...rowBase,
  //         debts: [],
  //         debtsCount: 0,
  //         gviaDebt: 0,
  //         achifaDebt: 0,
  //         gap: 0
  //       });
  //     }

  //     rowsMap.get(key).debts.push({
  //       ...debt,
  //       enforcementCode: type.enforcementCode,
  //       groupId: type.groupId
  //     });
  //   }

  //   for (const row of rowsMap.values()) {
  //     row.debtsCount = row.debts.length;
  //     row.gviaDebt = this.sumDebts(row.debts);

  //     const enforcementCodes = row.debts.map(d => d.enforcementCode);

  //     const matchingAchifa = achifaDebts.filter(a =>
  //       a.idPayer == row.idPayer &&
  //       a.idAsset == row.idAsset &&
  //       enforcementCodes.includes(a.enforcementCode)
  //     );

  //     row.achifaDebt = this.sumDebts(matchingAchifa);
  //     row.gap = row.gviaDebt - row.achifaDebt;
  //   }

  //   return Array.from(rowsMap.values());
  // }
async getCaseBuilderRows({
  routeId,
  groupId = "",
  idPayer = "",
  idAsset = ""
} = {}) {
  const [gviaDebts, achifaDebts, debtTypes, groups] = await Promise.all([
    this.getAllGviaDebts(),
    this.getAllAchifaDebts(),
    this.getDebtTypes(),
    this.getGroups()
  ]);

  const rowsMap = new Map();

  for (const debt of gviaDebts) {
    const type = this.getDebtType(debt, debtTypes);
    if (!type) continue;

    if (groupId && type.groupId != groupId) continue;
    if (idPayer && debt.idPayer != idPayer) continue;
    if (idAsset && debt.idAsset != idAsset) continue;

    const rowBase = {
      idPayer: debt.idPayer,
      idAsset: debt.idAsset,
      routeId: Number(routeId),
      groupId: type.groupId,
      groupName: this.getGroupName(type.groupId, groups)
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
      enforcementCode: type.enforcementCode,
      groupId: type.groupId
    });
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

  async addDebtsToCase(caseId, gviaDebts) {
    const achifaDebts = await this.getAllAchifaDebts();
    const nextKey = achifaDebts.reduce((max, debt) => Math.max(max, debt.key || 0), 0) + 1;
    const now = new Date().toISOString();

    const rows = gviaDebts.map((debt, index) => ({
      key: nextKey + index,
      caseId,
      idhov: debt.idhov,
      idPayer: debt.idPayer,
      idAsset: debt.idAsset,
      enforcementCode: debt.enforcementCode,
      ribit: debt.ribit,
      sum: debt.sum,
      pulledAt: now
    }));

    achifaDebts.push(...rows);
    return rows;
  }
}

window.debtService = new DebtService();

// class DebtService {
//   GVIA_PATH = "data/externalDB/hovgvia.json";
//   ACHIFA_PATH = "data/internalDB/hovachifa.json";
//   isGviaLoaded = false;
//   isAchifaLoaded = false;
//   gviaDebts = [];
//   achifaDebts = [];

//   async load(path) {
//     const res = await fetch(path);
//     if (!res.ok) throw new Error(`Failed to load ${path}`);
//     return await res.json();
//   }

//   async getAllGviaDebts() {
//     if (!this.isGviaLoaded) {
//       this.gviaDebts = await this.load(this.GVIA_PATH);
//       this.isGviaLoaded = true;
//     }

//     return this.gviaDebts;
//   }

//   async getAllAchifaDebts() {
//     if (!this.isAchifaLoaded) {
//       const rows = await this.load(this.ACHIFA_PATH);
//       this.achifaDebts = rows.filter(row => row && Object.keys(row).length);
//       this.isAchifaLoaded = true;
//     }

//     return this.achifaDebts;
//   }

//   async getGroups() {
//     const debts = await this.getAllGviaDebts();
//     const groups = [...new Set(debts.map(debt => debt.sugHov))];
//     return groups.sort((a, b) => a - b);
//   }

//   async getGviaDebtsFiltered({ groupId = null, payerId = null, assetId = null } = {}) {
//     const debts = await this.getAllGviaDebts();

//     return debts.filter(debt => {
//       if (groupId && debt.sugHov != groupId) return false;
//       if (payerId && debt.idPayer != payerId) return false;
//       if (assetId && debt.idAsset != assetId) return false;
//       return true;
//     });
//   }

//   async getGviaDebtsByPayerAndAsset(payerId, assetId) {
//     return await this.getGviaDebtsFiltered({ payerId, assetId });
//   }

//   async getAchifaDebtsByCase(caseId) {
//     const debts = await this.getAllAchifaDebts();
//     return debts.filter(debt => debt.caseId == caseId);
//   }

//   async addDebtsToCase(caseId, gviaDebts) {
//     const achifaDebts = await this.getAllAchifaDebts();
//     const nextKey = achifaDebts.reduce((max, debt) => Math.max(max, debt.key || 0), 0) + 1;
//     const now = new Date().toISOString();

//     const rows = gviaDebts.map((debt, index) => ({
//       key: nextKey + index,
//       caseId,
//       idhov: debt.idhov,
//       idPayer: debt.idPayer,
//       idAsset: debt.idAsset,
//       sugHov: debt.sugHov,
//       year: debt.year,
//       ribit: debt.ribit,
//       sum: debt.sum,
//       pulledAt: now
//     }));

//     achifaDebts.push(...rows);
//     return rows;
//   }

//   sumDebts(debts) {
//     return debts.reduce((total, debt) => total + Number(debt.sum || 0), 0);
//   }
// }

// window.debtService = new DebtService();
