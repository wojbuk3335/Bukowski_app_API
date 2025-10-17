import React, { useState, useEffect } from 'react';

const AddToState = ({ onAdd }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  // Ustawienie dzisiejszej daty jako domyślnej
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  };
  
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [canUndoTransaction, setCanUndoTransaction] = useState(false);
  
  // Nowe stany dla magazynu
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [filteredWarehouseItems, setFilteredWarehouseItems] = useState([]);

  // Stan dla sprzedaży
  const [sales, setSales] = useState([]);
  
  // Stan do śledzenia przetworzonych sprzedaży (po ID)
  const [processedSales, setProcessedSales] = useState(new Set());
  
  // Stan do śledzenia przetworzonych transferów (po ID) 
  const [processedTransfers, setProcessedTransfers] = useState(new Set());
  
  // Stan dla wszystkich stanów (do sprawdzania czy przedmiot jeszcze istnieje)
  const [allStates, setAllStates] = useState([]);

  // NOWE STANY dla synchronizacji jeden-do-jednego
  const [matchedPairs, setMatchedPairs] = useState([]); // Sparowane pary
  const [greyedWarehouseItems, setGreyedWarehouseItems] = useState(new Set()); // Wyszarzone elementy magazynu
  const [message, setMessage] = useState(''); // Komunikaty synchronizacji
  const [combinedItems, setCombinedItems] = useState([]); // Elementy łącznie z żółtymi produktami

  // Stan dla statusów dostępności
  const [availabilityStatuses, setAvailabilityStatuses] = useState([]);

  // Stan dla automatycznego przenoszenia (żeby się nie powtarzało)
  const [hasAutoMovedForUser, setHasAutoMovedForUser] = useState(null);
  
  // Stan do śledzenia już przeniesionych produktów z magazynu (żeby nie przenosić duplikatów)
  const [autoMovedProducts, setAutoMovedProducts] = useState(new Set());
  
  // Stan dla statusu przetwarzania
  const [processingStatus, setProcessingStatus] = useState(null);

  // Funkcja sprawdzania statusu przetwarzania
  const checkProcessingStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/api/state/processing-status?date=${today}`);
      const data = await response.json();
      setProcessingStatus(data);
    } catch (error) {
      console.error('❌ [AddToState] Error checking processing status:', error);
      setProcessingStatus(null);
    }
  };

  // Stan dla cenników punktów sprzedaży
  const [priceList, setPriceList] = useState(null);
  const [priceListLoading, setPriceListLoading] = useState(false);

  // Stan dla spinnera podczas automatycznego przenoszenia
  const [isAutoMoving, setIsAutoMoving] = useState(false);

  // Stan do śledzenia skorygowanych transakcji (żeby ukryć przycisk anulowania)
  const [correctedTransactionIds, setCorrectedTransactionIds] = useState(new Set());

  // Stan dla modala potwierdzenia drukowania
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [pendingProcessItems, setPendingProcessItems] = useState(null);

  // Stan do śledzenia czy przycisk cofania ma być widoczny
  const [showUndoButton, setShowUndoButton] = useState(false);

  // Funkcja do oznaczania transakcji jako skorygowanej
  const markTransactionAsCorrected = (transactionId) => {
    setCorrectedTransactionIds(prev => new Set([...prev, transactionId]));
  };

  // Event listener dla korekt z innych komponentów + localStorage check
  useEffect(() => {
    // Check processing status on mount
    checkProcessingStatus();
    
    // Auto refresh processing status every 30 seconds
    const processingInterval = setInterval(checkProcessingStatus, 30000);
    
    // Check localStorage for corrected transactions on mount
    const checkCorrectedTransactions = () => {
      try {
        const stored = localStorage.getItem('correctedTransactionIds');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids) && ids.length > 0) {
            setCorrectedTransactionIds(new Set(ids));
          }
        }
      } catch (error) {
        console.error('Error reading corrected transactions from localStorage:', error);
      }
    };

    const handleTransactionCorrected = (event) => {
      console.log('🔔 Received transactionCorrected event:', event.detail);
      const { transactionId } = event.detail;
      if (transactionId) {
        console.log(`📝 Marking transaction ${transactionId} as corrected`);
        
        // Use functional update to avoid stale closure
        setCorrectedTransactionIds(prevIds => {
          const newIds = new Set([...prevIds, transactionId]);
          const idsArray = Array.from(newIds);
          console.log('📋 Updated correctedTransactionIds:', idsArray);
          
          // Save to localStorage
          try {
            localStorage.setItem('correctedTransactionIds', JSON.stringify(idsArray));
            console.log('💾 Saved corrected transactions to localStorage');
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
          
          return newIds;
        });
      }
    };

    checkCorrectedTransactions(); // Check on mount
    window.addEventListener('transactionCorrected', handleTransactionCorrected);
    
    return () => {
      window.removeEventListener('transactionCorrected', handleTransactionCorrected);
      clearInterval(processingInterval); // Cleanup interval
    };
  }, []); // Empty dependency array to avoid re-creating listener

  // Funkcje pomocnicze dla synchronizacji
  const isProductMatched = (productId, type) => {
    const matched = matchedPairs.some(pair => 
      pair.blueProduct.id === productId && pair.blueProduct.type === type
    );

    return matched;
  };

  const isWarehouseItemGreyed = (warehouseItemId) => {
    const isGreyed = greyedWarehouseItems.has(warehouseItemId);
    
    // Debugging dla Laura RUDY XS
    if (warehouseItemId && (warehouseItemId.includes('Laura') || warehouseItemId.length > 10)) {

    }
    
    return isGreyed;
  };

  const getBackgroundColor = (item, fromWarehouse, isFromSale, isIncomingTransfer) => {
    // Sprawdź czy jest sparowany (niebieski → zielony)
    const matchedAsSale = isFromSale && isProductMatched(item._id, 'sale');
    const matchedAsTransfer = !fromWarehouse && isProductMatched(item._id, 'transfer');

    if (matchedAsSale || matchedAsTransfer) {

      return '#28a745'; // ZIELONY - sparowany
    }
    
    // NOWY: Żółty kolor dla transferów przychodzących
    if (isIncomingTransfer) {

      return '#ffc107'; // ŻÓŁTY - transfer przychodzący do punktu
    }
    
    // Standardowe kolory
    if (isFromSale) {

      return '#007bff'; // Niebieski - sprzedaż
    } else if (fromWarehouse) {

      return '#ff8c00'; // Pomarańczowy - transfer z magazynu
    } else {

      return '#007bff'; // Niebieski - transfer zwykły
    }
  };

  // Funkcja sprawdzania dostępności produktów 1:1
  const checkAvailability = (filteredItemsToCheck) => {
    if (!selectedUser || !filteredItemsToCheck || filteredItemsToCheck.length === 0) {
      return [];
    }

    // Znajdź dane wybranego użytkownika
    const selectedUserData = users.find(user => user._id === selectedUser);
    if (!selectedUserData) {
      return filteredItemsToCheck.map(() => 'Błąd użytkownika');
    }

    // Pobierz stan wybranego użytkownika z allStates
    const userState = allStates.filter(item => item.symbol === selectedUserData.symbol);
    
    // Stwórz kopie stanów do "zużywania" (bez modyfikowania oryginałów)
    let availableUserItems = [...userState];
    let availableWarehouseItems = [...warehouseItems];

    // Sprawdź dostępność dla każdego elementu
    return filteredItemsToCheck.map(item => {
      // Pobierz właściwe nazwy i rozmiary
      let itemFullName, itemSize;
      
      if (item.isFromSale) {
        // Dla sprzedaży - dane są stringami
        itemFullName = item.fullName;
        itemSize = item.size;
      } else {
        // Dla transferów - mogą być obiektami lub stringami
        itemFullName = typeof item.fullName === 'object' 
          ? item.fullName?.fullName 
          : item.fullName;
        itemSize = typeof item.size === 'object' 
          ? item.size?.Roz_Opis 
          : item.size;
      }

      // Sprawdź w stanie użytkownika
      const userItemIndex = availableUserItems.findIndex(stateItem => {
        // W stanie użytkownika mogą być dane jako stringi bezpośrednio lub w obiektach
        const userFullName = stateItem.fullName?.fullName || stateItem.fullName;
        const userSize = stateItem.size?.Roz_Opis || stateItem.size;
        
        return userFullName === itemFullName && userSize === itemSize;
      });

      // Sprawdź w magazynie
      const warehouseItemIndex = availableWarehouseItems.findIndex(warehouseItem => 
        warehouseItem.fullName?.fullName === itemFullName && 
        warehouseItem.size?.Roz_Opis === itemSize
      );

      let status;
      
      if (userItemIndex >= 0 && warehouseItemIndex >= 0) {
        // Jest w obu miejscach
        status = 'OK';
        // Usuń z dostępnych (zużyj)
        availableUserItems.splice(userItemIndex, 1);
        availableWarehouseItems.splice(warehouseItemIndex, 1);
      } else if (userItemIndex >= 0 && warehouseItemIndex < 0) {
        // Jest u użytkownika, nie ma w magazynie
        status = 'Brak w magazynie';
        // Usuń z dostępnych u użytkownika
        availableUserItems.splice(userItemIndex, 1);
      } else if (userItemIndex < 0 && warehouseItemIndex >= 0) {
        // Nie ma u użytkownika, jest w magazynie
        status = 'Brak w wybranym punkcie';
        // Usuń z dostępnych w magazynie
        availableWarehouseItems.splice(warehouseItemIndex, 1);
      } else {
        // Nie ma nigdzie
        status = 'Brak w magazynie i brak w wybranym punkcie';
      }

      return status;
    });
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user`);
      const data = await response.json();
      
      // Filtruj użytkowników - usuń admin, magazyn i dom
      const filteredUsers = (data.users || []).filter(user => {
        const symbol = user.symbol?.toLowerCase();
        return symbol !== 'admin' && symbol !== 'magazyn' && symbol !== 'dom';
      });
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch transfers from API
  const fetchTransfers = async () => {
    try {

      const response = await fetch(`${API_BASE_URL}/api/transfer`);
      const data = await response.json();

      setTransfers(data || []);

    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  // Fetch warehouse items from API
  const fetchWarehouseItems = async () => {
    try {

      const response = await fetch(`${API_BASE_URL}/api/state/warehouse`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const warehouseProducts = await response.json();

      setWarehouseItems(warehouseProducts);
      setFilteredWarehouseItems(warehouseProducts);
    } catch (error) {
      console.error('Error fetching warehouse items:', error);
    }
  };

  // Fetch price list for selected user's selling point
  const fetchPriceList = async (sellingPointId) => {
    if (!sellingPointId) {
      setPriceList(null);
      return;
    }

    setPriceListLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pricelists/${sellingPointId}`);
      if (response.ok) {
        const data = await response.json();
        // Struktura: { priceList: [items] } -> przekształć na { items: [items] }
        const priceListData = {
          items: data.priceList || [],
          sellingPointId: sellingPointId
        };
        setPriceList(priceListData);
      } else if (response.status === 404) {
        setPriceList(null);
      } else {
        console.error('Failed to fetch price list');
        setPriceList(null);
      }
    } catch (error) {
      console.error('Error fetching price list:', error);
      setPriceList(null);
    } finally {
      setPriceListLoading(false);
    }
  };

  // Get price info from price list with all available prices
  const getPriceFromPriceList = (item, itemSize) => {
    if (!priceList || !priceList.items) {
      return null;
    }

    // Find matching item in price list by barcode or name/category combination
    const priceListItem = priceList.items.find(priceItem => {
      // Match by barcode if available
      if (item.barcode && priceItem.code === item.barcode) {
        return true;
      }
      
      // Match by name and category if no barcode match
      const itemFullName = typeof item.fullName === 'object' 
        ? item.fullName?.fullName 
        : item.fullName;
      
      // If names match exactly, don't require category match (in case category is missing)
      if (priceItem.fullName === itemFullName) {
        return true;
      }
      
      // Otherwise require both name and category match
      return priceItem.fullName === itemFullName && 
             priceItem.category === item.category;
    });

    if (!priceListItem) {
      return null;
    }

    const result = {
      regularPrice: priceListItem.price || 0,
      discountPrice: priceListItem.discountPrice || 0,
      sizeExceptionPrice: null,
      hasDiscount: priceListItem.discountPrice && priceListItem.discountPrice > 0
    };

    // Check for size-specific exceptions
    if (itemSize && priceListItem.priceExceptions && priceListItem.priceExceptions.length > 0) {
      const sizeException = priceListItem.priceExceptions.find(exception => {
        const exceptionSizeName = exception.size?.Roz_Opis || exception.size;
        return exceptionSizeName === itemSize;
      });
      
      if (sizeException) {
        result.sizeExceptionPrice = sizeException.value;
      }
    }

    return result;
  };

  // Fetch sales from API
  const fetchSales = async () => {
    try {

      const response = await fetch(`${API_BASE_URL}/api/sales/get-all-sales`);
      const data = await response.json();
      setSales(data || []);

    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  // Fetch all states from API (for checking if sold items still exist)
  const fetchAllStates = async () => {
    try {

      const response = await fetch(`${API_BASE_URL}/api/state`);
      const data = await response.json();
      setAllStates(data || []);

    } catch (error) {
      console.error('Error fetching all states:', error);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchUsers();
    fetchTransfers();
    fetchWarehouseItems();
    fetchSales();
    fetchAllStates();
    checkLastTransaction();
  }, []);

    // Refresh data when user selection changes
  useEffect(() => {
    if (selectedUser) {

      setProcessedSales(new Set()); // Reset przetworzonych sprzedaży
      setProcessedTransfers(new Set()); // Reset przetworzonych transferów
      fetchTransfers();
      fetchWarehouseItems();
      fetchSales(); // Dodaj odświeżanie sprzedaży
      fetchAllStates(); // Dodaj odświeżanie wszystkich stanów
      checkLastTransaction();

      // Pobierz cennik dla wybranego punktu sprzedaży
      const selectedUserData = users.find(user => user._id === selectedUser);
      if (selectedUserData && selectedUserData.sellingPoint) {
        // Użyj _id użytkownika jako sellingPointId dla API cenników
        fetchPriceList(selectedUserData._id);
      } else {
        setPriceList(null);
      }
    }
  }, [selectedUser, users]);

  // Refresh data when date selection changes
  useEffect(() => {
    if (selectedDate) {

      setProcessedSales(new Set()); // Reset przetworzonych sprzedaży
      setProcessedTransfers(new Set()); // Reset przetworzonych transferów
      fetchTransfers();
      fetchWarehouseItems();
      fetchSales(); // Dodaj odświeżanie sprzedaży
      fetchAllStates(); // Dodaj odświeżanie wszystkich stanów
      checkLastTransaction();
    }
  }, [selectedDate]);

  // Function to check if there's a last transaction that can be undone
  const checkLastTransaction = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transfer/last-transaction`);
      if (response.ok) {
        const data = await response.json();
        setLastTransaction(data);
        setCanUndoTransaction(data.canUndo);
      } else if (response.status === 404) {
        // No recent transaction found - this is normal when starting fresh
        setLastTransaction(null);
        setCanUndoTransaction(false);
      } else {
        // Other HTTP errors
        setLastTransaction(null);
        setCanUndoTransaction(false);
      }
    } catch (error) {
      // Network or other errors - only log if it's not a 404
      if (error.name !== 'TypeError' || !error.message.includes('404')) {
        console.error('Error checking last transaction:', error);
      }
      setLastTransaction(null);
      setCanUndoTransaction(false);
    }
  };

  useEffect(() => {
    // Filter items based on selected date and user
    let filtered = Array.isArray(transfers) ? transfers : [];
    let salesItems = [];
    let yellowTransferItems = [];

    // Jeśli nie wybrano użytkownika, nie pokazuj żadnych transferów
    if (!selectedUser) {
      setFilteredItems([]);
      return;
    }

    // Filtruj transfery
    if (selectedDate) {
      filtered = filtered.filter(transfer => {
        const transferDate = new Date(transfer.date).toISOString().split('T')[0];
        return transferDate === selectedDate;
      });
    }

    if (selectedUser) {
      const selectedUserData = users.find(user => user._id === selectedUser);
      
      if (selectedUserData) {
        // Pokazuj transfery gdy:
        // 1. Wybrany użytkownik jest ŹRÓDŁEM transferu (transfer_from) - standardowe transfery
        // 2. Transfer pochodzi z magazynu (fromWarehouse = true) i ma odpowiedniego odbiorcy
        filtered = filtered.filter(transfer => {
          // Standardowe transfery - użytkownik jest źródłem
          const isStandardTransfer = transfer.transfer_from === selectedUserData.symbol;
          
          // Transfery z magazynu - użytkownik jest odbiorcą
          const isWarehouseTransfer = transfer.fromWarehouse && 
                                    transfer.transfer_to === selectedUserData.symbol;
          
          return isStandardTransfer || isWarehouseTransfer;
        });

        // WAŻNE: Filtruj przetworzonych transfery - pokazuj tylko nieprzetworzone
        filtered = filtered.filter(transfer => {
          // Sprawdź czy to niebieski transfer (użytkownik usuwa ze swojego stanu)
          const isBlueTransfer = transfer.transfer_from === selectedUserData.symbol;
          
          if (isBlueTransfer) {
            // Dla niebieskich transferów sprawdź blueProcessed
            const isBlueProcessed = transfer.blueProcessed || processedTransfers.has(transfer._id);
            return !isBlueProcessed; // Pokazuj tylko te które nie miały niebieskego przetworzenia
          } else {
            // Dla żółtych transferów sprawdź yellowProcessed
            const isYellowProcessed = transfer.yellowProcessed || processedTransfers.has(transfer._id);
            return !isYellowProcessed; // Pokazuj tylko te które nie miały żółtego przetworzenia
          }
        });

        let filteredSales = Array.isArray(sales) ? sales : [];
        
        if (selectedDate) {
          filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
            return saleDate === selectedDate;
          });
        }

        // Filtruj sprzedaże po 'from' - pokazuj tylko te ze stanu wybranego użytkownika
        filteredSales = filteredSales.filter(sale => {
          return sale.from === selectedUserData.symbol;
        });

        // NOWE: Filtruj sprzedaże - pokazuj tylko te, które nie zostały jeszcze przetworzone
        const salesWithItemsInState = filteredSales.filter(sale => {
          // Sprawdź czy jest już lokalnie oznaczona jako przetworzona
          const isLocallyProcessed = processedSales.has(sale._id);
          
          // POPRAWKA: Jeśli sale ma pole processed, użyj go zamiast sprawdzania states
          // To naprawia problem gdy states zostanie usunięte z bazy danych
          let isProcessed = isLocallyProcessed;
          
          // Jeśli sale ma pole processed, użyj go jako głównego kryterium
          if (sale.hasOwnProperty('processed')) {
            isProcessed = isLocallyProcessed || sale.processed;

          } else {
            // Fallback dla starych sales bez pola processed: sprawdź states
            const itemExistsInState = allStates.some(stateItem => 
              stateItem.barcode === sale.barcode && stateItem.symbol === sale.from
            );
            isProcessed = isLocallyProcessed || !itemExistsInState;

          }
          
          return !isProcessed; // Pokazuj tylko nieprzetworzone
        });

        // Przekształć sprzedaże na format podobny do transferów
        salesItems = salesWithItemsInState.map(sale => ({
          ...sale,
          isFromSale: true, // Oznacz jako sprzedaż
          transfer_from: sale.from,
          transfer_to: sale.sellingPoint,
          isBlueBullet: true, // Niebieska kulka
          date: sale.timestamp,
          // fullName i size pozostają jako stringi z obiektu sale
          // NIE tworzymy obiektów - sprzedaże już mają stringi
        }));

        // NOWE: Filtruj transfery PRZYCHODZĄCE do wybranego punktu (ŻÓŁTE)
        let incomingTransfers = Array.isArray(transfers) ? transfers : [];
        
        if (selectedDate) {
          incomingTransfers = incomingTransfers.filter(transfer => {
            const transferDate = new Date(transfer.date).toISOString().split('T')[0];
            return transferDate === selectedDate;
          });
        }

        // Pokazuj transfery które PRZYCHODZĄ do wybranego punktu
        incomingTransfers = incomingTransfers.filter(transfer => {
          // Transfer przychodzi do tego punktu (wybrany użytkownik jest odbiorcą)
          const isIncomingTransfer = transfer.transfer_to === selectedUserData.symbol && 
                                   !transfer.fromWarehouse; // Nie z magazynu (magazyn już ma pomarańczowy)
          
          return isIncomingTransfer;
        });

        // Filtruj transfery przychodzące które są gotowe do przetworzenia  
        incomingTransfers = incomingTransfers.filter(transfer => {
          // Dla żółtych transferów: pokaż tylko te które nie miały żółtego przetworzenia
          const isReadyForYellow = !transfer.yellowProcessed && !processedTransfers.has(transfer._id);
          
          return isReadyForYellow;
        });

        // Oznacz transfery przychodzące jako żółte
        yellowTransferItems = incomingTransfers.map(transfer => ({
          ...transfer,
          isIncomingTransfer: true, // Oznacz jako transfer przychodzący (żółty)
          isYellowBullet: true, // Żółta kulka
        }));

      }
    }

    // NOWA KOLEJNOŚĆ: Podziel filtered na niebieskie (standardowe) i pomarańczowe (z magazynu)
    const blueTransfers = filtered.filter(transfer => !transfer.fromWarehouse); // Standardowe transfery wychodzące
    const orangeTransfers = filtered.filter(transfer => transfer.fromWarehouse); // Transfery z magazynu
    
    // Połącz w właściwej kolejności: 
    // 1. 🔵 Niebieskie (sprzedaże + transfery wychodzące)
    // 2. 🟡 Żółte (transfery przychodzące) 
    // 3. 🟠 Pomarańczowe (transfery z magazynu)
    const combinedItemsData = [...salesItems, ...blueTransfers, ...yellowTransferItems, ...orangeTransfers];

    setFilteredItems(combinedItemsData);
    setCombinedItems(combinedItemsData); // Zapisz także jako oddzielny stan
    
    // Sprawdź dostępność dla wszystkich elementów
    const statuses = checkAvailability(combinedItemsData);
    setAvailabilityStatuses(statuses);
  }, [selectedDate, selectedUser, transfers, users, sales, allStates, processedSales, processedTransfers, warehouseItems]);
  
  // Osobny useEffect TYLKO dla automatycznego przenoszenia - uruchamia się po filtracji
  useEffect(() => {
    // Uruchom automatyczne przenoszenie jeśli potrzeba - przekaż aktualne dane
    // WAŻNE: Uruchom tylko raz dla każdego użytkownika
    if (selectedUser && hasAutoMovedForUser !== selectedUser && filteredItems.length > 0) {
      // Natychmiast ustaw flagę żeby zapobiec wielokrotnym uruchomieniom
      setHasAutoMovedForUser(selectedUser);
      // Uruchom z opóźnieniem żeby dać czas na stabilizację danych
      setTimeout(() => {
        autoMoveFromWarehouseForOKItems(filteredItems);
        setIsAutoMoving(false); // Ukryj spinner
      }, 200);
    } else if (selectedUser && filteredItems.length === 0) {
      // Jeśli nie ma żadnych danych do przetworzenia, ukryj spinner
      setTimeout(() => setIsAutoMoving(false), 500);
    } else if (selectedUser && hasAutoMovedForUser === selectedUser) {
      // Już przeniesiono dla tego użytkownika
      setIsAutoMoving(false);
    }
  }, [selectedUser, filteredItems.length, hasAutoMovedForUser]); // Tylko te dependencies!

  // useEffect do filtrowania produktów magazynowych
  useEffect(() => {
    if (!warehouseSearch.trim()) {
      setFilteredWarehouseItems(warehouseItems);
    } else {
      const searchTerm = warehouseSearch.toLowerCase();
      const filtered = warehouseItems.filter(item => {
        const fullName = item.fullName?.fullName?.toLowerCase() || '';
        const size = item.size?.Roz_Opis?.toLowerCase() || '';
        const barcode = item.barcode?.toLowerCase() || '';
        
        return fullName.includes(searchTerm) || 
               size.includes(searchTerm) || 
               barcode.includes(searchTerm);
      });
      setFilteredWarehouseItems(filtered);
    }
  }, [warehouseSearch, warehouseItems]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleUserChange = (e) => {
    const newUser = e.target.value;

    setSelectedUser(newUser);
    
    // Resetuj flagę automatycznego przenoszenia przy zmianie użytkownika
    setHasAutoMovedForUser(null);
    setAutoMovedProducts(new Set()); // Reset przeniesionych produktów
    
    // Zawsze odśwież dane, nawet jeśli wybrano tę samą wartość
    if (newUser) {
      setIsAutoMoving(true); // Pokaż spinner - będzie wyłączony w useEffect

      setProcessedSales(new Set());
      setProcessedTransfers(new Set());
      // Pozostaw automatyczne przenoszenie do useEffect
    }
  };

  // Funkcja automatycznego przenoszenia produktów ze statusem OK
  const autoMoveFromWarehouseForOKItems = (itemsToCheck = null) => {
    // Użyj przekazanych danych lub aktualnych state
    const itemsToProcess = itemsToCheck || filteredItems;
    
    if (!selectedUser || !itemsToProcess || !warehouseItems) {
      return;
    }
    
    // Znajdź dane wybranego użytkownika
    const selectedUserData = users.find(user => user._id === selectedUser);
    if (!selectedUserData) {
      return;
    }
    
    // FILTRUJ: Uwzględnij tylko niebieski transfery i sprzedaże, NIE żółte transfery
    const itemsForAutoMove = itemsToProcess.filter(item => {
      // Sprzedaże - zawsze uwzględnij
      if (item.isFromSale) {
        return true;
      }
      
      // Transfery - uwzględnij tylko niebieski (wychodzące z punktu)
      if (item.transfer_from && item.transfer_to) {
        const isBlueTransfer = item.transfer_from === selectedUserData.symbol;
        const isYellowTransfer = item.transfer_to === selectedUserData.symbol;
        
        // Uwzględnij tylko niebieski transfery (użytkownik jest źródłem transferu)
        return isBlueTransfer && !isYellowTransfer;
      }
      
      // Inne elementy - uwzględnij
      return true;
    });
    
    // Sprawdź dostępność tylko dla odfiltrowanych elementów
    const currentStatuses = checkAvailability(itemsForAutoMove);
    
    // Zbierz wszystkie elementy które mają status OK
    const itemsWithOKStatus = [];
    itemsForAutoMove.forEach((item, index) => {
      const status = currentStatuses[index];
      if (status === 'OK') {
        itemsWithOKStatus.push(item);
      }
    });


    if (itemsWithOKStatus.length === 0) {
      return;
    }

    // Dla każdego elementu ze statusem OK, przenieś JEDEN pasujący produkt z magazynu
    // WAŻNE: Każdy element OK = jedna sztuka z magazynu (nawet jeśli to ten sam produkt)
    let processedCount = 0;
    const processedWarehouseIds = new Set(); // Śledzenie już przeniesionych ID magazynowych
    
    itemsWithOKStatus.forEach((item, index) => {
      // Znajdź pasujący produkt w magazynie (który nie został jeszcze przeniesiony w tej sesji)
      const matchingWarehouseItem = warehouseItems.find(warehouseItem => {
        // Sprawdź czy ten konkretny element magazynowy nie został już przeniesiony
        if (processedWarehouseIds.has(warehouseItem._id)) {
          return false;
        }
        
        const itemFullName = item.fullName?.fullName || item.fullName;
        const warehouseFullName = warehouseItem.fullName?.fullName || warehouseItem.fullName;
        const itemBarcode = item.barcode || item.productId;
        const warehouseBarcode = warehouseItem.barcode;
        const itemSize = item.size?.Roz_Opis || item.size;
        const warehouseSize = warehouseItem.size?.Roz_Opis || warehouseItem.size;

        // POPRAWKA: Dla transferów (nie sprzedaży) porównuj tylko fullName i size
        // bo barcode może być MongoDB ID zamiast prawdziwego barcode
        let matches;
        if (item.isFromSale) {
          // Dla sprzedaży - porównuj fullName i barcode
          matches = itemFullName === warehouseFullName && itemBarcode === warehouseBarcode;
        } else {
          // Dla transferów - porównuj fullName i size
          matches = itemFullName === warehouseFullName && itemSize === warehouseSize;
        }
        
        return matches;
      });

      if (matchingWarehouseItem) {
        processedCount++;
        
        // Oznacz ten konkretny element magazynowy jako przeniesiony w tej sesji
        processedWarehouseIds.add(matchingWarehouseItem._id);
        
        // Sprawdź czy nie jest już wyszarzony/sparowany
        if (!isWarehouseItemGreyed(matchingWarehouseItem._id)) {
          // Przenieś automatycznie z magazynu NATYCHMIAST (bez setTimeout)
          handleMoveFromWarehouse(matchingWarehouseItem);
        } else {
        }
      } else {
      }
    });

  };

  const handleWarehouseSearchChange = (e) => {
    const searchValue = e.target.value;
    setWarehouseSearch(searchValue);
    
    if (searchValue === '') {
      setFilteredWarehouseItems(warehouseItems);
    } else {
      const filtered = warehouseItems.filter(item => {
        const name = item.fullName?.fullName?.toLowerCase() || '';
        const size = item.size?.Roz_Opis?.toLowerCase() || '';
        const barcode = item.barcode?.toLowerCase() || '';
        const search = searchValue.toLowerCase();
        
        return name.includes(search) || 
               size.includes(search) || 
               barcode.includes(search);
      });
      setFilteredWarehouseItems(filtered);
    }
  };

  // Funkcja przenoszenia produktu z magazynu do tabeli transferów
  const handleMoveFromWarehouse = (warehouseItem) => {

    if (!selectedUser) {
      alert('Najpierw wybierz użytkownika do którego chcesz przenieść produkt!');
      return;
    }
    
    // Znajdź dane wybranego użytkownika
    const selectedUserData = users.find(user => user._id === selectedUser);
    if (!selectedUserData) {
      alert('Błąd: nie można znaleźć danych wybranego użytkownika');
      return;
    }
    
    
    // Dodaj produkt do głównej listy transferów (items)
    const newTransferItem = {
      id: warehouseItem._id,
      date: new Date().toISOString(),
      fullName: warehouseItem.fullName?.fullName || 'Nieznana nazwa',
      size: warehouseItem.size?.Roz_Opis || 'Nieznany rozmiar',
      barcode: warehouseItem.barcode || 'Brak kodu',
      symbol: selectedUserData.symbol,
      price: warehouseItem.price || 0,
      fromWarehouse: true, // Flaga oznaczająca że pochodzi z magazynu (do kolorowania)
      _id: warehouseItem._id,
      transfer_from: 'MAGAZYN',
      transfer_to: selectedUserData.symbol, // Używaj symbolu, nie ID
      productId: warehouseItem.barcode,
      reason: 'Przeniesienie z magazynu'
    };
    
    setTransfers(prev => {
      const newTransfers = [...prev, newTransferItem];
      return newTransfers;
    });
    setFilteredItems(prev => {
      const newFiltered = [...prev, newTransferItem];
      return newFiltered;
    });
    
    
    // Usuń z listy magazynu (wizualnie)
    setFilteredWarehouseItems(prev => {
      const filtered = prev.filter(item => item._id !== warehouseItem._id);
      return filtered;
    });
    setWarehouseItems(prev => {
      const filtered = prev.filter(item => item._id !== warehouseItem._id);
      return filtered;
    });

  };

  // Funkcja cofania produktu z tabeli transferów z powrotem do magazynu
  const handleReturnToWarehouse = (transferItem) => {

    if (!transferItem.fromWarehouse) {
      alert('Można cofnąć tylko produkty przeniesione z magazynu!');
      return;
    }
    
    // Przywróć produkt do magazynu
    const warehouseItem = {
      _id: transferItem._id,
      fullName: {
        fullName: transferItem.fullName
      },
      size: {
        Roz_Opis: transferItem.size
      },
      barcode: transferItem.barcode,
      sellingPoint: {
        symbol: 'MAGAZYN'
      },
      price: transferItem.price,
      date: transferItem.date
    };
    
    setWarehouseItems(prev => [...prev, warehouseItem]);
    setFilteredWarehouseItems(prev => [...prev, warehouseItem]);
    
    // Usuń z listy transferów
    setTransfers(prev => prev.filter(item => item._id !== transferItem._id));
    setFilteredItems(prev => prev.filter(item => item._id !== transferItem._id));

  };

  // Funkcja sprawdzania braków w stanie i zapisywania korekt
  const checkForMissingItems = async (itemsToCheck, userSymbol, sellingPoint, transactionId = null) => {
    try {
      
      // Pobierz wszystkie stany
      const allStatesResponse = await fetch(`${API_BASE_URL}/api/state`);
      let currentState = await allStatesResponse.json();
      
      
      // Lista brakujących kurtek
      const missingItems = [];
      const availableItems = [];
      
      // NOWA LOGIKA: Sprawdzaj elementy JEDEN PO JEDNYM i symuluj odpisywanie
      itemsToCheck.forEach((item, index) => {
        
        let sourceSymbol = userSymbol; // Domyślnie sprawdzaj stan wybranego użytkownika
        
        // Dla transferów sprawdź stan punktu źródłowego (transfer_from)
        if (item.transfer_from && !item.isFromSale) {
          sourceSymbol = item.transfer_from;
        } else {
        }
        
        // Filtruj stan według właściwego symbolu
        const userStateItems = currentState.filter(stateItem => stateItem.symbol === sourceSymbol);
        
        const itemBarcode = item.barcode || item.productId;
        
        // Znajdź pasujący produkt w stanie
        const matchingStateItemIndex = userStateItems.findIndex(stateItem => 
          (stateItem.barcode === itemBarcode || stateItem.id === itemBarcode) &&
          stateItem.fullName === item.fullName &&
          stateItem.size === item.size
        );
        
        const foundInState = matchingStateItemIndex !== -1;
        
        if (foundInState) {
          availableItems.push(item);
          
          // SYMULUJ ODPISANIE: Usuń element ze stanu (aby następne sprawdzenia były realistyczne)
          const matchingStateItem = userStateItems[matchingStateItemIndex];
          const globalIndex = currentState.findIndex(stateItem => 
            stateItem === matchingStateItem
          );
          if (globalIndex !== -1) {
            currentState.splice(globalIndex, 1);
          }
          
        } else {
          
          const operationType = item.isFromSale ? 'SPRZEDAŻY' : 'TRANSFERU';
          const operationDetails = item.isFromSale 
            ? `sprzedaży za ${item.price || 'N/A'} PLN` 
            : `transferu z punktu ${sourceSymbol} do punktu ${item.transfer_to || sellingPoint}`;
          
          const detailedDescription = 
            `🚨 BRAK W STANIE: Element #${index + 1} - Próba odpisania kurtki "${item.fullName}" (${item.size}) ` +
            `z punktu "${sourceSymbol}" w ramach ${operationDetails}. ` +
            `Kurtka o kodzie ${item.barcode || item.productId} nie została znaleziona w aktualnym stanie punktu. ` +
            `Możliwe przyczyny: już sprzedana, przeniesiona, zagubiona lub błąd w ewidencji. ` +
            `Data wykrycia: ${new Date().toLocaleString('pl-PL')}.`;
          
          missingItems.push({
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode || item.productId,
            sellingPoint: sellingPoint,
            symbol: userSymbol,
            errorType: 'MISSING_IN_STATE',
            attemptedOperation: item.isFromSale ? 'SALE' : 'TRANSFER',
            description: detailedDescription,
            originalPrice: item.price,
            discountPrice: item.discount_price,
            transactionId: transactionId,
            elementIndex: index, // Dodaj indeks dla debugowania
            // NOWE: Zapisz oryginalne dane do przywrócenia
            originalData: {
              _id: item._id,
              fullName: item.fullName,
              size: item.size,
              barcode: item.barcode || item.productId,
              isFromSale: item.isFromSale,
              price: item.price,
              availability: item.availability,
              reason: item.reason,
              transfer_from: item.transfer_from || item.from,
              transfer_to: item.transfer_to,
              timestamp: item.timestamp,
              date: item.date
            }
          });
        }
      });
      
      // Jeśli są braki, zapisz je w tabeli korekt
      if (missingItems.length > 0) {

        const correctionsResponse = await fetch(`${API_BASE_URL}/api/corrections/multiple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(missingItems),
        });

        if (correctionsResponse.ok) {

          // Dla brakujących transferów: po prostu oznacz jako processed=true zamiast usuwać
          for (const missingItem of missingItems) {
            if (missingItem.originalData && missingItem.originalData._id && !missingItem.originalData.isFromSale) {
              try {
                
                const updateResponse = await fetch(`${API_BASE_URL}/api/transfer/${missingItem.originalData._id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    blueProcessed: true,
                    blueProcessedAt: new Date()
                  })
                });
                
                if (updateResponse.ok) {
                } else {
                  console.error(`❌ Błąd oznaczania transferu ${missingItem.originalData._id} jako przetworzony`);
                }
              } catch (error) {
                console.error(`❌ Błąd API dla transferu ${missingItem.originalData._id}:`, error);
              }
            }
            
            // Dla sprzedaży: usuń jak wcześniej
            if (missingItem.originalData && missingItem.originalData._id && missingItem.originalData.isFromSale) {
              try {
                
                const deleteResponse = await fetch(`${API_BASE_URL}/api/sales/delete-sale/${missingItem.originalData._id}`, {
                  method: 'DELETE'
                });
                
                if (deleteResponse.ok) {
                } else {
                  console.error(`❌ Failed to delete sale: ${missingItem.originalData._id}`);
                }
              } catch (deleteError) {
                console.error(`Error deleting sale ${missingItem.originalData._id}:`, deleteError);
              }
            }
          }
          
          // Pokaż modal z brakującymi kurtkami
          const missingItemsList = missingItems.map(item => 
            `• ${item.fullName} ${item.size} (${item.barcode})`
          ).join('\n');
          
          alert(`⚠️ UWAGA - WYKRYTO BRAKI W STANIE!\n\nNastępujące kurtki nie zostały znalezione w stanie punktu ${sellingPoint}:\n\n${missingItemsList}\n\n✅ Problemy zostały zapisane w tabeli Korekty do rozwiązania.\n🗑️ Nieistniejące pozycje zostały usunięte z listy.\n\n🔄 Operacja zostanie kontynuowana z dostępnymi kurtkami.`);
          
        } else {
          console.error('Failed to save corrections');
          const errorText = await correctionsResponse.text();
          console.error('Corrections error response:', errorText);
          
          // Pokaż komunikat o błędzie ale kontynuuj operację
          alert(`⚠️ UWAGA - WYKRYTO BRAKI ale wystąpił błąd zapisu!\n\nNastępujące kurtki nie zostały znalezione w stanie punktu ${sellingPoint}:\n\n${missingItems.map(item => `• ${item.fullName} ${item.size} (${item.barcode})`).join('\n')}\n\n❌ BŁĄD: Nie udało się zapisać problemów w tabeli Korekty!\n\n🔄 Operacja zostanie kontynuowana z dostępnymi kurtkami.`);
        }
      }
      
      
      // OZNACZ DOSTĘPNE TRANSFERY JAKO PRZETWORZONE W BAZIE DANYCH
      const availableTransfers = availableItems.filter(item => !item.isFromSale);
      if (availableTransfers.length > 0) {
        
        for (const transfer of availableTransfers) {
          try {
            const updateResponse = await fetch(`${API_BASE_URL}/api/transfer/${transfer._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blueProcessed: true,
                blueProcessedAt: new Date()
              })
            });
            
            if (updateResponse.ok) {
            } else {
              console.error(`❌ Błąd oznaczania transferu ${transfer._id} jako przetworzony`);
            }
          } catch (error) {
            console.error(`❌ Błąd API dla transferu ${transfer._id}:`, error);
          }
        }
      }
      
      return {
        availableItems,
        missingCount: missingItems.length
      };
      
    } catch (error) {
      console.error('Error checking for missing items:', error);
      return {
        availableItems: itemsToCheck,
        missingCount: 0
      };
    }
  };

  // Convert Polish characters to Latin equivalents for printing
  const convertPolishChars = (text) => {
    const polishToLatin = {
      'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    
    return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishToLatin[match] || match);
  };

  // Funkcja do generowania ZPL kodu dla drukarki Zebra
  const generateZPLCode = (item, customPrice = null) => {
    const itemName = item.isFromSale 
      ? item.fullName 
      : (typeof item.fullName === 'object' ? item.fullName?.fullName : item.fullName);
    const itemSize = item.isFromSale 
      ? item.size 
      : (typeof item.size === 'object' ? item.size?.Roz_Opis : item.size);
    const barcode = item.barcode || '';
    const transferTo = item.transfer_to || '';
    
    // Use custom price if provided, otherwise get from price list
    let finalPrice;
    
    if (customPrice !== null) {
      finalPrice = customPrice;
    } else {
      // Get price info from price list
      const priceInfo = getPriceFromPriceList(item, itemSize);
      
      if (priceInfo) {
        // Priority 1: Size exceptions override everything
        if (priceInfo.sizeExceptionPrice) {
          finalPrice = priceInfo.sizeExceptionPrice;
        } 
        // Priority 2: Discount price
        else if (priceInfo.hasDiscount) {
          finalPrice = priceInfo.discountPrice;
        }
        // Priority 3: Regular price
        else {
          finalPrice = priceInfo.regularPrice;
        }
      } else {
        // Fallback to original price
        finalPrice = item.price || item.cena || item.Cena || '';
      }
    }
    
    // Mapowanie punktów na numery
    const pointMapping = {
      'P': '01',
      'M': '02', 
      'K': '03',
      'T': '04',
      'S': '05',
      'Kar': '06'
    };
    const mappedPoint = pointMapping[transferTo] || transferTo;
    
    // ZPL kod dla etykiety 50mm x 30mm
    
    // Usuń polskie znaki które mogą powodować problemy i przetwórz nazwę
    let processedName = (itemName || 'N/A');
    // Usuń kolor z nazwy - znajdź tylko model (rozszerzona lista kolorów)
    processedName = processedName.replace(/\s*(czarny|czarna|czarne|biały|biała|białe|niebieski|niebieska|niebieskie|czerwony|czerwona|czerwone|zielony|zielona|zielone|żółty|żółta|żółte|szary|szara|szare|brązowy|brązowa|brązowe|różowy|różowa|różowe|fioletowy|fioletowa|fioletowe|pomarańczowy|pomarańczowa|pomarańczowe|kakao|beżowy|beżowa|beżowe|kremowy|kremowa|kremowe|granatowy|granatowa|granatowe|bordowy|bordowa|bordowe|khaki|oliwkowy|oliwkowa|oliwkowe|złoty|złota|złote|srebrny|srebrna|srebrne|miętowy|miętowa|miętowe)\s*/gi, '').trim();
    
    // Dodaj pozycje 4 i 5 z kodu kreskowego do nazwy
    const barcodeDigits = (barcode && barcode.length >= 5) ? barcode.substring(3, 5) : '';
    if (barcodeDigits) {
      processedName += ' ' + barcodeDigits;
    }
    
    const safeName = convertPolishChars(processedName);
    const safeSize = convertPolishChars(itemSize || 'N/A');
    const safeTransfer = convertPolishChars(mappedPoint || 'N/A');
    const safePrice = (finalPrice || 'N/A').toString().replace(/[^\x00-\x7F]/g, "?");
    
    // Prosty ZPL test - jesli to zadziala, problem jest w zlozonym formacie
    const simpleZPL = `^XA^FO50,50^A0N,50,50^FD${safeName}^FS^FO50,150^A0N,30,30^FD${safeSize}^FS^XZ`;
    
    // Format z większą szerokością - nazwa bez koloru, większy rozmiar, cena z marginesem
    const zplCode = `^XA
^MMT
^PW450
^LL0400
^LS0
^FT3,50^A0N,40,40^FD${safeName}^FS
^FT320,55^A0N,45,45^FDCena:^FS
^FT280,125^A0N,70,70^FD${safePrice} zl^FS

^FT3,120^A0N,38,38^FDRozmiar: ${safeSize}^FS
^FT3,150^A0N,25,25^FDPunkt: ${safeTransfer}^FS
^BY3,3,70^FT15,250^BCN,,N,N
^FD${barcode || 'NO-BARCODE'}^FS
^FT125,280^A0N,28,28^FB200,1,0,C,0^FD${barcode || 'NO-BARCODE'}^FS
^XZ`;
    
    // Wybierz prosty lub zlozony ZPL (zmien na simpleZPL jesli chcesz przetestowac)
    const finalZPL = zplCode;
    
    return finalZPL;
  };

  // Funkcja do wysyłania ZPL do drukarki Zebra przez Browser Print HTTP API
  const sendToZebraPrinter = async (zplCode) => {
    try {
      // Pobierz dostępne drukarki
      const availableResponse = await fetch('http://localhost:9100/available');
      if (!availableResponse.ok) {
        throw new Error('Browser Print nie jest dostępny');
      }
      
      const availableData = await availableResponse.json();
      if (!availableData.printer || availableData.printer.length === 0) {
        throw new Error('Brak dostępnych drukarek');
      }
      
      const printer = availableData.printer[0];
      
      // Wysłij ZPL przez Browser Print z kompletną strukturą device
      const deviceData = {
        device: {
          deviceType: printer.deviceType,
          uid: printer.uid,
          name: printer.name,
          connection: printer.connection,
          provider: printer.provider,
          version: printer.version,
          manufacturer: printer.manufacturer
        },
        data: zplCode
      };
      
      const printResponse = await fetch('http://localhost:9100/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData)
      });
      
      if (printResponse.ok) {
        const result = await printResponse.text();
        return true;
      } else {
        const errorText = await printResponse.text();
        console.error('❌ Browser Print błąd:', printResponse.status, errorText);
        throw new Error(`Browser Print error: ${printResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Błąd drukowania:', error.message);
      throw error;
    }
  };

  // Funkcje drukowania etykiet
  const handlePrintAllColoredLabels = async () => {
    if (!Array.isArray(filteredItems) || filteredItems.length === 0) {
      alert('Brak produktów do drukowania');
      return;
    }

    // Filtruj tylko pomarańczowe i żółte produkty (nie niebieskie)
    const coloredItems = filteredItems.filter(item => 
      item.fromWarehouse || // Pomarańczowe
      item.isIncomingTransfer // Żółte
    );

    if (coloredItems.length === 0) {
      alert('Brak pomarańczowych i żółtych produktów do drukowania');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    
    // Zbierz wszystkie ZPL kody
    let allZPLCodes = [];
    let totalLabelsCount = 0;
    
    for (let i = 0; i < coloredItems.length; i++) {
      const item = coloredItems[i];
      
      // Check if item has promotional pricing that requires two labels
      const itemSize = item.isFromSale 
        ? item.size 
        : (typeof item.size === 'object' ? item.size?.Roz_Opis : item.size);
      const priceInfo = getPriceFromPriceList(item, itemSize);
      
      const shouldPrintTwoLabels = priceInfo && priceInfo.hasDiscount && !priceInfo.sizeExceptionPrice;
      
      // DEBUG LOG
      try {
        if (shouldPrintTwoLabels) {
          // Generate two labels: regular price and discount price
          
          // Label 1: Regular price
          const regularZPL = generateZPLCode(item, priceInfo.regularPrice);
          allZPLCodes.push(regularZPL);
          totalLabelsCount++;
          
          // Label 2: Discount price
          const discountZPL = generateZPLCode(item, priceInfo.discountPrice);
          allZPLCodes.push(discountZPL);
          totalLabelsCount++;
        } else {
          // Generate single label with best price
          const zplCode = generateZPLCode(item);
          allZPLCodes.push(zplCode);
          totalLabelsCount++;
        }
      } catch (error) {
        console.error(`Błąd generowania ZPL dla etykiety ${i + 1}:`, error);
        errorCount++;
      }
    }
    
    // Wyślij wszystkie etykiety w jednym ZPL
    if (allZPLCodes.length > 0) {
      try {
        // Połącz wszystkie kody ZPL w jeden ciąg
        const combinedZPL = allZPLCodes.join('');
        
        const success = await sendToZebraPrinter(combinedZPL);
        
        if (success) {
          successCount = totalLabelsCount;
        } else {
          errorCount = totalLabelsCount;
        }
      } catch (error) {
        console.error('Błąd wysyłania połączonego ZPL:', error);
        errorCount = totalLabelsCount;
      }
    }
    
    // Podsumowanie
    
    if (successCount === 0 && errorCount > 0) {
      alert(`Nie udało się wydrukować żadnej etykiety.\nSprawdź czy drukarka Zebra jest podłączona i włączona.`);
    } else if (errorCount > 0) {
      alert(`Wydrukowano ${successCount} z ${coloredItems.length} etykiet.\n${errorCount} etykiet nie zostało wydrukowanych.`);
    }
  };

  // Funkcja obsługująca potwierdzenie drukowania etykiet
  const confirmPrintLabels = () => {
    if (pendingProcessItems) {
      executeProcessAllTransfers(pendingProcessItems);
    }
    setShowPrintConfirmModal(false);
    setPendingProcessItems(null);
  };

  // Funkcja obsługująca anulowanie drukowania
  const cancelPrintConfirmation = () => {
    setShowPrintConfirmModal(false);
    setPendingProcessItems(null);
  };

  // Funkcja do drukowania pojedynczej etykiety
  const handlePrintSingleLabel = async (transfer) => {
    try {
      const transferName = transfer.isFromSale ? 
        transfer.fullName : 
        (typeof transfer.fullName === 'object' ? 
          (transfer.fullName?.fullName || 'N/A') : 
          (transfer.fullName || 'N/A'));

      const transferSize = transfer.isFromSale ? 
        transfer.size : 
        (typeof transfer.size === 'object' ? 
          (transfer.size?.Roz_Opis || 'N/A') : 
          (transfer.size || 'N/A'));

      const transferBarcode = transfer.isFromSale ? 
        transfer.barcode : 
        transfer.productId;

      // Get price with priority: price list → original price → fallback
      let transferPrice = getPriceFromPriceList(transfer, transferSize);
      if (!transferPrice) {
        transferPrice = transfer.price || transfer.cena || transfer.Cena || 'N/A';
      }
      
      // Pobierz transfer_to (punkt docelowy)
      const transferTo = transfer.transfer_to || 'N/A';

      // Check if item has promotional pricing that requires two labels
      const priceInfo = getPriceFromPriceList(transfer, transferSize);
      const shouldPrintTwoLabels = priceInfo && priceInfo.hasDiscount && !priceInfo.sizeExceptionPrice;

      // Stwórz obiekt w formacie oczekiwanym przez generateZPLCode
      const labelData = {
        fullName: transferName,
        size: transferSize,
        barcode: transferBarcode || 'NO-BARCODE',
        price: transferPrice,
        cena: transferPrice,
        Cena: transferPrice,
        transfer_to: transferTo,
        fromWarehouse: transfer.fromWarehouse,
        isIncomingTransfer: transfer.isIncomingTransfer,
        isFromSale: transfer.isFromSale
      };

      if (shouldPrintTwoLabels) {
        // Print two labels: regular price and discount price
        
        // Label 1: Regular price
        const regularZPL = generateZPLCode(labelData, priceInfo.regularPrice);
        await sendToZebraPrinter(regularZPL);
        
        // Label 2: Discount price
        const discountZPL = generateZPLCode(labelData, priceInfo.discountPrice);
        await sendToZebraPrinter(discountZPL);
      } else {
        // Print single label with best price
        const zplCode = generateZPLCode(labelData);
        await sendToZebraPrinter(zplCode);
      }
      
    } catch (error) {
      console.error('❌ Błąd podczas drukowania pojedynczej etykiety:', error);
    }
  };

  const getColoredItemsCount = () => {
    if (!Array.isArray(filteredItems)) return 0;
    return filteredItems.filter(item => 
      item.fromWarehouse || item.isIncomingTransfer
    ).length;
  };

  const handleProcessAllTransfers = async () => {
    // Sprawdź czy mamy kombinowane elementy (zawierające żółte produkty)
    const itemsToProcess = combinedItems && combinedItems.length > 0 ? combinedItems : filteredItems;
    
    if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      alert('Brak transferów do przetworzenia');
      return;
    }

    // Zapisz elementy do przetworzenia i otwórz modal potwierdzenia drukowania
    setPendingProcessItems(itemsToProcess);
    setShowPrintConfirmModal(true);
  };

  // Nowa funkcja która faktycznie przetwarza elementy po potwierdzeniu
  const executeProcessAllTransfers = async (itemsToProcess) => {
    try {
      // Pokaż przycisk cofania po naciśnięciu "Zapisz"
      setShowUndoButton(true);
      
      // Rozdziel produkty według typu - DODANO obsługę ZIELONYCH i ŻÓŁTYCH produktów
      const warehouseItems = itemsToProcess.filter(item => item.fromWarehouse && !item.isFromSale && !isProductMatched(item._id, 'transfer'));
      
      // ŻÓŁTE produkty (transfery przychodzące) - wymagają dopisania do stanu
      const incomingTransfers = itemsToProcess.filter(item => item.isIncomingTransfer && !item.isFromSale);

      const greenStandardTransfers = itemsToProcess.filter(item => !item.fromWarehouse && !item.isFromSale && isProductMatched(item._id, 'transfer'));
      
      // ZIELONE sprzedaże (sparowane) - wymagają operacji podwójnej
      const greenSalesItems = itemsToProcess.filter(item => item.isFromSale && isProductMatched(item._id, 'sale'));
      
      const standardTransfers = itemsToProcess.filter(item => !item.fromWarehouse && !item.isFromSale && !isProductMatched(item._id, 'transfer') && !item.isIncomingTransfer);
      const salesItems = itemsToProcess.filter(item => item.isFromSale && !isProductMatched(item._id, 'sale'));

      // Wygeneruj wspólny transactionId dla całej operacji
      const sharedTransactionId = Date.now().toString() + 'x' + Math.random().toString(36).substr(2, 9);

      let processedCount = 0;

      // 🔵 KROK 1: NIEBIESKIE PRODUKTY - Transfery i sprzedaże (odpisanie ze stanu) - PIERWSZEŃSTWO!

      let validStandardTransfers = standardTransfers;
      let standardTransfersMissingCount = 0;
      
      if (standardTransfers.length > 0) {

        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        const checkResult = await checkForMissingItems(standardTransfers, userSymbol, sellingPoint, sharedTransactionId);
        validStandardTransfers = checkResult.availableItems;
        standardTransfersMissingCount = checkResult.missingCount;
        
        if (validStandardTransfers.length > 0) {
          const response = await fetch(`${API_BASE_URL}/api/transfer/process-all`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transfers: validStandardTransfers,
              selectedDate: selectedDate,
              selectedUser: selectedUser,
              transactionId: sharedTransactionId
            }),
          });

          if (response.ok) {
            const result = await response.json();
            processedCount += result.processedCount;
            
            
            // Oznacz TYLKO dostępne transfery jako przetworzone (te, które faktycznie zostały przetworzone)
            validStandardTransfers.forEach(transfer => {
              setProcessedTransfers(prev => new Set([...prev, transfer._id]));
            });

          } else {
            console.error('🔵 Error processing standard transfers');
          }
        }
      }

      // 1.2. Przetwórz sprzedaże - sprawdź braki w stanie przed odpisaniem
      let validSalesItems = salesItems;
      let salesMissingCount = 0;
      
      if (salesItems.length > 0) {

        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        const checkResult = await checkForMissingItems(salesItems, userSymbol, sellingPoint, sharedTransactionId);
        validSalesItems = checkResult.availableItems;
        salesMissingCount = checkResult.missingCount;
        
        if (validSalesItems.length > 0) {

          const salesResponse = await fetch(`${API_BASE_URL}/api/transfer/process-sales`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              salesItems: validSalesItems,
              selectedUser: selectedUser,
              transactionId: sharedTransactionId
            }),
          });

          if (salesResponse.ok) {
            const salesResult = await salesResponse.json();
            processedCount += salesResult.processedCount || validSalesItems.length;

            
            validSalesItems.forEach(sale => {
              setProcessedSales(prev => new Set([...prev, sale._id]));
            });
          } else {
            console.error('🔵 Failed to process sales items');
            const errorText = await salesResponse.text();
            console.error('🔵 Sales processing error:', errorText);
          }
        }
      }

      // 🟡 KROK 2: ŻÓŁTE PRODUKTY - Transfery przychodzące (dopisanie do stanu)
      if (warehouseItems.length > 0) {

        // NAPRAW: Dodaj transfer_to dla warehouse items przed wysłaniem do backend
        const selectedUserObject = users.find(user => user._id === selectedUser);
        const warehouseItemsWithTransferTo = warehouseItems.map(item => ({
          ...item,
          transfer_to: selectedUserObject?.symbol || selectedUserObject?.sellingPoint // Dodaj docelowego użytkownika
        }));

        const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseItems: warehouseItemsWithTransferTo,
            selectedDate: selectedDate,
            selectedUser: selectedUser,
            transactionId: sharedTransactionId // Przekaż wspólny transactionId
          }),
        });

        if (warehouseResponse.ok) {
          const warehouseResult = await warehouseResponse.json();
          processedCount += warehouseResult.processedCount || warehouseItems.length;

        } else {
          console.error('Failed to process warehouse items');
        }
      }

      // � 2. ŻÓŁTE PRODUKTY - Transfery przychodzące (dopisanie do stanu)
      if (incomingTransfers.length > 0) {

        const yellowAsWarehouse = incomingTransfers.map(transfer => ({
          ...transfer,
          fullName: transfer.fullName,
          size: transfer.size,
          transfer_to: users.find(user => user._id === selectedUser)?.symbol, // Cel transferu
        }));
        
        const yellowResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseItems: yellowAsWarehouse,
            selectedDate: selectedDate,
            selectedUser: selectedUser,
            transactionId: sharedTransactionId,
            isIncomingTransfer: true // Oznacz jako transfer przychodzący
          }),
        });

        if (yellowResponse.ok) {
          const yellowResult = await yellowResponse.json();
          processedCount += yellowResult.processedCount || incomingTransfers.length;

        } else {
          console.error('🟡 Failed to process yellow incoming transfers');
        }
      }

      // �🟢 3. ZIELONE PRODUKTY - Operacja podwójna (niebieski + pomarańczowy)
      let greenProcessedCount = 0;
      let greenMissingCount = 0;
      const allGreenItems = [...greenStandardTransfers, ...greenSalesItems];
      
      if (allGreenItems.length > 0) {

        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        // POPRAWIONA LOGIKA (sugestia użytkownika): Najpierw wszystkie blue operations, potem wszystkie orange operations

        for (let i = 0; i < allGreenItems.length; i++) {
          const greenItem = allGreenItems[i];

          try {
            // Sprawdź czy produkt istnieje w stanie przed odpisaniem
            const checkResult = await checkForMissingItems([greenItem], userSymbol, sellingPoint, sharedTransactionId);
            
            if (checkResult.availableItems.length === 0) {
              // Produkt nie istnieje w stanie - przejdź do korekt

              greenMissingCount++;
            } else {
              // Produkt istnieje - wykonaj operację niebieską
              if (greenItem.isFromSale) {
                // Dla sprzedaży
                const salesResponse = await fetch(`${API_BASE_URL}/api/transfer/process-sales`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    salesItems: [greenItem],
                    selectedUser: selectedUser,
                    transactionId: sharedTransactionId
                  }),
                });
                
                if (salesResponse.ok) {

                  setProcessedSales(prev => new Set([...prev, greenItem._id]));

                }
              } else {
                // Dla transferów
                const transferResponse = await fetch(`${API_BASE_URL}/api/transfer/process-all`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transfers: [greenItem],
                    selectedDate: selectedDate,
                    selectedUser: selectedUser,
                    transactionId: sharedTransactionId
                  }),
                });
                
                if (transferResponse.ok) {

                  setProcessedTransfers(prev => new Set([...prev, greenItem._id]));

                }
              }
            }
          } catch (error) {
            console.error(`🟢 Error processing green item blue operation ${greenItem._id}:`, error);
          }
        }

        for (let i = 0; i < allGreenItems.length; i++) {
          const greenItem = allGreenItems[i];

          const matchedPair = matchedPairs.find(pair => 
            pair.blueProduct.id === greenItem._id && 
            pair.blueProduct.type === (greenItem.isFromSale ? 'sale' : 'transfer')
          );
          
          if (matchedPair && matchedPair.warehouseProduct) {
            // DODANE OPÓŹNIENIE dla uniknięcia race condition
            if (i > 0) {

              await new Promise(resolve => setTimeout(resolve, i * 100));
            }
            
            // Wykonaj operację pomarańczową (przeniesienie z magazynu)

            // NAPRAW: Dodaj transfer_to dla warehouse product przed wysłaniem do backend
            const selectedUserObject = users.find(user => user._id === selectedUser);
            const warehouseProductWithTransferTo = {
              ...matchedPair.warehouseProduct,
              transfer_to: selectedUserObject?.symbol || selectedUserObject?.sellingPoint
            };

            const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                warehouseItems: [warehouseProductWithTransferTo],
                selectedDate: selectedDate,
                selectedUser: selectedUser,
                transactionId: sharedTransactionId
              }),
            });
            
            const warehouseResponseData = await warehouseResponse.json();

            const stateCheckResponse = await fetch(`${API_BASE_URL}/api/state/barcode/${matchedPair.warehouseProduct.barcode}`);
            const currentState = await stateCheckResponse.json();
            const userStates = currentState.filter(s => s.symbol === 'P');

            if (warehouseResponse.ok) {

              greenProcessedCount++;
              
              // Produkt już oznaczony jako przetworzony po pierwszej operacji (blue)
              // Nie trzeba ponownie oznaczać - tylko zliczamy
            } else {
              console.error(`🟢 Green item ${greenItem._id} - Orange operation failed:`, warehouseResponseData);
            }
          } else {
            console.error(`🟢 Green item ${greenItem._id} - No matched warehouse product found for orange operation`);
          }
        }

      }

      // 🟠 KROK 4: POMARAŃCZOWE PRODUKTY - Produkty z magazynu (dopisanie do stanu) - OSTATNIE!

      if (warehouseItems.length > 0) {

        // NAPRAW: Dodaj transfer_to dla warehouse items przed wysłaniem do backend
        const selectedUserObject = users.find(user => user._id === selectedUser);
        const warehouseItemsWithTransferTo = warehouseItems.map(item => ({
          ...item,
          transfer_to: selectedUserObject?.symbol || selectedUserObject?.sellingPoint // Dodaj docelowego użytkownika
        }));

        const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseItems: warehouseItemsWithTransferTo,
            selectedDate: selectedDate,
            selectedUser: selectedUser,
            transactionId: sharedTransactionId
          }),
        });

        if (warehouseResponse.ok) {
          const warehouseResult = await warehouseResponse.json();
          processedCount += warehouseResult.processedCount || warehouseItems.length;

        } else {
          console.error('🟠 Failed to process warehouse items');
        }
      }

      // Przygotuj szczegółowy komunikat z informacjami o brakach
      const totalMissingCount = standardTransfersMissingCount + salesMissingCount + greenMissingCount;
      let alertMessage = `✅ OPERACJA ZAKOŃCZONA\n\n`;
      alertMessage += `🔄 NOWA KOLEJNOŚĆ PRZETWARZANIA:\n`;
      alertMessage += `1. 🔵 Niebieskie produkty (transfery/sprzedaże) - PIERWSZE\n`;
      alertMessage += `2. 🟡 Żółte produkty (transfery przychodzące)\n`;
      alertMessage += `3. 🟢 Zielone produkty (operacja podwójna)\n`;
      alertMessage += `4. 🟠 Pomarańczowe produkty (z magazynu) - OSTATNIE\n\n`;
      alertMessage += `Przetworzono ${processedCount + greenProcessedCount} elementów:\n`;
      alertMessage += `- ${validStandardTransfers.length} standardowych transferów odpisano ze stanu\n`;
      alertMessage += `- ${validSalesItems.length} sprzedaży odpisano ze stanu\n`;
      alertMessage += `- ${incomingTransfers.length} żółtych transferów przychodzących dodano do stanu\n`;
      alertMessage += `- ${greenProcessedCount} zielonych produktów przetworzono (operacja podwójna)\n`;
      alertMessage += `- ${warehouseItems.length} produktów z magazynu dodano do stanu (na końcu)\n`;
      
      if (totalMissingCount > 0) {
        alertMessage += `\n⚠️ WYKRYTO BRAKI:\n`;
        if (greenMissingCount > 0) {
          alertMessage += `- ${greenMissingCount} zielonych produktów bez pokrycia w stanie\n`;
        }
        if (standardTransfersMissingCount > 0) {
          alertMessage += `- ${standardTransfersMissingCount} transferów bez pokrycia w stanie\n`;
        }
        if (salesMissingCount > 0) {
          alertMessage += `- ${salesMissingCount} sprzedaży bez pokrycia w stanie\n`;
        }
        alertMessage += `\n📋 Wszystkie braki zostały zapisane w tabeli KOREKTY do rozwiązania.`;
      }
      
      alert(alertMessage);
      
      // Odśwież wszystkie dane po przetworzeniu
      await fetchAllStates(); // Najpierw odśwież stany
      await fetchTransfers();
      await fetchWarehouseItems();
      await fetchSales(); // Dodaj odświeżanie sprzedaży
      await checkProcessingStatus(); // Odśwież status przetwarzania

      setMatchedPairs([]);
      setGreyedWarehouseItems(new Set());

      await checkLastTransaction();
    } catch (error) {
      console.error('Error processing transfers:', error);
      alert('Błąd podczas przetwarzania transferów');
    }
  };

  const handleUndoLastTransaction = async () => {
    if (!canUndoTransaction || !lastTransaction) {
      alert('Brak transakcji do cofnięcia');
      return;
    }

    const confirmUndo = window.confirm(
      `Czy na pewno chcesz cofnąć ostatnią transakcję?\n\n` +
      `ID transakcji: ${lastTransaction.transactionId}\n` +
      `Data: ${new Date(lastTransaction.timestamp).toLocaleString()}\n` +
      `Liczba produktów: ${lastTransaction.itemCount}\n\n` +
      `Produkty zostaną przywrócone do odpowiednich stanów.`
    );

    if (!confirmUndo) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/transfer/undo-last`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();

        if (result.warehouseItems && result.warehouseItems.length > 0) {

          for (const item of result.warehouseItems) {
            // Usuń produkt ze stanu użytkownika (fizycznie)
            try {
              await fetch(`${API_BASE_URL}/api/state/${item.stateId}`, {
                method: 'DELETE'
              });

            } catch (error) {
              console.error(`Error removing state item ${item.stateId}:`, error);
            }
            
            // Dodaj produkt z powrotem do magazynu (wizualnie)
            const warehouseItem = {
              _id: item._id,
              fullName: {
                fullName: item.fullName
              },
              size: {
                Roz_Opis: item.size
              },
              barcode: item.barcode,
              sellingPoint: {
                symbol: 'MAGAZYN'
              },
              price: item.price,
              date: item.date
            };
            
            setWarehouseItems(prev => [...prev, warehouseItem]);
            setFilteredWarehouseItems(prev => [...prev, warehouseItem]);
          }
          
          alert(
            `Transakcja została pomyślnie cofnięta!\n\n` +
            `Przywrócono ${result.restoredCount} standardowych produktów do stanu.\n` +
            `Przywrócono ${result.warehouseItems.length} produktów z magazynu do magazynu.\n` +
            `ID transakcji: ${result.transactionId}`
          );
        } else {
          alert(
            `Transakcja została pomyślnie cofnięta!\n\n` +
            `Przywrócono ${result.restoredCount} produktów do stanu.\n` +
            `ID transakcji: ${result.transactionId}\n\n` +
            `Produkty ponownie pojawiły się na liście transferów.`
          );
        }
        
        // Odśwież wszystkie dane po cofnięciu

        setProcessedSales(new Set()); // Reset przetworzonych sprzedaży po cofnięciu transakcji
        setProcessedTransfers(new Set()); // Reset przetworzonych transferów po cofnięciu transakcji
        
        // 🟢 Reset synchronizacji po cofnięciu transakcji (zielone produkty wrócą do niebieskich)
        setMatchedPairs([]);
        setGreyedWarehouseItems(new Set());

        await fetchAllStates(); // Najpierw odśwież stany
        await fetchTransfers();
        await fetchWarehouseItems();
        await fetchSales(); // Dodaj odświeżanie sprzedaży

        await checkLastTransaction();
        
        // Ukryj przycisk cofania po udanym cofnięciu
        setShowUndoButton(false);
      } else {
        const errorData = await response.json();
        alert(`Błąd podczas cofania transakcji: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error undoing transaction:', error);
      alert('Błąd podczas cofania transakcji');
    }
  };

  const handleProcessSingleTransfer = async (transferId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transfer/process-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transferId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Transfer przetworzony - kurtka została odpisana ze stanu`);
        
        // Odśwież listę transferów
        const fetchResponse = await fetch(`${API_BASE_URL}/api/transfer`);
        const data = await fetchResponse.json();
        setTransfers(data || []);
        
        // Sprawdź ostatnią transakcję
        await checkLastTransaction();
        
        // Odśwież status przetwarzania
        await checkProcessingStatus();
      } else {
        // Pokazuj szczegółowy błąd z serwera
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Nieznany błąd serwera';
        alert(`Błąd podczas przetwarzania transferu:\n\n${errorMessage}\n\nStatus: ${response.status}`);
      }
    } catch (error) {
      console.error('Error processing single transfer:', error);
      alert(`Błąd połączenia podczas przetwarzania transferu:\n\n${error.message}`);
    }
  };

  const handleRemoveAllFromState = async () => {
    if (filteredItems.length === 0) {
      alert('Brak transferów do odpisania ze stanu');
      return;
    }

    const confirmMessage = `Czy na pewno chcesz odpisać wszystkie ${filteredItems.length} kurtek ze stanu?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      // Process each transfer to remove from state
      for (const transfer of filteredItems) {
        try {
          // Remove the product from state based on transfer data
          const response = await fetch(`/api/state/barcode/${transfer.productId}/symbol/${transfer.transfer_from}?count=1`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            successCount++;
            // Also remove the transfer record
            await fetch(`/api/transfer/${transfer._id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } else {
            errorCount++;
            console.error(`Failed to remove transfer ${transfer._id}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing transfer ${transfer._id}:`, error);
        }
      }

      // Update local state - remove all processed transfers
      setTransfers(prevTransfers => 
        prevTransfers.filter(transfer => 
          !filteredItems.some(filteredItem => filteredItem._id === transfer._id)
        )
      );

      if (successCount > 0) {
        alert(`Pomyślnie odpisano ${successCount} kurtek ze stanu${errorCount > 0 ? `. Błędów: ${errorCount}` : ''}`);
      } else {
        alert('Nie udało się odpisać żadnej kurtki ze stanu');
      }
    } catch (error) {
      console.error('Error removing all from state:', error);
      alert('Błąd podczas odpisywania kurtek ze stanu');
    }
  };

  // Funkcja do usuwania pojedynczego produktu ze stanu
  const handleRemoveFromState = async (transfer) => {
    try {

      const response = await fetch(`/api/state/barcode/${transfer.productId}/symbol/${transfer.transfer_from}?count=1`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Also remove the transfer record
        await fetch(`/api/transfer/${transfer._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Update local state - remove this transfer
        setTransfers(prevTransfers => 
          prevTransfers.filter(t => t._id !== transfer._id)
        );

      } else {
        console.error(`❌ Failed to remove transfer ${transfer._id}`);
        alert('Błąd podczas usuwania produktu ze stanu');
      }
    } catch (error) {
      console.error(`❌ Error processing transfer ${transfer._id}:`, error);
      alert('Błąd podczas usuwania produktu ze stanu');
    }
  };

  const handleSynchronize = async () => {
    try {

      setMatchedPairs([]);
      setGreyedWarehouseItems(new Set());

      if (sales && sales.length > 0) {
        sales.forEach((sale, index) => {
          const dateMatch = !selectedDate || sale.date?.startsWith(selectedDate);
          const userMatch = !selectedUser || sale.user === selectedUser;
          const isProcessed = processedSales.has(sale._id);

        });
      }
      
      // Pobierz listę niebieskich produktów z WIDOCZNYCH elementów (po filtrach)
      const blueProducts = [];
      
      // Dodaj produkty ze sprzedaży i transferów z filteredItems
      if (filteredItems && filteredItems.length > 0) {

        filteredItems.forEach((item, index) => {

          if (!item.fromWarehouse) {
            blueProducts.push({
              id: item._id,
              type: item.isFromSale ? 'sale' : 'transfer',
              barcode: item.barcode || item.productId,
              fullName: item.fullName,
              size: item.size,
              source: item
            });
          }
        });
      }

      blueProducts.forEach((bp, i) => {

      });
      
      // Przygotuj pomarańczowe produkty (magazyn) z filteredWarehouseItems
      let orangeProducts = [];

      if (Array.isArray(filteredWarehouseItems)) {
        filteredWarehouseItems.forEach((warehouse, index) => {

          const backgroundColor = getBackgroundColor(warehouse, true, false, false); // magazyn: z magazynu, nie sprzedaż, nie przychodzący

          if (backgroundColor === '#ff8c00') { // Pomarańczowy kolor hex
            orangeProducts.push({
              type: 'warehouse',
              barcode: warehouse.barcode || '', // barcode jest bezpośrednio na warehouse
              fullName: warehouse.fullName?.fullName || '',
              size: warehouse.size?.Roz_Opis || '',
              source: warehouse
            });
          }
        });
      }

      orangeProducts.forEach((op, i) => {

      });

      // GŁÓWNY ALGORYTM PAROWANIA

      const newPairs = [];
      const pairedBlueIndexes = new Set();
      const pairedOrangeIndexes = new Set();

      for (let b = 0; b < blueProducts.length; b++) {
        if (pairedBlueIndexes.has(b)) continue;

        const blueProduct = blueProducts[b];

        for (let o = 0; o < orangeProducts.length; o++) {
          if (pairedOrangeIndexes.has(o)) continue;

          const orangeProduct = orangeProducts[o];

          const barcodeMatch = blueProduct.barcode === orangeProduct.barcode;
          const nameMatch = blueProduct.fullName === orangeProduct.fullName;
          const sizeMatch = blueProduct.size === orangeProduct.size;
          const isMatched = barcodeMatch && nameMatch && sizeMatch;

          if (isMatched) {

            const existingPair = newPairs.find(pair => 
              pair.warehouseProduct._id === orangeProduct.source._id
            );
            
            if (existingPair) {

              continue;
            }
            
            // Znajdź dane użytkownika dla transfer_to
            const selectedUserData = users.find(user => user._id === selectedUser);
            const userSymbol = selectedUserData?.symbol || 'UNKNOWN';
            
            newPairs.push({
              id: Date.now() + Math.random(),
              blueProduct: {
                id: blueProduct.source._id,
                type: blueProduct.type,
                fullName: blueProduct.fullName,
                size: blueProduct.size,
                barcode: blueProduct.barcode
              },
              warehouseProduct: {
                _id: orangeProduct.source._id,
                fullName: orangeProduct.fullName,
                size: orangeProduct.size,
                barcode: orangeProduct.barcode,
                transfer_to: userSymbol, // DODANO: Wymagane przez backend
                transfer_from: 'MAGAZYN',
                price: orangeProduct.source.price || 0,
                discount_price: orangeProduct.source.discount_price || 0
              }
            });

            pairedBlueIndexes.add(b);
            pairedOrangeIndexes.add(o);
            break;
          } else {

          }
        }

        if (!pairedBlueIndexes.has(b)) {

        }
      }

      if (newPairs.length > 0) {

        newPairs.forEach((pair, index) => {

        });

        setMatchedPairs(prevPairs => {
          const updatedPairs = [...prevPairs, ...newPairs];

          return updatedPairs;
        });

        // Wyszarzenie produktów z magazynu które zostały sparowane
        const warehouseIdsToGrey = newPairs.map(pair => pair.warehouseProduct._id);

        newPairs.forEach((pair, index) => {

        });
        
        setGreyedWarehouseItems(prevGreyed => {
          const newGreyed = new Set([...prevGreyed, ...warehouseIdsToGrey]);

          return newGreyed;
        });

        setMessage(`Synchronizacja zakończona! Znaleziono ${newPairs.length} nowych par produktów.`);
      } else {
        setMessage('Synchronizacja zakończona. Nie znaleziono nowych par do utworzenia.');
      }

    } catch (error) {
      console.error('❌ BŁĄD PODCZAS SYNCHRONIZACJI:', error);
      setMessage('Błąd podczas synchronizacji: ' + error.message);
    }
  };

  return (
    <>
      {/* CSS dla spinnera */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{ display: 'flex', height: '100vh', gap: '20px' }}>
      {/* LEWA STRONA - Miejsce na nową funkcjonalność */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        borderRight: '2px solid #ddd',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'white' }}>
          Magazyn
        </h2>
        
        {/* Wyszukiwarka magazynu */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="warehouseSearch" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'white' }}>
            Wyszukaj w magazynie:
          </label>
          <input
            id="warehouseSearch"
            type="text"
            value={warehouseSearch}
            onChange={handleWarehouseSearchChange}
            placeholder="Wpisz nazwę, rozmiar lub kod kreskowy..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '14px',
              backgroundColor: 'black',
              color: 'white'
            }}
          />
          <div style={{ fontSize: '12px', color: 'white', marginTop: '5px' }}>
            Znaleziono: {filteredWarehouseItems.length} produktów

          </div>
        </div>

        {/* Tabela produktów magazynowych */}
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', fontSize: '12px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#495057', color: 'white' }}>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nazwa</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Rozmiar</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kod kreskowy</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Cena</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {filteredWarehouseItems.map((item) => {
                const isGreyed = isWarehouseItemGreyed(item._id);
                return (
                <tr key={`warehouse-${item._id}`} style={{ 
                  backgroundColor: isGreyed ? '#d6d6d6' : '#000000', // Czarne tło dla nie-sparowanych
                  color: isGreyed ? '#333333' : '#ffffff', // Biały tekst dla nie-sparowanych
                  opacity: isGreyed ? 0.6 : 1.0,
                  '&:hover': { backgroundColor: isGreyed ? '#c0c0c0' : '#333333' }
                }}>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {item.fullName?.fullName || 'Nieznana nazwa'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {item.size?.Roz_Opis || 'Nieznany rozmiar'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {item.barcode || 'Brak kodu'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {item.price ? `${item.price} PLN` : 'Brak ceny'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => !isGreyed && handleMoveFromWarehouse(item)}
                      disabled={isGreyed}
                      style={{
                        backgroundColor: isGreyed ? '#6c757d' : '#0d6efd',
                        color: 'white',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        cursor: isGreyed ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                        opacity: isGreyed ? 0.6 : 1.0,
                        height: '24px'
                      }}
                      title={isGreyed ? "Produkt sparowany - niedostępny" : "Przenieś produkt do obszaru transferów"}
                    >
                      {isGreyed ? '🔒 Sparowany' : 'Przenieś'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredWarehouseItems.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#666',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              marginTop: '10px'
            }}>
              {warehouseSearch ? 
                `Brak produktów pasujących do "${warehouseSearch}"` : 
                'Brak produktów w magazynie'
              }
            </div>
          )}
        </div>
      </div>

      {/* PRAWA STRONA - Obecny mechanizm transferów */}
      <div style={{ 
        flex: 1, 
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'white' }}>
          Mechanizm Transferów
        </h2>
        
        <form>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="datepicker" style={{ color: 'white' }}>Wybierz datę:</label>
            <div style={{ position: 'relative', display: 'inline-block', marginLeft: '10px' }}>
              <input
                id="datepicker"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                style={{ 
                  padding: '5px 30px 5px 5px', 
                  backgroundColor: 'black', 
                  color: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
              <span 
                onClick={() => document.getElementById('datepicker').showPicker()}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  userSelect: 'none'
                }}
              >
                📅
              </span>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="userselect" style={{ color: 'white' }}>Wybierz użytkownika:</label>
            <select
              id="userselect"
              value={selectedUser}
              onChange={handleUserChange}
              onClick={() => {
                // Odśwież dane przy każdym kliknięciu, jeśli użytkownik jest już wybrany
                if (selectedUser) {

                  setProcessedSales(new Set());
                  setProcessedTransfers(new Set());
                  fetchTransfers();
                  fetchWarehouseItems();
                  fetchSales();
                  fetchAllStates();
                  checkLastTransaction();
                }
              }}
              style={{ 
                marginLeft: '10px', 
                padding: '5px', 
                backgroundColor: 'black', 
                color: 'white',
                border: '1px solid #ddd'
              }}
            >
              <option value="">-- Wybierz użytkownika --</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.symbol} - {user.sellingPoint || user.email}
                </option>
              ))}
            </select>
            
            {/* Price list status */}
            {selectedUser && (
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                {priceListLoading && (
                  <span style={{ color: 'yellow' }}>
                    🔄 Ładowanie cennika...
                  </span>
                )}
                {!priceListLoading && priceList && (
                  <span style={{ color: 'lightgreen' }}>
                    ✅ Cennik: {priceList.items?.length || 0} produktów
                  </span>
                )}
                {!priceListLoading && !priceList && (
                  <span style={{ color: 'orange' }}>
                    ⚠️ Brak cennika - używane ceny standardowe
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        <div style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
          <button 
            onClick={handleProcessAllTransfers}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginRight: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            disabled={!Array.isArray(filteredItems) || filteredItems.length === 0}
          >
            Zapisz - Odpisz wszystkie kurtki ze stanu ({Array.isArray(filteredItems) ? filteredItems.length : 0})
          </button>

          <button 
            onClick={handlePrintAllColoredLabels}
            style={{
              backgroundColor: '#0d6efd',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginLeft: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            disabled={getColoredItemsCount() === 0}
          >
            Drukuj wszystkie etykietki ({getColoredItemsCount()})
          </button>

          {canUndoTransaction && lastTransaction && showUndoButton &&
           !correctedTransactionIds.has(lastTransaction.transactionId) && (
            <button 
              onClick={handleUndoLastTransaction}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                margin: '10px 0'
              }}
              title={`Cofnij transakcję z ${new Date(lastTransaction.timestamp).toLocaleString()}`}
            >
              ⟲ Anuluj ostatnią transakcję ({lastTransaction.itemCount} produktów)
            </button>
          )}
        </div>

        {/* Processing Status Alert */}
        {processingStatus && (
          <div 
            style={{
              color: processingStatus.allProcessed ? '#28a745' : '#dc3545',
              padding: '5px 0',
              marginBottom: '5px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            {processingStatus.message}
            {!processingStatus.allProcessed && processingStatus.unprocessedCount > 0 && (
              <div style={{ fontSize: '14px', marginTop: '3px' }}>
                Nieprzetworzonych pozycji: {processingStatus.unprocessedCount}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#495057', color: 'white' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nazwa</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Rozmiar</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Data</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Z</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Do</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredItems) && filteredItems.map((transfer, index) => {
                // Sprawdź czy transfer został już przetworzony
                const isProcessed = transfer.isFromSale ? 
                  processedSales.has(transfer._id) :
                  (transfer.processed || processedTransfers.has(transfer._id));
                
                // Pobierz status dostępności dla tego elementu
                const availabilityStatus = availabilityStatuses[index] || 'Sprawdzanie...';
                
                return (
                <tr key={`transfer-${transfer._id}`} style={{ 
                  backgroundColor: getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale, transfer.isIncomingTransfer),
                  color: 'white',
                  opacity: isProcessed ? 0.7 : 1.0 // Przezroczystość dla przetworzonych
                }}>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {isProcessed && '✓ '}
                    {transfer.isFromSale 
                      ? (transfer.fullName || 'N/A')
                      : (typeof transfer.fullName === 'object' 
                          ? (transfer.fullName?.fullName || 'N/A')
                          : (transfer.fullName || 'N/A'))}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {transfer.isFromSale 
                      ? (transfer.size || 'N/A')
                      : (typeof transfer.size === 'object' 
                          ? (transfer.size?.Roz_Opis || 'N/A')
                          : (transfer.size || 'N/A'))}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {new Date(transfer.date).toLocaleDateString()}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>{transfer.transfer_from}</td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px' }}>
                    {transfer.isFromSale ? `SPRZEDANO w ${transfer.transfer_to}` : transfer.transfer_to}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '6px', textAlign: 'center' }}>
                    {transfer.isFromSale ? (
                      // Dla sprzedaży - brak przycisków akcji (nie można cofnąć sprzedaży tutaj)
                      <span style={{ fontStyle: 'italic' }}>Sprzedano</span>
                    ) : transfer.fromWarehouse ? (
                      // Przyciski dla produktów z magazynu (pomarańczowe) - przycisk Cofnij + Drukuj
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleReturnToWarehouse(transfer)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            height: '24px'
                          }}
                          title="Cofnij do magazynu"
                        >
                          Cofnij
                        </button>
                        <button 
                          onClick={() => handlePrintSingleLabel(transfer)}
                          style={{
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            height: '24px'
                          }}
                          title="Drukuj etykietę pomarańczowego produktu"
                        >
                          Drukuj
                        </button>
                      </div>
                    ) : (() => {
                      // Sprawdź kolor produktu dla niebieskich i zielonych
                      const backgroundColor = getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale, transfer.isIncomingTransfer);
                      const isBlue = backgroundColor === '#007bff';
                      const isGreen = backgroundColor === '#28a745';
                      
                      if (isGreen) {
                        return (
                          <button 
                            onClick={() => {
                              // Zielone produkty: najpierw usuń ze stanu, potem dodaj do magazynu

                              handleRemoveFromState(transfer);
                              // Znajdź pasujący produkt z magazynu i dodaj go
                              const matchingWarehouseItem = warehouseItems.find(item => {
                                const transferBarcode = transfer.isFromSale ? transfer.barcode : transfer.productId;
                                const transferName = transfer.isFromSale ? transfer.fullName : (transfer.fullName?.fullName || transfer.fullName);
                                const transferSize = transfer.isFromSale ? transfer.size : (transfer.size?.Roz_Opis || transfer.size);
                                
                                const itemBarcode = item.barcode;
                                const itemName = item.fullName?.fullName || item.fullName;
                                const itemSize = item.size?.Roz_Opis || item.size;
                                
                                const barcodeMatch = transferBarcode === itemBarcode;
                                const nameMatch = transferName === itemName;
                                const sizeMatch = transferSize === itemSize;
                                
                                return barcodeMatch && nameMatch && sizeMatch;
                              });
                              if (matchingWarehouseItem) {
                                setTimeout(() => handleMoveFromWarehouse(matchingWarehouseItem), 100);
                              }
                            }}
                            style={{
                              backgroundColor: '#0d6efd',
                              color: 'white',
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              height: '24px'
                            }}
                            title="Sparowany: usuń ze stanu i dodaj z magazynu"
                          >
                            Sparowany
                          </button>
                        );
                      } else {
                        // Sprawdź czy to żółty produkt (przychodzący transfer)
                        const isYellow = transfer.isIncomingTransfer;
                        
                        if (isYellow) {
                          return (
                            <button 
                              onClick={() => handlePrintSingleLabel(transfer)}
                              style={{
                                backgroundColor: '#0d6efd',
                                color: 'white',
                                border: 'none',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                height: '24px'
                              }}
                              title="Drukuj etykietę żółtego produktu (przychodzący transfer)"
                            >
                              Drukuj
                            </button>
                          );
                        } else {
                          // Brak akcji dla niebieskich i innych transferów
                          return (
                            <span style={{ color: '#ccc', fontSize: '12px' }}>
                              -
                            </span>
                          );
                        }
                      }
                    })()}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {(!Array.isArray(filteredItems) || filteredItems.length === 0) && (
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              {selectedDate || selectedUser ? 'Brak transferów dla wybranych kryteriów' : 'Brak transferów'}
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Spinner na środku ekranu podczas automatycznego przenoszenia */}
    {isAutoMoving && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px 50px',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <div style={{
            color: '#333',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            🔄 Przenoszę produkty z magazynu...
            <br />
            <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>
              Proszę czekać
            </span>
          </div>
        </div>
      </div>
    )}

    {/* Modal potwierdzenia drukowania etykiet */}
    {showPrintConfirmModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}>
        <div style={{
          backgroundColor: 'black',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          border: '2px solid white',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            🖨️
          </div>
          
          <h3 style={{
            margin: '0 0 20px 0',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            Potwierdzenie drukowania etykiet
          </h3>
          
          <p style={{
            margin: '0 0 30px 0',
            color: '#ccc',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Czy wszystkie metki zostały poprawnie wydrukowane?
            <br />
            <strong style={{ color: '#fff' }}>Uwaga:</strong> Po potwierdzeniu produkty zostaną przetworzone.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center'
          }}>
            <button
              onClick={cancelPrintConfirmation}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              ❌ Nie - Anuluj
            </button>
            
            <button
              onClick={confirmPrintLabels}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              ✅ Tak - Kontynuuj
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
};

export default AddToState;

