const demoForeclosureCases = [
  { caseId: 1001, idPayer: 1, idAsset: 101, routeName: "אכיפה רגילה", groupName: "ארנונה ומים", statusName: "עיקולי", hasForeclosureCase: false },
  { caseId: 1002, idPayer: 2, idAsset: 201, routeName: "אכיפה רגילה", groupName: "שילוט", statusName: "עיקולי", hasForeclosureCase: false },
  { caseId: 1003, idPayer: 3, idAsset: 301, routeName: "אכיפה מהירה", groupName: "ארנונה ומים", statusName: "עיקולי", hasForeclosureCase: true }
];

function renderForeclosureCaseBuilder() {
  const tbody = document.getElementById("foreclosureCaseBuilderTable");
  const canEdit = permissionService.canEditScreen("foreclosureCaseBuilder");

  const rows = demoForeclosureCases.filter(item => !item.hasForeclosureCase);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">לא נמצאו תיקים לפתיחת תיק עיקול</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(item => `
    <tr>
      <td>${item.caseId}</td>
      <td>${item.idPayer}</td>
      <td>${item.idAsset}</td>
      <td>${item.routeName}</td>
      <td>${item.groupName}</td>
      <td>${item.statusName}</td>
      <td>
        <button class="btn btn--secondary" ${canEdit ? "" : "disabled"} onclick="openForeclosureCase(${item.caseId})">
          פתיחת תיק עיקול
        </button>
      </td>
    </tr>
  `).join("");
}

function openForeclosureCase(caseId) {
  alert(`נפתחה בקשת פתיחת תיק עיקול עבור תיק ${caseId}. בהמשך הפעולה תירשם בטבלת תיקי עיקול.`);
}

window.renderForeclosureCaseBuilder = renderForeclosureCaseBuilder;
window.openForeclosureCase = openForeclosureCase;