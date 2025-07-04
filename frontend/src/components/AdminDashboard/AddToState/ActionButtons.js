import React from 'react';
import styles from './AddToState.module.css';

const ActionButtons = ({
  filteredSales,
  manuallyAddedItems,
  synchronizedItems,
  isTransactionInProgress,
  handleSaveItems,
  setShowHistoryModal,
  handleClearStorageClick,
  generateBalanceReport,
  operationType,
  selectedSellingPoint,
  targetSellingPoint
}) => {
  const hasItemsToProcess = () => {
    return filteredSales.some(item => synchronizedItems.has(item._id)) || manuallyAddedItems.length > 0;
  };

  const canSaveTransaction = () => {
    if (operationType === 'sprzedaz') {
      return selectedSellingPoint && hasItemsToProcess();
    } else if (operationType === 'przepisanie') {
      return targetSellingPoint && hasItemsToProcess();
    }
    return false;
  };

  return (
    <div className={styles.actionButtons}>
      <button
        onClick={handleSaveItems}
        className="btn btn-success"
        style={{
          opacity: 1,
          cursor: 'pointer'
        }}
      >
        {isTransactionInProgress ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Zapisywanie...
          </>
        ) : (
          `Zapisz ${operationType === 'sprzedaz' ? 'sprzedaż' : 'przepisanie'}`
        )}
      </button>
      
      <button
        onClick={() => setShowHistoryModal(true)}
        className="btn btn-info"
      >
        Historia transakcji
      </button>
      
      <button
        onClick={generateBalanceReport}
        className="btn btn-warning"
      >
        Raport bilansowy
      </button>
      
      <button
        onClick={handleClearStorageClick}
        className="btn btn-outline-danger"
      >
        Wyczyść pamięć
      </button>
    </div>
  );
};

export default ActionButtons;
