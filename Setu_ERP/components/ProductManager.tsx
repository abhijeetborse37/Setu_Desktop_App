
import React, { useState, useMemo, useRef } from 'react';
import { Product, CustomAttribute, User, Company } from '../types';
import { productService } from '../services/api';
import { validators } from '../utils';

interface Props {
  products: Product[];
  onDataChange: () => void;
  activeCompanyId: string | null;
  activeCompany?: Company | null;
  currencySymbol: string;
  currentUser: User;
}

const ProductManager: React.FC<Props> = ({ products, onDataChange, activeCompanyId, activeCompany, currencySymbol, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customAttrs, setCustomAttrs] = useState<CustomAttribute[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    sku: '',
    price: '' as string | number,
    description: '',
    supplier: '',
    unitPerPack: '' as string | number,
    hsnCode: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProductId, setExpandedProductId] = useState<string>('');
  const ITEMS_PER_PAGE = 6;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!validators.name(newProduct.name, 2)) newErrors.name = 'Valid product name required (min 2 chars).';
    if (!newProduct.price || Number(newProduct.price) <= 0) newErrors.price = 'Please enter a valid price greater than 0.';
    if (!newProduct.sku || !/^[A-Z0-9\-_]{2,20}$/i.test(newProduct.sku)) newErrors.sku = 'SKU code must be 2-20 alphanumeric characters.';
    if (!validators.name(newProduct.supplier, 2)) newErrors.supplier = 'Valid supplier name required.';

    // HSN Validation
    const hsn = newProduct.hsnCode?.trim() || '';
    if (!hsn) {
      newErrors.hsnCode = 'HSN Code is required.';
    } else if (!/^\d+$/.test(hsn)) {
      newErrors.hsnCode = 'Only numeric digits allowed.';
    } else if (![4, 6, 8].includes(hsn.length)) {
      newErrors.hsnCode = 'Must be 4, 6, or 8 digits.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filteredProducts = useMemo(() => {
    const list = products
      .filter(p =>
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    // Handle possible undefined IDs to prevent localeCompare crashes
    return [...list].sort((a, b) => {
      const idA = String(a.id || (a as any).Id || '');
      const idB = String(b.id || (b as any).Id || '');
      return idB.localeCompare(idA);
    });
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !validate() || isBusy) return;

    setIsBusy(true);
    setSuccessMsg('');
    const priceVal = Number(newProduct.price);

    try {
      const productData = {
        name: newProduct.name?.trim() || '',
        category: newProduct.category?.trim() || '',
        sku: newProduct.sku?.trim().toUpperCase() || '',
        price: priceVal,
        description: newProduct.description?.trim() || '',
        supplier: newProduct.supplier?.trim() || '',
        companyId: activeCompanyId,
        userId: currentUser.id,
        stock: editingProduct?.stock || 0,
        unitPerPack: newProduct.unitPerPack === '' ? 1 : Number(newProduct.unitPerPack),
        hsnCode: newProduct.hsnCode?.trim() || ''
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
      } else {
        await productService.create(productData);
      }

      onDataChange();
      setSearchTerm(''); // Clear search
      setCurrentPage(1); // Reset to first page so new product is visible
      setSuccessMsg(`✓ Product ${editingProduct ? 'updated' : 'added'} successfully!`);
      setTimeout(closeForm, 1000);
    } catch (err: any) {
      console.error("Save Error Response:", err.response?.data);
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || JSON.stringify(err.response?.data) || err.message);
      alert("Save Error: " + msg);
    } finally {
      setIsBusy(false);
    }
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setErrors({});
    setSuccessMsg('');
    resetForm();
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      category: '',
      sku: '',
      price: '',
      description: '',
      supplier: activeCompany?.supplierName || '',
      unitPerPack: '',
      hsnCode: ''
    });
    setCustomAttrs([]);
  };

  const deleteProduct = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm('Delete this product from catalog?')) {
      try {
        await productService.delete(id);
        onDataChange();
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const startEdit = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); e.stopPropagation();
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category || '',
      sku: product.sku || '',
      price: product.price,
      description: product.description || '',
      supplier: product.supplier || activeCompany?.supplierName || '',
      unitPerPack: product.unitPerPack || '',
      hsnCode: product.hsnCode || ''
    });
    setErrors({});
    setShowAddForm(true);
  };

  if (!activeCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
          <i className="fas fa-box-open text-3xl text-slate-300"></i>
        </div>
        <p className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Business Context Required</p>
        <p className="text-xs text-slate-400 mt-2 max-w-xs">Please select a company profile from the sidebar to manage your product catalog.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Catalog Header with Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Items & Services Catalog</h2>
          <p className="text-sm text-slate-500 font-medium">List your products and services to manage stock and billing</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between min-w-[220px] ring-4 ring-slate-100/50">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Catalog Count</div>
          <div className="text-2xl font-black text-blue-600 leading-none">{products.length}</div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <input
            type="text"
            placeholder={`Search ${products.length} products...`}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-4 pl-12 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <i className="fas fa-search absolute left-4 top-[17px] text-slate-300"></i>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center uppercase text-[10px] tracking-[0.2em] active:scale-95"
        >
          <i className="fas fa-plus mr-3 text-sm"></i> Add New Item to Catalog
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">Name</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">SKU</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">Category</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">Price</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">Stock</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">Pack</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px]">HSN</th>
                <th className="px-6 py-5 uppercase tracking-[0.2em] text-slate-400 font-black text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(product => {
                const id = product.id || (product as any).Id || '';
                const name = product.name || (product as any).Name || 'Unnamed Product';
                const sku = product.sku || (product as any).Sku || 'NO SKU';
                const price = product.price ?? (product as any).Price ?? 0;
                const category = product.category || (product as any).Category || 'General';
                const stock = product.stock ?? (product as any).Stock ?? 0;
                const unitPerPack = product.unitPerPack ?? (product as any).UnitPerPack ?? '';
                const hsnCode = product.hsnCode ?? (product as any).HsnCode ?? '';
                const description = product.description || (product as any).Description || 'No detailed description available.';
                const isExpanded = id && id === expandedProductId;

                return (
                  <React.Fragment key={id || Math.random()}>
                    <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-all even:bg-slate-50/30 group">
                      <td className="px-6 py-4 font-black uppercase tracking-tight text-slate-900 text-sm">{name}</td>
                      <td className="p-3 font-mono text-slate-500 uppercase">{sku}</td>
                      <td className="p-3 text-slate-500">{category}</td>
                      <td className="p-3 text-slate-700 font-black">{currencySymbol}{price.toLocaleString()}</td>
                      <td className={`p-3 font-bold ${stock > 10 ? 'text-emerald-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>{stock}</td>
                      <td className="p-3 text-slate-500">{unitPerPack || '-'}</td>
                      <td className="p-3 text-slate-500">{hsnCode || '-'}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => setExpandedProductId(isExpanded ? '' : id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-600 hover:bg-slate-100"
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                        <button
                          onClick={(e) => startEdit(e, product)}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[10px] uppercase tracking-widest font-black text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => deleteProduct(e, id)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-[10px] uppercase tracking-widest font-black text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50 border-b border-slate-100">
                        <td colSpan={8} className="p-3 text-slate-700 text-[11px]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div><strong>Description:</strong> {description}</div>
                            <div><strong>Supplier:</strong> {product.supplier || (product as any).Supplier || 'Unknown'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <i className="fas fa-box-open text-3xl opacity-40"></i>
            <p className="text-xs font-bold uppercase tracking-widest mt-3">Your Catalog is Empty</p>
            <p className="text-[10px] mt-1">Add your first product to start tracking inventory and managing sales.</p>
          </div>
        )}

        {filteredProducts.length > 0 && paginatedProducts.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <i className="fas fa-search text-3xl opacity-20"></i>
            <p className="text-xs font-bold uppercase tracking-widest">No matching products found</p>
            <button onClick={() => setSearchTerm('')} className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest underline">Clear Search</button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
          </p>
          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>

            <div className="flex space-x-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                if (pageNum <= 0) pageNum = 1; // Safety

                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-4 md:my-8 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-6 md:px-8 md:py-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Edit Product Details' : 'Add New Product'}</h3>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Update your store catalog</p>
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                <i className="fas fa-times text-xl md:text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center animate-in fade-in">
                  <i className="fas fa-check-circle mr-2"></i> {successMsg}
                </div>
              )}

              <div className="flex-1 w-full space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Product Name</label>
                  <input
                    required
                    type="text"
                    autoFocus
                    placeholder="What are you selling?"
                    className={`w-full bg-white border-2 ${errors.name ? 'border-red-500 ring-4 ring-red-50 ring-opacity-50' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium shadow-sm`}
                    value={newProduct.name}
                    onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  />
                  {errors.name && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Selling Price ({currencySymbol})</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className={`w-full bg-white border-2 ${errors.price ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-3.5 font-black text-sm focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm`}
                      value={newProduct.price}
                      onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    />
                    {errors.price && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">SKU / Code</label>
                    <input
                      required
                      type="text"
                      placeholder="A-101"
                      className={`w-full bg-white border-2 ${errors.sku ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 focus:bg-white outline-none uppercase font-bold transition-all shadow-sm`}
                      value={newProduct.sku || ''}
                      onChange={e => setNewProduct(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    />
                    {errors.sku && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.sku}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics, Clothing"
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium shadow-sm"
                    value={newProduct.category || ''}
                    onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Suppliers Ltd"
                    className={`w-full bg-white border-2 ${errors.supplier ? 'border-red-500 ring-4 ring-red-50 ring-opacity-50' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium shadow-sm`}
                    value={newProduct.supplier || ''}
                    onChange={e => setNewProduct(prev => ({ ...prev, supplier: e.target.value }))}
                  />
                  {errors.supplier && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.supplier}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Unit of Products (Qty per Pack)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Auto (1)"
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-black shadow-sm"
                    value={newProduct.unitPerPack}
                    onChange={e => setNewProduct(prev => ({ ...prev, unitPerPack: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">HSN Code</label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="4, 6, or 8 digits"
                    className={`w-full bg-white border-2 ${errors.hsnCode ? 'border-red-500 ring-4 ring-red-50 ring-opacity-50' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold shadow-sm`}
                    value={newProduct.hsnCode}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewProduct({ ...newProduct, hsnCode: val });
                    }}
                  />
                  {errors.hsnCode && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.hsnCode}</p>}
                </div>
                <div className="col-span-full">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1 leading-relaxed">
                    <i className="fas fa-info-circle mr-1 text-blue-400"></i> Tip: Use unique SKU codes and correct HSN for GST tax compliance.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Product Details</label>
                <textarea
                  rows={4}
                  placeholder="Describe your product for customers..."
                  className="w-full bg-white border-2 border-slate-200 rounded-[2rem] px-6 py-5 text-sm focus:border-blue-500 focus:bg-white outline-none resize-none transition-all font-medium shadow-sm"
                  value={newProduct.description || ''}
                  onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex flex-col-reverse md:flex-row justify-end items-center gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeForm} className="w-full md:w-auto px-6 md:px-8 py-4 font-black text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-[0.2em] transition-colors rounded-2xl hover:bg-slate-50">Discard</button>
                <button type="submit" disabled={isBusy} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95 flex items-center justify-center">
                  {isBusy ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                  {editingProduct ? 'Save Item Updates' : 'Complete & Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
