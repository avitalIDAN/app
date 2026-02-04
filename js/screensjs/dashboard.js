async function renderDashboard() {
  // --- 1. שליפת נתונים ---
//   const history = await historyService.getAllHistory();
  const lastActions = await historyService.getLastActions(5);

  // // --- 2. כרטיסי סטטיסטיקה ---
  // document.getElementById("totalCases").innerText = history.length;

  // document.getElementById("casesInProcess").innerText =
  //   history.filter(h => h.kodaction !== 3).length; // דוגמה

  // document.getElementById("closedCases").innerText =
  //   history.filter(h => h.kodaction === 3).length;

    // --- 2. כרטיסי סטטיסטיקה ---
  document.getElementById("totalCases").innerText = await window.caseService.getNumCases();

  document.getElementById("casesInProcess").innerText = await window.caseService.getNumActiveCases();

  document.getElementById("closedCases").innerText = await window.caseService.getNumClosedCases();

  // --- 3. טבלת פעילות אחרונה ---
  const tbody = document
    .getElementById("recentCases")
    .querySelector("tbody");

  tbody.innerHTML = "";

  lastActions.forEach(h => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${h.action}</td>
      <td>${h.user}</td>
      <td>${h.newvalue ?? "-"}</td>  
      <td>${h.oldvalue ?? "-"}</td>  
      <td>${new Date(h.timestamp).toLocaleString("he-IL")}</td>      
    `;
  //   <td>${formatDate(h.timestamp)}</td>
    tbody.appendChild(tr);
  });
}
