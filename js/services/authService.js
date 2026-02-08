class AuthService {
  constructor() {
    this.USERS_PATH = "data/internalDB/users.json";
    this.users = [
        { "key":1, "username": "admin", "password": "qwe12!", "screens": {"dashboard":1,"history":1,"case":1,"cases":1,"routes":1, "switchingModes": 1, "allCases": 1, "statusesInRoute": 1, "casesInRoute":1}, "db": {"history":1,"cases":1,"routes":1, "statuses": 1} },
        // , "report":1
        { "key":0, "username": "user1", "password": "1111", "screens": {"dashboard":1,"history":1, "cases":0,"routes":null}, "db": {"history":1,"cases":0,"routes":null} }
    ]; 
  }

  /* ========= PRIVATE HELPERS ========= */

  #getAllUsers() {
    return this.users;
  }

  #getUserByUsername(username) {
    const users = this.#getAllUsers();
    return users.find(u => u.username === username) || null;
  }


  #setCookie(username) {
    localStorage.setItem("currentUser", username);
  }

  #clearCookie() {
    localStorage.removeItem("currentUser");
  }

  #getUsernameFromCookie() {
    return localStorage.getItem("currentUser");
  }

  #getCurrentUser() {
    const username = this.#getUsernameFromCookie();
    if (!username) return null;

    return this.#getUserByUsername(username);
  }

  getCurrentUser() { //??
    const username = this.#getUsernameFromCookie();
    if (!username) return null;

    return this.#getUserByUsername(username);
  }

  /* ========= PUBLIC API ========= */

  login(username, password) {
    const user = this.#getUserByUsername(username);

    if (!user || user.password !== password) {
      return false;
    }

    this.#setCookie(username);
    return true;
  }

  logout() {
    this.#clearCookie();
  }

   getCurrentUsername() {// הוספת בדיקה ןהחזרת NULL
    const x = this.#getUsernameFromCookie();
    return x;
  }

  isLoggedIn() {
    return (this.#getCurrentUser()) !== null;
  }

  hasViewPermission(screenName) {
    const user = this.#getCurrentUser();
    if (!user) return false;

    const perm = user.screens[screenName] ?? null;
    return perm === 0 || perm === 1;
  }

  hasEditPermission(screenName) {
    const user = this.#getCurrentUser();
    if (!user) return false;

    return user.screens[screenName] === 1;
  }

  hasViewDBPermission(DBName) {
    const user = this.#getCurrentUser();
    if (!user) return false;

    const perm = user.db[DBName] ?? null;
    return perm === 0 || perm === 1;
  }

  hasEditDBPermission(DBName) {
    const user = this.#getCurrentUser();
    if (!user) return false;

    return user.db[DBName] === 1;
  }
}

window.authService = new AuthService();