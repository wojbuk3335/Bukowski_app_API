import React, { useState, useEffect } from 'react';
import './Corrections.css';

function Corrections() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unresolved: 0,
    resolved: 0,
    total: 0
  });
  
  // Modal dla wskazywania produktu
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  useEffect(() => {
    fetchCorrections();
  }, []);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      
      // Pobierz wszystkie korekty
      const correctionsResponse = await fetch('http://localhost:3001/api/corrections');
      const correctionsData = await correctionsResponse.json();
      
      // Pobierz statystyki
      const statsResponse = await fetch('http://localhost:3001/api/corrections/stats');
      const statsData = await statsResponse.json();
      
      setCorrections(correctionsData || []);
      
      // Przelicz statystyki na podstawie statusów
      const pending = correctionsData?.filter(c => c.status === 'PENDING').length || 0;
      const resolved = correctionsData?.filter(c => c.status === 'RESOLVED').length || 0;
      const ignored = correctionsData?.filter(c => c.status === 'IGNORED').length || 0;
      
      setStats({
        unresolved: pending + ignored,
        resolved: resolved,
        total: correctionsData?.length || 0
      });
      
    } catch (error) {
      console.error('Błąd podczas ładowania korekt:', error);
      // W przypadku błędu ustaw puste dane
      setCorrections([]);
      setStats({ unresolved: 0, resolved: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchCorrections();
  };

  const handleStatusUpdate = async (correctionId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3001/api/corrections/${correctionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
        alert(`Korekta została oznaczona jako ${newStatus === 'RESOLVED' ? 'rozwiązana' : newStatus === 'IGNORED' ? 'zignorowana' : newStatus.toLowerCase()}`);
      } else {
        alert('Błąd podczas aktualizacji statusu korekty');
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu:', error);
      alert('Błąd podczas aktualizacji statusu korekty');
    }
  };

  const handleFindProduct = async (correction) => {
    try {
      setSearchingProduct(true);
      setSelectedCorrection(correction);
      
      // Pobierz wszystkie stany z API
      const stateResponse = await fetch('http://localhost:3001/api/state');
      const allStates = await stateResponse.json();
      
      console.log('🔍 Searching for correction:', {
        barcode: correction.barcode,
        fullName: correction.fullName,
        size: correction.size
      });
      console.log('📊 Total states available:', allStates.length);
      
      // Znajdź wszystkie lokalizacje gdzie ten produkt istnieje
      // POPRAWKA: Dla transferów barcode może być MongoDB ID, więc szukaj też po fullName + size
      const matchingItems = allStates.filter(item => {
        // Sprawdź czy barcode pasuje (dla sprzedaży)
        const barcodeMatch = item.barcode === correction.barcode;
        
        // Sprawdź czy fullName i size pasują (dla transferów)
        const nameAndSizeMatch = item.fullName === correction.fullName && 
                                item.size === correction.size;
        
        // Debug log
        if (nameAndSizeMatch || barcodeMatch) {
          console.log(`✅ Found match in ${item.symbol}:`, {
            itemBarcode: item.barcode,
            correctionBarcode: correction.barcode,
            barcodeMatch,
            nameAndSizeMatch,
            fullName: item.fullName,
            size: item.size
          });
        }
        
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
      
      console.log('🎯 Found product in locations:', locations.length);
      console.log('📋 Available locations:', locations.map(loc => `${loc.symbol} (${loc.count} items)`));
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
      
      console.log(`Writing off from ${fromSymbol}:`, itemToWriteOff);
      
      // Wywołanie API do odpisania produktu używając istniejącego endpointu
      const writeOffResponse = await fetch(`http://localhost:3001/api/state/barcode/${itemToWriteOff.barcode}/symbol/${fromSymbol}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
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
        console.log('🔍 Debug selectedCorrection:', selectedCorrection);
        console.log('🔍 Debug selectedCorrection.transactionId:', selectedCorrection.transactionId);
        
        if (selectedCorrection.transactionId) {
          // Send event
          const event = new CustomEvent('transactionCorrected', {
            detail: { transactionId: selectedCorrection.transactionId }
          });
          window.dispatchEvent(event);
          console.log(`🔔 Dispatched transactionCorrected event for transaction: ${selectedCorrection.transactionId}`);
          
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
              console.log('💾 Saved corrected transaction to localStorage:', selectedCorrection.transactionId);
            }
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
        } else {
          console.log('❌ No transactionId found in selectedCorrection - cannot dispatch event');
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
          <div className="stat-card stat-unresolved">
            <h3>{stats.unresolved}</h3>
            <p>Nierozwiązane korekty</p>
          </div>
          <div className="stat-card stat-resolved">
            <h3>{stats.resolved}</h3>
            <p>Rozwiązane korekty</p>
          </div>
          <div className="stat-card stat-total">
            <h3>{stats.total}</h3>
            <p>Łącznie korekty</p>
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
                ) : corrections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      Brak korekty do wyświetlenia
                    </td>
                  </tr>
                ) : (
                  corrections.map((correction) => (
                    <tr key={correction._id}>
                      <td>{formatDate(correction.createdAt)}</td>
                      <td>
                        <span className={`operation-type ${correction.attemptedOperation.toLowerCase()}`}>
                          {correction.attemptedOperation === 'SALE' ? 'Sprzedaż' : 
                           correction.attemptedOperation === 'TRANSFER' ? 'Transfer' : 
                           correction.attemptedOperation === 'WRITE_OFF' ? 'Odpisanie' : 
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
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={() => handleFindProduct(correction)}
                                title="Znajdź produkt w innych punktach"
                              >
                                Wskaż produkt
                              </button>
                            </>
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
      </div>

      {/* Modal do wyświetlania znalezionych lokalizacji */}
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
    </div>
  );
}

export default Corrections;
