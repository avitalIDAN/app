async function renderForeclosureCaseBuilder() {
  const [eligibleCases, manualCases] = await Promise.all([
    foreclosureService.getEligibleCases(), foreclosureService.getEligibleCases(true)
  ]);
  const canEdit = foreclosureService.canEdit("foreclosureCaseBuilder");
  const tbody = document.getElementById("foreclosureCaseBuilderTable");
  const manualSelect = document.getElementById("manualForeclosureCase");

  manualSelect.innerHTML = `<option value="">בחירת תיק</option>${manualCases.map(item =>
    `<option value="${item.caseId}">תיק ${item.caseId} — ${item.statusName || "ללא מצב"}</option>`).join("")}`;
  manualSelect.disabled = !canEdit;
  if (!eligibleCases.length) {
    tbody.innerHTML = `<tr><td colspan="7">לא נמצאו תיקים במצב עיקול לפתיחת תיק עיקול</td></tr>`;
    return;
  }
  tbody.innerHTML = eligibleCases.map(item => `
    <tr><td>${item.caseId}</td><td>${item.idPayer}</td><td>${item.idAsset}</td><td>${item.routeName}</td><td>${item.groupName}</td><td>${item.statusName}</td>
    <td><button class="btn btn--secondary" ${canEdit ? "" : "disabled"} onclick="openForeclosureCase(${item.caseId}, 'מצב עיקול')">פתיחת תיק עיקול</button></td></tr>`).join("");
}

async function openForeclosureCase(caseId, source) {
  try {
    await foreclosureService.openForeclosureCase(caseId, source);
    alert(`נפתח תיק עיקול עבור תיק ${caseId}. אפשר להוסיף עיקול במסך תהליך עיקול.`);
    renderForeclosureCaseBuilder();
  } catch (error) { alert(error.message); }
}

function openManualForeclosureCase() {
  const caseId = document.getElementById("manualForeclosureCase").value;
  if (!caseId) { alert("יש לבחור תיק"); return; }
  openForeclosureCase(caseId, "פתיחה ידנית");
}

window.renderForeclosureCaseBuilder = renderForeclosureCaseBuilder;
window.openForeclosureCase = openForeclosureCase;
window.openManualForeclosureCase = openManualForeclosureCase;
