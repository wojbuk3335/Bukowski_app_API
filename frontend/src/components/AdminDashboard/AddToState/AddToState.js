import React, { useState, useEffect } from 'react';

const AddToState = ({ onAdd }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  const [selectedDate, setSelectedDate] = useState('');
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

  // Stan dla spinnera
  const [isProcessing, setIsProcessing] = useState(false);

  // NOWE STANY dla synchronizacji jeden-do-jednego
  const [matchedPairs, setMatchedPairs] = useState([]); // Sparowane pary
  const [greyedWarehouseItems, setGreyedWarehouseItems] = useState(new Set()); // Wyszarzone elementy magazynu
  const [message, setMessage] = useState(''); // Komunikaty synchronizacji
  const [combinedItems, setCombinedItems] = useState([]); // Elementy łącznie z żółtymi produktami

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

  // Helper function to find barcode by productId
  const getBarcodeByProductId = (productId) => {
    if (!productId) return productId; // Return productId as fallback if no productId
    
    // First try to find in allStates (contains all products)
    if (allStates?.length > 0) {
      // Try different matching approaches
      const stateItem1 = allStates.find(state => state._id === productId);
      const stateItem2 = allStates.find(state => String(state._id) === String(productId));
      const stateItem3 = allStates.find(state => state.id === productId);
      
      const stateItem = stateItem1 || stateItem2 || stateItem3;
      
      if (stateItem && stateItem.barcode) {
        return stateItem.barcode;
      }
    }
    
    // Fallback: try warehouseItems
    if (warehouseItems?.length > 0) {
      const warehouseItem1 = warehouseItems.find(item => item._id === productId);
      const warehouseItem2 = warehouseItems.find(item => String(item._id) === String(productId));
      const warehouseItem3 = warehouseItems.find(item => item.id === productId);
      
      const warehouseItem = warehouseItem1 || warehouseItem2 || warehouseItem3;
      
      if (warehouseItem && warehouseItem.barcode) {
        return warehouseItem.barcode;
      }
    }
    
    // If nothing found, return productId
    return productId;
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
    }
  }, [selectedUser]);

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

        setLastTransaction(null);
        setCanUndoTransaction(false);
      } else {

        setLastTransaction(null);
        setCanUndoTransaction(false);
      }
    } catch (error) {
      console.error('Error checking last transaction:', error);
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
          const isProcessed = transfer.processed || processedTransfers.has(transfer._id);

          return !isProcessed; // Pokazuj tylko nieprzetworzone (jak sprzedaże)
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

        // Filtruj nieprzetworzone transfery przychodzące
        incomingTransfers = incomingTransfers.filter(transfer => {
          const isProcessed = transfer.processed || processedTransfers.has(transfer._id);

          return !isProcessed; // Pokazuj tylko nieprzetworzone
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
  }, [selectedDate, selectedUser, transfers, users, sales, allStates, processedSales, processedTransfers]);

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
    
    // Zawsze odśwież dane, nawet jeśli wybrano tę samą wartość
    if (newUser) {

      setProcessedSales(new Set());
      setProcessedTransfers(new Set());
      fetchTransfers();
      fetchWarehouseItems();
      fetchSales();
      fetchAllStates();
      checkLastTransaction();
    }
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
    
    setTransfers(prev => [...prev, newTransferItem]);
    setFilteredItems(prev => [...prev, newTransferItem]);
    
    // Usuń z listy magazynu (wizualnie)
    setFilteredWarehouseItems(prev => prev.filter(item => item._id !== warehouseItem._id));
    setWarehouseItems(prev => prev.filter(item => item._id !== warehouseItem._id));

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
      const allStates = await allStatesResponse.json();
      
      // Lista brakujących kurtek
      const missingItems = [];
      
      // Sprawdź każdą kurtkę czy istnieje w odpowiednim stanie
      itemsToCheck.forEach(item => {
        let foundInState = false;
        let sourceSymbol = userSymbol; // Domyślnie sprawdzaj stan wybranego użytkownika
        
        // Dla transferów sprawdź stan punktu źródłowego (transfer_from)
        if (item.transfer_from && !item.isFromSale) {
          sourceSymbol = item.transfer_from;
        }
        
        // Filtruj stan według właściwego symbolu
        const userStateItems = allStates.filter(item => item.symbol === sourceSymbol);
        
        const itemBarcode = item.barcode || item.productId; // Używaj productId dla transferów
        foundInState = userStateItems.find(stateItem => 
          (stateItem.barcode === itemBarcode || stateItem.id === itemBarcode) &&
          stateItem.fullName === item.fullName &&
          stateItem.size === item.size
        );
        
        if (!foundInState) {
          const operationType = item.isFromSale ? 'SPRZEDAŻY' : 'TRANSFERU';
          const operationDetails = item.isFromSale 
            ? `sprzedaży za ${item.price || 'N/A'} PLN` 
            : `transferu z punktu ${sourceSymbol} do punktu ${item.transfer_to || sellingPoint}`;
          
          const detailedDescription = 
            `🚨 BRAK W STANIE: Próba odpisania kurtki "${item.fullName}" (${item.size}) ` +
            `z punktu "${sourceSymbol}" w ramach ${operationDetails}. ` +
            `Kurtka o kodzie ${item.barcode || item.productId} nie została znaleziona w aktualnym stanie punktu. ` +
            `Możliwe przyczyny: już sprzedana, przeniesiona, zagubiona lub błąd w ewidencji. ` +
            `Data wykrycia: ${new Date().toLocaleString('pl-PL')}.`;
          
          missingItems.push({
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode || item.productId, // Używaj productId jeśli barcode nie istnieje
            sellingPoint: sellingPoint,
            symbol: userSymbol,
            errorType: 'MISSING_IN_STATE',
            attemptedOperation: item.isFromSale ? 'SALE' : 'TRANSFER',
            description: detailedDescription,
            originalPrice: item.price,
            discountPrice: item.discount_price,
            transactionId: transactionId, // Dodaj transactionId do korekty
            // NOWE: Zapisz oryginalne dane do przywrócenia
            originalData: {
              _id: item._id,
              fullName: item.fullName,
              size: item.size,
              barcode: item.barcode || item.productId,
              isFromSale: item.isFromSale,
              price: item.price,
              advancePayment: item.advancePayment,
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

          for (const missingItem of missingItems) {
            // Znajdź WSZYSTKIE oryginalne itemy w itemsToCheck (nie tylko pierwszy!)
            const originalItems = itemsToCheck.filter(item => 
              item.barcode === missingItem.barcode &&
              item.fullName === missingItem.fullName &&
              item.size === missingItem.size
            );

            for (const originalItem of originalItems) {
              if (originalItem && originalItem._id) {
              try {
                if (originalItem.isFromSale) {
                  // Usuń sprzedaż

                  const deleteResponse = await fetch(`${API_BASE_URL}/api/sales/delete-sale/${originalItem._id}`, {
                    method: 'DELETE'
                  });
                  
                  if (deleteResponse.ok) {

                  } else {
                    console.error(`❌ Failed to delete sale: ${originalItem._id}`);
                  }
                } else {
                  // Usuń transfer

                  const deleteResponse = await fetch(`${API_BASE_URL}/api/transfer/${originalItem._id}`, {
                    method: 'DELETE'
                  });
                  
                  if (deleteResponse.ok) {

                  } else {
                    console.error(`❌ Failed to delete transfer: ${originalItem._id}`);
                  }
                }
              } catch (deleteError) {
                console.error(`Error deleting item ${originalItem._id}:`, deleteError);
              }
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
      
      // Zwróć listę kurtek do przetworzenia (usuń brakujące)
      const availableItems = itemsToCheck.filter(item => 
        !missingItems.some(missing => 
          missing.barcode === item.barcode &&
          missing.fullName === item.fullName &&
          missing.size === item.size
        )
      );
      
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

  const handleProcessAllTransfers = async () => {
    // Sprawdź czy mamy kombinowane elementy (zawierające żółte produkty)
    const itemsToProcess = combinedItems && combinedItems.length > 0 ? combinedItems : filteredItems;
    
    if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      alert('Brak transferów do przetworzenia');
      return;
    }

    setIsProcessing(true); // Włącz spinner

    try {
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
            
            // Oznacz transfery jako przetworzone  
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

        const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseItems: warehouseItems,
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

            const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                warehouseItems: [matchedPair.warehouseProduct],
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

        const warehouseResponse = await fetch(`${API_BASE_URL}/api/transfer/process-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseItems: warehouseItems,
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

      setMatchedPairs([]);
      setGreyedWarehouseItems(new Set());

      await checkLastTransaction();
    } catch (error) {
      console.error('Error processing transfers:', error);
      alert('Błąd podczas przetwarzania transferów');
    } finally {
      setIsProcessing(false); // Wyłącz spinner
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
    {/* Pełnoekranowy spinner overlay */}
    {isProcessing && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #28a745',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            Przetwarzanie kurtek...
          </div>
          <div style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center'
          }}>
            Proszę czekać, operacja może potrwać kilka minut
          </div>
        </div>
      </div>
    )}
    
    <div style={{ display: 'flex', height: '100vh', gap: '20px' }}>
      {/* LEWA STRONA - Miejsce na nową funkcjonalność */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        borderRight: '2px solid #ddd',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#ffffff' }}>
          📦 Magazyn
        </h2>
        
        {/* Wyszukiwarka magazynu */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="warehouseSearch" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#ffffff' }}>
            🔍 Wyszukaj w magazynie:
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
              border: '1px solid #555',
              fontSize: '14px',
              backgroundColor: '#000000',
              color: '#ffffff',
              textAlign: 'center'
            }}
          />
          <div style={{ fontSize: '12px', color: '#ffffff', marginTop: '5px' }}>
            Znaleziono: {filteredWarehouseItems.length} produktów

          </div>
        </div>

        {/* Tabela produktów magazynowych */}
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', fontSize: '12px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#28a745', color: 'white' }}>
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
                <tr key={item._id} style={{ 
                  backgroundColor: isGreyed ? '#d6d6d6' : '#e8f5e8', // Wyszarzony jeśli sparowany
                  opacity: isGreyed ? 0.6 : 1.0,
                  '&:hover': { backgroundColor: isGreyed ? '#c0c0c0' : '#d4edda' }
                }}>
                  <td style={{ border: '1px solid #28a745', padding: '6px' }}>
                    {item.fullName?.fullName || 'Nieznana nazwa'}
                  </td>
                  <td style={{ border: '1px solid #28a745', padding: '6px' }}>
                    {item.size?.Roz_Opis || 'Nieznany rozmiar'}
                  </td>
                  <td style={{ border: '1px solid #28a745', padding: '6px' }}>
                    {item.barcode || 'Brak kodu'}
                  </td>
                  <td style={{ border: '1px solid #28a745', padding: '6px' }}>
                    {item.price ? `${item.price} PLN` : 'Brak ceny'}
                  </td>
                  <td style={{ border: '1px solid #28a745', padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => !isGreyed && handleMoveFromWarehouse(item)}
                      disabled={isGreyed}
                      style={{
                        backgroundColor: isGreyed ? '#6c757d' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        cursor: isGreyed ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                        opacity: isGreyed ? 0.6 : 1.0
                      }}
                      title={isGreyed ? "Produkt sparowany - niedostępny" : "Przenieś produkt do obszaru transferów"}
                    >
                      {isGreyed ? '🔒 Sparowany' : '➤ Przenieś'}
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
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#ffffff' }}>
          Mechanizm Transferów
        </h2>
        
        <form>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="datepicker" style={{ color: '#ffffff' }}>Wybierz datę:</label>
            <input
              id="datepicker"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
              style={{ 
                marginLeft: '10px', 
                padding: '10px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '1px solid #555',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="userselect" style={{ color: '#ffffff' }}>Wybierz użytkownika:</label>
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
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '1px solid #555'
              }}
            >
              <option value="">-- Wybierz użytkownika --</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.symbol} - {user.sellingPoint || user.email}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Przyciski Synchronizacji */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSynchronize}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '44px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            title="Sparuj produkty jeden-do-jednego: niebieski → zielony, magazyn → wyszarzony"
          >
            🔄 Synchronizuj z magazynem
          </button>

          <button
            onClick={() => {
              setMatchedPairs([]);
              setGreyedWarehouseItems(new Set());
            }}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '44px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
            title="Resetuj synchronizację - przywróć domyślne kolory"
          >
            🔄 Reset synchronizacji
          </button>
        </div>

        <div style={{ 
          marginTop: '20px', 
          marginBottom: '20px', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={handleProcessAllTransfers}
            style={{
              backgroundColor: isProcessing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 25px',
              borderRadius: '5px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50px'
            }}
            disabled={!Array.isArray(filteredItems) || filteredItems.length === 0 || isProcessing}
          >
            Zapisz - Odpisz wszystkie kurtki ze stanu ({Array.isArray(filteredItems) ? filteredItems.length : 0})
          </button>

          {canUndoTransaction && lastTransaction && (
            <button 
              onClick={handleUndoLastTransaction}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'background-color 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '44px',
                textAlign: 'center'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              title={`Cofnij transakcję z ${new Date(lastTransaction.timestamp).toLocaleString()}`}
            >
              ⟲ Anuluj ostatnią transakcję ({lastTransaction.itemCount} produktów)
            </button>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#ffffff' }}>Transfery</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#28a745' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Nazwa produktu</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Rozmiar</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Data</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Z</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Do</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Kod kreskowy</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Rodzaj</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', color: '#ffffff' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredItems) && filteredItems.map((transfer) => {
                // Sprawdź czy transfer został już przetworzony
                const isProcessed = transfer.isFromSale ? 
                  processedSales.has(transfer._id) :
                  (transfer.processed || processedTransfers.has(transfer._id));
                
                return (
                <tr key={transfer._id} style={{ 
                  backgroundColor: getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale, transfer.isIncomingTransfer),
                  color: 'white',
                  opacity: isProcessed ? 0.7 : 1.0 // Przezroczystość dla przetworzonych
                }}>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {isProcessed && '✓ '}
                    {transfer.isFromSale 
                      ? (transfer.fullName || 'N/A')
                      : (typeof transfer.fullName === 'object' 
                          ? (transfer.fullName?.fullName || 'N/A')
                          : (transfer.fullName || 'N/A'))}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale 
                      ? (transfer.size || 'N/A')
                      : (typeof transfer.size === 'object' 
                          ? (transfer.size?.Roz_Opis || 'N/A')
                          : (transfer.size || 'N/A'))}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {new Date(transfer.date).toLocaleDateString()}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>{transfer.transfer_from}</td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? `SPRZEDANO w ${transfer.transfer_to}` : transfer.transfer_to}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? transfer.barcode || 'N/A' : getBarcodeByProductId(transfer.productId) || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? 'SPRZEDAŻ' : (transfer.reason || 'TRANSFER')}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? (
                      // Dla sprzedaży - puste pole, tak samo jak dla zwykłych transferów
                      <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>
                    ) : transfer.fromWarehouse ? (
                      // Przyciski dla produktów z magazynu - tylko przycisk Cofnij
                      <button 
                        onClick={() => handleReturnToWarehouse(transfer)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '5px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Cofnij do magazynu"
                      >
                        ↩️ Cofnij
                      </button>
                    ) : (() => {
                      // Sprawdź kolor produktu dla niebieskich i zielonych
                      const backgroundColor = getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale, transfer.isIncomingTransfer);
                      const isBlue = backgroundColor === '#007bff';
                      const isGreen = backgroundColor === '#28a745';
                      
                      if (isGreen) {
                        // Tylko zielone produkty mają przycisk
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
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Sparowany: usuń ze stanu i dodaj z magazynu"
                          >
                            🔄 Sparowany
                          </button>
                        );
                      } else {
                        // Niebieskie i inne produkty: pusta komórka
                        return (
                          <span style={{ color: '#ccc', fontSize: '12px' }}>
                            -
                          </span>
                        );
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
    </>
  );
};

// Dodaj CSS dla animacji spinnera i ciemnego input placeholder
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  #warehouseSearch::placeholder {
    color: #cccccc;
    opacity: 1;
  }
  
  #warehouseSearch::-webkit-input-placeholder {
    color: #cccccc;
  }
  
  #warehouseSearch::-moz-placeholder {
    color: #cccccc;
    opacity: 1;
  }
`;
document.head.appendChild(style);

export default AddToState;

