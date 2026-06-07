let routes = [];

async function renderRoutes() {
  
  routes = await routeService.getAll();
  const tbody = document.getElementById("routesTable");
  tbody.innerHTML = "";

  if (!routes.length) {
    tbody.innerHTML = `
      <tr><td colspan="3">לא נמצאו מסלולים</td></tr>`;
    return;
  }

  routes.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.routeId}</td>
        <td>${r.name}</td>
        <td>${r.description ?? ""}</td>
      </tr>`;
  });
  bindRouteReportButtons();
}

window.renderRoutes = renderRoutes;

function bindRouteReportButtons() {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (!printBtn || !excelBtn) return;

  printBtn.onclick = onClickPrint;
  excelBtn.onclick = onClickExcel;
}


function onClickExcel() {
  exportToExcel({
    data: routes,
    headers: ["מפתח","מזהה מסלול", "קוד מסלול", "שם מסלול", "פעיל"],
    fileName: "מסלולים.xlsx",
    sheetName: "Routes"
  });
};

function onClickPrint() {
  printTextReport({
    title: "דוח מסלולים",
    data: routes,
    summaryText: `מספר מסלולים: ${routes.length}`,
    renderItem: r => `
      <div class="record">
        <h2>${r.name} (קוד: ${r.routeId})</h2>
        <p>${r.description ?? ""}</p>
        <div class="divider"></div>
      </div>
    `
  });
};
