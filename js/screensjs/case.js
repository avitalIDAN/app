let data;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}

function setCaseNavigationEnabled(enabled) {
  const prevBtn = document.getElementById("prevCaseBtn");
  const nextBtn = document.getElementById("nextCaseBtn");

  if (prevBtn) prevBtn.disabled = !enabled;
  if (nextBtn) nextBtn.disabled = !enabled;
}

function renderNoCaseDataPermission() {
  document.getElementById("caseId").innerText = "-";
  document.getElementById("caseStatus").innerText = "אין הרשאה לנתונים";

  document.getElementById("debtorName").innerText = "-";
  document.getElementById("assetName").innerText = "-";
  document.getElementById("groupName").innerText = "-";
  document.getElementById("routeName").innerText = "-";
  document.getElementById("updatedAt").innerText = "-";
  document.getElementById("createdAt").innerText = "-";

  renderStatusTimelineNoPermission();
  renderCaseAchifaDebtsNoPermission();

  setCaseNavigationEnabled(false);
}

async function renderCaseScreen(caseId) {
  const canViewCases = permissionService.canViewTable("cases");

  // אם אין הרשאת צפייה לתיקים, אסור לנסות לטעון תיק.
  // אחרת המסך עלול להציג "לא נמצאו תיקים" במקום הודעת הרשאה.
  if (!canViewCases) {
    renderNoCaseDataPermission();
    return;
  }

  data = caseId
    ? await caseService.getCaseById(caseId)
    : await caseService.getFirstCase();

  if (!data) {
    document.getElementById("content").innerHTML = "<h3>לא נמצאו תיקים להצגה</h3>";
    return;
  }

  setCaseNavigationEnabled(true);

  document.getElementById("caseId").innerText = data.caseId;
  document.getElementById("caseStatus").innerText = "מצב נוכחי: " + (data.statusName || "-");

  const routeName = await routeService.getNameById(data.routeId);

  document.getElementById("debtorName").innerText = data.idPayer ?? "-";
  document.getElementById("assetName").innerText = data.idAsset ?? "-";
  document.getElementById("groupName").innerText = data.groupName || data.groupId || "-";
  document.getElementById("routeName").innerText = routeName || data.routeName || data.routeId || "-";
  document.getElementById("updatedAt").innerText = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString("he-IL")
    : "-";
  document.getElementById("createdAt").innerText = data.createdAt
    ? new Date(data.createdAt).toLocaleString("he-IL")
    : "-";

  await renderCaseStatusHistory(data.caseId);
  await renderCaseAchifaDebts(data.caseId);
}

window.renderCaseScreen = renderCaseScreen;

async function renderCaseStatusHistory(caseId) {
  if (!permissionService.canViewTable("caseStatusHistory")) {
    renderStatusTimelineNoPermission();
    return;
  }

  const history = await caseService.getCaseWithHistory(caseId);
  renderStatusTimeline(history || []);
}

function renderStatusTimelineNoPermission() {
  const ul = document.getElementById("caseHistory");
  ul.innerHTML = "<li>אין הרשאה לנתונים</li>";
}

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
      <strong>${item.statusName || "-"} - ${item.statusId}</strong>
      <br/>
      ${item.changedAt ? new Date(item.changedAt).toLocaleString("he-IL") : "-"}
      <br/>
      ע"י ${item.changedBy || "-"}
    `;

    ul.appendChild(li);
  });
}

function renderCaseAchifaDebtsNoPermission() {
  const tbody = document.getElementById("caseAchifaDebts");
  const totalEl = document.getElementById("caseAchifaDebtTotal");

  tbody.innerHTML = `
    <tr>
      <td colspan="7">אין הרשאה לנתונים</td>
    </tr>
  `;

  totalEl.innerText = "-";
}

async function renderCaseAchifaDebts(caseId) {
  const tbody = document.getElementById("caseAchifaDebts");
  const totalEl = document.getElementById("caseAchifaDebtTotal");

  // חובות אכיפה מוצגים מאזור נפרד, לכן חסימה כאן לא מפילה את כל המסך.
  if (!permissionService.canViewTable("hovachifa")) {
    renderCaseAchifaDebtsNoPermission();
    return;
  }

  const debts = await debtService.getAchifaDebtsByCase(caseId);

  tbody.innerHTML = "";

  if (!debts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">לא נמצאו חובות באכיפה לתיק זה</td>
      </tr>
    `;

    totalEl.innerText = formatCurrency(0);
    return;
  }

  debts.forEach(debt => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${debt.idhov || debt.key || "-"}</td>
      <td>${debt.idPayer || "-"}</td>
      <td>${debt.idAsset || "-"}</td>
      <td>${debt.debtTypeName || debt.debtTypeId || "-"}</td>
      <td>${debt.year || "-"}</td>
      <td>${debt.ribit ? "כן" : "לא"}</td>
      <td>${formatCurrency(debt.sum)}</td>
    `;

    tbody.appendChild(tr);
  });

  totalEl.innerText = formatCurrency(debtService.sumDebts(debts));
}

async function goToNextCase() {
  if (!data || !permissionService.canViewTable("cases")) return;

  const nextCase = await caseService.getNextCase(data.caseId);
  if (nextCase) renderCaseScreen(nextCase.caseId);
}

async function goToPrevCase() {
  if (!data || !permissionService.canViewTable("cases")) return;

  const prevCase = await caseService.getPreCase(data.caseId);
  if (prevCase) renderCaseScreen(prevCase.caseId);
}