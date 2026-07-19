let statusesRouteRows = [];
let statusesOriginalDebtTypesRows = [];
let editingRouteStatusKey = null;

function getStatusesScreenAccess() {
  return {
    canView:
      permissionService.canViewScreen("statusesInRoute") &&
      permissionService.canViewTable("routes") &&
      permissionService.canViewTable("statuses"),

    canEdit:
      permissionService.canEditScreen("statusesInRoute") &&
      permissionService.canEditTable("statuses"),

    canViewOriginalDebtTypes:
      permissionService.canViewTable("originalDebtTypes")
  };
}

async function renderStatusesInRoute() {
  const access = getStatusesScreenAccess();
  const routeSelect = document.getElementById("routeSelect");
  const tbody = document.getElementById("statusesTable");

  bindStatusesScreenEvents();
  setStatusesFormEnabled(access.canEdit);

  if (!access.canView) {
    routeSelect.disabled = true;
    resetStatusForm();

    tbody.innerHTML = `
      <tr>
        <td colspan="13">אין הרשאה לנתונים</td>
      </tr>
    `;

    return;
  }

  const routes = await routeService.getAll();

  routeSelect.innerHTML = "";

  routes.forEach(route => {
    const option = document.createElement("option");
    option.value = route.routeId;
    option.textContent = `${route.routeId} - ${route.name}`;
    routeSelect.appendChild(option);
  });

  const defaultRoute =
    routes.find(route => route.isActive !== false) ||
    routes[0];

  if (!defaultRoute) {
    routeSelect.disabled = true;

    tbody.innerHTML = `
      <tr>
        <td colspan="13">לא נמצאו מסלולים</td>
      </tr>
    `;

    return;
  }

  routeSelect.disabled = false;
  routeSelect.value = defaultRoute.routeId;

  await loadStatusesForSelectedRoute();
}

function bindStatusesScreenEvents() {
  const routeSelect = document.getElementById("routeSelect");
  const closedInput = document.getElementById("statusIsClosedInput");

  routeSelect.onchange = async () => {
    cancelStatusEdit();
    await loadStatusesForSelectedRoute();
  };

  closedInput.onchange = syncNextStatusControl;
}

async function loadStatusesForSelectedRoute() {
  const access = getStatusesScreenAccess();
  const routeId = document.getElementById("routeSelect").value;

  if (!routeId) {
    statusesRouteRows = [];
    renderStatusesTable();
    return;
  }

  const requests = [
    statusService.getAllByRoute(routeId)
  ];

  if (access.canViewOriginalDebtTypes) {
    requests.push(debtService.getOriginalDebtTypes());
  } else {
    requests.push(Promise.resolve([]));
  }

  [
    statusesRouteRows,
    statusesOriginalDebtTypesRows
  ] = await Promise.all(requests);

  statusesRouteRows.sort((first, second) =>
    Number(first.statusId) - Number(second.statusId)
  );

  populateNextStatusSelect();
  populateOriginalDebtTypesSelect();
  resetStatusForm();
  renderStatusesTable();
}

function populateNextStatusSelect(selectedStatusId = null) {
  const select = document.getElementById("nextStatusSelect");
  const currentStatusId = Number(selectedStatusId);

  select.innerHTML = `<option value="">ללא מצב הבא</option>`;

  statusesRouteRows
    .filter(status =>
      status.isActive !== false &&
      Number(status.statusId) !== currentStatusId
    )
    .forEach(status => {
      const option = document.createElement("option");
      option.value = status.statusId;
      option.textContent =
        `${status.statusId} - ${status.statusName || status.name}`;

      select.appendChild(option);
    });
}

function populateOriginalDebtTypesSelect() {
  const access = getStatusesScreenAccess();
  const select = document.getElementById("defaultChargeTypeSelect");

  select.innerHTML = `<option value="">ללא סוג חיוב מקור</option>`;

  if (!access.canViewOriginalDebtTypes) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "אין הרשאה לנתוני סוגי חיוב מקור";
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  statusesOriginalDebtTypesRows
    .filter(type => type.isActive !== false)
    .forEach(type => {
      const option = document.createElement("option");
      option.value = type.originalCode;
      option.textContent =
        `${type.originalCode} - ${type.originalName}`;

      select.appendChild(option);
    });
}

function renderStatusesTable() {
  const access = getStatusesScreenAccess();
  const tbody = document.getElementById("statusesTable");

  if (!statusesRouteRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13">לא נמצאו מצבים למסלול זה</td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = statusesRouteRows.map(status => {
    const nextStatus = statusesRouteRows.find(item =>
      Number(item.statusId) === Number(status.nextStatusId)
    );

    const originalDebtType = statusesOriginalDebtTypesRows.find(type =>
      String(type.originalCode) === String(status.defaultChargeTypeId)
    );

    const canChangeActive =
      access.canEdit &&
      status.isSystemStatus !== true;

    return `
      <tr>
        <td>${status.statusId}</td>
        <td>${escapeHtml(status.statusCode || status.code || "")}</td>
        <td>${escapeHtml(status.statusName || status.name || "")}</td>
        <td>${
          nextStatus
            ? `${nextStatus.statusId} - ${escapeHtml(nextStatus.statusName || nextStatus.name)}`
            : "-"
        }</td>
        <td>${status.isActive !== false ? "כן" : "לא"}</td>
        <td>${status.isClosedStatus === true ? "כן" : "לא"}</td>
        <td>${formatStatusFee(status.feeAmount)}</td>
        <td>${escapeHtml(status.letterTemplateId || "-")}</td>
        <td>${
          originalDebtType
            ? `${originalDebtType.originalCode} - ${escapeHtml(originalDebtType.originalName)}`
            : "-"
        }</td>
        <td>${escapeHtml(status.defaultActionCode || "-")}</td>
        <td>${escapeHtml(status.defaultNote || "-")}</td>
        <td>${status.isSystemStatus === true ? "כן" : "לא"}</td>
        <td>
          <button
            class="btn btn--primary"
            type="button"
            ${access.canEdit ? "" : "disabled"}
            onclick="editStatus(${status.key})"
          >
            עריכה
          </button>

          <button
            class="btn btn--secondary"
            type="button"
            ${canChangeActive ? "" : "disabled"}
            onclick="toggleStatusActive(${status.key})"
          >
            ${status.isActive !== false ? "השבתה" : "הפעלה"}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function resetStatusForm() {
  editingRouteStatusKey = null;

  const nextStatusId = statusesRouteRows.length
    ? Math.max(
        ...statusesRouteRows.map(status => Number(status.statusId))
      ) + 1
    : 1;

  document.getElementById("statusIdInput").value = nextStatusId;
  document.getElementById("statusCodeInput").value = "";
  document.getElementById("statusNameInput").value = "";
  document.getElementById("nextStatusSelect").value = "";
  document.getElementById("feeAmountInput").value = "0";
  document.getElementById("letterTemplateIdInput").value = "";
  document.getElementById("defaultChargeTypeSelect").value = "";
  document.getElementById("defaultActionCodeInput").value = "";
  document.getElementById("defaultNoteInput").value = "";
  document.getElementById("statusIsActiveInput").checked = true;
  document.getElementById("statusIsClosedInput").checked = false;

  document.getElementById("saveStatusBtn").textContent = "הוספת מצב";
  document.getElementById("cancelStatusEditBtn").disabled = true;

  populateNextStatusSelect();
  setStatusIdentityFieldsLocked(false);
  syncNextStatusControl();
  setStatusesFormEnabled(getStatusesScreenAccess().canEdit);
}

function editStatus(key) {
  const access = getStatusesScreenAccess();

  if (!access.canEdit) {
    alert("אין הרשאה לעריכת מצבים");
    return;
  }

  const status = statusesRouteRows.find(item => item.key == key);

  if (!status) {
    alert("המצב לא נמצא");
    return;
  }

  editingRouteStatusKey = key;

  document.getElementById("statusIdInput").value = status.statusId;
  document.getElementById("statusCodeInput").value =
    status.statusCode || status.code || "";

  document.getElementById("statusNameInput").value =
    status.statusName || status.name || "";

  document.getElementById("feeAmountInput").value =
    status.feeAmount ?? 0;

  document.getElementById("letterTemplateIdInput").value =
    status.letterTemplateId ?? "";

  document.getElementById("defaultChargeTypeSelect").value =
    status.defaultChargeTypeId ?? "";

  document.getElementById("defaultActionCodeInput").value =
    status.defaultActionCode ?? "";

  document.getElementById("defaultNoteInput").value =
    status.defaultNote ?? "";

  document.getElementById("statusIsActiveInput").checked =
    status.isActive !== false;

  document.getElementById("statusIsClosedInput").checked =
    status.isClosedStatus === true;

  populateNextStatusSelect(status.statusId);

  document.getElementById("nextStatusSelect").value =
    status.nextStatusId ?? "";

  document.getElementById("saveStatusBtn").textContent =
    "שמירת שינויים";

  document.getElementById("cancelStatusEditBtn").disabled = false;

  setStatusIdentityFieldsLocked(status.isSystemStatus === true);
  syncNextStatusControl();
  setStatusesFormEnabled(true);
}

function setStatusIdentityFieldsLocked(isSystemStatus) {
  document.getElementById("statusIdInput").disabled = isSystemStatus;
  document.getElementById("statusCodeInput").disabled = isSystemStatus;
  document.getElementById("statusIsActiveInput").disabled = isSystemStatus;
  document.getElementById("statusIsClosedInput").disabled = isSystemStatus;
}

function syncNextStatusControl() {
  const isClosed =
    document.getElementById("statusIsClosedInput").checked;

  const nextStatusSelect = document.getElementById("nextStatusSelect");

  if (isClosed) {
    nextStatusSelect.value = "";
  }

  nextStatusSelect.disabled =
    !getStatusesScreenAccess().canEdit || isClosed;
}

function setStatusesFormEnabled(enabled) {
  const isEditing = editingRouteStatusKey !== null;

  const editedStatus = statusesRouteRows.find(item =>
    item.key == editingRouteStatusKey
  );

  const isSystemStatus = editedStatus?.isSystemStatus === true;

  document.getElementById("statusIdInput").disabled =
    !enabled || isSystemStatus;

  document.getElementById("statusCodeInput").disabled =
    !enabled || isSystemStatus;

  document.getElementById("statusNameInput").disabled = !enabled;
  document.getElementById("feeAmountInput").disabled = !enabled;
  document.getElementById("letterTemplateIdInput").disabled = !enabled;

  document.getElementById("defaultChargeTypeSelect").disabled =
    !enabled || !getStatusesScreenAccess().canViewOriginalDebtTypes;

  document.getElementById("defaultActionCodeInput").disabled = !enabled;
  document.getElementById("defaultNoteInput").disabled = !enabled;

  document.getElementById("statusIsActiveInput").disabled =
    !enabled || isSystemStatus;

  document.getElementById("statusIsClosedInput").disabled =
    !enabled || isSystemStatus;

  document.getElementById("saveStatusBtn").disabled = !enabled;

  document.getElementById("cancelStatusEditBtn").disabled =
    !enabled || !isEditing;

  syncNextStatusControl();
}

function readStatusForm() {
  const nextStatusValue =
    document.getElementById("nextStatusSelect").value;

  const originalDebtTypeValue =
    document.getElementById("defaultChargeTypeSelect").value;

  const letterTemplateId =
    document.getElementById("letterTemplateIdInput").value.trim();

  const defaultActionCode =
    document.getElementById("defaultActionCodeInput").value.trim();

  return {
    routeId: Number(document.getElementById("routeSelect").value),
    statusId: Number(document.getElementById("statusIdInput").value),
    statusCode: document.getElementById("statusCodeInput").value.trim(),
    statusName: document.getElementById("statusNameInput").value.trim(),

    nextStatusId: nextStatusValue === ""
      ? null
      : Number(nextStatusValue),

    isActive: document.getElementById("statusIsActiveInput").checked,
    isClosedStatus: document.getElementById("statusIsClosedInput").checked,

    feeAmount: Number(
      document.getElementById("feeAmountInput").value || 0
    ),

    letterTemplateId: letterTemplateId || null,

    // הערך הוא originalCode מתוך originalDebtTypes.
    defaultChargeTypeId: originalDebtTypeValue === ""
      ? null
      : Number(originalDebtTypeValue),

    defaultActionCode: defaultActionCode || null,
    defaultNote: document.getElementById("defaultNoteInput").value.trim()
  };
}

async function saveStatus() {
  const access = getStatusesScreenAccess();

  if (!access.canEdit) {
    alert("אין הרשאה לעדכון מצבים");
    return;
  }

  const statusData = readStatusForm();

  try {
    if (editingRouteStatusKey === null) {
      await statusService.createStatus(statusData);
    } else {
      await statusService.updateStatus(
        editingRouteStatusKey,
        statusData
      );
    }

    await loadStatusesForSelectedRoute();
  } catch (error) {
    alert(error.message || "לא ניתן לשמור את המצב");
  }
}

function cancelStatusEdit() {
  if (editingRouteStatusKey === null) {
    return;
  }

  resetStatusForm();
}

async function toggleStatusActive(key) {
  const access = getStatusesScreenAccess();

  if (!access.canEdit) {
    alert("אין הרשאה לעדכון מצבים");
    return;
  }

  const status = statusesRouteRows.find(item => item.key == key);

  if (!status) {
    alert("המצב לא נמצא");
    return;
  }

  if (status.isSystemStatus === true) {
    alert("לא ניתן להשבית או להפעיל מצב בסיסי");
    return;
  }

  try {
    if (status.isActive !== false) {
      const openCasesCount =
        await statusService.getOpenCasesCountByStatus(
          status.routeId,
          status.statusId
        );

      const message = openCasesCount === null
        ? "לא ניתן לבדוק אם קיימים תיקים פתוחים במצב זה. להמשיך בהשבתה?"
        : openCasesCount > 0
          ? `במצב "${status.statusName || status.name}" קיימים ${openCasesCount} תיקים פתוחים. ההשבתה תשפיע על פעולות עתידיות. להמשיך?`
          : `האם להשבית את המצב "${status.statusName || status.name}"?`;

      if (!confirm(message)) {
        return;
      }

      await statusService.deactivateStatus(key);
    } else {
      await statusService.updateStatus(key, {
        isActive: true
      });
    }

    await loadStatusesForSelectedRoute();
  } catch (error) {
    alert(error.message || "לא ניתן לעדכן את המצב");
  }
}

function formatStatusFee(value) {
  return Number(value || 0).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

window.renderStatusesInRoute = renderStatusesInRoute;
window.saveStatus = saveStatus;
window.editStatus = editStatus;
window.cancelStatusEdit = cancelStatusEdit;
window.toggleStatusActive = toggleStatusActive;