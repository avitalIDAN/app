async function renderCaseScreen(caseId) {

  const data = caseId? await caseService.getCaseById(caseId):await caseService.getFirstCase();

  document.getElementById("caseId").innerText = data.caseId;
  document.getElementById("caseStatus").innerText = data.currentStatusName;

  const routeName = await routeService.getById(data.routeId);
  document.getElementById("debtorName").innerText = data.debt;
  document.getElementById("routeName").innerText = routeName.name;
  document.getElementById("updatedAt").innerText = new Date(data.updatedAt).toLocaleString("he-IL") ; 
  document.getElementById("createdAt").innerText = new Date(data.createdAt).toLocaleString("he-IL"); 

  const list = document.getElementById("caseHistory");
  list.innerHTML = "";

  const dataH = await caseService.getCaseWithHistory(data.caseId);
  dataH.forEach(h => {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${h.currentStatusName}</b><br>
      <small>${h.changedAt} · ${h.changedBy}</small>
    `;
    list.appendChild(li);
  });
}

window.renderCaseScreen = renderCaseScreen;

function renderStatusTimeline(history) {
  const ul = document.getElementById("statusTimeline");
  ul.innerHTML = "";

  history.forEach(h => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${h.statusName || h.statusId}</strong>
      <br/>
      ${new Date(h.changedAt).toLocaleString()}
      <br/>
      ע"י ${h.changedBy}
    `;
    ul.appendChild(li);
  });
}
