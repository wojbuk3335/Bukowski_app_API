// Utility functions for AddToState component

// Function to format date for display
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return dateString;
    
    // Format as dd-mm-yyyy hh:mm:ss
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Function to generate unique transaction ID
export const generateTransactionId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Function to get user symbol by username
export const getUserSymbol = (usersData, username) => {
  const user = usersData.find(u => u.username === username);
  return user ? user.symbol : 'UNKNOWN';
};

// Function to filter items by search term
export const filterItemsBySearchTerm = (items, searchTerm) => {
  if (!searchTerm) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item => 
    item.fullName?.toLowerCase().includes(term) ||
    item.size?.toLowerCase().includes(term) ||
    item.barcode?.toLowerCase().includes(term) ||
    item.symbol?.toLowerCase().includes(term)
  );
};

// Function to determine item color class based on type
export const getItemColorClass = (item, operationType, selectedSellingPoint, targetSellingPoint) => {
  if (operationType === 'sprzedaz') {
    if (item.symbol === selectedSellingPoint) return 'blueItem';
    if (item.symbol === 'MAGAZYN') return 'orangeItem';
  } else if (operationType === 'przepisanie') {
    if (item.symbol === 'MAGAZYN') return 'orangeItem';
    if (item.symbol === targetSellingPoint) return 'greenItem';
  }
  return '';
};

// Function to calculate totals for items
export const calculateTotals = (items) => {
  return items.reduce((acc, item) => ({
    count: acc.count + 1,
    totalPrice: acc.totalPrice + (parseFloat(item.price) || 0),
    totalDiscountPrice: acc.totalDiscountPrice + (parseFloat(item.discount_price) || 0)
  }), { count: 0, totalPrice: 0, totalDiscountPrice: 0 });
};

// Function to group items by category for reporting
export const groupItemsByCategory = (items) => {
  return items.reduce((acc, item) => {
    const category = item.fullName?.split(' ')[0] || 'Inne';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
};
