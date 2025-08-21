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
  const checkForMissingItems = async (itemsToCheck, userSymbol, sellingPoint) => {
    try {
      // Filtruj stan tylko dla wybranego użytkownika
      const userStateItems = allStates.filter(item => item.symbol === userSymbol);
      
      // Lista brakujących kurtek
      const missingItems = [];
      
      // Sprawdź każdą kurtkę czy istnieje w stanie użytkownika
      itemsToCheck.forEach(item => {
        const foundInState = userStateItems.find(stateItem => 
          stateItem.barcode === item.barcode &&
          stateItem.fullName === item.fullName &&
          stateItem.size === item.size
        );
        
        if (!foundInState) {
          const operationType = item.isFromSale ? 'SPRZEDAŻY' : 'TRANSFERU';
          const operationDetails = item.isFromSale 
            ? `sprzedaży za ${item.price || 'N/A'} PLN` 
            : `transferu do punktu ${sellingPoint}`;
          
          const detailedDescription = 
            `🚨 BRAK W STANIE: Próba odpisania kurtki "${item.fullName}" (${item.size}) ` +
            `z punktu "${sellingPoint}" w ramach ${operationDetails}. ` +
            `Kurtka o kodzie ${item.barcode} nie została znaleziona w aktualnym stanie punktu. ` +
            `Możliwe przyczyny: już sprzedana, przeniesiona, zagubiona lub błąd w ewidencji. ` +
            `Data wykrycia: ${new Date().toLocaleString('pl-PL')}.`;
          
          missingItems.push({
            fullName: item.fullName,
            size: item.size,
            barcode: item.barcode,
            sellingPoint: sellingPoint,
            symbol: userSymbol,
            errorType: 'MISSING_IN_STATE',
            attemptedOperation: item.isFromSale ? 'SALE' : 'TRANSFER',
            description: detailedDescription,
            originalPrice: item.price,
            discountPrice: item.discount_price
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
          
          // Pokaż modal z brakującymi kurtkami
          const missingItemsList = missingItems.map(item => 
            `• ${item.fullName} ${item.size} (${item.barcode})`
          ).join('\n');
          
          alert(`⚠️ UWAGA - WYKRYTO BRAKI W STANIE!\n\nNastępujące kurtki nie zostały znalezione w stanie punktu ${sellingPoint}:\n\n${missingItemsList}\n\n✅ Problemy zostały zapisane w tabeli Korekty do rozwiązania.\n\n🔄 Operacja zostanie kontynuowana z dostępnymi kurtkami.`);
          
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
      // Rozdziel produkty według typu
      const warehouseItems = filteredItems.filter(item => item.fromWarehouse && !item.isFromSale);
      const standardTransfers = filteredItems.filter(item => !item.fromWarehouse && !item.isFromSale);
      const salesItems = filteredItems.filter(item => item.isFromSale);

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

      // 2. Przetwórz standardowe transfery - sprawdź braki w stanie
      let validStandardTransfers = standardTransfers;
      let standardTransfersMissingCount = 0;
      
      if (standardTransfers.length > 0) {
        console.log('Checking standard transfers for missing items...');
        
        // Znajdź obiekt użytkownika na podstawie selectedUser ID
        const selectedUserObject = users.find(user => user._id === selectedUser);
        const userSymbol = selectedUserObject?.symbol;
        const sellingPoint = selectedUserObject?.sellingPoint || selectedUserObject?.symbol;
        
        const checkResult = await checkForMissingItems(standardTransfers, userSymbol, sellingPoint);
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

      // 3. Przetwórz sprzedaże - sprawdź braki w stanie przed odpisaniem
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
        
        const checkResult = await checkForMissingItems(salesItems, userSymbol, sellingPoint);
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
      const totalMissingCount = standardTransfersMissingCount + salesMissingCount;
      let alertMessage = `✅ OPERACJA ZAKOŃCZONA\n\n`;
      alertMessage += `Przetworzono ${processedCount} elementów:\n`;
      alertMessage += `- ${warehouseItems.length} produktów z magazynu dodano do stanu\n`;
      alertMessage += `- ${validStandardTransfers.length} standardowych transferów odpisano ze stanu\n`;
      alertMessage += `- ${validSalesItems.length} sprzedaży odpisano ze stanu\n`;
      
      if (totalMissingCount > 0) {
        alertMessage += `\n⚠️ WYKRYTO BRAKI:\n`;
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
        console.log('🧹 Clearing processedSales and processedTransfers before refresh');
        setProcessedSales(new Set()); // Reset przetworzonych sprzedaży po cofnięciu transakcji
        setProcessedTransfers(new Set()); // Reset przetworzonych transferów po cofnięciu transakcji po cofnięciu transakcji
        setProcessedTransfers(new Set()); // Reset przetworzonych transferów po cofnięciu transakcji
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
              {filteredWarehouseItems.map((item) => (
                <tr key={item._id} style={{ 
                  backgroundColor: '#e8f5e8',
                  '&:hover': { backgroundColor: '#d4edda' }
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
                      onClick={() => handleMoveFromWarehouse(item)}
                      style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                      title="Przenieś produkt do obszaru transferów"
                    >
                      � Przenieś
                    </button>
                  </td>
                </tr>
              ))}
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
                  backgroundColor: transfer.isFromSale ? '#007bff' : 
                                  transfer.fromWarehouse ? '#ff8c00' : '#007bff', 
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
                    ) : (
                      // Brak akcji dla standardowych transferów
                      <span style={{ color: '#ccc', fontSize: '12px' }}>
                        -
                      </span>
                    )}
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

