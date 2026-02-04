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
        <button onclick="renderCaseScreen(${c.caseId})">
          שינוי מצב
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.renderSwitchingModes = renderSwitchingModes;
