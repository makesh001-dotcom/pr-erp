// src/components/quotation/QuotationPrint.jsx

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

export default function QuotationPrint({
  selectedClient,
  lineItems = [],
  subtotal,
  discount,
  discountAmount,
  gstAmount,
  taxableValue,
  totalBeforeRound,
  roundOff,
  finalPrice,
  taxRate,
  deliveryType,
}) {
  // =====================================================
  // FORMATTERS
  // =====================================================
  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const numberToWords = (num) => {
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    if (!num || num === 0) return "Zero Only";

    const convertBelowThousand = (n) => {
      let str = "";
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + " ";
      }
      return str.trim();
    };

    let result = "";
    let integerPart = Math.floor(num);
    
    const crore = Math.floor(integerPart / 10000000);
    integerPart %= 10000000;
    const lakh = Math.floor(integerPart / 100000);
    integerPart %= 100000;
    const thousand = Math.floor(integerPart / 1000);
    integerPart %= 1000;

    if (crore) result += convertBelowThousand(crore) + " Crore ";
    if (lakh) result += convertBelowThousand(lakh) + " Lakh ";
    if (thousand) result += convertBelowThousand(thousand) + " Thousand ";
    if (integerPart) result += convertBelowThousand(integerPart);

    return result.trim() + " Only";
  };

  // =====================================================
  // DATA AND LAYOUT CALCULATIONS
  // =====================================================
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN");
  const quotationNumber = selectedClient?.quotation_number || "QT-001";

  const emptyRows = lineItems.length < 5 ? 5 - lineItems.length : 0;

  return (
    <div
      className="quotation-sheet w-[210mm] h-[297mm] mx-auto text-[11px] text-black print:w-full print:h-auto print:min-h-0 print:mx-0"
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
          {/* HEADER BRAND LOGO */}
          <div className="p-4 pb-2 bg-doc-white">
            <div className="mb-2">
              <img
                src={logo}
                alt="PR Automations Logo"
                className="h-14 object-contain"
              />
            </div>
          </div>

          {/* QUOTATION HEADER */}
          <div className="bg-doc-brand text-white text-center font-bold text-sm py-1.5 border-y border-black">
            QUOTATION
          </div>

          {/* QUOTATION METADATA */}
          <div className="grid grid-cols-12 border-b border-black text-doc-black bg-doc-white">
            <div className="col-span-1 border-r border-black p-1.5 font-bold bg-doc-muted">No</div>
            <div className="col-span-5 border-r border-black p-1.5 font-medium text-left">{quotationNumber}</div>
            <div className="col-span-1 border-r border-black p-1.5 font-bold bg-doc-muted">Date</div>
            <div className="col-span-5 p-1.5 font-medium text-left">{formattedDate}</div>
          </div>

          {/* ACCOUNT AND CONTACT DETAILS */}
          <div className="grid grid-cols-2 border-b border-black bg-doc-white">
            {/* CLIENT PROFILE */}
            <div className="border-r border-black flex flex-col text-left">
              <div className="bg-doc-brand text-white font-bold px-3 py-1 border-b border-black">
                Customer Details
              </div>
              <div className="space-y-0.5 text-[11px] flex-1 text-doc-black">
                <p className="font-bold border-b border-black p-1">
                  {selectedClient?.company_name || "Not Yet Assigned"}
                </p>
                <p className="border-b border-black p-1">
                  {selectedClient?.address || "Not Yet Assigned"}
                </p>
                <p className="border-b border-black p-1">
                  {selectedClient?.state || "Not Yet Assigned"}
                </p>
                <p className="font-medium border-b border-black p-1">
                  Pin Code : {selectedClient?.pincode || "Not Yet Assigned"}
                </p>
                <p className="font-bold p-1">
                  GST NO: {selectedClient?.gstin || "Not Yet Assigned"}
                </p>
              </div>
            </div>

            {/* CONTACT DETAILS */}
            <div className="flex flex-col text-left">
              <div className="bg-doc-brand text-white font-bold px-3 py-1 border-b border-black">
                Contact Details
              </div>
              <div className="text-[11px] flex-1 text-doc-black">
                <p className="border-b border-black p-1">
                  <span className="font-bold">Kind Attn : </span>
                  {selectedClient?.person1_name ||
                    selectedClient?.client_name ||
                    "Whom It May Concern"}
                </p>
                <div className="border-b border-black h-6" />
                <div className="border-b border-black h-6" />
              </div>
            </div>
          </div>

          {/* PRODUCT DATA TABLE */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-doc-brand text-white text-[10px] uppercase tracking-wider">
                <th className="border-b border-r border-black p-1.5 w-10 text-center">SL No</th>
                <th className="border-b border-r border-black p-1.5 w-16 text-center">HSN Code</th>
                <th className="border-b border-r border-black p-1.5 text-left">Product Description</th>
                <th className="border-b border-r border-black p-1.5 text-center w-20">Make</th>
                <th className="border-b border-r border-black p-1.5 w-10 text-center">Qty</th>
                <th className="border-b border-r border-black p-1.5 text-right w-24">Unit Price</th>
                <th className="border-b border-r border-black p-1.5 w-12 text-center">Dis %</th>
                <th className="border-b border-r border-black p-1.5 text-right w-24">Discounted Price</th>
                <th className="border-b border-r border-black p-1.5 text-right w-24">Total Price</th>
                <th className="border-b border-black p-1.5 text-center w-24">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unit_price) || 0;
                const itemDiscount = Number(item.discount ?? discount ?? 0);
                const discountedPrice = unitPrice - (unitPrice * itemDiscount) / 100;
                const totalPrice = discountedPrice * qty;
                const rowBackground = index % 2 === 0 ? "bg-doc-alt" : "bg-doc-white";

                return (
                  <tr
                    key={item.id || index}
                    className={`${rowBackground} text-[11px] text-doc-black`}
                  >
                    <td className="border-b border-r border-black p-1.5 text-center align-middle">
                      {index + 1}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-middle">
                      {item.hsn_code || "8538"}
                    </td>
                    <td className="border-b border-r border-black p-1.5 align-middle font-medium text-left break-words whitespace-normal max-w-xs">
                      <div className="font-bold text-doc-black mb-0.5">{item.model_no}</div>
                      <div className="text-doc-black font-normal leading-tight">{item.description}</div>
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-middle text-doc-black uppercase">
                      {item.model?.manufacturer?.name || item.model?.make || "PR"}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-middle font-medium">
                      {qty}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right align-middle font-mono">
                      Rs. {formatCurrency(unitPrice)}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center align-middle">
                      {itemDiscount}%
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right align-middle font-mono">
                      Rs. {formatCurrency(discountedPrice)}
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right align-middle font-bold font-mono">
                      Rs. {formatCurrency(totalPrice)}
                    </td>
                    <td className="border-b border-black p-1.5 text-center align-middle font-medium">
                      {item.delivery_type || deliveryType || "Immediate"}
                    </td>
                  </tr>
                );
              })}

              {/* EMPTY BALANCING BUFFER FILLER ROWS */}
              {Array.from({ length: emptyRows }).map((_, index) => {
                const continuousIndex = lineItems.length + index;
                const emptyRowBackground = continuousIndex % 2 === 0 ? "bg-doc-alt" : "bg-doc-white";

                return (
                  <tr key={`empty-${index}`} className={`h-[40px] ${emptyRowBackground}`}>
                    <td className="border-b border-r border-black" />
                    <td className="border-b border-r border-black" />
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

          {/* TERMS & TOTALS */}
          <div className="grid grid-cols-2 border-b border-black text-doc-black bg-doc-white">
            {/* TERMS COLUMN */}
            <div className="border-r border-black text-left flex flex-col justify-between text-[11px]">
              <div className="bg-doc-brand h-9 border-b border-black w-full" />
              <div className="p-1.5 border-b border-black flex items-center">
                <span className="font-bold pr-1">Payment : 30 Days.</span>
              </div>
              <div className="p-1.5 border-b border-black flex items-start">
                <span className="font-bold pr-1 shrink-0">
                  Warranty : 1 Year, Manufacturer Claim Scope
                </span>
              </div>
              <div className="p-1.5 border-b border-black flex items-center">
                <span className="font-bold pr-1">Transport : Extra / Customer Scope</span>
              </div>
              <div className="p-1.5 flex items-center">
                <span className="font-bold pr-1">Freight : Extra</span>
              </div>
            </div>

            {/* PRICING TOTALS */}
            <div>
              <table className="w-full h-full border-collapse text-left text-[11px] text-doc-black">
                <tbody>
                  <tr>
                    <td className="border-b border-r border-black p-1.5 font-medium bg-doc-white w-[250px]">
                      Sub Total Value
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right font-mono w-[250px]">
                      Rs. {formatCurrency(subtotal)}
                    </td>
                    <td className="border-b border-black p-1.5 text-right w-8" />
                  </tr>
                  <tr>
                    <td className="border-b border-r border-black p-1.5 bg-doc-white w-[250px]">
                      Sales Tax - {taxRate || 18}%
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right font-mono w-[250px]">
                      Rs. {formatCurrency(gstAmount)}
                    </td>
                    <td className="border-b border-black p-1.5 text-right" />
                  </tr>
                  <tr>
                    <td className="border-b border-r border-black p-1.5 font-bold bg-doc-white w-[250px]">
                      Sub Total Value
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right font-bold font-mono w-[250px]">
                      Rs. {formatCurrency(totalBeforeRound)}
                    </td>
                    <td className="border-b border-black p-1.5 text-right" />
                  </tr>
                  <tr>
                    <td className="border-b border-r border-black p-1.5 bg-doc-white w-[250px]">
                      Round Off
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-right font-mono w-[250px]">
                      {roundOff >= 0 ? "+" : "-"} Rs. {formatCurrency(Math.abs(roundOff))}
                    </td>
                    <td className="border-b border-black p-1.5 text-right" />
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1.5 font-bold text-xs bg-doc-white w-[250px]">
                      Total Value
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-bold text-xs font-mono bg-doc-white w-[250px]">
                      Rs. {formatCurrency(finalPrice)}
                    </td>
                    <td className="p-4 text-right w-38 bg-doc-white" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AMOUNT IN WORDS */}
          <div className="grid grid-cols-12 border-b border-black items-stretch">
            <div className="col-span-3 bg-doc-brand text-white font-bold flex items-center justify-center text-center px-1 py-2 text-[10px] uppercase tracking-wider">
              Special Instructions
            </div>
            <div className="col-span-9 p-2 font-semibold text-doc-black text-[11px] flex items-center bg-doc-white">
              Rupees {numberToWords(finalPrice)}
            </div>
          </div>

          {/* NOTE CLASSIFICATION */}
          <div className="border-b border-black p-2 text-[11px] text-doc-black leading-relaxed bg-doc-white text-left">
            <span className="font-bold">Note :- </span>
            Field Wiring Customer scope, If any programming Modification is required - Additional charges will be applicable.
          </div>

          {/* CONTACT INFORMATION */}
          <div className="border-b border-black p-2 text-center font-bold text-[11px] text-doc-black bg-doc-muted">
            Contact us : <span className="font-semibold">R.Rajkumar - 91-7418123545, R.Jothi - 91-9585596724, D.Kulandaivel - 9585596727</span>
          </div>

          {/* FOOTER BUSINESS ADDRESS LINKS */}
          <div className="bg-doc-brand text-white text-center text-[10px] font-medium py-2 tracking-wide">
            info@prautomations.com | accounts@prautomations.com | marketing@prautomations.com | www.prautomations.com
          </div>
        </div>

        {/* COMPONENT PARTNERS FOOTER WRAPPER */}
        <div className="py-2 flex justify-center bg-doc-white border-t border-transparent">
          <img
            src={partnerbanner}
            alt="Partner Banner"
            className="h-32 object-contain"
          />
        </div>
      </div>
    </div>
  );
}