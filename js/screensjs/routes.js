async function renderRoutes() {
  const routes = await routeService.getAll();
  const tbody = document.getElementById("routesTable");
  tbody.innerHTML = "";

  if (!routes.length) {
    tbody.innerHTML = `
      <tr><td colspan="3">לא נמצאו מסלולים</td></tr>`;
    return;
  }

  routes.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.routeId}</td>
        <td>${r.name}</td>
        <td>${r.description ?? ""}</td>
      </tr>`;
  });
}

window.renderRoutes = renderRoutes;
