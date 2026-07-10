let groupsRows = [];

function getGroupsScreenAccess() {
  return {
    canViewGroups: permissionService.canViewTable("groups"),
    canEditGroups:
      permissionService.canEditScreen("groups") &&
      permissionService.canEditTable("groups")
  };
}

async function renderGroups() {
  const access = getGroupsScreenAccess();
  const tbody = document.getElementById("groupsTable");
  const addBtn = document.getElementById("addGroupBtn");
  const nameInput = document.getElementById("groupNameInput");

  addBtn.disabled = !access.canEditGroups;
  nameInput.disabled = !access.canEditGroups;

  if (!access.canViewGroups) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">אין הרשאה לנתונים</td>
      </tr>
    `;
    return;
  }

  groupsRows = await debtTablesService.getGroups();
  renderGroupsTable();
}

function renderGroupsTable() {
  const access = getGroupsScreenAccess();
  const tbody = document.getElementById("groupsTable");
  tbody.innerHTML = "";

  if (!groupsRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">לא נמצאו קבוצות</td>
      </tr>
    `;
    return;
  }

  groupsRows.forEach(group => {
    tbody.innerHTML += `
      <tr>
        <td>${group.groupId}</td>
        <td>${group.name || ""}</td>
        <td>
          <button class="btn btn--secondary" ${access.canEditGroups ? "" : "disabled"} onclick="editGroup(${group.groupId})">
            עריכה
          </button>
        </td>
      </tr>
    `;
  });
}

async function addGroup() {
  const access = getGroupsScreenAccess();

  if (!access.canEditGroups) {
    alert("אין הרשאה להוספת קבוצות");
    return;
  }

  const input = document.getElementById("groupNameInput");
  const name = input.value.trim();

  if (!name) {
    alert("יש להזין שם קבוצה");
    return;
  }

  await debtTablesService.createGroup({ name });

  input.value = "";
  await renderGroups();
}

async function editGroup(groupId) {
  const access = getGroupsScreenAccess();

  if (!access.canEditGroups) {
    alert("אין הרשאה לעריכת קבוצות");
    return;
  }

  const group = groupsRows.find(item => item.groupId == groupId);
  if (!group) return;

  const newName = prompt("שם קבוצה", group.name || "");

  if (newName === null) {
    return;
  }

  const trimmedName = newName.trim();

  if (!trimmedName) {
    alert("שם קבוצה לא יכול להיות ריק");
    return;
  }

  await debtTablesService.updateGroup(groupId, { name: trimmedName });
  await renderGroups();
}

window.renderGroups = renderGroups;
window.addGroup = addGroup;
window.editGroup = editGroup;