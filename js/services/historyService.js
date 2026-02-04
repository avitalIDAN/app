class HistoryService {
  constructor() {
    this.HISTORY_PATH = "data/internalDB/history.json";
    this.NAMEHISTORY_PATH = "data/internalDB/namehist.json";
    this.ispull = 0;
    this.ispullname = 0;
    this.allhistory = [];
    this.allnamehistory = []
  }
  
  /* ===== READ ===== */
  async getAllHistory() {
    if (!authService.hasViewDBPermission("history")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }
    if(this.ispull==0){
      this.ispull=1;
      const res = await fetch(this.HISTORY_PATH);
      this.allhistory = res.json();
      this.ispull=1;
    }
    return this.allhistory;
  }

  async getAllNameHistory() {
    if (!authService.hasViewDBPermission("history")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }
    const res = await fetch(this.NAMEHISTORY_PATH);
    return await res.json();
  }

  async getActionName(kodaction) {
    if (!authService.hasViewDBPermission("history")) {
      return "";
      // החזרת שגיאה "אין הרשאה" י
    }
    const actions = await this.getAllNameHistory();
    const found = actions.find(a => a.kodaction === kodaction);
    return found ? found.action : "פעולה לא ידועה";
  }

  async getLastActions(num) {
    if (!authService.hasViewDBPermission("history")) {
      return [];
      // החזרת שגיאה "אין הרשאה" י
    }
    const history = await this.getAllHistory();
    return history.slice(-num).reverse();
  }

  /* ===== CREATE ===== */
  async logAction(oldvalue, newvalue, kodaction) {
    if (!authService.hasEditDBPermission("history")) {
      return;
      // החזרת שגיאה "אין הרשאה" י
    }    
    const username = authService.getCurrentUsername();
    if (!username) return;

    const history = await getAllHistory();
    const actionName = await this.getActionName(kodaction);


    const newRecord = {
      key: history.length,               // זמני
      oldvalue,
      newvalue,
      user: username,
      kodaction,
      action: actionName,
      timestamp: new Date().toISOString()
    };

    history.push(newRecord);
    console.log(newRecord);

    console.warn("⚠️ DB מדומה – הנתון לא נשמר פיזית", newRecord);

    return newRecord;
  }
}

window.historyService = new HistoryService();