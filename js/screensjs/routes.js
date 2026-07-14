let routes = [];

function getRoutesScreenAccess() {
  return {
    canViewRoutes: permissionService.canViewTable("routes"),
    canEditRoutes:
      permissionService.canEditScreen("routes") &&
      permissionService.canEditTable("routes")
  };
}

async function renderRoutes() {
  bindRouteReportButtons();
  setRouteReportButtonsEnabled(false);

  const access = getRoutesScreenAccess();
  const tbody = document.getElementById("routesTable");
  const addBtn = document.getElementById("addRouteBtn");
  const codeInput = document.getElementById("routeCodeInput");
  const nameInput = document.getElementById("routeNameInput");
  const descriptionInput = document.getElementById("routeDescriptionInput");

  addBtn.disabled = !access.canEditRoutes;
  codeInput.disabled = !access.canEditRoutes;
  nameInput.disabled = !access.canEditRoutes;
  descriptionInput.disabled = !access.canEditRoutes;

  if (!access.canViewRoutes) {
    routes = [];
    tbody.innerHTML = `
      <tr>
        <td colspan="6">אין הרשאה לנתונים</td>
      </tr>
    `;
    return;
  }

  routes = await routeService.getAll();
  renderRoutesTable();

  setRouteReportButtonsEnabled(routes.length > 0);
}

function renderRoutesTable() {
  const access = getRoutesScreenAccess();
  const tbody = document.getElementById("routesTable");
  tbody.innerHTML = "";

  if (!routes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">לא נמצאו מסלולים</td>
      </tr>
    `;
    return;
  }

  routes.forEach(route => {
    tbody.innerHTML += `
      <tr>
        <td>${route.routeId}</td>
        <td>${route.code || ""}</td>
        <td>${route.name || ""}</td>
        <td>${route.description || ""}</td>
        <td>${route.isActive === false ? "לא" : "כן"}</td>
        <td>
          <button class="btn btn--primary" ${access.canEditRoutes ? "" : "disabled"} onclick="editRoute(${route.routeId})">
            עריכה
          </button>
          <button class="btn btn--primary" ${access.canEditRoutes ? "" : "disabled"} onclick="toggleRouteActive(${route.routeId})">
            ${route.isActive === false ? "הפעלה" : "השבתה"}
          </button>
        </td>
      </tr>
    `;
  });
}

async function addRoute() {
  const access = getRoutesScreenAccess();

  if (!access.canEditRoutes) {
    alert("אין הרשאה להוספת מסלולים");
    return;
  }

  const codeInput = document.getElementById("routeCodeInput");
  const nameInput = document.getElementById("routeNameInput");
  const descriptionInput = document.getElementById("routeDescriptionInput");

  const code = codeInput.value.trim();
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!code || !name) {
    alert("יש להזין קוד מסלול ושם מסלול");
    return;
  }

  const duplicate = routes.some(route =>
    String(route.code || "").toLowerCase() === code.toLowerCase()
  );

  if (duplicate) {
    alert("כבר קיים מסלול עם קוד זה");
    return;
  }

  await routeService.createRoute({
    code,
    name,
    description,
    isActive: true
  });

  codeInput.value = "";
  nameInput.value = "";
  descriptionInput.value = "";

  await renderRoutes();
}

async function editRoute(routeId) {
  const access = getRoutesScreenAccess();

  if (!access.canEditRoutes) {
    alert("אין הרשאה לעריכת מסלולים");
    return;
  }

  const route = routes.find(item => item.routeId == routeId);
  if (!route) return;

  const newCode = prompt("קוד מסלול", route.code || "");
  if (newCode === null) return;

  const newName = prompt("שם מסלול", route.name || "");
  if (newName === null) return;

  const newDescription = prompt("תיאור", route.description || "");
  if (newDescription === null) return;

  const code = newCode.trim();
  const name = newName.trim();
  const description = newDescription.trim();

  if (!code || !name) {
    alert("קוד מסלול ושם מסלול לא יכולים להיות ריקים");
    return;
  }

  const duplicate = routes.some(item =>
    item.routeId != routeId &&
    String(item.code || "").toLowerCase() === code.toLowerCase()
  );

  if (duplicate) {
    alert("כבר קיים מסלול אחר עם קוד זה");
    return;
  }

  await routeService.updateRoute(routeId, {
    code,
    name,
    description
  });

  await renderRoutes();
}

async function toggleRouteActive(routeId) {
  const access = getRoutesScreenAccess();

  if (!access.canEditRoutes) {
    alert("אין הרשאה לעריכת מסלולים");
    return;
  }

  const route = routes.find(item => item.routeId == routeId);
  if (!route) return;

  const nextIsActive = route.isActive === false;

  const approved = confirm(
    nextIsActive
      ? `האם להפעיל את המסלול "${route.name}"?`
      : `האם להשבית את המסלול "${route.name}"?`
  );

  if (!approved) return;

  await routeService.updateRoute(routeId, {
    isActive: nextIsActive
  });

  await renderRoutes();
}

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
    headers: ["מפתח", "מזהה מסלול", "קוד מסלול", "שם מסלול", "תיאור", "פעיל"],
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
        <h2>${route.name} (${route.code || route.routeId})</h2>
        <p>${route.description || ""}</p>
        <p>פעיל: ${route.isActive === false ? "לא" : "כן"}</p>
        <div class="divider"></div>
      </div>
    `
  });
}

window.renderRoutes = renderRoutes;
window.addRoute = addRoute;
window.editRoute = editRoute;
window.toggleRouteActive = toggleRouteActive;