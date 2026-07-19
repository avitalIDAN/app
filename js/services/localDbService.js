class LocalDbService {
  constructor() {
    this.tablePaths = {
      users: "data/internalDB/users.json",

      permissionRoles: "data/internalDB/permissionRoles.json",
      rolePermissions: "data/internalDB/rolePermissions.json",
      userPermissions: "data/internalDB/userPermissions.json",

      cases: "data/internalDB/cases.json",
      caseStatusHistory: "data/internalDB/caseStatusHistory.json",
      foreclosureCases: "data/internalDB/foreclosureCases.json",
      foreclosureRequests: "data/internalDB/foreclosureRequests.json",

      routes: "data/internalDB/routes.json",
      statuses: "data/internalDB/statuses.json",
      groups: "data/internalDB/groups.json",

      debtTypes: "data/internalDB/debtTypes.json",
      debtTypeGroups: "data/internalDB/debtTypeGroups.json",
      freezeModes: "data/internalDB/freezeModes.json",

      hovgvia: "data/externalDB/hovgvia.json",
      originalDebtTypes: "data/externalDB/originalDebtTypes.json",
      hovachifa: "data/internalDB/hovachifa.json",

      nameHistory: "data/internalDB/namehist.json",
      history: "data/internalDB/history.json",
      historyDetails: "data/internalDB/historyDetails.json",
      errorLog: "data/internalDB/errorLog.json"
      
    };

    this.tables = {};
  }

  async loadTable(tableName) {
    if (!this.tablePaths[tableName]) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    if (!this.tables[tableName]) {
      const res = await fetch(this.tablePaths[tableName]);

      if (!res.ok) {
        throw new Error(`Failed to load table: ${tableName}`);
      }

      this.tables[tableName] = await res.json();
    }

    return this.tables[tableName];
  }

  async getAll(tableName) {
    return await this.loadTable(tableName);
  }

  async getById(tableName, idField, id) {
    const rows = await this.getAll(tableName);
    return rows.find(row => row[idField] == id) || null;
  }

  async filter(tableName, predicate) {
    const rows = await this.getAll(tableName);
    return rows.filter(predicate);
  }

  async insert(tableName, record, idField = "key") {
    const rows = await this.getAll(tableName);

    const nextId = this.getNextId(rows, idField);
    const newRecord = {
      ...record,
      [idField]: record[idField] ?? nextId
    };

    rows.push(newRecord);

    this.warnMemoryOnly(tableName, "insert");

    return newRecord;
  }

  async update(tableName, idField, id, changes) {
    const rows = await this.getAll(tableName);
    const index = rows.findIndex(row => row[idField] == id);

    if (index === -1) {
      return null;
    }

    rows[index] = {
      ...rows[index],
      ...changes
    };

    this.warnMemoryOnly(tableName, "update");

    return rows[index];
  }

  async delete(tableName, idField, id) {
    const rows = await this.getAll(tableName);
    const index = rows.findIndex(row => row[idField] == id);

    if (index === -1) {
      return false;
    }

    rows.splice(index, 1);

    this.warnMemoryOnly(tableName, "delete");

    return true;
  }

  getNextId(rows, idField) {
    return rows.reduce((max, row) => {
      return Math.max(max, Number(row[idField] || 0));
    }, 0) + 1;
  }

  clearCache(tableName = null) {
    if (tableName) {
      delete this.tables[tableName];
      return;
    }

    this.tables = {};
  }

  warnMemoryOnly(tableName, actionName) {
    console.warn(
      `LocalDbService: ${actionName} on ${tableName} changed memory only. JSON file was not physically saved.`
    );
  }
}

window.localDbService = new LocalDbService();
