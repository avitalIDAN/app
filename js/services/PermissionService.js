class PermissionService {
  constructor() {
    this.userPermissions = [];
  }

  async init() {
    this.userPermissions = await localDbService.getAll("userPermissions");
  }

  getCurrentUserId() {
    const user = authService.getCurrentUser();
    if (!user) return null;

    return user.userId;
  }

  getUserPermissions(resourceType, resourceName) {
    const userId = this.getCurrentUserId();
    if (userId === null || userId === undefined) return [];

    return this.userPermissions.filter(p =>
      p.userId == userId &&
      p.resourceType === resourceType &&
      (p.resourceName === resourceName || p.resourceName === "*")
    );
  }

  // הרשאות מסך הן הרשאות חיוביות:
  // חייבת להיות הרשאת canView/canEdit מפורשת.
  getScreenAccess(screenName) {
    const permissions = this.getUserPermissions("screen", screenName);

    return {
      resourceType: "screen",
      resourceName: screenName,
      canView: permissions.some(p => p.canView === true),
      canEdit: permissions.some(p => p.canEdit === true)
    };
  }

  // הרשאות טבלה הן חסימות:
  // כברירת מחדל מותר, אלא אם קיימת חסימה מפורשת.
  getTableAccess(tableName) {
    const permissions = this.getUserPermissions("table", tableName);

    const blockView = permissions.some(p => p.blockView === true);
    const blockEdit = permissions.some(p => p.blockEdit === true);

    return {
      resourceType: "table",
      resourceName: tableName,
      canView: !blockView,
      canEdit: !blockEdit,
      blockView,
      blockEdit
    };
  }

  getPermission(resourceType, resourceName) {
    if (resourceType === "screen") {
      return this.getScreenAccess(resourceName);
    }

    if (resourceType === "table") {
      return this.getTableAccess(resourceName);
    }

    return {
      resourceType,
      resourceName,
      canView: false,
      canEdit: false
    };
  }

  canViewScreen(screenName) {
    return this.getScreenAccess(screenName).canView;
  }

  canEditScreen(screenName) {
    return this.getScreenAccess(screenName).canEdit;
  }

  canViewTable(tableName) {
    return this.getTableAccess(tableName).canView;
  }

  canEditTable(tableName) {
    return this.getTableAccess(tableName).canEdit;
  }

  // בדיקה מרוכזת של חסימות צפייה או עריכה לכמה טבלאות.
  // מחזיר מערך של שמות הטבלאות החסומות.
  getBlockedTables(tableNames, action = "view") {
    return tableNames.filter(tableName => {
      const access = this.getTableAccess(tableName);

      if (action === "view") return !access.canView;
      if (action === "edit") return !access.canEdit;

      return false;
    });
  }

  // נוח למסכים: האם כל הטבלאות זמינות לצפייה.
  canViewAllTables(tableNames) {
    return this.getBlockedTables(tableNames, "view").length === 0;
  }

  // נוח למסכים: האם כל הטבלאות זמינות לעריכה.
  canEditAllTables(tableNames) {
    return this.getBlockedTables(tableNames, "edit").length === 0;
  }
}

window.permissionService = new PermissionService();