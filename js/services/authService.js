class AuthService {
  constructor() {
    this.users = [];
  }

  async init() {
    this.users = await localDbService.getAll("users");
  }

  getAllUsers() {
    return this.users;
  }

  getUserByUsername(username) {
    return this.users.find(u => u.username === username) || null;
  }

  setCurrentUsername(username) {
    localStorage.setItem("currentUser", username);
  }

  clearCurrentUsername() {
    localStorage.removeItem("currentUser");
  }

  getCurrentUsername() {
    return localStorage.getItem("currentUser");
  }

  getCurrentUser() {
    const username = this.getCurrentUsername();
    if (!username) return null;

    return this.getUserByUsername(username);
  }

  login(username, password) {
    const user = this.getUserByUsername(username);

    if (!user || user.password !== password) {
      return false;
    }

    this.setCurrentUsername(username);
    return true;
  }

  logout() {
    this.clearCurrentUsername();
  }

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  hasViewPermission(screenName) {
    return permissionService.canViewScreen(screenName);
  }

  hasEditPermission(screenName) {
    return permissionService.canEditScreen(screenName);
  }

  hasViewDBPermission(tableName) {
    return permissionService.canViewTable(tableName);
  }

  hasEditDBPermission(tableName) {
    return permissionService.canEditTable(tableName);
  }

  isAdmin(user) {
    return user?.isAdmin === true || user?.isAdmin === 1;
  }
  isCurrentUserAdmin() {
    return this.isAdmin(this.getCurrentUser());
  }
}

window.authService = new AuthService();