// src/components/delivery/DeliveryPrint.jsx

import React from "react";
import logo from "../assets/pr-logo.png";
import partnerbanner from "../assets/partner-banner.png";

// Print styles
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      body {
        margin: 0mm;
        padding: 0mm;
        background-color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function DeliveryPrint({
  challan,
  selectedClient,
  lineItems = [],
  deliveryDate,
  displayType,
  challanType,
  orderNo,
  via,
  destination,
  remarks,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const emptyRows = lineItems.length < 6 ? 6 - lineItems.length : 0;

  return (
    <div
      className="delivery-challan-sheet w-[210mm] h-[297mm] mx-auto text-[11px] text-black print:w-full print:h-auto print:min-h-0 print:mx-0"
      style={{
        fontFamily: "Cambria, serif",
        backgroundColor: "#ffffff",
        color: "#000000",
        colorScheme: "light",
      }}
    >
      {/* SCOPED ISOLATION STYLE TO NEUTRALIZE DARK MODE OVERRIDES */}
      {/* SCOPED ISOLATION STYLE THAT RE-BINDS TO YOUR SYSTEM CSS PRESETS */}
<style>{`
  .delivery-challan-sheet,
  .quotation-sheet {
    color-scheme: light !important;
  }
  .bg-doc-white {
    background-color: var(--background, #ffffff) !important;
  }
  .bg-doc-alt {
    background-color: var(--surface-subtle, #f0f4f8) !important;
  }
  .bg-doc-brand {
    background-color: var(--color-pr-blue, #1e3a8a) !important;
  }
  .bg-doc-muted {
    background-color: var(--surface-subtle, #f0f4f8) !important;
  }
  .text-doc-brand {
    color: var(--color-pr-blue, #1e3a8a) !important;
  }
  .text-doc-black {
    color: var(--foreground, #0f172a) !important;
  }
`}</style>

      {/* MAIN LAYOUT CANVAS BORDER */}
      <div className="border border-black h-full flex flex-col justify-between print:border-black bg-doc-white">
        <div>
          {/* HEADER BRAND LOGO & COMPANY ADDRESS */}
          <div className="p-3 pb-2 flex justify-center items-start border-b border-black bg-doc-white">
            <div>
              <img
                src={logo}
                alt="PR Automations Logo"
                className="h-14 object-contain"
              />
            </div>
          </div>

          {/* DOCUMENT TITLE HEADER */}
          <div className="bg-doc-brand text-white text-center font-bold text-xs py-1 border-b border-black uppercase tracking-widest">
            Delivery Challan
          </div>

          {/* CLIENT & METADATA GRID */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-black text-[11px] leading-tight bg-doc-white">
            {/* COLUMN 1: CUSTOMER / SHIP TO DETAILS */}
            <div className="border-r border-black p-1 text-left">
              <div className="font-bold text-doc-black text-[11px]">
                M/s: {selectedClient?.company_name || "________________________________"}
              </div>
              <div className="text-doc-black">
                {selectedClient?.address || "________________________________"}
              </div>
              <div className="text-doc-black">
                {selectedClient?.state || "________________"}
                {selectedClient?.pincode ? ` - PINCODE:${selectedClient.pincode}` : ""}
              </div>
              {selectedClient?.gstin && (
                <div className="font-semibold text-doc-black">GSTIN: {selectedClient.gstin}</div>
              )}
            </div>

            {/* COLUMN 2: DC No, Date, Order */}
            <div className="border-r border-black text-left text-[11px] text-doc-black">
              <div className="border-b border-black py-0.5 px-1.5">
                <div className="font-bold">DC No.</div>
                <div className="font-bold text-doc-brand">
                  : {challan?.challan_no || "PR/DC-117/26-27"}
                </div>
              </div>
              <div className="border-b border-black py-0.5 px-1.5">
                <div className="font-bold">Date.</div>
                <div>: {formatDate(deliveryDate) || "________________"}</div>
              </div>
              <div className="py-0.5 px-1.5">
                <div className="font-bold">Buyer's Order No/ Dated</div>
                <div>: {orderNo || "—"}</div>
              </div>
            </div>

            {/* COLUMN 3: Return, Dispatch, Destination */}
            <div className="border-r border-black  text-left text-[11px] text-doc-black">
              <div className="flex border-b border-black py-0.5 px-1.5">
  <div className="font-semibold w-14">Type:</div>
  <div className="font-bold uppercase">
    {displayType === "RETURN" && "RETURN"}
    {displayType === "NON_RETURN" && "NON-RETURN"}
    {displayType === "DEMO" && "DEMO"}
    {displayType === "FREE_OF_COST" && "FREE OF COST"}
    {!displayType && "________________"}
  </div>
</div>
              <div className="border-b border-black py-0.5 px-1.5">
                <div className="font-bold">Dispatch Through</div>
                <div className="font-bold">: {via || "Direct"}</div>
              </div>
              <div className="py-0.5 px-1.5">
                <div className="font-bold">Destination</div>
                <div className="font-bold">: {destination || selectedClient?.state || "Coimbatore"}</div>
              </div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-doc-brand text-white text-[10px] uppercase tracking-wider">
                <th className="border-b border-r border-black p-1.5 w-10 text-center">SL No</th>
                <th className="border-b border-r border-black p-1.5 w-16 text-center">HSN Code</th>
                <th className="border-b border-r border-black p-1.5 text-left">Product Description</th>
                <th className="border-b border-r border-black p-1.5 text-center w-24">Make</th>
                <th className="border-b border-r border-black p-1.5 w-14 text-center">Qty</th>
                <th className="border-b border-r border-black p-1.5 w-20 text-right">Unit Price</th>
                <th className="border-b border-r border-black p-1.5 w-20 text-right">Total Price</th>
                <th className="border-b border-black p-1.5 w-20 text-center">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => {
                const qty = item.quantity_sent || item.quantity || 1;
                const rowBackground = index % 2 === 0 ? "bg-doc-alt" : "bg-doc-white";

                return (
                  <tr key={item.id || index} className={`${rowBackground} text-[11px] text-doc-black`}>
                    <td className="border-b border-r border-black p-1.5 text-center align-top">
                      {index + 1}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-top">
                      {item.hsn_code || "8538"}
                    </td>
                    <td className="border-b border-r border-black p-1.5 align-top font-medium text-left break-words">
                      <div className="font-bold text-doc-black">{item.model_no || ""}</div>
                      {item.description && (
                        <div className="text-doc-black font-normal text-[10px] uppercase leading-tight mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-top text-doc-black uppercase font-medium">
                      {
                        item.product_group?.manufacturer?.name || 
                        item.model?.product_group?.manufacturer?.name || 
                        item.model?.manufacturer?.name || 
                        item.model?.make || 
                        "—"
                      }
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-top font-semibold">
                      {qty}Nos
                    </td>
                    <td className="border-b border-r border-black p-1.5 align-top" />
                    <td className="border-b border-r border-black p-1.5 align-top" />
                    <td className="border-b border-black p-1.5 text-center align-top" />
                  </tr>
                );
              })}

              {/* EMPTY BUFFER ROWS */}
              {Array.from({ length: emptyRows }).map((_, index) => {
                const continuousIndex = lineItems.length + index;
                const emptyRowBackground = continuousIndex % 2 === 0 ? "bg-doc-alt" : "bg-doc-white";

                return (
                  <tr key={`empty-${index}`} className={`h-[38px] ${emptyRowBackground}`}>
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-black" />
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* REMARKS */}
          {remarks && (
            <div className="border-b border-black p-2 text-[10px] text-doc-black bg-doc-white text-left">
              <span className="font-bold">Remarks: </span>
              {remarks}
            </div>
          )}

          {/* CONTACT INFORMATION */}
          <div className="border-b border-black p-2 text-center font-bold text-[11px] text-doc-black bg-doc-muted">
            Contact us : <span className="text-doc-black font-semibold">R.Rajkumar - 91-7418123545, R.Jothi - 91-9585596724, D.Kulandaivel - 9585596727</span>
          </div>

          {/* FOOTER BUSINESS ADDRESS LINKS */}
          <div className="bg-doc-brand text-white text-center text-[10px] font-medium py-2 tracking-wide">
            info@prautomations.com | accounts@prautomations.com | marketing@prautomations.com | www.prautomations.com
          </div>

          <div className="grid grid-cols-2 border-b border-black text-[10px] bg-doc-white text-doc-black">
            <div className="border-r border-black p-3 text-center flex flex-col justify-between h-24">
              <div className="font-semibold text-center">Received the Goods in Good Condition</div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                Customer's Signature
              </div>
            </div>
            <div className="p-3 text-center flex flex-col justify-between h-24">
              <div className="font-bold text-center text-[11px]">For PR Automations</div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                Authorised Signatory
              </div>
            </div>
          </div>

          {/* COMPONENT PARTNERS FOOTER WRAPPER */}
          <div className="py-2 flex justify-center bg-doc-white border-t border-transparent">
            <img
              src={partnerbanner}
              alt="partnerbanner"
              className="h-32 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}