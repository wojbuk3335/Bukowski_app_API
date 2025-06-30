import React from 'react';
import { formatDateForDisplay } from './utils';
import styles from './AddToState.module.css';

const TransactionHistoryModal = ({
  showHistoryModal,
  setShowHistoryModal,
  transactionHistory,
  historySearchTerm,
  setHistorySearchTerm,
  expandedTransactions,
  setExpandedTransactions,
  handleUndoTransaction,
  isTransactionInProgress,
  onShowTransactionReport
}) => {
  if (!showHistoryModal) return null;

  const filteredHistory = transactionHistory.filter(transaction => {
    if (!historySearchTerm) return true;
    
    const searchLower = historySearchTerm.toLowerCase();
    return (
      formatDateForDisplay(transaction.timestamp).toLowerCase().includes(searchLower) ||
      transaction.processedItems.some(item => 
        item.fullName?.toLowerCase().includes(searchLower) ||
        item.size?.toLowerCase().includes(searchLower) ||
        item.barcode?.toLowerCase().includes(searchLower)
      )
    );
  });

  const toggleTransactionExpansion = (transactionId) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent} style={{ width: '80%', height: '80%' }}>
        <div className={styles.modalHeader}>
          <h5 style={{ margin: 0, color: 'white' }}>
            Historia transakcji ({filteredHistory.length})
          </h5>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="btn btn-outline-light btn-sm"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Szukaj w historii..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className={`form-control ${styles.historySearchInput}`}
              style={{
                backgroundColor: '',
                color: 'white',
                border: '1px solid #666'
              }}
            />
          </div>
          
          <div className={`${styles.historyScrollable}`} style={{ 
            maxHeight: 'calc(100% - 60px)', 
            overflowY: 'auto' 
          }}>
            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
                {transactionHistory.length === 0 ? 'Brak transakcji w historii' : 'Brak wyników wyszukiwania'}
              </div>
            ) : (
              filteredHistory.map((transaction) => (
                <div
                  key={transaction.transactionId}
                  style={{
                    backgroundColor: '#444',
                    border: '1px solid #666',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: expandedTransactions.has(transaction.transactionId) ? '1px solid #666' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#555'
                    }}
                    onClick={() => toggleTransactionExpansion(transaction.transactionId)}
                  >
                    <div>
                      <strong style={{ color: 'white' }}>
                        {formatDateForDisplay(transaction.timestamp)}
                      </strong>
                      <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '4px' }}>
                        {transaction.processedItems?.length || 0} przedmiotów | 
                        {transaction.operationType === 'sprzedaz' ? ' Sprzedaż' : ' Przepisanie'}
                        {transaction.operationType === 'sprzedaz' && transaction.sellingPoint && 
                          ` (${transaction.sellingPoint})`}
                        {transaction.operationType === 'przepisanie' && transaction.targetSellingPoint && 
                          ` (→ ${transaction.targetSellingPoint})`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowTransactionReport(transaction);
                        }}
                        className="btn btn-info btn-sm"
                        title="Pokaż raport transakcji"
                      >
                         Raport
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndoTransaction(transaction);
                        }}
                        className="btn btn-warning btn-sm"
                        disabled={isTransactionInProgress}
                        title="Anuluj transakcję"
                      >
                        Anuluj
                      </button>
                      <span style={{ color: '#ccc' }}>
                        {expandedTransactions.has(transaction.transactionId) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {expandedTransactions.has(transaction.transactionId) && (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ color: 'white' }}>Szczegóły transakcji:</strong>
                      </div>
                      
                      <div style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto',
                        backgroundColor: '#333',
                        borderRadius: '4px',
                        padding: '8px'
                      }}>
                        <table className="table table-sm" style={{ 
                          color: 'white', 
                          fontSize: '0.8rem',
                          marginBottom: 0
                        }}>
                          <thead>
                            <tr>
                              <th>Nazwa</th>
                              <th>Rozmiar</th>
                              <th>Kod</th>
                              <th>Typ</th>
                              <th>Cena</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transaction.processedItems?.map((item, index) => (
                              <tr key={index} style={{
                                backgroundColor: 
                                  item.processType === 'sold' ? 'rgba(0, 123, 255, 0.3)' :
                                  item.processType === 'synchronized' ? 'rgba(40, 167, 69, 0.3)' :
                                  item.processType === 'transferred' ? 'rgba(255, 193, 7, 0.3)' : 'transparent'
                              }}>
                                <td>{item.fullName}</td>
                                <td>{item.size}</td>
                                <td>{item.barcode}</td>
                                <td>
                                  {item.processType === 'sold' ? 'Sprzedane' :
                                   item.processType === 'synchronized' ? 'Zsynchronizowane' :
                                   item.processType === 'transferred' ? 'Przepisane' : item.processType}
                                </td>
                                <td>{item.price} zł</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            Pokazano {filteredHistory.length} z {transactionHistory.length} transakcji
          </div>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="btn btn-secondary btn-sm"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryModal;
