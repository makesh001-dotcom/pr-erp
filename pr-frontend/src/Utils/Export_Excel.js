import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (data, filename = "Export") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Clean fields - remove internal/system fields
  const cleanData = data.map(({ id, is_active, created_at, updated_at, sales, ...rest }) => rest);

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(cleanData);

  // Auto-width columns
  const colWidths = Object.keys(cleanData[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...cleanData.map((obj) => (obj[key] ? obj[key].toString().length : 0))
    ) + 2,
  }));
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Save
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(fileData, `${filename}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`);
};