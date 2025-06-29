import { useState, useEffect } from 'react';
import axios from 'axios';
import { generateTransactionId, getUserSymbol } from './utils';

export const useAddToStateLogic = () => {
  // State management
  const [magazynItems, setMagazynItems] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
  const [sellingPoints, setSellingPoints] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synchronizedItems, setSynchronizedItems] = useState(new Set());
  const [manuallyAddedItems, setManuallyAddedItems] = useState([]);
  const [addedMagazynIds, setAddedMagazynIds] = useState(new Set());
  const [operationType, setOperationType] = useState('sprzedaz');
  const [targetSellingPoint, setTargetSellingPoint] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  const [magazynSearchTerm, setMagazynSearchTerm] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showClearStorageInfo, setShowClearStorageInfo] = useState(false);
  const [isTransactionSaved, setIsTransactionSaved] = useState(false);
  const [savedItemsForDisplay, setSavedItemsForDisplay] = useState([]);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [isGeneratingBalance, setIsGeneratingBalance] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load all required data in parallel
        const [salesResponse, stateResponse, usersResponse] = await Promise.all([
          axios.get('/api/sales/get-all-sales'),
          axios.get('/api/state'),
          axios.get('/api/users')
        ]);

        setSalesData(salesResponse.data);
        
        const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
        setMagazynItems(magazynData);
        
        setUsersData(usersResponse.data);
        
        // Extract unique selling points
        const uniquePoints = [...new Set(stateResponse.data.map(item => item.symbol))];
        const pointsWithoutMagazyn = uniquePoints.filter(point => point !== 'MAGAZYN').sort();
        setSellingPoints(pointsWithoutMagazyn);
        
        // Set default selling point
        if (pointsWithoutMagazyn.length > 0) {
          setSelectedSellingPoint(pointsWithoutMagazyn[0]);
          setTargetSellingPoint(pointsWithoutMagazyn[0]);
        }
        
        // Load transaction history
        await loadTransactionHistory();
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Błąd podczas ładowania danych');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Filter sales by date and selling point
  useEffect(() => {
    if (!salesData || salesData.length === 0) {
      setFilteredSales([]);
      return;
    }

    const filtered = salesData.filter(item => {
      if (!selectedDate) return false;
      
      const itemDate = new Date(item.date);
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      
      const isDateMatch = itemDateOnly.getTime() === selectedDateOnly.getTime();
      
      if (operationType === 'sprzedaz') {
        const userSymbol = getUserSymbol(usersData, item.username);
        return isDateMatch && userSymbol === selectedSellingPoint;
      } else {
        return isDateMatch;
      }
    });

    setFilteredSales(filtered);
  }, [salesData, selectedDate, selectedSellingPoint, operationType, usersData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load transaction history from database
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

  // Save transaction to database
  const saveTransactionToDatabase = async (transactionDetails) => {
    try {
      await axios.post('/api/transaction-history', transactionDetails);
      await loadTransactionHistory();
    } catch (error) {
      console.error('Error saving transaction to database:', error);
      throw error;
    }
  };

  // Deactivate transaction in database
  const deactivateTransactionInDatabase = async (transactionId) => {
    try {
      await axios.delete(`/api/transaction-history/${transactionId}`);
      await loadTransactionHistory();
    } catch (error) {
      console.error('Error deactivating transaction in database:', error);
      throw error;
    }
  };

  // Handle operation type change
  const handleOperationTypeChange = (type) => {
    setOperationType(type);
    setSynchronizedItems(new Set());
    setManuallyAddedItems([]);
    setAddedMagazynIds(new Set());
    setSelectedSellingPoint('');
    
    if (type === 'przepisanie' && sellingPoints.length > 0) {
      setTargetSellingPoint(sellingPoints[0]);
    } else {
      setTargetSellingPoint('');
    }
    
    if (type === 'sprzedaz' && sellingPoints.length > 0) {
      setSelectedSellingPoint(sellingPoints[0]);
    }
  };

  // Toggle item synchronization
  const toggleItemSynchronization = (itemId) => {
    const newSynchronizedItems = new Set(synchronizedItems);
    if (newSynchronizedItems.has(itemId)) {
      newSynchronizedItems.delete(itemId);
    } else {
      newSynchronizedItems.add(itemId);
    }
    setSynchronizedItems(newSynchronizedItems);
  };

  // Add item from magazyn
  const addItemFromMagazyn = (item) => {
    if (!addedMagazynIds.has(item._id)) {
      setManuallyAddedItems(prev => [...prev, item]);
      setAddedMagazynIds(prev => new Set([...prev, item._id]));
    }
  };

  // Remove manually added item
  const removeManuallyAddedItem = (itemId) => {
    setManuallyAddedItems(prev => prev.filter(item => item._id !== itemId));
    setAddedMagazynIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  return {
    // State
    magazynItems,
    salesData,
    filteredSales,
    selectedDate,
    selectedSellingPoint,
    sellingPoints,
    usersData,
    loading,
    error,
    synchronizedItems,
    manuallyAddedItems,
    addedMagazynIds,
    operationType,
    targetSellingPoint,
    isMobile,
    isTransactionInProgress,
    magazynSearchTerm,
    transactionHistory,
    showHistoryModal,
    showClearStorageInfo,
    isTransactionSaved,
    savedItemsForDisplay,
    showBalanceModal,
    balanceData,
    isGeneratingBalance,
    historySearchTerm,
    expandedTransactions,
    
    // Setters
    setMagazynItems,
    setSalesData,
    setFilteredSales,
    setSelectedDate,
    setSelectedSellingPoint,
    setTargetSellingPoint,
    setOperationType,
    setSynchronizedItems,
    setManuallyAddedItems,
    setAddedMagazynIds,
    setIsTransactionInProgress,
    setMagazynSearchTerm,
    setShowHistoryModal,
    setShowClearStorageInfo,
    setIsTransactionSaved,
    setSavedItemsForDisplay,
    setShowBalanceModal,
    setBalanceData,
    setIsGeneratingBalance,
    setHistorySearchTerm,
    setExpandedTransactions,
    
    // Functions
    handleOperationTypeChange,
    toggleItemSynchronization,
    addItemFromMagazyn,
    removeManuallyAddedItem,
    loadTransactionHistory,
    saveTransactionToDatabase,
    deactivateTransactionInDatabase
  };
};
