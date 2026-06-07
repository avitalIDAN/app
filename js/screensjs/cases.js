let caseBuilderDebts = [];

async function renderCasesBuilder() {
  await loadCaseBuilderRoutes();
  await loadCaseBuilderGroups();
  await loadDebtsForCaseBuilder();
}

async function loadCaseBuilderRoutes() {
  const routeSelect = document.getElementById("caseRouteSelect");
  const routes = await routeService.getAll();

  routeSelect.innerHTML = `<option value="">בחר מסלול</option>`;
  routes.forEach(route => {
    routeSelect.innerHTML += `
      <option value="${route.routeId}">
        ${route.routeId} - ${route.name}
      </option>`;
  });

  if (routes.length) {
    routeSelect.value = routes[0].routeId;
  }
}

async function loadCaseBuilderGroups() {
  const groupSelect = document.getElementById("debtGroupSelect");
  const groups = await debtService.getGroups();

  groupSelect.innerHTML = `<option value="">כל הקבוצות</option>`;
  groups.forEach(groupId => {
    groupSelect.innerHTML += `<option value="${groupId}">קבוצה ${groupId}</option>`;
  });
}

async function loadDebtsForCaseBuilder() {
  const groupId = document.getElementById("debtGroupSelect").value;
  const payerId = document.getElementById("payerFilter").value;
  const assetId = document.getElementById("assetFilter").value;

  caseBuilderDebts = await debtService.getGviaDebtsFiltered({
    groupId: groupId || null,
    payerId: payerId || null,
    assetId: assetId || null
  });

  renderGviaDebtsTable(caseBuilderDebts);
  updateSelectedDebtsSummary();
}

function renderGviaDebtsTable(debts) {
  const tbody = document.getElementById("gviaDebtsTable");
  tbody.innerHTML = "";

  if (!debts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">לא נמצאו חובות מתאימים</td>
      </tr>`;
    return;
  }

  debts.forEach(debt => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input type="checkbox" class="debt-checkbox" value="${debt.idhov}" onchange="updateSelectedDebtsSummary()" />
      </td>
      <td>${debt.idhov}</td>
      <td>${debt.idPayer}</td>
      <td>${debt.idAsset}</td>
      <td>${debt.sugHov}</td>
      <td>${debt.year}</td>
      <td>${debt.ribit ? "כן" : "לא"}</td>
      <td>${formatCurrency(debt.sum)}</td>`;

    tbody.appendChild(tr);
  });
}

function getSelectedGviaDebts() {
  const selectedIds = [...document.querySelectorAll(".debt-checkbox:checked")]
    .map(input => Number(input.value));

  return caseBuilderDebts.filter(debt => selectedIds.includes(debt.idhov));
}

function updateSelectedDebtsSummary() {
  const selectedDebts = getSelectedGviaDebts();
  const total = debtService.sumDebts(selectedDebts);

  document.getElementById("selectedDebtsCount").innerText = selectedDebts.length;
  document.getElementById("selectedDebtsSum").innerText = formatCurrency(total);
}

async function createCaseFromSelectedDebts() {
  const routeId = document.getElementById("caseRouteSelect").value;
  const selectedDebts = getSelectedGviaDebts();

  if (!routeId) {
    alert("יש לבחור מסלול");
    return;
  }

  if (!selectedDebts.length) {
    alert("יש לבחור לפחות חוב אחד להקמת תיק");
    return;
  }

  const firstDebt = selectedDebts[0];
  const samePayerAndAsset = selectedDebts.every(debt =>
    debt.idPayer == firstDebt.idPayer && debt.idAsset == firstDebt.idAsset
  );

  if (!samePayerAndAsset) {
    alert("בשלב האב-טיפוס ניתן להקים תיק רק לחובות של אותו משלם ואותו נכס");
    return;
  }

  const caseItem = await caseService.createCase({
    routeId,
    groupId: firstDebt.sugHov,
    idPayer: firstDebt.idPayer,
    idAsset: firstDebt.idAsset,
    debt: debtService.sumDebts(selectedDebts)
  });

  if (!caseItem) {
    alert("אין הרשאה להקמת תיק");
    return;
  }

  await debtService.addDebtsToCase(caseItem.caseId, selectedDebts);
  alert(`תיק ${caseItem.caseId} הוקם בהצלחה`);
  toCaseScreen(caseItem.caseId);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}

window.renderCasesBuilder = renderCasesBuilder;
