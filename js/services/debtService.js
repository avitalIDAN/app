class DebtService {
  GVIA_PATH = "data/externalDB/hovgvia.json";
  ACHIFA_PATH = "data/internalDB/hovachifa.json";
  isGviaLoaded = false;
  isAchifaLoaded = false;
  gviaDebts = [];
  achifaDebts = [];

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async getAllGviaDebts() {
    if (!this.isGviaLoaded) {
      this.gviaDebts = await this.load(this.GVIA_PATH);
      this.isGviaLoaded = true;
    }

    return this.gviaDebts;
  }

  async getAllAchifaDebts() {
    if (!this.isAchifaLoaded) {
      const rows = await this.load(this.ACHIFA_PATH);
      this.achifaDebts = rows.filter(row => row && Object.keys(row).length);
      this.isAchifaLoaded = true;
    }

    return this.achifaDebts;
  }

  async getGroups() {
    const debts = await this.getAllGviaDebts();
    const groups = [...new Set(debts.map(debt => debt.sugHov))];
    return groups.sort((a, b) => a - b);
  }

  async getGviaDebtsFiltered({ groupId = null, payerId = null, assetId = null } = {}) {
    const debts = await this.getAllGviaDebts();

    return debts.filter(debt => {
      if (groupId && debt.sugHov != groupId) return false;
      if (payerId && debt.idPayer != payerId) return false;
      if (assetId && debt.idAsset != assetId) return false;
      return true;
    });
  }

  async getGviaDebtsByPayerAndAsset(payerId, assetId) {
    return await this.getGviaDebtsFiltered({ payerId, assetId });
  }

  async getAchifaDebtsByCase(caseId) {
    const debts = await this.getAllAchifaDebts();
    return debts.filter(debt => debt.caseId == caseId);
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
      sugHov: debt.sugHov,
      year: debt.year,
      ribit: debt.ribit,
      sum: debt.sum,
      pulledAt: now
    }));

    achifaDebts.push(...rows);
    return rows;
  }

  sumDebts(debts) {
    return debts.reduce((total, debt) => total + Number(debt.sum || 0), 0);
  }
}

window.debtService = new DebtService();
