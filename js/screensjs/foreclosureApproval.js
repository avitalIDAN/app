async function renderForeclosureApproval() {
  const requests = await foreclosureService.getPendingRequests();
  const canEdit = foreclosureService.canEdit("foreclosureApproval");
  const tbody = document.getElementById("foreclosureApprovalTable");
  const signButton = document.querySelector(".foreclosure-signing-bar button");
  if (signButton) signButton.disabled = !canEdit || !requests.length;
  tbody.innerHTML = requests.length ? requests.map(request => `
    <tr><td>${request.requestId}</td><td>${request.foreclosureId}</td><td>${request.caseId}</td><td>${request.actionType}</td><td>${request.bank}</td><td>${Number(request.amount).toLocaleString("he-IL")}</td><td>${request.requestedBy}</td><td>${request.status}</td></tr>`).join("") : `<tr><td colspan="8">אין בקשות שממתינות לחיתום</td></tr>`;
}

async function signAllForeclosureRequests() {
  const signerId = document.getElementById("foreclosureSignerId").value;
  if (!confirm("האם להכין את הקובץ ולחתום על כל הבקשות המוצגות?")) return;
  try {
    const signed = await foreclosureService.signPendingRequests(signerId);
    alert(`החיתום הושלם. ${signed.length} בקשות נחתמו ונשלחו.`);
    renderForeclosureApproval();
  } catch (error) { alert(error.message); }
}

window.renderForeclosureApproval = renderForeclosureApproval;
window.signAllForeclosureRequests = signAllForeclosureRequests;
