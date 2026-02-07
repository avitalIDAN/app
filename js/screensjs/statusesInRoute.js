async function renderStatusesInRoute() {
  await loadRoutesToSelect();
}

async function loadRoutesToSelect() {
  const routes = await routeService.getAll();
  const select = document.getElementById("routeSelect");

  routes.forEach(r => {
    select.innerHTML += `
      <option value="${r.routeId}">
        ${r.routeId} – ${r.name}
      </option>`;
  });

  select.onchange = async () => {
    if (!select.value) {
      resetStatusesTable();
      return;
    }

    await renderStatuses(select.value);
  };
}

async function renderStatuses(routeId) {
  const statuses = await statusService.getAllByRoute(routeId);
  const tbody = document.getElementById("statusesTable");
  tbody.innerHTML = "";

  if (!statuses.length) {
    tbody.innerHTML = `
      <tr><td colspan="4">אין מצבים למסלול זה</td></tr>`;
    return;
  }

  statuses.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.statusId}</td>
        <td>${s.name}</td>
        <td>${s.orderIndex ?? "-"}</td>
        <td>${s.isActive ? "✔" : "✖"}</td>
      </tr>`;
  });
}

function resetStatusesTable() {
  document.getElementById("statusesTable").innerHTML = `
    <tr>
      <td colspan="4">בחר מסלול להצגת מצבים</td>
    </tr>`;
}

window.renderStatusesInRoute = renderStatusesInRoute;
