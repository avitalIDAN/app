let debtTypesRows = [];
let originalDebtTypesRows = [];

function getDebtTypesScreenAccess() {
  const requiredTables = ["debtTypes", "originalDebtTypes"];

  return {
    canView: permissionService.canViewAllTables(requiredTables),
    canEdit:
      permissionService.canEditScreen("debtTypes") &&
      permissionService.canEditTable("debtTypes") &&
      permissionService.canViewTable("originalDebtTypes")
  };
}

async function renderDebtTypes() {
  const access = getDebtTypesScreenAccess();
  const tbody = document.getElementById("debtTypesTable");

  setDebtTypesControlsEnabled(access.canEdit);

  if (!access.canView) {
    debtTypesRows = [];
    originalDebtTypesRows = [];

    tbody.innerHTML = `
      <tr>
        <td colspan="8">אין הרשאה לנתונים</td>
      </tr>
    `;
    return;
  }

  [debtTypesRows, originalDebtTypesRows] = await Promise.all([
    debtTablesService.getDebtTypes(),
    debtTablesService.getOriginalDebtTypes()
  ]);

  debtTypesRows.sort((a, b) =>
    Number(a.originalCode) - Number(b.originalCode) ||
    Number(a.year || 0) - Number(b.year || 0)
  );

  renderDebtTypesSelects();
  renderDebtTypesTable();
  updateNewDebtTypePreview();
}

function setDebtTypesControlsEnabled(enabled) {
  [
    "newOriginalDebtTypeSelect",
    "newDebtTypeYearInput",
    "newDebtTypeNameInput",
    "addDebtTypeBtn",
    // "copyDebtTypeSelect",
    // "copyDebtTypeYearInput",
    // "copyDebtTypeBtn",
    "copySourceYearInput",
    "copyTargetYearInput",
    "copyDebtTypesYearBtn",
    "copyOnlyActiveDebtTypes",
    "rangeOriginalDebtTypeSelect",
    "rangeFromYearInput",
    "rangeToYearInput",
    "addDebtTypesRangeBtn"
  ].forEach(id => {
    const element = document.getElementById(id);

    if (element) {
      element.disabled = !enabled;
    }
  });
}

function renderDebtTypesSelects() {
  const newSelect = document.getElementById("newOriginalDebtTypeSelect");
  const rangeSelect = document.getElementById("rangeOriginalDebtTypeSelect");
//   const copySelect = document.getElementById("copyDebtTypeSelect");

  const originalOptions = originalDebtTypesRows.map(type => `
    <option value="${type.originalCode}">
      ${type.originalCode} - ${type.originalName}
    </option>
  `).join("");

  newSelect.innerHTML = `<option value="">בחר סוג חיוב</option>${originalOptions}`;
  rangeSelect.innerHTML = `<option value="">בחר סוג חיוב</option>${originalOptions}`;

//   copySelect.innerHTML = `
//     <option value="">בחר סוג חיוב להעתקה</option>
//     ${debtTypesRows.map(type => `
//       <option value="${type.debtTypeId}">
//         ${type.name} (${type.enforcementCode})
//       </option>
//     `).join("")}
//   `;

  newSelect.onchange = updateNewDebtTypePreview;
  document.getElementById("newDebtTypeYearInput").oninput = updateNewDebtTypePreview;
}

function updateNewDebtTypePreview() {
  const originalCode = document.getElementById("newOriginalDebtTypeSelect").value;
  const yearInput = document.getElementById("newDebtTypeYearInput");
  const enforcementCodeInput = document.getElementById("newEnforcementCodePreview");
  const nameInput = document.getElementById("newDebtTypeNameInput");

  const originalType = originalDebtTypesRows.find(
    type => String(type.originalCode) === String(originalCode)
  );

  if (!originalType) {
    yearInput.disabled = true;
    yearInput.value = "";
    enforcementCodeInput.value = "";
    nameInput.value = "";
    return;
  }

  const isYearly = originalType.isYearly !== false;
  yearInput.disabled = !isYearly;

  if (!isYearly) {
    yearInput.value = "";
    enforcementCodeInput.value = originalType.originalCode;
    nameInput.value = originalType.originalName;
    return;
  }

  const year = Number(yearInput.value);

  if (!Number.isInteger(year) || year < 2000) {
    enforcementCodeInput.value = "";
    nameInput.value = "";
    return;
  }

  // שני הערכים נוצרים אוטומטית מתוך סוג החיוב המקורי והשנה.
  enforcementCodeInput.value = `${originalType.originalCode}${year}`;
  nameInput.value = `${originalType.originalName} ${year}`;
}

function renderDebtTypesTable() {
  const access = getDebtTypesScreenAccess();
  const tbody = document.getElementById("debtTypesTable");

  if (!debtTypesRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">לא נמצאו סוגי חיוב</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = debtTypesRows.map(type => {
    const originalType = originalDebtTypesRows.find(
      item => String(item.originalCode) === String(type.originalCode)
    );

    return `
      <tr>
        <td>${type.debtTypeId}</td>
        <td>${type.originalCode ?? "-"}</td>
        <td>${originalType?.originalName || "-"}</td>
        <td>${type.year ?? "-"}</td>
        <td>${type.enforcementCode ?? "-"}</td>
        <td>${type.name || "-"}</td>
        <td>${type.isActive === false ? "לא" : "כן"}</td>
        <td>
          <button
            class="btn btn--primary"
            ${access.canEdit ? "" : "disabled"}
            onclick="editDebtType(${type.debtTypeId})"
          >
            עריכה
          </button>

          <button
            class="btn btn--primary"
            ${access.canEdit ? "" : "disabled"}
            onclick="toggleDebtTypeActive(${type.debtTypeId})"
          >
            ${type.isActive === false ? "הפעלה" : "השבתה"}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function addDebtType() {
  if (!getDebtTypesScreenAccess().canEdit) {
    alert("אין הרשאה להוספת סוגי חיוב");
    return;
  }

  const originalCode = document.getElementById("newOriginalDebtTypeSelect").value;
  const year = document.getElementById("newDebtTypeYearInput").value;
  const name = document.getElementById("newDebtTypeNameInput").value;

  if (!originalCode) {
    alert("יש לבחור סוג חיוב מקורי");
    return;
  }

  try {
    await debtTablesService.createDebtType({
      originalCode,
      year,
      name
    });

    document.getElementById("newOriginalDebtTypeSelect").value = "";
    document.getElementById("newDebtTypeYearInput").value = "";
    document.getElementById("newDebtTypeNameInput").value = "";
    document.getElementById("newEnforcementCodePreview").value = "";

    await renderDebtTypes();
  } catch (error) {
    alert(error.message || "לא ניתן להוסיף סוג חיוב");
  }
}

// async function copyDebtTypeToYear() {
//   if (!getDebtTypesScreenAccess().canEdit) {
//     alert("אין הרשאה להוספת סוגי חיוב");
//     return;
//   }

//   const debtTypeId = document.getElementById("copyDebtTypeSelect").value;
//   const targetYear = document.getElementById("copyDebtTypeYearInput").value;

//   if (!debtTypeId || !targetYear) {
//     alert("יש לבחור סוג חיוב ושנה חדשה");
//     return;
//   }

//   try {
//     await debtTablesService.copyDebtTypeToYear(debtTypeId, targetYear);

//     document.getElementById("copyDebtTypeSelect").value = "";
//     document.getElementById("copyDebtTypeYearInput").value = "";

//     await renderDebtTypes();
//   } catch (error) {
//     alert(error.message || "לא ניתן להעתיק סוג חיוב");
//   }
// }

async function copyDebtTypesToYear() {
  if (!getDebtTypesScreenAccess().canEdit) {
    alert("אין הרשאה להוספת סוגי חיוב");
    return;
  }

  const sourceYear = document.getElementById("copySourceYearInput").value;
  const targetYear = document.getElementById("copyTargetYearInput").value;
  const activeOnly = document.getElementById("copyOnlyActiveDebtTypes").checked;

  if (!sourceYear || !targetYear) {
    alert("יש להזין שנת מקור ושנת יעד");
    return;
  }

//   const sourceRowsCount = debtTypesRows.filter(
//     type => Number(type.year) === Number(sourceYear)
//   ).length;
//     const sourceRowsCount = debtTypesRows.filter(
//     type =>
//         Number(type.year) === Number(sourceYear) &&
//         (!activeOnly || type.isActive !== false)
//     ).length;

//   if (!sourceRowsCount) {
//     alert(`לא נמצאו סוגי חיוב לשנת ${sourceYear}`);
//     return;
//   }
    const allSourceRowsCount = debtTypesRows.filter(
    type => Number(type.year) === Number(sourceYear)
    ).length;

    const sourceRowsCount = debtTypesRows.filter(
    type =>
        Number(type.year) === Number(sourceYear) &&
        (!activeOnly || type.isActive !== false)
    ).length;

    if (!allSourceRowsCount) {
    alert(`לא נמצאו סוגי חיוב לשנת ${sourceYear}`);
    return;
    }

    if (activeOnly && !sourceRowsCount) {
    alert(`לא נמצאו סוגי חיוב פעילים לשנת ${sourceYear}`);
    return;
    }

  const approved = confirm(
    `האם להעתיק ${sourceRowsCount} סוגי חיוב משנת ${sourceYear} לשנת ${targetYear}?`
  );

  if (!approved) return;

  try {
    // const result = await debtTablesService.copyDebtTypesToYear(
    //   sourceYear,
    //   targetYear
    // );
    const result = await debtTablesService.copyDebtTypesToYear(
        sourceYear,
        targetYear,
        { activeOnly }
    );

    // const message = [
    //   `נוספו ${result.created.length} סוגי חיוב לשנת ${targetYear}.`,
    //   result.skippedOriginalCodes.length
    //     ? `סוגים שכבר קיימים בשנת היעד: ${result.skippedOriginalCodes.join(", ")}`
    //     : ""
    // ].filter(Boolean).join("\n");

    // alert(message);
    const message = [
        `נוספו ${result.created.length} סוגי חיוב לשנת ${targetYear}.`,

        result.skippedOriginalCodes.length
            ? `סוגים שכבר קיימים בשנת היעד: ${result.skippedOriginalCodes.join(", ")}`
            : "",

        // מופיע רק אם סומן "העתק רק סוגי חיוב פעילים"
        // ונמצאו סוגי חיוב מושבתים בשנת המקור.
        result.skippedInactiveOriginalCodes?.length
            ? `סוגים מושבתים שלא הועתקו: ${result.skippedInactiveOriginalCodes.join(", ")}`
            : ""
    ].filter(Boolean).join("\n");

    alert(message);

    document.getElementById("copySourceYearInput").value = "";
    document.getElementById("copyTargetYearInput").value = "";

    await renderDebtTypes();
  } catch (error) {
    alert(error.message || "לא ניתן להעתיק את סוגי החיוב");
  }
}

async function addDebtTypesForYears() {
  if (!getDebtTypesScreenAccess().canEdit) {
    alert("אין הרשאה להוספת סוגי חיוב");
    return;
  }

  const originalCode = document.getElementById("rangeOriginalDebtTypeSelect").value;
  const fromYear = document.getElementById("rangeFromYearInput").value;
  const toYear = document.getElementById("rangeToYearInput").value;

  if (!originalCode || !fromYear || !toYear) {
    alert("יש לבחור סוג חיוב וטווח שנים");
    return;
  }

  try {
    const result = await debtTablesService.createDebtTypesForYears({
      originalCode,
      fromYear,
      toYear
    });

    const message = [
      `נוספו ${result.created.length} סוגי חיוב.`,
      result.skippedYears.length
        ? `שנים שכבר היו קיימות: ${result.skippedYears.join(", ")}`
        : ""
    ].filter(Boolean).join("\n");

    alert(message);


    await renderDebtTypes();
  } catch (error) {
    alert(error.message || "לא ניתן להוסיף סוגי חיוב בטווח המבוקש");
  }
}

async function editDebtType(debtTypeId) {
  if (!getDebtTypesScreenAccess().canEdit) {
    alert("אין הרשאה לעריכת סוגי חיוב");
    return;
  }

  const debtType = debtTypesRows.find(type => type.debtTypeId == debtTypeId);

  if (!debtType) return;

  const newName = prompt("שם באכיפה", debtType.name || "");

  if (newName === null) return;

  try {
    await debtTablesService.updateDebtType(debtTypeId, {
      name: newName
    });

    await renderDebtTypes();
  } catch (error) {
    alert(error.message || "לא ניתן לעדכן סוג חיוב");
  }
}

async function toggleDebtTypeActive(debtTypeId) {
  if (!getDebtTypesScreenAccess().canEdit) {
    alert("אין הרשאה לעריכת סוגי חיוב");
    return;
  }

  const debtType = debtTypesRows.find(type => type.debtTypeId == debtTypeId);

  if (!debtType) return;

  const nextIsActive = debtType.isActive === false;
  const approved = confirm(
    nextIsActive
      ? `האם להפעיל את סוג החיוב "${debtType.name}"?`
      : `האם להשבית את סוג החיוב "${debtType.name}"?`
  );

  if (!approved) return;

  try {
    await debtTablesService.updateDebtType(debtTypeId, {
      isActive: nextIsActive
    });

    await renderDebtTypes();
  } catch (error) {
    alert(error.message || "לא ניתן לעדכן סוג חיוב");
  }
}

window.renderDebtTypes = renderDebtTypes;
window.addDebtType = addDebtType;
// window.copyDebtTypeToYear = copyDebtTypeToYear;
window.copyDebtTypesToYear = copyDebtTypesToYear;
window.addDebtTypesForYears = addDebtTypesForYears;
window.editDebtType = editDebtType;
window.toggleDebtTypeActive = toggleDebtTypeActive;