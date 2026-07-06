async function renderStatusesInRoute() {
  const routeSelect = document.getElementById("routeSelect");

  resetStatusesTable();

  // בלי הרשאה למסלולים אי אפשר לבחור מסלול בצורה אמינה.
  if (!permissionService.canViewTable("routes")) {
    routeSelect.disabled = true;
    showStatusesNoDataPermission("אין הרשאה לנתוני מסלולים");
    return;
  }

  routeSelect.disabled = false;
  await loadRoutesToSelect();
}

async function loadRoutesToSelect() {
  const routes = await routeService.getAll();
  const select = document.getElementById("routeSelect");

  select.innerHTML = `<option value="">בחר מסלול</option>`;

  routes.forEach(route => {
    select.innerHTML += `
      <option value="${route.routeId}">
        ${route.routeId} - ${route.name}
      </option>
    `;
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
  const tbody = document.getElementById("statusesTable");
  tbody.innerHTML = "";

  // המסלול מותר, אבל ייתכן שטבלת המצבים חסומה.
  if (!permissionService.canViewTable("statuses")) {
    showStatusesNoDataPermission("אין הרשאה לנתוני מצבים");
    return;
  }

  const statuses = await statusService.getAllByRoute(routeId);

  if (!statuses.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">אין מצבים למסלול זה</td>
      </tr>
    `;
    return;
  }

  statuses.forEach(status => {
    tbody.innerHTML += `
      <tr>
        <td>${status.statusId}</td>
        <td>${status.statusName || status.name}</td>
        <td>${status.orderIndex ?? "-"}</td>
        <td>${status.isActive ? "כן" : "לא"}</td>
      </tr>
    `;
  });
}

function resetStatusesTable() {
  document.getElementById("statusesTable").innerHTML = `
    <tr>
      <td colspan="4">בחר מסלול להצגת מצבים</td>
    </tr>
  `;
}

function showStatusesNoDataPermission(message = "אין הרשאה לנתונים") {
  document.getElementById("statusesTable").innerHTML = `
    <tr>
      <td colspan="4">${message}</td>
    </tr>
  `;
}

window.renderStatusesInRoute = renderStatusesInRoute;