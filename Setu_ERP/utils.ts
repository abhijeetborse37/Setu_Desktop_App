/**
 * Utility functions for date formatting
 */

/**
 * Format date string from ISO format (yyyy-mm-dd or full ISO datetime) to dd/mm/yyyy
 * @param dateStr - Date string in ISO format
 * @returns Formatted date string as dd/mm/yyyy
 */
export const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  
  let dateString = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  
  // Split by 'T' to handle full datetime strings
  const datePart = dateString.split('T')[0];
  
  // Split yyyy-mm-dd format
  const [year, month, day] = datePart.split('-');
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date for display in tables/cards with proper timezone handling
 * @param dateStr - Date string from API
 * @returns Formatted date string as dd/mm/yyyy
 */
export const formatDisplayDate = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '';
  
  try {
    if (typeof dateStr === 'string') {
      // If it's a full datetime string with T
      if (dateStr.includes('T')) {
        return formatDate(dateStr);
      }
      // If it's already in yyyy-mm-dd format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return formatDate(dateStr);
      }
    }
    
    // For Date objects
    if (dateStr instanceof Date) {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Standard Application-wide Form Field Validators
 * These validators return `true` if valid, `false` otherwise.
 */
export const validators = {
  // Name/Text: Minimum length specified (default 2), trims whitespace
  name: (value: string, minLen = 2): boolean => {
    return (value || '').trim().length >= minLen;
  },
  
  // Email: Standard email regex validation format
  email: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
  },
  
  // Phone/Contact: Allows optional leading '+', digits, dashes, spaces, brackets. Must have at least 10 numbers total.
  phone: (value: string): boolean => {
    if (!value) return true; // If field is optional. Use required check in form before this if mandatory.
    const numsOnly = value.replace(/\D/g, '');
    return /^\+?[0-9\s\-()]{10,20}$/.test(value) && numsOnly.length >= 10 && numsOnly.length <= 15;
  },

  // Password: Minimum 6 characters required by default backend auth policies
  password: (value: string): boolean => {
    return (value || '').length >= 6;
  },
  
  // Tax ID (e.g. GST, PAN, EIN, VAT): Alphanumeric with optional dashes, 5-20 characters
  taxId: (value: string): boolean => {
    if (!value) return true;
    return /^[A-Za-z0-9-]{5,20}$/.test(value.replace(/\s/g, ''));
  },

  // Bank Account Number: Numeric 9-18 digits global standard
  bankAccount: (value: string): boolean => {
    if (!value) return true;
    return /^[0-9]{9,18}$/.test(value.replace(/\s/g, ''));
  },

  // IFSC Code (Indian Banking): Must be 4 letters, '0', 6 alphanumeric characters
  ifsc: (value: string): boolean => {
    if (!value) return true;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value);
  },

  // Generic longer text/address validation
  text: (value: string, minLen = 5): boolean => {
    return (value || '').trim().length >= minLen;
  }
};
