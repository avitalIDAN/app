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

  async _getOrderedCases() {
    const cases = await this.getAllCases();

    // מיון ברור ויציב – לפי caseId
    return cases
      .filter(c => c && c.caseId !== undefined)
      .sort((a, b) => a.caseId - b.caseId);
  }

  async getFirstCase() {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
    }

    const cases = await this._getOrderedCases();

    if (!cases.length) return null;

    return cases[0]; // הראשון לפי המיון
  }

  async getNextCase(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
    }

    const cases = await this._getOrderedCases();
    if (!cases.length) return null;

    const index = cases.findIndex(c => c.caseId === caseId);

    // אם לא נמצא – חזרה לראשון
    if (index === -1) {
      return cases[0];
    }

    // מעבר מעגלי קדימה
    const nextIndex = (index + 1) % cases.length;
    return cases[nextIndex];
  }

  async getPreCase(caseId) {
    if (!authService.hasViewDBPermission("cases")) {
      return null;
    }

    const cases = await this._getOrderedCases();
    if (!cases.length) return null;

    const index = cases.findIndex(c => c.caseId === caseId);

    // אם לא נמצא – חזרה לאחרון
    if (index === -1) {
      return cases[cases.length - 1];
    }

    // מעבר מעגלי אחורה
    const prevIndex = (index - 1 + cases.length) % cases.length;
    return cases[prevIndex];
  }


  // async getFirstCase() {
  //   if (!authService.hasViewDBPermission("cases")) {
  //     return null;
  //     // החזרת שגיאה "אין הרשאה" י
  //   }
  //   const casesf = await this.getAllCases();
  //   return casesf.at(-1);//מיון /סינון?
  // }

  // async getPreCase(caseId) {
  //   if (!authService.hasViewDBPermission("cases")) {
  //     return null;
  //     // החזרת שגיאה "אין הרשאה" י
  //   }
  //   const casesf = await this.getAllCases();
  //   return casesf.at(-1);//מיון /סינון?
  // }

  // async getNextCase(caseId) {
  //   if (!authService.hasViewDBPermission("cases")) {
  //     return null;
  //     // החזרת שגיאה "אין הרשאה" י
  //   }
  //   const casesf = await this.getAllCases();
  //   return casesf.at(-1);//מיון /סינון?
  // }

  async getCasesByRoute(routeId) {
    if (!authService.hasViewDBPermission("cases")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }

    const cases = await this.getAllCases();
    return cases.filter(c => c.routeId == routeId); // שניים או שלוש ==
  }

  
async getCasesByStatus(statusId, routeId = null) {
  if (!authService.hasViewDBPermission("cases")) {
    return [];
      // החזרת שגיאה "אין הרשאה" י
  }

  const cases = await this.getAllCases();

  // return cases.filter(c => {
  //   if (c.currentStatusId !== statusId) return false;
  //   if (routeId && c.routeId !== routeId) return false;
  //   return true;
  // });
    return cases.filter(c => (c.routeId == routeId)&&(c.currentStatusId == statusId));
}

// CaseService.js
async getCasesFiltered({ routeId = null, statusId = null } = {}) {
  if (!authService.hasViewDBPermission("cases")) {
    return [];
  }

  const cases = await this.getAllCases();

  return cases.filter(c => {
    if (routeId && c.routeId !== routeId) return false;
    if (statusId && c.currentStatusId !== statusId) return false;
    return true;
  });
}

// async getCasesFiltered({ routeId = null, statusId = null } = {}) {
//   if (!authService.hasViewDBPermission("cases")) {
//     return [];
//   }

//   if(!routeId && !statusId){

//   }
//   else if (!routeId) {
    
//   } else {
    
//   }
// }
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
