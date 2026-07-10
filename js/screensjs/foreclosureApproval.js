function renderForeclosureApproval() {
  const tbody = document.getElementById("foreclosureApprovalTable");
  const canEdit = permissionService.canEditScreen("foreclosureApproval");

  const requests = (window.demoForeclosureActionRequests || [])
    .filter(request => request.status === "ממתין לחיתום");

  if (!requests.length) {
    tbody.innerHTML = `<tr><td colspan="7">אין בקשות שממתינות לחיתום</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(request => `
    <tr>
      <td>${request.requestId}</td>
      <td>${request.foreclosureId}</td>
      <td>${request.caseId}</td>
      <td>${request.actionType}</td>
      <td>${request.requestedBy}</td>
      <td>${request.status}</td>
      <td>
        <button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="approveForeclosureRequest(${request.requestId})">
          אישור
        </button>
        <button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="rejectForeclosureRequest(${request.requestId})">
          דחייה
        </button>
      </td>
    </tr>
  `).join("");
}

function approveForeclosureRequest(requestId) {
  const request = window.demoForeclosureActionRequests.find(item => item.requestId == requestId);
  if (!request) return;

  const approved = confirm(`האם לאשר את הפעולה "${request.actionType}" לתיק ${request.caseId}?`);
  if (!approved) return;

  request.status = "אושר";
  alert("הבקשה אושרה. בהמשך כאן תתבצע הפעולה בפועל ותיכתב היסטוריה.");
  renderForeclosureApproval();
}

function rejectForeclosureRequest(requestId) {
  const request = window.demoForeclosureActionRequests.find(item => item.requestId == requestId);
  if (!request) return;

  const approved = confirm(`האם לדחות את הבקשה "${request.actionType}"?`);
  if (!approved) return;

  request.status = "נדחה";
  alert("הבקשה נדחתה.");
  renderForeclosureApproval();
}

window.renderForeclosureApproval = renderForeclosureApproval;
window.approveForeclosureRequest = approveForeclosureRequest;
window.rejectForeclosureRequest = rejectForeclosureRequest;