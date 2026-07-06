let routes = [];

async function renderRoutes() {
  bindRouteReportButtons();
  setRouteReportButtonsEnabled(false);

  const tbody = document.getElementById("routesTable");
  tbody.innerHTML = "";

  // המסך יכול להיטען, אבל הנתונים עצמם תלויים בהרשאת צפייה לטבלת routes.
  if (!permissionService.canViewTable("routes")) {
    routes = [];
    tbody.innerHTML = `
      <tr>
        <td colspan="3">אין הרשאה לנתונים</td>
      </tr>
    `;
    return;
  }

  routes = await routeService.getAll();

  if (!routes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">לא נמצאו מסלולים</td>
      </tr>
    `;
    return;
  }

  routes.forEach(route => {
    tbody.innerHTML += `
      <tr>
        <td>${route.routeId}</td>
        <td>${route.name}</td>
        <td>${route.description ?? ""}</td>
      </tr>
    `;
  });

  setRouteReportButtonsEnabled(true);
}

window.renderRoutes = renderRoutes;

function bindRouteReportButtons() {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (printBtn) printBtn.onclick = onClickPrint;
  if (excelBtn) excelBtn.onclick = onClickExcel;
}

function setRouteReportButtonsEnabled(enabled) {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (printBtn) printBtn.disabled = !enabled;
  if (excelBtn) excelBtn.disabled = !enabled;
}

function onClickExcel() {
  // בדיקה חוזרת בזמן פעולה, כדי שלא נסתמך רק על מצב הכפתור.
  if (!permissionService.canViewTable("routes")) {
    alert("אין הרשאה לנתונים");
    return;
  }

  if (!routes.length) {
    alert("אין נתונים לייצוא");
    return;
  }

  exportToExcel({
    data: routes,
    headers: ["מפתח", "מזהה מסלול", "קוד מסלול", "שם מסלול", "פעיל"],
    fileName: "מסלולים.xlsx",
    sheetName: "Routes"
  });
}

function onClickPrint() {
  if (!permissionService.canViewTable("routes")) {
    alert("אין הרשאה לנתונים");
    return;
  }

  if (!routes.length) {
    alert("אין נתונים להדפסה");
    return;
  }

  printTextReport({
    title: "דוח מסלולים",
    data: routes,
    summaryText: `מספר מסלולים: ${routes.length}`,
    renderItem: route => `
      <div class="record">
        <h2>${route.name} (קוד: ${route.routeId})</h2>
        <p>${route.description ?? ""}</p>
        <div class="divider"></div>
      </div>
    `
  });
}