// class BaseService {
//   constructor(tableName, idField = "key") {
//     this.tableName = tableName;
//     this.idField = idField;
//   }

//   async getAllRows() {
//     return await localDbService.getAll(this.tableName);
//   }

//   async getRowById(id) {
//     return await localDbService.getById(this.tableName, this.idField, id);
//   }

//   async insertRow(record) {
//     return await localDbService.insert(this.tableName, record, this.idField);
//   }

//   async updateRow(id, changes) {
//     return await localDbService.update(this.tableName, this.idField, id, changes);
//   }

//   async deleteRow(id) {
//     return await localDbService.delete(this.tableName, this.idField, id);
//   }
// }