async function renderSwitchingModes() {
  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");
  const tbody = document.getElementById("casesTable");
  statusSelect.disabled = true;
  newStatusSelect.disabled = true;

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
        </option>`;
    });
  }

  async function loadStatuses(routeId) {
    const statuses = await statusService.getAllByRoute(routeId);

    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
    newStatusSelect.innerHTML = `<option value="">בחר מצב חדש</option>`;

    statuses.forEach(status => {
      statusSelect.innerHTML += `
        <option value="${status.statusId}">
          ${status.name}
        </option>`;

      newStatusSelect.innerHTML += `
        <option value="${status.statusId}">
          ${status.name}
        </option>`;
    });

    statusSelect.disabled = false;
    newStatusSelect.disabled = false;
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
    tbody.innerHTML = "";
  }

  async function refreshCases() {
    const cases = await caseService.getCasesFiltered({
      routeId: routeSelect.value || null,
      statusId: statusSelect.value || null
    });

    await renderCases(cases);
  }

  async function renderCases(cases) {
    tbody.innerHTML = "";

    if (!cases.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">לא נמצאו תיקים</td>
        </tr>`;
      return;
    }

    for (const caseItem of cases) {
      const routeName = await routeService.getNameById(caseItem.routeId);
      const isClosed = caseItem.currentStatusId == 0;
      const isExcluded = caseItem.currentStatusId == 5;
      const isFinal = isClosed || isExcluded;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${caseItem.caseId}</td>
        <td>${routeName || caseItem.routeId}</td>
        <td>${caseItem.currentStatusName}</td>
        <td>
          <button ${isFinal ? "disabled" : ""} onclick="promote(${caseItem.caseId})">
            קידום למצב
          </button>
        </td>
        <td>
          <button ${isFinal ? "disabled" : ""} onclick="exclusion(${caseItem.caseId})">
            החרגה
          </button>
        </td>
        <td>
          <button ${isClosed ? "disabled" : ""} onclick="closeCase(${caseItem.caseId})">
            סגירה
          </button>
        </td>
        <td>
          <button onclick="toCaseScreen(${caseItem.caseId})">
            הצגת תיק
          </button>
        </td>`;

      tbody.appendChild(tr);
    }
  }

  window.refreshSwitchingModesCases = refreshCases;
}

async function promote(caseId) {
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
  fetch("ui/screens/case.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("content").innerHTML = html;
      renderCaseScreen(caseId);
    });
}

window.renderSwitchingModes = renderSwitchingModes;

// // }

// // routeFilter.onchange = updateCasesPreview;
// // statusFilter.onchange = updateCasesPreview;


// // // // במקום לולאה
// // // await caseService.bulkChangeStatus({
// // //   routeId,
// // //   fromStatusId: currentStatusId,
// // //   toStatusId: newStatusId
// // // });

// window.renderSwitchingModes = renderSwitchingModes;

// ////  }

////  routeFilter.onchange = updateCasesPreview;
////  statusFilter.onchange = updateCasesPreview;


////  // // במקום לולאה
////  // await caseService.bulkChangeStatus({
////  //   routeId,
////  //   fromStatusId: currentStatusId,
////  //   toStatusId: newStatusId
////  // });

///wi ndow.renderSwitchingModes = renderSwitchingModes;

;
// }

// routeFilter.onchange = updateCasesPreview;
// statusFilter.onchange = updateCasesPreview;


// // // במקום לולאה
// // await caseService.bulkChangeStatus({
// //   routeId,
// //   fromStatusId: currentStatusId,
// //   toStatusId: newStatusId
// // });

window.renderSwitchingModes = renderSwitchingModes;

