import React, { useState, useRef } from 'react';
import { Transaction, Company, Customer } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  transaction: Transaction;
  company: Company | null;
  customer: Customer | null;
  onClose: () => void;
}

type PageSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';

interface PageDimensions {
  width: string;
  height: string;
  scale: number;
}

const PAGE_SIZES: Record<PageSize, PageDimensions> = {
  'A3': { width: '297mm', height: '420mm', scale: 1.2 },
  'A4': { width: '210mm', height: '297mm', scale: 1 },
  'A5': { width: '148mm', height: '210mm', scale: 0.8 },
  'Letter': { width: '8.5in', height: '11in', scale: 1 },
  'Legal': { width: '8.5in', height: '14in', scale: 1.1 },
  'Tabloid': { width: '11in', height: '17in', scale: 1.3 }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

const InvoiceModal: React.FC<Props> = ({ transaction, company, customer, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!company) return null;

  const symbol = company.currencySymbol || '₹';
  const dimensions = PAGE_SIZES[pageSize];

  const handlePrint = () => {
    const originalTitle = document.title;
    const today = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
    const safeCustomerName = transaction.entityName.replace(/[^a-z0-9]/gi, '_');
    const customFileName = `${safeCustomerName}_${today}`;
    
    document.title = customFileName;
    
    // Proactive native bridge for Electron environments
    const electronBridge = (window as any).electron;
    
    if (electronBridge && typeof electronBridge.printInvoice === 'function') {
      electronBridge.printInvoice(customFileName);
    } else {
      window.print();
    }

    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleGeneratePDF = async () => {
    if (!invoiceRef.current) return;

    setIsGenerating(true);
    try {
      const element = invoiceRef.current;

      // Temporarily remove constraints for full capture
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;

      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      element.style.height = 'auto';

      // Target A4 proportions
      const canvas = await html2canvas(element, {
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth || 1000,
        scrollY: -window.scrollY
      });

      // Restore constraints
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: pageSize.toLowerCase() as any
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const today = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
      const safeCustomerName = transaction.entityName.replace(/[^a-z0-9]/gi, '_');
      pdf.save(`${safeCustomerName}_${today}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert(`PDF Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please use the Print option and choose 'Save as PDF'.`);
    } finally {
      setIsGenerating(false);
    }
  };

  /* Handle WhatsApp Share option */
  const handleWhatsAppShare = () => {
    const safeCustomerName = transaction.entityName.trim();
    const formattedDate = formatDate(transaction.date);

    // Calculate totals just like the invoice view
    const subtotal = transaction.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalCGST = transaction.cgstTotal || transaction.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
    const totalSGST = transaction.sgstTotal || transaction.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
    const totalTax = totalCGST + totalSGST;
    const grandTotal = transaction.totalAmount;

    let message = `🧾 *INVOICE SUMMARY* 🧾\n`;
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    message += `*🏢 From:* ${company.name}\n`;
    message += `*👤 Bill To:* ${safeCustomerName}\n`;
    message += `*📄 Inv No:* ${transaction.invoiceNumber}\n`;
    message += `*📅 Date:* ${formattedDate}\n`;
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n`;

    message += `*📦 ITEMS:*\n`;
    transaction.items.forEach((item, index) => {
      const itemTotal = (item.quantity * item.unitPrice).toFixed(2);
      message += `${index + 1}. *${item.productName}*\n`;
      message += `     Qty: ${item.quantity} × ${symbol}${item.unitPrice.toFixed(2)} = ${symbol}${itemTotal}\n`;
    });

    message += `\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    message += `*Subtotal:* ${symbol}${subtotal.toFixed(2)}\n`;
    if (totalTax > 0) {
      if (totalCGST > 0) message += `*CGST:* ${symbol}${totalCGST.toFixed(2)}\n`;
      if (totalSGST > 0) message += `*SGST:* ${symbol}${totalSGST.toFixed(2)}\n`;
    }
    if (transaction.roundOff) {
      message += `*Round Off:* ${symbol}${transaction.roundOff.toFixed(2)}\n`;
    }
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    message += `💰 *GRAND TOTAL: ${symbol}${grandTotal.toFixed(2)}*\n`;
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n`;

    message += `Thank you for choosing ${company.name} !\n`;

    const encodedMessage = encodeURIComponent(message);

    // Extract numbers only
    let phoneNumber = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    // If it's a 10 digit Indian number without country code, prepend 91 (default since the app seems to be used in India)
    if (phoneNumber && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    const waUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
  };

  const subtotal = transaction.items.reduce((sum, item) => {
    const amount = item.quantity * item.unitPrice;
    return sum + amount;
  }, 0);

  const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCGST = transaction.cgstTotal || transaction.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
  const totalSGST = transaction.sgstTotal || transaction.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
  const totalTax = totalCGST + totalSGST;
  const grandTotal = transaction.totalAmount;

  const printStyles = `
    /* Fix for html2canvas oklch parsing issue in Tailwind v4 */
    #invoice-content {
      color: #1e293b !important;
      --color-slate-50: #f8fafc !important;
      --color-slate-100: #f1f5f9 !important;
      --color-slate-200: #e2e8f0 !important;
      --color-slate-300: #cbd5e1 !important;
      --color-slate-400: #94a3b8 !important;
      --color-slate-500: #64748b !important;
      --color-slate-600: #475569 !important;
      --color-slate-700: #334155 !important;
      --color-slate-800: #1e293b !important;
      --color-slate-900: #0f172a !important;
      --color-blue-50: #eff6ff !important;
      --color-blue-100: #dbeafe !important;
      --color-blue-200: #bfdbfe !important;
      --color-blue-300: #93c5fd !important;
      --color-blue-400: #60a5fa !important;
      --color-blue-500: #3b82f6 !important;
      --color-blue-600: #2563eb !important;
      --color-blue-700: #1d4ed8 !important;
      --color-blue-800: #1e40af !important;
      --color-blue-900: #1e3a8a !important;
      --color-indigo-600: #4f46e5 !important;
      --color-indigo-700: #4338ca !important;
      --tw-shadow-color: #000000 !important;
      --tw-ring-color: #3b82f6 !important;
    }
    #invoice-content .text-slate-900 { color: #0f172a !important; }
    #invoice-content .text-slate-800 { color: #1e293b !important; }
    #invoice-content .text-slate-700 { color: #334155 !important; }
    #invoice-content .text-slate-600 { color: #475569 !important; }
    #invoice-content .text-slate-500 { color: #64748b !important; }
    #invoice-content .text-slate-400 { color: #94a3b8 !important; }
    #invoice-content .text-blue-600 { color: #2563eb !important; }
    #invoice-content .bg-slate-900 { background-color: #0f172a !important; }
    #invoice-content .bg-slate-50 { background-color: #f8fafc !important; }
    #invoice-content .bg-blue-50 { background-color: #eff6ff !important; }
    #invoice-content .border-slate-900 { border-color: #0f172a !important; }
    #invoice-content .border-slate-400 { border-color: #94a3b8 !important; }
    #invoice-content .border-slate-300 { border-color: #cbd5e1 !important; }
    #invoice-content .border-slate-200 { border-color: #e2e8f0 !important; }
    #invoice-content .border-blue-500 { border-color: #3b82f6 !important; }

    :root {
      --page-scale: ${dimensions.scale};
      --page-padding: ${dimensions.scale >= 1.2 ? '40px' : dimensions.scale >= 1 ? '32px' : '20px'};
      --section-gap: ${dimensions.scale >= 1.2 ? '48px' : dimensions.scale >= 1 ? '32px' : '16px'};
      --content-gap: ${dimensions.scale >= 1.2 ? '32px' : dimensions.scale >= 1 ? '24px' : '8px'};
      --header-min-w: ${dimensions.scale >= 1.2 ? '300px' : dimensions.scale >= 1 ? '240px' : '160px'};
      --detail-min-w: ${dimensions.scale >= 1.2 ? '180px' : dimensions.scale >= 1 ? '140px' : '100px'};
      --font-heading: ${dimensions.scale >= 1.2 ? '32px' : dimensions.scale >= 1 ? '24px' : '18px'};
      --font-title: ${dimensions.scale >= 1.2 ? '42px' : dimensions.scale >= 1 ? '36px' : '22px'};
      --font-subtitle: ${dimensions.scale >= 1.2 ? '14px' : dimensions.scale >= 1 ? '12px' : '10px'};
      --font-body: ${dimensions.scale >= 1.2 ? '12px' : dimensions.scale >= 1 ? '10px' : '8px'};
      --font-table-header: ${dimensions.scale >= 1.2 ? '11px' : dimensions.scale >= 1 ? '10px' : '7.5px'};
      --tracking-base: ${dimensions.scale >= 1 ? '0.1em' : '0.05em'};
      --table-px: ${dimensions.scale >= 1 ? '12px' : '4px'};
    }

    @page {
      size: ${dimensions.width} ${dimensions.height} portrait;
      margin: 8mm;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        letter-spacing: normal !important; /* Reset and override sparingly */
      }

      html, body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        visibility: hidden !important;
      }

      #invoice-modal-print {
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
        z-index: 9999 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: visible !important;
      }

      #invoice-modal-print * {
        visibility: visible !important;
      }

      /* Explicitly handle print:hidden to ensure UI elements are not printed */
      #invoice-modal-print .print\:hidden {
        display: none !important;
        visibility: hidden !important;
      }

      #invoice-modal-print > div {
        background: white !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: var(--page-padding) !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        overflow: visible !important;
        display: block !important;
        animation: none !important;
      }

      #invoice-content {
        width: 100% !important;
        max-width: 100% !important;
        max-height: none !important;
        height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }

      /* Typography scaling */
      h1 { font-size: var(--font-heading) !important; color: #000 !important; }
      h2 { 
        font-size: var(--font-title) !important; 
        color: #000 !important; 
        letter-spacing: var(--tracking-base) !important; 
      }
      h3, h4 { font-size: var(--font-subtitle) !important; color: #000 !important; }
      p, span, td, th { 
        font-size: var(--font-body) !important; 
        line-height: 1.3 !important; 
        color: #000 !important; 
      }
      
      .tracking-widest { 
        letter-spacing: var(--tracking-base) !important; 
      }

      /* Table optimization */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto !important;
      }

      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }

      th, td {
        border: 1px solid #000 !important;
        padding: 4px var(--table-px) !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        background: white !important;
        color: #000 !important;
      }

      /* Prevent orphaned content */
      .prevent-break {
        page-break-inside: avoid !important;
      }

      /* Section breaks */
      .invoice-section {
        page-break-inside: avoid !important;
      }

      /* Remove animations and transitions */
      * {
        animation: none !important;
        transition: none !important;
        transform: none !important;
      }
    }
  `;


  return (
    <>
      <style>{printStyles}</style>
      <div id="invoice-modal-print" className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-5xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div className="flex items-center space-x-2 text-white">
              <i className="fas fa-file-invoice text-blue-400"></i>
              <span className="font-bold text-sm tracking-widest uppercase">Invoice Preview</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {/* Page Size Selector */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label className="text-white text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                  <i className="fas fa-file text-yellow-400 mr-1"></i> Page Size:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSize)}
                  className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full sm:w-auto"
                >
                  <option value="A3">📄 A3 (Landscape Large)</option>
                  <option value="A4">📄 A4 (Standard)</option>
                  <option value="A5">📄 A5 (Small)</option>
                  <option value="Letter">📄 Letter (US Standard)</option>
                  <option value="Legal">📄 Legal (US Large)</option>
                  <option value="Tabloid">📄 Tabloid (Large)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 w-full sm:w-auto">
                <div className="relative group flex-1 sm:flex-none">
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-green-500/20"
                  >
                    <i className="fab fa-whatsapp text-sm mr-2"></i> WhatsApp
                  </button>
                  <div className="absolute top-full right-0 lg:left-1/2 lg:-translate-x-1/2 mt-2 w-64 p-3 bg-slate-800 text-white text-[11px] text-center rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-slate-700 font-medium">
                    <span className="text-yellow-400 block mb-1"><i className="fas fa-lightbulb mr-1"></i> Tip</span>
                    Save the invoice using <strong>Print / PDF</strong> first, then attach the file directly in the WhatsApp chat window!
                    <div className="absolute -top-1.5 right-10 lg:left-1/2 lg:-translate-x-1/2 border-x-6 border-x-transparent border-b-6 border-b-slate-800"></div>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className={`flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i> Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-pdf mr-2"></i> Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  <i className="fas fa-print mr-2"></i> Print
                </button>
                <button
                  onClick={onClose}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Content */}
          <div
            id="invoice-content"
            ref={invoiceRef}
            className={`bg-white text-slate-800 overflow-y-auto print:max-h-none print:overflow-visible transition-all duration-300`}
            style={{ padding: 'var(--page-padding)', maxHeight: dimensions.scale >= 1.2 ? '85vh' : '90vh' }}
          >

            {/* Page Size Info Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-6 print:hidden">
              <div className="flex items-start space-x-2">
                <i className="fas fa-info-circle text-blue-600 mt-1 text-sm"></i>
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">📋 Page Format: <strong>{pageSize}</strong> ({dimensions.width} × {dimensions.height})</p>
                  <p className="text-blue-700">✓ Invoice will fit perfectly on {pageSize} paper • No content will be cut or overlapped</p>
                </div>
              </div>
            </div>

            {/* ===== COMPANY HEADER ===== */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 prevent-break">
              <div className="flex flex-wrap justify-between" style={{ gap: 'var(--content-gap)' }}>
                {/* Company Details - Left */}
                <div style={{ flex: '1.2', minWidth: 'var(--header-min-w)' }}>
                  <h1 className="text-slate-900 mb-2 break-words" style={{ fontSize: 'var(--font-heading)', fontWeight: '900', letterSpacing: '0.05em' }}>
                    {company.name}
                  </h1>
                  <div className="text-slate-700 space-y-1 leading-relaxed text-left" style={{ fontSize: 'var(--font-body)' }}>
                    <p className="font-semibold text-slate-800">Address:</p>
                    <p className="whitespace-pre-wrap ml-0 break-words">{company.address}</p>
                  </div>
                </div>

                {/* Invoice Details - Center */}
                <div className="text-center px-4" style={{ minWidth: 'var(--detail-min-w)' }}>
                  <h2 className="font-black text-slate-900 mb-2 tracking-widest" style={{ fontSize: 'var(--font-title)' }}>INVOICE</h2>
                  <div className="space-y-2">
                    <div>
                      <p className="font-bold text-slate-500 uppercase tracking-widest mb-0.5" style={{ fontSize: 'var(--font-body)' }}>Invoice No.</p>
                      <p className="font-bold text-blue-600" style={{ fontSize: 'var(--font-subtitle)' }}>{transaction.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-500 uppercase tracking-widest mb-0.5" style={{ fontSize: 'var(--font-body)' }}>Date</p>
                      <p className="font-bold text-slate-800" style={{ fontSize: 'var(--font-subtitle)' }}>{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Details - Right */}
                <div className="text-left" style={{ minWidth: 'var(--detail-min-w)' }}>
                  <div className="text-slate-700 space-y-1.5" style={{ fontSize: 'var(--font-body)' }}>
                    <div>
                      <span className="font-bold text-slate-800">Contact No:</span>
                      <p className="ml-0">{company.contact}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Email:</span>
                      <p className="ml-0 break-all">{company.website || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">GSTIN:</span>
                      <p className="ml-0">{company.gstNumber || company.taxId}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">License No:</span>
                      <p className="ml-0">{company.licenseNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== BUYER DETAILS ===== */}
            <div className="grid grid-cols-2 mb-4 pb-4 border-b border-slate-200 prevent-break" style={{ gap: 'var(--section-gap)' }}>
              <div>
                <p className="font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300" style={{ fontSize: 'var(--font-body)' }}>Sold To (Buyer Details)</p>
                <div className="text-slate-700 space-y-1" style={{ fontSize: 'var(--font-body)' }}>
                  <p><span className="font-bold text-slate-800">Name:</span> {transaction.entityName}</p>
                  <p><span className="font-bold text-slate-800">Address:</span> {customer?.address || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">Contact:</span> {customer?.phone || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">GSTIN:</span> {customer?.gstPanId || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">License No:</span> {customer?.licenseNo || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300" style={{ fontSize: 'var(--font-body)' }}>Shipping Details</p>
                <div className="text-slate-700 space-y-1" style={{ fontSize: 'var(--font-body)' }}>
                  <p><span className="font-bold text-slate-800">Address:</span> {customer?.address || 'Same as Buyer'}</p>
                  <p><span className="font-bold text-slate-800">Delivery Date:</span> {formatDate(transaction.date)}</p>
                </div>
              </div>
            </div>

            {/* ===== ITEMS TABLE ===== */}
            <div className="mb-8">
              <table className="w-full border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-900 px-1 py-2 text-left font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '35px' }}>Sr.</th>
                    <th className="border border-slate-900 px-2 py-2 text-left font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)' }}>Description of Goods</th>
                    <th className="border border-slate-900 px-1 py-2 text-center font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '45px' }}>Qty</th>
                    <th className="border border-slate-900 px-1 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '75px' }}>Rate</th>
                    <th className="border border-slate-900 px-1 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '50px' }}>SGST%</th>
                    <th className="border border-slate-900 px-1 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '70px' }}>SGST Amt</th>
                    <th className="border border-slate-900 px-1 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '50px' }}>CGST%</th>
                    <th className="border border-slate-900 px-1 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '70px' }}>CGST Amt</th>
                    <th className="border border-slate-900 px-2 py-2 text-right font-bold uppercase tracking-widest" style={{ fontSize: 'var(--font-table-header)', width: '90px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, index) => {
                    const amount = item.quantity * item.unitPrice;
                    const sgstRate = item.sgstRate || 0;
                    const cgstRate = item.cgstRate || 0;
                    const sgstAmount = item.sgstAmount || (amount * sgstRate / 100);
                    const cgstAmount = item.cgstAmount || (amount * cgstRate / 100);

                    return (
                      <tr key={index} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="border border-slate-300 px-1 py-2 text-center font-medium" style={{ fontSize: 'var(--font-body)' }}>{index + 1}</td>
                        <td className="border border-slate-300 px-2 py-2 text-slate-800" style={{ fontSize: 'var(--font-body)' }}>
                          <p className="font-semibold">{item.productName} {item.hsnCode ? `[HSN: ${item.hsnCode}]` : ''}</p>
                        </td>
                        <td className="border border-slate-300 px-1 py-2 text-center font-medium" style={{ fontSize: 'var(--font-body)' }}>{item.quantity}</td>
                        <td className="border border-slate-300 px-1 py-2 text-right font-medium" style={{ fontSize: 'var(--font-body)' }}>{symbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="border border-slate-300 px-1 py-2 text-right font-medium" style={{ fontSize: 'var(--font-body)' }}>{sgstRate}%</td>
                        <td className="border border-slate-300 px-1 py-2 text-right font-medium" style={{ fontSize: 'var(--font-body)' }}>{symbol}{sgstAmount.toFixed(2)}</td>
                        <td className="border border-slate-300 px-1 py-2 text-right font-medium" style={{ fontSize: 'var(--font-body)' }}>{cgstRate}%</td>
                        <td className="border border-slate-300 px-1 py-2 text-right font-medium" style={{ fontSize: 'var(--font-body)' }}>{symbol}{cgstAmount.toFixed(2)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right font-bold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>{symbol}{(amount + sgstAmount + cgstAmount).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-900">
                    <td colSpan={2} className="border border-slate-300 px-3 py-3 text-right font-bold" style={{ fontSize: 'var(--font-subtitle)' }}>TOTAL</td>
                    <td className="border border-slate-300 px-1 py-3 text-center font-bold" style={{ fontSize: 'var(--font-subtitle)' }}>{totalQuantity}</td>
                    <td colSpan={5} className="border border-slate-300 px-1 py-3"></td>
                    <td className="border border-slate-300 px-2 py-3 text-right font-bold text-blue-600" style={{ fontSize: 'var(--font-subtitle)' }}>{symbol}{(subtotal + totalSGST + totalCGST).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== AMOUNTS SUMMARY ===== */}
            <div className="flex justify-end mb-12">
              <div className="w-full max-w-xs">
                <table className="w-full border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 font-semibold text-slate-700" style={{ fontSize: 'var(--font-body)' }}>Subtotal</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>{symbol}{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 font-semibold text-slate-700" style={{ fontSize: 'var(--font-body)' }}>SGST</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>{symbol}{totalSGST.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 font-semibold text-slate-700" style={{ fontSize: 'var(--font-body)' }}>CGST</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>{symbol}{totalCGST.toFixed(2)}</td>
                    </tr>
                    {transaction.roundOff !== undefined && transaction.roundOff !== 0 ? (
                      <tr className="border-b border-slate-300">
                        <td className="px-4 py-2 font-semibold text-slate-700" style={{ fontSize: 'var(--font-body)' }}>Round Off</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>{symbol}{transaction.roundOff.toFixed(2)}</td>
                      </tr>
                    ) : null}
                    <tr className="bg-blue-50 border-t-2 border-slate-900">
                      <td className="px-4 py-3 font-bold text-slate-900" style={{ fontSize: 'var(--font-body)' }}>GRAND TOTAL</td>
                      <td className="px-4 py-3 text-right font-black text-blue-600" style={{ fontSize: 'var(--font-title)' }}>{symbol}{grandTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== DECLARATION SECTION ===== */}
            <div className="grid grid-cols-2 mb-12 prevent-break" style={{ gap: 'var(--section-gap)' }}>
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300" style={{ fontSize: 'var(--font-body)' }}>Declaration</p>
                <p className="text-slate-600 leading-relaxed" style={{ fontSize: 'var(--font-body)' }}>
                  I/We hereby certify that the particulars given above are true and correct. The goods supplied/services rendered are as per the terms and conditions agreed upon. All statutory obligations have been complied with.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300" style={{ fontSize: 'var(--font-body)' }}>Notes & Terms</p>
                <ul className="text-slate-600 space-y-1 leading-relaxed" style={{ fontSize: 'var(--font-body)' }}>
                  <li>• Payment Terms: Due on Receipt</li>
                  <li>• Method of Payment: As per agreement</li>
                  <li>• All disputes subject to jurisdiction</li>
                </ul>
              </div>
            </div>

            {/* ===== SIGNATURE SECTION ===== */}
            <div className="border-t-2 border-slate-900 pt-8 prevent-break">
              <div className="grid grid-cols-3" style={{ gap: 'var(--section-gap)' }}>
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="font-semibold text-slate-600"></span>
                  </div>
                  <p className="font-bold text-slate-700 mt-1 uppercase tracking-widest" style={{ fontSize: 'var(--font-body)' }}>Authorized Signature</p>
                  <p className="font-bold text-slate-700 uppercase tracking-widest" style={{ fontSize: 'var(--font-body)' }}>of Firm/Company</p>
                </div>
                <div></div>
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="font-semibold text-slate-600"></span>
                  </div>
                  <p className="font-bold text-slate-700 mt-1 uppercase tracking-widest" style={{ fontSize: 'var(--font-body)' }}>Signature of Buyer</p>
                  <p className="font-bold text-slate-700 uppercase tracking-widest" style={{ fontSize: 'var(--font-body)' }}>with Stamp/Seal</p>
                </div>
              </div>
            </div>

            {/* Footer - Hidden on print */}
            <div className="mt-8 text-center border-t pt-4 print:hidden">
              <p className="text-slate-500" style={{ fontSize: 'var(--font-body)' }}>
                This is a computer-generated invoice. No physical signature is required.
              </p>
              <p className="text-slate-500 mt-1" style={{ fontSize: 'var(--font-body)' }}>
                For enquiries, please contact {company.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceModal;
