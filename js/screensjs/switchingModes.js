async function renderSwitchingModes() {
  const cases = await caseService.getAllCases();
  const tbody = document.getElementById("casesTable");
  tbody.innerHTML = "";

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

function toCaseScreen(caseId){
    const x = caseId;
//הפנייה לתיק- מסך הצגת תיק
}
window.renderSwitchingModes = renderSwitchingModes;
