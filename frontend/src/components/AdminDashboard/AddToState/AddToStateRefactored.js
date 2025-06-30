import React, { useState, useEffect, forwardRef, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import styles from './AddToState.module.css';
import { useAddToStateLogic } from './useAddToStateLogic';
import { formatDateForDisplay, generateTransactionId, getUserSymbol, filterItemsBySearchTerm, getItemColorClass, calculateTotals } from './utils';
import OperationControls from './OperationControls';
import ActionButtons from './ActionButtons';
import TransactionHistoryModal from './TransactionHistoryModal';
import TransactionReportModal from './TransactionReportModal';
import BalanceReportModal from './BalanceReportModal';

// Register Polish locale
registerLocale('pl', pl);

const AddToState = () => {
  // Use custom hook for state management and logic
  const {
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
    setMagazynItems,
    setSalesData,
    setSelectedDate,
    setSelectedSellingPoint,
    setTargetSellingPoint,
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
    handleOperationTypeChange,
    toggleItemSynchronization,
    addItemFromMagazyn,
    removeManuallyAddedItem,
    loadTransactionHistory,
    saveTransactionToDatabase,
    deactivateTransactionInDatabase
  } = useAddToStateLogic();

  // Additional state for features not in the hook yet
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());
  const [printer, setPrinter] = useState(null);
  const [printerError, setPrinterError] = useState(null);
  const [showTransactionReport, setShowTransactionReport] = useState(false);
  const [selectedTransactionForReport, setSelectedTransactionForReport] = useState(null);

  // Handle save items transaction
  const handleSaveItems = async () => {
    if (isTransactionInProgress) return;

    if (operationType === 'sprzedaz' && !selectedSellingPoint) {
      alert('Proszę wybrać punkt sprzedaży');
      return;
    }

    if (operationType === 'przepisanie' && !targetSellingPoint) {
      alert('Proszę wybrać docelowy punkt sprzedaży');
      return;
    }

    const hasItemsToProcess = filteredSales.some(item => synchronizedItems.has(item._id)) || manuallyAddedItems.length > 0;
    
    if (!hasItemsToProcess) {
      alert('Nie ma żadnych przedmiotów do przetworzenia');
      return;
    }

    setIsTransactionInProgress(true);

    try {
      const transactionId = generateTransactionId();
      const processedItems = [];
      const blueItems = new Set();
      const greenItems = new Set();
      const orangeItems = new Set();

      // Process synchronized items from sales
      filteredSales.forEach(item => {
        if (synchronizedItems.has(item._id)) {
          if (operationType === 'sprzedaz') {
            blueItems.add(item._id);
          } else if (operationType === 'przepisanie') {
            greenItems.add(item._id);
          }
          
          processedItems.push({
            ...item,
            processType: operationType === 'sprzedaz' ? 'sold' : 'synchronized',
            originalSymbol: getUserSymbol(usersData, item.username),
            sellingPoint: operationType === 'sprzedaz' ? selectedSellingPoint : targetSellingPoint
          });
        }
      });

      // Process manually added items from magazyn
      manuallyAddedItems.forEach(item => {
        orangeItems.add(item._id);
        processedItems.push({
          ...item,
          processType: 'transferred',
          originalSymbol: 'MAGAZYN',
          sellingPoint: operationType === 'sprzedaz' ? selectedSellingPoint : targetSellingPoint
        });
      });

      // Create transaction details
      const transactionDetails = {
        transactionId,
        timestamp: new Date().toISOString(),
        operationType,
        sellingPoint: selectedSellingPoint,
        targetSellingPoint,
        processedItems,
        totalItems: processedItems.length
      };

      // Execute operations
      const actualTargetSymbol = operationType === 'sprzedaz' ? selectedSellingPoint : targetSellingPoint;

      // Process blue items (sales)
      const bluePromises = Array.from(blueItems).map(async (itemId) => {
        try {
          await axios.delete(`/api/state/${itemId}`, {
            headers: {
              'target-symbol': actualTargetSymbol,
              'operation-type': 'sale',
              'transactionid': transactionId
            }
          });
        } catch (error) {
          console.error(`Error processing blue item ${itemId}:`, error);
          if (error.response && error.response.status === 404) {
            console.warn(`Blue item ${itemId} not found - may have been already processed`);
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
              'target-symbol': actualTargetSymbol,
              'operation-type': 'transfer-same',
              'transactionid': transactionId
            }
          });
        } catch (error) {
          console.error(`Error transferring green item ${itemId}:`, error);
          if (error.response && error.response.status === 404) {
            console.warn(`Green item ${itemId} not found - may have been already processed`);
          } else {
            throw error;
          }
        }
      });

      // Process orange items (transfer from MAGAZYN to target point)
      const orangePromises = Array.from(orangeItems).map(async (itemId) => {
        try {
          // First, get the item data before deleting it
          const magazynItem = magazynItems.find(item => item.id === itemId || item._id === itemId);
          if (!magazynItem) {
            console.warn(`Magazyn item ${itemId} not found in refactored component`);
            return;
          }

          // Step 1: Delete from MAGAZYN
          await axios.delete(`/api/state/${itemId}`, {
            headers: {
              'target-symbol': actualTargetSymbol,
              'operation-type': 'transfer-from-magazyn',
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
            operationType: `transfer-orange-refactored-${operationType}`
          };

          await axios.post('/api/state/restore-silent', restoreData);
          console.log(`Successfully transferred orange item ${itemId} from MAGAZYN to ${actualTargetSymbol} (refactored ${operationType} mode)`);

        } catch (error) {
          console.error(`Error transferring orange item ${itemId}:`, error);
          if (error.response && error.response.status === 404) {
            console.warn(`Orange item ${itemId} not found - may have been already processed`);
          } else {
            throw error;
          }
        }
      });

      // Wait for all operations to complete
      await Promise.all([...bluePromises, ...greenPromises, ...orangePromises]);

      // Save transaction to database
      await saveTransactionToDatabase(transactionDetails);

      // Store items for display
      const itemsForDisplay = processedItems.map(item => ({
        ...item,
        isProcessed: true
      }));

      setSavedItemsForDisplay(itemsForDisplay);
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

  // Handle undo transaction
  const handleUndoTransaction = async (transaction) => {
    if (!transaction || isTransactionInProgress) return;
    
    setIsTransactionInProgress(true);
    
    try {
      // Restore items to their original state
      const restorePromises = [];
      
      for (const item of transaction.processedItems) {
        let restoreData;
        let targetSymbol;
        
        if (item.processType === 'sold') {
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
      
      await Promise.all(restorePromises);
      
      // Delete history records
      try {
        await axios.delete(`/api/history/by-transaction/${transaction.transactionId}`, {
          headers: {
            'transactionid': transaction.transactionId
          }
        });
      } catch (deleteError) {
        console.error('Could not delete history records');
      }
      
      // Delete the transaction itself
      await deactivateTransactionInDatabase(transaction.transactionId);
      
      // Refresh data
      const salesResponse = await axios.get('/api/sales/get-all-sales');
      setSalesData(salesResponse.data);
      
      const stateResponse = await axios.get('/api/state');
      const magazynData = stateResponse.data.filter(item => item.symbol === 'MAGAZYN');
      setMagazynItems(magazynData);
      
      alert(`Transakcja z ${formatDateForDisplay(transaction.timestamp)} została anulowana!`);
      
    } catch (error) {
      console.error('Error undoing transaction:', error);
      alert('Błąd podczas anulowania transakcji.');
    } finally {
      setIsTransactionInProgress(false);
    }
  };

  // Clear storage function
  const clearPersistentStorage = async () => {
    try {
      await axios.post('/api/transaction-history/clear-old');
      localStorage.removeItem('addToState_persistentView');
      
      // Reset states
      setSynchronizedItems(new Set());
      setManuallyAddedItems([]);
      setAddedMagazynIds(new Set());
      setSavedItemsForDisplay([]);
      setIsTransactionSaved(false);
      
      await loadTransactionHistory();
      setShowClearStorageInfo(false);
      alert('Pamięć została wyczyszczona!');
    } catch (error) {
      console.error('Error clearing storage:', error);
      alert('Błąd podczas czyszczenia pamięci.');
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

  // Generate balance report
  const generateBalanceReport = async () => {
    setIsGeneratingBalance(true);
    try {
      const response = await axios.get('/api/reports/balance');
      setBalanceData(response.data);
      setShowBalanceModal(true);
    } catch (error) {
      console.error('Error generating balance report:', error);
      alert('Błąd podczas generowania raportu bilansowego');
    } finally {
      setIsGeneratingBalance(false);
    }
  };

  // Print balance report
  const printBalanceReport = () => {
    if (!balanceData) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Raport Bilansowy</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Raport Bilansowy - ${formatDateForDisplay(balanceData.reportDate)}</h1>
          <div class="summary">
            <h3>Podsumowanie</h3>
            <p>Łączna liczba przedmiotów: ${balanceData.summary?.totalItems || 0}</p>
            <p>Łączna wartość: ${balanceData.summary?.totalValue?.toFixed(2) || '0.00'} zł</p>
            <p>Punkty sprzedaży: ${balanceData.summary?.sellingPointsCount || 0}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Filter magazyn items by search term
  const filteredMagazynItems = filterItemsBySearchTerm(magazynItems, magazynSearchTerm);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>Ładowanie danych...</div>
        <div className="spinner-border text-light mt-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div>
      <style>
        {`
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
        `}
      </style>

      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
            {operationType === 'sprzedaz' ? 'SPRZEDAŻ' : 'PRZEPISANIE'} PRZEDMIOTÓW
          </h2>
          
          <OperationControls
            operationType={operationType}
            setOperationType={setOperationType}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedSellingPoint={selectedSellingPoint}
            setSelectedSellingPoint={setSelectedSellingPoint}
            targetSellingPoint={targetSellingPoint}
            setTargetSellingPoint={setTargetSellingPoint}
            sellingPoints={sellingPoints}
            handleOperationTypeChange={handleOperationTypeChange}
            isMobile={isMobile}
          />
          
          <ActionButtons
            filteredSales={filteredSales}
            manuallyAddedItems={manuallyAddedItems}
            synchronizedItems={synchronizedItems}
            isTransactionInProgress={isTransactionInProgress}
            handleSaveItems={handleSaveItems}
            setShowHistoryModal={setShowHistoryModal}
            handleClearStorageClick={handleClearStorageClick}
            generateBalanceReport={generateBalanceReport}
            operationType={operationType}
            selectedSellingPoint={selectedSellingPoint}
            targetSellingPoint={targetSellingPoint}
          />
        </div>

        <div className={styles.filtersSection}>
          <input
            type="text"
            placeholder="Szukaj w magazynie..."
            value={magazynSearchTerm}
            onChange={(e) => setMagazynSearchTerm(e.target.value)}
            className={`form-control ${styles.magazynSearchInput}`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid #444',
              color: 'white'
            }}
          />
        </div>

        <div className={styles.tableSection}>
          <div style={{ 
            maxHeight: '500px', 
            overflowY: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <table className="table table-dark table-striped">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Akcja</th>
                  <th>Nazwa</th>
                  <th>Rozmiar</th>
                  <th>Kod kreskowy</th>
                  <th>Cena</th>
                  <th>Cena po rabacie</th>
                </tr>
              </thead>
              <tbody>
                {filteredMagazynItems.map((item) => (
                  <tr 
                    key={item._id}
                    className={getItemColorClass(item, operationType, selectedSellingPoint, targetSellingPoint)}
                  >
                    <td>
                      <button
                        onClick={() => addItemFromMagazyn(item)}
                        className="btn btn-primary btn-sm"
                        disabled={addedMagazynIds.has(item._id)}
                      >
                        {addedMagazynIds.has(item._id) ? 'Dodano' : 'Dodaj'}
                      </button>
                    </td>
                    <td>{item.fullName}</td>
                    <td>{item.size}</td>
                    <td>{item.barcode}</td>
                    <td>{item.price} zł</td>
                    <td>{item.discount_price} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.salesContainer}>
        <div className={styles.headerSection}>
          <h2 style={{ color: 'white', textAlign: 'center' }}>
            {operationType === 'sprzedaz' ? 'SPRZEDANE' : 'DO PRZEPISANIA'}
          </h2>
        </div>

        <div className={styles.tableSection}>
          <div style={{ 
            maxHeight: '500px', 
            overflowY: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <table className="table table-dark table-striped">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Synchronizuj</th>
                  <th>Nazwa</th>
                  <th>Rozmiar</th>
                  <th>Cena</th>
                  <th>Username</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((item) => (
                  <tr 
                    key={item._id}
                    className={synchronizedItems.has(item._id) ? styles.blueItem : ''}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={synchronizedItems.has(item._id)}
                        onChange={() => toggleItemSynchronization(item._id)}
                      />
                    </td>
                    <td>{item.fullName}</td>
                    <td>{item.size}</td>
                    <td>{item.price} zł</td>
                    <td>{item.username}</td>
                  </tr>
                ))}
                
                {manuallyAddedItems.map((item) => (
                  <tr key={`manual-${item._id}`} className={styles.orangeItem}>
                    <td>
                      <button
                        onClick={() => removeManuallyAddedItem(item._id)}
                        className="btn btn-danger btn-sm"
                      >
                        Usuń
                      </button>
                    </td>
                    <td>{item.fullName}</td>
                    <td>{item.size}</td>
                    <td>{item.price} zł</td>
                    <td>MAGAZYN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction summary */}
        {(synchronizedItems.size > 0 || manuallyAddedItems.length > 0) && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #28a745',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '20px',
            color: 'white'
          }}>
            <h6>Podsumowanie transakcji:</h6>
            <p>Łączna liczba przedmiotów: {synchronizedItems.size + manuallyAddedItems.length}</p>
            <p>Ze sprzedaży: {synchronizedItems.size}</p>
            <p>Z magazynu: {manuallyAddedItems.length}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionHistoryModal
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        transactionHistory={transactionHistory}
        historySearchTerm={historySearchTerm}
        setHistorySearchTerm={setHistorySearchTerm}
        expandedTransactions={expandedTransactions}
        setExpandedTransactions={setExpandedTransactions}
        handleUndoTransaction={handleUndoTransaction}
        isTransactionInProgress={isTransactionInProgress}
        onShowTransactionReport={handleShowTransactionReport}
      />

      <TransactionReportModal
        showReportModal={showTransactionReport}
        setShowReportModal={setShowTransactionReport}
        transaction={selectedTransactionForReport}
        usersData={usersData}
      />

      <BalanceReportModal
        showBalanceModal={showBalanceModal}
        setShowBalanceModal={setShowBalanceModal}
        balanceData={balanceData}
        isGeneratingBalance={isGeneratingBalance}
        printBalanceReport={printBalanceReport}
      />

      {/* Clear storage info modal */}
      {showClearStorageInfo && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ width: '500px', height: 'auto' }}>
            <div className={styles.modalHeader}>
              <h5 style={{ margin: 0, color: 'white' }}>Wyczyść pamięć</h5>
              <button
                onClick={() => setShowClearStorageInfo(false)}
                className="btn btn-outline-light btn-sm"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'white' }}>
                Czy chcesz wyczyścić pamięć podręczną i stare transakcje?
                Ta operacja jest nieodwracalna.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={clearPersistentStorage}
                className="btn btn-danger btn-sm"
              >
                Wyczyść
              </button>
              <button
                onClick={() => setShowClearStorageInfo(false)}
                className="btn btn-secondary btn-sm"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToState;
