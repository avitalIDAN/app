async function renderSwitchingModes() {
  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");
  const tbody = document.getElementById("casesTable");

  await loadRoutes(routeSelect);

  statusSelect.disabled = true;
  newStatusSelect.disabled = true;

  routeSelect.onchange = async () => {
    resetTable();
    resetStatus();

    if (!routeSelect.value) return;

    await loadStatuses(statusSelect,newStatusSelect, routeSelect.value);
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

  async function loadStatuses(statusSelect, newStatusSelect, routeId) {
    const statuses = await statusService.getAllByRoute(routeId);
    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;
    newStatusSelect.innerHTML = `<option value="">כל המצבים</option>`;

    statuses.forEach(s => {
      statusSelect.innerHTML += `
        <option value="${s.statusId}">
          ${s.name}
        </option>`;

       newStatusSelect.innerHTML += `
        <option value="${s.statusId}">
          ${s.name}
        </option>`;
    });

    statusSelect.disabled = false;
    newStatusSelect.disabled = false;
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

    cases.forEach(c => {
    const tr = document.createElement("tr");
    const nameRout = c.routeId; //await routeService.getNameById(c.routeId);
    tr.innerHTML = `
      <td>${c.caseId}</td>
      <td>${nameRout}</td>
      <td>${c.currentStatusName}</td>
      <td>
        <button onclick="promote(${c.caseId})">
          קידום למצב
        </button>
      </td>
      <td>
        <button onclick="exclusion(${c})">
          החרגה
        </button>
      </td>
      <td>
        <button onclick="closeCase(${c})">
          סגירה
        </button>
      </td>
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

async function promote(caseId) {
  const caseThis = await caseService.getCaseById(caseId);
  const nextStatus = await statusService.getNextStatus(caseThis.currentStatusId, caseThis.routeId);
   console.log(nextStatus)
  if(!nextStatus){
    await caseService.changeCaseStatus(
      caseThis.caseId,
      nextStatus.statusId
    );
  }
  // const thisStatus = await statusService.getById(caseThis.statusId, caseThis.routeId);
  // const statuses = await statusService.getAllByRoute(caseThis.routeId);

  //async changeCaseStatus(caseId, newStatusId, changedBy = authService.getCurrentUser, note = "") {
 

  
  // // רענון תצוגה (אופציונלי)
  // const tbody = document.getElementById("casesTable");
  // tbody.innerHTML = "";
  // renderSwitchingModes();
}

async function exclusion(caseThis) {
  await caseService.changeCaseStatus(
    caseThis.caseId,
    9999 //פונקציה שמחזירה מספר מוחג?
  );

  
  // רענון תצוגה (אופציונלי)
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";
  renderSwitchingModes();
}

async function closeCase(caseThis) {
  await caseService.changeCaseStatus(
    caseThis.caseId,
    0 //פונקציה שמחזירה מספר לסגירה?
  );


  // רענון תצוגה (אופציונלי)
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";
  renderSwitchingModes();
}

async function changeCaseStatus() {
  const routeSelect = document.getElementById("routeFilter");
  const statusSelect = document.getElementById("statusFilter");
  const newStatusSelect = document.getElementById("newStatusSelect");

  const routeId = routeSelect.value;
  const currentStatusId = statusSelect.value;
  const newStatusId = newStatusSelect.value;

  // ולידציה
  if (!routeId || !currentStatusId || !newStatusId) {
    alert("יש לבחור מסלול, מצב נוכחי ומצב חדש לפני שינוי");
    return;
  }

  if (currentStatusId === newStatusId) {
    alert("המצב החדש חייב להיות שונה מהמצב הנוכחי");
    return;
  }

  // שליפת תיקים רלוונטיים
  const cases = await caseService.getCasesByStatus(
    currentStatusId,
    routeId
  );

  if (!cases || cases.length === 0) {
    alert("לא נמצאו תיקים מתאימים לשינוי");
    return;
  }

  const confirmMsg = `
יימשך שינוי מצב ל־${cases.length} תיקים.
האם להמשיך?
  `.trim();

  if (!confirm(confirmMsg)) return;

  // ביצוע שינוי
  for (const c of cases) {
    await caseService.changeCaseStatus(
      c.caseId,
      newStatusId
    );
  }

  alert(`שינוי מצב בוצע בהצלחה ל־${cases.length} תיקים`);

  // רענון תצוגה (אופציונלי)
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";
  renderSwitchingModes();
}

// newStatusSelect.onchange = () => {
//   if (!routeSelect.value || !statusSelect.value) {
//     alert("יש לבחור מסלול ומצב נוכחי לפני בחירת מצב חדש");
//     newStatusSelect.value = "";
//   }
// };

// async function changeCaseStatus() {
//   const routeSelect = document.getElementById("routeFilter");
//   const statusSelect = document.getElementById("statusFilter");
//   const newStatusSelect = document.getElementById("newStatusSelect");
//   const previewEl = document.getElementById("casesPreview");
//   const btn = document.getElementById("changeStatusBtn");

//   const routeId = routeSelect.value;
//   const currentStatusId = statusSelect.value;
//   const newStatusId = newStatusSelect.value;

//   previewEl.innerText = "";

//   // ולידציה בסיסית
//   if (!routeId || !currentStatusId || !newStatusId) {
//     alert("יש לבחור מסלול, מצב נוכחי ומצב חדש");
//     return;
//   }

//   if (currentStatusId === newStatusId) {
//     alert("המצב החדש חייב להיות שונה מהמצב הנוכחי");
//     return;
//   }

//   btn.disabled = true;

//   try {
//     // שלב 1 – Preview
//     const cases = await caseService.getCasesByStatus(
//       currentStatusId,
//       routeId
//     );

//     if (!cases || cases.length === 0) {
//       previewEl.innerText = "לא נמצאו תיקים מתאימים";
//       return;
//     }

//     previewEl.innerText = `יימשך שינוי מצב ל־${cases.length} תיקים`;

//     // שלב 2 – אישור
//     const confirmed = confirm(
//       `האם לשנות מצב ל־${cases.length} תיקים?`
//     );

//     if (!confirmed) return;

//     // שלב 3 – ביצוע (אחד־אחד)
//     for (const c of cases) {
//       await caseService.changeCaseStatus(
//         c.caseId,
//         newStatusId
//       );
//     }

//     alert("שינוי המצב בוצע בהצלחה");

//   } catch (err) {
//     console.error(err);
//     alert("אירעה שגיאה בעת שינוי המצב");
//   } finally {
//     btn.disabled = false;
//   }
// }

// async function updateCasesPreview() {
//   const routeId = routeFilter.value;
//   const statusId = statusFilter.value;
//   const previewEl = document.getElementById("casesPreview");

//   previewEl.innerText = "";

//   if (!routeId || !statusId) return;

//   const cases = await caseService.getCasesByStatus(statusId, routeId);
//   previewEl.innerText = cases.length
//     ? `${cases.length} תיקים במצב זה`
//     : "אין תיקים במצב זה";
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

