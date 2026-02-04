// export default class BaseService {
//   async load(path) {
//     const res = await fetch(path);
//     if (!res.ok) throw new Error(`Failed to load ${path}`);
//     return await res.json();
//   }

//   async save(path, data) {
//     // כרגע לקריאה בלבד (JSON סטטי)
//     // בעתיד – POST / PUT לשרת
//     console.warn("SAVE is not implemented yet", path, data);
//   }
// }
