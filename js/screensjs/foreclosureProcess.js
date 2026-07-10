const demoForeclosureFiles = [
  { foreclosureId: 1, caseId: 1001, idPayer: 1, statusName: "ממתין ליצירת עיקול" },
  { foreclosureId: 2, caseId: 1002, idPayer: 2, statusName: "עיקול פעיל" },
  { foreclosureId: 3, caseId: 1003, idPayer: 3, statusName: "ממתין למימוש" }
];

window.demoForeclosureActionRequests = window.demoForeclosureActionRequests || [
  { requestId: 1, foreclosureId: 2, caseId: 1002, actionType: "ביטול עיקול", requestedBy: "admin", status: "ממתין לחיתום" }
];

function renderForeclosureProcess() {
  const tbody = document.getElementById("foreclosureProcessTable");
  const canEdit = permissionService.canEditScreen("foreclosureProcess");

  tbody.innerHTML = demoForeclosureFiles.map(item => `
    <tr>
      <td>${item.foreclosureId}</td>
      <td>${item.caseId}</td>
      <td>${item.idPayer}</td>
      <td>${item.statusName}</td>
      <td>
        <button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="createForeclosureRequest(${item.foreclosureId}, ${item.caseId}, 'יצירת עיקול')">
          יצירת עיקול
        </button>
        <button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="createForeclosureRequest(${item.foreclosureId}, ${item.caseId}, 'ביטול עיקול')">
          ביטול עיקול
        </button>
        <button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="createForeclosureRequest(${item.foreclosureId}, ${item.caseId}, 'מימוש עיקול')">
          מימוש עיקול
        </button>
      </td>
    </tr>
  `).join("");
}

function createForeclosureRequest(foreclosureId, caseId, actionType) {
  const approved = confirm(`האם ליצור בקשת פעולה מסוג "${actionType}" לתיק ${caseId}?`);

  if (!approved) return;

  const nextId = window.demoForeclosureActionRequests.length + 1;

  window.demoForeclosureActionRequests.push({
    requestId: nextId,
    foreclosureId,
    caseId,
    actionType,
    requestedBy: authService.getCurrentUsername(),
    status: "ממתין לחיתום"
  });

  alert(`נוצרה בקשת פעולה מספר ${nextId}. הבקשה ממתינה לחיתום.`);
}

window.renderForeclosureProcess = renderForeclosureProcess;
window.createForeclosureRequest = createForeclosureRequest;