let caseBuilderRows = [];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}

function getReason(row) {
  if (!row.caseInfo.hasCase) return "לא קיים תיק";
  if (row.gap === 0) return "אין שינוי";
  if (row.gap > 0) return `נמצא פער של ${formatCurrency(row.gap)}`;
  return "החוב באכיפה גבוה מהגבייה";
}

function getActionHtml(row) {
  if (!row.caseInfo.hasCase) {
    return `
      <button onclick="createCaseFromBuilderRow('${row.rowId}')">
        הקמת תיק
      </button>
    `;
  }

  return `<span>—</span>`;
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

// async function loadCaseBuilderRows() {
//   const routeId = document.getElementById("routeFilter").value;
//   const groupId = document.getElementById("groupFilter").value;

//   if (!routeId) {
//     caseBuilderRows = [];
//     renderCaseBuilderTable();
//     return;
//   }

//   const rows = await debtService.getCaseBuilderRows({ routeId, groupId });
//   caseBuilderRows = await enrichRowsWithCaseInfo(rows);

//   renderCaseBuilderTable();
// }
async function loadCaseBuilderRows() {
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
        <td>${formatCurrency(row.achifaDebt)}</td>
        <td>${formatCurrency(row.gap)}</td>
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

  const caseItem = await caseService.createCase({
    routeId: row.routeId,
    groupId: row.groupId,
    idPayer: row.idPayer,
    idAsset: row.idAsset,
    debt: row.gviaDebt
  });

  if (!caseItem) {
    alert("אין הרשאה להקמת תיק");
    return;
  }

  await debtService.addDebtsToCase(caseItem.caseId, row.debts);
  await loadCaseBuilderRows();
}

async function renderCasesBuilder() {
  await loadCaseBuilderFilters();

  document.getElementById("routeFilter").onchange = loadCaseBuilderRows;
  document.getElementById("groupFilter").onchange = loadCaseBuilderRows;
  document.getElementById("refreshBtn").onclick = loadCaseBuilderRows;

  await loadCaseBuilderRows();
}

window.renderCasesBuilder = renderCasesBuilder;
window.createCaseFromBuilderRow = createCaseFromBuilderRow;
// let caseBuilderDebts = [];

// async function renderCasesBuilder() {
//   await loadCaseBuilderRoutes();
//   await loadCaseBuilderGroups();
//   await loadDebtsForCaseBuilder();
// }

// async function loadCaseBuilderRoutes() {
//   const routeSelect = document.getElementById("caseRouteSelect");
//   const routes = await routeService.getAll();

//   routeSelect.innerHTML = `<option value="">בחר מסלול</option>`;
//   routes.forEach(route => {
//     routeSelect.innerHTML += `
//       <option value="${route.routeId}">
//         ${route.routeId} - ${route.name}
//       </option>`;
//   });

//   if (routes.length) {
//     routeSelect.value = routes[0].routeId;
//   }
// }

// async function loadCaseBuilderGroups() {
//   const groupSelect = document.getElementById("debtGroupSelect");
//   const groups = await debtService.getGroups();

//   groupSelect.innerHTML = `<option value="">כל הקבוצות</option>`;
//   groups.forEach(groupId => {
//     groupSelect.innerHTML += `<option value="${groupId}">קבוצה ${groupId}</option>`;
//   });
// }

// async function loadDebtsForCaseBuilder() {
//   const groupId = document.getElementById("debtGroupSelect").value;
//   const payerId = document.getElementById("payerFilter").value;
//   const assetId = document.getElementById("assetFilter").value;

//   caseBuilderDebts = await debtService.getGviaDebtsFiltered({
//     groupId: groupId || null,
//     payerId: payerId || null,
//     assetId: assetId || null
//   });

//   renderGviaDebtsTable(caseBuilderDebts);
//   updateSelectedDebtsSummary();
// }

// function renderGviaDebtsTable(debts) {
//   const tbody = document.getElementById("gviaDebtsTable");
//   tbody.innerHTML = "";

//   if (!debts.length) {
//     tbody.innerHTML = `
//       <tr>
//         <td colspan="8">לא נמצאו חובות מתאימים</td>
//       </tr>`;
//     return;
//   }

//   debts.forEach(debt => {
//     const tr = document.createElement("tr");

//     tr.innerHTML = `
//       <td>
//         <input type="checkbox" class="debt-checkbox" value="${debt.idhov}" onchange="updateSelectedDebtsSummary()" />
//       </td>
//       <td>${debt.idhov}</td>
//       <td>${debt.idPayer}</td>
//       <td>${debt.idAsset}</td>
//       <td>${debt.sugHov}</td>
//       <td>${debt.year}</td>
//       <td>${debt.ribit ? "כן" : "לא"}</td>
//       <td>${formatCurrency(debt.sum)}</td>`;

//     tbody.appendChild(tr);
//   });
// }

// function getSelectedGviaDebts() {
//   const selectedIds = [...document.querySelectorAll(".debt-checkbox:checked")]
//     .map(input => Number(input.value));

//   return caseBuilderDebts.filter(debt => selectedIds.includes(debt.idhov));
// }

// function updateSelectedDebtsSummary() {
//   const selectedDebts = getSelectedGviaDebts();
//   const total = debtService.sumDebts(selectedDebts);

//   document.getElementById("selectedDebtsCount").innerText = selectedDebts.length;
//   document.getElementById("selectedDebtsSum").innerText = formatCurrency(total);
// }

// async function createCaseFromSelectedDebts() {
//   const routeId = document.getElementById("caseRouteSelect").value;
//   const selectedDebts = getSelectedGviaDebts();

//   if (!routeId) {
//     alert("יש לבחור מסלול");
//     return;
//   }

//   if (!selectedDebts.length) {
//     alert("יש לבחור לפחות חוב אחד להקמת תיק");
//     return;
//   }

//   const firstDebt = selectedDebts[0];
//   const samePayerAndAsset = selectedDebts.every(debt =>
//     debt.idPayer == firstDebt.idPayer && debt.idAsset == firstDebt.idAsset
//   );

//   if (!samePayerAndAsset) {
//     alert("בשלב האב-טיפוס ניתן להקים תיק רק לחובות של אותו משלם ואותו נכס");
//     return;
//   }

//   const caseItem = await caseService.createCase({
//     routeId,
//     groupId: firstDebt.sugHov,
//     idPayer: firstDebt.idPayer,
//     idAsset: firstDebt.idAsset,
//     debt: debtService.sumDebts(selectedDebts)
//   });

//   if (!caseItem) {
//     alert("אין הרשאה להקמת תיק");
//     return;
//   }

//   await debtService.addDebtsToCase(caseItem.caseId, selectedDebts);
//   alert(`תיק ${caseItem.caseId} הוקם בהצלחה`);
//   toCaseScreen(caseItem.caseId);
// }

// function formatCurrency(value) {
//   return Number(value || 0).toLocaleString("he-IL", {
//     style: "currency",
//     currency: "ILS"
//   });
// }

// window.renderCasesBuilder = renderCasesBuilder;
