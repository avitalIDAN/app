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

  tbody.innerHTML = `
    <tr>
      <td colspan="12">${message}</td>
    </tr>
  `;
}

function getCaseBuilderAccess() {
  // טבלאות בסיסיות שבלעדיהן אי אפשר לבנות את שורות המסך בצורה אמינה.
  const baseTables = ["hovgvia", "debtTypes", "debtTypeGroups", "groups", "routes"];
  const blockedBaseTables = permissionService.getBlockedTables(baseTables, "view");

  const canViewCases = permissionService.canViewTable("cases");
  const canViewAchifa = permissionService.canViewTable("hovachifa");

  // הקמת תיק דורשת גם יצירת תיק וגם יצירת שורות חוב באכיפה.
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

function getReason(row) {
  if (!caseBuilderAccess.canViewCases) {
    return "אין הרשאה לנתוני תיקים";
  }

  if (!caseBuilderAccess.canViewAchifa) {
    return "אין הרשאה לנתוני אכיפה";
  }

  if (!row.caseInfo.hasCase) return "לא קיים תיק";
  if (row.gap === 0) return "אין שינוי";
  if (row.gap > 0) return `נמצא פער של ${formatCurrency(row.gap)}`;

  return "החוב באכיפה גבוה מהגבייה";
}

function getActionHtml(row) {
  // אם אין הרשאת צפייה ל-cases, אי אפשר לדעת אם תיק קיים.
  // לכן לא מציגים "הקמת תיק", אלא פעולה חסומה כדי לא להטעות.
  if (!caseBuilderAccess.canViewCases) {
    return `<button disabled>פעולה חסומה</button>`;
  }

  if (row.caseInfo.hasCase) {
    return `<button disabled>קיים תיק</button>`;
  }

  if (!caseBuilderAccess.canCreateCase) {
    return `<button disabled>הקמת תיק</button>`;
  }

  return `
    <button onclick="createCaseFromBuilderRow('${row.rowId}')">
      הקמת תיק
    </button>
  `;
}

async function loadCaseBuilderFilters() {
  const routeSelect = document.getElementById("routeFilter");
  const groupSelect = document.getElementById("groupFilter");

  const [routes, groups] = await Promise.all([
    routeService.getActive(),
    debtService.getGroups()
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
}

async function enrichRowsWithCaseInfo(rows) {
  // אם אין הרשאת צפייה ל-cases, אסור לנסות להסיק אם תיק קיים או לא.
  // לכן כל שורה תקבל מצב ניטרלי שמונע פעולה.
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

async function loadCaseBuilderRows() {
  caseBuilderAccess = getCaseBuilderAccess();

  if (!caseBuilderAccess.canViewBaseData) {
    caseBuilderRows = [];
    showCaseBuilderNoDataPermission();
    return;
  }

  const routeId = document.getElementById("routeFilter").value;
  const groupId = document.getElementById("groupFilter").value;
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
    return;
  }

  caseBuilderRows.forEach(row => {
    tbody.innerHTML += `
      <tr>
        <td><input type="checkbox" data-row-id="${row.rowId}"></td>
        <td>${row.idPayer}</td>
        <td>${row.idAsset}</td>
        <td>${row.groupName}</td>
        <td>${row.debtsCount}</td>
        <td>${formatCurrency(row.gviaDebt)}</td>
        <td>${caseBuilderAccess.canViewAchifa ? formatCurrency(row.achifaDebt) : "אין הרשאה"}</td>
        <td>${caseBuilderAccess.canViewAchifa ? formatCurrency(row.gap) : "אין הרשאה"}</td>
        <td>${row.caseInfo.caseId || ""}</td>
        <td>${row.caseInfo.statusName}</td>
        <td>${getReason(row)}</td>
        <td>${getActionHtml(row)}</td>
      </tr>
    `;
  });
}

async function createCaseFromBuilderRow(rowId) {
  const row = caseBuilderRows.find(r => r.rowId === rowId);
  if (!row || row.caseInfo.hasCase) return;

  // בדיקה חוזרת בזמן פעולה, כדי שלא נסתמך רק על מצב הכפתור במסך.
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

window.renderCasesBuilder = renderCasesBuilder;
window.createCaseFromBuilderRow = createCaseFromBuilderRow;