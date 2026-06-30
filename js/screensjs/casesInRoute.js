let casesInRoute = [];

async function rendercasesInRouteTable() {
  const routeSelect = document.getElementById("routeSelect");
  const statusSelect = document.getElementById("statusSelect");
  const tbody = document.getElementById("routeCases");

  // טעינת מסלולים
  const routes = await routeService.getAll();
  routeSelect.innerHTML = `<option value="">כל המסלולים</option>`;
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
    statusSelect.innerHTML = `<option value="">כל המצבים</option>`;

    if (!routeId) {
      statusSelect.disabled = true;
        // טעינת כל התיקים 
      const allcases = await caseService.getAllCases();
      renderCases(allcases);
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
    // if (!routeSelect.value) {
    //     // טעינת כל התיקים 
    //   const allcases = await caseService.getAllCases();
    //   renderCases(allcases);
    // }
    // else{
    //   // טעינת כל התיקים במסלול
    //   const cases = await caseService.getCasesByRoute(routeId);
    //   renderCases(cases);

    // }
  };

  // שינוי מצב
  statusSelect.onchange = async () => {
    if (!routeSelect.value) {
      alert("יש לבחור מסלול לפני בחירת מצב");
      statusSelect.value = "";
      return;
    }

    if (!statusSelect.value) {
      // טעינת כל התיקים במסלול
      const cases = await caseService.getCasesByRoute(routeSelect.value);
      renderCases(cases);
    }
    else{
      const cases = await caseService.getCasesByStatus(
        statusSelect.value,
        routeSelect.value
      );

      renderCases(cases);
    }
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
    casesInRoute = cases;

    casesInRoute.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td>${c.caseId}</td>
          <td>${c.statusName}</td>
          <td>${new Date(c.updatedAt).toLocaleDateString()}</td>
        </tr>
      `;
    });
  }

    // טעינת כל התיקים 
  const allcases = await caseService.getAllCases();
  renderCases(allcases);
  
  bindRouteReportButtonsC();
}

window.rendercasesInRouteTable = rendercasesInRouteTable;


function bindRouteReportButtonsC() {
  const printBtn = document.getElementById("printBtn");
  const excelBtn = document.getElementById("exportExcelBtn");

  if (!printBtn || !excelBtn) return;

  printBtn.onclick = onClickPrintC;
  excelBtn.onclick = onClickExcelC;
}

// function exportCasesToExcel() {

//   const totalDebt = casesCache.reduce((sum, c) => sum + (c.debt || 0), 0);

//   const excelData = casesCache.map(c => ({
//     "מספר תיק": c.caseId,
//     "מספר חיצוני": c.externalCaseNumber,
//     "מצב נוכחי": c.currentStatusName,
//     "חוב": c.debt,
//     "נוצר בתאריך": formatDate(c.createdAt),
//     "עודכן בתאריך": formatDate(c.updatedAt)
//   }));

//   exportToExcel({
//     data: excelData,
//     headers: Object.keys(excelData[0]),
//     fileName: "דוח_תיקים.xlsx",
//     sheetName: "Cases"
//   });
// }

function onClickExcelC() {
  exportToExcel({
    data: casesInRoute,
    headers: ["מפתח","מזהה תיק", "קוד תיק", "קוד מסלול", "קוד מצב", "שם מצב", "תאריך יצירת התיק", "תאריך עדכון", "חוב"],
    fileName: "תיקים במסלול.xlsx",
    sheetName: "casesInRoute"
  });
};

// function onClickPrint() {
  
//     if(routeSelect.value==""){

//     }  statusSelect.value,
//       routeSelect.value

//   printTextReport({
//     title: "דוח תיקים במסלולים",
//     data: casesInRoute,
//     summaryText: `מספר מסלולים: ${casesInRoute.length}`,
//     renderItem: c => `
//       <div class="record">
//         <h2>מסלול: ${c.name} (קוד: ${c.caseId})</h2>
//         <p>${c.description ?? ""}</p>
//         <div class="divider"></div>
//       </div>
//     `
//   });
// };


function onClickPrintC() {
  if (!casesInRoute.length) {
    alert("אין נתונים להדפסה");
    return;
  }

  const totalDebt = casesInRoute.reduce((sum, c) => sum + (c.debt || 0), 0);

  printTextReport({
    title: "דוח תיקים במסלול",

    summaryText: `
      <div class="report-summary">
        <p><strong>מסלול:</strong> ${routeSelect.value || "כל המסלולים"}</p>
        <p><strong>מצב:</strong> ${statusSelect.value || "כל המצבים"}</p>
        <p><strong>סה"כ תיקים:</strong> ${casesInRoute.length}</p>
        <p><strong>סה"כ חוב:</strong> ₪ ${totalDebt.toLocaleString()}</p>
      </div>
    `,

    data: casesInRoute,

    renderItem: c => `
      <div class="case-card">
       <h3 class="case-title">תיק #${c.caseId}</h3>
        <div><strong>מספר תיק פנימי:</strong> ${c.caseId}</div>
        <div><strong>מספר חיצוני:</strong> ${c.externalCaseNumber}</div>
        <div><strong>מצב נוכחי:</strong> ${c.statusName}</div>
        <div><strong>חוב:</strong>₪ ${(c.debt ?? 0).toLocaleString()}</div>
        <div><strong>נוצר בתאריך:</strong> ${new Date(c.createdAt).toLocaleString("he-IL")}</div>
        <div><strong>עודכן בתאריך:</strong> ${new Date(c.updatedAt).toLocaleString("he-IL")}</div>
      </div>
    `
  });
        // <div><strong>נוצר בתאריך:</strong> ${formatDate(c.createdAt)}</div>
        // <div><strong>עודכן בתאריך:</strong> ${formatDate(c.updatedAt)}</div>
}


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
