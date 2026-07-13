import * as XLSX from "xlsx";
import API from "../api/client";

export default function ImportExcel({ onRefresh }) {
  const handleImport = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      // 1. Parse the Excel file
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // 2. Convert to JSON
      const data = XLSX.utils.sheet_to_json(ws);
      console.log("Parsed Data:", data);

      // 3. Send to Backend
      try {
        await API.post("/clients/bulk", data);
        alert("Import Successful!");
        if (onRefresh) onRefresh(); // Reload the table
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to import data.");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <label className="import-button">
        Upload Excel
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleImport} 
          style={{ display: "none" }} 
        />
      </label>
    </div>
  );
}