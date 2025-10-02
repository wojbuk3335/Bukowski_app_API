import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import styles from '../Warehouse/Warehouse.module.css';

// Register Polish locale for DatePicker
registerLocale('pl', pl);

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Fetch sales data on component mount
    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('/api/sales');
                if (Array.isArray(response.data)) {
                    setSales(response.data);
                    setFilteredSales(response.data);
                } else {
                    console.error('Sales data is not an array:', response.data);
                    setSales([]);
                    setFilteredSales([]);
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                setError('Failed to fetch sales data. Please try again later.');
                setSales([]);
                setFilteredSales([]);
            }
        };
        fetchSales();
    }, []);

    useEffect(() => {
        let filtered = [...sales];
        
        // Filter by date range
        if (startDate && endDate) {
            
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter((sale) => {
                if (!sale.date) {
                    return false;
                }
                
                let saleDate;
                if (sale.date instanceof Date) {
                    saleDate = sale.date;
                } else if (typeof sale.date === 'string') {
                    if (sale.date.includes('.')) {
                        const [day, month, year] = sale.date.split('.');
                        saleDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                    } else {
                        saleDate = new Date(sale.date);
                    }
                } else {
                    return false;
                }
                
                if (isNaN(saleDate)) {
                    return false;
                }
                
                const isInRange = saleDate >= startOfDay && saleDate <= endOfDay;
                
                return isInRange;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((sale) =>
                Object.values(sale)
                    .join(' ')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            );
        }

        // Apply column filters
        Object.keys(columnFilters).forEach((key) => {
            if (columnFilters[key]) {
                filtered = filtered.filter((sale) =>
                    String(sale[key] || '')
                        .toLowerCase()
                        .includes(columnFilters[key].toLowerCase())
                );
            }
        });

        setFilteredSales(filtered);
    }, [sales, startDate, endDate, searchQuery, columnFilters]);

    // Analytics function
    const getSalesAnalytics = () => {
        if (!filteredSales || filteredSales.length === 0) {
            return {
                totalSales: 0,
                totalRevenue: {},
                salesByDate: {},
                salesBySellingPoint: {},
                topSellingProducts: {},
                averageOrderValue: {}
            };
        }

        const analytics = {
            totalSales: filteredSales.length,
            totalRevenue: {},
            salesByDate: {},
            salesBySellingPoint: {},
            topSellingProducts: {},
            averageOrderValue: {}
        };

        filteredSales.forEach((sale) => {
            // Calculate total revenue by currency
            if (sale.payments && Array.isArray(sale.payments)) {
                sale.payments.forEach(payment => {
                    if (!analytics.totalRevenue[payment.currency]) {
                        analytics.totalRevenue[payment.currency] = 0;
                    }
                    analytics.totalRevenue[payment.currency] += payment.price;
                });
            }

            // Sales by date
            const saleDate = new Date(sale.date).toLocaleDateString();
            if (!analytics.salesByDate[saleDate]) {
                analytics.salesByDate[saleDate] = { count: 0, revenue: {} };
            }
            analytics.salesByDate[saleDate].count++;

            // Sales by selling point
            if (sale.sellingPoint) {
                if (!analytics.salesBySellingPoint[sale.sellingPoint]) {
                    analytics.salesBySellingPoint[sale.sellingPoint] = { count: 0, revenue: {} };
                }
                analytics.salesBySellingPoint[sale.sellingPoint].count++;
            }

            // Top selling products
            if (sale.fullName) {
                if (!analytics.topSellingProducts[sale.fullName]) {
                    analytics.topSellingProducts[sale.fullName] = { count: 0, revenue: {} };
                }
                analytics.topSellingProducts[sale.fullName].count++;
            }
        });

        // Calculate average order value
        Object.keys(analytics.totalRevenue).forEach(currency => {
            analytics.averageOrderValue[currency] = analytics.totalSales > 0 
                ? (analytics.totalRevenue[currency] / analytics.totalSales)
                : 0;
        });

        return analytics;
    };

    const analytics = getSalesAnalytics();

    const handleExportFullPDF = () => {
        const doc = new jsPDF();
        const analytics = getSalesAnalytics();
        
        doc.setFontSize(20);
        doc.text('Pełny Raport Sprzedaży', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Okres: ${startDate ? startDate.toLocaleDateString() : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString() : 'Wszystkie'}`, 20, 35);
        doc.text(`Data raportu: ${new Date().toLocaleDateString()}`, 20, 45);
        
        let yPosition = 60;
        
        doc.setFontSize(16);
        doc.text('Podsumowanie:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.text(`Łączna liczba sprzedaży: ${analytics.totalSales}`, 20, yPosition);
        yPosition += 10;
        
        Object.entries(analytics.totalRevenue).forEach(([currency, amount]) => {
            doc.text(`Przychód (${currency}): ${amount.toFixed(2)}`, 20, yPosition);
            yPosition += 10;
        });

        Object.entries(analytics.averageOrderValue).forEach(([currency, avg]) => {
            doc.text(`Średnia wartość zamówienia (${currency}): ${avg.toFixed(2)}`, 20, yPosition);
            yPosition += 10;
        });
        
        yPosition += 10;
        doc.text('Sprzedaż według punktów:', 20, yPosition);
        yPosition += 10;
        
        Object.entries(analytics.salesBySellingPoint).forEach(([point, data]) => {
            doc.text(`${point}: ${data.count} sprzedaży`, 25, yPosition);
            yPosition += 8;
        });

        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.text('Dane transakcji:', 20, yPosition + 10);
        
        const tableData = filteredSales.map((sale, index) => [
            index + 1,
            sale.fullName || '',
            sale.date || '',
            sale.sellingPoint || '',
            sale.size || '',
            sale.barcode || '',
            sale.payments ? sale.payments.map(p => `${p.price} ${p.currency}`).join(', ') : '',
            sale.timestamp || ''
        ]);

        autoTable(doc, {
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Punkt sprzedaży', 'Rozmiar', 'Kod kreskowy', 'Płatności', 'Timestamp']],
            body: tableData,
            startY: yPosition + 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });

        doc.save('pelny_raport_sprzedazy.pdf');
    };

    const handlePrintReport = () => {
        const printContent = document.getElementById('sales-report-content');
        if (printContent) {
            const newWin = window.open('');
            newWin.document.write(`
                <html>
                    <head>
                        <title>Raport Sprzedaży</title>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                        </style>
                    </head>
                    <body>
                        <h1>Raport Sprzedaży</h1>
                        <p>Data raportu: ${new Date().toLocaleDateString()}</p>
                        ${printContent.innerHTML}
                    </body>
                </html>
            `);
            newWin.document.close();
            newWin.print();
        }
    };

    const handleExportExcel = () => {
        const excelData = filteredSales.map((sale, index) => ({
            'Lp.': index + 1,
            'Pełna nazwa': sale.fullName || '',
            'Data': sale.date || '',
            'Punkt sprzedaży': sale.sellingPoint || '',
            'Rozmiar': sale.size || '',
            'Kod kreskowy': sale.barcode || '',
            'Płatności': sale.payments ? sale.payments.map(p => `${p.price} ${p.currency}`).join(', ') : '',
            'Timestamp': sale.timestamp || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprzedaż');
        XLSX.writeFile(workbook, 'sprzedaz.xlsx');
    };

    const handleDropdownFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }

        const sortedSales = [...filteredSales].sort((a, b) => {
            if (a[key] < b[key]) {
                return direction === 'asc' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        setFilteredSales(sortedSales);
        setSortConfig({ key, direction });
    };

    const getUniqueValues = (key) => {
        return [...new Set(sales.map((sale) => sale[key]).filter(Boolean))];
    };

    const csvData = filteredSales.map((sale, index) => ({
        'Lp.': index + 1,
        'Pełna nazwa': sale.fullName || '',
        'Data': sale.date || '',
        'Punkt sprzedaży': sale.sellingPoint || '',
        'Rozmiar': sale.size || '',
        'Kod kreskowy': sale.barcode || '',
        'Płatności': sale.payments ? sale.payments.map(p => `${p.price} ${p.currency}`).join(', ') : '',
        'Timestamp': sale.timestamp || ''
    }));

    return (
        <div>
            <h1 className={styles.title}>Sprzedaż</h1> 
            <div className="d-flex flex-column align-items-center mb-3">
                <div className="d-flex justify-content-center mb-3">
                    <div className="me-3">
                        <label>Data początkowa:</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="form-control"
                            placeholderText="Wybierz datę początkową"
                            locale="pl"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                    <div>
                        <label>Data końcowa:</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="form-control"
                            placeholderText="Wybierz datę końcową"
                            locale="pl"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>
                <div style={{ width: '200px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Wyszukaj..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="d-flex justify-content-center mb-3">
                <CSVLink data={csvData} filename="sprzedaz.csv" className="btn btn-primary me-2">
                    Eksportuj CSV
                </CSVLink>
                <button className="btn btn-warning me-2" onClick={handleExportFullPDF}>
                    Eksportuj PDF (Dane + Podsumowanie)
                </button>
                <button className="btn btn-success me-2" onClick={handlePrintReport}>
                    Drukuj Raport
                </button>
                <button className="btn btn-info" onClick={handleExportExcel}>
                    Eksportuj Excel
                </button>
            </div>

            <div id="sales-report-content" className={styles.tableContainer}>
                <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
                    <caption className={styles.caption}>Tabela przedstawiająca dane sprzedaży w systemie</caption>
                    <thead>
                        <tr>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('lp')}>
                                Lp. {sortConfig.key === 'lp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('lp', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('fullName')}>
                                Pełna nazwa {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('fullName', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')}>
                                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('date', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sellingPoint')}>
                                Punkt sprzedaży {sortConfig.key === 'sellingPoint' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <select
                                    className="form-control form-control-sm mt-1"
                                    onChange={(e) => handleDropdownFilterChange('sellingPoint', e.target.value)}
                                >
                                    <option value="">Wszystkie</option>
                                    {getUniqueValues('sellingPoint').map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('size')}>
                                Rozmiar {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <select
                                    className="form-control form-control-sm mt-1"
                                    onChange={(e) => handleDropdownFilterChange('size', e.target.value)}
                                >
                                    <option value="">Wszystkie</option>
                                    {getUniqueValues('size').map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('barcode')}>
                                Kod kreskowy {sortConfig.key === 'barcode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('barcode', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('payments')}>
                                Płatności {sortConfig.key === 'payments' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('timestamp')}>
                                Timestamp {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length > 0 ? (
                            filteredSales.map((sale, index) => (
                                <tr key={sale._id || index}>
                                    <td>{index + 1}</td>
                                    <td>{sale.fullName}</td>
                                    <td>{sale.date}</td>
                                    <td>{sale.sellingPoint}</td>
                                    <td>{sale.size}</td>
                                    <td>{sale.barcode}</td>
                                    <td>
                                        {sale.payments && Array.isArray(sale.payments)
                                            ? sale.payments.map((payment, i) => (
                                                  <div key={i}>{`${payment.price} ${payment.currency}`}</div>
                                              ))
                                            : 'Brak płatności'}
                                    </td>
                                    <td>{sale.timestamp}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center">
                                    {error ? error : 'Brak danych sprzedaży'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="8" className="text-center">
                                <strong>Łączne przychody: </strong>
                                {Object.entries(analytics.totalRevenue).map((item, index) => (
                                    <div key={index}>
                                        {item[1].toFixed(2)} {item[0]}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Sales;