//import BaseService from "./BaseService.js";

//export default 
class StatusService{ // extends BaseService {
  PATH = "data/internalDB/statuses.json";
//להיות מקושר למסלןל מסןיים - בדיקה

  
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

    async getAllByRoute(routeId) {    
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }
    const statusAll = await this.getAll();
    return statusAll.find(s => s.routeId === routeId);
  }

  async getById(statusId, routeId) {   
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.find(s => (s.statusId === statusId)&&s.routeId === routeId);
  }

  // async getByCode(code) {
  //   const statuses = await this.getAll();
  //   return statuses.find(s => s.code === code);
  // }

  async getActive(routeId) {   
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.filter(s => s.isActive&&s.routeId === routeId);
  }

  /// הוספת מצב ומחיקת מחק
}

window.statusService = new StatusService();
