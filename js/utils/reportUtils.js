function exportToExcel({
  data,
  headers,
  fileName,
  sheetName = "Sheet1",
  rtl = true
}) {
  if (!data || !data.length) {
    alert("אין נתונים לייצוא");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  if (headers) {
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
  }

  if (rtl) {
    worksheet["!dir"] = "rtl";
  }

  const workbook = XLSX.utils.book_new();

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [{}];
  workbook.Workbook.Views[0].RTL = rtl;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}


function printTextReport({
  title,
  data,
  renderItem,
  summaryText
}) {
  if (!data || !data.length) {
    alert("אין נתונים להדפסה");
    return;
  }


  const printWindow = window.open("", "_blank", "width=900,height=1000");

if (!printWindow) {
  alert("הדפדפן חסם את חלון ההדפסה");
  return;
}

printWindow.document.open();
printWindow.document.write(`
  <html dir="rtl">
    <head>
      <title>${title}</title>
      <style>
      
        @page {
        size: A4 portrait;
        margin: 20mm;
        }
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
        }
        h1 {
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .record {
          page-break-inside: avoid;
          margin-bottom: 20px;
        }

        
.report-summary {
  margin-bottom: 25px;
  padding: 15px;
  background: #f4f6f8;
  border-radius: 6px;
}

.case-card {
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 6px;
  page-break-inside: avoid;
}

.case-card div {
  margin-bottom: 4px;
} 

      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>${summaryText}</p>
      <hr />
      ${data.map(renderItem).join("")}
    </body>
  </html>
`);

printWindow.document.close();

/* ⬇️ הקסם כאן */
printWindow.onload = () => {
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    // ❌ לא לסגור אוטומטית
    // printWindow.close();
  }, 300);
};


//   const printWindow = window.open("", "_blank", "width=900,height=700");


//   if (!printWindow) {
//     alert("הדפדפן חסם את חלון ההדפסה. נא לאפשר חלונות קופצים.");
//     return;
//   }

//   const content = data.map(renderItem).join("");

//   printWindow.document.write(`
//     <html dir="rtl">
//       <head>
//         <title>${title}</title>
//         <style>
//           body {
//             font-family: Arial, sans-serif;
//             padding: 40px;
//             color: #333;
//           }
//           h1 {
//             border-bottom: 3px solid #444;
//             padding-bottom: 10px;
//           }
//           .record {
//             margin-bottom: 25px;
//             page-break-inside: avoid;
//           }
//           .divider {
//             border-bottom: 1px solid #eee;
//             margin-top: 15px;
//           }
//         </style>
//       </head>
//       <body>
//         <h1>${title}</h1>
//         <p>${summaryText}</p>
//         <hr />
//         ${content}

//         <script>
//           window.onload = function () {
//             window.print();
//             window.close();
//           };
//         <\/script>
//       </body>
//     </html>
//   `);

//   //printWindow.document.close();
}
