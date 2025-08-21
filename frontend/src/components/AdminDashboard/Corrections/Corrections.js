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
                                onClick={() => handleStatusUpdate(correction._id, 'IGNORED')}
                                title="Ignoruj ten problem"
                              >
                                Ignoruj
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
    </div>
  );
}

export default Corrections;
