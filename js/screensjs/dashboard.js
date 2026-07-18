async function renderDashboard() {
  await renderCaseStats();
  await renderRecentActivity();
}

async function renderCaseStats() {
  const totalCasesEl = document.getElementById("totalCases");
  const activeCasesEl = document.getElementById("casesInProcess");
  const closedCasesEl = document.getElementById("closedCases");

  // אם המשתמש חסום מטבלת תיקים, לא מציגים 0 כדי לא להטעות.
  if (!permissionService.canViewTable("cases")) {
    totalCasesEl.innerText = "אין הרשאה";
    activeCasesEl.innerText = "אין הרשאה";
    closedCasesEl.innerText = "אין הרשאה";
    return;
  }

  totalCasesEl.innerText = await caseService.getNumCases();
  activeCasesEl.innerText = await caseService.getNumActiveCases();
  closedCasesEl.innerText = await caseService.getNumClosedCases();
}

async function renderRecentActivity() {
  const tbody = document
    .getElementById("recentCases")
    .querySelector("tbody");

  tbody.innerHTML = "";

  // פעילות אחרונה נשענת על טבלת history.
  // אם אין הרשאה, מציגים הודעה ולא טבלה ריקה.
  if (!permissionService.canViewTable("history")) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">אין הרשאה לנתונים</td>
      </tr>
    `;
    return;
  }
  const lastActions = await historyService.getLastPrimaryActions(5);
  // const lastActions = await historyService.getLastActions(5);

  if (!lastActions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">לא נמצאו פעולות</td>
      </tr>
    `;
    return;
  }

  lastActions.forEach(h => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${h.description || h.actionName || "-"}</td>
      <td>${h.username || "-"}</td>
      <td>${h.beforeText || "-"}</td>
      <td>${h.afterText || "-"}</td>
      <td>${h.actionDate ? new Date(h.actionDate).toLocaleString("he-IL") : "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}