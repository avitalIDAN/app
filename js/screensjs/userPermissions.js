let permissionsUsers = [];
let permissionsRoles = [];
let selectedUserPermissionRows = [];
let selectedRolePermissionRows = [];
let editingUserPermissionId = null;

function escapePermissionsHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function getUserPermissionsScreenAccess() {
  return { canManage: userPermissionsService.canManage() };
}

async function renderUserPermissions() {
  permissionsUsers = await userPermissionsService.getUsers();
  permissionsRoles = await userPermissionsService.getRoles();
  populatePermissionsUserSelect();
  populateApplyRoleSelect();
  populateRoleEditorSelect();
  refreshUserPermissionResources();
  refreshRolePermissionResources();
  refreshComparisonTargets();
  updateUserPermissionsControls();
  await onPermissionsUserChange();
  onRoleEditorChange();
}

function populatePermissionsUserSelect() {
  const select = document.getElementById("permissionsUserSelect");
  select.innerHTML = permissionsUsers.map(user => `<option value="${user.userId}">${escapePermissionsHtml(user.displayName || user.username)} (${escapePermissionsHtml(user.username)})</option>`).join("");
}

function populateApplyRoleSelect() {
  const select = document.getElementById("applyRoleSelect");
  select.innerHTML = permissionsRoles.filter(role => role.isActive).map(role => `<option value="${role.roleId}">${escapePermissionsHtml(role.roleName)}</option>`).join("");
}

function populateRoleEditorSelect() {
  const select = document.getElementById("roleEditorSelect");
  select.innerHTML = permissionsRoles.map(role => `<option value="${role.roleId}">${escapePermissionsHtml(role.roleName)}${role.isSystemRole ? " (מובנה)" : ""}</option>`).join("");
}

function populateResourceSelect(typeSelectId, resourceSelectId) {
  const type = document.getElementById(typeSelectId).value;
  document.getElementById(resourceSelectId).innerHTML = userPermissionsService.getResources(type).map(([name, label]) => `<option value="${name}">${escapePermissionsHtml(label)}</option>`).join("");
  togglePermissionFields(typeSelectId, resourceSelectId);
}

function togglePermissionFields(typeSelectId, resourceSelectId) {
  const isScreen = document.getElementById(typeSelectId).value === "screen";
  const prefix = typeSelectId.startsWith("user") ? "user" : "role";
  document.getElementById(`${prefix}BlockView`).disabled = isScreen;
  document.getElementById(`${prefix}BlockEdit`).disabled = isScreen;
  document.getElementById(`${prefix}CanView`).disabled = !isScreen;
  document.getElementById(`${prefix}CanEdit`).disabled = !isScreen;
}

function resetPermissionControls(prefix) {
  const type = document.getElementById(`${prefix}PermissionType`).value;
  const isScreen = type === "screen";
  document.getElementById(`${prefix}CanView`).checked = isScreen;
  document.getElementById(`${prefix}CanEdit`).checked = false;
  document.getElementById(`${prefix}BlockView`).checked = false;
  document.getElementById(`${prefix}BlockEdit`).checked = !isScreen;
}

function refreshUserPermissionResources() {
  resetPermissionControls("user");
  populateResourceSelect("userPermissionType", "userPermissionResource");
}

function refreshRolePermissionResources() {
  resetPermissionControls("role");
  populateResourceSelect("rolePermissionType", "rolePermissionResource");
}

function getPermissionFromControls(prefix) {
  return {
    resourceType: document.getElementById(`${prefix}PermissionType`).value,
    resourceName: document.getElementById(`${prefix}PermissionResource`).value,
    canView: document.getElementById(`${prefix}CanView`).checked,
    canEdit: document.getElementById(`${prefix}CanEdit`).checked,
    blockView: document.getElementById(`${prefix}BlockView`).checked,
    blockEdit: document.getElementById(`${prefix}BlockEdit`).checked
  };
}

function renderPermissionFlags(permission) {
  const normalized = userPermissionsService.normalizePermission(permission);
  if (normalized.resourceType === "screen") return { view: normalized.canView ? "מורשה" : "לא מורשה", edit: normalized.canEdit ? "מורשה" : "לא מורשה" };
  return { view: normalized.blockView ? "חסום" : "מותר", edit: normalized.blockEdit ? "חסום" : "מותר" };
}

async function onPermissionsUserChange() {
  const userId = document.getElementById("permissionsUserSelect").value;
  selectedUserPermissionRows = await userPermissionsService.getUserPermissions(userId);
  renderSelectedUserPermissions();
  await renderPermissionsComparison();
}

function renderSelectedUserPermissions() {
  const canManage = getUserPermissionsScreenAccess().canManage;
  const tbody = document.getElementById("selectedUserPermissionsTable");
  if (!selectedUserPermissionRows.length) {
    tbody.innerHTML = `<tr><td colspan="6">לא נמצאו הרשאות ישירות למשתמש</td></tr>`;
    return;
  }
  tbody.innerHTML = selectedUserPermissionRows.map(permission => {
    const isEditing = editingUserPermissionId == permission.userPermissionId;
    const flags = renderPermissionFlags(permission);
    const normalized = userPermissionsService.normalizePermission(permission);
    const source = permission.isManualOverride ? "ידני" : (permissionsRoles.find(role => role.roleId == permission.sourceRoleId)?.roleName || "תפקיד");
    const viewCell = isEditing
      ? permission.resourceType === "screen"
        ? `<label class="permission-checkbox"><input id="editPermissionView-${permission.userPermissionId}" type="checkbox" ${normalized.canView ? "checked" : ""}> מורשה</label>`
        : `<label class="permission-checkbox"><input id="editPermissionBlockView-${permission.userPermissionId}" type="checkbox" ${normalized.blockView ? "checked" : ""}> חסום</label>`
      : flags.view;
    const editCell = isEditing
      ? permission.resourceType === "screen"
        ? `<label class="permission-checkbox"><input id="editPermissionEdit-${permission.userPermissionId}" type="checkbox" ${normalized.canEdit ? "checked" : ""}> מורשה</label>`
        : `<label class="permission-checkbox"><input id="editPermissionBlockEdit-${permission.userPermissionId}" type="checkbox" ${normalized.blockEdit ? "checked" : ""}> חסום</label>`
      : flags.edit;

    return `<tr><td>${permission.resourceType === "screen" ? "מסך" : "טבלה"}</td><td>${escapePermissionsHtml(userPermissionsService.getResourceLabel(permission.resourceType, permission.resourceName))}</td><td>${viewCell}</td><td>${editCell}</td><td>${escapePermissionsHtml(source)}</td><td><button class="btn btn--primary" type="button" ${canManage ? "" : "disabled"} onclick="${isEditing ? `saveSelectedUserPermission(${permission.userPermissionId})` : `editSelectedUserPermission(${permission.userPermissionId})`}">${isEditing ? "שמירה" : "עריכה"}</button> <button class="btn btn--destructive" type="button" ${canManage ? "" : "disabled"} onclick="deleteSelectedUserPermission(${permission.userPermissionId})">הסרה</button></td></tr>`;
  }).join("");
}

function editSelectedUserPermission(userPermissionId) {
  editingUserPermissionId = userPermissionId;
  renderSelectedUserPermissions();
}

async function saveSelectedUserPermission(userPermissionId) {
  try {
    const permission = selectedUserPermissionRows.find(item => item.userPermissionId == userPermissionId);
    if (!permission) return;

    const isScreen = permission.resourceType === "screen";
    await userPermissionsService.updateUserPermission(userPermissionId, {
      resourceType: permission.resourceType,
      resourceName: permission.resourceName,
      canView: isScreen ? document.getElementById(`editPermissionView-${userPermissionId}`).checked : false,
      canEdit: isScreen ? document.getElementById(`editPermissionEdit-${userPermissionId}`).checked : false,
      blockView: !isScreen ? document.getElementById(`editPermissionBlockView-${userPermissionId}`).checked : false,
      blockEdit: !isScreen ? document.getElementById(`editPermissionBlockEdit-${userPermissionId}`).checked : false
    });

    editingUserPermissionId = null;
    await onPermissionsUserChange();
  } catch (error) {
    alert(error.message);
  }
}

async function addSelectedUserPermission() {
  try {
    const userId = document.getElementById("permissionsUserSelect").value;
    await userPermissionsService.addUserPermission(userId, getPermissionFromControls("user"));
    await onPermissionsUserChange();
  } catch (error) { alert(error.message); }
}

async function deleteSelectedUserPermission(userPermissionId) {
  if (!confirm("להסיר את רשומת ההרשאה?")) return;
  try {
    await userPermissionsService.deleteUserPermission(userPermissionId);
    await onPermissionsUserChange();
  } catch (error) { alert(error.message); }
}

async function applySelectedRole(mode) {
  if (mode === "replace" && !confirm("החלפת תפקיד תמחק את כל ההרשאות הקיימות של המשתמש. להמשיך?")) return;
  try {
    const result = await userPermissionsService.applyRole(document.getElementById("permissionsUserSelect").value, document.getElementById("applyRoleSelect").value, mode);
    alert(`התפקיד ${result.roleName} הוחל. נוספו ${result.added} הרשאות.`);
    await onPermissionsUserChange();
  } catch (error) { alert(error.message); }
}

function refreshComparisonTargets() {
  const type = document.getElementById("comparisonType").value;
  const items = type === "user" ? permissionsUsers.map(user => ({ value: user.userId, label: `${user.displayName || user.username} (${user.username})` })) : permissionsRoles.map(role => ({ value: role.roleId, label: role.roleName }));
  document.getElementById("comparisonTarget").innerHTML = items.map(item => `<option value="${item.value}">${escapePermissionsHtml(item.label)}</option>`).join("");
  renderPermissionsComparison();
}

async function renderPermissionsComparison() {
  const userId = document.getElementById("permissionsUserSelect")?.value;
  if (userId === undefined) return;
  const targetType = document.getElementById("comparisonType").value;
  const targetId = document.getElementById("comparisonTarget").value;
  const userPermissions = await userPermissionsService.getUserPermissions(userId);
  const targetPermissions = targetType === "user" ? await userPermissionsService.getUserPermissions(targetId) : await userPermissionsService.getRolePermissions(targetId);
  const comparisonResources = [];
  targetPermissions.forEach(permission => {
    const key = `${permission.resourceType}:${permission.resourceName}`;
    if (!comparisonResources.some(item => item.key === key)) {
      comparisonResources.push({ key, type: permission.resourceType, name: permission.resourceName, label: userPermissionsService.getResourceLabel(permission.resourceType, permission.resourceName) });
    }
  });
  const rows = comparisonResources.map(({ type, name, label }) => {
    const userAccess = userPermissionsService.getEffectiveAccess(userPermissions, type, name);
    const targetAccess = userPermissionsService.getEffectiveAccess(targetPermissions, type, name);
    const same = userAccess.canView === targetAccess.canView && userAccess.canEdit === targetAccess.canEdit;
    const flags = type === "screen"
      ? { view: targetAccess.canView ? "מורשה" : "לא מורשה", edit: targetAccess.canEdit ? "מורשה" : "לא מורשה" }
      : { view: targetAccess.canView ? "מותר" : "חסום", edit: targetAccess.canEdit ? "מותר" : "חסום" };
    return { same, html: `<tr class="${same ? "permissions-comparison--same" : "permissions-comparison--different"}"><td>${type === "screen" ? "מסך" : "טבלה"}</td><td>${escapePermissionsHtml(label)}</td><td>${flags.view}</td><td>${flags.edit}</td><td>${same ? '<span class="permission-result permission-result--same">קיימת</span>' : `<button class="btn btn--primary" type="button" ${getUserPermissionsScreenAccess().canManage ? "" : "disabled"} onclick="addComparisonPermission('${type}', '${name}')">הוספת הרשאה</button>`}</td></tr>` };
  }).sort((a, b) => Number(b.same) - Number(a.same));
  document.getElementById("permissionsComparisonTable").innerHTML = rows.length ? rows.map(row => row.html).join("") : `<tr><td colspan="5">ליעד שנבחר אין הרשאות מוגדרות</td></tr>`;
}

async function addComparisonPermission(resourceType, resourceName) {
  try {
    const targetType = document.getElementById("comparisonType").value;
    const targetId = document.getElementById("comparisonTarget").value;
    const targetPermissions = targetType === "user" ? await userPermissionsService.getUserPermissions(targetId) : await userPermissionsService.getRolePermissions(targetId);
    const matchingPermissions = targetPermissions.filter(permission => permission.resourceType === resourceType && permission.resourceName === resourceName);
    for (const permission of matchingPermissions) {
      await userPermissionsService.addUserPermission(document.getElementById("permissionsUserSelect").value, permission);
    }
    await onPermissionsUserChange();
  } catch (error) { alert(error.message); }
}

function onRoleEditorChange() {
  const role = permissionsRoles.find(item => item.roleId == document.getElementById("roleEditorSelect").value);
  if (!role) return;
  document.getElementById("roleNameInput").value = role.roleName || "";
  document.getElementById("roleDescriptionInput").value = role.description || "";
  document.getElementById("roleIsActive").checked = role.isActive === true;
  renderSelectedRolePermissions();
  userPermissionsService.getRolePermissions(role.roleId).then(rows => { selectedRolePermissionRows = rows; renderSelectedRolePermissions(); });
  updateUserPermissionsControls();
}

function renderSelectedRolePermissions() {
  const canManage = getUserPermissionsScreenAccess().canManage;
  const role = permissionsRoles.find(item => item.roleId == document.getElementById("roleEditorSelect").value);
  const tbody = document.getElementById("selectedRolePermissionsTable");
  if (!selectedRolePermissionRows.length) { tbody.innerHTML = `<tr><td colspan="5">לא נמצאו הרשאות לתפקיד</td></tr>`; return; }
  tbody.innerHTML = selectedRolePermissionRows.map((permission, index) => {
    const flags = renderPermissionFlags(permission);
    return `<tr><td>${permission.resourceType === "screen" ? "מסך" : "טבלה"}</td><td>${escapePermissionsHtml(userPermissionsService.getResourceLabel(permission.resourceType, permission.resourceName))}</td><td>${flags.view}</td><td>${flags.edit}</td><td><button class="btn btn--destructive" type="button" ${canManage && !role.isSystemRole ? "" : "disabled"} onclick="deleteSelectedRolePermission(${index})">הסרה</button></td></tr>`;
  }).join("");
}

async function createPermissionRole() {
  try {
    const role = await userPermissionsService.createRole({ roleName: document.getElementById("roleNameInput").value, description: document.getElementById("roleDescriptionInput").value });
    permissionsRoles = await userPermissionsService.getRoles();
    populateApplyRoleSelect(); populateRoleEditorSelect();
    document.getElementById("roleEditorSelect").value = role.roleId;
    onRoleEditorChange();
  } catch (error) { alert(error.message); }
}

async function saveSelectedRole() {
  try {
    const roleId = document.getElementById("roleEditorSelect").value;
    await userPermissionsService.updateRole(roleId, { roleName: document.getElementById("roleNameInput").value, description: document.getElementById("roleDescriptionInput").value, isActive: document.getElementById("roleIsActive").checked });
    permissionsRoles = await userPermissionsService.getRoles();
    populateApplyRoleSelect(); populateRoleEditorSelect();
    document.getElementById("roleEditorSelect").value = roleId;
    onRoleEditorChange();
  } catch (error) { alert(error.message); }
}

async function addSelectedRolePermission() {
  try {
    await userPermissionsService.addRolePermission(document.getElementById("roleEditorSelect").value, getPermissionFromControls("role"));
    onRoleEditorChange();
  } catch (error) { alert(error.message); }
}

async function deleteSelectedRolePermission(index) {
  if (!confirm("להסיר את הרשאת התפקיד?")) return;
  try {
    await userPermissionsService.deleteRolePermission(document.getElementById("roleEditorSelect").value, selectedRolePermissionRows[index]);
    onRoleEditorChange();
  } catch (error) { alert(error.message); }
}

function updateUserPermissionsControls() {
  const canManage = getUserPermissionsScreenAccess().canManage;
  document.getElementById("userPermissionsAccessMessage").textContent = canManage ? "ניתן לעדכן הרשאות ותפקידים." : "המסך מוצג לקריאה בלבד. עריכה מחייבת הרשאת עריכה למסך ומשתמש מנהל.";
  document.querySelectorAll("#userPermissionsSelect, .user-permissions-screen input, .user-permissions-screen select, .user-permissions-screen button").forEach(element => {
    if (element.id === "permissionsUserSelect" || element.id === "comparisonType" || element.id === "comparisonTarget" || element.id === "roleEditorSelect") return;
    element.disabled = !canManage;
  });
  const role = permissionsRoles.find(item => item.roleId == document.getElementById("roleEditorSelect")?.value);
  if (role?.isSystemRole) {
    ["roleNameInput", "roleDescriptionInput", "roleIsActive", "saveRoleBtn", "rolePermissionType", "rolePermissionResource", "roleCanView", "roleCanEdit", "roleBlockView", "roleBlockEdit", "addRolePermissionBtn"].forEach(id => document.getElementById(id).disabled = true);
  }
  // הרשאות משתמש אינן תלויות בתפקיד הנבחר לעריכה.
  if (canManage) {
    togglePermissionFields("userPermissionType", "userPermissionResource");
  }

  // הרשאות תפקיד נעולות רק כאשר מדובר בתפקיד מובנה.
  if (canManage && !role?.isSystemRole) {
    togglePermissionFields("rolePermissionType", "rolePermissionResource");
  }
  renderSelectedUserPermissions();
  renderSelectedRolePermissions();
}

window.renderUserPermissions = renderUserPermissions;
window.onPermissionsUserChange = onPermissionsUserChange;
window.refreshUserPermissionResources = refreshUserPermissionResources;
window.addSelectedUserPermission = addSelectedUserPermission;
window.editSelectedUserPermission = editSelectedUserPermission;
window.saveSelectedUserPermission = saveSelectedUserPermission;
window.deleteSelectedUserPermission = deleteSelectedUserPermission;
window.applySelectedRole = applySelectedRole;
window.refreshComparisonTargets = refreshComparisonTargets;
window.renderPermissionsComparison = renderPermissionsComparison;
window.addComparisonPermission = addComparisonPermission;
window.onRoleEditorChange = onRoleEditorChange;
window.refreshRolePermissionResources = refreshRolePermissionResources;
window.createPermissionRole = createPermissionRole;
window.saveSelectedRole = saveSelectedRole;
window.addSelectedRolePermission = addSelectedRolePermission;
window.deleteSelectedRolePermission = deleteSelectedRolePermission;
