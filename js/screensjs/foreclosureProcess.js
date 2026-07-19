let selectedForeclosureAction = null;

async function renderForeclosureProcess() {
  const [rows, requests] = await Promise.all([
    foreclosureService.getForeclosureCases(), localDbService.getAll("foreclosureRequests")
  ]);
  const canEdit = foreclosureService.canEdit("foreclosureProcess");
  const tbody = document.getElementById("foreclosureProcessTable");
  tbody.innerHTML = rows.length ? rows.map(item => {
    const actions = foreclosureService.getAvailableActions(item, requests);
    const pending = requests.find(request => request.foreclosureId == item.foreclosureId && request.status === "ממתין לחיתום");
    const actionHtml = pending ? `<span>ממתין לחיתום</span> <button class="btn btn--secondary" ${canEdit ? "" : "disabled"} onclick="beginForeclosureRequest(${item.foreclosureId}, '${pending.actionType}')">שכפול לבנק</button>` : actions.length ? actions.map(action =>
      `<button class="btn btn--destructive" ${canEdit ? "" : "disabled"} onclick="beginForeclosureRequest(${item.foreclosureId}, '${action}')">${action}</button>`).join(" ") : `<span>אין פעולה זמינה</span>`;
    return `<tr><td>${item.foreclosureId}</td><td>${item.caseId}</td><td>${item.clientNumber || item.caseData?.idPayer || ""}</td><td>${item.status}</td><td>${actionHtml}</td></tr>`;
  }).join("") : `<tr><td colspan="5">לא נמצאו תיקי עיקול</td></tr>`;
}

async function beginForeclosureRequest(foreclosureId, actionType) {
  const foreclosures = await foreclosureService.getForeclosureCases();
  const foreclosure = foreclosures.find(item => item.foreclosureId == foreclosureId);
  if (!foreclosure) return;
  selectedForeclosureAction = { foreclosureId, actionType };
  document.getElementById("foreclosureRequestTitle").textContent = actionType;
  document.getElementById("foreclosureRequestCase").textContent = `תיק עיקול ${foreclosureId} | תיק ${foreclosure.caseId} | ${foreclosure.clientNumber}`;
  document.getElementById("foreclosureBank").value = "";
  document.getElementById("foreclosureAmount").value = "";
  document.getElementById("foreclosureRequestPanel").hidden = false;
}

async function submitForeclosureRequest() {
  if (!selectedForeclosureAction) return;
  try {
    await foreclosureService.createRequest({ ...selectedForeclosureAction, bank: document.getElementById("foreclosureBank").value, amount: document.getElementById("foreclosureAmount").value });
    closeForeclosureRequestPanel();
    alert("נוספה שורה לחיתום הבא.");
    renderForeclosureProcess();
  } catch (error) { alert(error.message); }
}

function closeForeclosureRequestPanel() {
  selectedForeclosureAction = null;
  document.getElementById("foreclosureRequestPanel").hidden = true;
}

window.renderForeclosureProcess = renderForeclosureProcess;
window.beginForeclosureRequest = beginForeclosureRequest;
window.submitForeclosureRequest = submitForeclosureRequest;
window.closeForeclosureRequestPanel = closeForeclosureRequestPanel;
