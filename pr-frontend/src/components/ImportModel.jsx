import React from 'react';
import { parseExcelHeaders } from '../utils/ExcelUtils';
import axios from 'axios';

export default function ImportModal({ fetchClients, setShowImportArea }) {
  
  const handleFileLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseExcelHeaders(file, ({ headers, jsonData }) => {
      // Logic triggers immediately after parsing
      handleAutoImport(headers, jsonData);
    });
  };

  const handleAutoImport = (headers, excelData) => {
    const match = (regex) => headers.find(h => regex.test(h)) || "";

    const autoMapping = {
      company_name:  match(/comp|firm|organization|business/i),
      person1_name:  match(/person\s*1|contact\s*1|primary\s*name|owner/i),
      person1_email: match(/email|mail/i),
      person1_phone: match(/phone|mobile|tel|contact/i),
      person2_name:  match(/person\s*2|secondary\s*name/i),
      person2_email: match(/alt.*email|email\s*2/i),
      person2_phone: match(/alt.*phone|phone\s*2|mobile\s*2/i),
      address:       match(/address|location|street/i),
      state:         match(/state|region|province/i),
      pincode:       match(/pin|zip|post/i),
      gstin:         match(/gst|tax|vat/i),
      alter_email:   match(/other.*email|extra.*email/i),
      alter_phone:   match(/other.*phone/i),
    };

    const payload = excelData.map(row => {
      let obj = {};
      for (let key in autoMapping) {
        obj[key] = row[autoMapping[key]] || "";
      }
      return obj;
    }).filter(item => item.company_name); 

    if (payload.length > 0) {
      executeUpload(payload);
    } else {
      alert("Could not find a 'Company Name' column automatically.");
    }
  };

  const executeUpload = async (payload) => {
    try {
      await axios.post("http://127.0.0.1:8002/clients/bulk", payload);
      alert(`Successfully imported ${payload.length} clients!`);
      if (fetchClients) fetchClients();
      if (setShowImportArea) setShowImportArea(false);
    } catch (err) {
      console.error(err);
      alert("Import failed. Check if server is running.");
    }
  };

  return (
    <div className="p-4 border rounded shadow">
      <h3>Fast Import</h3>
      <p className="text-sm text-muted-foreground">Upload your excel file to auto-sync clients.</p>
      <input 
        type="file" 
        onChange={handleFileLoad} 
        accept=".xlsx, .xls" 
        className="mt-2"
      />
    </div>
  );
}