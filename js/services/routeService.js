//import BaseService from "./BaseService.js";

//export default 
class RouteService{ // extends BaseService {
  PATH = "data/internalDB/routes.json";

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async getAll() {
    if (!authService.hasViewDBPermission("routes")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    return await this.load(this.PATH);
  }

  async getById(routeId) {
    if (!authService.hasViewDBPermission("routes")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }

    const routes = await this.getAll();
    return routes.find(r => r.routeId === routeId);
  }

  async getActive() {
    if (!authService.hasViewDBPermission("routes")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const routes = await this.getAll();
    return routes.filter(r => r.isActive);
  }

  //הוספת מסלול, שינוי שם וכו
}

window.routeService = new RouteService();
