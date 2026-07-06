let allHistory = [];

async function renderHistory() {
  // מסך ההיסטוריה עצמו נטען לפי הרשאת מסך.
  // כאן בודקים את הרשאת הנתונים בפועל.
  if (!permissionService.canViewTable("history")) {
    allHistory = [];
    resetHistoryFilterOptions();
    renderHistoryNoDataPermission();
    return;
  }

  allHistory = await historyService.getAllHistory();

  fillHistoryFilters(allHistory);
  renderHistoryTable(allHistory);
}

function resetHistoryFilterOptions() {
  const userSelect = document.getElementById("filterUser");
  const actionSelect = document.getElementById("filterAction");

  userSelect.innerHTML = `<option value="">כל המשתמשים</option>`;
  actionSelect.innerHTML = `<option value="">כל הפעולות</option>`;

  document.getElementById("filterFromDate").value = "";
  document.getElementById("filterToDate").value = "";
}

function renderHistoryNoDataPermission() {
  const tbody = document.getElementById("historyTableBody");

  tbody.innerHTML = `
    <tr>
      <td colspan="5">אין הרשאה לנתונים</td>
    </tr>
  `;
}

function fillHistoryFilters(history) {
  const userSelect = document.getElementById("filterUser");
  const actionSelect = document.getElementById("filterAction");

  const users = [...new Set(history.map(h => h.username).filter(Boolean))];
  const actions = [...new Set(history.map(h => h.description || h.actionName).filter(Boolean))];

  userSelect.innerHTML = `<option value="">כל המשתמשים</option>`;
  actionSelect.innerHTML = `<option value="">כל הפעולות</option>`;

  users.forEach(username => {
    userSelect.innerHTML += `<option value="${username}">${username}</option>`;
  });

  actions.forEach(action => {
    actionSelect.innerHTML += `<option value="${action}">${action}</option>`;
  });
}

function renderHistoryTable(history) {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  if (!history.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">לא נמצאו פעולות</td>
      </tr>
    `;
    return;
  }

  history.forEach(h => {
    const tr = document.createElement("tr");

    const action = h.description || h.actionName || "-";
    const username = h.username || "-";
    const beforeText = h.beforeText || "-";
    const afterText = h.afterText || "-";
    const actionDate = h.actionDate
      ? new Date(h.actionDate).toLocaleString("he-IL")
      : "-";

    tr.innerHTML = `
      <td>${action}</td>
      <td>${username}</td>
      <td>${beforeText}</td>
      <td>${afterText}</td>
      <td>${actionDate}</td>
    `;

    tbody.appendChild(tr);
  });
}

function applyHistoryFilters() {
  // אם אין הרשאת נתונים, גם כפתור הסינון לא ינסה לעבוד על מערך ריק מטעה.
  if (!permissionService.canViewTable("history")) {
    renderHistoryNoDataPermission();
    return;
  }

  const user = document.getElementById("filterUser").value;
  const action = document.getElementById("filterAction").value;
  const fromDate = document.getElementById("filterFromDate").value;
  const toDate = document.getElementById("filterToDate").value;

  let filtered = [...allHistory];

  if (user) {
    filtered = filtered.filter(h => h.username === user);
  }

  if (action) {
    filtered = filtered.filter(h => (h.description || h.actionName) === action);
  }

  if (fromDate) {
    filtered = filtered.filter(h => h.actionDate >= fromDate);
  }

  if (toDate) {
    filtered = filtered.filter(h => h.actionDate <= toDate + "T23:59:59");
  }

  renderHistoryTable(filtered);
}

function resetHistoryFilters() {
  resetHistoryFilterOptions();

  if (!permissionService.canViewTable("history")) {
    renderHistoryNoDataPermission();
    return;
  }

  renderHistoryTable(allHistory);
}