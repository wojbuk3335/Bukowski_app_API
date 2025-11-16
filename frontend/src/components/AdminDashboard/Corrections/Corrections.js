import React, { useState, useEffect } from 'react';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range';
import { Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Button } from 'reactstrap';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import pl from 'date-fns/locale/pl';
import styles from '../Warehouse/Warehouse.module.css'; // Import warehouse styles
import './Corrections.css';

function Corrections() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unresolved: 0,
    resolved: 0,
    total: 0
  });
  
  // Filtry
  const [filters, setFilters] = useState({
    status: 'all', // all, PENDING, RESOLVED, IGNORED
    sellingPoint: '',
    productName: '',
    size: '',
    operationType: 'all' // all, SALE, TRANSFER, WRITE_OFF, REMANENT_BRAK, REMANENT_NADWYŻKA
  });
  const [filteredCorrections, setFilteredCorrections] = useState([]);
  
  // Modal dla wskazywania produktu
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  // Modal dla raportów z DateRangePicker
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Ostatnie 30 dni
    endDate: new Date(),
    key: 'selection'
  }]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Nadpisanie etykiet w defaultStaticRanges
  const customStaticRanges = originalStaticRanges.map((range) => {
    if (range.label === 'Today') {
      return { ...range, label: 'Dzisiaj' };
    }
    if (range.label === 'Yesterday') {
      return { ...range, label: 'Wczoraj' };
    }
    if (range.label === 'This Week') {
      return { ...range, label: 'Ten tydzień' };
    }
    if (range.label === 'Last Week') {
      return { ...range, label: 'Poprzedni tydzień' };
    }
    if (range.label === 'This Month') {
      return { ...range, label: 'Ten miesiąc' };
    }
    if (range.label === 'Last Month') {
      return { ...range, label: 'Poprzedni miesiąc' };
    }
    return range;
  });

  // Nadpisanie etykiet w defaultInputRanges
  const customInputRanges = originalInputRanges.map((range) => {
    if (range.label === 'days up to today') {
      return { ...range, label: 'dni do dzisiaj' };
    }
    if (range.label === 'days starting today') {
      return { ...range, label: 'dni od dzisiaj' };
    }
    return range;
  });

  useEffect(() => {
    fetchCorrections();
  }, []);

  // Zastosuj filtry gdy zmienią się dane lub filtry
  useEffect(() => {
    applyFilters();
  }, [corrections, filters]);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('AdminToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      // Pobierz wszystkie korekty
      const correctionsResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}/api/corrections`, {
        headers
      });
      const correctionsData = await correctionsResponse.json();
      
      // Pobierz statystyki
      const statsResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}/api/corrections/stats`, {
        headers
      });
      const statsData = await statsResponse.json();
      
      setCorrections(correctionsData || []);
      
      // Przelicz statystyki na podstawie statusów
      const pending = correctionsData?.filter(c => c.status === 'PENDING').length || 0;
      const resolved = correctionsData?.filter(c => c.status === 'RESOLVED').length || 0;
      const ignored = correctionsData?.filter(c => c.status === 'IGNORED').length || 0;

      setCorrections(correctionsData || []);
      setStats({
        unresolved: pending,
        resolved: resolved,
        total: correctionsData?.length || 0
      });
      setLoading(false);
    } catch (error) {
      console.error('Błąd podczas pobierania korekt:', error);
      setLoading(false);
      alert('Błąd podczas pobierania korekt');
    }
  };

  // Funkcja filtrowania korekt
  const applyFilters = () => {
    let filtered = [...corrections];

    // Filtr statusu
    if (filters.status !== 'all') {
      filtered = filtered.filter(correction => correction.status === filters.status);
    }

    // Filtr punktu sprzedaży
    if (filters.sellingPoint.trim()) {
      filtered = filtered.filter(correction => 
        correction.sellingPoint?.toLowerCase().includes(filters.sellingPoint.toLowerCase())
      );
    }

    // Filtr nazwy produktu
    if (filters.productName.trim()) {
      filtered = filtered.filter(correction => 
        correction.fullName?.toLowerCase().includes(filters.productName.toLowerCase())
      );
    }

    // Filtr rozmiaru
    if (filters.size.trim()) {
      filtered = filtered.filter(correction => 
        correction.size?.toLowerCase().includes(filters.size.toLowerCase())
      );
    }

    // Filtr typu operacji
    if (filters.operationType !== 'all') {
      filtered = filtered.filter(correction => correction.attemptedOperation === filters.operationType);
    }

    setFilteredCorrections(filtered);
  };

  // Funkcja resetowania filtrów
  const resetFilters = () => {
    setFilters({
      status: 'all',
      sellingPoint: '',
      productName: '',
      size: '',
      operationType: 'all'
    });
  };

  // Funkcja generowania raportu
  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Filtruj korekty według zakresu dat i typu
      let reportData = [...corrections];
      
      // Filtruj według typu raportu
      if (reportType === 'remanent') {
        reportData = reportData.filter(correction => 
          correction.attemptedOperation === 'REMANENT_BRAK' || 
          correction.attemptedOperation === 'REMANENT_NADWYŻKA'
        );
      }
      
      // Filtruj według zakresu dat
      if (dateRange[0].startDate && dateRange[0].endDate) {
        const startDate = new Date(dateRange[0].startDate);
        const endDate = new Date(dateRange[0].endDate);
        endDate.setHours(23, 59, 59, 999); // Ustaw koniec dnia
        
        reportData = reportData.filter(correction => {
          const correctionDate = new Date(correction.createdAt);
          return correctionDate >= startDate && correctionDate <= endDate;
        });
      }
      
      generateReportFile(reportData);
    } catch (error) {
      console.error('Błąd podczas generowania raportu:', error);
      alert('Błąd podczas generowania raportu');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Funkcja generowania pliku raportu
  const generateReportFile = (data) => {
    const reportTitle = reportType === 'remanent' ? 'Raport Korekt Remanentowych' : 'Raport Wszystkich Korekt';
    const today = new Date().toLocaleDateString('pl-PL');
    
    // Stwórz HTML do drukowania
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            color: black;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .operation-remanent { background-color: #e2e3e5; }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTitle}</h1>
          <p><strong>Wygenerowano:</strong> ${today}</p>
          <p><strong>Liczba korekt:</strong> ${data.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Data wykrycia</th>
              <th>Typ operacji</th>
              <th>Produkt</th>
              <th>Rozmiar</th>
              <th>Punkt sprzedaży</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.forEach(correction => {
      const operationLabel = {
        'SALE': 'Sprzedaż',
        'TRANSFER': 'Transfer', 
        'WRITE_OFF': 'Odpisanie',
        'REMANENT_BRAK': 'Remanent-Brak',
        'REMANENT_NADWYŻKA': 'Remanent-Nadwyżka'
      }[correction.attemptedOperation] || correction.attemptedOperation;
      
      const operationClass = correction.attemptedOperation.includes('REMANENT') ? 'operation-remanent' : '';
      
      htmlContent += `
        <tr>
          <td>${new Date(correction.createdAt).toLocaleDateString('pl-PL')}</td>
          <td class="${operationClass}">${operationLabel}</td>
          <td>${correction.fullName || ''}</td>
          <td>${correction.size || ''}</td>
          <td>${correction.sellingPoint || ''}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Otwórz nowe okno i wydrukuj
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Czekaj aż strona się załaduje, potem drukuj
    printWindow.onload = function() {
      printWindow.print();
      printWindow.close();
    };
  };

  const handleStatusUpdate = async (correctionId, newStatus) => {
    try {
      const token = localStorage.getItem('AdminToken');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}/api/corrections/${correctionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          resolvedBy: 'admin', // TODO: Dodać prawdziwy użytkownik
          description: `Status zmieniony na ${newStatus}`
        }),
      });

      if (response.ok) {
        // Odśwież dane po aktualizacji
        fetchCorrections();
        
        // Pokaż odpowiedni komunikat w zależności od akcji
        let message = '';
        switch(newStatus) {
          case 'RESOLVED':
            message = 'Korekta została oznaczona jako rozwiązana';
            break;
          case 'IGNORED':
            message = 'Korekta została zignorowana';
            break;
          case 'PENDING':
            message = 'Korekta została przywrócona do oczekiwania';
            break;
          default:
            message = `Status korekty został zmieniony na ${newStatus.toLowerCase()}`;
        }
        
        alert(message);
      } else {
        alert('Błąd podczas aktualizacji statusu korekty');
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu:', error);
      alert('Błąd podczas aktualizacji statusu korekty');
    }
  };

  const handleRefresh = () => {
    fetchCorrections();
  };

  const handleFindProduct = async (correction) => {
    try {
      setSearchingProduct(true);
      setSelectedCorrection(correction);
      
      const token = localStorage.getItem('AdminToken');
      // Pobierz wszystkie stany z API
      const stateResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}/api/state`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const allStates = await stateResponse.json();
      
      // Znajdź wszystkie lokalizacje gdzie ten produkt istnieje
      // POPRAWKA: Dla transferów barcode może być MongoDB ID, więc szukaj też po fullName + size
      const matchingItems = allStates.filter(item => {
        // Sprawdź czy barcode pasuje (dla sprzedaży)
        const barcodeMatch = item.barcode === correction.barcode;
        
        // Sprawdź czy fullName i size pasują (dla transferów)
        const nameAndSizeMatch = item.fullName === correction.fullName && 
                                item.size === correction.size;
        
        // Akceptuj jeśli barcode pasuje LUB (fullName + size) pasują
        return barcodeMatch || nameAndSizeMatch;
      });
      
      // Pogrupuj według symbolu punktu sprzedaży
      const locationGroups = matchingItems.reduce((acc, item) => {
        if (!acc[item.symbol]) {
          acc[item.symbol] = {
            symbol: item.symbol,
            items: [],
            count: 0
          };
        }
        acc[item.symbol].items.push(item);
        acc[item.symbol].count++;
        return acc;
      }, {});
      
      const locations = Object.values(locationGroups);
      
      setAvailableLocations(locations);
      setShowProductModal(true);
      
    } catch (error) {
      console.error('Błąd podczas szukania produktu:', error);
      alert('Błąd podczas wyszukiwania produktu w stanach');
    } finally {
      setSearchingProduct(false);
    }
  };

  const handleWriteOffFromLocation = async (fromSymbol) => {
    try {
      if (!selectedCorrection) return;
      
      // Znajdź konkretny item do odpisania
      const itemToWriteOff = availableLocations
        .find(loc => loc.symbol === fromSymbol)
        ?.items[0]; // Bierzemy pierwszy dostępny
        
      if (!itemToWriteOff) {
        alert('Nie znaleziono produktu do odpisania');
        return;
      }
      
      if (!window.confirm(`Czy na pewno chcesz odpisać produkt "${selectedCorrection.fullName}" ze stanu w punkcie ${fromSymbol}?`)) {
        return;
      }
      
      const token = localStorage.getItem('AdminToken');
      // Wywołanie API do odpisania produktu używając istniejącego endpointu
      const writeOffResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}/api/state/barcode/${itemToWriteOff.barcode}/symbol/${fromSymbol}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'operation-type': 'write-off', // Dodajemy header określający typ operacji
          'correction-id': selectedCorrection._id, // ID korekty do aktualizacji
          'correction-transaction-id': selectedCorrection.transactionId // TransactionId korekty
        }
      });
      
      if (writeOffResponse.ok) {
        // Oznacz korektę jako rozwiązaną
        await handleStatusUpdate(selectedCorrection._id, 'RESOLVED');
        setShowProductModal(false);
        alert(`Produkt został odpisany ze stanu w punkcie ${fromSymbol}`);
        
        // Powiadom komponent AddToState że transakcja została skorygowana
        if (selectedCorrection.transactionId) {
          // Send event
          const event = new CustomEvent('transactionCorrected', {
            detail: { transactionId: selectedCorrection.transactionId }
          });
          window.dispatchEvent(event);
          
          // Also save to localStorage as backup
          try {
            const stored = localStorage.getItem('correctedTransactionIds');
            let correctedIds = [];
            
            if (stored) {
              correctedIds = JSON.parse(stored);
            }
            
            if (!correctedIds.includes(selectedCorrection.transactionId)) {
              correctedIds.push(selectedCorrection.transactionId);
              localStorage.setItem('correctedTransactionIds', JSON.stringify(correctedIds));
            }
          } catch (error) {
            console.error('Error storing corrected transaction ID:', error);
          }
        }
        
        // Odśwież listę dostępnych lokalizacji (usuń tę lokalizację jeśli nie ma już produktów)
        const updatedLocations = availableLocations.filter(loc => loc.symbol !== fromSymbol);
        setAvailableLocations(updatedLocations);
      } else {
        const errorData = await writeOffResponse.json();
        alert(`Błąd podczas odpisywania: ${errorData.message || 'Nieznany błąd'}`);
      }
      
    } catch (error) {
      console.error('Błąd podczas odpisywania:', error);
      alert('Błąd podczas odpisywania produktu');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="corrections-container">
      <div className="corrections-header">
        <h1 style={{ color: 'white' }}>Korekty Magazynowe</h1>
      </div>
      
      <div className="corrections-content">
        <div className="corrections-stats">
          <button className="stat-button stat-unresolved">
            <span className="stat-number">{stats.unresolved}</span>
            <span className="stat-label">Nierozwiązane</span>
          </button>
          <button className="stat-button stat-resolved">
            <span className="stat-number">{stats.resolved}</span>
            <span className="stat-label">Rozwiązane</span>
          </button>
          <button className="stat-button stat-total">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Łącznie</span>
          </button>
        </div>

        {/* Sekcja filtrów */}
        <div className="filters-section">
          <h3>Filtry</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="filter-select"
              >
                <option value="all">Wszystkie</option>
                <option value="PENDING">Oczekujące</option>
                <option value="RESOLVED">Rozwiązane</option>
                <option value="IGNORED">Zignorowane</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Punkt sprzedaży:</label>
              <input 
                type="text"
                value={filters.sellingPoint}
                onChange={(e) => setFilters({...filters, sellingPoint: e.target.value})}
                placeholder="Nazwa punktu..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Produkt:</label>
              <input 
                type="text"
                value={filters.productName}
                onChange={(e) => setFilters({...filters, productName: e.target.value})}
                placeholder="Nazwa produktu..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Rozmiar:</label>
              <input 
                type="text"
                value={filters.size}
                onChange={(e) => setFilters({...filters, size: e.target.value})}
                placeholder="Rozmiar..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Typ operacji:</label>
              <select 
                value={filters.operationType} 
                onChange={(e) => setFilters({...filters, operationType: e.target.value})}
                className="filter-select"
              >
                <option value="all">Wszystkie</option>
                <option value="SALE">Sprzedaż</option>
                <option value="TRANSFER">Transfer</option>
                <option value="WRITE_OFF">Odpisanie</option>
                <option value="REMANENT_BRAK">Remanent-Brak</option>
                <option value="REMANENT_NADWYŻKA">Remanent-Nadwyżka</option>
              </select>
            </div>

            <div className="filter-actions">
              <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
                Resetuj filtry
              </button>
            </div>
          </div>
        </div>

        {/* Sekcja raportów */}
        <div className="reports-section">
          <div className="filters-header">
            <h3>Raporty</h3>
            <button 
              className="btn btn-info btn-sm"
              onClick={() => setShowReportModal(true)}
            >
              Drukuj raport korekt
            </button>
          </div>
        </div>
      </div>

      <div className="corrections-table-container">
          <div className="table-header">
            <h2>Lista korekt</h2>
            <div className="table-actions">
              <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
                {loading ? 'Ładowanie...' : 'Odśwież'}
              </button>
            </div>
          </div>
          
          <div className="corrections-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Data wykrycia</th>
                  <th>Typ operacji</th>
                  <th>Produkt</th>
                  <th>Rozmiar</th>
                  <th>Punkt próby</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="loading">
                      Ładowanie korekty...
                    </td>
                  </tr>
                ) : filteredCorrections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {corrections.length === 0 ? 'Brak korekt do wyświetlenia' : 'Brak korekt pasujących do filtrów'}
                    </td>
                  </tr>
                ) : (
                  filteredCorrections.map((correction) => (
                    <tr key={correction._id}>
                      <td>{formatDate(correction.createdAt)}</td>
                      <td>
                        <span className={`operation-type ${correction.attemptedOperation.toLowerCase().replace('_', '-')}`}>
                          {correction.attemptedOperation === 'SALE' ? 'Sprzedaż' : 
                           correction.attemptedOperation === 'TRANSFER' ? 'Transfer' : 
                           correction.attemptedOperation === 'WRITE_OFF' ? 'Odpisanie' : 
                           correction.attemptedOperation === 'REMANENT_BRAK' ? 'Remanent-Brak' :
                           correction.attemptedOperation === 'REMANENT_NADWYŻKA' ? 'Remanent-Nadwyżka' :
                           correction.attemptedOperation}
                        </span>
                      </td>
                      <td>{correction.fullName}</td>
                      <td>{correction.size}</td>
                      <td>{correction.sellingPoint}</td>
                      <td>
                        <span className={`status-badge status-${correction.status.toLowerCase()}`}>
                          {correction.status === 'PENDING' ? 'Oczekuje' : 
                           correction.status === 'RESOLVED' ? 'Rozwiązane' : 
                           correction.status === 'IGNORED' ? 'Zignorowane' : 
                           correction.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {correction.status === 'PENDING' && (
                            <>
                              {/* Hide "Wskaż produkt" for remanent-origin corrections */}
                              {!['REMANENT_BRAK', 'REMANENT_NADWYŻKA'].includes(correction.attemptedOperation) && (
                                <button 
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleFindProduct(correction)}
                                  title="Znajdź produkt w innych punktach"
                                >
                                  Wskaż produkt
                                </button>
                              )}
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleStatusUpdate(correction._id, 'RESOLVED')}
                                title="Oznacz jako rozwiązane"
                              >
                                Rozwiązano
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStatusUpdate(correction._id, 'IGNORED')}
                                title="Zignoruj tę korektę"
                              >
                                Zignoruj
                              </button>
                            </>
                          )}
                          {correction.status === 'RESOLVED' && (
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleStatusUpdate(correction._id, 'PENDING')}
                              title="Cofnij rozwiązanie i wróć do oczekiwania"
                            >
                              Cofnij rozwiązanie
                            </button>
                          )}
                          {correction.status === 'IGNORED' && (
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleStatusUpdate(correction._id, 'PENDING')}
                              title="Cofnij ignorowanie i wróć do oczekiwania"
                            >
                              Przywróć
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {showProductModal && selectedCorrection && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Lokalizacje produktu</h3>
              <button 
                className="modal-close"
                onClick={() => setShowProductModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="product-info">
                <h4>{selectedCorrection.fullName}</h4>
                <p>Rozmiar: {selectedCorrection.size}</p>
                <p>Barcode: {selectedCorrection.barcode}</p>
                <p>Brakuje w punkcie: <strong>{selectedCorrection.sellingPoint}</strong></p>
              </div>
              
              {availableLocations.length > 0 ? (
                <div className="locations-list">
                  <h5>Znaleziono produkt w następujących punktach:</h5>
                  {availableLocations.map((location) => (
                    <div key={location.symbol} className="location-item">
                      <div className="location-info">
                        <strong>{location.symbol}</strong>
                        <span className="count">({location.count} szt.)</span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleWriteOffFromLocation(location.symbol)}
                      >
                        Odpisz ze stanu
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-locations">
                  <p>Nie znaleziono tego produktu w żadnym innym punkcie sprzedaży.</p>
                  <p>Możliwe rozwiązania:</p>
                  <ul>
                    <li>Sprawdź czy produkt nie został źle zeskanowany</li>
                    <li>Skontaktuj się z dostawcą</li>
                    <li>Oznacz jako rozwiązane jeśli problem został rozwiązany inaczej</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowProductModal(false)}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  handleStatusUpdate(selectedCorrection._id, 'RESOLVED');
                  setShowProductModal(false);
                }}
              >
                Oznacz jako rozwiązane
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal raportu korekt - identyczny jak w Warehouse */}
      <Modal 
        isOpen={showReportModal} 
        toggle={() => setShowReportModal(false)} 
        size="lg"
      >
        <ModalHeader 
          toggle={() => setShowReportModal(false)}
          className={`${styles.modalHeader}`}
        >
          Raport Korekt
        </ModalHeader>
        <ModalBody className={styles.modalBody}>
          <FormGroup>
            <Label>Typ raportu:</Label>
            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reportType"
                  id="allCorrections"
                  value="all"
                  checked={reportType === 'all'}
                  onChange={(e) => setReportType(e.target.value)}
                />
                <label className="form-check-label" htmlFor="allCorrections">
                  Wszystkie korekty
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reportType"
                  id="remanentCorrections"
                  value="remanent"
                  checked={reportType === 'remanent'}
                  onChange={(e) => setReportType(e.target.value)}
                />
                <label className="form-check-label" htmlFor="remanentCorrections">
                  Tylko korekty remanentowe
                </label>
              </div>
            </div>
          </FormGroup>

          <FormGroup>
            <Label for="reportDateRange">Zakres dat:</Label>
            <DateRangePicker
              ranges={dateRange}
              onChange={(ranges) => setDateRange([ranges.selection])}
              locale={pl}
              rangeColors={['#3d91ff']}
              staticRanges={customStaticRanges}
              inputRanges={customInputRanges}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter className={styles.modalFooter}>
          <Button color="secondary" onClick={() => setShowReportModal(false)}>
            Anuluj
          </Button>
          <Button 
            color="primary" 
            onClick={() => {
              generateReport();
              setShowReportModal(false);
            }}
            disabled={generatingReport}
          >
            {generatingReport ? 'Przygotowywanie...' : 'Drukuj raport'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Corrections;
