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
      const correctionsResponse = await fetch('http://localhost:3000/api/corrections');
      const correctionsData = await correctionsResponse.json();
      
      // Pobierz statystyki
      const statsResponse = await fetch('http://localhost:3000/api/corrections/stats');
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
      const response = await fetch(`http://localhost:3000/api/corrections/${correctionId}`, {
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

  const handleDelete = async (correctionId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę korektę?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/corrections/${correctionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCorrections();
        alert('Korekta została usunięta');
      } else {
        alert('Błąd podczas usuwania korekty');
      }
    } catch (error) {
      console.error('Błąd podczas usuwania:', error);
      alert('Błąd podczas usuwania korekty');
    }
  };

  const handleFindProduct = async (correction) => {
    try {
      setSearchingProduct(true);
      setSelectedCorrection(correction);
      
      // Pobierz wszystkie stany z API
      const stateResponse = await fetch('http://localhost:3000/api/state');
      const allStates = await stateResponse.json();
      
      // Znajdź wszystkie lokalizacje gdzie ten produkt istnieje
      const matchingItems = allStates.filter(item => 
        item.barcode === correction.barcode &&
        item.fullName === correction.fullName &&
        item.size === correction.size
      );
      
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
      
      console.log('Found product in locations:', locations);
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
      const writeOffResponse = await fetch(`http://localhost:3000/api/state/barcode/${itemToWriteOff.barcode}/symbol/${fromSymbol}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'operation-type': 'write-off' // Dodajemy header określający typ operacji
        }
      });
      
      if (writeOffResponse.ok) {
        // Oznacz korektę jako rozwiązaną
        await handleStatusUpdate(selectedCorrection._id, 'RESOLVED');
        setShowProductModal(false);
        alert(`Produkt został odpisany ze stanu w punkcie ${fromSymbol}`);
        
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
        <h1>Korekty Magazynowe</h1>
        <p>Zarządzanie rozbieżnościami w stanie magazynowym</p>
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
            <h2>Lista Korekty</h2>
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
                  <th>Kod kreskowy</th>
                  <th>Punkt próby</th>
                  <th>Szczegóły problemu</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="loading">
                      Ładowanie korekty...
                    </td>
                  </tr>
                ) : corrections.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-data">
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
                      <td>{correction.barcode}</td>
                      <td>{correction.sellingPoint}</td>
                      <td className="description-cell">
                        <div className="description-content">
                          {correction.description && correction.description.length > 100 
                            ? `${correction.description.substring(0, 100)}...` 
                            : correction.description}
                        </div>
                      </td>
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
                                className="btn btn-success btn-sm"
                                onClick={() => handleStatusUpdate(correction._id, 'RESOLVED')}
                                title="Oznacz jako rozwiązane"
                              >
                                Rozwiąż
                              </button>
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={() => handleFindProduct(correction)}
                                title="Znajdź produkt w innych punktach"
                              >
                                Wskaż produkt
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(correction._id)}
                            title="Usuń korektę"
                          >
                            Usuń
                          </button>
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
