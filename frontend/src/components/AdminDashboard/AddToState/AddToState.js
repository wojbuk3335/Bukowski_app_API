import React, { useState, useEffect, forwardRef, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import styles from '../Warehouse/Warehouse.module.css'; // Use the same styles as Warehouse.js

// Register Polish locale
registerLocale('pl', pl);

const AddToState = () => {
  const [magazynItems, setMagazynItems] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
  const [sellingPoints, setSellingPoints] = useState([]);
  const [usersData, setUsersData] = useState([]); // Store users data for symbol lookup
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synchronizedItems, setSynchronizedItems] = useState(new Set());
  const [manuallyAddedItems, setManuallyAddedItems] = useState([]); // Track manually added items
  const [addedMagazynIds, setAddedMagazynIds] = useState(new Set()); // Track which magazyn items have been manually added
  const [operationType, setOperationType] = useState('sprzedaz'); // 'sprzedaz' or 'przepisanie'
  const [targetSellingPoint, setTargetSellingPoint] = useState(''); // For "przepisanie" mode
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  
  // Transaction management states
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null); // Store details for potential undo
  
  // History search states
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  
  // Magazyn search states
  const [magazynSearchTerm, setMagazynSearchTerm] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]); // List of transactions that can be undone
  const [showUndoOptions, setShowUndoOptions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); // For modal display
  const [showClearStorageInfo, setShowClearStorageInfo] = useState(false); // For clear storage info modal
  
  // Persistent sales view states
  const [persistentSalesView, setPersistentSalesView] = useState({
    filteredSales: [],
    manuallyAddedItems: [],
    synchronizedItems: new Set(),
    addedMagazynIds: new Set(),
    timestamp: null
  });
  const [isTransactionSaved, setIsTransactionSaved] = useState(false); // Track if transaction was saved
  const [lastTransactionDetails, setLastTransactionDetails] = useState(null); // Store details of last transaction for cancellation
  const [savedItemsForDisplay, setSavedItemsForDisplay] = useState([]); // Items to keep displaying after save
  
  // Printing states
  const [selectedForPrint, setSelectedForPrint] = useState(new Set()); // Track selected items for printing
  const [printer, setPrinter] = useState(null); // Store printer instance
  const [printerError, setPrinterError] = useState(null); // Track printer errors
  
  // Add CSS for DatePicker responsiveness and history scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .react-datepicker-wrapper {
        width: 100% !important;
      }
      .react-datepicker__input-container {
        width: 100% !important;
      }
      .react-datepicker__input-container input {
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
      
      /* Custom scrollbar for history list */
      .history-scrollable::-webkit-scrollbar {
        width: 8px;
      }
      .history-scrollable::-webkit-scrollbar-track {
        background: #333;
        border-radius: 4px;
      }
      .history-scrollable::-webkit-scrollbar-thumb {
        background: #666;
        border-radius: 4px;
      }
      .history-scrollable::-webkit-scrollbar-thumb:hover {
        background: #888;
      }
      
      /* History search input focus effect */
      .history-search-input:focus {
        outline: none;
        border-color: #0066cc !important;
        box-shadow: 0 0 5px rgba(0, 102, 204, 0.3);
      }
      
      /* Custom scrollbar for magazyn table */
      .magazyn-scrollable::-webkit-scrollbar {
        width: 8px;
      }
      .magazyn-scrollable::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .magazyn-scrollable::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      .magazyn-scrollable::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      /* Magazyn search input focus effect */
      .magazyn-search-input:focus {
        outline: none;
        border-color: #0d6efd !important;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
      }
      
      /* White placeholder for magazyn search input */
      .magazyn-search-input::placeholder {
        color: white !important;
        opacity: 0.7;
      }
      .magazyn-search-input::-webkit-input-placeholder {
        color: white !important;
        opacity: 0.7;
      }
      .magazyn-search-input::-moz-placeholder {
        color: white !important;
        opacity: 0.7;
      }
      .magazyn-search-input:-ms-input-placeholder {
        color: white !important;
        opacity: 0.7;
      }
      
      @media (max-width: 1024px) {
        .react-datepicker-wrapper {
          width: 100% !important;
        }
        .react-datepicker__input-container {
          width: 100% !important;
        }
        .react-datepicker__input-container input {
          width: 100% !important;
          text-align: center !important;
          box-sizing: border-box !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize default values when sellingPoints are loaded
  useEffect(() => {
    if (sellingPoints.length > 0) {
      // Set default selectedSellingPoint for sprzedaz mode
      if (operationType === 'sprzedaz' && !selectedSellingPoint) {
        setSelectedSellingPoint(sellingPoints[0]);
      }
      // Set default targetSellingPoint for przepisanie mode
      if (operationType === 'przepisanie' && !targetSellingPoint) {
        setTargetSellingPoint(sellingPoints[0]);
      }
    }
  }, [sellingPoints, operationType, selectedSellingPoint, targetSellingPoint]);

  // Initialize targetSellingPoint when switching to przepisanie and sellingPoints are available
  useEffect(() => {
    if (operationType === 'przepisanie' && sellingPoints.length > 0 && !targetSellingPoint) {
      setTargetSellingPoint(sellingPoints[0]);
    }
  }, [operationType, sellingPoints, targetSellingPoint]);

  // Update sellingPoint in all manually added items when targetSellingPoint changes
  useEffect(() => {
    if (operationType === 'przepisanie' && targetSellingPoint && manuallyAddedItems.length > 0) {
      setManuallyAddedItems(prev => 
        prev.map(item => ({
          ...item,
          sellingPoint: targetSellingPoint
        }))
      );
    }
  }, [targetSellingPoint, operationType]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch magazyn items
        const stateResponse = await axios.get('/api/state');
        const magazynDataRaw = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
        
        // Process magazyn data to combine prices with semicolon separator
        const magazynData = magazynDataRaw.map(item => ({
          ...item,
          price: item.discount_price && Number(item.discount_price) !== 0
            ? `${item.price};${item.discount_price}` // Combine price and discount_price with semicolon
            : item.price // Use only price if discount_price is not valid
        }));
        
        setMagazynItems(magazynData);

        // Fetch sales data
        const salesResponse = await axios.get('/api/sales/get-all-sales');
        setSalesData(salesResponse.data);
        
        // Fetch selling points from users API
        let uniqueSellingPointsFromUsers = [];
        try {
          const usersResponse = await axios.get('/api/user');
          
          // API returns {count: X, users: [...]} structure
          const usersDataArray = Array.isArray(usersResponse.data.users) ? usersResponse.data.users : [];
          setUsersData(usersDataArray); // Store users data for later symbol lookup
          
          uniqueSellingPointsFromUsers = [...new Set(
            usersDataArray
              .filter(user => user && user.sellingPoint && user.sellingPoint !== 'MAGAZYN' && user.sellingPoint !== 'Magazyn') // Exclude MAGAZYN variations
              .map(user => user.sellingPoint)
          )];
        } catch (userError) {
          console.error('Error fetching users:', userError);
          uniqueSellingPointsFromUsers = [];
        }
        
        // Get unique selling points from sales data
        const uniqueSellingPointsFromSales = [...new Set(salesResponse.data.map(sale => sale.sellingPoint))];
        
        // Combine and deduplicate selling points from both sources
        const allSellingPoints = [...new Set([...uniqueSellingPointsFromUsers, ...uniqueSellingPointsFromSales])]
          .filter(point => point && point !== 'MAGAZYN'); // Additional filter to exclude MAGAZYN
        
        setSellingPoints(allSellingPoints);
        
        // Set default selectedSellingPoint for sprzedaz mode
        if (operationType === 'sprzedaz' && !selectedSellingPoint && allSellingPoints.length > 0) {
          setSelectedSellingPoint(allSellingPoints[0]);
        }
        
        // Set default target selling point if in przepisanie mode and no target is selected
        if (operationType === 'przepisanie' && !targetSellingPoint && allSellingPoints.length > 0) {
          setTargetSellingPoint(allSellingPoints[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Filter sales based on selected date and selling point (only for "sprzedaz" mode)
    if (operationType === 'sprzedaz') {
      let filtered = salesData.filter(sale => {
        const saleDate = new Date(sale.timestamp).toDateString();
        const selectedDateString = selectedDate.toDateString();
        return saleDate === selectedDateString;
      });

      if (selectedSellingPoint) {
        // Find the symbol for the selected selling point
        const selectedUser = usersData.find(user => user.sellingPoint === selectedSellingPoint);
        const selectedSymbol = selectedUser ? selectedUser.symbol : null;
        
        if (selectedSymbol) {
          // Filter sales by 'from' field matching the selected symbol
          filtered = filtered.filter(sale => sale.from === selectedSymbol);
        }
      }

      setFilteredSales(filtered);
    } else {
      // For "przepisanie" mode, clear sales
      setFilteredSales([]);
    }
  }, [salesData, selectedDate, selectedSellingPoint, operationType, usersData]);

  const handleSynchronize = () => {
    // Synchronization only available in "sprzedaz" mode
    if (operationType !== 'sprzedaz') {
      alert('Synchronizacja dostępna tylko w trybie "Sprzedaż"');
      return;
    }
    
    const matchedMagazynIds = new Set(); // Track which magazyn items are already matched
    const matchedSalesIds = new Set(); // Track which sales items are already matched
    const synchronizedMagazynItems = new Set(); // Store matched magazyn item IDs
    const synchronizedSalesItems = new Set(); // Store matched sales item IDs
    
    // Find one-to-one matches between FILTERED sales and magazyn items
    filteredSales.forEach(sale => {
      if (matchedSalesIds.has(sale._id)) return; // Skip if this sale is already matched
      
      // Find the first available matching magazyn item
      for (let i = 0; i < magazynItems.length; i++) {
        const magazynItem = magazynItems[i];
        
        if (matchedMagazynIds.has(magazynItem.id)) continue; // Skip if this magazyn item is already matched
        
        if (sale.barcode === magazynItem.barcode && sale.size === magazynItem.size) {
          // Match found - mark both items as matched and break out of the loop
          matchedMagazynIds.add(magazynItem.id);
          matchedSalesIds.add(sale._id);
          synchronizedMagazynItems.add(magazynItem.id);
          synchronizedSalesItems.add(sale._id);
          break; // Important: Break out of the loop after finding the first match
        }
      }
    });
    
    // Store both sets for rendering
    setSynchronizedItems({ magazyn: synchronizedMagazynItems, sales: synchronizedSalesItems });
  };

  const handleAddToSales = (magazynItem) => {
    // Check if this item is already added
    if (addedMagazynIds.has(magazynItem.id)) {
      return;
    }

    // For "przepisanie" mode, require target selling point to be selected
    if (operationType === 'przepisanie' && !targetSellingPoint) {
      alert('Wybierz najpierw docelowy punkt sprzedaży');
      return;
    }

    // Create a new sales item based on the magazyn item
    const newSalesItem = {
      _id: `manual-${Date.now()}-${Math.random()}`, // Generate unique ID for manually added item
      fullName: magazynItem.fullName,
      size: magazynItem.size,
      barcode: magazynItem.barcode,
      cash: [{ price: magazynItem.price, currency: 'PLN' }],
      card: [],
      timestamp: new Date().toISOString(),
      sellingPoint: operationType === 'sprzedaz' ? (selectedSellingPoint || 'Manual') : targetSellingPoint,
      isManuallyAdded: true, // Flag to identify manually added items
      originalMagazynId: magazynItem.id // Reference to original magazyn item
    };

    // Add to manually added items list and track the magazyn ID
    setManuallyAddedItems(prev => [...prev, newSalesItem]);
    setAddedMagazynIds(prev => new Set([...prev, magazynItem.id]));
  };

  const handleRemoveFromSales = (salesItem) => {
    // Remove from manually added items and unblock the magazyn item
    setManuallyAddedItems(prev => prev.filter(item => item._id !== salesItem._id));
    setAddedMagazynIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(salesItem.originalMagazynId);
      return newSet;
    });
  };

  const handleSave = async () => {
    if (isTransactionSaved) {
      alert('Transakcja została już zapisana. Użyj przycisku "Anuluj transakcję" aby cofnąć zmiany.');
      return;
    }

    if (isTransactionInProgress) {
      alert('Transakcja jest już w trakcie przetwarzania. Proszę czekać...');
      return;
    }

    const targetSymbol = operationType === 'przepisanie' ? targetSellingPoint.symbol : selectedSellingPoint.symbol;
    
    // Check if selling point is selected
    if (operationType === 'sprzedaz' && !selectedSellingPoint) {
      alert('Proszę wybrać punkt sprzedaży');
      return;
    }
    
    if (operationType === 'przepisanie' && !targetSellingPoint) {
      alert('Proszę wybrać docelowy punkt sprzedaży');
      return;
    }

    if (filteredSales.length === 0 && manuallyAddedItems.length === 0) {
      alert('Brak elementów do zapisania');
      return;
    }

    setIsTransactionInProgress(true);

    try {
      // Prepare transaction details for history
      const transactionId = Date.now().toString();
      const processedItems = [];
      
      // Separate items by their colors/types
      const blueItems = new Set(); // Regular sales items (blue) - to be deleted
      const greenItems = new Set(); // Synchronized items (green) - to be transferred within same selling point
      const orangeItems = new Set(); // Manually added items (orange) - to be transferred from MAGAZYN

      // Process sales items for deletion (blue)
      const blueItemsBarcodes = []; // Use array instead of Set to keep duplicates
      filteredSales.forEach(sale => {
        if (!synchronizedItems.sales || !synchronizedItems.sales.has(sale._id)) {
          // For blue items, we use barcode directly from sales data
          blueItemsBarcodes.push(sale.barcode); // Push to array to keep duplicates
          
          // Find the original selling point symbol for this sale
          const originalSymbol = sale.from; // This should contain the symbol from which it was sold
          
          processedItems.push({
            fullName: sale.fullName,
            size: sale.size,
            barcode: sale.barcode,
            price: sale.cash[0]?.price || 0,
            processType: 'sold',
            originalId: sale._id,
            originalSymbol: originalSymbol || selectedSellingPoint, // Where it should be restored
            sellingPoint: selectedSellingPoint
          });
        }
      });

      // Group barcodes by count to know how many to delete
      const barcodeCount = {};
      blueItemsBarcodes.forEach(barcode => {
        barcodeCount[barcode] = (barcodeCount[barcode] || 0) + 1;
      });

      // Process synchronized items (green) - these will be transferred within same point
      if (synchronizedItems.magazyn) {
        synchronizedItems.magazyn.forEach(id => {
          greenItems.add(id);
          // Find the related magazyn item to get full data
          const relatedMagazynItem = magazynItems.find(item => item.id === id);
          if (relatedMagazynItem) {
            // Handle price format for transaction history - split if contains semicolon
            let itemPrice = 0;
            let itemDiscountPrice = 0;
            
            if (relatedMagazynItem.price && typeof relatedMagazynItem.price === 'string' && relatedMagazynItem.price.includes(';')) {
              const prices = relatedMagazynItem.price.split(';');
              itemPrice = Number(prices[0]) || 0;
              itemDiscountPrice = Number(prices[1]) || 0;
            } else {
              itemPrice = Number(relatedMagazynItem.price) || 0;
            }
            
            processedItems.push({
              fullName: relatedMagazynItem.fullName,
              size: relatedMagazynItem.size,
              barcode: relatedMagazynItem.barcode,
              price: itemPrice,
              discount_price: itemDiscountPrice,
              processType: 'synchronized',
              originalId: id,
              originalSymbol: 'MAGAZYN' // Items came from MAGAZYN originally
            });
          }
        });
      }

      // Process manually added items (orange) - these come from MAGAZYN
      addedMagazynIds.forEach(id => {
        orangeItems.add(id);
        // Find the related magazyn item to get full data
        const relatedMagazynItem = magazynItems.find(item => item.id === id);
        if (relatedMagazynItem) {
          // Handle price format for transaction history - split if contains semicolon
          let itemPrice = 0;
          let itemDiscountPrice = 0;
          
          if (relatedMagazynItem.price && typeof relatedMagazynItem.price === 'string' && relatedMagazynItem.price.includes(';')) {
            const prices = relatedMagazynItem.price.split(';');
            itemPrice = Number(prices[0]) || 0;
            itemDiscountPrice = Number(prices[1]) || 0;
          } else {
            itemPrice = Number(relatedMagazynItem.price) || 0;
          }
          
          processedItems.push({
            fullName: relatedMagazynItem.fullName,
            size: relatedMagazynItem.size,
            barcode: relatedMagazynItem.barcode,
            price: itemPrice,
            discount_price: itemDiscountPrice,
            processType: 'transferred',
            originalId: id,
            originalSymbol: 'MAGAZYN' // Items came from MAGAZYN originally
          });
        }
      });

      // Store transaction details for potential cancellation
      const transactionDetails = {
        transactionId: transactionId, // Changed from 'id' to 'transactionId'
        timestamp: new Date().toLocaleString('pl-PL'),
        operationType: operationType,
        selectedSellingPoint: selectedSellingPoint,
        targetSellingPoint: targetSellingPoint,
        targetSymbol,
        processedItems,
        itemsCount: processedItems.length
      };

      // Determine target symbol for operations
      let actualTargetSymbol;
      
      if (operationType === 'sprzedaz') {
        // Find the symbol for the selected selling point
        const selectedUser = usersData.find(user => user.sellingPoint === selectedSellingPoint);
        actualTargetSymbol = selectedUser ? selectedUser.symbol : (selectedSellingPoint || 'Manual');
      } else {
        // For 'przepisanie' mode, find the symbol for the selected targetSellingPoint
        actualTargetSymbol = 'Manual'; // Default fallback
        
        if (targetSellingPoint) {
          const targetUser = usersData.find(user => user.sellingPoint === targetSellingPoint);
          
          if (targetUser && targetUser.symbol) {
            actualTargetSymbol = targetUser.symbol;
          }
        }
      }

      // Process blue items (delete from state by barcode and symbol)
      const bluePromises = Object.entries(barcodeCount).map(async ([barcode, count]) => {
        try {
          // Find the symbol for the selected selling point
          let symbolToDelete = '';
          if (selectedSellingPoint) {
            const user = usersData.find(user => user.sellingPoint === selectedSellingPoint);
            if (user && user.symbol) {
              symbolToDelete = user.symbol;
            } else {
              console.error(`No user found for sellingPoint: ${selectedSellingPoint}`);
              return; // Skip this deletion
            }
          } else {
            console.error('No selectedSellingPoint');
            return; // Skip this deletion
          }
          
          await axios.delete(`/api/state/barcode/${barcode}/symbol/${symbolToDelete}?count=${count}`, {
            headers: {
              'target-symbol': 'Sprzedano', // Blue items are sold
              'operation-type': 'delete',
              'transactionid': transactionId // Changed from transaction-id to transactionid
            }
          });
        } catch (error) {
          console.error(`Error deleting blue items with barcode ${barcode}:`, error);
          if (error.response && error.response.status === 404) {
            // Items not found - this might be expected
          } else {
            throw error;
          }
        }
      });

      // Process green items (transfer within same selling point)
      const greenPromises = Array.from(greenItems).map(async (itemId) => {
        try {
          await axios.delete(`/api/state/${itemId}`, {
            headers: {
              'target-symbol': actualTargetSymbol, // Same symbol (M → M)
              'operation-type': 'transfer-same',
              'transactionid': transactionId // Changed from transaction-id to transactionid
            }
          });
        } catch (error) {
          console.error(`Error transferring green item ${itemId}:`, error);
          if (error.response && error.response.status === 404) {
            console.warn(`Green item ${itemId} not found - may have been already processed`);
            // Don't throw error for 404, just log warning
          } else {
            throw error;
          }
        }
      });

      // Process orange items (transfer from MAGAZYN)
      const orangePromises = Array.from(orangeItems).map(async (itemId) => {
        try {
          await axios.delete(`/api/state/${itemId}`, {
            headers: {
              'target-symbol': actualTargetSymbol, // MAGAZYN → targetSymbol
              'operation-type': 'transfer-from-magazyn',
              'transactionid': transactionId // Changed from transaction-id to transactionid
            }
          });
        } catch (error) {
          console.error(`Error transferring orange item ${itemId}:`, error);
          if (error.response && error.response.status === 404) {
            console.warn(`Orange item ${itemId} not found - may have been already processed`);
            // Don't throw error for 404, just log warning
          } else {
            throw error;
          }
        }
      });

      // Wait for all operations to complete
      await Promise.all([...bluePromises, ...greenPromises, ...orangePromises]);

      // Save transaction to database instead of local state
      await saveTransactionToDatabase(transactionDetails);

      // Store items for display (keeping the view)
      const itemsForDisplay = processedItems.map(item => ({
        ...item,
        isProcessed: true
      }));

      setSavedItemsForDisplay(itemsForDisplay);
      // lastTransaction will be set when history is reloaded from database
      setIsTransactionSaved(true);

      // Clear current states but keep the view
      setSynchronizedItems(new Set());
      setManuallyAddedItems([]);
      setAddedMagazynIds(new Set());

      // Refresh magazyn data
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
      setMagazynItems(magazynData);
      alert('Transakcja została zapisana pomyślnie!');
    } catch (error) {
      console.error('Error saving items:', error);
      alert('Błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Function to load transaction history from database
  const loadTransactionHistory = async () => {
    try {
      const response = await axios.get('/api/transaction-history');
      const history = response.data || [];
      setTransactionHistory(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      setTransactionHistory([]);
    }
  };

  // Function to save transaction to database
  const saveTransactionToDatabase = async (transactionDetails) => {
    try {
      await axios.post('/api/transaction-history', transactionDetails);
      // Reload history after saving
      await loadTransactionHistory();
    } catch (error) {
      console.error('Error saving transaction to database:', error);
      throw error;
    }
  };

  // Function to deactivate transaction in database
  const deactivateTransactionInDatabase = async (transactionId) => {
    try {
      await axios.delete(`/api/transaction-history/${transactionId}`);
      // Reload history after deactivating
      await loadTransactionHistory();
    } catch (error) {
      console.error('Błąd podczas usuwania transakcji z bazy danych');
      throw error;
    }
  };

  // Function to undo/cancel last transaction
  const handleUndoTransaction = async (transaction) => {
    if (!transaction || isTransactionInProgress) return;
    
    setIsTransactionInProgress(true);
    
    try {
      // STEP 1: First restore items to their original state
      const restorePromises = [];
      
      for (const item of transaction.processedItems) {
        let restoreData;
        let targetSymbol;
        
        if (item.processType === 'sold') {
          // Blue items: restore to original selling point where they were sold from
          targetSymbol = item.originalSymbol || item.sellingPoint;
          
          restoreData = {
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            symbol: targetSymbol,
            price: item.price,
            operationType: 'restore-sale'
          };
          
        } else if (item.processType === 'synchronized') {
          // Green items: restore to MAGAZYN (they were transferred from MAGAZYN then sold)
          targetSymbol = 'MAGAZYN';
          
          restoreData = {
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            symbol: targetSymbol,
            price: item.price,
            discount_price: item.discount_price,
            operationType: 'restore-synchronized'
          };
          
        } else if (item.processType === 'transferred') {
          // Orange items: restore to MAGAZYN
          targetSymbol = 'MAGAZYN';
          
          restoreData = {
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            symbol: targetSymbol,
            price: item.price,
            discount_price: item.discount_price,
            operationType: 'restore-transfer'
          };
        }
        
        if (restoreData) {
          restorePromises.push(
            axios.post('/api/state/restore-silent', restoreData)
          );
        }
      }
      
      // Wait for all items to be restored
      await Promise.all(restorePromises);
      
      // STEP 2: Now delete all history records associated with this transaction
      let historyDeleted = false;
      
      try {
        const deleteResponse = await axios.delete(`/api/history/by-transaction/${transaction.transactionId}`, {
          headers: {
            'transactionid': transaction.transactionId
          }
        });
        historyDeleted = true;
      } catch (deleteError) {
        // Fallback: spróbuj usunąć po szczegółach transakcji
        const fallbackPayload = {
          timestamp: transaction.timestamp,
          processedItems: transaction.processedItems.map(item => ({
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            processType: item.processType
          }))
        };
        
        try {
          const fallbackResponse = await axios.post('/api/history/delete-by-details', fallbackPayload);
          historyDeleted = true;
        } catch (fallbackError) {
          console.error('❌ Nie udało się usunąć rekordów historii');
        }
      }
      
      if (!historyDeleted) {
        console.error('⚠️ Nie udało się usunąć rekordów historii');
      }
      
      // STEP 3: Delete the transaction itself from transaction history
      await deactivateTransactionInDatabase(transaction.transactionId);
      
      // STEP 4: Refresh data to reflect the changes
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
      setMagazynItems(magazynData);
      
      alert(`Transakcja z ${new Date(transaction.timestamp).toLocaleString('pl-PL')} została całkowicie anulowana i usunięta z historii!`);
      
    } catch (error) {
      console.error('Error undoing transaction:', error);
      alert('Błąd podczas anulowania transakcji. Spróbuj ponownie.');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Function to undo/cancel single item from transaction
  const handleUndoSingleItem = async (transaction, itemToUndo) => {
    if (!transaction || !itemToUndo || isTransactionInProgress) return;
    
    const confirmMessage = `Czy na pewno chcesz anulować tylko ten element?\n\n${itemToUndo.fullName} (${itemToUndo.size})\n\nElement zostanie przywrócony do magazynu, a transakcja zostanie zaktualizowana.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setIsTransactionInProgress(true);
    
    try {
      // STEP 1: Restore the single item to its original state
      let restoreData;
      let targetSymbol;
      
      if (itemToUndo.processType === 'sold') {
        // Blue items: restore to original selling point where they were sold from
        targetSymbol = itemToUndo.originalSymbol || itemToUndo.sellingPoint;
        
        restoreData = {
          fullName: itemToUndo.fullName,
          size: itemToUndo.size,
          barcode: itemToUndo.barcode,
          symbol: targetSymbol,
          price: itemToUndo.price,
          operationType: 'restore-sale-single'
        };
        
      } else if (itemToUndo.processType === 'synchronized') {
        // Green items: restore to MAGAZYN
        targetSymbol = 'MAGAZYN';
        
        restoreData = {
          fullName: itemToUndo.fullName,
          size: itemToUndo.size,
          barcode: itemToUndo.barcode,
          symbol: targetSymbol,
          price: itemToUndo.price,
          discount_price: itemToUndo.discount_price,
          operationType: 'restore-synchronized-single'
        };
        
      } else if (itemToUndo.processType === 'transferred') {
        // Orange items: restore to MAGAZYN
        targetSymbol = 'MAGAZYN';
        
        restoreData = {
          fullName: itemToUndo.fullName,
          size: itemToUndo.size,
          barcode: itemToUndo.barcode,
          symbol: targetSymbol,
          price: itemToUndo.price,
          discount_price: itemToUndo.discount_price,
          operationType: 'restore-transfer-single'
        };
      }
      
      if (restoreData) {
        await axios.post('/api/state/restore-silent', restoreData);
      }
      
      // STEP 2: Create correction transaction for tracking
      const correctionTransactionId = `correction-${Date.now()}`;
      const correctionTransaction = {
        transactionId: correctionTransactionId,
        timestamp: new Date().toLocaleString('pl-PL'),
        operationType: 'korekta',
        selectedSellingPoint: transaction.selectedSellingPoint,
        targetSellingPoint: transaction.targetSellingPoint,
        processedItems: [{
          ...itemToUndo,
          processType: 'corrected', // Mark as corrected
          originalTransactionId: transaction.transactionId
        }],
        itemsCount: 1,
        isCorrection: true,
        originalTransactionId: transaction.transactionId
      };
      
      await saveTransactionToDatabase(correctionTransaction);
      
      // STEP 3: Update original transaction - remove the undone item
      const updatedProcessedItems = transaction.processedItems.filter(item => 
        !(item.fullName === itemToUndo.fullName && 
          item.size === itemToUndo.size && 
          item.barcode === itemToUndo.barcode &&
          item.processType === itemToUndo.processType)
      );
      
      const updatedTransaction = {
        ...transaction,
        processedItems: updatedProcessedItems,
        itemsCount: updatedProcessedItems.length,
        lastModified: new Date().toLocaleString('pl-PL'),
        hasCorrections: true
      };
      
      // Update the transaction in database
      await axios.put(`/api/transaction-history/${transaction.transactionId}`, updatedTransaction);
      
      // STEP 4: Delete specific history record for this item
      try {
        const deleteHistoryPayload = {
          transactionId: transaction.transactionId,
          itemDetails: {
            fullName: itemToUndo.fullName,
            size: itemToUndo.size,
            barcode: itemToUndo.barcode,
            processType: itemToUndo.processType
          }
        };
        
        await axios.post('/api/history/delete-single-item', deleteHistoryPayload);
      } catch (historyError) {
        console.error('Błąd podczas usuwania rekordu historii dla pojedynczego elementu:', historyError);
        // Don't fail the entire operation if history deletion fails
      }
      
      // STEP 5: Refresh data to reflect the changes
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
      setMagazynItems(magazynData);
      
      // Reload transaction history
      await loadTransactionHistory();
      
      alert(`Element "${itemToUndo.fullName} (${itemToUndo.size})" został anulowany i przywrócony do magazynu!\n\nUtworzono transakcję korekcyjną: ${correctionTransactionId}`);
      
    } catch (error) {
      console.error('Error undoing single item:', error);
      alert('Błąd podczas anulowania elementu. Spróbuj ponownie.');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Function to clear persistent storage and old transactions
  const clearPersistentStorage = async () => {
    try {
      // Clear old transactions from database
      await axios.post('/api/transaction-history/clear-old');
      
      // Clear localStorage
      localStorage.removeItem('addToState_persistentView');
      
      setPersistentSalesView({
        filteredSales: [],
        manuallyAddedItems: [],
        synchronizedItems: new Set(),
        addedMagazynIds: new Set(),
        timestamp: null
      });
      
      // Reload transaction history from database
      await loadTransactionHistory();
      
      // Reset current states
      setFilteredSales([]);
      setManuallyAddedItems([]);
      setSynchronizedItems(new Set());
      setAddedMagazynIds(new Set());
      setSavedItemsForDisplay([]);
      setIsTransactionSaved(false);
      
      setShowClearStorageInfo(false); // Close info modal
      alert('Pamięć podręczna i stare transakcje zostały wyczyszczone!');
    } catch (error) {
      alert('Błąd podczas czyszczenia pamięci');
      alert('Błąd podczas czyszczenia pamięci. Spróbuj ponownie.');
    }
  };

  const handleClearStorageClick = () => {
    setShowClearStorageInfo(true);
  };

  const handleOperationTypeChange = (type) => {
    setOperationType(type);
    // Reset states when changing operation type
    setSynchronizedItems(new Set());
    setManuallyAddedItems([]);
    setAddedMagazynIds(new Set());
    setSelectedSellingPoint('');
    
    // Set default target selling point when switching to przepisanie mode
    if (type === 'przepisanie' && sellingPoints.length > 0) {
      setTargetSellingPoint(sellingPoints[0]);
    } else {
      setTargetSellingPoint('');
    }
    
    // Set default selected selling point when switching to sprzedaz mode
    if (type === 'sprzedaz' && sellingPoints.length > 0) {
      setSelectedSellingPoint(sellingPoints[0]);
    }
  };

  // Load persistent state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('addToState_persistentView');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Only restore if timestamp is recent (within last 24 hours)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setPersistentSalesView(parsed);
          if (parsed.filteredSales.length > 0) {
            setFilteredSales(parsed.filteredSales);
          }
          if (parsed.manuallyAddedItems.length > 0) {
            setManuallyAddedItems(parsed.manuallyAddedItems);
          }
          setSynchronizedItems(new Set(parsed.synchronizedItems));
          setAddedMagazynIds(new Set(parsed.addedMagazynIds));
        }
      } catch (error) {
        console.error('Error loading persistent state:', error);
      }
    }

    // Load transaction history from database
    loadTransactionHistory();
  }, []);

  // Set lastTransaction to the most recent transaction
  useEffect(() => {
    if (transactionHistory.length > 0) {
      setLastTransaction(transactionHistory[0]);
    } else {
      setLastTransaction(null);
    }
  }, [transactionHistory]);

  // Save persistent state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      filteredSales,
      manuallyAddedItems,
      synchronizedItems: Array.from(synchronizedItems),
      addedMagazynIds: Array.from(addedMagazynIds),
      timestamp: Date.now()
    };
    
    localStorage.setItem('addToState_persistentView', JSON.stringify(stateToSave));
    setPersistentSalesView(stateToSave);
  }, [filteredSales, manuallyAddedItems, synchronizedItems, addedMagazynIds]);

  // Ref for draggable history modal
  const historyModalRef = useRef(null);

  // Make history modal draggable
  const makeHistoryModalDraggable = () => {
    const modal = historyModalRef.current;
    if (!modal) return;
    
    const header = modal.querySelector('.modalHeader');
    if (!header) return;
    
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const onMouseDown = (e) => {
      if (e.target.closest('button')) return; // Don't drag when clicking close button
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = modal.offsetLeft;
      initialY = modal.offsetTop;
      
      modal.style.position = 'fixed';
      modal.style.left = `${initialX}px`;
      modal.style.top = `${initialY}px`;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modal.style.left = `${initialX + dx}px`;
        modal.style.top = `${initialY + dy}px`;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    // Remove existing listeners to prevent duplicates
    header.removeEventListener('mousedown', onMouseDown);
    header.addEventListener('mousedown', onMouseDown);
    
    return () => {
      header.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  };

  useEffect(() => {
    if (showHistoryModal) {
      setTimeout(() => {
        makeHistoryModalDraggable();
      }, 300);
    }
  }, [showHistoryModal]);

  // Function to filter transaction history based on search term
  const getFilteredTransactionHistory = () => {
    if (!historySearchTerm.trim()) {
      return transactionHistory;
    }
    
    const searchLower = historySearchTerm.toLowerCase();
    
    return transactionHistory.filter(transaction => {
      // Search in transaction timestamp
      const dateStr = new Date(transaction.timestamp).toLocaleString('pl-PL').toLowerCase();
      if (dateStr.includes(searchLower)) return true;
      
      // Search in transaction ID
      if (transaction.transactionId && transaction.transactionId.toString().includes(searchLower)) return true;
      
      // Search in processed items
      if (transaction.processedItems && transaction.processedItems.length > 0) {
        return transaction.processedItems.some(item => {
          const fullName = item.fullName ? item.fullName.toLowerCase() : '';
          const size = item.size ? item.size.toLowerCase() : '';
          const barcode = item.barcode ? item.barcode.toLowerCase() : '';
          const processType = item.processType ? item.processType.toLowerCase() : '';
          
          return fullName.includes(searchLower) || 
                 size.includes(searchLower) || 
                 barcode.includes(searchLower) || 
                 processType.includes(searchLower);
        });
      }
      
      return false;
    });
  };

  // Function to filter magazyn items based on search term
  const getFilteredMagazynItems = () => {
    if (!magazynSearchTerm.trim()) {
      return magazynItems;
    }
    
    const searchLower = magazynSearchTerm.toLowerCase();
    
    return magazynItems.filter(item => {
      // Search in item properties
      const fullName = item.fullName ? item.fullName.toLowerCase() : '';
      const size = item.size ? item.size.toLowerCase() : '';
      const barcode = item.barcode ? item.barcode.toLowerCase() : '';
      const price = item.price ? item.price.toString() : '';
      const discountPrice = item.discount_price ? item.discount_price.toString() : '';
      
      return fullName.includes(searchLower) || 
             size.includes(searchLower) || 
             barcode.includes(searchLower) || 
             price.includes(searchLower) || 
             discountPrice.includes(searchLower);
    });
  };

  // Printer functions
  const checkPrinter = () => {
    if (window.BrowserPrint) {
      window.BrowserPrint.getDefaultDevice("printer",
        (device) => {
          setPrinter(device);
          setPrinterError(null);
          alert("Drukarka znaleziona!");
        },
        (err) => setPrinterError("Nie znaleziono drukarki: " + err)
      );
    } else {
      setPrinterError("Nie załadowano biblioteki BrowserPrint.");
    }
  };

  const printSelectedBarcodes = () => {
    if (!printer) {
      alert("Najpierw sprawdź drukarkę!");
      return;
    }

    if (selectedForPrint.size === 0) {
      alert("Nie zaznaczono żadnych kodów kreskowych do druku!");
      return;
    }

    // Get all items (sales + manually added)
    const allItems = [...filteredSales, ...manuallyAddedItems];
    const selectedItems = allItems.filter(item => selectedForPrint.has(item._id || item.id));

    if (selectedItems.length === 0) {
      alert("Nie znaleziono zaznaczonych elementów!");
      return;
    }

    // Generate ZPL labels for each selected item using the same format as State.js
    const allLabels = [];

    selectedItems.forEach((item) => {
      // Handle fullName based on data source
      let jacketName = "Brak nazwy";
      if (typeof item.fullName === 'string') {
        // Sales data - fullName is already a string
        jacketName = item.fullName;
      } else if (item.fullName && typeof item.fullName === 'object' && item.fullName.fullName) {
        // Magazyn data - fullName is an object with nested fullName property
        jacketName = item.fullName.fullName;
      } else if (item.fullName) {
        // Fallback - convert to string
        jacketName = item.fullName.toString();
      }
      
      // Handle size similarly
      let size = "Brak rozmiaru";
      if (typeof item.size === 'string') {
        // Sales data - size is already a string
        size = item.size;
      } else if (item.size && typeof item.size === 'object' && item.size.Roz_Opis) {
        // Magazyn data - size is an object with Roz_Opis property
        size = item.size.Roz_Opis;
      } else if (item.size) {
        // Fallback - convert to string
        size = item.size.toString();
      }
      
      const barcode = item.barcode || "Brak kodu";
      
      // Convert Polish characters for ZPL printer compatibility
      const convertPolishChars = (text) => {
        if (!text || typeof text !== 'string') {
          return text || '';
        }
        return text
          .replace(/ą/g, 'a')
          .replace(/ć/g, 'c')
          .replace(/ę/g, 'e')
          .replace(/ł/g, 'l')
          .replace(/ń/g, 'n')
          .replace(/ó/g, 'o')
          .replace(/ś/g, 's')
          .replace(/ź/g, 'z')
          .replace(/ż/g, 'z')
          .replace(/Ą/g, 'A')
          .replace(/Ć/g, 'C')
          .replace(/Ę/g, 'E')
          .replace(/Ł/g, 'L')
          .replace(/Ń/g, 'N')
          .replace(/Ó/g, 'O')
          .replace(/Ś/g, 'S')
          .replace(/Ź/g, 'Z')
          .replace(/Ż/g, 'Z');
      };
      
      const printableJacketName = convertPolishChars(jacketName);
      const printableSize = convertPolishChars(size);
      
      // Get symbol for this item
      let symbol = "Brak symbolu";
      if (operationType === 'sprzedaz') {
        // For sales mode, use the selected selling point's symbol
        const selectedUser = usersData.find(user => user.sellingPoint === selectedSellingPoint);
        symbol = selectedUser ? selectedUser.symbol : selectedSellingPoint;
      } else if (operationType === 'przepisanie') {
        // For transfer mode, use the target selling point's symbol
        const targetUser = usersData.find(user => user.sellingPoint === targetSellingPoint);
        symbol = targetUser ? targetUser.symbol : targetSellingPoint;
      }
      
      const printableSymbol = convertPolishChars(symbol);
      
      // Handle price - check for comma BEFORE adding PLN
      let price = "Brak ceny";
      let rawPrice = null;
      
      // Get raw price value without PLN
      if (item.price) {
        rawPrice = item.price;
      } else if (item.cash && item.cash.length > 0 && item.cash[0].price) {
        rawPrice = item.cash[0].price;
      }
      
      // Handle double prices (separated by semicolon) - create two separate labels
      if (rawPrice && rawPrice.toString().includes(';')) {
        // Split prices by semicolon and create two separate labels
        const prices = rawPrice.toString().split(';');
        if (prices.length === 2) {
          const price1 = convertPolishChars(prices[0].trim() + ' PLN');
          const price2 = convertPolishChars(prices[1].trim() + ' PLN');
          
          // Add two separate labels to the array
          allLabels.push(`^CI28
^XA
^PW700
^LL1000
^FO70,30
^A0N,35,35
^FD${printableJacketName}  ${printableSize}^FS
^FO600,30
^A0N,30,30
^FD${printableSymbol}^FS
^FO70,80
^BY3,3,120
^BCN,120,Y,N,N
^FD${barcode}^FS
^FO230,250
^A0N,60,60
^FD${price1}^FS
^XZ`);
          
          allLabels.push(`^CI28
^XA
^PW700
^LL1000
^FO70,30
^A0N,35,35
^FD${printableJacketName}  ${printableSize}^FS
^FO600,30
^A0N,30,30
^FD${printableSymbol}^FS
^FO70,80
^BY3,3,120
^BCN,120,Y,N,N
^FD${barcode}^FS
^FO230,250
^A0N,60,60
^FD${price2}^FS
^XZ`);
          
          // Skip single label creation
        } else {
          // Single price - format with PLN if needed
          if (rawPrice) {
            if (typeof rawPrice === 'number') {
              price = `${rawPrice} PLN`;
            } else if (typeof rawPrice === 'string') {
              // Check if PLN is already included
              price = rawPrice.includes('PLN') ? rawPrice : `${rawPrice} PLN`;
            }
          }
          
          // Single price - single label
          const printablePrice = convertPolishChars(String(price));
          allLabels.push(`^CI28
^XA
^PW700
^LL1000
^FO70,30
^A0N,35,35
^FD${printableJacketName}  ${printableSize}^FS
^FO600,30
^A0N,30,30
^FD${printableSymbol}^FS
^FO70,80
^BY3,3,120
^BCN,120,Y,N,N
^FD${barcode}^FS
^FO230,250
^A0N,60,60
^FD${printablePrice}^FS
^XZ`);
        }
      } else {
        // Single price - format with PLN if needed
        if (rawPrice) {
          if (typeof rawPrice === 'number') {
            price = `${rawPrice} PLN`;
          } else if (typeof rawPrice === 'string') {
            // Check if PLN is already included
            price = rawPrice.includes('PLN') ? rawPrice : `${rawPrice} PLN`;
          }
        }
        
        // Single price - single label
        const printablePrice = convertPolishChars(String(price));
        allLabels.push(`^CI28
^XA
^PW700
^LL1000
^FO70,30
^A0N,35,35
^FD${printableJacketName}  ${printableSize}^FS
^FO600,30
^A0N,30,30
^FD${printableSymbol}^FS
^FO70,80
^BY3,3,120
^BCN,120,Y,N,N
^FD${barcode}^FS
^FO230,250
^A0N,60,60
^FD${printablePrice}^FS
^XZ`);
      }
    });

    // Send each label separately to the printer
    let labelIndex = 0;
    const sendNextLabel = () => {
      if (labelIndex >= allLabels.length) {
        setSelectedForPrint(new Set()); // Clear selected items after all labels are printed
        alert(`Wysłano ${allLabels.length} etykiet do drukarki!`);
        return;
      }
      
      printer.send(
        allLabels[labelIndex],
        () => {
          labelIndex++;
          // Small delay between labels to ensure proper processing
          setTimeout(sendNextLabel, 100);
        },
        (err) => alert(`Błąd drukowania etykiety ${labelIndex + 1}: ${err}`)
      );
    };
    
    sendNextLabel();
  };

  const toggleSelectForPrint = (itemId) => {
    setSelectedForPrint(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllForPrint = () => {
    const allItems = [...filteredSales, ...manuallyAddedItems];
    const allIds = allItems.map(item => item._id || item.id);
    setSelectedForPrint(new Set(allIds));
  };

  const clearPrintSelection = () => {
    setSelectedForPrint(new Set());
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div style={{ 
      display: 'flex', 
      height: isMobile ? 'auto' : '100vh',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Transaction History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div
            className={styles.customModal + ' custom-modal'}
            ref={historyModalRef}
            style={{
              backgroundColor: 'black',
              borderRadius: '8px',
              border: '1px solid white',
              padding: '0',
              width: isMobile ? '98%' : '700px',
              maxWidth: '98vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              color: 'white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
            }}
          >
            <div className={styles.modalHeader + ' modalHeader'} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 0,
              borderBottom: '1px solid white',
              padding: '16px 24px',
              backgroundColor: 'black',
              color: 'white',
              fontWeight: 600,
              cursor: 'grab',
              userSelect: 'none'
            }}
              onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
              onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
            >
              <span style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Historia transakcji</span>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  backgroundColor: 'red',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 600
                }}
                title="Zamknij"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody + ' modalBody'} style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: 0,
              backgroundColor: 'black',
              color: 'white',
              padding: '24px',
              maxHeight: 'calc(100vh - 120px)' // Ograniczenie wysokości
            }}>
              {/* Wyszukiwarka historii */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  className="history-search-input"
                  placeholder="🔍 Wyszukaj po nazwie produktu, kodzie, dacie lub ID transakcji..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#333',
                    color: 'white',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {historySearchTerm && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#ccc' 
                  }}>
                    Znaleziono: {getFilteredTransactionHistory().length} z {transactionHistory.length} transakcji
                  </div>
                )}
              </div>
              
              {transactionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'gray' }}>
                  Brak transakcji do wyświetlenia
                </div>
              ) : getFilteredTransactionHistory().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'gray' }}>
                  Brak transakcji pasujących do wyszukiwania
                </div>
              ) : (
                <div 
                  className="history-scrollable"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px',
                    maxHeight: 'calc(100vh - 200px)', // Maksymalna wysokość listy
                    overflowY: 'auto', // Suwak dla listy transakcji
                    paddingRight: '8px' // Miejsce na suwak
                  }}>
                  {getFilteredTransactionHistory().map((transaction, index) => (
                    <div
                      key={transaction.transactionId}
                      style={{
                        border: '1px solid #444',
                        borderRadius: '4px',
                        padding: '15px',
                        backgroundColor: '#181818',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div>
                          <strong style={{ color: transaction.isCorrection ? '#28a745' : '#ffc107' }}>
                            #{index + 1} - {new Date(transaction.timestamp).toLocaleString('pl-PL')}
                            {transaction.isCorrection && (
                              <span style={{ 
                                marginLeft: '8px', 
                                backgroundColor: '#28a745', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '3px', 
                                fontSize: '10px' 
                              }}>
                                KOREKTA
                              </span>
                            )}
                            {transaction.hasCorrections && (
                              <span style={{ 
                                marginLeft: '8px', 
                                backgroundColor: '#ffc107', 
                                color: 'black', 
                                padding: '2px 6px', 
                                borderRadius: '3px', 
                                fontSize: '10px' 
                              }}>
                                ZMIENIONA
                              </span>
                            )}
                          </strong>
                          <div style={{ color: '#ccc', fontSize: '14px', marginTop: '5px' }}>
                            Typ: {
                              transaction.operationType === 'sprzedaz' ? 'Sprzedaż' : 
                              transaction.operationType === 'przepisanie' ? 'Przepisanie' :
                              transaction.operationType === 'korekta' ? 'Korekta' :
                              'Nieznane'
                            } | 
                            Elementów: {transaction.itemsCount} | 
                            Punkt: {transaction.selectedSellingPoint || transaction.targetSellingPoint}
                            {transaction.isCorrection && transaction.originalTransactionId && (
                              <div style={{ color: '#28a745', fontSize: '12px', marginTop: '2px' }}>
                                Korekta dla transakcji: {transaction.originalTransactionId}
                              </div>
                            )}
                            {transaction.lastModified && (
                              <div style={{ color: '#ffc107', fontSize: '12px', marginTop: '2px' }}>
                                Ostatnia modyfikacja: {transaction.lastModified}
                              </div>
                            )}
                          </div>
                        </div>
                        {!transaction.isCorrection && (
                          <button
                            onClick={() => {
                              handleUndoTransaction(transaction);
                              setShowHistoryModal(false);
                            }}
                            className="btn btn-danger btn-sm"
                            disabled={isTransactionInProgress}
                            title="Anuluj całą transakcję"
                          >
                            {isTransactionInProgress ? 'Anulowanie...' : 'Anuluj całość'}
                          </button>
                        )}
                      </div>
                      {transaction.processedItems && transaction.processedItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#ffc107' }}>
                          <strong>Przetworzone elementy:</strong>
                          <div style={{ marginTop: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                            {transaction.processedItems.map((item, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 0', 
                                borderBottom: idx < transaction.processedItems.length - 1 ? '1px solid #333' : 'none'
                              }}>
                                <div style={{ flex: 1 }}>
                                  • {item.fullName} ({item.size}) - {
                                    item.processType === 'sold' ? 'Sprzedano' :
                                    item.processType === 'synchronized' ? 'Zsynchronizowano' :
                                    item.processType === 'transferred' ? 'Przeniesiono' :
                                    item.processType === 'corrected' ? 'Anulowano (korekta)' :
                                    'Nieznane'
                                  }
                                  {item.processType === 'corrected' && (
                                    <span style={{ color: '#28a745', marginLeft: '5px', fontSize: '10px' }}>
                                      ✓ PRZYWRÓCONO
                                    </span>
                                  )}
                                </div>
                                {item.processType !== 'corrected' && !transaction.isCorrection && (
                                  <button
                                    onClick={() => handleUndoSingleItem(transaction, item)}
                                    disabled={isTransactionInProgress}
                                    style={{
                                      backgroundColor: '#dc3545',
                                      border: 'none',
                                      borderRadius: '3px',
                                      color: 'white',
                                      padding: '2px 6px',
                                      fontSize: '10px',
                                      cursor: isTransactionInProgress ? 'not-allowed' : 'pointer',
                                      marginLeft: '8px',
                                      opacity: isTransactionInProgress ? 0.6 : 1
                                    }}
                                    title={`Anuluj tylko ten element: ${item.fullName} (${item.size})`}
                                  >
                                    {isTransactionInProgress ? '...' : 'Anuluj'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.modalFooter + ' modalFooter'} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid white',
              backgroundColor: 'black',
              color: 'white'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleClearStorageClick}
                  className="btn btn-warning btn-sm"
                >
                  Wyczyść pamięć
                </button>
                {historySearchTerm && (
                  <button
                    onClick={() => setHistorySearchTerm('')}
                    className="btn btn-info btn-sm"
                    title="Wyczyść wyszukiwanie"
                  >
                    Wyczyść filtr
                  </button>
                )}
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Anuluj
                </button>
              </div>
              {transactionHistory.length > 0 && (
                <button
                  onClick={() => {
                    // Always use the most recent transaction (first in array), not filtered results
                    handleUndoTransaction(transactionHistory[0]);
                    setShowHistoryModal(false);
                  }}
                  className="btn btn-danger btn-sm"
                  disabled={isTransactionInProgress}
                  title="Anuluje najnowszą transakcję (ignoruje filtr wyszukiwania)"
                >
                  {isTransactionInProgress ? 'Anulowanie...' : 'Anuluj ostatnią transakcję'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Storage Info Modal */}
      {showClearStorageInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'black',
            borderRadius: '8px',
            border: '1px solid white',
            padding: '0',
            width: isMobile ? '95%' : '500px',
            maxWidth: '95vw',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 0,
              borderBottom: '1px solid white',
              padding: '16px 24px',
              backgroundColor: 'black',
              color: 'white',
              fontWeight: 600
            }}>
              <span style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>ℹ️ Informacja o czyszczeniu pamięci</span>
              <button
                onClick={() => setShowClearStorageInfo(false)}
                style={{
                  backgroundColor: 'red',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 600
                }}
                title="Zamknij"
              >
                ✕
              </button>
            </div>
            <div style={{
              flex: 1,
              backgroundColor: 'black',
              color: 'white',
              padding: '24px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#ffc107', marginBottom: '15px' }}>Co zostanie wyczyszczone:</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    🗄️ <strong>Pamięć podręczna aplikacji</strong> - zapisane stany transakcji
                  </li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    📊 <strong>Stare transakcje z bazy danych</strong> - historia starszych operacji
                  </li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    🔄 <strong>Aktualnie wyświetlane dane</strong> - zostanie odświeżone
                  </li>
                  <li style={{ padding: '8px 0' }}>
                    💾 <strong>Lokalne ustawienia</strong> - zapisane filtry i preferencje
                  </li>
                </ul>
              </div>
              <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                <p style={{ margin: 0, color: '#ffc107', fontWeight: 600 }}>⚠️ Uwaga:</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                  Ta operacja jest nieodwracalna. Stracisz wszystkie zapisane filtry i tymczasowe dane.
                  Bieżące niezapisane transakcje również zostaną utracone.
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid white',
              backgroundColor: 'black',
              color: 'white',
              gap: '10px'
            }}>
              <button
                onClick={() => setShowClearStorageInfo(false)}
                className="btn btn-secondary btn-sm"
              >
                Anuluj
              </button>
              <button
                onClick={clearPersistentStorage}
                className="btn btn-warning btn-sm"
              >
                Tak, wyczyść pamięć
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Left side - Magazyn */}
        <div style={{ 
          width: isMobile ? '100%' : '50%', 
          padding: '20px', 
          borderRight: isMobile ? 'none' : '1px solid #ccc',
          borderBottom: isMobile ? '1px solid #ccc' : 'none'
        }}>
          <h2 style={{color:'white', marginBottom: '5px', display: 'block', textAlign: 'center'}}>Magazyn</h2>
          
          {/* Wyszukiwarka magazynu */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px', textAlign: 'center' }}>Wyszukiwarka:</label>
            <input
              type="text"
              className="form-select magazyn-search-input"
              placeholder="Wyszukaj w magazynie (nazwa, kod, rozmiar, cena...)..."
              value={magazynSearchTerm}
              onChange={(e) => setMagazynSearchTerm(e.target.value)}
              style={{
                width: '100%',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                backgroundColor: 'black',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
        <div className={styles.tableContainer} style={{
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto'
        }}>
          <div className="magazyn-scrollable" style={{
            maxHeight: 'calc(100vh - 300px)',
            overflowY: 'auto'
          }}>
          <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
            <thead>
              <tr>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena (PLN)</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {magazynItems.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Brak produktów w magazynie
                  </td>
                </tr>
              ) : getFilteredMagazynItems().length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Brak produktów pasujących do wyszukiwania
                  </td>
                </tr>
              ) : (
                getFilteredMagazynItems().map((item, index) => {
                const isMatched = synchronizedItems.magazyn && synchronizedItems.magazyn.has(item.id);
                const isManuallyAdded = addedMagazynIds.has(item.id);
                const backgroundColor = isMatched ? '#666666' : (isManuallyAdded ? '#666666' : 'inherit');
                
                return (
                  <tr key={item.id} className={styles.tableRow} style={backgroundColor !== 'inherit' ? { backgroundColor: `${backgroundColor} !important` } : {}}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{index + 1}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.fullName}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.size}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.price}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.barcode}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                      <button 
                        onClick={() => handleAddToSales(item)}
                        disabled={isManuallyAdded || isMatched}
                        className="btn btn-sm"
                        style={{ 
                          backgroundColor: (isManuallyAdded || isMatched) ? '#555' : '#198754',
                          border: 'none', 
                          color: 'white', 
                          fontSize: '14px',
                          cursor: (isManuallyAdded || isMatched) ? 'not-allowed' : 'pointer',
                          opacity: (isManuallyAdded || isMatched) ? 0.5 : 1,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          minWidth: '70px'
                        }}
                        title={isManuallyAdded ? "Już dodane" : isMatched ? "Zsynchronizowane" : "Przenieś do punktu sprzedaży"}
                      >
                        {isManuallyAdded ? "Dodane" : isMatched ? "Zsync." : "Przenieś"}
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
          </div> {/* magazyn-scrollable */}
        </div> {/* tableContainer */}
      </div> {/* Magazyn section */}

      {/* Right side - Sales data or Manual transfer */}
      <div style={{ 
        width: isMobile ? '100%' : '50%', 
        padding: '20px',
        height: isMobile ? 'auto' : '100vh',
        overflowY: isMobile ? 'auto' : 'hidden'
      }}>
        <h2 style={{color:'white', textAlign: isMobile ? 'center' : 'center'}}>
          {operationType === 'sprzedaz' ? 'Sprzedaż z danego dnia' : 'Przepisanie do punktu sprzedaży'}
        </h2>
        
        {/* All controls in one line */}
        <div style={{ 
          marginBottom: '20px', 
          display: 'flex', 
          gap: '20px', 
          justifyContent: 'center', 
          alignItems: isMobile ? 'center' : 'flex-end', 
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px', textAlign: 'center' }}>Typ operacji:</label>
            <select
              value={operationType}
              onChange={(e) => handleOperationTypeChange(e.target.value)}
              className="form-select"
              style={{ 
                width: isMobile ? '100%' : '200px',
                textAlign: 'center'
              }}
            >
              <option value="sprzedaz">Sprzedaż</option>
              <option value="przepisanie">Przepisanie do punktu</option>
            </select>
          </div>

          {operationType === 'sprzedaz' && (
            <>
              <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '5px', textAlign: 'center' }}>Wybierz datę:</label>
                <div style={{ 
                  width: isMobile ? '100%' : '200px',
                  position: 'relative'
                }}>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    className="form-control"
                    locale="pl"
                    dateFormat="dd.MM.yyyy"
                    style={{ 
                      width: isMobile ? '100%' : '200px',
                      minWidth: isMobile ? '100%' : '200px',
                      maxWidth: isMobile ? '100%' : '200px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      display: 'block'
                    }}
                    wrapperClassName={isMobile ? 'w-100' : ''}
                    popperProps={{
                      style: { width: isMobile ? '100%' : '200px' }
                    }}
                  />
                </div>
              </div>
              
              <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '5px', textAlign: 'center' }}>Punkt sprzedaży:</label>
                <select
                  value={selectedSellingPoint}
                  onChange={(e) => setSelectedSellingPoint(e.target.value)}
                  className="form-select"
                  style={{ 
                    width: isMobile ? '100%' : '200px',
                    textAlign: 'center'
                  }}
                >
                  {sellingPoints.map((point, index) => (
                    <option key={index} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
                <button 
                  onClick={handleSynchronize}
                  className="btn btn-primary"
                  style={{ height: 'fit-content' }}
                >
                  Synchronizuj
                </button>
              </div>
            </>
          )}

          {operationType === 'przepisanie' && (
            <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px', textAlign: 'center' }}>
                Docelowy punkt sprzedaży: (Aktualna wartość: "{targetSellingPoint}")
              </label>
              <select
                value={targetSellingPoint}
                onChange={(e) => setTargetSellingPoint(e.target.value)}
                className="form-select"
                style={{ 
                  width: isMobile ? '100%' : '200px',
                  textAlign: 'center'
                }}
                required
              >
                {sellingPoints.map((point, index) => (
                  <option key={index} value={point}>
                    {point}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={handleSave}
              className="btn btn-success"
              style={{ height: 'fit-content' }}
              disabled={
                isTransactionInProgress || 
                isTransactionSaved ||
                (operationType === 'sprzedaz' && (!synchronizedItems.magazyn || synchronizedItems.magazyn.size === 0) && addedMagazynIds.size === 0) ||
                (operationType === 'przepisanie' && (!targetSellingPoint || addedMagazynIds.size === 0))
              }
            >
              {isTransactionInProgress ? 'Zapisywanie...' : 
               isTransactionSaved ? 'Zapisano' : 
               'Zapisz'}
            </button>
          </div>
          
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="btn btn-info"
              style={{ height: 'fit-content' }}
            >
              📋 Historia ({transactionHistory.length})
            </button>
          </div>
          
          {/* Print controls */}
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={checkPrinter}
              className="btn btn-secondary"
              style={{ height: 'fit-content', marginRight: '5px' }}
            >
              🖨️ Sprawdź drukarkę
            </button>
          </div>
          
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={printSelectedBarcodes}
              className="btn btn-warning"
              style={{ height: 'fit-content' }}
              disabled={!printer || selectedForPrint.size === 0}
            >
              📄 Drukuj zaznaczone ({selectedForPrint.size})
            </button>
          </div>
        </div>

        {/* Print error display */}
        {printerError && (
          <div style={{ textAlign: 'center', color: 'red', marginBottom: '10px' }}>
            {printerError}
          </div>
        )}

        {/* Print selection controls */}
        {(filteredSales.length > 0 || manuallyAddedItems.length > 0) && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px', 
            marginBottom: '10px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={selectAllForPrint}
              className="btn btn-sm btn-outline-light"
            >
              Zaznacz wszystkie
            </button>
            <button 
              onClick={clearPrintSelection}
              className="btn btn-sm btn-outline-light"
            >
              Odznacz wszystkie
            </button>
          </div>
        )}

        {/* Sales list or Manual transfer list */}
        {operationType === 'sprzedaz' ? (
          <div className={styles.tableContainer}>
            <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
              <thead>
                <tr>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => e.target.checked ? selectAllForPrint() : clearPrintSelection()}
                      checked={selectedForPrint.size > 0 && selectedForPrint.size === (filteredSales.length + manuallyAddedItems.length)}
                    />
                  </th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena (PLN)</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredSales, ...manuallyAddedItems].map((sale, index) => {
                  const isMatched = synchronizedItems.sales && synchronizedItems.sales.has(sale._id);
                  const isManuallyAdded = sale.isManuallyAdded;
                  let backgroundColor;
                  
                  if (isManuallyAdded) {
                    backgroundColor = '#FF9800'; // Orange for manually added items
                  } else if (isMatched) {
                    backgroundColor = '#4CAF50'; // Green if matched
                  } else {
                    backgroundColor = '#2196F3'; // Blue as default
                  }
                  
                  // Format price with semicolon separator
                  let displayPrice = 'Brak ceny';
                  if (sale.cash && sale.cash.length > 0 && sale.cash[0].price) {
                    displayPrice = sale.cash[0].price.toString();
                  } else if (sale.price) {
                    displayPrice = sale.price.toString();
                  }
                  
                  return (
                    <tr key={sale._id} className={styles.tableRow} style={{ backgroundColor: `${backgroundColor} !important` }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                        <input 
                          type="checkbox" 
                          checked={selectedForPrint.has(sale._id || sale.id)}
                          onChange={() => toggleSelectForPrint(sale._id || sale.id)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{index + 1}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.fullName}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.size}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{displayPrice}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.barcode}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                        {isManuallyAdded ? (
                          <button 
                            onClick={() => handleRemoveFromSales(sale)}
                            className="btn btn-sm"
                            style={{ 
                              backgroundColor: '#dc3545',
                              border: 'none', 
                              color: 'white', 
                              fontSize: '14px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              minWidth: '60px'
                            }}
                            title="Cofnij przeniesienie"
                          >
                            Cofnij
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredSales.length === 0 && manuallyAddedItems.length === 0 && (
              <div style={{ textAlign: 'center', color: 'white', marginTop: '20px' }}>
                Brak sprzedaży dla wybranych kryteriów
              </div>
            )}
          </div>
        ) : (
          // Przepisanie mode - show only manually added items
          <div className={styles.tableContainer}>
            <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
              <thead>
                <tr>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => e.target.checked ? selectAllForPrint() : clearPrintSelection()}
                      checked={selectedForPrint.size > 0 && selectedForPrint.size === manuallyAddedItems.length}
                    />
                  </th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena (PLN)</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Docelowy punkt</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {manuallyAddedItems.map((item, index) => (
                  <tr key={item._id} className={styles.tableRow} style={{ backgroundColor: '#FF9800 !important' }}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedForPrint.has(item._id || item.id)}
                        onChange={() => toggleSelectForPrint(item._id || item.id)}
                      />
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.fullName}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.size}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>
                      {item.price ? item.price.toString() : 'Brak ceny'}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.barcode}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{targetSellingPoint}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>
                      <button 
                        onClick={() => handleRemoveFromSales(item)}
                        className="btn btn-sm"
                        style={{ 
                          backgroundColor: '#dc3545',
                          border: 'none', 
                          color: 'white', 
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          minWidth: '60px'
                        }}
                        title="Cofnij przeniesienie"
                      >
                        Cofnij
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {manuallyAddedItems.length === 0 && (
              <div style={{ textAlign: 'center', color: 'white', marginTop: '20px' }}>
                {!targetSellingPoint 
                  ? 'Wybierz docelowy punkt sprzedaży aby rozpocząć przepisywanie' 
                  : 'Kliknij strzałki przy produktach w MAGAZYN aby je dodać do przepisania'
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default AddToState;