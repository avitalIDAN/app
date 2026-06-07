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
    return statusAll.filter(s => s.routeId == routeId);
  }

  async getById(statusId, routeId) {   
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.find(s => (s.statusId == statusId)&&(s.routeId == routeId));
  }

  //לבטל שימוש בשם מטבלאות אחרות ולקשר לפי הID אן מפתח
  async getNameById(statusId, routeId) {
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const status = await this.getById(statusId, routeId);
    return status ? status.name : "";
  }


  // async getByCode(code) {
  //   const statuses = await this.getAll();
  //   return statuses.find(s => s.code === code);
  // }

  async getActive(routeId) {  //מצבים פעילים 
    if (!authService.hasViewDBPermission("statuses")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    return statuses.filter(s => s.isActive&&s.routeId === routeId);
  }

  /// הוספת מצב ומחיקת מחק

  async getNextStatus(statusId, routeId) {   
    if (!authService.hasViewDBPermission("statuses")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }

    const statuses = await this.getAll();
    const thisS = statuses.find(s => (s.statusId == statusId)&&(s.routeId == routeId));
    if (!thisS) return null;

    const nextS = statuses.find(s => s.isActive && (s.routeId == routeId) && (s.orderIndex == (thisS.orderIndex + 1)));
    return nextS || null; //אם NULL - 
  }

  async getByCode(code, routeId) {
    if (!authService.hasViewDBPermission("statuses")) {
      return null;
    }

    const statuses = await this.getAll();
    return statuses.find(s => s.code === code && s.routeId == routeId) || null;
  }

}

window.statusService = new StatusService();
