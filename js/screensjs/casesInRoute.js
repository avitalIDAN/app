let casesInRoute = [];

async function rendercasesInRouteTable() {
  const routeSelect = document.getElementById("routeSelect");
  const statusSelect = document.getElementById("statusSelect");

  bindCasesInRouteReportButtons();
  setCasesInRouteReportButtonsEnabled(false);
  casesInRoute = [];

  routeSelect.innerHTML = `<option value="">כל המסלולים</option>`;
  statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
  statusSelect.disabled = true;

  // בלי routes אין יכולת לבחור מסלול.
  if (!permissionService.canViewTable("routes")) {
    routeSelect.disabled = true;
    showCasesInRouteNoDataPermission("אין הרשאה לנתוני מסלולים");
    return;
  }

  routeSelect.disabled = false;
  await loadRoutesToSelect();

  routeSelect.onchange = async () => {
    const routeId = routeSelect.value;

    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
    statusSelect.disabled = true;

    if (!routeId) {
      await loadAndRenderCases({});
      return;
    }

    await loadStatusesToSelect(routeId);
    await loadAndRenderCases({ routeId });
  };

  statusSelect.onchange = async () => {
    if (!routeSelect.value) {
      alert("יש לבחור מסלול לפני בחירת מצב");
      statusSelect.value = "";
      return;
    }

    await loadAndRenderCases({
      routeId: routeSelect.value,
      statusId: statusSelect.value || null
    });
  };

  await loadAndRenderCases({});
}

async function loadRoutesToSelect() {
  const routeSelect = document.getElementById("routeSelect");
  const routes = await routeService.getAll();

  routes.forEach(route => {
    routeSelect.innerHTML += `
      <option value="${route.routeId}">
        ${route.routeId} - ${route.name}
      </option>
    `;
  });
}

async function loadStatusesToSelect(routeId) {
  const statusSelect = document.getElementById("statusSelect");

  // אם מצבים חסומים, עדיין אפשר להציג תיקים לפי מסלול,
  // אבל אי אפשר לסנן לפי מצב.
  if (!permissionService.canViewTable("statuses")) {
    statusSelect.disabled = true;
    statusSelect.innerHTML = `<option value="">אין הרשאה למצבים</option>`;
    return;
  }

  const statuses = await statusService.getAllByRoute(routeId);

  statuses.forEach(status => {
    statusSelect.innerHTML += `
      <option value="${status.statusId}">
        ${status.statusName || status.name}
      </option>
    `;
  });

  statusSelect.disabled = false;
}

async function loadAndRenderCases({ routeId = null, statusId = null } = {}) {
  // אם טבלת תיקים חסומה, לא מציגים "לא נמצאו".
  // זו חסימת נתונים, לא מצב של אפס תוצאות.
  if (!permissionService.canViewTable("cases")) {
    casesInRoute = [];
    setCasesInRouteReportButtonsEnabled(false);
    showCasesInRouteNoDataPermission("אין הרשאה לנתוני תיקים");
    return;
  }

  casesInRoute = await caseService.getCasesFiltered({
    routeId,
    statusId
  });

  renderCases(casesInRoute);
}

function renderCases(cases) {
  const tbody = document.getElementById("routeCases");
  tbody.innerHTML = "";

  if (!cases || !cases.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">לא נמצאו תיקים</td>
      </tr>
    `;
    setCasesInRouteReportButtonsEnabled(false);
    return;
  }

  cases.forEach(caseItem => {
    tbody.innerHTML += `
      <tr>
        <td>${caseItem.caseId}</td>
        <td>${caseItem.externalCaseNumber || "-"}</td>
        <td>${caseItem.routeName || caseItem.routeId || "-"}</td>
        <td>${caseItem.statusName || "-"}</td>
        <td>${caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString("he-IL") : "-"}</td>
        <td>${caseItem.updatedAt ? new Date(caseItem.updatedAt).toLocaleDateString("he-IL") : "-"}</td>
      </tr>
    `;
  });

  setCasesInRouteReportButtonsEnabled(true);
}

function showCasesInRouteNoDataPermission(message = "אין הרשאה לנתונים") {
  const tbody = document.getElementById("routeCases");

  tbody.innerHTML = `
    <tr>
      <td colspan="6">${message}</td>
    </tr>
  `;
}

function bindCasesInRouteReportButtons() {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (printBtn) printBtn.onclick = onClickPrintC;
  if (excelBtn) excelBtn.onclick = onClickExcelC;
}

function setCasesInRouteReportButtonsEnabled(enabled) {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (printBtn) printBtn.disabled = !enabled;
  if (excelBtn) excelBtn.disabled = !enabled;
}

function onClickExcelC() {
  if (!permissionService.canViewTable("cases")) {
    alert("אין הרשאה לנתונים");
    return;
  }

  if (!casesInRoute.length) {
    alert("אין נתונים לייצוא");
    return;
  }

  exportToExcel({
    data: casesInRoute,
    headers: [
      "מפתח",
      "מזהה תיק",
      "מספר תיק",
      "קוד מסלול",
      "קוד מצב",
      "שם מצב",
      "תאריך יצירת התיק",
      "תאריך עדכון"
    ],
    fileName: "תיקים במסלול.xlsx",
    sheetName: "casesInRoute"
  });
}

function onClickPrintC() {
  if (!permissionService.canViewTable("cases")) {
    alert("אין הרשאה לנתונים");
    return;
  }

  if (!casesInRoute.length) {
    alert("אין נתונים להדפסה");
    return;
  }

  printTextReport({
    title: "דוח תיקים במסלול",
    summaryText: `
      <div class="report-summary">
        <p><strong>סה״כ תיקים:</strong> ${casesInRoute.length}</p>
      </div>
    `,
    data: casesInRoute,
    renderItem: caseItem => `
      <div class="case-card">
        <h3 class="case-title">תיק #${caseItem.caseId}</h3>
        <div><strong>מספר תיק פנימי:</strong> ${caseItem.caseId}</div>
        <div><strong>מספר חיצוני:</strong> ${caseItem.externalCaseNumber || "-"}</div>
        <div><strong>מסלול:</strong> ${caseItem.routeName || caseItem.routeId || "-"}</div>
        <div><strong>מצב נוכחי:</strong> ${caseItem.statusName || "-"}</div>
        <div><strong>נוצר בתאריך:</strong> ${caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleString("he-IL") : "-"}</div>
        <div><strong>עודכן בתאריך:</strong> ${caseItem.updatedAt ? new Date(caseItem.updatedAt).toLocaleString("he-IL") : "-"}</div>
      </div>
    `
  });
}

window.rendercasesInRouteTable = rendercasesInRouteTable;