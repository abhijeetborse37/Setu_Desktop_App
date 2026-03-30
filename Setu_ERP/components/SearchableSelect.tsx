import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
  subtext?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCustomCreate?: (name: string) => void;
  placeholder: string;
  label?: string;
  required?: boolean;
}

const SearchableSelect: React.FC<Props> = ({ options, value, onChange, onCustomCreate, placeholder, label, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.subtext && o.subtext.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showCustomAdd = onCustomCreate && searchTerm.trim().length > 0 && 
    !options.some(o => o.name.toLowerCase() === searchTerm.trim().toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomCreate = () => {
    if (onCustomCreate && searchTerm.trim()) {
      onCustomCreate(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }

    const totalCount = filteredOptions.length + (showCustomAdd ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalCount) % totalCount);
        break;
      case 'Enter':
        e.preventDefault();
        if (showCustomAdd && highlightedIndex === filteredOptions.length) {
          handleCustomCreate();
        } else if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div 
        className={`relative flex items-center bg-slate-50 border transition-all duration-200 cursor-pointer overflow-hidden ${
          isOpen ? 'rounded-t-xl border-blue-500 ring-2 ring-blue-500/10' : 'rounded-xl border-slate-200'
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 10);
        }}
      >
        <div className="flex-1 px-4 py-3 min-h-[44px] flex items-center justify-between">
          {!isOpen ? (
            <span className={`text-sm tracking-tight ${selectedOption ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-none outline-none text-sm p-0 placeholder:text-slate-300"
              placeholder="Search or type new name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              autoComplete="off"
            />
          )}
          <i className={`fas fa-chevron-down text-[10px] text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}></i>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full bg-white border-x border-b border-blue-500 rounded-b-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
          {(filteredOptions.length > 0 || showCustomAdd) ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.id}
                  className={`px-4 py-3 cursor-pointer transition-colors flex flex-col gap-0.5 ${
                    index === highlightedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  } ${value === option.id ? 'bg-blue-50/50' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option.id);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${value === option.id ? 'font-bold text-blue-600' : 'text-slate-700 font-medium'}`}>
                      {option.name}
                    </span>
                    {value === option.id && <i className="fas fa-check text-blue-500 text-xs"></i>}
                  </div>
                  {option.subtext && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {option.subtext}
                    </span>
                  )}
                </li>
              ))}
              
              {showCustomAdd && (
                <li
                  className={`px-4 py-4 cursor-pointer transition-colors border-t border-slate-100 flex items-center justify-between ${
                    highlightedIndex === filteredOptions.length ? 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700' : 'hover:bg-emerald-50 text-emerald-600'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomCreate();
                  }}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <i className="fas fa-user-plus text-emerald-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold">Add "{searchTerm}"</p>
                      <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">Create New Customer</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-xs"></i>
                </li>
              )}
            </ul>
          ) : (
            <div className="px-6 py-8 text-center bg-slate-50/50">
              <i className="fas fa-search text-slate-200 text-2xl mb-2 block"></i>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No matches found</p>
              <p className="text-[10px] text-slate-300 mt-1 uppercase">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
