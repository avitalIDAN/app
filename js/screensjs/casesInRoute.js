async function rendercasesInRouteTable() {
  const routeSelect = document.getElementById("routeSelect");
  const statusSelect = document.getElementById("statusSelect");
  const tbody = document.getElementById("routeCases");

  // טעינת מסלולים
  const routes = await routeService.getAll();
  routeSelect.innerHTML = `<option value="">בחר מסלול</option>`;
  // routes.forEach(r => {
  //   routeSelect.innerHTML += `<option value="${r.routeId}">${r.name}</option>`;
  // });
routes.forEach(r => {
  routeSelect.innerHTML += `
    <option value="${r.routeId}">
      ${r.routeId} – ${r.name}
    </option>
  `;
});

  // שינוי מסלול
  routeSelect.onchange = async () => {
    const routeId = routeSelect.value;
    tbody.innerHTML = "";
    statusSelect.innerHTML = `<option value="">בחר מצב</option>`;

    if (!routeId) {
      statusSelect.disabled = true;
      return;
    }

    // טעינת מצבים למסלול
    const statuses = await statusService.getAllByRoute(routeId);
    statuses.forEach(s => {
      statusSelect.innerHTML += `
        <option value="${s.statusId}">${s.name}</option>
      `;
    });

    statusSelect.disabled = false;

    // טעינת כל התיקים במסלול
    const cases = await caseService.getCasesByRoute(routeId);
    renderCases(cases);
  };

  // שינוי מצב
  statusSelect.onchange = async () => {
    if (!routeSelect.value) {
      alert("יש לבחור מסלול לפני בחירת מצב");
      statusSelect.value = "";
      return;
    }

    const cases = await caseService.getCasesByStatus(
      statusSelect.value,
      routeSelect.value
    );

    renderCases(cases);
  };

  function renderCases(cases) {
    tbody.innerHTML = "";

    if (!cases || cases.length==0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">לא נמצאו תיקים</td>
        </tr>`;
      return;
    }

    cases.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td>${c.caseId}</td>
          <td>${c.currentStatusName}</td>
          <td>${new Date(c.updatedAt).toLocaleDateString()}</td>
        </tr>
      `;
    });
  }
}

window.rendercasesInRouteTable = rendercasesInRouteTable;


// async function renderRouteTable() {
//   const routes = await routeService.getAll();
//   const select = document.getElementById("routeSelect");

//   select.innerHTML = `<option value="">בחר מסלול</option>`;
//   routes.forEach(r => {
//     select.innerHTML += `<option value="${r.routeId}">${r.name}</option>`;
//   });

//   select.onchange = async () => {
//     const cases = await caseService.getCasesByRoute(select.value); //מאיפה הערך ואם תואם
//     const tbody = document.getElementById("routeCases");
//     tbody.innerHTML = "";

//     cases.forEach(c => {
//       tbody.innerHTML += `
//         <tr>
//           <td>${c.caseId}</td>
//           <td>${c.currentStatusName}</td>
//           <td>${c.updatedAt}</td>
//         </tr>
//       `;
//     });
//   };
// }

// window.renderRouteTable = renderRouteTable;
