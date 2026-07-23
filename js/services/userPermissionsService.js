class UserPermissionsService {
  constructor() {
    this.screenName = "userPermissions";
    this.resources = {
      screens: [
        ["dashboard", "דף הבית"], ["cases", "בניית תיקים"], ["case", "הצגת תיק"],
        ["casesInRoute", "איתור תיקים"], ["switchingModes", "העברת מצבים"],
        ["routes", "מסלולים"], ["groups", "קבוצות"], ["statusesInRoute", "מצבים במסלול"],
        ["debtTypes", "סוגי חיוב"], ["debtTypeGroups", "שיוך סוגי חיוב לקבוצה"],
        ["history", "היסטוריה"], ["parameters", "פרמטרים"],
        ["userPermissions", "הרשאות משתמשים"], ["lettersAndVouchers", "מכתבים ושוברים"],
        ["reports", "דוחות"], ["foreclosureCaseBuilder", "בניית תיק עיקולים"],
        ["foreclosureProcess", "תהליך עיקול וביצוע מעקב"], ["foreclosureApproval", "ביצוע חיתום"]
      ],
      tables: [
        ["users", "משתמשים"], ["userPermissions", "הרשאות משתמשים"],
        ["permissionRoles", "תפקידים"], ["rolePermissions", "הרשאות תפקידים"],
        ["cases", "תיקים"], ["caseStatusHistory", "היסטוריית מצבי תיק"],
        ["foreclosureCases", "תיקי עיקול"], ["foreclosureRequests", "הוראות עיקול"],
        ["routes", "מסלולים"], ["statuses", "מצבים"], ["groups", "קבוצות"],
        ["debtTypes", "סוגי חיוב באכיפה"], ["debtTypeGroups", "שיוך סוגי חיוב לקבוצה"],
        ["freezeModes", "מצבי הקפאה"], ["hovgvia", "חובות גבייה"],
        ["originalDebtTypes", "סוגי חיוב מקור"], ["hovachifa", "חובות באכיפה"],
        ["nameHistory", "היסטוריית שמות"], ["history", "היסטוריה"],
        ["historyDetails", "פירוט היסטוריה"], ["errorLog", "יומן שגיאות"]
      ]
    };
  }

  canManage() {
    return authService.isCurrentUserAdmin() && permissionService.canEditScreen(this.screenName);
  }

  async getUsers() { return await localDbService.getAll("users"); }
  async getRoles() { return await localDbService.getAll("permissionRoles"); }
  async getRolePermissions(roleId) { return (await localDbService.getAll("rolePermissions")).filter(p => p.roleId == roleId); }
  async getUserPermissions(userId) { return (await localDbService.getAll("userPermissions")).filter(p => p.userId == userId); }

  getResources(type) { return this.resources[type === "screen" ? "screens" : "tables"] || []; }
  getResourceLabel(type, name) { return this.getResources(type).find(item => item[0] === name)?.[1] || name; }

  normalizePermission(permission) {
    const isScreen = permission.resourceType === "screen";
    return {
      resourceType: permission.resourceType,
      resourceName: permission.resourceName,
      // עריכה במסך מחייבת גם אפשרות להגיע אליו.
      canView: permission.canView === true || (isScreen && permission.canEdit === true),
      canEdit: permission.canEdit === true,
      blockView: permission.blockView === true || (permission.isBlocked === true && !isScreen),
      blockEdit: permission.blockEdit === true || (permission.isBlocked === true && !isScreen)
    };
  }

  getEffectiveAccess(permissions, type, name) {
    const entries = permissions.filter(p => p.resourceType === type && (p.resourceName === name || p.resourceName === "*"));
    if (type === "screen") return { canView: entries.some(p => p.canView === true), canEdit: entries.some(p => p.canEdit === true) };
    return { canView: !entries.some(p => this.normalizePermission(p).blockView), canEdit: !entries.some(p => this.normalizePermission(p).blockEdit) };
  }

  async addUserPermission(userId, permission) {
    this.assertCanManage();
    const normalized = this.normalizePermission(permission);
    this.validatePermission(normalized);
    return await this.runAction("addUserPermission", "הרשאת משתמש", userId, async () => {
      const created = await localDbService.insert("userPermissions", { userId: Number(userId), ...normalized, sourceRoleId: null, isManualOverride: true }, "userPermissionId");
      await this.refreshPermissionCache();
      return created;
    });
  }

  async deleteUserPermission(userPermissionId) {
    this.assertCanManage();
    return await this.runAction("deleteUserPermission", "הרשאת משתמש", userPermissionId, async () => {
      const deleted = await localDbService.delete("userPermissions", "userPermissionId", userPermissionId);
      await this.refreshPermissionCache();
      return deleted;
    });
  }

  async applyRole(userId, roleId, mode) {
    this.assertCanManage();
    const role = (await this.getRoles()).find(item => item.roleId == roleId);
    if (!role || !role.isActive) throw new Error("התפקיד אינו קיים או מושבת");
    const rolePermissions = await this.getRolePermissions(roleId);
    return await this.runAction("applyRole", "הרשאות משתמש", userId, async () => {
      const current = await this.getUserPermissions(userId);
      if (mode === "replace") {
        for (const item of current) await localDbService.delete("userPermissions", "userPermissionId", item.userPermissionId);
      }
      const existing = mode === "replace" ? [] : current;
      let added = 0;
      for (const item of rolePermissions) {
        const hasResource = existing.some(p => p.resourceType === item.resourceType && p.resourceName === item.resourceName);
        if (hasResource) continue;
        await localDbService.insert("userPermissions", { userId: Number(userId), ...this.normalizePermission(item), sourceRoleId: Number(roleId), isManualOverride: false }, "userPermissionId");
        existing.push(item);
        added++;
      }
      await this.refreshPermissionCache();
      return { added, roleName: role.roleName };
    }, `הוחל תפקיד ${role.roleName} (${mode === "replace" ? "החלפה" : "הוספה"})`);
  }

  async createRole(roleData) {
    this.assertCanManage();
    const roleName = String(roleData.roleName || "").trim();
    if (!roleName) throw new Error("יש להזין שם תפקיד");
    return await this.runAction("createRole", "תפקיד", roleName, async () => await localDbService.insert("permissionRoles", { roleName, description: String(roleData.description || "").trim(), isActive: true, isSystemRole: false }, "roleId"));
  }

  async updateRole(roleId, changes) {
    this.assertCanManage();
    const role = (await this.getRoles()).find(item => item.roleId == roleId);
    if (!role) throw new Error("התפקיד לא נמצא");
    if (role.isSystemRole) throw new Error("תפקיד מובנה הוא לקריאה בלבד");
    const roleName = String(changes.roleName || role.roleName).trim();
    if (!roleName) throw new Error("יש להזין שם תפקיד");
    return await this.runAction("updateRole", "תפקיד", roleId, async () => await localDbService.update("permissionRoles", "roleId", roleId, { roleName, description: String(changes.description || "").trim(), isActive: changes.isActive === true }));
  }

  async addRolePermission(roleId, permission) {
    this.assertCanManage();
    const role = (await this.getRoles()).find(item => item.roleId == roleId);
    if (!role || role.isSystemRole) throw new Error("לא ניתן לערוך תפקיד מובנה");
    const normalized = this.normalizePermission(permission);
    this.validatePermission(normalized);
    const existing = await this.getRolePermissions(roleId);
    if (existing.some(p => p.resourceType === normalized.resourceType && p.resourceName === normalized.resourceName)) throw new Error("כבר קיימת הרשאה למשאב זה בתפקיד");
    return await this.runAction("addRolePermission", "הרשאת תפקיד", roleId, async () => await localDbService.insert("rolePermissions", { roleId: Number(roleId), ...normalized, isBlocked: false }, "rolePermissionId"));
  }

  async deleteRolePermission(roleId, rolePermission) {
    this.assertCanManage();
    const role = (await this.getRoles()).find(item => item.roleId == roleId);
    if (!role || role.isSystemRole) throw new Error("לא ניתן לערוך תפקיד מובנה");
    return await this.runAction("deleteRolePermission", "הרשאת תפקיד", roleId, async () => {
      const rows = await localDbService.getAll("rolePermissions");
      const index = rows.indexOf(rolePermission);
      if (index === -1) return false;
      rows.splice(index, 1);
      localDbService.warnMemoryOnly("rolePermissions", "delete");
      return true;
    });
  }

  validatePermission(permission) {
    if (!this.getResources(permission.resourceType).some(item => item[0] === permission.resourceName)) throw new Error("יש לבחור משאב תקין");
    if (permission.resourceType === "screen" && !permission.canView && !permission.canEdit) throw new Error("יש לבחור צפייה או עריכה למסך");
  }

  assertCanManage() {
    if (!this.canManage()) throw new Error("אין הרשאה לעריכת הרשאות משתמשים");
  }

  async refreshPermissionCache() { await permissionService.init(); }

  async runAction(actionName, entityType, entityId, operation, description = "") {
    try {
      const result = await operation();
      await historyService.logAction({ actionType: "עדכון", entityType, entityId, entityLabel: String(entityId), description: description || `בוצעה פעולת ${actionName}`, screenName: this.screenName, serviceName: "UserPermissionsService", actionName });
      return result;
    } catch (error) {
      await errorLogService.logException({ error, screenName: this.screenName, serviceName: "UserPermissionsService", actionName, entityType, entityId });
      throw error;
    }
  }
}

window.userPermissionsService = new UserPermissionsService();
