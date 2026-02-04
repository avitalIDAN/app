// // services/CaseStatusHistoryService.js
// import BaseService from "./BaseService.js";

// export default class CaseStatusHistoryService extends BaseService {
//   PATH_His = "data/internalDB/caseStatusHistory.json";


//   async getAllCasesHis() {
//     return await this.load(this.PATH);
//   }

//   async getByCaseId(caseId) {
//     const history = await this.getAll();
//     return history
//       .filter(h => h.caseId === caseId)
//       .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
//   }

//   async getLastStatus(caseId) {
//     const history = await this.getByCaseId(caseId);
//     return history.at(-1);
//   }


// }

// window.caseStatusHistoryService = new CaseStatusHistoryService();
