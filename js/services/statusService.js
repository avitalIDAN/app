//import BaseService from "./BaseService.js";

//export default 
class StatusService{ // extends BaseService {
  PATH = "data/internalDB/statuses.json";

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async getAll() {    
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    return await this.load(this.PATH);
  }

  async getById(statusId) {   
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.find(s => s.statusId === statusId);
  }

  // async getByCode(code) {
  //   const statuses = await this.getAll();
  //   return statuses.find(s => s.code === code);
  // }

  async getActive() {   
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.filter(s => s.isActive);
  }

  /// הוספת מצב ומחיקת מחק
}

window.statusService = new StatusService();
