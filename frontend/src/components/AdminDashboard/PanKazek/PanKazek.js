import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faEye, 
    faEyeSlash, 
    faCalendarAlt, 
    faMoneyBillWave,
    faCheckCircle,
    faClockRotateLeft,
    faTrash
} from '@fortawesome/free-solid-svg-icons';

const PanKazek = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'paid'
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');
    const [availableMonths, setAvailableMonths] = useState([]);
    const [stats, setStats] = useState({
        allTimeStats: { total: 0, pending: 0, paid: 0 },
        filteredStats: { total: 0, pending: 0, paid: 0 }
    });
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Get token from localStorage
    const getToken = () => {
        return localStorage.getItem('token');
    };

    // Load products based on current filters
    const loadProducts = async () => {
        try {
            setLoading(true);
            const token = getToken();
            
            let params = {};
            if (filter !== 'all') {
                params.status = filter;
            }
            if (selectedMonth !== 'all' && selectedYear !== 'all') {
                params.month = selectedMonth;
                params.year = selectedYear;
            } else if (selectedYear !== 'all') {
                params.year = selectedYear;
            }

            const response = await axios.get('/api/pan-kazek', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: params
            });

            setProducts(response.data.data || []);
            setStats({
                allTimeStats: response.data.allTimeStats || { total: 0, pending: 0, paid: 0 },
                filteredStats: response.data.filteredStats || { total: 0, pending: 0, paid: 0 }
            });
        } catch (error) {
            console.error('Error loading products:', error);
            alert('Błąd podczas ładowania produktów');
        } finally {
            setLoading(false);
        }
    };

    // Load available months
    const loadAvailableMonths = async () => {
        try {
            const token = getToken();
            const response = await axios.get('/api/pan-kazek/months', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setAvailableMonths(response.data.data || []);
        } catch (error) {
            console.error('Error loading months:', error);
        }
    };

    // Handle payment of all pending items
    const handlePayAll = async () => {
        if (!paidBy.trim()) {
            alert('Proszę wpisać kto rozlicza');
            return;
        }
        
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            alert('Proszę wpisać poprawną kwotę');
            return;
        }

        try {
            setProcessing(true);
            const token = getToken();
            
            const response = await axios.post('/api/pan-kazek/pay-all', {
                paidBy: paidBy,
                paidAmount: parseFloat(paymentAmount)
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            alert(response.data.message);
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaidBy('');
            await loadProducts();
        } catch (error) {
            console.error('Error paying products:', error);
            alert(error.response?.data?.message || 'Błąd podczas rozliczania');
        } finally {
            setProcessing(false);
        }
    };

    // Delete product
    const handleDelete = async (productId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten produkt?')) {
            return;
        }

        try {
            const token = getToken();
            await axios.delete(`/api/pan-kazek/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            alert('Produkt został usunięty');
            await loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Błąd podczas usuwania produktu');
        }
    };

    // Get unique years from available months
    const getAvailableYears = () => {
        const years = [...new Set(availableMonths.map(m => m.year))];
        return years.sort((a, b) => b - a);
    };

    // Get months for selected year
    const getMonthsForYear = () => {
        if (selectedYear === 'all') return [];
        return availableMonths.filter(m => m.year === parseInt(selectedYear));
    };

    useEffect(() => {
        loadProducts();
        loadAvailableMonths();
    }, [filter, selectedMonth, selectedYear]);

    // Reset month when year changes
    useEffect(() => {
        if (selectedYear !== 'all') {
            setSelectedMonth('all');
        }
    }, [selectedYear]);

    const formatPrice = (price) => {
        return price.replace('PLN', '').trim() + ' PLN';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pl-PL');
    };

    const monthNames = [
        '', 'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];

    return (
        <div className="container-fluid mt-4" style={{backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh'}}>
            <div className="row">
                <div className="col-12">
                    <h2 className="mb-4" style={{color: '#ffffff'}}>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        System Rozliczania - Pan Kazek
                    </h2>

                    {/* Filters */}
                    <div className="card mb-4" style={{backgroundColor: '#000000', border: '1px solid #333'}}>
                        <div className="card-body">
                            <h5 className="card-title text-center" style={{color: '#ffffff'}}>
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                Filtry
                            </h5>
                            
                            <div className="row justify-content-center mb-3">
                                <div className="col-lg-3 col-md-4 col-sm-6 mb-2">
                                    <label className="form-label" style={{color: '#ffffff'}}>Status</label>
                                    <select 
                                        className="form-select"
                                        style={{backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333'}}
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                    >
                                        <option value="all">Wszystkie</option>
                                        <option value="pending">Do rozliczenia</option>
                                        <option value="paid">Rozliczone</option>
                                    </select>
                                </div>
                                
                                <div className="col-lg-3 col-md-4 col-sm-6 mb-2">
                                    <label className="form-label" style={{color: '#ffffff'}}>Rok</label>
                                    <select 
                                        className="form-select"
                                        style={{backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333'}}
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        <option value="all">Wszystkie lata</option>
                                        {getAvailableYears().map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="col-lg-3 col-md-4 col-sm-6 mb-2">
                                    <label className="form-label" style={{color: '#ffffff'}}>Miesiąc</label>
                                    <select 
                                        className="form-select"
                                        style={{backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333'}}
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        disabled={selectedYear === 'all'}
                                    >
                                        <option value="all">Wszystkie miesiące</option>
                                        {getMonthsForYear().map(month => (
                                            <option key={`${month.year}-${month.month}`} value={month.month}>
                                                {monthNames[month.month]} ({month.count} kurtek)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {stats.filteredStats.pending > 0 && (
                                <div className="row justify-content-center">
                                    <div className="col-lg-6 col-md-8 col-sm-10">
                                        <button
                                            className="btn btn-success w-100"
                                            onClick={() => setShowPaymentModal(true)}
                                        >
                                            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                            Rozlicz wszystkie ({stats.filteredStats.pending})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="card" style={{backgroundColor: '#000000', border: '1px solid #333'}}>
                        <div className="card-body">
                            <h5 className="card-title" style={{color: '#ffffff'}}>
                                Lista kurtek 
                                <span className="badge bg-secondary ms-2">{products.length}</span>
                            </h5>
                            
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Ładowanie...</span>
                                    </div>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-5">
                                    <p style={{color: '#ffffff'}}>Brak kurtek do wyświetlenia</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-striped table-hover" style={{backgroundColor: '#000000', color: '#ffffff'}}>
                                        <thead style={{backgroundColor: '#000000', color: '#ffffff'}}>
                                            <tr>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Nazwa</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Rozmiar</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Cena</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Dodano</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Status</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Rozliczono (średnio/kurtka)</th>
                                                <th style={{color: '#ffffff', borderColor: '#333'}}>Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((product) => (
                                                <tr key={product._id} style={{backgroundColor: '#000000', color: '#ffffff', borderColor: '#333'}}>
                                                    <td style={{borderColor: '#333'}}>
                                                        <strong style={{color: '#ffffff'}}>{product.fullName}</strong>
                                                        <br />
                                                        <small style={{color: '#ccc'}}>ID: {product.productId}</small>
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        <span className="badge bg-info">{product.size}</span>
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        <strong style={{color: '#ffffff'}}>{formatPrice(product.price)}</strong>
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        <span style={{color: '#ffffff'}}>{formatDate(product.createdAt)}</span>
                                                        <br />
                                                        <small style={{color: '#ccc'}}>przez {product.addedBy}</small>
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        {product.status === 'pending' ? (
                                                            <span className="badge bg-warning">
                                                                <FontAwesomeIcon icon={faClockRotateLeft} className="me-1" />
                                                                Do rozliczenia
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-success">
                                                                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                                Rozliczone
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        {product.status === 'paid' && product.paidAt ? (
                                                            <div>
                                                                <strong style={{color: '#ffffff'}}>
                                                                    {product.totalItemsCount && product.totalItemsCount > 0 
                                                                        ? (product.paidAmount / product.totalItemsCount).toFixed(2)
                                                                        : product.paidAmount
                                                                    } PLN
                                                                </strong>
                                                                <br />
                                                                <small style={{color: '#ccc'}}>
                                                                    {formatDate(product.paidAt)}
                                                                    <br />
                                                                    przez {product.paidBy}
                                                                    {product.totalItemsCount && product.totalItemsCount > 1 && (
                                                                        <>
                                                                            <br />
                                                                            <span className="badge bg-secondary mt-1">
                                                                                {product.totalItemsCount} kurtek za {product.paidAmount} PLN
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </small>
                                                            </div>
                                                        ) : (
                                                            <span style={{color: '#ccc'}}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{borderColor: '#333'}}>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(product.productId)}
                                                            title="Usuń produkt"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{backgroundColor: '#000000', border: '1px solid #333'}}>
                            <div className="modal-header" style={{borderBottom: '1px solid #333'}}>
                                <h5 className="modal-title" style={{color: '#ffffff'}}>
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                    Rozlicz wszystkie kurtki
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowPaymentModal(false)}
                                    disabled={processing}
                                ></button>
                            </div>
                            <div className="modal-body" style={{color: '#ffffff'}}>
                                <div className="alert alert-info" style={{backgroundColor: '#1e3a8a', border: '1px solid #3b82f6', color: '#ffffff'}}>
                                    <strong>Do rozliczenia:</strong> {stats.filteredStats.pending} kurtek
                                </div>
                                
                                <div className="mb-3">
                                    <label className="form-label" style={{color: '#ffffff'}}>Kto rozlicza:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333'}}
                                        value={paidBy}
                                        onChange={(e) => setPaidBy(e.target.value)}
                                        placeholder="np. Jan Kowalski"
                                        disabled={processing}
                                    />
                                </div>
                                
                                <div className="mb-3">
                                    <label className="form-label" style={{color: '#ffffff'}}>Kwota rozliczenia (PLN):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-control"
                                        style={{backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333'}}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        disabled={processing}
                                    />
                                </div>
                                
                                {paymentAmount && stats.filteredStats.pending > 0 && (
                                    <div className="alert alert-success" style={{backgroundColor: '#166534', border: '1px solid #16a34a', color: '#ffffff'}}>
                                        <strong>Średnio na kurtkę:</strong> {(parseFloat(paymentAmount) / stats.filteredStats.pending).toFixed(2)} PLN
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{borderTop: '1px solid #333'}}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPaymentModal(false)}
                                    disabled={processing}
                                >
                                    Anuluj
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-success" 
                                    onClick={handlePayAll}
                                    disabled={processing || !paidBy.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0}
                                >
                                    {processing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Rozliczam...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                            Rozlicz ({paymentAmount} PLN)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PanKazek;
