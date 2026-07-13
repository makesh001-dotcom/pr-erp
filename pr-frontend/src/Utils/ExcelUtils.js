import * as XLSX from "xlsx";

export const parseExcelHeaders = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get all data as JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    // Get the keys (headers) from the first row
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    
    callback({ headers, jsonData });
  };
  reader.readAsArrayBuffer(file);
};