import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDateForDisplay } from './utils';
import styles from './AddToState.module.css';

const TransactionReportModal = ({
  showReportModal,
  setShowReportModal,
  transaction,
  usersData
}) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (showReportModal && transaction) {
      generateReport();
    }
  }, [showReportModal, transaction]);

  const generateReport = async () => {
    if (!transaction) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current state data
      const stateResponse = await axios.get('/api/state');
      const currentState = stateResponse.data;
      
      // Check if this is a correction transaction
      const isCorrection = transaction.operationType === 'korekta' || transaction.isCorrection;
      
      if (isCorrection) {
        // Generate report for correction transaction
        const correctedItems = transaction.processedItems.filter(item => item.processType === 'corrected');
        
        const report = {
          transaction,
          isCorrection: true,
          originalTransactionId: transaction.originalTransactionId || 'Nieznane',
          correctedItems: correctedItems,
          summary: {
            totalItems: correctedItems.length,
            totalValue: correctedItems.reduce((sum, item) => sum + (item.price || 0), 0),
            originalOperationId: transaction.originalTransactionId || 'Nieznane'
          }
        };
        
        setReportData(report);
        return;
      }
      
      // Find target selling point data
      const targetSymbol = transaction.operationType === 'sprzedaz' 
        ? (transaction.selectedSellingPoint || transaction.sellingPoint)
        : transaction.targetSellingPoint;
      
      // Find symbol for target selling point name
      let actualTargetSymbol = targetSymbol;
      let targetSellingPointName = targetSymbol;
      
      if (targetSymbol) {
        const targetUser = usersData.find(user => 
          user.sellingPoint === targetSymbol || user.symbol === targetSymbol
        );
        if (targetUser) {
          actualTargetSymbol = targetUser.symbol;
          targetSellingPointName = targetUser.sellingPoint || targetSymbol;
        }
      }
      
      // Calculate states
      const currentTargetItems = currentState.filter(item => item.symbol === actualTargetSymbol);
      const currentMagazynItems = currentState.filter(item => item.symbol === 'MAGAZYN');
      
      // Calculate previous states by reversing the transaction
      const transferredFromMagazyn = transaction.processedItems.filter(item => item.processType === 'transferred');
      const soldItems = transaction.processedItems.filter(item => item.processType === 'sold');
      const synchronizedItems = transaction.processedItems.filter(item => item.processType === 'synchronized');
      
      // Previous target state (current + sold items - transferred items)
      const previousTargetCount = currentTargetItems.length + soldItems.length - transferredFromMagazyn.length;
      const previousTargetValue = currentTargetItems.reduce((sum, item) => sum + (item.price || 0), 0) +
                                 soldItems.reduce((sum, item) => sum + (item.price || 0), 0) -
                                 transferredFromMagazyn.reduce((sum, item) => sum + (item.price || 0), 0);
      
      // Previous magazyn state (current + transferred items + synchronized items)
      const previousMagazynCount = currentMagazynItems.length + transferredFromMagazyn.length + synchronizedItems.length;
      const previousMagazynValue = currentMagazynItems.reduce((sum, item) => sum + (item.price || 0), 0) +
                                  transferredFromMagazyn.reduce((sum, item) => sum + (item.price || 0), 0) +
                                  synchronizedItems.reduce((sum, item) => sum + (item.price || 0), 0);
      
      const currentTargetValue = currentTargetItems.reduce((sum, item) => sum + (item.price || 0), 0);
      const currentMagazynValue = currentMagazynItems.reduce((sum, item) => sum + (item.price || 0), 0);
      
      const report = {
        transaction,
        targetSellingPoint: {
          name: targetSellingPointName,
          symbol: targetSymbol,
          before: {
            count: previousTargetCount,
            value: previousTargetValue
          },
          after: {
            count: currentTargetItems.length,
            value: currentTargetValue
          },
          change: {
            count: currentTargetItems.length - previousTargetCount,
            value: currentTargetValue - previousTargetValue
          }
        },
        magazyn: {
          before: {
            count: previousMagazynCount,
            value: previousMagazynValue
          },
          after: {
            count: currentMagazynItems.length,
            value: currentMagazynValue
          },
          change: {
            count: currentMagazynItems.length - previousMagazynCount,
            value: currentMagazynValue - previousMagazynValue
          }
        },
        itemsBreakdown: {
          sold: soldItems,
          synchronized: synchronizedItems,
          transferred: transferredFromMagazyn
        },
        summary: {
          totalItems: transaction.processedItems.length,
          totalValue: transaction.processedItems.reduce((sum, item) => sum + (item.price || 0), 0)
        }
      };
      
      setReportData(report);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Błąd podczas generowania raportu');
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    if (!reportData) return;
    
    const printWindow = window.open('', '_blank');
    
    // Check if this is a correction report
    if (reportData.isCorrection) {
      const correctionPrintContent = `
        <html>
          <head>
            <title>Raport Korekty - ${formatDateForDisplay(reportData.transaction.timestamp)}</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-size: 10px;
                line-height: 1.2;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px solid #28a745; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
                background-color: #f8f9fa;
                padding: 10px;
              }
              .correction-badge {
                background-color: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                margin-right: 10px;
              }
              .header h1 {
                font-size: 16px;
                margin: 0 0 4px 0;
                color: #28a745;
              }
              .header h2 {
                font-size: 12px;
                margin: 0 0 2px 0;
              }
              .header p {
                font-size: 9px;
                margin: 2px 0;
              }
              .section { 
                margin: 8px 0; 
                padding: 8px; 
                border: 1px solid #28a745; 
                border-radius: 4px;
                page-break-inside: avoid;
              }
              .section-title { 
                font-size: 12px; 
                font-weight: bold; 
                margin-bottom: 6px; 
                color: #28a745; 
              }
              .corrected-item {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 8px;
                margin: 4px 0;
                border-radius: 3px;
              }
              .summary { 
                background-color: #f8f9fa; 
                padding: 8px; 
                border-radius: 4px; 
                margin: 8px 0;
                border: 1px solid #28a745;
              }
              .summary h3 {
                font-size: 12px;
                margin: 0 0 4px 0;
                color: #28a745;
              }
              .footer-info {
                margin-top: 8px;
                text-align: center;
                font-size: 8px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1><span class="correction-badge">KOREKTA</span>Raport Korekty Operacji</h1>
              <h2>${formatDateForDisplay(reportData.transaction.timestamp)}</h2>
              <p>ID korekty: ${reportData.transaction.transactionId}</p>
              <p><strong>Korekta operacji: ${reportData.originalTransactionId}</strong></p>
            </div>

            <div class="section">
              <div class="section-title">Produkty przywrócone do magazynu</div>
              ${reportData.correctedItems && reportData.correctedItems.length > 0 ? 
                reportData.correctedItems.map(item => `
                  <div class="corrected-item">
                    <strong>${item.fullName} (${item.size})</strong><br>
                    Kod: ${item.barcode} | Cena: ${item.price} zł<br>
                    <small style="color: #28a745;">✓ Przywrócono do magazynu (z operacji: ${item.originalTransactionId || reportData.originalTransactionId})</small>
                  </div>
                `).join('') : 
                '<p>Brak informacji o przywróconych produktach</p>'
              }
            </div>

            <div class="summary">
              <h3>Podsumowanie korekty</h3>
              <p>Łączna liczba przywróconych przedmiotów: ${reportData.summary.totalItems}</p>
              <p>Łączna wartość przywróconych przedmiotów: ${reportData.summary.totalValue.toFixed(2)} zł</p>
              <p>Operacja której dotyczy korekta: ${reportData.originalTransactionId}</p>
            </div>

            <div class="footer-info">
              Raport korekty wygenerowany: ${new Date().toLocaleString('pl-PL')}
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.write(correctionPrintContent);
      printWindow.document.close();
      printWindow.print();
      return;
    }
    
    // Original print content for normal transactions
    const printContent = `
      <html>
        <head>
          <title>Raport Operacji - ${formatDateForDisplay(reportData.transaction.timestamp)}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              background: white;
              color: black;
              font-size: 10px;
              line-height: 1.2;
            }
            .header { 
              text-align: center; 
              border-bottom: 1px solid #000; 
              padding-bottom: 5px; 
              margin-bottom: 8px; 
            }
            .header h1 {
              font-size: 14px;
              margin: 0 0 2px 0;
            }
            .header h2 {
              font-size: 12px;
              margin: 0 0 2px 0;
            }
            .header p {
              font-size: 9px;
              margin: 1px 0;
            }
            .section { 
              margin: 5px 0; 
              padding: 5px; 
              border: 1px solid #ddd; 
              border-radius: 3px;
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 11px; 
              font-weight: bold; 
              margin-bottom: 3px; 
              color: #000; 
            }
            .section p {
              margin: 1px 0;
              font-size: 9px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 3px 0;
              font-size: 8px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 2px 4px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              font-size: 8px;
            }
            .sold-item { background-color: rgba(0, 123, 255, 0.1); }
            .synchronized-item { background-color: rgba(40, 167, 69, 0.1); }
            .transferred-item { background-color: rgba(255, 152, 0, 0.1); }
            .summary { 
              background-color: #f9f9f9; 
              padding: 5px; 
              border-radius: 3px; 
              margin: 5px 0;
              font-size: 9px;
            }
            .summary h3 {
              font-size: 11px;
              margin: 0 0 3px 0;
            }
            .summary p {
              margin: 1px 0;
            }
            .state-comparison {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              gap: 5px;
            }
            .state-box {
              width: 48%;
              padding: 3px;
              border: 1px solid #000;
              border-radius: 3px;
              font-size: 8px;
            }
            .state-box h4 {
              font-size: 9px;
              margin: 0 0 2px 0;
            }
            .state-box p {
              margin: 1px 0;
              font-size: 8px;
            }
            .footer-info {
              margin-top: 5px;
              text-align: center;
              font-size: 7px;
              color: #666;
            }
            @media print {
              body {
                font-size: 9px;
              }
              .section {
                margin: 3px 0;
                padding: 3px;
              }
              table {
                font-size: 7px;
              }
              th, td {
                padding: 1px 2px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Raport Operacji</h1>
            <h2>${formatDateForDisplay(reportData.transaction.timestamp)}</h2>
            <p>ID: ${reportData.transaction.transactionId} | Typ: ${reportData.transaction.operationType === 'sprzedaz' ? 'Sprzedaż' : 'Przepisanie'}</p>
          </div>

          <div class="section">
            <div class="section-title">Punkt docelowy: ${reportData.targetSellingPoint.name} (${reportData.targetSellingPoint.symbol})</div>
            <div class="state-comparison">
              <div class="state-box">
                <h4>Przed</h4>
                <p>Przedmioty: ${reportData.targetSellingPoint.before.count}</p>
                <p>Wartość: ${reportData.targetSellingPoint.before.value.toFixed(2)} zł</p>
              </div>
              <div class="state-box">
                <h4>Po</h4>
                <p>Przedmioty: ${reportData.targetSellingPoint.after.count}</p>
                <p>Wartość: ${reportData.targetSellingPoint.after.value.toFixed(2)} zł</p>
              </div>
            </div>
            <p><strong>Zmiana:</strong> ${reportData.targetSellingPoint.change.count > 0 ? '+' : ''}${reportData.targetSellingPoint.change.count} przedmiotów</p>
            
            <div style="margin-top: 8px; padding: 5px; background-color: #f9f9f9; border-radius: 3px;">
              <strong>Szczegółowy breakdown operacji:</strong>
              <div style="margin-top: 5px;">
                <div style="padding: 3px 6px; margin: 2px 0; border-left: 2px solid #dc3545; font-size: 8px;">
                  <strong>Odpisano:</strong> ${reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length} przedmiotów
                  <div style="font-size: 7px; color: #666; margin-top: 1px;">
                    • Sprzedane: ${reportData.itemsBreakdown.sold.length} • Zsynchronizowane: ${reportData.itemsBreakdown.synchronized.length}
                  </div>
                </div>
                <div style="padding: 3px 6px; margin: 2px 0; border-left: 2px solid #28a745; font-size: 8px;">
                  <strong>Dopisano:</strong> ${reportData.itemsBreakdown.synchronized.length + reportData.itemsBreakdown.transferred.length} przedmiotów
                  <div style="font-size: 7px; color: #666; margin-top: 1px;">
                    • Zsynchronizowane: ${reportData.itemsBreakdown.synchronized.length} • Przepisane z magazynu: ${reportData.itemsBreakdown.transferred.length}
                  </div>
                </div>
              </div>
            </div>
            
            ${(reportData.itemsBreakdown.sold.length > 0 || reportData.itemsBreakdown.synchronized.length > 0 || reportData.itemsBreakdown.transferred.length > 0) ? `
              <div style="margin-top: 8px; padding: 5px; background-color: #f9f9f9; border-radius: 3px; position: relative;">
                <div style="position: relative; margin-bottom: 8px; height: 15px;">
                  <strong style="position: absolute; left: 100px; transform: translateX(-50%); width: 200px; text-align: center;">Breakdown operacji:</strong>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 7px;">
                  <thead>
                    <tr>
                      <th style="background-color: #e9ecef; padding: 4px; border: 1px solid #000; text-align: left;">Produkt</th>
                      <th style="background-color: #e9ecef; padding: 4px; border: 1px solid #000; text-align: center; width: 60px;">Odpisane</th>
                      <th style="background-color: #e9ecef; padding: 4px; border: 1px solid #000; text-align: center; width: 60px;">Dopisane</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.itemsBreakdown.sold.map(item => `
                      <tr>
                        <td style="background-color: rgba(0, 123, 255, 0.1); padding: 3px; border: 1px solid #000; border-left: 3px solid #007bff; text-align: left;">${item.fullName} (${item.size})</td>
                        <td style="background-color: rgba(0, 123, 255, 0.1); padding: 3px; border: 1px solid #000; text-align: center; font-weight: bold;">-1</td>
                        <td style="background-color: rgba(0, 123, 255, 0.1); padding: 3px; border: 1px solid #000; text-align: center;"></td>
                      </tr>
                    `).join('')}
                    ${reportData.itemsBreakdown.synchronized.map(item => `
                      <tr>
                        <td style="background-color: rgba(40, 167, 69, 0.1); padding: 3px; border: 1px solid #000; border-left: 3px solid #28a745; text-align: left;">${item.fullName} (${item.size})</td>
                        <td style="background-color: rgba(40, 167, 69, 0.1); padding: 3px; border: 1px solid #000; text-align: center; font-weight: bold;">-1</td>
                        <td style="background-color: rgba(40, 167, 69, 0.1); padding: 3px; border: 1px solid #000; text-align: center; font-weight: bold;">1</td>
                      </tr>
                    `).join('')}
                    ${reportData.itemsBreakdown.transferred.map(item => `
                      <tr>
                        <td style="background-color: rgba(255, 152, 0, 0.1); padding: 3px; border: 1px solid #000; border-left: 3px solid rgb(255, 152, 0); text-align: left;">${item.fullName} (${item.size})</td>
                        <td style="background-color: rgba(255, 152, 0, 0.1); padding: 3px; border: 1px solid #000; text-align: center;"></td>
                        <td style="background-color: rgba(255, 152, 0, 0.1); padding: 3px; border: 1px solid #000; text-align: center; font-weight: bold;">1</td>
                      </tr>
                    `).join('')}
                    <tr>
                      <td style="background-color: #dee2e6; padding: 4px; border: 2px solid #000; font-weight: bold; text-align: left;">BILANS</td>
                      <td style="background-color: #dee2e6; padding: 4px; border: 2px solid #000; text-align: center; font-weight: bold; color: #dc3545;">${(reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length) === 0 ? '0' : `-${reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length}`}</td>
                      <td style="background-color: #dee2e6; padding: 4px; border: 2px solid #000; text-align: center; font-weight: bold; color: #28a745;">${reportData.itemsBreakdown.synchronized.length + reportData.itemsBreakdown.transferred.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">Magazyn</div>
            <div class="state-comparison">
              <div class="state-box">
                <h4>Przed</h4>
                <p>Przedmioty: ${reportData.magazyn.before.count}</p>
                <p>Wartość: ${reportData.magazyn.before.value.toFixed(2)} zł</p>
              </div>
              <div class="state-box">
                <h4>Po</h4>
                <p>Przedmioty: ${reportData.magazyn.after.count}</p>
                <p>Wartość: ${reportData.magazyn.after.value.toFixed(2)} zł</p>
              </div>
            </div>
            <p><strong>Zmiana:</strong> ${reportData.magazyn.change.count > 0 ? '+' : ''}${reportData.magazyn.change.count} przedmiotów</p>
            
            ${(reportData.itemsBreakdown.synchronized.length > 0 || reportData.itemsBreakdown.transferred.length > 0) ? `
              <div style="margin-top: 8px; padding: 5px; background-color: #f9f9f9; border-radius: 3px;">
                <strong>Produkty które opuściły magazyn:</strong>
                ${reportData.itemsBreakdown.synchronized.map(item => `
                  <div style="padding: 2px 0; font-size: 8px; border-left: 2px solid #000; padding-left: 4px; margin: 1px 0; color: #000;">
                    ${item.fullName} (${item.size}) - ${item.price} zł
                    <div style="font-size: 7px; color: #666; margin-top: 1px;">→ Przeniesiono do ${reportData.targetSellingPoint.name} i sprzedano</div>
                  </div>
                `).join('')}
                ${reportData.itemsBreakdown.transferred.map(item => `
                  <div style="padding: 2px 0; font-size: 8px; border-left: 2px solid #000; padding-left: 4px; margin: 1px 0; color: #000;">
                    ${item.fullName} (${item.size}) - ${item.price} zł
                    <div style="font-size: 7px; color: #666; margin-top: 1px;">→ Przeniesiono do ${reportData.targetSellingPoint.name}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="summary">
            <h3>Podsumowanie</h3>
            <p>Łącznie przedmiotów: ${reportData.summary.totalItems} | Wartość: ${reportData.summary.totalValue.toFixed(2)} zł</p>
            <p>Sprzedane: ${reportData.itemsBreakdown.sold.length} | Zsynchronizowane: ${reportData.itemsBreakdown.synchronized.length} | Przepisane: ${reportData.itemsBreakdown.transferred.length}</p>
          </div>

          <div class="footer-info">
            Raport wygenerowany: ${new Date().toLocaleString('pl-PL')}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (!showReportModal) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent} style={{ width: '90%', height: '85%' }}>
        <div className={styles.modalHeader} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h5 style={{ 
            margin: 0, 
            color: 'white',
            flex: 1,
            textAlign: 'center',
            fontSize: '1.2rem'
          }}>
            Raport Operacji - {transaction && formatDateForDisplay(transaction.timestamp)}
          </h5>
          <button
            onClick={() => setShowReportModal(false)}
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
              fontWeight: 600,
              margin: '8px'
            }}
            title="Zamknij"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.modalBody} style={{ overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
              <div>Generowanie raportu...</div>
              <div className="spinner-border text-light mt-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff6b6b' }}>
              {error}
            </div>
          )}
          
          {reportData && !loading && (
            <div style={{ color: 'white' }}>
              {/* Check if this is a correction report */}
              {reportData.isCorrection ? (
                <>
                  {/* Correction Transaction Info */}
                  <div style={{ 
                    backgroundColor: '#28a745', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '2px solid #28a745',
                    textAlign: 'center'
                  }}>
                    <h6 style={{ marginBottom: '15px', color: 'white' }}>
                      <span style={{ 
                        backgroundColor: 'white', 
                        color: '#28a745', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        marginRight: '10px'
                      }}>
                        KOREKTA
                      </span>
                      Raport Korekty Operacji
                    </h6>
                    <p style={{ color: 'white' }}>ID korekty: {reportData.transaction.transactionId}</p>
                    <p style={{ color: 'white' }}>Data korekty: {formatDateForDisplay(reportData.transaction.timestamp)}</p>
                    <p style={{ color: 'white', fontSize:'18px', fontWeight: 'bold', marginTop: '10px' }}>
                      Korekta operacji: {reportData.originalTransactionId}
                    </p>
                  </div>

                  {/* Corrected Items */}
                  <div style={{ 
                    backgroundColor: '#000', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '1px solid white'
                  }}>
                    <h6>Produkty przywrócone do magazynu</h6>
                    {reportData.correctedItems && reportData.correctedItems.length > 0 ? (
                      <div style={{ marginTop: '15px' }}>
                        {reportData.correctedItems.map((item, index) => (
                          <div key={index} style={{ 
                            padding: '10px', 
                            margin: '8px 0',
                            backgroundColor: '#1a1a1a', 
                            borderLeft: '4px solid #28a745',
                            borderRadius: '4px'
                          }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                              {item.fullName} ({item.size})
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '4px' }}>
                              Kod: {item.barcode} | Cena: {item.price} zł
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#28a745', marginTop: '4px' }}>
                              ✓ Przywrócono do magazynu (z operacji: {item.originalTransactionId || reportData.originalTransactionId})
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#ccc', marginTop: '10px' }}>Brak informacji o przywróconych produktach</p>
                    )}
                  </div>

                  {/* Correction Summary */}
                  <div style={{ 
                    backgroundColor: 'black', 
                    padding: '15px', 
                    borderRadius: '8px',
                    color: 'white',
                    border: '1px solid white'
                  }}>
                    <h6>Podsumowanie korekty</h6>
                    <p>Łączna liczba przywróconych przedmiotów: {reportData.summary.totalItems}</p>
                    <p>Łączna wartość przywróconych przedmiotów: {reportData.summary.totalValue.toFixed(2)} zł</p>
                    <p>Operacja której dotyczy korekta: {reportData.originalTransactionId}</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Normal Transaction Info */}
                  <div style={{ 
                    backgroundColor: '#000', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '1px solid white',
                    textAlign: 'center'
                  }}>
                    <h6 style={{ marginBottom: '15px' }}>Informacje o operacji</h6>
                    <p>ID: {reportData.transaction.transactionId}</p>
                    <p>Data: {formatDateForDisplay(reportData.transaction.timestamp)}</p>
                    <p>Typ: {reportData.transaction.operationType === 'sprzedaz' ? 'Sprzedaż' : 'Przepisanie'}</p>
                    <p style={{fontSize:'20px', marginTop: '10px', fontWeight: 'bold'}}>Punkt docelowy: {reportData.targetSellingPoint?.name}</p>
                  </div>

              {/* Target Selling Point State */}
              <div style={{ 
                backgroundColor: '#000', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid white'
              }}>
                <h6>Stan punktu docelowego: {reportData.targetSellingPoint.name}</h6>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <div style={{ flex: 1, backgroundColor: '#000', padding: '10px', borderRadius: '5px' }}>
                    <h7>Przed transakcją</h7>
                    <p>Przedmiotów: {reportData.targetSellingPoint.before.count}</p>
                    <p>Wartość: {reportData.targetSellingPoint.before.value.toFixed(2)} zł</p>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#000', padding: '10px', borderRadius: '5px' }}>
                    <h7>Po transakcji</h7>
                    <p>Przedmiotów: {reportData.targetSellingPoint.after.count}</p>
                    <p>Wartość: {reportData.targetSellingPoint.after.value.toFixed(2)} zł</p>
                  </div>
                </div>
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#000', borderRadius: '5px' }}>
                  <strong>Zmiana: </strong>
                  {reportData.targetSellingPoint.change.count > 0 ? '+' : ''}{reportData.targetSellingPoint.change.count} przedmiotów
                </div>
                
                {/* Detailed breakdown for target selling point */}
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '5px', border: '1px solid #333' }}>
                  <strong style={{ color: 'white' }}>Szczegółowy breakdown operacji:</strong>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ 
                      padding: '6px 10px', 
                      margin: '4px 0',
                      backgroundColor: '#333', 
                      borderLeft: '3px solid #dc3545',
                      borderRadius: '3px',
                      fontSize: '0.9rem',
                      color: 'white'
                    }}>
                      <strong>Odpisano:</strong> {reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length} przedmiotów
                      <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>
                        • Sprzedane: {reportData.itemsBreakdown.sold.length}
                        • Zsynchronizowane: {reportData.itemsBreakdown.synchronized.length}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '6px 10px', 
                      margin: '4px 0',
                      backgroundColor: '#333', 
                      borderLeft: '3px solid #28a745',
                      borderRadius: '3px',
                      fontSize: '0.9rem',
                      color: 'white'
                    }}>
                      <strong>Dopisano:</strong> {reportData.itemsBreakdown.synchronized.length + reportData.itemsBreakdown.transferred.length} przedmiotów
                      <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>
                        • Zsynchronizowane: {reportData.itemsBreakdown.synchronized.length}
                        • Przepisane z magazynu: {reportData.itemsBreakdown.transferred.length}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Breakdown table for target selling point */}
                {(reportData.itemsBreakdown.sold.length > 0 || reportData.itemsBreakdown.synchronized.length > 0 || reportData.itemsBreakdown.transferred.length > 0) && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '5px', border: '1px solid #333' }}>
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <strong style={{ 
                        color: 'white', 
                        position: 'absolute',
                        left: '50%',
                        textAlign: 'center',
                        transform: 'translateX(-50%)'
                      }}>
                        Breakdown operacji:
                      </strong>
                    </div>
                    <div style={{ height: '20px' }}></div> {/* Spacer for the absolutely positioned header */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ 
                              backgroundColor: '#333', 
                              color: 'white', 
                              padding: '8px', 
                              border: '1px solid #555',
                              textAlign: 'left',
                              minWidth: '250px'
                            }}>
                              Produkt
                            </th>
                            <th style={{ 
                              backgroundColor: '#333', 
                              color: 'white', 
                              padding: '8px', 
                              border: '1px solid #555',
                              textAlign: 'center',
                              width: '80px'
                            }}>
                              Odpisane
                            </th>
                            <th style={{ 
                              backgroundColor: '#333', 
                              color: 'white', 
                              padding: '8px', 
                              border: '1px solid #555',
                              textAlign: 'center',
                              width: '80px'
                            }}>
                              Dopisane
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Blue items (sold) - only odpisane */}
                          {reportData.itemsBreakdown.sold.map((item, index) => (
                            <tr key={`sold-${index}`}>
                              <td style={{ 
                                backgroundColor: 'rgba(0, 123, 255, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                borderLeft: '4px solid #007bff',
                                textAlign: 'left'
                              }}>
                                {item.fullName} ({item.size})
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgba(0, 123, 255, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}>
                                -1
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgba(0, 123, 255, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center'
                              }}>
                                
                              </td>
                            </tr>
                          ))}
                          
                          {/* Green items (synchronized) - both odpisane and dopisane */}
                          {reportData.itemsBreakdown.synchronized.map((item, index) => (
                            <tr key={`sync-${index}`}>
                              <td style={{ 
                                backgroundColor: 'rgba(40, 167, 69, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                borderLeft: '4px solid #28a745',
                                textAlign: 'left'
                              }}>
                                {item.fullName} ({item.size})
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgba(40, 167, 69, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}>
                                -1
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgba(40, 167, 69, 0.3)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}>
                                1
                              </td>
                            </tr>
                          ))}
                          
                          {/* Orange items (transferred) - only dopisane */}
                          {reportData.itemsBreakdown.transferred.map((item, index) => (
                            <tr key={`transferred-${index}`}>
                              <td style={{ 
                                backgroundColor: 'rgb(255, 152, 0)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                borderLeft: '4px solid rgb(255, 152, 0)',
                                textAlign: 'left'
                              }}>
                                {item.fullName} ({item.size})
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgb(255, 152, 0)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center'
                              }}>
                                
                              </td>
                              <td style={{ 
                                backgroundColor: 'rgb(255, 152, 0)', 
                                color: 'white', 
                                padding: '6px 8px', 
                                border: '1px solid #555',
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}>
                                1
                              </td>
                            </tr>
                          ))}
                          
                          {/* BILANS row */}
                          <tr>
                            <td style={{ 
                              backgroundColor: '#444', 
                              color: 'white', 
                              padding: '8px', 
                              border: '2px solid #666',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              textAlign: 'left'
                            }}>
                              BILANS
                            </td>
                            <td style={{ 
                              backgroundColor: '#444', 
                              color: '#ff6b6b', 
                              padding: '8px', 
                              border: '2px solid #666',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {(reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length) === 0 ? '0' : `-${reportData.itemsBreakdown.sold.length + reportData.itemsBreakdown.synchronized.length}`}
                            </td>
                            <td style={{ 
                              backgroundColor: '#444', 
                              color: '#51cf66', 
                              padding: '8px', 
                              border: '2px solid #666',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {reportData.itemsBreakdown.synchronized.length + reportData.itemsBreakdown.transferred.length}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Magazyn State */}
              <div style={{ 
                backgroundColor: '#000', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid white'
              }}>
                <h6>Stan magazynu</h6>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <div style={{ flex: 1, backgroundColor: '#000', padding: '10px', borderRadius: '5px' }}>
                    <h7>Przed transakcją</h7>
                    <p>Przedmiotów: {reportData.magazyn.before.count}</p>
                    <p>Wartość: {reportData.magazyn.before.value.toFixed(2)} zł</p>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#000', padding: '10px', borderRadius: '5px' }}>
                    <h7>Po transakcji</h7>
                    <p>Przedmiotów: {reportData.magazyn.after.count}</p>
                    <p>Wartość: {reportData.magazyn.after.value.toFixed(2)} zł</p>
                  </div>
                </div>
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#000', borderRadius: '5px' }}>
                  <strong>Zmiana: </strong>
                  {reportData.magazyn.change.count > 0 ? '+' : ''}{reportData.magazyn.change.count} przedmiotów
                </div>
                
                {/* Products that left magazyn */}
                {(reportData.itemsBreakdown.synchronized.length > 0 || reportData.itemsBreakdown.transferred.length > 0) && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '5px', border: '1px solid #333' }}>
                    <strong style={{ color: 'white' }}>Produkty które opuściły magazyn:</strong>
                    <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {reportData.itemsBreakdown.synchronized.map((item, index) => (
                        <div key={`sync-${index}`} style={{ 
                          padding: '4px 8px', 
                          margin: '2px 0',
                          backgroundColor: '#333', 
                          borderLeft: '3px solid white',
                          borderRadius: '3px',
                          fontSize: '0.9rem',
                          color: 'white'
                        }}>
                          {item.fullName} ({item.size}) - {item.price} zł
                          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>
                            → Przeniesiono do {reportData.targetSellingPoint.name} i sprzedano
                          </div>
                        </div>
                      ))}
                      {reportData.itemsBreakdown.transferred.map((item, index) => (
                        <div key={`mag-transfer-${index}`} style={{ 
                          padding: '4px 8px', 
                          margin: '2px 0',
                          backgroundColor: '#333', 
                          borderLeft: '3px solid white',
                          borderRadius: '3px',
                          fontSize: '0.9rem',
                          color: 'white'
                        }}>
                          {item.fullName} ({item.size}) - {item.price} zł
                          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>
                            → Przeniesiono do {reportData.targetSellingPoint.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{ 
                backgroundColor: 'black', 
                padding: '15px', 
                borderRadius: '8px',
                color: 'white',
                border: '1px solid white'
              }}>
                <h6>Podsumowanie</h6>
                <p>Łączna liczba przedmiotów: {reportData.summary.totalItems}</p>
                <p>Łączna wartość: {reportData.summary.totalValue.toFixed(2)} zł</p>
                <p>Sprzedanych (niebieskie): {reportData.itemsBreakdown.sold.length}</p>
                <p>Zsynchronizowanych (zielone): {reportData.itemsBreakdown.synchronized.length}</p>
                <p>Przepisanych z magazynu (pomarańczowe): {reportData.itemsBreakdown.transferred.length}</p>
              </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button
            onClick={printReport}
            className="btn btn-sm"
            disabled={!reportData || loading}
            style={{ marginRight: '10px', backgroundColor: '#0d6efd', color: 'white', marginBottom: '10px', marginTop: '10px'   }}
          >
            Drukuj raport
          </button>
          <button
            onClick={() => setShowReportModal(false)}
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: '10px' }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionReportModal;
