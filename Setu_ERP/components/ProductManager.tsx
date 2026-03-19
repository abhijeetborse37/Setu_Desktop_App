
import React, { useState, useMemo, useRef } from 'react';
import { Product, CustomAttribute, User } from '../types';
import { productService } from '../services/api';

interface Props {
  products: Product[];
  onDataChange: () => void;
  activeCompanyId: string | null;
  currencySymbol: string;
  currentUser: User;
}

const ProductManager: React.FC<Props> = ({ products, onDataChange, activeCompanyId, currencySymbol, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customAttrs, setCustomAttrs] = useState<CustomAttribute[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    sku: '',
    price: '' as string | number,
    description: '',
    unitPerPack: '' as string | number,
    hsnCode: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!newProduct.name || newProduct.name.trim().length < 2) newErrors.name = 'Please enter a product name.';
    if (!newProduct.price || Number(newProduct.price) <= 0) newErrors.price = 'Please enter a valid price.';
    if (!newProduct.sku || !/^[A-Z0-9\-_]{3,15}$/i.test(newProduct.sku)) newErrors.sku = 'Code must be 3-15 characters.';

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large! Please select an image under 5MB.");
        return;
      }

      try {
        const compressedBase64 = await compressImage(file);
        setPreviewImage(compressedBase64);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !validate() || isBusy) return;

    setIsBusy(true);
    setSuccessMsg('');
    const priceVal = Number(newProduct.price);

    let imageUrl = previewImage || `https://picsum.photos/200/200?random=${Date.now()}`;

    try {
      const productData = {
        name: newProduct.name?.trim() || '',
        category: newProduct.category?.trim() || '',
        sku: newProduct.sku?.trim().toUpperCase() || '',
        price: priceVal,
        description: newProduct.description?.trim() || '',
        image: imageUrl,
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
    setNewProduct({ name: '', category: '', sku: '', price: '', description: '', unitPerPack: '', hsnCode: '' });
    setCustomAttrs([]);
    setPreviewImage(null);
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
      unitPerPack: product.unitPerPack || '',
      hsnCode: product.hsnCode || ''
    });
    setPreviewImage(product.image || null);
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
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Product Catalog</h2>
          {/* <div className="flex items-center mt-2 group cursor-help">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest mr-3">Current Company:</span>
            <span className="text-xs font-bold text-slate-500 uppercase">{activeCompanyId ? `ID: ${activeCompanyId.substring(0, 8)}...` : 'NONE SELECTED'}</span>
          </div> */}
        </div>
        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 flex items-center justify-between min-w-[200px]">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Items</div>
          <div className="text-xl font-black text-slate-900 leading-none">{products.length}</div>
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
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center uppercase text-[10px] tracking-widest"
        >
          <i className="fas fa-plus mr-2"></i> Add New Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedProducts.map(product => {
          // Normalize properties for rendering
          const name = product.name || (product as any).Name || 'Unnamed Product';
          const sku = product.sku || (product as any).Sku || 'NO SKU';
          const price = product.price ?? (product as any).Price ?? 0;
          const image = product.image || (product as any).Image || `https://picsum.photos/200/200?random=${product.id || (product as any).Id}`;
          const category = product.category || (product as any).Category || 'General';
          const stock = product.stock ?? (product as any).Stock ?? 0;
          const unitPerPack = product.unitPerPack ?? (product as any).UnitPerPack ?? '';
          const hsnCode = product.hsnCode ?? (product as any).HsnCode ?? '';
          const description = product.description || (product as any).Description || 'No detailed description available.';

          return (
            <div key={product.id || (product as any).Id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col h-full active:scale-[0.98]">
              <div className="relative h-52 overflow-hidden bg-slate-100">
                <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={name} />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-md text-slate-800 text-[8px] px-3 py-1.5 rounded-full uppercase font-black tracking-[0.1em] shadow-sm border border-slate-100">
                    {category}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-4 md:group-hover:translate-x-0">
                  <button onClick={(e) => startEdit(e, product)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                    <i className="fas fa-pencil-alt text-xs"></i>
                  </button>
                  <button onClick={(e) => deleteProduct(e, product.id || (product as any).Id)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-600 hover:bg-red-600 hover:text-white transition-all shadow-lg">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="truncate pr-2">
                    <h4 className="font-black text-slate-900 truncate uppercase tracking-tight text-sm group-hover:text-blue-600 transition-colors">{name}</h4>
                    <div className="flex flex-wrap items-center mt-1 gap-x-4">
                      <div className="flex items-center">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mr-2">SKU:</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{sku}</span>
                      </div>
                      {unitPerPack && (
                        <div className="flex items-center">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mr-2">Unit/Pack:</span>
                          <span className="text-[10px] text-blue-600 font-bold uppercase">{unitPerPack}</span>
                        </div>
                      )}
                      {hsnCode && (
                        <div className="flex items-center">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mr-2">HSN:</span>
                          <span className="text-[10px] text-emerald-600 font-bold uppercase">{hsnCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-blue-600 text-lg leading-none">{currencySymbol}{price.toLocaleString()}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mt-1 flex-1 leading-relaxed">{description}</p>

                <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-50">
                  <div className={`flex items-center px-2.5 py-1 rounded-full ${stock > 10 ? 'bg-emerald-50 text-emerald-600' : stock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${stock > 10 ? 'bg-emerald-500' : stock > 0 ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Stock: {stock}
                    </span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    Verified Catalog
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="col-span-full py-24 bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fas fa-box-open text-2xl opacity-20"></i>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Catalog is Empty</p>
            <p className="text-[10px] mt-2 text-slate-400 max-w-[200px]">Add your first product to start tracking inventory and managing sales.</p>
          </div>
        )}
        {products.length > 0 && paginatedProducts.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <i className="fas fa-search text-3xl mb-4 opacity-20"></i>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
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

              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-48 flex-shrink-0">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest ml-1">Product Photo</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square w-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden shadow-inner group relative"
                  >
                    {previewImage ? (
                      <>
                        <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <i className="fas fa-sync text-white text-xl"></i>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <i className="fas fa-cloud-upload-alt text-3xl text-slate-300 group-hover:text-blue-500 transition-colors mb-2"></i>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Upload Image</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>
                </div>

                <div className="flex-1 w-full space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Product Name</label>
                    <input
                      required
                      type="text"
                      placeholder="What are you selling?"
                      className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-500 ring-4 ring-red-50 ring-opacity-50' : 'border-slate-100'} rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium`}
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
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
                        className={`w-full bg-slate-50 border-2 ${errors.price ? 'border-red-500' : 'border-slate-100'} rounded-2xl px-5 py-3.5 font-black text-sm focus:border-blue-500 focus:bg-white outline-none transition-all`}
                        value={newProduct.price}
                        onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      />
                      {errors.price && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">SKU / Code</label>
                      <input
                        required
                        type="text"
                        placeholder="A-101"
                        className={`w-full bg-slate-50 border-2 ${errors.sku ? 'border-red-500' : 'border-slate-100'} rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 focus:bg-white outline-none uppercase font-bold transition-all`}
                        value={newProduct.sku || ''}
                        onChange={e => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                      />
                      {errors.sku && <p className="text-[10px] text-red-500 mt-2 font-bold ml-1">{errors.sku}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics, Clothing"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                    value={newProduct.category || ''}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Unit of Products (Qty per Pack)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Auto (1)"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-black"
                    value={newProduct.unitPerPack}
                    onChange={e => setNewProduct({ ...newProduct, unitPerPack: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">HSN Code</label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="4, 6, or 8 digits"
                    className={`w-full bg-slate-50 border-2 ${errors.hsnCode ? 'border-red-500 ring-4 ring-red-50 ring-opacity-50' : 'border-slate-100'} rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold`}
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
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-6 py-5 text-sm focus:border-blue-500 focus:bg-white outline-none resize-none transition-all font-medium"
                  value={newProduct.description || ''}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col-reverse md:flex-row justify-end items-center gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeForm} className="w-full md:w-auto px-6 md:px-8 py-4 font-black text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-[0.2em] transition-colors rounded-2xl hover:bg-slate-50">Discard</button>
                <button type="submit" disabled={isBusy} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95 flex items-center justify-center">
                  {isBusy ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                  {editingProduct ? 'Save Changes' : 'Add to Catalog'}
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
