import React, { useState, useEffect, forwardRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import styles from '../State/State.module.css'; // Use the same styles as State.js

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
  const [transactionHistory, setTransactionHistory] = useState([]); // List of transactions that can be undone
  const [showUndoOptions, setShowUndoOptions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); // For modal display
  
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
  
  // Add CSS for DatePicker responsiveness
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
        const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
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
            processedItems.push({
              ...relatedMagazynItem,
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
          processedItems.push({
            ...relatedMagazynItem,
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
              'operation-type': 'delete'
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
              'operation-type': 'transfer-same'
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
              'operation-type': 'transfer-from-magazyn'
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
      console.log('Transaction deactivated in database:', transactionId);
      // Reload history after deactivating
      await loadTransactionHistory();
    } catch (error) {
      console.error('Error deactivating transaction in database:', error);
      throw error;
    }
  };

  // Function to undo/cancel last transaction
  const handleUndoTransaction = async (transaction) => {
    if (!transaction || isTransactionInProgress) return;
    
    setIsTransactionInProgress(true);
    
    try {
      // Restore items to their original state based on transaction type
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
            axios.post('/api/state/restore', restoreData)
          );
        }
      }
      
      await Promise.all(restorePromises);
      
      // Deactivate transaction in database
      await deactivateTransactionInDatabase(transaction.transactionId);
      
      // Refresh data
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
      setMagazynItems(magazynData);
      
      alert(`Transakcja z ${new Date(transaction.timestamp).toLocaleString('pl-PL')} została anulowana pomyślnie!`);
      
    } catch (error) {
      console.error('Error undoing transaction:', error);
      alert('Błąd podczas anulowania transakcji. Spróbuj ponownie.');
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
      
      alert('Pamięć podręczna i stare transakcje zostały wyczyszczone!');
    } catch (error) {
      console.error('Error clearing storage:', error);
      alert('Błąd podczas czyszczenia pamięci. Spróbuj ponownie.');
    }
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: isMobile ? '95%' : '80%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h4 style={{ margin: 0, color: '#333' }}>Historia transakcji</h4>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-outline-secondary btn-sm"
                style={{ padding: '5px 10px' }}
              >
                ✕ Zamknij
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {transactionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Brak transakcji do wyświetlenia
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {transactionHistory.map((transaction, index) => (
                    <div
                      key={transaction.transactionId}
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div>
                          <strong style={{ color: '#333' }}>
                            #{index + 1} - {new Date(transaction.timestamp).toLocaleString('pl-PL')}
                          </strong>
                          <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                            Typ: {transaction.operationType === 'sprzedaz' ? 'Sprzedaż' : 'Przepisanie'} | 
                            Elementów: {transaction.itemsCount} | 
                            Punkt: {transaction.selectedSellingPoint || transaction.targetSellingPoint}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleUndoTransaction(transaction);
                            setShowHistoryModal(false);
                          }}
                          className="btn btn-outline-danger btn-sm"
                          disabled={isTransactionInProgress}
                          style={{ minWidth: '80px' }}
                        >
                          {isTransactionInProgress ? 'Anulowanie...' : 'Anuluj'}
                        </button>
                      </div>
                      
                      {transaction.processedItems && transaction.processedItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#555' }}>
                          <strong>Przetworzone elementy:</strong>
                          <div style={{ marginTop: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                            {transaction.processedItems.slice(0, 5).map((item, idx) => (
                              <div key={idx} style={{ 
                                padding: '2px 0', 
                                borderBottom: idx < 4 ? '1px solid #eee' : 'none' 
                              }}>
                                • {item.fullName} ({item.size}) - {
                                  item.processType === 'sold' ? 'Sprzedano' :
                                  item.processType === 'synchronized' ? 'Zsynchronizowano' :
                                  'Przeniesiono'
                                }
                              </div>
                            ))}
                            {transaction.processedItems.length > 5 && (
                              <div style={{ padding: '2px 0', fontStyle: 'italic' }}>
                                ... i {transaction.processedItems.length - 5} więcej
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid #dee2e6'
            }}>
              <button
                onClick={clearPersistentStorage}
                className="btn btn-outline-warning btn-sm"
              >
                🗑️ Wyczyść pamięć
              </button>
              
              {transactionHistory.length > 0 && (
                <button
                  onClick={() => {
                    handleUndoTransaction(transactionHistory[0]);
                    setShowHistoryModal(false);
                  }}
                  className="btn btn-danger btn-sm"
                  disabled={isTransactionInProgress}
                >
                  {isTransactionInProgress ? 'Anulowanie...' : '↶ Anuluj ostatnią transakcję'}
                </button>
              )}
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
          <h2 style={{color:'white', marginBottom: isMobile ? '20px' : '93px', display: 'block', textAlign: isMobile ? 'center' : 'center'}}>Magazyn</h2>
        <div className={styles.tableContainer}>
          <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
            <thead>
              <tr>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Data</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena promocyjna</th>
                <th className={`${styles.tableHeader} ${styles.noWrap}`}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {magazynItems.map((item, index) => {
                const isMatched = synchronizedItems.magazyn && synchronizedItems.magazyn.has(item.id);
                const isManuallyAdded = addedMagazynIds.has(item.id);
                const backgroundColor = isMatched ? '#666666' : (isManuallyAdded ? '#666666' : 'inherit');
                
                return (
                  <tr key={item.id} className={styles.tableRow} style={backgroundColor !== 'inherit' ? { backgroundColor: `${backgroundColor} !important` } : {}}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{index + 1}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.fullName}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.size}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.barcode}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.price}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{item.discount_price}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </div>

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
              className="btn btn-outline-info"
              style={{ height: 'fit-content' }}
            >
              📋 Historia ({transactionHistory.length})
            </button>
          </div>
        </div>

        {/* Sales list or Manual transfer list */}
        {operationType === 'sprzedaz' ? (
          <div className={styles.tableContainer}>
            <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
              <thead>
                <tr>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Gotówka</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Karta</th>
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
                  
                  return (
                    <tr key={sale._id} className={styles.tableRow} style={{ backgroundColor: `${backgroundColor} !important` }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{index + 1}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.fullName}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.size}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>{sale.barcode}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                        {sale.cash.map((c, i) => (
                          <div key={i}>{`${c.price} ${c.currency}`}</div>
                        ))}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor }}>
                        {sale.card.map((c, i) => (
                          <div key={i}>{`${c.price} ${c.currency}`}</div>
                        ))}
                      </td>
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
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Cena</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Docelowy punkt</th>
                  <th className={`${styles.tableHeader} ${styles.noWrap}`}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {manuallyAddedItems.map((item, index) => (
                  <tr key={item._id} className={styles.tableRow} style={{ backgroundColor: '#FF9800 !important' }}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.fullName}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.size}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.barcode}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#FF9800' }}>{item.cash[0]?.price} PLN</td>
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