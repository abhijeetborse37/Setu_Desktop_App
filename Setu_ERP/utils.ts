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
