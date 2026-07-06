let caseBuilderRows = [];
let caseBuilderAccess = {
  canViewBaseData: true,
  canViewCases: true,
  canViewAchifa: true,
  canCreateCase: true
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}

function showCaseBuilderNoDataPermission(message = "אין הרשאה לנתונים הנדרשים למסך זה") {
  const tbody = document.getElementById("casesTable");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="12">${message}</td>
    </tr>
  `;
}

function getCaseBuilderAccess() {
  const baseTables = ["hovgvia", "debtTypes", "debtTypeGroups", "groups", "routes"];
  const blockedBaseTables = permissionService.getBlockedTables(baseTables, "view");

  const canViewCases = permissionService.canViewTable("cases");
  const canViewAchifa = permissionService.canViewTable("hovachifa");

  const canCreateCase =
    canViewCases &&
    canViewAchifa &&
    permissionService.canEditTable("cases") &&
    permissionService.canEditTable("hovachifa");

  return {
    canViewBaseData: blockedBaseTables.length === 0,
    blockedBaseTables,
    canViewCases,
    canViewAchifa,
    canCreateCase
  };
}

function getCaseAction(row) {
  if (!caseBuilderAccess.canViewCases) {
    return {
      code: "BLOCKED",
      label: "פעולה חסומה",
      enabled: false,
      reason: "אין הרשאה לנתוני תיקים"
    };
  }

  if (!caseBuilderAccess.canViewAchifa) {
    return {
      code: "BLOCKED",
      label: "פעולה חסומה",
      enabled: false,
      reason: "אין הרשאה לנתוני אכיפה"
    };
  }

  if (!row.caseInfo.hasCase) {
    return {
      code: "CREATE_CASE",
      label: "הקמת תיק",
      enabled: caseBuilderAccess.canCreateCase,
      reason: "לא קיים תיק"
    };
  }

  if (row.caseInfo.freezeMode === "DELTA_ONLY") {
    return {
      code: "CREATE_DELTA",
      label: "תיק דלתא",
      enabled: false,
      reason: "תיקי דלתא עדיין לתצוגה בלבד"
    };
  }

  if (row.gap !== 0) {
    return {
      code: "UPDATE_DEBT",
      label: "עדכון חוב",
      enabled: false,
      reason: "עדכון חוב עדיין לתצוגה בלבד"
    };
  }

  return {
    code: "NONE",
    label: "",
    enabled: false,
    reason: "אין שינוי"
  };
}

function getReason(row) {
  return getCaseAction(row).reason;
}

function getActionHtml(row) {
  const action = getCaseAction(row);

  if (action.code === "CREATE_CASE") {
    return `
      <button ${action.enabled ? "" : "disabled"} onclick="createCaseFromBuilderRow('${row.rowId}')">
        ${action.label}
      </button>
    `;
  }

  if (!action.label) {
    return `<span>—</span>`;
  }

  return `<button disabled>${action.label}</button>`;
}

function renderCheckboxList(container, items, getValue, getLabel) {
  if (!container) return;

  container.innerHTML = items.map(item => `
    <label>
      <input type="checkbox" value="${getValue(item)}">
      ${getLabel(item)}
    </label>
  `).join("");
}

async function loadCaseBuilderFilters() {
  const routeSelect = document.getElementById("routeFilter");
  const groupSelect = document.getElementById("groupFilter");
  const cutDebtTypes = document.getElementById("cutDebtTypes");

  const [routes, groups, debtTypes] = await Promise.all([
    routeService.getActive(),
    debtService.getGroups(),
    debtService.getDebtTypes()
  ]);

  routeSelect.innerHTML = "";
  routes.forEach(route => {
    routeSelect.innerHTML += `
      <option value="${route.routeId}">
        ${route.name}
      </option>
    `;
  });

  groupSelect.innerHTML = `<option value="">כל הקבוצות</option>`;
  groups.forEach(group => {
    groupSelect.innerHTML += `
      <option value="${group.groupId}">
        ${group.name}
      </option>
    `;
  });

  renderCheckboxList(
    cutDebtTypes,
    debtTypes,
    type => type.debtTypeId,
    type => type.name
  );
}

async function enrichRowsWithCaseInfo(rows) {
  if (!caseBuilderAccess.canViewCases) {
    return rows.map(row => ({
      ...row,
      rowId: debtService.buildRowKey(row),
      caseInfo: {
        hasCase: null,
        caseId: null,
        statusName: "אין הרשאה לנתונים",
        freezeMode: null
      }
    }));
  }

  const cases = await caseService.getAllCases();

  return rows.map(row => {
    const existingCase = cases.find(c =>
      c.idPayer == row.idPayer &&
      c.idAsset == row.idAsset &&
      c.routeId == row.routeId &&
      c.groupId == row.groupId &&
      !c.parentCaseId
    );

    return {
      ...row,
      rowId: debtService.buildRowKey(row),
      caseInfo: existingCase
        ? {
            hasCase: true,
            caseId: existingCase.caseId,
            statusName: existingCase.statusName,
            freezeMode: existingCase.freezeMode
          }
        : {
            hasCase: false,
            caseId: null,
            statusName: "אין תיק",
            freezeMode: null
          }
    };
  });
}

function isCutModeEnabled() {
  return Boolean(document.getElementById("cutModeToggle")?.checked);
}

function syncCutModeUi() {
  const isCutMode = isCutModeEnabled();
  const panel = document.getElementById("cutModePanel");
  const groupSelect = document.getElementById("groupFilter");

  if (panel) panel.classList.toggle("cut-panel--hidden", !isCutMode);
  if (groupSelect) groupSelect.disabled = isCutMode;
}

async function loadCaseBuilderRows() {
  caseBuilderAccess = getCaseBuilderAccess();

  if (!caseBuilderAccess.canViewBaseData) {
    caseBuilderRows = [];
    showCaseBuilderNoDataPermission();
    return;
  }

  const routeId = document.getElementById("routeFilter").value;
  const groupId = isCutModeEnabled() ? "" : document.getElementById("groupFilter").value;
  const idPayer = document.getElementById("payerFilter").value;
  const idAsset = document.getElementById("assetFilter").value;

  if (!routeId) {
    caseBuilderRows = [];
    renderCaseBuilderTable();
    return;
  }

  const rows = await debtService.getCaseBuilderRows({
    routeId,
    groupId,
    idPayer,
    idAsset
  });

  caseBuilderRows = await enrichRowsWithCaseInfo(rows);
  renderCaseBuilderTable();
}

async function renderCasesBuilder() {
  caseBuilderAccess = getCaseBuilderAccess();

  if (!caseBuilderAccess.canViewBaseData) {
    showCaseBuilderNoDataPermission();
    return;
  }

  await loadCaseBuilderFilters();

  document.getElementById("routeFilter").onchange = loadCaseBuilderRows;
  document.getElementById("groupFilter").onchange = loadCaseBuilderRows;
  document.getElementById("payerFilter").oninput = loadCaseBuilderRows;
  document.getElementById("assetFilter").oninput = loadCaseBuilderRows;
  document.getElementById("refreshBtn").onclick = loadCaseBuilderRows;

  const cutModeToggle = document.getElementById("cutModeToggle");
  if (cutModeToggle) {
    cutModeToggle.onchange = async () => {
      syncCutModeUi();
      await loadCaseBuilderRows();
    };
  }

  syncCutModeUi();
  await loadCaseBuilderRows();
}

function renderCaseBuilderTable() {
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";

  if (!caseBuilderRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12">לא נמצאו נתונים</td>
      </tr>
    `;
    updateBulkActionsState();
    updateActionCounters();
    return;
  }

  caseBuilderRows.forEach(row => {
    const action = getCaseAction(row);
    const canSelect = action.code === "CREATE_CASE" && action.enabled;

    tbody.innerHTML += `
      <tr>
        <td>
          <input
            type="checkbox"
            class="case-builder-checkbox"
            data-row-id="${row.rowId}"
            ${canSelect ? "" : "disabled"}
          >
        </td>
        <td>${row.idPayer}</td>
        <td>${row.idAsset}</td>
        <td>${row.groupName}</td>
        <td>${row.debtsCount}</td>
        <td ondblclick="showDebtDetails('${row.rowId}', 'gvia')">${formatCurrency(row.gviaDebt)}</td>
        <td ondblclick="showDebtDetails('${row.rowId}', 'achifa')">
          ${caseBuilderAccess.canViewAchifa ? formatCurrency(row.achifaDebt) : "אין הרשאה"}
        </td>
        <td>${caseBuilderAccess.canViewAchifa ? formatCurrency(row.gap) : "אין הרשאה"}</td>
        <td>${row.caseInfo.caseId || ""}</td>
        <td>${row.caseInfo.statusName}</td>
        <td>${getReason(row)}</td>
        <td>${getActionHtml(row)}</td>
      </tr>
    `;
  });

  document.querySelectorAll(".case-builder-checkbox").forEach(input => {
    input.onchange = updateBulkActionsState;
  });

  updateBulkActionsState();
  updateActionCounters();
}

function getSelectedCreateRows() {
  const selectedIds = [...document.querySelectorAll(".case-builder-checkbox:checked")]
    .map(input => input.dataset.rowId);

  return caseBuilderRows.filter(row =>
    selectedIds.includes(row.rowId) &&
    getCaseAction(row).code === "CREATE_CASE" &&
    getCaseAction(row).enabled
  );
}

function updateBulkActionsState() {
  const button = document.getElementById("bulkCreateCasesBtn");
  const selectAllButton = document.getElementById("selectAllCreateRowsBtn");
  const clearButton = document.getElementById("clearSelectedRowsBtn");
  const selectedCount = document.getElementById("selectedRowsCount");
  if (!button || !selectedCount) return;

  const selectedRows = getSelectedCreateRows();
  const selectableCount = document.querySelectorAll(".case-builder-checkbox:not(:disabled)").length;

  selectedCount.innerText = selectedRows.length;
  button.disabled = selectedRows.length === 0;

  if (selectAllButton) selectAllButton.disabled = selectableCount === 0;
  if (clearButton) clearButton.disabled = selectedRows.length === 0;
}

function updateActionCounters() {
  const createCount = caseBuilderRows.filter(row => getCaseAction(row).code === "CREATE_CASE").length;
  const updateCount = caseBuilderRows.filter(row => getCaseAction(row).code === "UPDATE_DEBT").length;
  const deltaCount = caseBuilderRows.filter(row => getCaseAction(row).code === "CREATE_DELTA").length;

  const createEl = document.getElementById("createCasesCount");
  const updateEl = document.getElementById("updateDebtCount");
  const deltaEl = document.getElementById("deltaCasesCount");

  if (createEl) createEl.innerText = createCount;
  if (updateEl) updateEl.innerText = updateCount;
  if (deltaEl) deltaEl.innerText = deltaCount;
}

async function createCaseFromBuilderRow(rowId) {
  const row = caseBuilderRows.find(r => r.rowId === rowId);
  if (!row || row.caseInfo.hasCase) return;

  if (!caseBuilderAccess.canCreateCase) {
    alert("אין הרשאה להקמת תיק");
    return;
  }

  const caseItem = await caseService.createCase({
    routeId: row.routeId,
    groupId: row.groupId,
    idPayer: row.idPayer,
    idAsset: row.idAsset
  });

  if (!caseItem) {
    alert("אין הרשאה להקמת תיק");
    return;
  }

  await debtService.addDebtsToCase(caseItem.caseId, row.debts);
  await loadCaseBuilderRows();
}

function selectAllCreateRows() {
  document.querySelectorAll(".case-builder-checkbox:not(:disabled)").forEach(input => {
    input.checked = true;
  });

  updateBulkActionsState();
}

function clearSelectedRows() {
  document.querySelectorAll(".case-builder-checkbox").forEach(input => {
    input.checked = false;
  });

  updateBulkActionsState();
}

async function createSelectedCases() {
  const rows = getSelectedCreateRows();
  if (!rows.length) return;

  const button = document.getElementById("bulkCreateCasesBtn");
  if (button) button.disabled = true;

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const caseItem = await caseService.createCase({
        routeId: row.routeId,
        groupId: row.groupId,
        idPayer: row.idPayer,
        idAsset: row.idAsset
      });

      if (!caseItem) {
        failed++;
        continue;
      }

      await debtService.addDebtsToCase(caseItem.caseId, row.debts);
      created++;
    } catch (error) {
      console.error("Failed creating case", error);
      failed++;
    }
  }

  alert(`הוקמו ${created} תיקים. נכשלו ${failed}.`);
  await loadCaseBuilderRows();
}

async function showDebtDetails(rowId, source) {
  const row = caseBuilderRows.find(r => r.rowId === rowId);
  const modal = document.getElementById("debtDetailsModal");
  const title = document.getElementById("debtDetailsTitle");
  const body = document.getElementById("debtDetailsBody");

  if (!row || !modal || !title || !body) return;

  modal.classList.remove("modal-backdrop--hidden");
  title.innerText = source === "gvia" ? "פירוט חובות גבייה" : "פירוט חובות אכיפה";

  const details = source === "gvia"
    ? await debtService.getGviaDetailsForBuilderRow(row)
    : await debtService.getAchifaDetailsForBuilderRow(row);

  if (!details.length) {
    body.innerHTML = `<tr><td colspan="6">לא נמצאו חיובים</td></tr>`;
    return;
  }

  body.innerHTML = details.map(debt => `
    <tr>
      <td>${debt.idhov || ""}</td>
      <td>${debt.caseId || ""}</td>
      <td>${debt.debtTypeName || debt.enforcementCode || debt.originalCode || ""}</td>
      <td>${debt.year || ""}</td>
      <td>${debt.ribit ? "כן" : "לא"}</td>
      <td>${formatCurrency(debt.sum)}</td>
    </tr>
  `).join("");
}

function closeDebtDetails() {
  const modal = document.getElementById("debtDetailsModal");
  if (modal) modal.classList.add("modal-backdrop--hidden");
}

function closeDebtDetailsFromBackdrop(event) {
  if (event.target?.id === "debtDetailsModal") {
    closeDebtDetails();
  }
}

window.renderCasesBuilder = renderCasesBuilder;
window.createCaseFromBuilderRow = createCaseFromBuilderRow;
window.createSelectedCases = createSelectedCases;
window.selectAllCreateRows = selectAllCreateRows;
window.clearSelectedRows = clearSelectedRows;
window.showDebtDetails = showDebtDetails;
window.closeDebtDetails = closeDebtDetails;
window.closeDebtDetailsFromBackdrop = closeDebtDetailsFromBackdrop;
