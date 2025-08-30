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

  // NOWE STANY dla synchronizacji jeden-do-jednego
  const [matchedPairs, setMatchedPairs] = useState([]); // Sparowane pary
  const [greyedWarehouseItems, setGreyedWarehouseItems] = useState(new Set()); // Wyszarzone elementy magazynu
  const [message, setMessage] = useState(''); // Komunikaty synchronizacji

  // Funkcje pomocnicze dla synchronizacji
  const isProductMatched = (productId, type) => {
    const matched = matchedPairs.some(pair => 
      pair.blueProduct.id === productId && pair.blueProduct.type === type
    );
    
    console.log(`🔍 isProductMatched(${productId}, ${type}):`, {
      matched,
      matchedPairsCount: matchedPairs.length,
      searchingFor: { productId, type },
      matchedPairs: matchedPairs.map(p => ({
        blueId: p.blueProduct.id,
        blueType: p.blueProduct.type,
        blueName: p.blueProduct.fullName,
        blueSize: p.blueProduct.size,
        warehouseId: p.warehouseProduct._id,
        exactMatch: p.blueProduct.id === productId && p.blueProduct.type === type
      }))
    });
    
    return matched;
  };

  const isWarehouseItemGreyed = (warehouseItemId) => {
    const isGreyed = greyedWarehouseItems.has(warehouseItemId);
    
    // Debugging dla Laura RUDY XS
    if (warehouseItemId && (warehouseItemId.includes('Laura') || warehouseItemId.length > 10)) {
      console.log(`🔍 isWarehouseItemGreyed(${warehouseItemId}):`, {
        isGreyed,
        greyedItemsSize: greyedWarehouseItems.size,
        greyedItems: Array.from(greyedWarehouseItems),
        matchedPairsCount: matchedPairs.length
      });
    }
    
    return isGreyed;
  };

  const getBackgroundColor = (item, fromWarehouse, isFromSale) => {
    // Sprawdź czy jest sparowany (niebieski → zielony)
    const matchedAsSale = isFromSale && isProductMatched(item._id, 'sale');
    const matchedAsTransfer = !fromWarehouse && isProductMatched(item._id, 'transfer');
    
    console.log(`🎨 Sprawdzam kolor dla ${item._id}:`, {
      isFromSale,
      fromWarehouse,
      matchedAsSale,
      matchedAsTransfer,
      matchedPairsCount: matchedPairs.length,
      isFirstProduct: item._id === '68adff169284cd8488a9003e'
    });
    
    if (matchedAsSale || matchedAsTransfer) {
      console.log(`   ✅ ZIELONY (sparowany) - ID: ${item._id}`);
      return '#28a745'; // ZIELONY - sparowany
    }
    
    // Standardowe kolory
    if (isFromSale) {
      console.log(`   🔵 NIEBIESKI (sprzedaż) - ID: ${item._id}`);
      return '#007bff'; // Niebieski - sprzedaż
    } else if (fromWarehouse) {
      console.log(`   🟠 POMARAŃCZOWY (magazyn) - ID: ${item._id}`);
      return '#ff8c00'; // Pomarańczowy - transfer z magazynu
    } else {
      console.log(`   🔵 NIEBIESKI (transfer) - ID: ${item._id}`);
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
      console.log('🔄 Refreshing transfers data...'); // Debug log
      const response = await fetch(`${API_BASE_URL}/api/transfer`);
      const data = await response.json();
      console.log('📥 Raw transfers from backend:', data); // DEBUG: Show raw data
      setTransfers(data || []);
      console.log('✅ Transfers refreshed:', data?.length || 0, 'items'); // Debug log
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  // Fetch warehouse items from API
  const fetchWarehouseItems = async () => {
    try {
      console.log('🔄 Refreshing warehouse items...'); // Debug log
      const response = await fetch(`${API_BASE_URL}/api/state/warehouse`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const warehouseProducts = await response.json();
      console.log('✅ Warehouse items refreshed:', warehouseProducts?.length || 0, 'items'); // Debug log
      
      setWarehouseItems(warehouseProducts);
      setFilteredWarehouseItems(warehouseProducts);
    } catch (error) {
      console.error('Error fetching warehouse items:', error);
    }
  };

  // Fetch sales from API
  const fetchSales = async () => {
    try {
      console.log('🔄 Refreshing sales data...'); // Debug log
      const response = await fetch(`${API_BASE_URL}/api/sales/get-all-sales`);
      const data = await response.json();
      setSales(data || []);
      console.log('✅ Sales data refreshed:', data?.length || 0, 'items'); // Debug log
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  // Fetch all states from API (for checking if sold items still exist)
  const fetchAllStates = async () => {
    try {
      console.log('🔄 Refreshing all states data...'); // Debug log
      const response = await fetch(`${API_BASE_URL}/api/state`);
      const data = await response.json();
      setAllStates(data || []);
      console.log('✅ All states data refreshed:', data?.length || 0, 'items'); // Debug log
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
      console.log('👤 User changed to:', selectedUser, '- refreshing data...');
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
      console.log('📅 Date changed to:', selectedDate, '- refreshing data...');
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
      console.log('Checking last transaction...'); // Debug log
      const response = await fetch(`${API_BASE_URL}/api/transfer/last-transaction`);
      if (response.ok) {
        const data = await response.json();
        console.log('Last transaction data:', data); // Debug log
        setLastTransaction(data);
        setCanUndoTransaction(data.canUndo);
      } else if (response.status === 404) {
        console.log('No last transaction found (404)'); // Debug log
        setLastTransaction(null);
        setCanUndoTransaction(false);
      } else {
        console.log('Server error checking transaction:', response.status); // Debug log
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
          console.log(`🔍 Transfer ${transfer.fullName} (ID: ${transfer._id}) processed: ${isProcessed}`);
          return !isProcessed; // Pokazuj tylko nieprzetworzone (jak sprzedaże)
        });
        
        console.log('🎯 Transfers after processing filter:', filtered.length);

        // Filtruj sprzedaże - pokaż tylko te z wybranego stanu (from)
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
          const isProcessed = processedSales.has(sale._id);
          console.log(`🔍 Sale ${sale.barcode} (ID: ${sale._id}) processed: ${isProcessed}`);
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
      }
    }

    // Połącz sprzedaże (na górze) z transferami (na dole)
    const combinedItems = [...salesItems, ...filtered];
    console.log('🔍 Combined items for rendering:', combinedItems.map(item => ({
      id: item._id,
      isFromSale: item.isFromSale,
      fullName: item.fullName,
      size: item.size,
      processed: item.processed, // DEBUG: Show processed flag
      fullNameType: typeof item.fullName,
      sizeType: typeof item.size
    })));
    setFilteredItems(combinedItems);
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
    setSelectedUser(e.target.value);
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
    console.log('Moving item from warehouse to transfers:', warehouseItem);
    
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
    
    console.log('Item moved to transfers table');
  };

  // Funkcja cofania produktu z tabeli transferów z powrotem do magazynu
  const handleReturnToWarehouse = (transferItem) => {
    console.log('Returning item to warehouse:', transferItem);
    
    // Sprawdź czy to jest produkt z magazynu
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
    
    console.log('Item returned to warehouse');
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
        console.log('Missing items detected:', missingItems);
        console.log('Sending corrections data:', JSON.stringify(missingItems, null, 2));
        
        const correctionsResponse = await fetch(`${API_BASE_URL}/api/corrections/multiple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(missingItems),
        });
        
        console.log('Corrections response status:', correctionsResponse.status);
        console.log('Corrections response ok:', correctionsResponse.ok);
        
        if (correctionsResponse.ok) {
          console.log('Corrections saved successfully');
          
          // NOWE: Usuń brakujące produkty z oryginalnych tabel (transfers/sales)
          console.log('🗑️ Deleting missing items from original tables...');
          
          for (const missingItem of missingItems) {
            // Znajdź WSZYSTKIE oryginalne itemy w itemsToCheck (nie tylko pierwszy!)
            const originalItems = itemsToCheck.filter(item => 
              item.barcode === missingItem.barcode &&
              item.fullName === missingItem.fullName &&
              item.size === missingItem.size
            );
            
            console.log(`🔍 Found ${originalItems.length} items to delete for ${missingItem.fullName} ${missingItem.size}`);
            
            // Usuń WSZYSTKIE znalezione itemy
            for (const originalItem of originalItems) {
              if (originalItem && originalItem._id) {
              try {
                if (originalItem.isFromSale) {
                  // Usuń sprzedaż
                  console.log(`�️ Deleting sale: ${originalItem._id}`);
                  const deleteResponse = await fetch(`${API_BASE_URL}/api/sales/delete-sale/${originalItem._id}`, {
                    method: 'DELETE'
                  });
                  
                  if (deleteResponse.ok) {
                    console.log(`✅ Sale deleted successfully: ${originalItem._id}`);
                  } else {
                    console.error(`❌ Failed to delete sale: ${originalItem._id}`);
                  }
                } else {
                  // Usuń transfer
                  console.log(`🗑️ Deleting transfer: ${originalItem._id}`);
                  const deleteResponse = await fetch(`${API_BASE_URL}/api/transfer/${originalItem._id}`, {
                    method: 'DELETE'
                  });
                  
                  if (deleteResponse.ok) {
                    console.log(`✅ Transfer deleted successfully: ${originalItem._id}`);
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
    if (!Array.isArray(filteredItems) || filteredItems.length === 0) {
      alert('Brak transferów do przetworzenia');
      return;
    }

    try {
      // Rozdziel produkty według typu - DODANO obsługę ZIELONYCH produktów
      const warehouseItems = filteredItems.filter(item => item.fromWarehouse && !item.isFromSale && !isProductMatched(item._id, 'transfer'));
      
      // ZIELONE transfery standardowe (sparowane) - wymagają operacji podwójnej  
      const greenStandardTransfers = filteredItems.filter(item => !item.fromWarehouse && !item.isFromSale && isProductMatched(item._id, 'transfer'));
      
      // ZIELONE sprzedaże (sparowane) - wymagają operacji podwójnej
      const greenSalesItems = filteredItems.filter(item => item.isFromSale && isProductMatched(item._id, 'sale'));
      
      const standardTransfers = filteredItems.filter(item => !item.fromWarehouse && !item.isFromSale && !isProductMatched(item._id, 'transfer'));
      const salesItems = filteredItems.filter(item => item.isFromSale && !isProductMatched(item._id, 'sale'));

      // Wygeneruj wspólny transactionId dla całej operacji
      const sharedTransactionId = Date.now().toString() + 'x' + Math.random().toString(36).substr(2, 9);
      console.log('Generated shared transactionId:', sharedTransactionId);

      let processedCount = 0;

      // 1. Przetwórz produkty z magazynu - dodaj do stanu użytkownika
      if (warehouseItems.length > 0) {
        console.log('Processing warehouse items:', warehouseItems);
        
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
          console.log('Warehouse items processed successfully');
        } else {
          console.error('Failed to process warehouse items');
        }
      }

      // 🟢 2. ZIELONE PRODUKTY - Operacja podwójna (niebieski + pomarańczowy)
      let greenProcessedCount = 0;
      let greenMissingCount = 0;
      const allGreenItems = [...greenStandardTransfers, ...greenSalesItems];
      
      if (allGreenItems.length > 0) {
        console.log('🟢 Processing GREEN products (double operation):', allGreenItems);
        
        // Znajdź obiekt użytkownika na podstawie selectedUser ID
        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        // KROK 1 dla każdego zielonego produktu: Operacja NIEBIESKA (odpisanie ze stanu)
        for (const greenItem of allGreenItems) {
          try {
            console.log(`🟢 Processing green item ${greenItem._id} - Step 1: Blue operation (write-off)`);
            
            // Sprawdź czy produkt istnieje w stanie przed odpisaniem
            const checkResult = await checkForMissingItems([greenItem], userSymbol, sellingPoint, sharedTransactionId);
            
            if (checkResult.availableItems.length === 0) {
              // Produkt nie istnieje w stanie - przejdź do korekt
              console.log(`🟢 Green item ${greenItem._id} - missing in state, sent to corrections`);
              greenMissingCount++;
              continue; // Pomiń ten produkt - nie wykonuj operacji pomarańczowej
            }
            
            // Wykonaj operację niebieską (odpisanie ze stanu)
            let blueOperationSuccess = false;
            
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
                blueOperationSuccess = true;
                console.log(`🟢 Green item ${greenItem._id} - Blue operation (sales) successful`);
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
                blueOperationSuccess = true;
                console.log(`🟢 Green item ${greenItem._id} - Blue operation (transfer) successful`);
              }
            }
            
            // KROK 2: Operacja POMARAŃCZOWA (przeniesienie z magazynu) - tylko jeśli operacja niebieska się udała
            if (blueOperationSuccess) {
              console.log(`🟢 Green item ${greenItem._id} - Step 2: Orange operation (warehouse transfer)`);
              
              // Znajdź sparowany produkt z magazynu
              const matchedPair = matchedPairs.find(pair => 
                pair.blueProduct.id === greenItem._id && 
                pair.blueProduct.type === (greenItem.isFromSale ? 'sale' : 'transfer')
              );
              
              if (matchedPair && matchedPair.warehouseProduct) {
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
                
                if (warehouseResponse.ok) {
                  greenProcessedCount++;
                  console.log(`🟢 Green item ${greenItem._id} - Orange operation successful - DOUBLE OPERATION COMPLETE`);
                  
                  // Oznacz jako przetworzone
                  if (greenItem.isFromSale) {
                    setProcessedSales(prev => new Set([...prev, greenItem._id]));
                  } else {
                    setProcessedTransfers(prev => new Set([...prev, greenItem._id]));
                  }
                } else {
                  console.error(`🟢 Green item ${greenItem._id} - Orange operation failed`);
                }
              } else {
                console.error(`🟢 Green item ${greenItem._id} - No matched warehouse product found`);
              }
            } else {
              console.error(`🟢 Green item ${greenItem._id} - Blue operation failed, skipping orange operation`);
            }
            
          } catch (error) {
            console.error(`🟢 Error processing green item ${greenItem._id}:`, error);
          }
        }
        
        console.log(`🟢 Green products processing complete: ${greenProcessedCount} successful, ${greenMissingCount} missing`);
      }

      // 3. Przetwórz standardowe transfery - sprawdź braki w stanie
      let validStandardTransfers = standardTransfers;
      let standardTransfersMissingCount = 0;
      
      if (standardTransfers.length > 0) {
        console.log('Checking standard transfers for missing items...');
        
        // Znajdź obiekt użytkownika na podstawie selectedUser ID
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
              transactionId: sharedTransactionId // Przekaż wspólny transactionId
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
            console.error('Error processing standard transfers');
          }
        }
      }

      // 4. Przetwórz sprzedaże - sprawdź braki w stanie przed odpisaniem
      let validSalesItems = salesItems;
      let salesMissingCount = 0;
      
      if (salesItems.length > 0) {
        console.log('Checking sales items for missing items...');
        
        // Znajdź obiekt użytkownika na podstawie selectedUser ID
        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        console.log('Selected user object:', selectedUserObject);
        console.log('User symbol:', userSymbol);
        console.log('Selling point:', sellingPoint);
        
        const checkResult = await checkForMissingItems(salesItems, userSymbol, sellingPoint, sharedTransactionId);
        validSalesItems = checkResult.availableItems;
        salesMissingCount = checkResult.missingCount;
        
        if (validSalesItems.length > 0) {
          console.log('Processing valid sales items:', validSalesItems);
          console.log('Valid sales items count:', validSalesItems.length);
          
          const salesResponse = await fetch(`${API_BASE_URL}/api/transfer/process-sales`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              salesItems: validSalesItems,
              selectedUser: selectedUser,
              transactionId: sharedTransactionId // Przekaż wspólny transactionId
            }),
          });

          console.log('Sales response status:', salesResponse.status);
          console.log('Sales response ok:', salesResponse.ok);

          if (salesResponse.ok) {
            const salesResult = await salesResponse.json();
            console.log('Sales result:', JSON.stringify(salesResult, null, 2));
            processedCount += salesResult.processedCount || validSalesItems.length;
            console.log('Sales items processed successfully');
            
            // Oznacz sprzedaże jako przetworzone
            validSalesItems.forEach(sale => {
              setProcessedSales(prev => new Set([...prev, sale._id]));
            });
          } else {
            console.error('Failed to process sales items');
            const errorText = await salesResponse.text();
            console.error('Sales processing error:', errorText);
          }
        } else {
          console.log('No valid sales items to process after missing items check');
        }
      } else {
        console.log('No sales items to process');
      }

      // Przygotuj szczegółowy komunikat z informacjami o brakach
      const totalMissingCount = standardTransfersMissingCount + salesMissingCount + greenMissingCount;
      let alertMessage = `✅ OPERACJA ZAKOŃCZONA\n\n`;
      alertMessage += `Przetworzono ${processedCount + greenProcessedCount} elementów:\n`;
      alertMessage += `- ${warehouseItems.length} produktów z magazynu dodano do stanu\n`;
      alertMessage += `- ${greenProcessedCount} zielonych produktów przetworzono (operacja podwójna)\n`;
      alertMessage += `- ${validStandardTransfers.length} standardowych transferów odpisano ze stanu\n`;
      alertMessage += `- ${validSalesItems.length} sprzedaży odpisano ze stanu\n`;
      
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
      console.log('🔄 Refreshing all data after processing transfers...');
      await fetchAllStates(); // Najpierw odśwież stany
      await fetchTransfers();
      await fetchWarehouseItems();
      await fetchSales(); // Dodaj odświeżanie sprzedaży
      console.log('✅ All data refreshed after processing');
      
      // Reset synchronizacji po przetworzeniu - wszystkie produkty wrócą do normalnego stanu
      console.log('🔄 Resetting synchronization state after processing...');
      setMatchedPairs([]);
      setGreyedWarehouseItems(new Set());
      console.log('✅ Synchronization state reset - all products back to normal colors');
      
      // Sprawdź ostatnią transakcję
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
        console.log('Undo result:', result);
        
        // Sprawdź czy cofnięte produkty zawierały elementy z magazynu
        if (result.warehouseItems && result.warehouseItems.length > 0) {
          console.log('Restoring warehouse items:', result.warehouseItems);
          
          // Przywróć produkty z magazynu wizualnie do lewej strony
          for (const item of result.warehouseItems) {
            // Usuń produkt ze stanu użytkownika (fizycznie)
            try {
              await fetch(`${API_BASE_URL}/api/state/${item.stateId}`, {
                method: 'DELETE'
              });
              console.log(`Removed state item ${item.stateId} from user state`);
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
        console.log('🔄 Refreshing all data after undo...');
        console.log('🧹 Clearing processedSales and processedTransfers before refresh');
        setProcessedSales(new Set()); // Reset przetworzonych sprzedaży po cofnięciu transakcji
        setProcessedTransfers(new Set()); // Reset przetworzonych transferów po cofnięciu transakcji
        
        // 🟢 Reset synchronizacji po cofnięciu transakcji (zielone produkty wrócą do niebieskich)
        setMatchedPairs([]);
        setGreyedWarehouseItems(new Set());
        console.log('🟢 Synchronization reset after undo - green products restored to blue');
        
        await fetchAllStates(); // Najpierw odśwież stany
        await fetchTransfers();
        await fetchWarehouseItems();
        await fetchSales(); // Dodaj odświeżanie sprzedaży
        console.log('✅ All data refreshed after undo');
        
        // Odśwież stan po cofnięciu
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
      console.log('🗑️ Usuwam ze stanu:', transfer);
      
      // Remove the product from state based on transfer data
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
        
        console.log('✅ Pomyślnie usunięto ze stanu');
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
      console.log('🔄 SYNCHRONIZACJA: Rozpoczynam synchronizację...');
      
      // 🔄 RESET stanu synchronizacji przed nową synchronizacją
      console.log('🔄 RESET: Czyszczenie poprzednich wyników synchronizacji...');
      setMatchedPairs([]);
      setGreyedWarehouseItems(new Set());
      
      console.log('📊 DANE WEJŚCIOWE:');
      console.log('   - FilteredItems:', filteredItems?.length || 0, 'items');
      console.log('   - Warehouse:', filteredWarehouseItems?.length || 0, 'items');
      console.log('   - Raw sales data:', sales?.length || 0, 'items');
      console.log('   - Raw transfers data:', transfers?.length || 0, 'items');
      console.log('   - Selected date:', selectedDate);
      console.log('   - Selected user:', selectedUser);
      
      // Debug filtrowania
      console.log('🔍 ANALIZA FILTROWANIA:');
      if (sales && sales.length > 0) {
        sales.forEach((sale, index) => {
          const dateMatch = !selectedDate || sale.date?.startsWith(selectedDate);
          const userMatch = !selectedUser || sale.user === selectedUser;
          const isProcessed = processedSales.has(sale._id);
          
          console.log(`   Sale ${index + 1}: ${sale.fullName} ${sale.size} (${sale._id})`);
          console.log(`      Date: ${sale.date} | Match: ${dateMatch}`);
          console.log(`      User: ${sale.user} | Match: ${userMatch}`);
          console.log(`      Processed: ${isProcessed}`);
          console.log(`      Should be included: ${dateMatch && userMatch && !isProcessed}`);
        });
      }
      
      // Pobierz listę niebieskich produktów z WIDOCZNYCH elementów (po filtrach)
      const blueProducts = [];
      
      // Dodaj produkty ze sprzedaży i transferów z filteredItems
      if (filteredItems && filteredItems.length > 0) {
        console.log('📋 PRZETWARZANIE WIDOCZNYCH PRODUKTÓW:');
        filteredItems.forEach((item, index) => {
          console.log(`   Produkt ${index + 1}:`, {
            id: item._id,
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode || item.productId,
            isFromSale: item.isFromSale,
            fromWarehouse: item.fromWarehouse
          });
          
          // Tylko niebieskie produkty (nie z magazynu)
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
      
      console.log('📊 NIEBIESKIE PRODUKTY (do sparowania):', blueProducts.length);
      blueProducts.forEach((bp, i) => {
        console.log(`   ${i + 1}. ${bp.fullName} ${bp.size} - ${bp.barcode} (${bp.type})`);
      });
      
      // Przygotuj pomarańczowe produkty (magazyn) z filteredWarehouseItems
      let orangeProducts = [];
      
      console.log('🔍 DEBUGOWANIE PRODUKTÓW MAGAZYNOWYCH:');
      console.log('   filteredWarehouseItems:', filteredWarehouseItems);
      
      if (Array.isArray(filteredWarehouseItems)) {
        filteredWarehouseItems.forEach((warehouse, index) => {
          console.log(`   Produkt magazynowy ${index + 1}:`, warehouse);
          console.log(`   ID: ${warehouse._id}, barcode: ${warehouse.barcode}`);
          
          const backgroundColor = getBackgroundColor(warehouse, true, false); // magazyn: z magazynu, nie sprzedaż
          console.log(`   Kolor tła: ${backgroundColor}`);
          
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
      
      console.log('🧡 POMARAŃCZOWE PRODUKTY (do sparowania):', orangeProducts.length);
      orangeProducts.forEach((op, i) => {
        console.log(`   ${i + 1}. ${op.fullName} ${op.size} - ${op.barcode} (${op.type})`);
      });

      // GŁÓWNY ALGORYTM PAROWANIA
      console.log('\n🔄 ROZPOCZYNAM PAROWANIE...');
      
      const newPairs = [];
      const pairedBlueIndexes = new Set();
      const pairedOrangeIndexes = new Set();

      for (let b = 0; b < blueProducts.length; b++) {
        if (pairedBlueIndexes.has(b)) continue;

        const blueProduct = blueProducts[b];
        console.log(`\n🔍 Szukam pary dla niebieskiego produktu ${b + 1}: ${blueProduct.fullName} ${blueProduct.size} (${blueProduct.barcode})`);

        for (let o = 0; o < orangeProducts.length; o++) {
          if (pairedOrangeIndexes.has(o)) continue;

          const orangeProduct = orangeProducts[o];
          console.log(`   🧪 Sprawdzam pomarańczowy ${o + 1}: ${orangeProduct.fullName} ${orangeProduct.size} (${orangeProduct.barcode})`);

          // Sprawdź czy produkty pasują do siebie (barcode, nazwa, rozmiar)
          const barcodeMatch = blueProduct.barcode === orangeProduct.barcode;
          const nameMatch = blueProduct.fullName === orangeProduct.fullName;
          const sizeMatch = blueProduct.size === orangeProduct.size;
          const isMatched = barcodeMatch && nameMatch && sizeMatch;
          
          console.log(`      Dopasowania: barcode=${barcodeMatch}, nazwa=${nameMatch}, rozmiar=${sizeMatch} → ${isMatched}`);
          
          if (isMatched) {
            console.log(`   ✅ ZNALEZIONO PARĘ! Niebieski ${b + 1} ↔ Pomarańczowy ${o + 1}`);
            console.log(`      🔍 IDs: Blue=${blueProduct.source._id}, Orange=${orangeProduct.source._id}`);
            
            // Sprawdź czy ta para już istnieje
            const existingPair = newPairs.find(pair => 
              pair.warehouseProduct._id === orangeProduct.source._id
            );
            
            if (existingPair) {
              console.log(`   ⚠️ UWAGA: Produkt z magazynu ${orangeProduct.source._id} już został sparowany!`);
              console.log(`      Pomijam duplikat...`);
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
            console.log(`   ❌ Nie pasuje`);
          }
        }

        if (!pairedBlueIndexes.has(b)) {
          console.log(`   😞 Brak pary dla niebieskiego produktu ${b + 1}`);
        }
      }

      console.log(`\n🎯 WYNIKI PAROWANIA:`);
      console.log(`   Znaleziono ${newPairs.length} nowych par`);
      console.log(`   Sparowane niebieskie produkty: ${pairedBlueIndexes.size}/${blueProducts.length}`);
      console.log(`   Sparowane pomarańczowe produkty: ${pairedOrangeIndexes.size}/${orangeProducts.length}`);

      if (newPairs.length > 0) {
        console.log('\n📝 SZCZEGÓŁY NOWYCH PAR:');
        newPairs.forEach((pair, index) => {
          console.log(`   Para ${index + 1}:`, pair);
        });

        setMatchedPairs(prevPairs => {
          const updatedPairs = [...prevPairs, ...newPairs];
          console.log('\n💾 AKTUALIZACJA STANU - nowa lista par:', updatedPairs);
          return updatedPairs;
        });

        // Wyszarzenie produktów z magazynu które zostały sparowane
        const warehouseIdsToGrey = newPairs.map(pair => pair.warehouseProduct._id);
        console.log('\n🔒 WYSZARZANIE PRODUKTÓW Z MAGAZYNU:', warehouseIdsToGrey);
        
        // Debug dla każdej pary
        newPairs.forEach((pair, index) => {
          console.log(`   Para ${index + 1}:`, {
            blueId: pair.blueProduct.id,
            blueName: pair.blueProduct.fullName,
            blueSize: pair.blueProduct.size,
            warehouseId: pair.warehouseProduct._id,
            warehouseName: pair.warehouseProduct.fullName,
            warehouseSize: pair.warehouseProduct.size
          });
        });
        
        setGreyedWarehouseItems(prevGreyed => {
          const newGreyed = new Set([...prevGreyed, ...warehouseIdsToGrey]);
          console.log('   Stary stan wyszarzonych:', Array.from(prevGreyed));
          console.log('   Dodaję do wyszarzonych:', warehouseIdsToGrey);
          console.log('   Nowy stan wyszarzonych produktów:', Array.from(newGreyed));
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
    <div style={{ display: 'flex', height: '100vh', gap: '20px' }}>
      {/* LEWA STRONA - Miejsce na nową funkcjonalność */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        borderRight: '2px solid #ddd',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
          📦 Magazyn
        </h2>
        
        {/* Wyszukiwarka magazynu */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="warehouseSearch" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
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
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Znaleziono: {filteredWarehouseItems.length} produktów
            {console.log('Rendering warehouse items:', filteredWarehouseItems)}
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
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
          Mechanizm Transferów
        </h2>
        
        <form>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="datepicker">Select Date:</label>
            <input
              id="datepicker"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="userselect">Select User:</label>
            <select
              id="userselect"
              value={selectedUser}
              onChange={handleUserChange}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="">-- Select User --</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.symbol} - {user.sellingPoint || user.email}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Przyciski Synchronizacji */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={handleSynchronize}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginRight: '10px'
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
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
            title="Resetuj synchronizację - przywróć domyślne kolory"
          >
            🔄 Reset synchronizacji
          </button>
        </div>

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
              marginRight: '10px'
            }}
            disabled={!Array.isArray(filteredItems) || filteredItems.length === 0}
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
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              title={`Cofnij transakcję z ${new Date(lastTransaction.timestamp).toLocaleString()}`}
            >
              ⟲ Anuluj ostatnią transakcję ({lastTransaction.itemCount} produktów)
            </button>
          )}
          {/* Debug info - remove in production */}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Debug: canUndo={canUndoTransaction ? 'true' : 'false'}, hasTransaction={lastTransaction ? 'true' : 'false'}
            {lastTransaction && `, transactionId=${lastTransaction.transactionId}`}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>Transfery</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Full Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Size</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>From</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>To</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Product ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reason</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Advance Payment</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
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
                  backgroundColor: getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale),
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
                    {transfer.isFromSale ? transfer.barcode || 'N/A' : transfer.productId || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? 'SPRZEDAŻ' : (transfer.reason || 'N/A')}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? 
                      `${transfer.cash?.[0]?.price || 0} PLN` : 
                      `${transfer.advancePayment || ''} ${transfer.advancePaymentCurrency || ''}`.trim() || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ffffff', padding: '8px' }}>
                    {transfer.isFromSale ? (
                      // Dla sprzedaży - brak przycisków akcji (nie można cofnąć sprzedaży tutaj)
                      <span style={{ fontStyle: 'italic' }}>Sprzedano</span>
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
                      const backgroundColor = getBackgroundColor(transfer, transfer.fromWarehouse, transfer.isFromSale);
                      const isBlue = backgroundColor === '#007bff';
                      const isGreen = backgroundColor === '#28a745';
                      
                      if (isBlue || isGreen) {
                        return (
                          <button 
                            onClick={() => {
                              if (isGreen) {
                                // Zielone produkty: najpierw usuń ze stanu, potem dodaj do magazynu
                                console.log('🟢 Kliknięto zielony produkt - wykonuję podwójną akcję');
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
                              } else {
                                // Niebieskie produkty: tylko usuń ze stanu
                                console.log('🔵 Kliknięto niebieski produkt - usuwam ze stanu');
                                handleRemoveFromState(transfer);
                              }
                            }}
                            style={{
                              backgroundColor: isGreen ? '#28a745' : '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title={isGreen ? "Sparowany: usuń ze stanu i dodaj z magazynu" : "Usuń ze stanu"}
                          >
                            {isGreen ? '🔄 Sparowany' : '❌ Usuń'}
                          </button>
                        );
                      } else {
                        // Brak akcji dla innych transferów
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

export default AddToState;

