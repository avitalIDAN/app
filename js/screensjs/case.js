let data;

async function renderCaseScreen(caseId) {
  data = caseId ? await caseService.getCaseById(caseId) : await caseService.getFirstCase();

  if (!data) {
    document.getElementById("content").innerHTML = "<h3>לא נמצאו תיקים להצגה</h3>";
    return;
  }

  document.getElementById("caseId").innerText = data.caseId;
  document.getElementById("caseStatus").innerText = "מצב נוכחי: " + data.statusName;

  const routeName = await routeService.getNameById(data.routeId);
  document.getElementById("debtorName").innerText = data.idPayer ?? "-";
  document.getElementById("assetName").innerText = data.idAsset ?? "-";
  document.getElementById("groupName").innerText = data.groupId ?? "-";
  document.getElementById("routeName").innerText = routeName || data.routeId;
  document.getElementById("updatedAt").innerText = new Date(data.updatedAt).toLocaleString("he-IL");
  document.getElementById("createdAt").innerText = new Date(data.createdAt).toLocaleString("he-IL");

  const history = await caseService.getCaseWithHistory(data.caseId);
  renderStatusTimeline(history || []);
  await renderCaseAchifaDebts(data.caseId);
}

window.renderCaseScreen = renderCaseScreen;

function renderStatusTimeline(history) {
  const ul = document.getElementById("caseHistory");
  ul.innerHTML = "";

  if (!history.length) {
    ul.innerHTML = "<li>אין היסטוריית מצבים</li>";
    return;
  }

  history.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.statusName} - ${item.statusId}</strong>
      <br/>
      ${new Date(item.changedAt).toLocaleString("he-IL")}
      <br/>
      ע"י ${item.changedBy}
    `;
    ul.appendChild(li);
  });
}

async function renderCaseAchifaDebts(caseId) {
  const tbody = document.getElementById("caseAchifaDebts");
  const totalEl = document.getElementById("caseAchifaDebtTotal");
  const debts = await debtService.getAchifaDebtsByCase(caseId);

  tbody.innerHTML = "";

  if (!debts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">לא נמצאו חובות באכיפה לתיק זה</td>
      </tr>`;
    totalEl.innerText = formatCurrency(data.debt || 0);
    return;
  }

  debts.forEach(debt => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${debt.idhov}</td>
      <td>${debt.idPayer}</td>
      <td>${debt.idAsset}</td>
      <td>${debt.sugHov}</td>
      <td>${debt.year}</td>
      <td>${debt.ribit ? "כן" : "לא"}</td>
      <td>${formatCurrency(debt.sum)}</td>`;

    tbody.appendChild(tr);
  });

  totalEl.innerText = formatCurrency(debtService.sumDebts(debts));
}

async function goToNextCase() {
  const nextCase = await caseService.getNextCase(data.caseId);
  renderCaseScreen(nextCase.caseId);
}

async function goToPrevCase() {
  const prevCase = await caseService.getPreCase(data.caseId);
  renderCaseScreen(prevCase.caseId);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}
