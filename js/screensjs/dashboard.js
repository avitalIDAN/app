async function renderDashboard() {
  // --- 1. שליפת נתונים ---
  const lastActions = await historyService.getLastActions(5);

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

    tbody.appendChild(tr);
  });
}
