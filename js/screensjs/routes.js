async function renderRouteTable() {
  const routes = await routeService.getAll();
  const select = document.getElementById("routeSelect");

  select.innerHTML = `<option value="">בחר מסלול</option>`;
  routes.forEach(r => {
    select.innerHTML += `<option value="${r.routeId}">${r.name}</option>`;
  });

  select.onchange = async () => {
    const cases = await caseService.getCasesByRoute(select.value); //מאיפה הערך ואם תואם
    const tbody = document.getElementById("routeCases");
    tbody.innerHTML = "";

    cases.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td>${c.caseId}</td>
          <td>${c.currentStatusName}</td>
          <td>${c.updatedAt}</td>
        </tr>
      `;
    });
  };
}

window.renderRouteTable = renderRouteTable;
