async function renderSwitchingModes() {
  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const tbody = document.getElementById("casesTable");

  await loadRoutes(routeSelect);

  statusSelect.disabled = true;

  routeSelect.onchange = async () => {
    resetTable();
    resetStatus();

    if (!routeSelect.value) return;

    await loadStatuses(statusSelect, routeSelect.value);
    // await loadCases();
    const cases = await caseService.getCasesByRoute(routeSelect.value);
    renderCases(cases);
  };

  statusSelect.onchange = async () => {
    if (!routeSelect.value) {
      alert("יש לבחור מסלול לפני בחירת מצב");
      statusSelect.value = "";
      return;
    }

    // await loadCases();
    const cases = await caseService.getCasesByStatus(
      statusSelect.value,
      routeSelect.value
    );
    renderCases(cases);
  };

  /* ---------- helpers ---------- */

  async function loadRoutes(routeSelect) {
    const routes = await routeService.getAll();
    
    routeSelect.innerHTML = `<option value="">בחר מסלול</option>`;

    routes.forEach(r => {
      routeSelect.innerHTML += `
        <option value="${r.routeId}">
          ${r.routeId} – ${r.name}
        </option>`;
    });
  }

  async function loadStatuses(statusSelect, routeId) {
    const statuses = await statusService.getAllByRoute(routeId);
    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;

    statuses.forEach(s => {
      statusSelect.innerHTML += `
        <option value="${s.statusId}">
          ${s.name}
        </option>`;
    });

    statusSelect.disabled = false;
  }

//   async function loadCases() {
//     const cases = await caseService.getCasesFiltered({
//       routeId: routeSelect.value,
//       statusId: statusSelect.value || null
//     });

//     renderCases(cases);
//   }

  function resetStatus() {
    statusSelect.innerHTML = `<option value="">בחר מצב</option>`;
    statusSelect.disabled = true;
  }

  function resetTable() {
    tbody.innerHTML = "";
  }

  function renderCases(cases) {
    tbody.innerHTML = "";

    if (!cases.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">לא נמצאו תיקים</td>
        </tr>`;
      return;
    }

    // cases.forEach(c => {
    //   tbody.innerHTML += `
    //     <tr>
    //       <td>${c.caseId}</td>
    //       <td>${c.currentStatusName}</td>
    //       <td>${new Date(c.updatedAt).toLocaleDateString()}</td>
    //     </tr>`;
    // });
    cases.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.caseId}</td>
      <td>${c.currentStatusName}</td>
      <td>${c.routeId}</td>
      <td>
        <button onclick="toCaseScreen(${c.caseId})">
          הצגת תיק
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  }
}

window.renderSwitchingModes = renderSwitchingModes;



// async function renderSwitchingModes() {
//   await fillFilters();
//   await loadCases(); // ללא פילטרים = כל התיקים
// }

// async function fillFilters() {
//   const routes = await routeService.getAll();
//   const statuses = await statusService.getAll();

//   const routeSelect = document.getElementById("routeFilter");
//   const statusSelect = document.getElementById("statusFilter");

//   routes.forEach(r => {
//     routeSelect.innerHTML += `
//       <option value="${r.routeId}">
//         ${r.name} (ID: ${r.routeId})
//       </option>`;
//   });

//   statuses.forEach(s => {
//     statusSelect.innerHTML += `
//       <option value="${s.statusId}">
//         ${s.name}
//       </option>`;
//   });

//   routeSelect.onchange = loadCases;
//   statusSelect.onchange = loadCases;

//   document.getElementById("clearFilters").onclick = () => {
//     routeSelect.value = "";
//     statusSelect.value = "";
//     loadCases();
//   };
// }

// async function loadCases() {
//   const routeId = document.getElementById("routeFilter").value;
//   const statusId = document.getElementById("statusFilter").value;

//   const cases = await caseService.getCasesFiltered({
//     routeId: routeId ? Number(routeId) : null,
//     statusId: statusId ? Number(statusId) : null
//   });

//   renderCasesTable(cases);
// }

// function renderCasesTable(cases) {
//   const tbody = document.getElementById("casesTable");
//   tbody.innerHTML = "";

//   if (!cases.length) {
//     tbody.innerHTML = `
//       <tr>
//         <td colspan="4">לא נמצאו תיקים</td>
//       </tr>`;
//     return;
//   }

//   cases.forEach(c => {
//     tbody.innerHTML += `
//       <tr>
//         <td>${c.caseId}</td>
//         <td>${c.currentStatusName}</td>
//         <td>${c.routeName ?? c.routeId}</td>
//         <td>
//           <button onclick="toCaseScreen(${c.caseId})">
//             הצגת תיק
//           </button>
//         </td>
//       </tr>`;
//   });
// }

/////////////////
// async function renderSwitchingModes() {
//   const cases = await caseService.getAllCases();
//   const tbody = document.getElementById("casesTable");
//   tbody.innerHTML = "";

//   cases.forEach(c => {
//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//       <td>${c.caseId}</td>
//       <td>${c.currentStatusName}</td>
//       <td>${c.routeId}</td>
//       <td>
//         <button onclick="toCaseScreen(${c.caseId})">
//           הצגת תיק
//         </button>
//       </td>
//     `;
//     tbody.appendChild(tr);
//   });
// }

// function toCaseScreen(caseId){
    
// //הפנייה לתיק- מסך הצגת תיק
// }
window.renderSwitchingModes = renderSwitchingModes;
