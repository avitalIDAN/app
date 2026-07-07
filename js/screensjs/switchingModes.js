let switchingModesAccess = {
  canViewRoutes: true,
  canViewGroups: true,
  canViewStatuses: true,
  canViewCases: true,
  canEditCases: true,
  canOpenCaseScreen: true
};

let switchingModesCases = [];

function getSwitchingModesAccess() {
  const canEditStatusFlow =
    permissionService.canEditScreen("switchingModes") &&
    permissionService.canEditTable("cases") &&
    permissionService.canEditTable("caseStatusHistory");

  return {
    canViewRoutes: permissionService.canViewTable("routes"),
    canViewGroups: permissionService.canViewTable("groups"),
    canViewStatuses: permissionService.canViewTable("statuses"),
    canViewCases: permissionService.canViewTable("cases"),
    canEditCases: canEditStatusFlow,
    canOpenCaseScreen: permissionService.canViewScreen("case")
  };
}

function showSwitchingModesNoDataPermission(message = "אין הרשאה לנתונים הנדרשים למסך זה") {
  const tbody = document.getElementById("casesTable");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="9">${message}</td>
    </tr>
  `;
}

function setBulkButtonsState() {
  const selectedRows = getSelectedSwitchingCases();
  const selectableCount = document.querySelectorAll(".switching-case-checkbox:not(:disabled)").length;

  const selectedCount = document.getElementById("selectedCasesCount");
  const selectAllBtn = document.getElementById("selectAllCasesBtn");
  const clearBtn = document.getElementById("clearSelectedCasesBtn");
  const changeBtn = document.getElementById("changeStatusBtn");

  if (selectedCount) selectedCount.innerText = selectedRows.length;

  if (selectAllBtn) {
    selectAllBtn.disabled = selectableCount === 0;
  }

  if (clearBtn) {
    clearBtn.disabled = selectedRows.length === 0;
  }

  if (changeBtn) {
    changeBtn.disabled = !switchingModesAccess.canEditCases || selectedRows.length === 0;
  }
}

function resetSwitchingTable(message = "") {
  switchingModesCases = [];

  const tbody = document.getElementById("casesTable");
  if (tbody) {
    tbody.innerHTML = message
      ? `<tr><td colspan="9">${message}</td></tr>`
      : "";
  }

  setBulkButtonsState();
}

async function renderSwitchingModes() {
  switchingModesAccess = getSwitchingModesAccess();

  const routeSelect = document.getElementById("routeFilter");
  const groupSelect = document.getElementById("groupFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");

  groupSelect.disabled = true;
  statusSelect.disabled = true;
  newStatusSelect.disabled = true;

  setBulkButtonsState();

  if (
    !switchingModesAccess.canViewRoutes ||
    !switchingModesAccess.canViewGroups ||
    !switchingModesAccess.canViewStatuses
  ) {
    routeSelect.disabled = true;
    groupSelect.disabled = true;
    statusSelect.disabled = true;
    newStatusSelect.disabled = true;
    showSwitchingModesNoDataPermission();
    return;
  }

  await loadRoutes();
  await loadGroups();

  routeSelect.onchange = handleFiltersChanged;
  groupSelect.onchange = handleFiltersChanged;
  statusSelect.onchange = refreshSwitchingCases;

  // ברירת מחדל לפתיחת המסך:
  // כרגע נבחרים המסלול והקבוצה הראשונים.
  // בהמשך אפשר להחליף את זה לערכים מטבלת פרמטרים או מהעדפות משתמש.
  if (routeSelect.options.length > 1) {
    routeSelect.selectedIndex = 1;
  }

  if (groupSelect.options.length > 1) {
    groupSelect.selectedIndex = 1;
  }

  if (routeSelect.value && groupSelect.value) {
    await handleFiltersChanged();
  }

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

  async function loadGroups() {
    const groups = await debtService.getGroups();

    groupSelect.innerHTML = `<option value="">בחר קבוצה</option>`;

    groups.forEach(group => {
      groupSelect.innerHTML += `
        <option value="${group.groupId}">
          ${group.name}
        </option>
      `;
    });

    groupSelect.disabled = false;
  }

  async function handleFiltersChanged() {
    resetSwitchingTable();

    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
    newStatusSelect.innerHTML = `<option value="">בחר מצב חדש</option>`;
    statusSelect.disabled = true;
    newStatusSelect.disabled = true;

    if (!routeSelect.value || !groupSelect.value) {
      resetSwitchingTable("יש לבחור מסלול וקבוצה");
      return;
    }

    await loadStatuses(routeSelect.value);
    await refreshSwitchingCases();
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

  window.refreshSwitchingModesCases = refreshSwitchingCases;
}

async function refreshSwitchingCases() {
  if (!switchingModesAccess.canViewCases) {
    showSwitchingModesNoDataPermission("אין הרשאה לנתוני תיקים");
    return;
  }

  const routeId = document.getElementById("routeFilter").value;
  const groupId = document.getElementById("groupFilter").value;
  const statusId = document.getElementById("statusFilter").value;

  if (!routeId || !groupId) {
    resetSwitchingTable("יש לבחור מסלול וקבוצה");
    return;
  }

  switchingModesCases = await caseService.getCasesFiltered({
    routeId,
    groupId,
    statusId: statusId || null
  });

  renderSwitchingCasesTable();
}

async function renderSwitchingCasesTable() {
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";

  if (!switchingModesCases.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">לא נמצאו תיקים</td>
      </tr>
    `;
    setBulkButtonsState();
    return;
  }

  for (const caseItem of switchingModesCases) {
    const isClosed = caseItem.isClosed || caseItem.currentStatusId == 0;
    const isExcluded = caseItem.currentStatusId == 5;
    const isFinal = isClosed || isExcluded;

    const canChangeThisCase = switchingModesAccess.canEditCases && !isFinal;
    const canCloseThisCase = switchingModesAccess.canEditCases && !isClosed;
    const canOpenCase = switchingModesAccess.canOpenCaseScreen && switchingModesAccess.canViewCases;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="switching-case-checkbox"
          data-case-id="${caseItem.caseId}"
          ${canChangeThisCase ? "" : "disabled"}
        >
      </td>
      <td>${caseItem.caseId}</td>
      <td>${caseItem.routeName || caseItem.routeId || "-"}</td>
      <td>${caseItem.groupName || caseItem.groupId || "-"}</td>
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

  document.querySelectorAll(".switching-case-checkbox").forEach(input => {
    input.onchange = setBulkButtonsState;
  });

  setBulkButtonsState();
}

function getSelectedSwitchingCases() {
  const selectedIds = [...document.querySelectorAll(".switching-case-checkbox:checked")]
    .map(input => Number(input.dataset.caseId));

  return switchingModesCases.filter(caseItem => selectedIds.includes(Number(caseItem.caseId)));
}

function selectAllSwitchingCases() {
  document.querySelectorAll(".switching-case-checkbox:not(:disabled)").forEach(input => {
    input.checked = true;
  });

  setBulkButtonsState();
}

function clearSelectedSwitchingCases() {
  document.querySelectorAll(".switching-case-checkbox").forEach(input => {
    input.checked = false;
  });

  setBulkButtonsState();
}

function canEditSwitchingModes() {
  return (
    permissionService.canEditScreen("switchingModes") &&
    permissionService.canEditTable("cases") &&
    permissionService.canEditTable("caseStatusHistory")
  );
}

async function promote(caseId) {
  if (!canEditSwitchingModes()) {
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
  if (!canEditSwitchingModes()) {
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
  if (!canEditSwitchingModes()) {
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
  if (!canEditSwitchingModes()) {
    alert("אין הרשאה לעדכון תיקים");
    return;
  }

  const routeId = document.getElementById("routeFilter").value;
  const groupId = document.getElementById("groupFilter").value;
  const currentStatusId = document.getElementById("statusFilter").value;
  const newStatusId = document.getElementById("newStatusSelect").value;

  if (!routeId || !groupId) {
    alert("יש לבחור מסלול וקבוצה לפני ביצוע הפעולה");
    return;
  }

  if (!newStatusId) {
    alert("לא נבחר מצב חדש - לא ניתן לבצע את הפעולה");
    return;
  }

  const selectedCases = getSelectedSwitchingCases();

  if (!selectedCases.length) {
    alert("לא נבחרו תיקים לשינוי");
    return;
  }

  if (currentStatusId === "") {
    const approved = confirm(
      `נבחר מצב נוכחי: כל המצבים. האם להעביר את כל ${selectedCases.length} התיקים המסומנים בכל המצבים למצב החדש?`
    );

    if (!approved) return;
  } else {
    const approved = confirm(
      `האם לשנות מצב ל-${selectedCases.length} תיקים מסומנים?`
    );

    if (!approved) return;
  }

  let changed = 0;
  let failed = 0;

  for (const caseItem of selectedCases) {
    try {
      const result = await caseService.changeCaseStatus(
        caseItem.caseId,
        newStatusId,
        authService.getCurrentUsername(),
        "שינוי מצב מרוכז"
      );

      if (result) {
        changed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error("Failed changing case status", error);
      failed++;
    }
  }

  alert(`שינוי מצב בוצע ל-${changed} תיקים. נכשלו ${failed}.`);
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
window.selectAllSwitchingCases = selectAllSwitchingCases;
window.clearSelectedSwitchingCases = clearSelectedSwitchingCases;
window.changeCaseStatus = changeCaseStatus;