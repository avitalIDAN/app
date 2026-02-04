// services/CaseService.js
//import BaseService from "./BaseService.js";

//export default 
class CaseService{ //extends BaseService {
  PATH = "data/internalDB/cases.json";
  ispull = 0;
  allCases = []; // זמני 

  PATH_His = "data/internalDB/caseStatusHistory.json";
  ispullHis = 0;
  allCasesHis = [];

  async load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  /// היסטוריית תיקים
  async getAllCasesHis() {
    if (!authService.hasViewDBPermission("cases")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    if(this.ispullHis==0){
      this.allCasesHis = await this.load(this.PATH_His);;
      this.ispullHis=1;
    }
    return this.allCasesHis;

    // return await this.load(this.PATH);
  }
  
  async getHisByCaseId(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }
    const history = await this.getAllCasesHis();
    return history
      .filter(h => h.caseId === caseId)
      .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
  }

  async getLastStatusHis(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }
    const history = await this.getHisByCaseId(caseId);
    return history.at(-1);
  }

  //add to his
  async addToStatusHis(caseOld) {
    if (!authService.hasEditDBPermission("cases")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }
    if(this.ispullHis==0){
      this.getAllCasesHis();
    }
    this.allCasesHis.push(caseOld); // זמני
  }

  /////תיקים

  async getAllCases() {
    if (!authService.hasViewDBPermission("cases")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    if(this.ispull==0){
      this.allCases = await this.load(this.PATH);;
      this.ispull=1;
    }
    return this.allCases;

    // return await this.load(this.PATH);
  }

  async getNumCases() {
    if (!authService.hasViewDBPermission("cases")) {
      return 0;
      // החזרת שגיאה "אין הרשאה" י
    }
    const cases = await this.getAllCases();
    return cases.length;
  }

   async getNumActiveCases() {
    if (!authService.hasViewDBPermission("cases")) {
      return 0;
      // החזרת שגיאה "אין הרשאה" י
    }
    const cases = await this.getAllCases();
    return cases.filter(c => c.currentStatusId === 0).length;
  }

  async getNumClosedCases() {
    if (!authService.hasViewDBPermission("cases")) {
      return 0;
      // החזרת שגיאה "אין הרשאה" י
    }
    const cases = await this.getAllCases();
    return cases.filter(c => c.currentStatusId != 0).length;
  }

  async getCaseById(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }
    const cases = await this.getAllCases();
    return cases.find(c => c.caseId === caseId);
  }

  async getFirstCase() {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
      // החזרת שגיאה "אין הרשאה" י
    }
    const casesf = await this.getAllCases();
    return casesf.at(-1);//מיון /סינון?
  }

  async getCasesByRoute(routeId) {
    if (!authService.hasViewDBPermission("cases")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const cases = await this.getAllCases();
    return cases.filter(c => c.routeId == routeId); // שניים או שלוש ==
  }

  async getCaseWithHistory(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return [];  // או NULL
      // החזרת שגיאה "אין הרשאה" י
    }
// לבדוק אם תיק קיים- פונקציה לבדיקה
    const caseData = await this.getCaseById(caseId);
    if (!caseData) return null; // תיק לא קיים

    const history = await this.getHisByCaseId(caseId);

    return history;
  }

  async changeCaseStatus(caseId, newStatusId, changedBy, note = "") {
    if (!authService.hasEditDBPermission("cases")) {
      return;
      // החזרת שגיאה "אין הרשאה" י
    }

    const cases = await this.getAllCases();
    const caseItem = cases.find(c => c.caseId === caseId);
    if (!caseItem) throw new Error("Case not found");
    const routeId = caseItem.routeId;

    caseItem.currentStatusId = newStatusId;
    caseItem.updatedAt = new Date().toISOString();

    // הוספת היסטוריה
    const history = await this.getAllCasesHis();

    addToStatusHis.push({
      key: history.length + 1,
      historyId: history.length + 1,
      caseId,
      routeId,
      statusId: newStatusId,
      changedAt: new Date().toISOString(),
      changedBy,
      note
    });

    console.log("STATUS CHANGED (mock):", caseItem);
  }
}

window.caseService = new CaseService();
