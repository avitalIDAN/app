let allHistory = [];

async function renderHistory() {
  allHistory = await historyService.getAllHistory();

  fillHistoryFilters(allHistory);
  renderHistoryTable(allHistory);
}

function fillHistoryFilters(history) {
  const userSelect = document.getElementById("filterUser");
  const actionSelect = document.getElementById("filterAction");

  const users = [...new Set(history.map(h => h.user))];
  const actions = [...new Set(history.map(h => h.action))];

  userSelect.innerHTML = `<option value="">כל המשתמשים</option>`;
  actionSelect.innerHTML = `<option value="">כל הפעולות</option>`;

  users.forEach(u => {
    userSelect.innerHTML += `<option value="${u}">${u}</option>`;
  });

  actions.forEach(a => {
    actionSelect.innerHTML += `<option value="${a}">${a}</option>`;
  });
}

function renderHistoryTable(history) {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  history.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.action}</td>
      <td>${h.user}</td>
      <td>${h.oldvalue ?? "-"}</td>
      <td>${h.newvalue ?? "-"}</td>
      <td>${new Date(h.timestamp).toLocaleString("he-IL")}</td>
    `;
    tbody.appendChild(tr);
  });
}

function applyHistoryFilters() {
  const user = document.getElementById("filterUser").value;
  const action = document.getElementById("filterAction").value;
  const fromDate = document.getElementById("filterFromDate").value;
  const toDate = document.getElementById("filterToDate").value;

  let filtered = [...allHistory];

  if (user) {
    filtered = filtered.filter(h => h.user === user);
  }

  if (action) {
    filtered = filtered.filter(h => h.action === action); //לפי מזהה..
  }

  if (fromDate) {
    filtered = filtered.filter(h => h.timestamp >= fromDate);
  }

  if (toDate) {
    filtered = filtered.filter(h => h.timestamp <= toDate + "T23:59:59");
  }

  renderHistoryTable(filtered);
}

function resetHistoryFilters() {
  document.getElementById("filterUser").value = "";
  document.getElementById("filterAction").value = "";
  document.getElementById("filterFromDate").value = "";
  document.getElementById("filterToDate").value = "";

  renderHistoryTable(allHistory);
}
