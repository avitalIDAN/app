let switchingModesAccess = {
  canViewRoutes: true,
  canViewStatuses: true,
  canViewCases: true,
  canEditCases: true,
  canOpenCaseScreen: true
};

// function getSwitchingModesAccess() {
//   return {
//     canViewRoutes: permissionService.canViewTable("routes"),
//     canViewStatuses: permissionService.canViewTable("statuses"),
//     canViewCases: permissionService.canViewTable("cases"),
//     canEditCases: permissionService.canEditTable("cases"),
//     canOpenCaseScreen: permissionService.canViewScreen("case")
//   };
// }

function getSwitchingModesAccess() {
  const canEditStatusFlow =
    permissionService.canEditScreen("switchingModes") &&
    permissionService.canEditTable("cases") &&
    permissionService.canEditTable("caseStatusHistory");

  return {
    canViewRoutes: permissionService.canViewTable("routes"),
    canViewStatuses: permissionService.canViewTable("statuses"),
    canViewCases: permissionService.canViewTable("cases"),
    canEditCases: canEditStatusFlow,
    canOpenCaseScreen: permissionService.canViewScreen("case")
  };
}

function setBulkChangeEnabled(enabled) {
  const btn = document.getElementById("changeStatusBtn");
  if (btn) btn.disabled = !enabled;
}

function showSwitchingModesNoDataPermission(message = "אין הרשאה לנתונים הנדרשים למסך זה") {
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = `
    <tr>
      <td colspan="7">${message}</td>
    </tr>
  `;
}

async function renderSwitchingModes() {
  switchingModesAccess = getSwitchingModesAccess();

  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");

  statusSelect.disabled = true;
  newStatusSelect.disabled = true;

  // כפתור שינוי גורף נשאר מוצג, אבל נעול אם אין הרשאת עריכת תיקים.
  setBulkChangeEnabled(switchingModesAccess.canEditCases);

  if (!switchingModesAccess.canViewRoutes || !switchingModesAccess.canViewStatuses) {
    routeSelect.disabled = true;
    showSwitchingModesNoDataPermission();
    setBulkChangeEnabled(false);
    return;
  }

  await loadRoutes();

  routeSelect.onchange = async () => {
    resetTable();
    resetStatusSelect();
    resetNewStatusSelect();

    if (!routeSelect.value) return;

    await loadStatuses(routeSelect.value);
    await refreshCases();
  };

  statusSelect.onchange = refreshCases;

  async function loadRoutes() {
    const routes = await routeService.getAll();

    routeSelect.innerHTML = `<option value="">בחר מסלול</option>`;

    routes.forEach(route => {
      routeSelect.innerHTML += `
        <option value="${route.routeId}">
          ${route.routeId} - ${route.name}
        </option>
      `;
    });
  }

  async function loadStatuses(routeId) {
    const statuses = await statusService.getAllByRoute(routeId);

    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
    newStatusSelect.innerHTML = `<option value="">בחר מצב חדש</option>`;

    statuses.forEach(status => {
      const statusName = status.statusName || status.name;

      statusSelect.innerHTML += `
        <option value="${status.statusId}">
          ${statusName}
        </option>
      `;

      newStatusSelect.innerHTML += `
        <option value="${status.statusId}">
          ${statusName}
        </option>
      `;
    });

    statusSelect.disabled = false;
    newStatusSelect.disabled = !switchingModesAccess.canEditCases;
  }

  function resetStatusSelect() {
    statusSelect.innerHTML = `<option value="">בחר מצב</option>`;
    statusSelect.disabled = true;
  }

  function resetNewStatusSelect() {
    newStatusSelect.innerHTML = `<option value="">בחר מצב חדש</option>`;
    newStatusSelect.disabled = true;
  }

  function resetTable() {
    document.getElementById("casesTable").innerHTML = "";
  }

  async function refreshCases() {
    if (!switchingModesAccess.canViewCases) {
      showSwitchingModesNoDataPermission("אין הרשאה לנתוני תיקים");
      return;
    }

    const cases = await caseService.getCasesFiltered({
      routeId: routeSelect.value || null,
      statusId: statusSelect.value || null
    });

    await renderCases(cases);
  }

  async function renderCases(cases) {
    const tbody = document.getElementById("casesTable");
    tbody.innerHTML = "";

    if (!cases.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">לא נמצאו תיקים</td>
        </tr>
      `;
      return;
    }

    for (const caseItem of cases) {
      const routeName = caseItem.routeName || await routeService.getNameById(caseItem.routeId);
      const isClosed = caseItem.isClosed || caseItem.currentStatusId == 0;
      const isExcluded = caseItem.currentStatusId == 5;
      const isFinal = isClosed || isExcluded;

      const canChangeThisCase = switchingModesAccess.canEditCases && !isFinal;
      const canCloseThisCase = switchingModesAccess.canEditCases && !isClosed;
      const canOpenCase = switchingModesAccess.canOpenCaseScreen && switchingModesAccess.canViewCases;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${caseItem.caseId}</td>
        <td>${routeName || caseItem.routeId}</td>
        <td>${caseItem.statusName || "-"}</td>
        <td>
          <button ${canChangeThisCase ? "" : "disabled"} onclick="promote(${caseItem.caseId})">
            קידום למצב
          </button>
        </td>
        <td>
          <button ${canChangeThisCase ? "" : "disabled"} onclick="exclusion(${caseItem.caseId})">
            החרגה
          </button>
        </td>
        <td>
          <button ${canCloseThisCase ? "" : "disabled"} onclick="closeCase(${caseItem.caseId})">
            סגירה
          </button>
        </td>
        <td>
          <button ${canOpenCase ? "" : "disabled"} onclick="toCaseScreen(${caseItem.caseId})">
            הצגת תיק
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    }
  }

  window.refreshSwitchingModesCases = refreshCases;
}

async function promote(caseId) {
  if (
    !permissionService.canEditScreen("switchingModes") ||
    !permissionService.canEditTable("cases") ||
    !permissionService.canEditTable("caseStatusHistory")
  ) {
    alert("אין הרשאה לעדכון תיקים");
    return;
  }

  const caseItem = await caseService.getCaseById(caseId);

  if (!caseItem) {
    alert("תיק לא נמצא");
    return;
  }

  const nextStatus = await statusService.getNextStatus(
    caseItem.currentStatusId,
    caseItem.routeId
  );

  if (!nextStatus) {
    alert("לא נמצא מצב הבא לתיק זה");
    return;
  }

  await caseService.changeCaseStatus(
    caseItem.caseId,
    nextStatus.statusId,
    authService.getCurrentUsername(),
    "קידום למצב הבא"
  );

  await refreshSwitchingModesCases();
}

async function exclusion(caseId) {
  if (
    !permissionService.canEditScreen("switchingModes") ||
    !permissionService.canEditTable("cases") ||
    !permissionService.canEditTable("caseStatusHistory")
  ) {
    alert("אין הרשאה לעדכון תיקים");
    return;
  }

  const caseItem = await caseService.getCaseById(caseId);

  if (!caseItem) {
    alert("תיק לא נמצא");
    return;
  }

  await caseService.changeCaseStatus(
    caseItem.caseId,
    await getExcludedStatusId(caseItem.routeId),
    authService.getCurrentUsername(),
    "החרגת תיק"
  );

  await refreshSwitchingModesCases();
}

async function closeCase(caseId) {
  if (
    !permissionService.canEditScreen("switchingModes") ||
    !permissionService.canEditTable("cases") ||
    !permissionService.canEditTable("caseStatusHistory")
  ) {
    alert("אין הרשאה לעדכון תיקים");
    return;
  }

  const caseItem = await caseService.getCaseById(caseId);

  if (!caseItem) {
    alert("תיק לא נמצא");
    return;
  }

  await caseService.changeCaseStatus(
    caseItem.caseId,
    0,
    authService.getCurrentUsername(),
    "סגירת תיק"
  );

  await refreshSwitchingModesCases();
}

async function getExcludedStatusId(routeId) {
  const excludedStatus = await statusService.getByCode("EXCLUDED", routeId);
  return excludedStatus ? excludedStatus.statusId : 5;
}

async function changeCaseStatus() {
  if (
    !permissionService.canEditScreen("switchingModes") ||
    !permissionService.canEditTable("cases") ||
    !permissionService.canEditTable("caseStatusHistory")
  ) {
    alert("אין הרשאה לעדכון תיקים");
    return;
  }

  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");

  const routeId = routeSelect.value;
  const currentStatusId = statusSelect.value;
  const newStatusId = newStatusSelect.value;

  if (!routeId || !currentStatusId || !newStatusId) {
    alert("יש לבחור מסלול, מצב נוכחי ומצב חדש לפני שינוי");
    return;
  }

  if (currentStatusId === newStatusId) {
    alert("המצב החדש חייב להיות שונה מהמצב הנוכחי");
    return;
  }

  const cases = await caseService.getCasesByStatus(currentStatusId, routeId);

  if (!cases.length) {
    alert("לא נמצאו תיקים מתאימים לשינוי");
    return;
  }

  if (!confirm(`יימשך שינוי מצב ל-${cases.length} תיקים. האם להמשיך?`)) {
    return;
  }

  for (const caseItem of cases) {
    await caseService.changeCaseStatus(
      caseItem.caseId,
      newStatusId,
      authService.getCurrentUsername(),
      "שינוי מצב מרוכז"
    );
  }

  alert(`שינוי מצב בוצע בהצלחה ל-${cases.length} תיקים`);
  await refreshSwitchingModesCases();
}

function toCaseScreen(caseId) {
  if (!permissionService.canViewScreen("case") || !permissionService.canViewTable("cases")) {
    alert("אין הרשאה לצפייה בתיק");
    return;
  }

  fetch("ui/screens/case.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("content").innerHTML = html;
      renderCaseScreen(caseId);
    });
}

window.renderSwitchingModes = renderSwitchingModes;