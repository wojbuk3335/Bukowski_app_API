import React, { useState, useEffect, forwardRef, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import styles from '../Warehouse/Warehouse.module.css'; // Use the same styles as Warehouse.js
import TransactionReportModal from './TransactionReportModal';

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
  const [magazynSymbol, setMagazynSymbol] = useState('MAGAZYN'); // Dynamic magazyn symbol
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
  const [processedSalesIds, setProcessedSalesIds] = useState(new Set()); // Track which sales have been processed to prevent double-processing
  
  // Printing states
  const [selectedForPrint, setSelectedForPrint] = useState(new Set()); // Track selected items for printing
  const [printer, setPrinter] = useState(null); // Store printer instance
  const [printerError, setPrinterError] = useState(null); // Track printer errors
  
  // Transaction report states
  const [showTransactionReport, setShowTransactionReport] = useState(false);
  const [selectedTransactionForReport, setSelectedTransactionForReport] = useState(null);
  
  // State for showing/hiding transaction details
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());
  
  // Modal states for alerts
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationModal, setNotificationModal] = useState({
    title: '',
    message: '',
    type: 'info' // 'info', 'success', 'warning', 'error'
  });
  
  // Modal states for confirmation dialogs
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Tak',
    cancelText: 'Anuluj'
  });
  
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
        background: #000;
        border-radius: 4px;
      }
      .history-scrollable::-webkit-scrollbar-thumb {
        background: #000;
        border-radius: 4px;
      }
      .history-scrollable::-webkit-scrollbar-thumb:hover {
        background: #000;
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
        background: #000;
        border-radius: 4px;
      }
      .magazyn-scrollable::-webkit-scrollbar-thumb {
        background: #000;
        border-radius: 4px;
      }
      .magazyn-scrollable::-webkit-scrollbar-thumb:hover {
        background: #000;
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
        // Get current magazyn symbol
        const currentMagazynSymbol = await getMagazynSymbol();
        
        // Fetch magazyn items
        const stateResponse = await axios.get('/api/state');
        const magazynDataRaw = stateResponse.data.filter(item => item.symbol === currentMagazynSymbol);
        
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
              .filter(user => user && user.sellingPoint && user.sellingPoint !== currentMagazynSymbol && user.sellingPoint !== 'Magazyn') // Exclude current magazyn symbol and Magazyn
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
          .filter(point => point && point !== currentMagazynSymbol); // Additional filter to exclude current magazyn symbol
        

        
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
    // Reset transaction saved state when date or selling point changes
    setIsTransactionSaved(false);
    
    // Filter sales based on selected date and selling point (only for "sprzedaz" mode)
    if (operationType === 'sprzedaz') {

      
      let filtered = salesData.filter(sale => {
        const selectedDateString = selectedDate.toDateString();
        let finalSaleDate;
        
        // PRIORYTET: Jeśli istnieje pole 'date', użyj go. W przeciwnym razie użyj 'timestamp'
        if (sale.date) {
          // Użyj pola 'date' jako głównego źródła daty
          finalSaleDate = new Date(sale.date).toDateString();

        } else {
          // Fallback do 'timestamp' tylko jeśli nie ma pola 'date'
          if (typeof sale.timestamp === 'string' && sale.timestamp.includes('.')) {
            const datePart = sale.timestamp.split(',')[0]; // Weź tylko część z datą, usuń czas
            const parts = datePart.split('.');
            if (parts.length === 3) {
              // Konwertuj z DD.MM.YYYY na poprawny format MM/DD/YYYY
              const [day, month, year] = parts;
              finalSaleDate = new Date(`${month}/${day}/${year}`).toDateString();
            } else {
              finalSaleDate = new Date(sale.timestamp).toDateString();
            }
          } else {
            finalSaleDate = new Date(sale.timestamp).toDateString();
          }

        }
        
        // Porównaj tylko jedną ostateczną datę
        const matches = finalSaleDate === selectedDateString;

        
        return matches;
      });
      
      // USUNIĘTE: Tymczasowe wyłączenie filtrowania dat
      // filtered = salesData; // Ta linia powodowała pokazywanie wszystkich sprzedaży
      


      if (selectedSellingPoint) {
        // Find the symbol for the selected selling point
        const selectedUser = usersData.find(user => user.sellingPoint === selectedSellingPoint);

        const selectedSymbol = selectedUser ? selectedUser.symbol : null;

        
        if (selectedSymbol) {
          // Filter sales by 'from' field matching the selected symbol
          const beforeFilter = filtered.length;
          filtered = filtered.filter(sale => {

            return sale.from === selectedSymbol;
          });

        } else {

        }
      } else {

      }

      // IMPORTANT: Filter out already processed sales to prevent double-processing
      // BUT keep synchronized sales visible (they should show as green)
      const beforeProcessedFilter = filtered.length;
      filtered = filtered.filter(sale => {
        const isProcessed = processedSalesIds.has(sale._id);
        const isSynchronized = synchronizedItems.sales && synchronizedItems.sales.has(sale._id);
        
        // Keep if not processed OR if synchronized (to show green)
        return !isProcessed || isSynchronized;
      });



      setFilteredSales(filtered);
    } else {
      // For "przepisanie" mode, clear sales
      setFilteredSales([]);
    }
  }, [salesData, selectedDate, selectedSellingPoint, operationType, usersData, processedSalesIds, synchronizedItems]);

  const handleSynchronize = async () => {
    // Synchronization only available in "sprzedaz" mode
    if (operationType !== 'sprzedaz') {
      showNotification('Błąd', 'Synchronizacja dostępna tylko w trybie "Sprzedaż"', 'error');
      return;
    }

    if (!selectedDate || !selectedSellingPoint) {
      showNotification('Błąd', 'Wybierz datę i punkt sprzedaży przed synchronizacją', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Format date for API call (YYYY-MM-DD)
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Find the symbol for the selected selling point
      const selectedUser = usersData.find(user => user.sellingPoint === selectedSellingPoint);
      const selectedSymbol = selectedUser ? selectedUser.symbol : null;
      

      
      if (!selectedSymbol) {
        showNotification('Błąd', `Nie znaleziono symbolu dla punktu sprzedaży "${selectedSellingPoint}"`, 'error');
        setLoading(false);
        return;
      }
      
      // Fetch sales data for the selected date and selling point
      // Use selectedSymbol instead of selectedSellingPoint for API call
      const salesResponse = await axios.get('/api/sales/filter-by-date-and-point', {
        params: {
          date: formattedDate,
          sellingPoint: selectedSymbol  // Use symbol instead of selling point name
        }
      });
      


      const freshSalesData = salesResponse.data;

      // Don't show notification about fetched data here - show it after synchronization

      // Now perform synchronization between currently visible sales and magazyn items
      const matchedMagazynIds = new Set();
      const matchedSalesIds = new Set();
      const synchronizedMagazynItems = new Set();
      const synchronizedSalesItems = new Set();
      

      
      // Use currently filtered sales for synchronization (not fresh API data)
      // This ensures we work with what user can see on screen
      const salesForSync = filteredSales.length > 0 ? filteredSales : freshSalesData;

      
      // Find one-to-one matches between visible sales and magazyn items
      salesForSync.forEach(sale => {
        if (matchedSalesIds.has(sale._id)) return;
        
        for (let i = 0; i < magazynItems.length; i++) {
          const magazynItem = magazynItems[i];
          
          if (matchedMagazynIds.has(magazynItem.id)) continue;
          

          
          if (sale.barcode === magazynItem.barcode && sale.size === magazynItem.size) {
            matchedMagazynIds.add(magazynItem.id);
            matchedSalesIds.add(sale._id);
            synchronizedMagazynItems.add(magazynItem.id);
            synchronizedSalesItems.add(sale._id);

            break;
          }
        }
      });
      
      // Update synchronized items first
      setSynchronizedItems({ magazyn: synchronizedMagazynItems, sales: synchronizedSalesItems });
      

      
      // Synchronization completed - no modal notification needed
      // Results are visible through color changes in the UI
      
      // DO NOT update salesData - this would trigger useEffect and clear existing filteredSales
      // Just keep the synchronized items marked as green
      // setSalesData(freshSalesData); // REMOVED - this was causing the blue items to disappear
      
    } catch (error) {
      console.error('Error during synchronization:', error);
      showNotification(
        'Błąd synchronizacji', 
        `Nie udało się pobrać danych sprzedaży: ${error.response?.data?.error || error.message}`, 
        'error'
      );
    } finally {
      setLoading(false);
    }
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
      // STEP 1: Validate that all items exist in current state before processing

      
      // Fetch current state from API
      const currentStateResponse = await axios.get('/api/state');
      const currentStateItems = currentStateResponse.data || [];

      
      // Collect all items that need to be validated
      const itemsToValidate = [];
      const missingItems = [];
      const validItems = [];
      
      // Add sales items (blue) to validation
      filteredSales.forEach(sale => {
        if (!synchronizedItems.sales || !synchronizedItems.sales.has(sale._id)) {
          itemsToValidate.push({
            type: 'sales',
            data: sale,
            barcode: sale.barcode,
            expectedSymbol: sale.from,
            displayName: `${sale.fullName} (${sale.size})`
          });
        }
      });
      
      // Add manually added items (orange) to validation - these should be in MAGAZYN
      addedMagazynIds.forEach(id => {
        const magazynItem = magazynItems.find(item => item.id === id);
        if (magazynItem) {
          itemsToValidate.push({
            type: 'magazyn',
            data: magazynItem,
            barcode: magazynItem.barcode,
            expectedSymbol: magazynSymbol,
            displayName: `${magazynItem.fullName} (${magazynItem.size})`
          });
        }
      });
      
      // Add synchronized items (green) to validation
      if (synchronizedItems.magazyn) {
        synchronizedItems.magazyn.forEach(id => {
          const magazynItem = magazynItems.find(item => item.id === id);
          if (magazynItem) {
            itemsToValidate.push({
              type: 'synchronized',
              data: magazynItem,
              barcode: magazynItem.barcode,
              expectedSymbol: magazynSymbol,
              displayName: `${magazynItem.fullName} (${magazynItem.size})`
            });
          }
        });
      }
      

      
      // Validate each item against current state
      itemsToValidate.forEach(item => {
        const existsInState = currentStateItems.some(stateItem => 
          stateItem.barcode === item.barcode && 
          stateItem.symbol === item.expectedSymbol
        );
        
        if (existsInState) {
          validItems.push(item);
        } else {
          missingItems.push(item);
          console.warn(`❌ Missing from state: ${item.displayName} (barcode: ${item.barcode}, symbol: ${item.expectedSymbol})`);
        }
      });
      

      
      // If there are missing items, show warning but continue with valid items
      if (missingItems.length > 0) {
        const missingList = missingItems.map(item => `• ${item.displayName} (${item.barcode})`).join('\n');
        showNotification(
          'Ostrzeżenie - Brakujące elementy', 
          `Następujące elementy nie znajdują się na stanie i zostaną pominięte:\n\n${missingList}\n\nPozostałe elementy (${validItems.length}) zostały pomyślnie odpisane.`,
          'warning'
        );
      }
      
      // If no valid items, stop processing
      if (validItems.length === 0) {
        showNotification('Błąd', 'Żaden z wybranych elementów nie znajduje się na stanie. Operacja anulowana.', 'error');
        setIsTransactionInProgress(false);
        return;
      }

      // STEP 2: Prepare transaction details for history (only valid items)
      const transactionId = Date.now().toString();
      const processedItems = [];
      
      // Separate items by their colors/types (only valid items)
      const blueItems = new Set(); // Regular sales items (blue) - to be deleted
      const greenItems = new Set(); // Synchronized items (green) - to be transferred within same selling point
      const orangeItems = new Set(); // Manually added items (orange) - to be transferred from MAGAZYN

      // Process sales items for deletion (blue) - only valid ones
      const blueItemsBarcodes = []; // Use array instead of Set to keep duplicates
      const validSalesItems = validItems.filter(item => item.type === 'sales');
      validSalesItems.forEach(validItem => {
        const sale = validItem.data;
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
      });

      // Group barcodes by count to know how many to delete
      const barcodeCount = {};
      blueItemsBarcodes.forEach(barcode => {
        barcodeCount[barcode] = (barcodeCount[barcode] || 0) + 1;
      });

      // Process synchronized items (green) - only valid ones
      const validSynchronizedItems = validItems.filter(item => item.type === 'synchronized');
      validSynchronizedItems.forEach(validItem => {
        const magazynItem = validItem.data;
        greenItems.add(magazynItem.id);
        
        // Handle price format for transaction history - split if contains semicolon
        let itemPrice = 0;
        let itemDiscountPrice = 0;
        
        if (magazynItem.price && typeof magazynItem.price === 'string' && magazynItem.price.includes(';')) {
          const prices = magazynItem.price.split(';');
          itemPrice = Number(prices[0]) || 0;
          itemDiscountPrice = Number(prices[1]) || 0;
        } else {
          itemPrice = Number(magazynItem.price) || 0;
        }
        
        processedItems.push({
          fullName: magazynItem.fullName,
          size: magazynItem.size,
          barcode: magazynItem.barcode,
          price: itemPrice,
          discount_price: itemDiscountPrice,
          processType: 'synchronized',
          originalId: magazynItem.id,
          originalSymbol: magazynSymbol // Items came from current magazyn symbol originally
        });
      });

      // Process manually added items (orange) - only valid ones
      const validMagazynItems = validItems.filter(item => item.type === 'magazyn');
      validMagazynItems.forEach(validItem => {
        const magazynItem = validItem.data;
        orangeItems.add(magazynItem.id);
        
        // Handle price format for transaction history - split if contains semicolon
        let itemPrice = 0;
        let itemDiscountPrice = 0;
        
        if (magazynItem.price && typeof magazynItem.price === 'string' && magazynItem.price.includes(';')) {
          const prices = magazynItem.price.split(';');
          itemPrice = Number(prices[0]) || 0;
          itemDiscountPrice = Number(prices[1]) || 0;
        } else {
          itemPrice = Number(magazynItem.price) || 0;
        }
        
        processedItems.push({
          fullName: magazynItem.fullName,
          size: magazynItem.size,
          barcode: magazynItem.barcode,
          price: itemPrice,
          discount_price: itemDiscountPrice,
          processType: 'transferred',
          originalId: magazynItem.id,
          originalSymbol: magazynSymbol // Items came from current magazyn symbol originally
        });
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

      // Process green items (transfer within same selling point or to target point)
      const greenPromises = Array.from(greenItems).map(async (itemId) => {
        try {
          // For "przepisanie" mode, we need to restore items to target selling point
          if (operationType === 'przepisanie') {
            // First, get the item data before deleting it
            const magazynItem = magazynItems.find(item => item.id === itemId);
            if (!magazynItem) {
              console.warn(`Magazyn item ${itemId} not found for green transfer`);
              return;
            }

            // Step 1: Delete from MAGAZYN
            await axios.delete(`/api/state/${itemId}`, {
              headers: {
                'target-symbol': actualTargetSymbol,
                'operation-type': 'transfer-from-magazyn', // Changed for przepisanie mode
                'transactionid': transactionId
              }
            });

            // Step 2: Restore to target selling point
            const restoreData = {
              fullName: magazynItem.fullName.fullName || magazynItem.fullName,
              size: magazynItem.size.Roz_Opis || magazynItem.size,
              barcode: magazynItem.barcode,
              symbol: actualTargetSymbol,
              price: magazynItem.price,
              discount_price: magazynItem.discount_price,
              operationType: 'transfer-green-to-target'
            };

            await axios.post('/api/state/restore-silent', restoreData);


          } else {
            // For "sprzedaz" mode, use original logic (delete only - simulates sale)
            await axios.delete(`/api/state/${itemId}`, {
              headers: {
                'target-symbol': actualTargetSymbol, // Same symbol (M → M)
                'operation-type': 'transfer-same',
                'transactionid': transactionId
              }
            });
          }
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

      // Process orange items (transfer from MAGAZYN to target/selling point)
      const orangePromises = Array.from(orangeItems).map(async (itemId) => {
        try {
          // First, get the item data before deleting it
          const magazynItem = magazynItems.find(item => item.id === itemId);
          if (!magazynItem) {
            console.warn(`Magazyn item ${itemId} not found`);
            return;
          }

          // Step 1: Delete from MAGAZYN
          await axios.delete(`/api/state/${itemId}`, {
            headers: {
              'target-symbol': actualTargetSymbol, // MAGAZYN → targetSymbol
              'operation-type': 'transfer-from-magazyn',
              'transactionid': transactionId
            }
          });

          // Step 2: Restore to target selling point (for both sprzedaz and przepisanie)
          const restoreData = {
            fullName: magazynItem.fullName.fullName || magazynItem.fullName,
            size: magazynItem.size.Roz_Opis || magazynItem.size,
            barcode: magazynItem.barcode,
            symbol: actualTargetSymbol,
            price: magazynItem.price,
            discount_price: magazynItem.discount_price,
            operationType: `transfer-orange-${operationType}` // transfer-orange-sprzedaz or transfer-orange-przepisanie
          };

          await axios.post('/api/state/restore-silent', restoreData);


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

      // Store IDs of processed sales to prevent them from showing up again (only successfully processed ones)
      const processedBlueIds = new Set(processedSalesIds);
      validSalesItems.forEach(validItem => {
        processedBlueIds.add(validItem.data._id);
      });
      setProcessedSalesIds(processedBlueIds);

      // Store items for display (keeping the view)
      const itemsForDisplay = processedItems.map(item => ({
        ...item,
        isProcessed: true
      }));

      setSavedItemsForDisplay(itemsForDisplay);
      // lastTransaction will be set when history is reloaded from database
      setIsTransactionSaved(true);

      // Clear ALL states after successful save to prevent accidental double-saving
      setSynchronizedItems(new Set());
      setManuallyAddedItems([]);
      setAddedMagazynIds(new Set());
      setFilteredSales([]); // Clear blue items (sales) to prevent double-saving

      // Refresh magazyn data
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === magazynSymbol);
      setMagazynItems(magazynData);
      showNotification('Sukces!', 'Transakcja została zapisana pomyślnie!', 'success');
    } catch (error) {
      console.error('Error saving items:', error);
      showNotification('Błąd!', 'Błąd podczas zapisywania. Spróbuj ponownie.', 'error');
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

  // Function to show notification modal instead of alert
  const showNotification = (title, message, type = 'info') => {
    setNotificationModal({ title, message, type });
    setShowNotificationModal(true);
  };

  // Function to show confirmation modal instead of window.confirm
  const showConfirmation = (title, message, onConfirm, onCancel = null, confirmText = 'Tak', cancelText = 'Anuluj') => {
    setConfirmModal({ 
      title, 
      message, 
      onConfirm, 
      onCancel: onCancel || (() => setShowConfirmModal(false)), 
      confirmText, 
      cancelText 
    });
    setShowConfirmModal(true);
  };

  // Function to delete all transaction history with confirmation
  const handleDeleteAllHistory = async () => {
    const firstMessage = "⚠️ UWAGA! ⚠️\n\n" +
      "Czy na pewno chcesz usunąć CAŁĄ historię transakcji?\n\n" +
      "Ta operacja:\n" +
      "• Usunie wszystkie zapisane transakcje z bazy danych\n" +
      "• Nie przywróci żadnych produktów do magazynu\n" +
      "• Jest NIEODWRACALNA\n\n" +
      "Kliknij OK, aby kontynuować, lub Anuluj, aby przerwać.";

    showConfirmation(
      '⚠️ UWAGA! ⚠️',
      firstMessage,
      () => {
        setShowConfirmModal(false);
        showSecondDeleteConfirmation();
      },
      () => setShowConfirmModal(false),
      'Kontynuuj',
      'Anuluj'
    );
  };

  const showSecondDeleteConfirmation = () => {
    const secondMessage = " OSTATECZNE OSTRZEŻENIE! \n\n" +
      "To jest Twoja ostatnia szansa!\n\n" +
      "Usunięcie całej historii transakcji spowoduje:\n" +
      "• CAŁKOWITĄ UTRATĘ wszystkich zapisanych transakcji\n" +
      "• Brak możliwości anulowania pojedynczych transakcji\n" +
      "• Utratę raportów i statystyk\n\n" +
      "CZY JESTEŚ ABSOLUTNIE PEWIEN?\n\n" +
      "Kliknij OK, aby BEZPOWROTNIE usunąć całą historię.";

    showConfirmation(
      ' OSTATECZNE OSTRZEŻENIE! ',
      secondMessage,
      () => {
        setShowConfirmModal(false);
        performDeleteAllHistory();
      },
      () => setShowConfirmModal(false),
      'USUŃ WSZYSTKO',
      'Anuluj'
    );
  };

  const performDeleteAllHistory = async () => {

    setIsTransactionInProgress(true);
    
    try {
      // Get all transactions first
      const response = await axios.get('/api/transaction-history');
      const allTransactions = response.data || [];
      
      if (allTransactions.length === 0) {
        showNotification('Informacja', 'Brak transakcji do usunięcia.', 'info');
        return;
      }

      // Delete each transaction individually
      let deletedCount = 0;
      const errors = [];

      for (const transaction of allTransactions) {
        try {
          await axios.delete(`/api/transaction-history/${transaction.transactionId}`);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting transaction ${transaction.transactionId}:`, error);
          errors.push(transaction.transactionId);
        }
      }

      // Clear local state
      setTransactionHistory([]);
      
      // Close modal
      setShowHistoryModal(false);
      
      // Show result
      if (errors.length === 0) {
        showNotification('Sukces!', `Wszystkie transakcje zostały usunięte! (${deletedCount} transakcji)`, 'success');
      } else {
        showNotification('Częściowy sukces', `Usunięto ${deletedCount} z ${allTransactions.length} transakcji.\nBłędy przy usuwaniu: ${errors.length} transakcji.`, 'warning');
      }
    } catch (error) {
      console.error('Error deleting all transaction history:', error);
      showNotification('Błąd!', 'Błąd podczas usuwania historii transakcji. Spróbuj ponownie.', 'error');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Function to undo/cancel last transaction
  const handleUndoTransaction = async (transaction) => {
    if (!transaction || isTransactionInProgress) return;
    
    const confirmMessage = `Czy na pewno chcesz anulować całą transakcję?\n\n` +
      `Transakcja z: ${new Date(transaction.timestamp).toLocaleString('pl-PL')}\n` +
      `Liczba elementów: ${transaction.itemsCount}\n` +
      `Punkt sprzedaży: ${transaction.selectedSellingPoint || 'N/D'}\n\n` +
      `Ta operacja:\n` +
      `• Przywróci wszystkie produkty do ich pierwotnych lokalizacji\n` +
      `• Usunie transakcję z historii\n` +
      `• Jest NIEODWRACALNA`;

    // Use modal confirmation instead of window.confirm
    showConfirmation(
      '⚠️ OSTRZEŻENIE! ⚠️',
      confirmMessage,
      () => {
        setShowConfirmModal(false);
        performUndoTransaction(transaction);
      },
      () => setShowConfirmModal(false),
      'Anuluj transakcję',
      'Anuluj'
    );
  };

  // Actual implementation moved to separate function
  const performUndoTransaction = async (transaction) => {
    
    setIsTransactionInProgress(true);
    
    try {
      // STEP 1: First remove items from their current locations to prevent duplication
      const removePromises = [];
      
      for (const item of transaction.processedItems) {
        if (item.processType === 'sold') {
          // Sold items - they were sold from a selling point, don't need to remove from anywhere
          // They are already gone from the selling point through sale
          continue;
          
        } else if (item.processType === 'synchronized') {
          // Synchronized items - they were transferred to selling point and then sold
          // They are already gone from the selling point through sale, don't need to remove
          continue;
          
        } else if (item.processType === 'transferred') {
          // Transferred items - they are currently in the target selling point, need to remove them
          const targetSellingPointName = transaction.selectedSellingPoint || transaction.targetSellingPoint;
          
          // Convert selling point name to symbol using usersData
          let targetSymbol = null;
          if (targetSellingPointName) {
            const targetUser = usersData.find(user => user.sellingPoint === targetSellingPointName);
            targetSymbol = targetUser ? targetUser.symbol : targetSellingPointName; // Fallback to name if symbol not found
          }
          
          if (targetSymbol) {
            removePromises.push(
              axios.delete(`/api/state/barcode/${item.barcode}/symbol/${targetSymbol}?count=1`, {
                headers: {
                  'operation-type': 'correction-undo-transaction',
                  'target-symbol': 'MAGAZYN'
                }
              })
            );
          }
        } else if (item.processType === 'corrected') {
          // Corrected items - they were restored to magazyn, need to remove them from magazyn
          removePromises.push(
            axios.delete(`/api/state/barcode/${item.barcode}/symbol/${magazynSymbol}?count=1`, {
              headers: {
                'operation-type': 'correction-undo-transaction',
                'target-symbol': item.originalSymbol || 'UNKNOWN'
              }
            })
          );
        }
      }
      
      // Wait for all items to be removed from their current locations
      if (removePromises.length > 0) {
        await Promise.all(removePromises);

      }
      
      // STEP 2: Now restore items to their original state
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
          // Green items: restore to current magazyn symbol (they were transferred from MAGAZYN then sold)
          targetSymbol = magazynSymbol;
          
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
          // Orange items: restore to current magazyn symbol
          targetSymbol = magazynSymbol;
          
          restoreData = {
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            symbol: targetSymbol,
            price: item.price,
            discount_price: item.discount_price,
            operationType: 'restore-transfer'
          };
        } else if (item.processType === 'corrected') {
          // Corrected items: don't restore, they were already removed above
          continue;
        }
        
        if (restoreData) {
          restorePromises.push(
            axios.post('/api/state/restore-silent', restoreData)
          );
        }
      }
      
      // Wait for all items to be restored
      if (restorePromises.length > 0) {
        await Promise.all(restorePromises);

      }
      
      // STEP 3: Now delete all history records associated with this transaction
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
      
      // STEP 4: Delete the transaction itself from transaction history
      await deactivateTransactionInDatabase(transaction.transactionId);
      
      // STEP 5: Refresh data to reflect the changes
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === magazynSymbol);
      setMagazynItems(magazynData);
      
      showNotification('Sukces!', `Transakcja z ${new Date(transaction.timestamp).toLocaleString('pl-PL')} została całkowicie anulowana i usunięta z historii!`, 'success');
      
    } catch (error) {
      console.error('Error undoing transaction:', error);
      showNotification('Błąd!', 'Błąd podczas anulowania transakcji. Spróbuj ponownie.', 'error');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Function to undo/cancel single item from transaction
  const handleUndoSingleItem = async (transaction, itemToUndo) => {
    if (!transaction || !itemToUndo || isTransactionInProgress) return;
    
    const confirmMessage = `Czy na pewno chcesz anulować ten element?\n\n` +
      `Element: ${itemToUndo.fullName} (${itemToUndo.size})\n` +
      `Typ operacji: ${
        itemToUndo.processType === 'sold' ? 'Sprzedano' :
        itemToUndo.processType === 'synchronized' ? 'Zsynchronizowano' :
        itemToUndo.processType === 'transferred' ? 'Przeniesiono' :
        'Nieznane'
      }\n\n` +
      `Ta operacja:\n` +
      `• Przywróci element do magazynu\n` +
      `• Zaktualizuje transakcję\n` +
      `• Stworzy rekord korekty\n` +
      `• Jest NIEODWRACALNA`;
    
    // Use modal confirmation instead of window.confirm
    showConfirmation(
      '⚠️ OSTRZEŻENIE! ⚠️',
      confirmMessage,
      () => {
        setShowConfirmModal(false);
        performUndoSingleItem(transaction, itemToUndo);
      },
      () => setShowConfirmModal(false),
      'Anuluj element',
      'Anuluj'
    );
  };

  // Actual implementation moved to separate function
  const performUndoSingleItem = async (transaction, itemToUndo) => {
    
    setIsTransactionInProgress(true);
    
    try {
      // STEP 1: First remove item from its current location to prevent duplication
      if (itemToUndo.processType === 'sold') {
        // Sold items - they were sold from a selling point, already gone through sale
        // Don't need to remove from anywhere
        
      } else if (itemToUndo.processType === 'synchronized') {
        // Synchronized items - they were transferred to selling point and then sold
        // Already gone through sale, don't need to remove from anywhere
        
      } else if (itemToUndo.processType === 'transferred') {
        // Transferred items - they are currently in the target selling point, need to remove them
        // For transferred items, the target is where they were moved TO, not FROM
        const targetSellingPointName = transaction.targetSellingPoint || transaction.selectedSellingPoint;
        
        // Convert selling point name to symbol using usersData
        let targetSymbol = null;
        if (targetSellingPointName) {
          const targetUser = usersData.find(user => user.sellingPoint === targetSellingPointName);
          targetSymbol = targetUser ? targetUser.symbol : targetSellingPointName; // Fallback to name if symbol not found
        }
        

        
        if (targetSymbol) {
          try {
            await axios.delete(`/api/state/barcode/${itemToUndo.barcode}/symbol/${targetSymbol}?count=1`, {
              headers: {
                'operation-type': 'correction-undo-single',
                'target-symbol': 'MAGAZYN'
              }
            });

          } catch (deleteError) {
            console.error(`❌ Failed to remove item from ${targetSymbol}:`, deleteError);

            throw deleteError; // Re-throw to handle in outer catch
          }
        } else {
          console.warn(`⚠️ No target symbol found for transferred item. Transaction data:`, transaction);
          // Continue without removing since we can't determine where the item is
        }
      }
      
      // STEP 2: Now restore the single item to its original state
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
        // Green items: restore to current magazyn symbol
        targetSymbol = magazynSymbol;
        
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
        // Orange items: restore to current magazyn symbol
        targetSymbol = magazynSymbol;
        
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
      
      // STEP 3: Create correction transaction for tracking
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
      
      // STEP 4: Update original transaction - remove the undone item
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
      
      // STEP 5: Delete specific history record for this item
      try {
        const deleteHistoryPayload = {
          transactionId: transaction.transactionId,
          itemDetails: {
            fullName: itemToUndo.fullName,
            size: itemToUndo.size,
            barcode: itemToUndo.barcode,
            processType: itemToUndo.processType,
            price: itemToUndo.price,
            originalSymbol: itemToUndo.originalSymbol,
            timestamp: transaction.timestamp // Add transaction timestamp for better matching
          }
        };
        

        
        await axios.post('/api/history/delete-single-item', deleteHistoryPayload);
        

        
      } catch (historyError) {
        console.error('Błąd podczas usuwania rekordu historii dla pojedynczego elementu:', historyError);
        // Don't fail the entire operation if history deletion fails
        console.warn('Historia nie została usunięta, ale element został przywrócony do magazynu');
      }
      
      // STEP 6: Refresh data to reflect the changes
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === magazynSymbol);
      setMagazynItems(magazynData);
      
      // Reload transaction history
      await loadTransactionHistory();
      
      showNotification(
        'Sukces!', 
        `Element "${itemToUndo.fullName} (${itemToUndo.size})" został anulowany i przywrócony do magazynu!\n\nUtworzono transakcję korekcyjną: ${correctionTransactionId}`, 
        'success'
      );
      
    } catch (error) {
      console.error('Error undoing single item:', error);
      showNotification('Błąd!', 'Błąd podczas anulowania elementu. Spróbuj ponownie.', 'error');
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
        processedSalesIds: new Set(),
        timestamp: null
      });
      
      // Clear transaction history in component state
      setTransactionHistory([]);
      
      // Reload transaction history from database (to get only remaining active transactions)
      await loadTransactionHistory();
      
      // Reset current states
      setFilteredSales([]);
      setManuallyAddedItems([]);
      setSynchronizedItems(new Set());
      setAddedMagazynIds(new Set());
      setSavedItemsForDisplay([]);
      setProcessedSalesIds(new Set()); // Clear processed sales IDs
      setIsTransactionSaved(false);
      
      setShowClearStorageInfo(false); // Close info modal
      alert('Pamięć podręczna i stare transakcje zostały wyczyszczone!');
    } catch (error) {
      alert('Błąd podczas czyszczenia pamięci. Spróbuj ponownie.');
    }
  };

  const handleClearStorageClick = () => {
    setShowClearStorageInfo(true);
  };

  // Handle show transaction report
  const handleShowTransactionReport = (transaction) => {
    setSelectedTransactionForReport(transaction);
    setShowTransactionReport(true);
  };

  // Handle expanding/collapsing transaction details
  const toggleTransactionDetails = (transactionId) => {
    setExpandedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const handleOperationTypeChange = (type) => {
    setOperationType(type);
    // Reset states when changing operation type
    setSynchronizedItems(new Set());
    setManuallyAddedItems([]);
    setAddedMagazynIds(new Set());
    setFilteredSales([]);
    setProcessedSalesIds(new Set()); // Clear processed sales IDs
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
          if (parsed.processedSalesIds) {
            setProcessedSalesIds(new Set(parsed.processedSalesIds));
          }
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
      processedSalesIds: Array.from(processedSalesIds),
      timestamp: Date.now()
    };
    
    localStorage.setItem('addToState_persistentView', JSON.stringify(stateToSave));
    setPersistentSalesView(stateToSave);
  }, [filteredSales, manuallyAddedItems, synchronizedItems, addedMagazynIds, processedSalesIds]);

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

  // Function to get the current magazyn symbol from users
  const getMagazynSymbol = async () => {
    try {
      const usersResponse = await axios.get('/api/user');
      const usersDataArray = Array.isArray(usersResponse.data.users) ? usersResponse.data.users : [];
      const magazynUser = usersDataArray.find(user => user.email === 'magazyn@wp.pl');
      if (magazynUser && magazynUser.symbol) {
        setMagazynSymbol(magazynUser.symbol);
        return magazynUser.symbol;
      }
      return 'MAGAZYN'; // Fallback to default
    } catch (error) {
      console.error('Error fetching magazyn symbol:', error);
      return 'MAGAZYN'; // Fallback to default
    }
  };

  // Initial fetch of magazyn symbol
  useEffect(() => {
    getMagazynSymbol();
  }, []);

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
              overflow: 'hidden',
              marginBottom: 0,
              backgroundColor: 'black',
              color: 'white',
              padding: '24px'
            }}>
              {/* Wyszukiwarka historii */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  className="history-search-input"
                  placeholder=" Wyszukaj po nazwie produktu, kodzie, dacie lub ID transakcji..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: 'black',
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
                    maxHeight: 'calc(90vh - 180px)', // Dopasowana wysokość
                    overflowY: 'auto', // Jeden suwak dla listy transakcji
                    paddingRight: '8px' // Miejsce na suwak
                  }}>
                  {getFilteredTransactionHistory().map((transaction, index) => (
                    <div
                      key={transaction.transactionId}
                      style={{
                        border: '1px solid #444',
                        borderRadius: '4px',
                        padding: '15px',
                        backgroundColor: 'black',
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
                          <strong style={{ color: transaction.isCorrection ? '#28a745' : 'white' }}>
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
                                backgroundColor: 'white', 
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
                              <div style={{ color: 'white', fontSize: '12px', marginTop: '2px' }}>
                                Ostatnia modyfikacja: {transaction.lastModified}
                              </div>
                            )}
                          </div>
                        </div>
                        {transaction.isCorrection ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleShowTransactionReport(transaction)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none'
                              }}
                              title="Pokaż raport korekty"
                            >
                              Raport korekty
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => toggleTransactionDetails(transaction.transactionId)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: expandedTransactions.has(transaction.transactionId) ? '#28a745' : '#6c757d',
                                color: 'white',
                                border: 'none'
                              }}
                              title={expandedTransactions.has(transaction.transactionId) ? "Ukryj szczegóły" : "Pokaż szczegóły"}
                            >
                              {expandedTransactions.has(transaction.transactionId) ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
                            </button>
                            <button
                              onClick={() => handleShowTransactionReport(transaction)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: '#0d6efd',
                                color: 'white',
                                border: 'none'
                              }}
                              title="Pokaż raport transakcji"
                            >
                              Raport
                            </button>
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
                          </div>
                        )}
                      </div>
                      {expandedTransactions.has(transaction.transactionId) && transaction.processedItems && transaction.processedItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'white' }}>
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
                <button
                  onClick={handleDeleteAllHistory}
                  className="btn btn-sm"
                  disabled={isTransactionInProgress || transactionHistory.length === 0}
                  style={{
                    backgroundColor: '#dc3545',
                    border: 'none',
                    color: 'white',
                    opacity: (isTransactionInProgress || transactionHistory.length === 0) ? 0.6 : 1,
                    cursor: (isTransactionInProgress || transactionHistory.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                  title={transactionHistory.length === 0 ? "Brak historii do usunięcia" : "Usuń całą historię transakcji - NIEODWRACALNE!"}
                >
                  {isTransactionInProgress ? 'Usuwanie...' : 'Usuń całą historię'}
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
              <span style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}> Informacja o czyszczeniu pamięci</span>
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
                <h4 style={{ color: 'white', marginBottom: '15px' }}>Co zostanie wyczyszczone:</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    🗄️ <strong>Pamięć podręczna aplikacji</strong> - zapisane stany transakcji
                  </li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    <strong>Stare transakcje z bazy danych</strong> - historia starszych operacji
                  </li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                    <strong>Aktualnie wyświetlane dane</strong> - zostanie odświeżone
                  </li>
                  <li style={{ padding: '8px 0' }}>
                    <strong>Lokalne ustawienia</strong> - zapisane filtry i preferencje
                  </li>
                </ul>
              </div>
              <div style={{ backgroundColor: 'black', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #444' }}>
                <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>⚠️ Uwaga:</p>
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

      {/* Transaction Report Modal */}
      <TransactionReportModal
        showReportModal={showTransactionReport}
        setShowReportModal={setShowTransactionReport}
        transaction={selectedTransactionForReport}
        usersData={usersData}
      />

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
          <div style={{ marginBottom: '20px', marginTop: '90px' }}>
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
                boxSizing: 'border-box',
                marginBottom: '70px'
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
               Historia ({transactionHistory.length})
            </button>
          </div>
          
          {/* Print controls */}
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={checkPrinter}
              className="btn btn-secondary"
              style={{ height: 'fit-content', marginRight: '5px' }}
            >
               Sprawdź drukarkę
            </button>
          </div>
          
          <div style={{ width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
            <button 
              onClick={printSelectedBarcodes}
              className="btn btn-warning"
              style={{ height: 'fit-content' }}
              disabled={!printer || selectedForPrint.size === 0}
            >
               Drukuj zaznaczone ({selectedForPrint.size})
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
    
    {/* Notification Modal */}
    {showNotificationModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'black',
          borderRadius: '8px',
          border: '2px solid white',
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
            backgroundColor: 
              notificationModal.type === 'success' ? '#0d6efd' :
              notificationModal.type === 'error' ? '#dc3545' :
              notificationModal.type === 'warning' ? '#ffc107' :
              '#17a2b8',
            color: 'white',
            fontWeight: 600
          }}>
            <span style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
              {notificationModal.title}
            </span>
            <button
              onClick={() => setShowNotificationModal(false)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
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
            <div style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {notificationModal.message}
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid white',
            backgroundColor: 'black',
            color: 'white'
          }}>
            <button
              onClick={() => setShowNotificationModal(false)}
              className="btn btn-sm"
              style={{
                backgroundColor: 
                  notificationModal.type === 'success' ? '#0d6efd' :
                  notificationModal.type === 'error' ? '#dc3545' :
                  notificationModal.type === 'warning' ? '#ffc107' :
                  '#17a2b8',
                border: 'none',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '4px'
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Confirmation Modal */}
    {showConfirmModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}>
        <div style={{
          backgroundColor: 'black',
          border: '2px solid #0d6efd',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: '#0d6efd',
            color: 'white',
            padding: '16px 24px',
            fontWeight: 'bold',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            {confirmModal.title}
          </div>
          <div style={{
            padding: '24px',
            color: 'white',
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
            textAlign: 'center'
          }}>
            {confirmModal.message}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            padding: '16px 24px',
            borderTop: '1px solid #555',
            backgroundColor: 'black'
          }}>
            <button
              onClick={confirmModal.onCancel}
              className="btn btn-sm"
              style={{
                backgroundColor: '#6c757d',
                border: 'none',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '4px'
              }}
            >
              {confirmModal.cancelText}
            </button>
            <button
              onClick={confirmModal.onConfirm}
              className="btn btn-sm"
              style={{
                backgroundColor: '#dc3545',
                border: 'none',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              {confirmModal.confirmText}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default AddToState;