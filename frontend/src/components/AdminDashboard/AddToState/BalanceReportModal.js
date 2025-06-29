import React from 'react';
import { formatDateForDisplay } from './utils';
import styles from './AddToState.module.css';

const BalanceReportModal = ({
  showBalanceModal,
  setShowBalanceModal,
  balanceData,
  isGeneratingBalance,
  printBalanceReport
}) => {
  if (!showBalanceModal) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent} style={{ width: '90%', height: '90%' }}>
        <div className={styles.modalHeader}>
          <h5 style={{ margin: 0, color: 'white' }}>
            Raport bilansowy {balanceData?.reportDate && `- ${formatDateForDisplay(balanceData.reportDate)}`}
          </h5>
          <button
            onClick={() => setShowBalanceModal(false)}
            className="btn btn-outline-light btn-sm"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {isGeneratingBalance ? (
            <div className={styles.loading}>
              <div>Generowanie raportu bilansowego...</div>
              <div className="spinner-border text-light mt-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : balanceData ? (
            <div>
              {/* Summary Section */}
              <div style={{ 
                backgroundColor: '#222', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #444'
              }}>
                <h6 style={{ color: 'white', marginBottom: '15px' }}>Podsumowanie stanu</h6>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>
                      {balanceData.summary?.totalItems || 0}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Łączna liczba przedmiotów</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                      {balanceData.summary?.totalValue?.toFixed(2) || '0.00'} zł
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Łączna wartość</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                      {balanceData.summary?.sellingPointsCount || 0}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Punkty sprzedaży</div>
                  </div>
                </div>
              </div>

              {/* Selling Points Breakdown */}
              {balanceData.sellingPoints && Object.keys(balanceData.sellingPoints).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h6 style={{ color: 'white', marginBottom: '15px' }}>Rozkład według punktów sprzedaży</h6>
                  <div style={{ 
                    backgroundColor: '#333', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    border: '1px solid #555'
                  }}>
                    <table className="table table-sm mb-0" style={{ color: 'white' }}>
                      <thead style={{ backgroundColor: '#444' }}>
                        <tr>
                          <th>Punkt sprzedaży</th>
                          <th style={{ textAlign: 'center' }}>Liczba przedmiotów</th>
                          <th style={{ textAlign: 'center' }}>Wartość (zł)</th>
                          <th style={{ textAlign: 'center' }}>Udział (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(balanceData.sellingPoints)
                          .sort(([,a], [,b]) => b.count - a.count)
                          .map(([point, data]) => (
                          <tr key={point}>
                            <td style={{ fontWeight: 'bold' }}>{point}</td>
                            <td style={{ textAlign: 'center' }}>{data.count}</td>
                            <td style={{ textAlign: 'center' }}>{data.value.toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}>
                              {((data.count / (balanceData.summary?.totalItems || 1)) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Operations Summary */}
              {balanceData.operations && (
                <div style={{ marginBottom: '20px' }}>
                  <h6 style={{ color: 'white', marginBottom: '15px' }}>Podsumowanie operacji</h6>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '15px' 
                  }}>
                    {Object.entries(balanceData.operations).map(([operation, count]) => (
                      <div key={operation} style={{
                        backgroundColor: '#444',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        border: '1px solid #666'
                      }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                          {count}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.85rem' }}>
                          {operation === 'sales' ? 'Sprzedaż' :
                           operation === 'transfers' ? 'Przepisania' :
                           operation === 'additions' ? 'Dodania' : operation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Section */}
              {balanceData.verification && (
                <div style={{ marginBottom: '20px' }}>
                  <h6 style={{ color: 'white', marginBottom: '15px' }}>Weryfikacja bilansu</h6>
                  
                  {/* Weryfikacja punktów sprzedaży */}
                  <div className={styles.verificationSection} style={{
                    backgroundColor: '#1e40af',
                    border: '1px solid #3b82f6'
                  }}>
                    <div className={styles.verificationTitle}>PUNKTY SPRZEDAŻY:</div>
                    <div className={styles.verificationStats}>
                      <span>Przed: {balanceData.verification.sellingPointsBeforeCount}</span>
                      <span>Po: {balanceData.verification.sellingPointsAfterCount}</span>
                      <span>Zmiana: {balanceData.verification.sellingPointsStateChange > 0 ? '+' : ''}{balanceData.verification.sellingPointsStateChange}</span>
                      <span>Operacje: {balanceData.verification.sellingPointsBalance > 0 ? '+' : ''}{balanceData.verification.sellingPointsBalance}</span>
                      <span className={
                        balanceData.verification.sellingPointsStateChange === balanceData.verification.sellingPointsBalance 
                          ? styles.statusOk 
                          : styles.statusError
                      }>
                        {balanceData.verification.sellingPointsStateChange === balanceData.verification.sellingPointsBalance ? 'OK' : 'BŁĄD'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Weryfikacja magazynu */}
                  <div className={styles.verificationSection} style={{
                    backgroundColor: '#a16207',
                    border: '1px solid #f59e0b'
                  }}>
                    <div className={styles.verificationTitle}>MAGAZYN:</div>
                    <div className={styles.verificationStats}>
                      <span>Przed: {balanceData.verification.magazynBeforeCount}</span>
                      <span>Po: {balanceData.verification.magazynAfterCount}</span>
                      <span>Zmiana: {balanceData.verification.magazynStateChange > 0 ? '+' : ''}{balanceData.verification.magazynStateChange}</span>
                      <span>Operacje: {balanceData.verification.magazynBalance > 0 ? '+' : ''}{balanceData.verification.magazynBalance}</span>
                      <span className={
                        balanceData.verification.magazynStateChange === balanceData.verification.magazynBalance 
                          ? styles.statusOk 
                          : styles.statusError
                      }>
                        {balanceData.verification.magazynStateChange === balanceData.verification.magazynBalance ? 'OK' : 'BŁĄD'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Weryfikacja ogólna */}
                  <div className={styles.verificationSection} style={{
                    backgroundColor: '#555',
                    border: '1px solid white'
                  }}>
                    <div className={styles.verificationTitle}>WERYFIKACJA OGÓLNA:</div>
                    <div className={styles.verificationStats}>
                      <span>Stan przed: {balanceData.verification.totalBeforeCount}</span>
                      <span>Stan po: {balanceData.verification.totalAfterCount}</span>
                      <span>Zmiana rzeczywista: {balanceData.verification.realStateChange > 0 ? '+' : ''}{balanceData.verification.realStateChange}</span>
                      <span>Zmiana z operacji: {balanceData.verification.totalOperationsBalance > 0 ? '+' : ''}{balanceData.verification.totalOperationsBalance}</span>
                      <span className={
                        balanceData.verification.isValid ? styles.statusOk : styles.statusError
                      }>
                        {balanceData.verification.isValid ? 'Bilans OK' : 'BŁĄD BILANSU'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.error}>
              Brak danych do wyświetlenia raportu
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={printBalanceReport}
              className="btn btn-success btn-sm"
              disabled={!balanceData}
            >
              Drukuj raport
            </button>
          </div>
          <button
            onClick={() => setShowBalanceModal(false)}
            className="btn btn-secondary btn-sm"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceReportModal;
