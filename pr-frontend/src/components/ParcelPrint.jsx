import React from 'react';

const ParcelPrint = ({ client }) => {
  const handlePrintAction = () => {
    window.print();
  };

  if (!client) return null;

  return (
    <div className="print-container">
      {/* Interactive UI - Hidden on Print */}
      <div className="no-print actions-bar">
        <button onClick={handlePrintAction} className="print-btn">
          Print Shipping Label
        </button>
        <p className="hint">Tip: Set "Margins" to "None" in the print dialog for best results.</p>
      </div>

      <div className="parcel-card">
        {/* Header Section */}
        <div className="label-header">
          <div className="logo-area">
            <h2>PR AUTOMATIONS</h2>
            <span>Smart Industrial Solutions</span>
          </div>
          <div className="delivery-badge">PARCEL</div>
        </div>

        {/* FROM Section */}
        <div className="address-section from-box">
          <div className="side-label">FROM</div>
          <div className="client-info">
            <p className="full-address">
              <strong>PR AUTOMATIONS</strong><br />
              19/83, 1-A, near Rocky Gas Godown,<br />
              Surya Nagar, Vellalore, TamilNadu - 641111
            </p>
            <p className="contact-small">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .3l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>
              074181 23545 &nbsp;|&nbsp; 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', marginLeft: '6px', marginRight: '4px', verticalAlign: 'middle' }}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              info@prautomations.com
            </p>
          </div>
        </div>

        {/* TO Section */}
        <div className="address-section to-box">
          <div className="side-label">TO</div>
          <div className="client-info">
            <h1 className="company-name">{client.company_name}</h1>
            <p className="attn-line"><strong>Attn:</strong> {client.person1_name}</p>
            <p className="destination-address">{client.address}</p>
            <p className="city-state">{client.state} - {client.pincode}</p>
            <p className="phone-bold">Contact: {client.person1_phone}</p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="label-footer">
          <div className="gst-details">
            <span>RECIPIENT GST:</span> <strong>{client.gstin || 'NOT PROVIDED'}</strong>
          </div>
        </div>
      </div>

      {/* FIXED: Removed the 'jsx' attribute entirely from the style element */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. SCREEN STYLING */
.print-container {
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
}
.actions-bar {
  margin-bottom: 24px;
  text-align: center;
}
.print-btn {
  padding: 12px 28px;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border: none;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
  transition: all 0.2s;
}
.print-btn:hover { 
  background: #1d4ed8; 
  box-shadow: 0 6px 8px -1px rgba(29, 78, 216, 0.3);
}
.hint { font-size: 12px; color: #64748b; margin-top: 10px; }

.parcel-card {
  width: 550px;
  margin: 0 auto;
  border: 4px solid #fff;
  background: #fff;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.label-header {
  background: #000;
  color: #fff;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo-area h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1.5px; }
.logo-area span { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.75; display: block; margin-top: 2px; }
.delivery-badge {
  border: 3px solid #fff;
  padding: 6px 16px;
  font-weight: 900;
  font-size: 20px;
  letter-spacing: 1px;
}

.address-section {
  display: flex;
  padding: 20px;
  gap: 20px;
}
.side-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  font-weight: 800;
  background: #000;
  color: #fff;
  padding: 6px 8px;
  text-align: center;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: fit-content;
}

.from-box { 
  background: #f8fafc; 
  border-bottom: 2px dashed #000; 
}
.full-address { font-size: 14px; line-height: 1.5; margin: 0; color: #334155; }
.full-address strong { color: #000; font-size: 15px; }
.contact-small { font-size: 12px; color: #64748b; margin-top: 8px; margin-bottom: 0; display: flex; align-items: center; }

.to-box { padding-top: 20px; }
.company-name { font-size: 32px; font-weight: 800; margin: 0 0 8px 0; color: #000; line-height: 1.1; text-transform: uppercase; }
.attn-line { font-size: 15px; margin: 0 0 12px 0; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
.destination-address { font-size: 18px; margin: 6px 0; font-weight: 500; line-height: 1.4; color: #000; }
.city-state { font-size: 18px; font-weight: 700; margin-top: 4px; margin-bottom: 14px; color: #000; }
.phone-bold { font-size: 16px; font-weight: 700; border: 2px solid #000; display: inline-block; padding: 4px 12px; margin: 0; background: #fff; }

.label-footer {
  border-top: 4px solid #000;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  background: #f8fafc;
}
.gst-details { font-size: 13px; color: #1e293b; }
.gst-details span { color: #64748b; font-weight: 600; font-size: 12px; margin-right: 4px; }

/* 2. ADVANCED PRINT ISOLATION RULES */
@media print {
  /* Hide every single element inside the body tag globally */
  body * {
    visibility: hidden !important;
  }
  
  /* Forcefully make only our print container and its internal tree visible */
  .print-container, .print-container * {
    visibility: visible !important;
  }
  
  /* Pull the print container to the absolute top-left corner of the page */
  .print-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Keep your internal interactive action bars completely invisible */
  .no-print, .no-print * {
    display: none !important;
    visibility: hidden !important;
  }
  
  .parcel-card { 
    border: 4px solid #000; 
    width: 100% !important; 
    max-width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }

  @page { 
    size: auto; 
    margin: 0mm; 
  }
}
      ` }} />
    </div>
  );
};

export default ParcelPrint;