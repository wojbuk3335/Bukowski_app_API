import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './Sales.module.css';

const DynamicSalesAnalysis = () => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [availableSellingPoints, setAvailableSellingPoints] = useState([]);
    const [selectedSellingPoints, setSelectedSellingPoints] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pobierz dostępne punkty sprzedaży przy ładowaniu komponentu
    useEffect(() => {
        const fetchSellingPoints = async () => {
            try {
                const response = await axios.get('/api/sales/available-selling-points');
                setAvailableSellingPoints(response.data.sellingPoints);
            } catch (error) {
                console.error('Błąd podczas pobierania punktów sprzedaży:', error);
                setError('Nie można pobrać punktów sprzedaży');
            }
        };

        fetchSellingPoints();
    }, []);

    // Obsługa zmiany zaznaczenia punktów sprzedaży
    const handleSellingPointChange = (sellingPoint) => {
        setSelectedSellingPoints(prev => {
            if (prev.includes(sellingPoint)) {
                return prev.filter(sp => sp !== sellingPoint);
            } else {
                return [...prev, sellingPoint];
            }
        });
    };

    // Zaznacz wszystkie punkty sprzedaży
    const selectAllSellingPoints = () => {
        setSelectedSellingPoints([...availableSellingPoints]);
    };

    // Odznacz wszystkie punkty sprzedaży
    const deselectAllSellingPoints = () => {
        setSelectedSellingPoints([]);
    };

    // Wykonaj analizę sprzedaży
    const performAnalysis = async () => {
        if (!startDate || !endDate || selectedSellingPoints.length === 0) {
            setError('Proszę wybrać zakres dat i co najmniej jeden punkt sprzedaży');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/sales/dynamic-analysis', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                sellingPoints: selectedSellingPoints
            });

            setAnalysisData(response.data);
        } catch (error) {
            console.error('Błąd podczas analizy:', error);
            setError('Błąd podczas wykonywania analizy sprzedaży');
        } finally {
            setLoading(false);
        }
    };

    // Formatowanie wartości walutowych
    const formatCurrencyValue = (valueObj) => {
        if (!valueObj || typeof valueObj !== 'object') return 'Brak danych';
        
        return Object.entries(valueObj)
            .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
            .join(' + ');
    };

    return (
        <div>
            <h1 className={styles.title}>Dynamiczna Analiza Sprzedaży</h1>
            
            {/* Sekcja wyboru parametrów */}
            <div className="card mb-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>
                    <h3>Parametry Analizy</h3>
                </div>
                <div className="card-body" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                    {/* Wybór zakresu dat */}
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <label className="form-label">Data początkowa:</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                className="form-control"
                                placeholderText="Wybierz datę początkową"
                                dateFormat="dd.MM.yyyy"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Data końcowa:</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                className="form-control"
                                placeholderText="Wybierz datę końcową"
                                dateFormat="dd.MM.yyyy"
                            />
                        </div>
                    </div>

                    {/* Wybór punktów sprzedaży */}
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <label className="form-label h5">Punkty sprzedaży:</label>
                            <div>
                                <button 
                                    type="button" 
                                    className="btn btn-outline-light btn-sm me-2"
                                    onClick={selectAllSellingPoints}
                                >
                                    Zaznacz wszystkie
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-outline-light btn-sm"
                                    onClick={deselectAllSellingPoints}
                                >
                                    Odznacz wszystkie
                                </button>
                            </div>
                        </div>
                        
                        <div className="row">
                            {availableSellingPoints.map((sellingPoint) => (
                                <div key={sellingPoint} className="col-md-3 col-sm-6 mb-2">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`selling-point-${sellingPoint}`}
                                            checked={selectedSellingPoints.includes(sellingPoint)}
                                            onChange={() => handleSellingPointChange(sellingPoint)}
                                        />
                                        <label 
                                            className="form-check-label" 
                                            htmlFor={`selling-point-${sellingPoint}`}
                                        >
                                            {sellingPoint}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {selectedSellingPoints.length > 0 && (
                            <div className="mt-2">
                                <small className="text-info">
                                    Wybrano: {selectedSellingPoints.length} z {availableSellingPoints.length} punktów
                                </small>
                            </div>
                        )}
                    </div>

                    {/* Przycisk analizy */}
                    <div className="text-center">
                        <button 
                            className="btn btn-primary btn-lg"
                            onClick={performAnalysis}
                            disabled={loading || !startDate || !endDate || selectedSellingPoints.length === 0}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Analizuję...
                                </>
                            ) : (
                                'Wykonaj Analizę'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Wyświetlanie błędów */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Wyniki analizy */}
            {analysisData && (
                <div className="row">
                    {/* 1) Całkowita ilość sprzedanych produktów */}
                    <div className="col-md-6 mb-4">
                        <div className="card" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <div className="card-header" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>
                                <h4 className="mb-0">📊 Całkowita Ilość Sprzedanych Produktów</h4>
                            </div>
                            <div className="card-body" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                                <div className="text-center">
                                    <h1 className="display-4 text-success mb-3">
                                        {analysisData.analytics.totalProducts}
                                    </h1>
                                    <p className="lead">kurtek sprzedanych w wybranym okresie</p>
                                    <hr />
                                    <div>
                                        <strong>Okres:</strong> {new Date(analysisData.dateRange.start).toLocaleDateString()} - {new Date(analysisData.dateRange.end).toLocaleDateString()}
                                    </div>
                                    <div className="mt-2">
                                        <strong>Punkty sprzedaży:</strong> {analysisData.selectedSellingPoints.join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2) Całkowita wartość sprzedanych produktów */}
                    <div className="col-md-6 mb-4">
                        <div className="card" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <div className="card-header" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>
                                <h4 className="mb-0">💰 Całkowita Wartość Sprzedanych Produktów</h4>
                            </div>
                            <div className="card-body" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                                <div className="text-center">
                                    {Object.keys(analysisData.analytics.totalValue).length > 0 ? (
                                        <div>
                                            {Object.entries(analysisData.analytics.totalValue).map(([currency, amount]) => (
                                                <div key={currency} className="mb-2">
                                                    <h2 className="text-warning">
                                                        {amount.toFixed(2)} {currency}
                                                    </h2>
                                                </div>
                                            ))}
                                            <p className="lead mt-3">łączna wartość sprzedaży</p>
                                        </div>
                                    ) : (
                                        <p className="text-muted">Brak danych o wartości sprzedaży</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rozkład według punktów sprzedaży */}
                    <div className="col-12 mb-4">
                        <div className="card" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <div className="card-header" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>
                                <h4 className="mb-0">🏪 Rozkład Sprzedaży według Punktów</h4>
                            </div>
                            <div className="card-body" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                                <div className="table-responsive">
                                    <table className="table table-dark table-striped">
                                        <thead>
                                            <tr>
                                                <th>Punkt Sprzedaży</th>
                                                <th className="text-center">Ilość Produktów</th>
                                                <th className="text-center">Wartość Sprzedaży</th>
                                                <th className="text-center">% Udziału (ilość)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(analysisData.analytics.sellingPointBreakdown)
                                                .sort(([,a], [,b]) => b.count - a.count)
                                                .map(([sellingPoint, data]) => (
                                                    <tr key={sellingPoint}>
                                                        <td><strong>{sellingPoint}</strong></td>
                                                        <td className="text-center">
                                                            <span className="badge bg-primary fs-6">{data.count}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            {formatCurrencyValue(data.value)}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="badge bg-success">
                                                                {((data.count / analysisData.analytics.totalProducts) * 100).toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top produkty */}
                    <div className="col-12 mb-4">
                        <div className="card" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <div className="card-header" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>
                                <h4 className="mb-0">🥇 Top 10 Najczęściej Sprzedawanych Produktów</h4>
                            </div>
                            <div className="card-body" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                                <div className="table-responsive">
                                    <table className="table table-dark table-striped">
                                        <thead>
                                            <tr>
                                                <th>Pozycja</th>
                                                <th>Nazwa Produktu</th>
                                                <th className="text-center">Ilość Sprzedana</th>
                                                <th className="text-center">Wartość Sprzedaży</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(analysisData.analytics.productBreakdown)
                                                .sort(([,a], [,b]) => b.count - a.count)
                                                .slice(0, 10)
                                                .map(([productName, data], index) => (
                                                    <tr key={productName}>
                                                        <td>
                                                            <span className="badge bg-warning text-dark fs-6">
                                                                #{index + 1}
                                                            </span>
                                                        </td>
                                                        <td><strong>{productName}</strong></td>
                                                        <td className="text-center">
                                                            <span className="badge bg-primary fs-6">{data.count}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            {formatCurrencyValue(data.value)}
                                                        </td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DynamicSalesAnalysis;
