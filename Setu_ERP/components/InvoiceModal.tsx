
import React, { useState } from 'react';
import { Transaction, Company, Customer } from '../types';

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
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  
  if (!company) return null;

  const symbol = company.currencySymbol || '₹';
  const dimensions = PAGE_SIZES[pageSize];

  const handleDownload = () => {
    const originalTitle = document.title;
    const formattedDate = formatDate(transaction.date).replace(/\//g, '-');
    const safeCustomerName = transaction.entityName.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${safeCustomerName}_${transaction.invoiceNumber}_${formattedDate}`;

    document.title = fileName;
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
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
    :root {
      --page-scale: ${dimensions.scale};
      --page-padding: ${dimensions.scale >= 1.2 ? '50px' : dimensions.scale >= 1 ? '40px' : '25px'};
      --font-heading: ${dimensions.scale >= 1.2 ? '28px' : dimensions.scale >= 1 ? '24px' : '18px'};
      --font-title: ${dimensions.scale >= 1.2 ? '20px' : dimensions.scale >= 1 ? '16px' : '14px'};
      --font-body: ${dimensions.scale >= 1.2 ? '11px' : dimensions.scale >= 1 ? '10px' : '8px'};
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
      }

      html, body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
      }

      body * {
        visibility: hidden !important;
      }

      #invoice-modal-print,
      #invoice-modal-print * {
        visibility: visible !important;
      }

      #invoice-modal-print {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        z-index: 9999 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: visible !important;
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
      h1 { font-size: var(--font-heading) !important; }
      h2 { font-size: var(--font-title) !important; }
      h3, h4 { font-size: 12px !important; }
      p, span, td, th { font-size: var(--font-body) !important; line-height: 1.3 !important; }

      /* Table optimization */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: avoid !important;
      }

      th, td {
        border: 1px solid #000 !important;
        padding: 4px 3px !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }

      /* Prevent orphaned content */
      .prevent-break {
        page-break-inside: avoid !important;
      }

      /* Section breaks */
      .invoice-section {
        page-break-inside: prefer !important;
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
      <div id="invoice-modal-print" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
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
                <button 
                  onClick={handleDownload} 
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  <i className="fas fa-download mr-2"></i> Print / PDF
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
          <div id="invoice-content" className={`bg-white text-slate-800 overflow-y-auto print:max-h-none print:overflow-visible ${
            pageSize === 'A3' ? 'p-12 max-h-[85vh]' :
            pageSize === 'A4' ? 'p-10 max-h-[90vh]' :
            pageSize === 'A5' ? 'p-6 max-h-[92vh]' :
            pageSize === 'Letter' ? 'p-10 max-h-[90vh]' :
            pageSize === 'Legal' ? 'p-10 max-h-[88vh]' :
            'p-12 max-h-[84vh]'
          }`}>

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
            <div className="border-b-2 border-slate-900 pb-8 mb-8 prevent-break">
              <div className="flex flex-wrap justify-between gap-6">
                {/* Company Details - Left */}
                <div className="flex-1 min-w-[250px]">
                  <h1 className="text-2xl font-black text-slate-900 mb-3 break-words" style={{ letterSpacing: '0.05em' }}>
                    {company.name}
                  </h1>
                  <div className="text-xs text-slate-700 space-y-1 leading-relaxed text-left">
                    <p className="font-semibold text-slate-800">Address:</p>
                    <p className="whitespace-pre-wrap ml-0 break-words">{company.address}</p>
                  </div>
                </div>

                {/* Invoice Details - Center */}
                <div className="text-center px-6 min-w-[150px]">
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-widest">INVOICE</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Invoice No.</p>
                      <p className="text-sm font-bold text-blue-600">{transaction.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Details - Right */}
                <div className="text-left min-w-[150px]">
                  <div className="text-xs text-slate-700 space-y-2">
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
            <div className="grid grid-cols-2 gap-12 mb-8 pb-6 border-b border-slate-200 prevent-break">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Sold To (Buyer Details)</p>
                <div className="text-xs text-slate-700 space-y-1">
                  <p><span className="font-bold text-slate-800">Name:</span> {transaction.entityName}</p>
                  <p><span className="font-bold text-slate-800">Address:</span> {customer?.address || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">Contact:</span> {customer?.phone || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">GSTIN:</span> {customer?.gstPanId || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">License No:</span> {customer?.licenseNo || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Shipping Details</p>
                <div className="text-xs text-slate-700 space-y-1">
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
                    <th className="border border-slate-900 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest w-8">Sr.</th>
                    <th className="border border-slate-900 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest flex-1">Description of Goods</th>
                    <th className="border border-slate-900 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest w-16">Qty</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">Rate</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-16">SGST%</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">SGST Amt</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-16">CGST%</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">CGST Amt</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">Amount</th>
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
                        <td className="border border-slate-300 px-3 py-4 text-center text-xs font-medium">{index + 1}</td>
                        <td className="border border-slate-300 px-3 py-4 text-xs text-slate-800">
                          <p className="font-semibold">{item.productName} {item.hsnCode ? `[HSN: ${item.hsnCode}]` : ''}</p>
                        </td>
                        <td className="border border-slate-300 px-3 py-4 text-center text-xs font-medium">{item.quantity}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{symbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{sgstRate}%</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{symbol}{sgstAmount.toFixed(2)}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{cgstRate}%</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{symbol}{cgstAmount.toFixed(2)}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-bold text-slate-900">{symbol}{(amount + sgstAmount + cgstAmount).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-900">
                    <td colSpan={2} className="border border-slate-300 px-3 py-4 text-right font-bold text-sm">TOTAL</td>
                    <td className="border border-slate-300 px-3 py-4 text-center font-bold text-sm">{totalQuantity}</td>
                    <td colSpan={5} className="border border-slate-300 px-3 py-4"></td>
                    <td className="border border-slate-300 px-3 py-4 text-right font-bold text-sm">{symbol}{(subtotal + totalSGST + totalCGST).toFixed(2)}</td>
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
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">Subtotal</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">SGST</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{totalSGST.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">CGST</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{totalCGST.toFixed(2)}</td>
                    </tr>
                    {transaction.roundOff && (
                      <tr className="border-b border-slate-300">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-700">Round Off</td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{transaction.roundOff.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-blue-50 border-t-2 border-slate-900">
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">GRAND TOTAL</td>
                      <td className="px-4 py-3 text-right text-lg font-black text-blue-600">{symbol}{grandTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== DECLARATION SECTION ===== */}
            <div className="grid grid-cols-2 gap-8 mb-12 prevent-break">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Declaration</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I/We hereby certify that the particulars given above are true and correct. The goods supplied/services rendered are as per the terms and conditions agreed upon. All statutory obligations have been complied with.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Notes & Terms</p>
                <ul className="text-xs text-slate-600 space-y-1 leading-relaxed">
                  <li>• Payment Terms: Due on Receipt</li>
                  <li>• Method of Payment: As per agreement</li>
                  <li>• All disputes subject to jurisdiction</li>
                </ul>
              </div>
            </div>

            {/* ===== SIGNATURE SECTION ===== */}
            <div className="border-t-2 border-slate-900 pt-8 prevent-break">
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="text-xs font-semibold text-slate-600"></span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-widest">Authorized Signature</p>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">of Firm/Company</p>
                </div>
                <div></div>
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="text-xs font-semibold text-slate-600"></span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-widest">Signature of Buyer</p>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">with Stamp/Seal</p>
                </div>
              </div>
            </div>

            {/* Footer - Hidden on print */}
            <div className="mt-8 text-center border-t pt-4 print:hidden">
              <p className="text-xs text-slate-500">
                This is a computer-generated invoice. No physical signature is required.
              </p>
              <p className="text-xs text-slate-500 mt-1">
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
