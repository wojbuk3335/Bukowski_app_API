import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Container, Row, Col } from 'reactstrap';
import axios from 'axios';
import styles from '../Warehouse/Warehouse.module.css';

// Custom styles for better visibility
const customStyles = `
  .custom-input::placeholder {
    color: #adb5bd !important;
    opacity: 1 !important;
  }
  .custom-input:focus::placeholder {
    color: #6c757d !important;
  }
  .modal-dark .modal-content {
    background-color: #1a1a1a !important;
    color: #fff !important;
    border: 1px solid #495057 !important;
  }
  .modal-dark .modal-header {
    background-color: #000 !important;
    color: #fff !important;
    border-bottom: 1px solid #495057 !important;
  }
  .modal-dark .modal-footer {
    background-color: #1a1a1a !important;
    border-top: 1px solid #495057 !important;
  }
  .modal-dark .close {
    color: #fff !important;
  }
  .form-select {
    background-color: #212529 !important;
    color: #fff !important;
    border: 1px solid #495057 !important;
  }
  .form-select option {
    background-color: #212529 !important;
    color: #fff !important;
  }
`;

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    
    // New states for order completion
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState(null);
    const [shippingDate, setShippingDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'

    // Fetch orders from API
    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/orders');
            
            if (response.data.success) {
                setOrders(response.data.data);
                setFilteredOrders(response.data.data);
            } else {
                setError('Błąd podczas pobierania zamówień');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setError('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    // Filter orders based on search query and status
    useEffect(() => {
        let filtered = orders;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(order => 
                order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer.phone.includes(searchQuery) ||
                (order.customer.email && order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (order.product.name && order.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => {
                if (statusFilter === 'completed') {
                    return order.status === 'zrealizowano';
                } else if (statusFilter === 'pending') {
                    return order.status !== 'zrealizowano';
                }
                return true;
            });
        }

        // Sort by urgency (closest realization time first)
        filtered = filtered.sort((a, b) => {
            const today = new Date();
            const dateA = new Date(a.requiredDate || a.createdAt);
            const dateB = new Date(b.requiredDate || b.createdAt);
            
            // Calculate days difference
            const daysA = Math.ceil((dateA - today) / (1000 * 60 * 60 * 24));
            const daysB = Math.ceil((dateB - today) / (1000 * 60 * 60 * 24));
            
            return daysA - daysB;
        });

        setFilteredOrders(filtered);
    }, [searchQuery, orders, statusFilter]);

    // Sort orders
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sorted = [...filteredOrders].sort((a, b) => {
            let aVal = key.includes('.') ? key.split('.').reduce((o, k) => o[k], a) : a[key];
            let bVal = key.includes('.') ? key.split('.').reduce((o, k) => o[k], b) : b[key];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredOrders(sorted);
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format price
    const formatPrice = (price) => {
        return `${price.toFixed(2)} zł`;
    };



    // Get urgency status for realization date
    const getUrgencyStatus = (realizationDate) => {
        if (!realizationDate) return { status: 'unknown', days: null };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare only dates
        const realDate = new Date(realizationDate);
        realDate.setHours(0, 0, 0, 0);
        
        const diffTime = realDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { status: 'overdue', days: Math.abs(diffDays) };
        if (diffDays === 0) return { status: 'today', days: 0 };
        if (diffDays <= 3) return { status: 'urgent', days: diffDays };
        if (diffDays <= 7) return { status: 'soon', days: diffDays };
        return { status: 'normal', days: diffDays };
    };

    // Get urgency badge style
    const getUrgencyBadgeProps = (urgency) => {
        switch (urgency.status) {
            case 'overdue':
                return { color: 'danger', text: `🚨 Przeterminowane (${urgency.days}d temu)` };
            case 'today':
                return { color: 'warning', text: '⏰ Dziś!' };
            case 'urgent':
                return { color: 'warning', text: `⚡ Pilne (${urgency.days}d)` };
            case 'soon':
                return { color: 'info', text: `📅 ${urgency.days}d` };
            case 'normal':
                return { color: 'secondary', text: `📅 ${urgency.days}d` };
            default:
                return { color: 'secondary', text: 'Brak daty' };
        }
    };

    // Get delivery option label
    const getDeliveryOptionLabel = (option) => {
        switch (option) {
            case 'shipping': return 'Wysyłka';
            case 'delivery': return 'Dostawa';
            case 'pickup': return 'Odbiór osobisty';
            default: return option;
        }
    };

    // Get status badge color
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'confirmed': return 'info';
            case 'in-progress': return 'primary';
            case 'completed': return 'success';
            case 'zrealizowano': return 'success';
            case 'cancelled': return 'danger';
            default: return 'warning'; // Default dla nowych zamówień
        }
    };

    // Show order details
    const showOrderDetails = (order) => {
        setSelectedOrder(order);
        setDetailsModalOpen(true);
    };

    // Open complete order modal
    const openCompleteModal = (order) => {
        setOrderToComplete(order);
        setShippingDate('');
        setCompleteModalOpen(true);
    };

    // Complete order function
    const completeOrder = async () => {
        if (!shippingDate) {
            alert('Proszę wybrać datę wysyłki');
            return;
        }

        try {
            const response = await axios.put(`/api/orders/${orderToComplete._id}/complete`, {
                shippingDate: shippingDate,
                status: 'zrealizowano'
            });

            if (response.data.success) {
                // Refresh orders list
                fetchOrders();
                setCompleteModalOpen(false);
                setOrderToComplete(null);
                setShippingDate('');
                alert('Zamówienie zostało zrealizowane i klient otrzymał powiadomienie email');
            } else {
                alert('Błąd podczas realizacji zamówienia');
            }
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Błąd połączenia z serwerem');
        }
    };

    // Revert order to pending status
    const revertOrder = async (order) => {
        const confirmed = window.confirm(
            `Czy na pewno chcesz przywrócić zamówienie ${order.orderId} do statusu aktywnego?\n\n` +
            `To spowoduje:\n` +
            `• Zmianę statusu na "pending"\n` +
            `• Usunięcie daty wysyłki\n` +
            `• Przywrócenie zamówienia do listy aktywnych`
        );

        if (!confirmed) return;

        try {
            const response = await axios.put(`/api/orders/${order._id}/revert`);

            if (response.data.success) {
                fetchOrders();
                alert('Zamówienie zostało przywrócone do statusu aktywnego');
            } else {
                alert('Błąd podczas przywracania zamówienia');
            }
        } catch (error) {
            console.error('Error reverting order:', error);
            alert('Błąd połączenia z serwerem');
        }
    };

    // Print address function
    const printAddress = (order) => {
        const printWindow = window.open('', '_blank');
        const address = order.customer.address;
        
        // Format address
        const addressLines = [
            order.customer.name.toUpperCase(),
            `${address.street ? address.street + ' ' : ''}${address.houseNumber || ''}`.trim(),
            `${address.postalCode || ''} ${address.city || ''}`.trim(),
            `tel. ${order.customer.phone}`
        ].filter(line => line.trim() !== '');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Adres do wysyłki - ${order.orderId}</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 2cm;
                    }
                    
                    body {
                        font-family: 'Arial', sans-serif;
                        font-size: 52px;
                        font-weight: bold;
                        line-height: 1.4;
                        color: #000;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: white;
                    }
                    
                    .address-container {
                        text-align: center;
                        border: 5px solid #000;
                        padding: 60px 100px;
                        background: white;
                        max-width: 900px;
                    }
                    
                    .address-line {
                        margin: 25px 0;
                        letter-spacing: 3px;
                    }
                    
                    .name {
                        font-size: 60px;
                        margin-bottom: 35px;
                    }
                    
                    .phone {
                        font-size: 48px;
                        margin-top: 35px;
                        color: #333;
                    }
                    
                    .cod-info {
                        font-size: 56px;
                        margin-top: 50px;
                        padding-top: 40px;
                        border-top: 4px solid #000;
                        color: #d9534f;
                        font-weight: 900;
                    }
                    
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .address-container {
                            border: 3px solid #000 !important;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="address-container">
                    <div class="address-line name">${addressLines[0]}</div>
                    ${addressLines[1] ? `<div class="address-line">${addressLines[1].toUpperCase()}</div>` : ''}
                    <div class="address-line">${addressLines[2]?.toUpperCase()}</div>
                    <div class="address-line phone">${addressLines[3]}</div>
                    <div class="cod-info">POBRANIE: ${order.payment?.cashOnDelivery || order.payment?.totalPrice || '0.00'} ZŁ</div>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 1000);
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Ładowanie...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Card style={{backgroundColor: '#1a1a1a', border: '1px solid #495057'}}>
                <CardHeader style={{backgroundColor: '#000', color: '#fff'}}>
                    <h4 className="mb-0">📦 Zamówienia z aplikacji mobilnej</h4>
                </CardHeader>
                <CardBody style={{backgroundColor: '#1a1a1a', color: '#fff'}}>
                    {/* Search and filters */}
                    <Row className="mb-3">
                        <Col md={8}>
                            <style>{customStyles}</style>
                            <input
                                type="text"
                                className="form-control custom-input"
                                placeholder="Szukaj po numerze zamówienia, nazwie klienta, telefonie, email lub produkcie..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    backgroundColor: '#212529',
                                    color: '#fff',
                                    border: '1px solid #495057'
                                }}
                            />
                        </Col>
                        <Col md={4}>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Wszystkie zamówienia</option>
                                <option value="pending">Oczekujące</option>
                                <option value="completed">Zrealizowane</option>
                            </select>
                        </Col>
                    </Row>

                    {/* Orders count */}
                    <div className="mb-3">
                        <small className="text-muted">
                            Znaleziono: {filteredOrders.length} zamówień z {orders.length} ogółem
                            {statusFilter !== 'all' && (
                                <span> | Filtr: {statusFilter === 'pending' ? 'Oczekujące' : 'Zrealizowane'}</span>
                            )}
                        </small>
                    </div>

                    {/* Orders table */}
                    <div className="table-responsive">
                        <Table striped hover className="mb-0 table-dark">
                            <thead className="table-dark">
                                <tr>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('orderId')}
                                    >
                                        Nr zamówienia {sortConfig.key === 'orderId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        Data zamówienia {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('customer.name')}
                                    >
                                        Klient {sortConfig.key === 'customer.name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Produkt</th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('customer.deliveryOption')}
                                    >
                                        Dostawa {sortConfig.key === 'customer.deliveryOption' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('payment.cashOnDelivery')}
                                    >
                                        Kwota pobrania {sortConfig.key === 'payment.cashOnDelivery' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('realizationDate')}
                                    >
                                        📅 Data realizacji {sortConfig.key === 'realizationDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('status')}
                                    >
                                        Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center text-muted py-4">
                                            Brak zamówień do wyświetlenia
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order._id}>
                                            <td>
                                                <strong>{order.orderId}</strong>
                                            </td>
                                            <td>{formatDate(order.createdAt)}</td>
                                            <td>
                                                <div>
                                                    <strong>{order.customer.name}</strong>
                                                </div>
                                                <small className="text-muted">
                                                    📞 {order.customer.phone}
                                                </small>
                                                {order.customer.email && (
                                                    <div>
                                                        <small className="text-muted">
                                                            ✉️ {order.customer.email}
                                                        </small>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div>
                                                    {order.product.name && <strong>{order.product.name}</strong>}
                                                </div>
                                                {order.product.color && (
                                                    <small className="text-muted">Kolor: {order.product.color}</small>
                                                )}
                                                {order.product.size && (
                                                    <div>
                                                        <small className="text-muted">Rozmiar: {order.product.size}</small>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <Badge 
                                                    color={order.customer.deliveryOption === 'shipping' ? 'info' : 
                                                          order.customer.deliveryOption === 'delivery' ? 'warning' : 'secondary'}
                                                    className="fs-6 px-3 py-2"
                                                >
                                                    {getDeliveryOptionLabel(order.customer.deliveryOption)}
                                                </Badge>
                                                {order.customer.deliveryOption !== 'pickup' && order.customer.address.city && (
                                                    <div>
                                                        <small className="text-muted">
                                                            📍 {order.customer.address.city}
                                                        </small>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <strong>{formatPrice(order.payment.cashOnDelivery)}</strong>
                                                <div>
                                                    <small className="text-muted">
                                                        Cena: {formatPrice(order.payment.totalPrice)}
                                                    </small>
                                                </div>
                                                {order.payment.deposit > 0 && (
                                                    <div>
                                                        <small className="text-muted">
                                                            Zaliczka: {formatPrice(order.payment.deposit)}
                                                        </small>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const urgency = getUrgencyStatus(order.realizationDate);
                                                    const badgeProps = getUrgencyBadgeProps(urgency);
                                                    return (
                                                        <div>
                                                            <div className="fw-bold">{formatDate(order.realizationDate)}</div>
                                                            <Badge 
                                                                color={badgeProps.color} 
                                                                className="mt-1 fs-6 px-3 py-2"
                                                            >
                                                                {badgeProps.text}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <Badge 
                                                    color={getStatusBadgeColor(order.status)}
                                                    className={order.status === 'pending' ? 'fs-6 px-3 py-2' : ''}
                                                    style={order.status === 'pending' ? {backgroundColor: '#ffc107', color: '#000', border: 'none'} : {}}
                                                >
                                                    {order.status === 'pending' ? 'OCZEKUJĄCE' : order.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    color="primary"
                                                    onClick={() => showOrderDetails(order)}
                                                    className="me-2"
                                                >
                                                    Szczegóły
                                                </Button>
                                                
                                                {order.status !== 'zrealizowano' && (
                                                    <Button
                                                        size="sm"
                                                        color="warning"
                                                        onClick={() => openCompleteModal(order)}
                                                        className="me-2"
                                                    >
                                                        Zrealizuj
                                                    </Button>
                                                )}

                                                {order.status === 'zrealizowano' && (
                                                    <Button
                                                        size="sm"
                                                        color="info"
                                                        onClick={() => revertOrder(order)}
                                                        className="me-2"
                                                    >
                                                        🔄 Przywróć do aktywnych
                                                    </Button>
                                                )}
                                                
                                                {order.customer.deliveryOption !== 'pickup' && (
                                                    <Button
                                                        size="sm"
                                                        color="success"
                                                        onClick={() => printAddress(order)}
                                                    >
                                                        Drukuj Adres
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </CardBody>
            </Card>

            {/* Order Details Modal */}
            <Modal isOpen={detailsModalOpen} toggle={() => setDetailsModalOpen(false)} size="lg" className="modal-dark">
                <ModalHeader toggle={() => setDetailsModalOpen(false)}>
                    📦 Szczegóły zamówienia: {selectedOrder?.orderId}
                </ModalHeader>
                <ModalBody>
                    {selectedOrder && (
                        <div>
                            {/* Order Info */}
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h6>📋 Informacje o zamówieniu</h6>
                                    <p><strong>Numer:</strong> {selectedOrder.orderId}</p>
                                    <p><strong>Data złożenia:</strong> {formatDate(selectedOrder.createdAt)}</p>
                                    <p><strong>📅 Data realizacji:</strong> 
                                        <span className="ms-2">
                                            {formatDate(selectedOrder.realizationDate)}
                                            {(() => {
                                                const urgency = getUrgencyStatus(selectedOrder.realizationDate);
                                                const badgeProps = getUrgencyBadgeProps(urgency);
                                                return (
                                                    <Badge 
                                                        color={badgeProps.color} 
                                                        className="ms-2 fs-6 px-3 py-2"
                                                    >
                                                        {badgeProps.text}
                                                    </Badge>
                                                );
                                            })()}
                                        </span>
                                    </p>
                                    <p><strong>Data realizacji:</strong> {formatDate(selectedOrder.realizationDate)}</p>
                                    <p><strong>Status:</strong> 
                                        <Badge 
                                            className={selectedOrder.status === 'pending' ? 'ms-2 fs-6 px-3 py-2' : 'ms-2'}
                                            color={getStatusBadgeColor(selectedOrder.status)}
                                            style={selectedOrder.status === 'pending' ? {backgroundColor: '#ffc107', color: '#000', border: 'none'} : {}}
                                        >
                                            {selectedOrder.status === 'pending' ? 'OCZEKUJĄCE' : selectedOrder.status}
                                        </Badge>
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <h6>🛍️ Produkt</h6>
                                    <p><strong>Nazwa:</strong> {selectedOrder.product.name || 'Nie podano'}</p>
                                    <p><strong>Kolor:</strong> {selectedOrder.product.color || 'Nie podano'}</p>
                                    <p><strong>Rozmiar:</strong> {selectedOrder.product.size || 'Nie podano'}</p>
                                    {selectedOrder.product.description && (
                                        <p><strong>Opis:</strong> {selectedOrder.product.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h6>👤 Dane klienta</h6>
                                    <p><strong>Imię i nazwisko:</strong> {selectedOrder.customer.name}</p>
                                    <p><strong>Telefon:</strong> {selectedOrder.customer.phone}</p>
                                    {selectedOrder.customer.email && (
                                        <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
                                    )}
                                </div>
                                <div className="col-md-6">
                                    <h6>🚚 Dostawa</h6>
                                    <p><strong>Sposób dostawy:</strong> 
                                        <Badge 
                                            className="ms-2 fs-6 px-3 py-2" 
                                            color={selectedOrder.customer.deliveryOption === 'shipping' ? 'info' : 
                                                  selectedOrder.customer.deliveryOption === 'delivery' ? 'warning' : 'secondary'}
                                        >
                                            {getDeliveryOptionLabel(selectedOrder.customer.deliveryOption)}
                                        </Badge>
                                    </p>
                                    {selectedOrder.customer.deliveryOption !== 'pickup' && (
                                        <div>
                                            <p><strong>Adres:</strong></p>
                                            <address>
                                                {selectedOrder.customer.address.postalCode && (
                                                    <>{selectedOrder.customer.address.postalCode} </>
                                                )}
                                                {selectedOrder.customer.address.city}<br />
                                                {selectedOrder.customer.address.street && (
                                                    <>{selectedOrder.customer.address.street} </>
                                                )}
                                                {selectedOrder.customer.address.houseNumber}
                                            </address>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="row">
                                <div className="col-md-6">
                                    <h6>💰 Rozliczenie</h6>
                                    <p><strong>Cena całkowita:</strong> {formatPrice(selectedOrder.payment.totalPrice)}</p>
                                    <p><strong>Zaliczka:</strong> {formatPrice(selectedOrder.payment.deposit)}</p>
                                    <p><strong>Kwota pobrania:</strong> <span className="text-success fw-bold">{formatPrice(selectedOrder.payment.cashOnDelivery)}</span></p>
                                    <p><strong>Rodzaj dokumentu:</strong> {selectedOrder.payment.documentType === 'invoice' ? 'Faktura' : 'Paragon'}</p>
                                    {selectedOrder.payment.nip && (
                                        <p><strong>NIP:</strong> {selectedOrder.payment.nip}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {selectedOrder && selectedOrder.status === 'zrealizowano' && (
                        <Button 
                            color="info" 
                            onClick={() => {
                                setDetailsModalOpen(false);
                                revertOrder(selectedOrder);
                            }}
                        >
                            🔄 Przywróć do aktywnych
                        </Button>
                    )}
                    <Button color="secondary" onClick={() => setDetailsModalOpen(false)}>
                        Zamknij
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Complete Order Modal */}
            <Modal isOpen={completeModalOpen} toggle={() => setCompleteModalOpen(false)} size="lg" className="modal-dark">
                <ModalHeader toggle={() => setCompleteModalOpen(false)} style={{fontSize: '1.5rem', padding: '1.5rem'}}>
                    <h3 className="mb-0">✅ Realizacja zamówienia</h3>
                </ModalHeader>
                <ModalBody style={{padding: '2rem', fontSize: '1.1rem'}}>
                    {orderToComplete && (
                        <div>
                            <div className="mb-4 p-3" style={{backgroundColor: '#2a2a2a', borderRadius: '8px', border: '1px solid #495057'}}>
                                <h5 className="mb-3" style={{color: '#ffc107'}}>📋 Szczegóły zamówienia:</h5>
                                <p className="mb-2" style={{fontSize: '1.2rem'}}><strong>📦 Zamówienie:</strong> <span style={{color: '#17a2b8'}}>{orderToComplete.orderId}</span></p>
                                <p className="mb-2" style={{fontSize: '1.2rem'}}><strong>👤 Klient:</strong> {orderToComplete.customer.name}</p>
                                <p className="mb-0" style={{fontSize: '1.2rem'}}><strong>📧 Email:</strong> {orderToComplete.customer.email}</p>
                            </div>
                            
                            <Form>
                                <FormGroup className="mb-4">
                                    <Label for="shippingDate" style={{color: '#fff', fontSize: '1.3rem', marginBottom: '1rem'}}>
                                        <strong>📅 Data planowanej wysyłki:</strong>
                                    </Label>
                                    <div style={{position: 'relative'}}>
                                        <Input
                                            type="date"
                                            id="shippingDate"
                                            value={shippingDate}
                                            onChange={(e) => setShippingDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                            style={{
                                                backgroundColor: '#212529',
                                                color: '#fff',
                                                border: '2px solid #495057',
                                                fontSize: '1.2rem',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <span 
                                            style={{
                                                position: 'absolute',
                                                right: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '1.5rem',
                                                pointerEvents: 'none',
                                                color: '#ffc107'
                                            }}
                                        >
                                            📅
                                        </span>
                                    </div>
                                    <small style={{color: '#adb5bd', fontSize: '1.1rem', marginTop: '0.5rem', display: 'block'}}>
                                        💡 Klient otrzyma email z informacją o planowanej dacie wysyłki
                                    </small>
                                </FormGroup>
                            </Form>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter style={{padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                    <Button 
                        color="success" 
                        onClick={completeOrder}
                        disabled={!shippingDate}
                        size="lg"
                        style={{
                            fontSize: '1.2rem', 
                            padding: '0.75rem 2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '50px'
                        }}
                    >
                        🚚 Potwierdź realizację
                    </Button>
                    <Button 
                        color="secondary" 
                        onClick={() => setCompleteModalOpen(false)}
                        size="lg"
                        style={{
                            fontSize: '1.2rem', 
                            padding: '0.75rem 2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '50px',
                            marginLeft: '1rem'
                        }}
                    >
                        ❌ Anuluj
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Orders;