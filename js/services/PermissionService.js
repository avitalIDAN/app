class PermissionService {
  constructor() {
    this.USER_PERMISSIONS_PATH = "data/internalDB/userPermissions.json";
    this.userPermissions = [];
    this.isLoaded = false;
  }

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async getAllUserPermissions() {
    if (!this.isLoaded) {
      this.userPermissions = await this.load(this.USER_PERMISSIONS_PATH);
      this.isLoaded = true;
    }

    return this.userPermissions;
  }

  async getPermission(resourceType, resourceName) {
    const user = authService.getCurrentUser();
    if (!user) return { canView: false, canEdit: false };

    if (user.isAdmin) {
      return { canView: true, canEdit: true };
    }

    const permissions = await this.getAllUserPermissions();
    const userId = user.userId ?? user.key;

    const relevant = permissions.filter(p =>
      p.userId == userId &&
      p.resourceType === resourceType &&
      (p.resourceName === resourceName || p.resourceName === "*")
    );

    if (relevant.some(p => p.isBlocked)) {
      return { canView: false, canEdit: false };
    }

    return {
      canView: relevant.some(p => p.canView),
      canEdit: relevant.some(p => p.canEdit)
    };
  }

  async canViewScreen(screenName) {
    return (await this.getPermission("screen", screenName)).canView;
  }

  async canEditScreen(screenName) {
    return (await this.getPermission("screen", screenName)).canEdit;
  }

  async canViewTable(tableName) {
    return (await this.getPermission("table", tableName)).canView;
  }

  async canEditTable(tableName) {
    return (await this.getPermission("table", tableName)).canEdit;
  }
}

window.permissionService = new PermissionService();