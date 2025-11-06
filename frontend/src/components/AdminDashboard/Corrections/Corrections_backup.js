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
  
  // Filtry
  const [filters, setFilters] = useState({
    status: 'all',
    sellingPoint: '',
    productName: '',
    size: '',
    operationType: 'all'
  });
  const [filteredCorrections, setFilteredCorrections] = useState([]);
  
  // Modal dla wskazywania produktu
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  useEffect(() => {
    fetchCorrections();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [corrections, filters]);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/corrections', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCorrections(data);
        
        // Oblicz statystyki
        const unresolved = data.filter(c => c.status === 'PENDING').length;
        const resolved = data.filter(c => c.status === 'RESOLVED').length;
        setStats({
          unresolved,
          resolved,
          total: data.length
        });
      }
    } catch (error) {
      console.error('Błąd podczas pobierania korekt:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...corrections];

    if (filters.status !== 'all') {
      filtered = filtered.filter(correction => correction.status === filters.status);
    }

    if (filters.sellingPoint) {
      filtered = filtered.filter(correction => 
        correction.sellingPoint?.toLowerCase().includes(filters.sellingPoint.toLowerCase())
      );
    }

    if (filters.productName) {
      filtered = filtered.filter(correction => 
        correction.fullName?.toLowerCase().includes(filters.productName.toLowerCase())
      );
    }

    if (filters.size) {
      filtered = filtered.filter(correction => 
        correction.size?.toLowerCase().includes(filters.size.toLowerCase())
      );
    }

    if (filters.operationType !== 'all') {
      filtered = filtered.filter(correction => correction.attemptedOperation === filters.operationType);
    }

    setFilteredCorrections(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      sellingPoint: '',
      productName: '',
      size: '',
      operationType: 'all'
    });
  };

  const handleStatusUpdate = async (correctionId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/corrections/${correctionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchCorrections();
        alert(`Status korekty został zmieniony na: ${newStatus}`);
      } else {
        alert('Błąd podczas aktualizacji statusu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas aktualizacji statusu');
    }
  };

  const handleRefresh = () => {
    fetchCorrections();
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

  const getOperationLabel = (operation) => {
    const labels = {
      'SALE': 'Sprzedaż',
      'TRANSFER': 'Transfer',
      'WRITE_OFF': 'Odpis',
      'REMANENT_BRAK': 'Remanent-Brak',
      'REMANENT_NADWYŻKA': 'Remanent-Nadwyżka'
    };
    return labels[operation] || operation;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#ffc107';
      case 'RESOLVED': return '#28a745';
      case 'IGNORED': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'PENDING': 'Oczekuje',
      'RESOLVED': 'Rozwiązane',
      'IGNORED': 'Zignorowane'
    };
    return labels[status] || status;
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
                <option value="PENDING">Oczekuje</option>
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
              <label>Nazwa produktu:</label>
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
                <option value="WRITE_OFF">Odpis</option>
                <option value="REMANENT_BRAK">Remanent-Brak</option>
                <option value="REMANENT_NADWYŻKA">Remanent-Nadwyżka</option>
              </select>
            </div>

            <div className="filter-actions">
              <button className="btn btn-secondary" onClick={resetFilters}>
                Resetuj filtry
              </button>
            </div>
          </div>
        </div>

        <div className="reports-section">
          <div className="filters-header">
            <h3>Raporty</h3>
            <button 
              className="btn btn-info btn-sm"
              onClick={() => alert('Funkcjonalność raportów w przygotowaniu')}
            >
              Drukuj raport korekt
            </button>
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
                    <td colSpan="7" className="text-center">Ładowanie...</td>
                  </tr>
                ) : filteredCorrections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">Brak korekt do wyświetlenia</td>
                  </tr>
                ) : (
                  filteredCorrections.map((correction) => (
                    <tr key={correction._id}>
                      <td>{formatDate(correction.createdAt)}</td>
                      <td>
                        <span className={`operation-badge operation-${correction.attemptedOperation?.toLowerCase()}`}>
                          {getOperationLabel(correction.attemptedOperation)}
                        </span>
                      </td>
                      <td>{correction.fullName}</td>
                      <td>{correction.size}</td>
                      <td>{correction.sellingPoint}</td>
                      <td>
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: getStatusColor(correction.status) }}
                        >
                          {getStatusLabel(correction.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {correction.attemptedOperation !== 'REMANENT_BRAK' && 
                           correction.attemptedOperation !== 'REMANENT_NADWYŻKA' && (
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => {
                                setSelectedCorrection(correction);
                                setShowProductModal(true);
                              }}
                            >
                              Wskaż produkt
                            </button>
                          )}
                          
                          {correction.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleStatusUpdate(correction._id, 'RESOLVED')}
                              >
                                Rozwiązano
                              </button>
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleStatusUpdate(correction._id, 'IGNORED')}
                              >
                                Zignoruj
                              </button>
                            </>
                          )}
                          
                          {correction.status === 'RESOLVED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStatusUpdate(correction._id, 'PENDING')}
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
              
              <div className="no-locations">
                <p>Funkcjonalność wyszukiwania lokalizacji w przygotowaniu.</p>
              </div>
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