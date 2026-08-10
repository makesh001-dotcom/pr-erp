import React from 'react';

const ParcelPrint = ({ client }) => {
  const handlePrintAction = () => {
    window.print();
  };

  if (!client) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="print-container">
      {/* Interactive UI — Hidden on Print */}
      <div className="no-print actions-bar">
        <button onClick={handlePrintAction} className="print-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Shipping Label
        </button>
        <p className="hint">
          <strong>Pro Tip:</strong> Set print margins to "None" and disable headers/footers for best results.
        </p>
      </div>

      {/* === THE LABEL === */}
      <div className="label-wrapper">

        {/* Top Header Band */}
        <div className="label-top-band">
          <div className="brand-block">
            <div className="brand-logo">PR</div>
            <div className="brand-text">
              <div className="brand-name">PR AUTOMATIONS</div>
              <div className="brand-tag">Smart Industrial Solutions</div>
            </div>
          </div>
          <div className="doc-meta">
            <div className="doc-type">SHIPPING LABEL</div>
            <div className="doc-date">{today}</div>
          </div>
        </div>

        

        {/* Main Content Grid */}
        <div className="label-body">

          {/* FROM (Sender) */}
          <div className="addr-block from-block">
            <div className="addr-label">
              <span className="addr-label-icon">↗</span>
              FROM / SENDER
            </div>
            <div className="addr-content">
              <div className="addr-company">PR AUTOMATIONS</div>
              <div className="addr-line">19/83, 1-A, Near Rocky Gas Godown</div>
              <div className="addr-line">Surya Nagar, Vellalore</div>
              <div className="addr-line">Tamil Nadu — 641111</div>
              <div className="addr-contact">
                <span className="contact-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .3l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>
                  074181 23545
                </span>
                <span className="contact-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  info@prautomations.com
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider">
            <div className="divider-line"></div>
            <div className="divider-arrow">▼</div>
            <div className="divider-line"></div>
          </div>

          {/* TO (Recipient) — The Hero Section */}
          <div className="addr-block to-block">
            <div className="addr-label to-label">
              <span className="addr-label-icon">↙</span>
              TO / RECIPIENT
            </div>
            <div className="addr-content">
              <div className="to-company">{client.company_name}</div>
              <div className="to-attn">
                <span className="attn-tag">ATTN</span>
                <span className="attn-name">{client.person1_name}</span>
              </div>
              <div className="to-address">{client.address}</div>
              <div className="to-city">{client.state} — {client.pincode}</div>
              <div className="to-phone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .3l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>
                {client.person1_phone}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Info Strip */}
        <div className="label-bottom-strip">
          <div className="info-cell">
            <div className="info-label">GSTIN</div>
            <div className="info-value">{client.gstin || '—'}</div>
          </div>
          
        </div>

        {/* Tear-off Footer */}
        <div className="tear-off">
          <div className="tear-dots">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="tear-dot" />
            ))}
          </div>
          <div className="tear-text">✂ TEAR HERE</div>
        </div>

      </div>

      {/* === STYLES === */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ─── SCREEN ONLY ─── */
        .print-container {
          padding: 32px 16px;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #f1f5f9;
          min-height: 100vh;
        }

        .actions-bar {
          text-align: center;
          margin-bottom: 32px;
        }
        .print-btn {
          display: inline-flex;
          align-items: center;
          padding: 14px 32px;
          background: #0f172a;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
          transition: all 0.2s ease;
        }
        .print-btn:hover {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }
        .hint {
          margin-top: 12px;
          font-size: 13px;
          color: #64748b;
        }

        /* ─── LABEL WRAPPER ─── */
        .label-wrapper {
          width: 600px;
          margin: 0 auto;
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.12);
          overflow: hidden;
        }

        /* ─── TOP BAND ─── */
        .label-top-band {
          background: #0f172a;
          color: #fff;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-logo {
          width: 40px;
          height: 40px;
          background: #fff;
          color: #0f172a;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 16px;
          letter-spacing: 1px;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }
        .brand-tag {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .doc-meta {
          text-align: right;
        }
        .doc-type {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.7;
          margin-bottom: 4px;
        }
        .doc-date {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.9;
        }

        /* ─── BARCODE STRIP ─── */
        .barcode-strip {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .barcode-visual {
          flex: 1;
        }
        .barcode-lines {
          display: flex;
          align-items: flex-end;
          height: 36px;
          margin-bottom: 4px;
        }
        .barcode-line {
          background: #0f172a;
          height: 100%;
          border-radius: 1px;
        }
        .barcode-number {
          font-family: "Courier New", monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #334155;
        }
        .parcel-badge {
          background: #0f172a;
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 1px;
        }
        .badge-icon { font-size: 16px; }

        /* ─── BODY ─── */
        .label-body {
          padding: 0;
        }

        .addr-block {
          padding: 20px 24px;
        }
        .addr-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #64748b;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .addr-label-icon {
          font-size: 12px;
          opacity: 0.5;
        }
        .to-label {
          color: #0f172a;
        }

        /* FROM block */
        .from-block {
          background: #f8fafc;
        }
        .addr-company {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .addr-line {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }
        .addr-contact {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .contact-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          color: #475569;
          font-weight: 500;
        }

        /* Divider */
        .section-divider {
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 10px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .divider-arrow {
          font-size: 10px;
          color: #94a3b8;
        }

        /* TO block — THE HERO */
        .to-block {
          padding-top: 16px;
          padding-bottom: 24px;
        }
        .to-company {
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }
        .to-attn {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .attn-tag {
          background: #0f172a;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .attn-name {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
        }
        .to-address {
          font-size: 16px;
          font-weight: 500;
          color: #1e293b;
          line-height: 1.5;
          margin-bottom: 4px;
        }
        .to-city {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .to-phone {
          display: inline-flex;
          align-items: center;
          background: #0f172a;
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        /* ─── BOTTOM STRIP ─── */
        .label-bottom-strip {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          border-top: 2px solid #0f172a;
          background: #f8fafc;
        }
        .info-cell {
          padding: 12px 16px;
          border-right: 1px solid #e2e8f0;
        }
        .info-cell:last-child {
          border-right: none;
        }
        .info-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          font-family: "Courier New", monospace;
        }

        /* ─── TEAR OFF ─── */
        .tear-off {
          background: #f1f5f9;
          padding: 6px 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tear-dots {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .tear-dot {
          width: 4px;
          height: 4px;
          background: #cbd5e1;
          border-radius: 50%;
        }
        .tear-text {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #94a3b8;
          white-space: nowrap;
        }

        /* ─── PRINT RULES ─── */
        @media print {
          @page {
            size: auto;
            margin: 0;
          }

          body * {
            visibility: hidden !important;
          }

          .print-container, .print-container * {
            visibility: visible !important;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }

          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          .label-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .tear-off {
            display: none !important;
          }
        }
      ` }} />
    </div>
  );
};

export default ParcelPrint;