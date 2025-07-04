import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker'; // Install react-datepicker if not already installed
import 'react-datepicker/dist/react-datepicker.css'; // Import styles for the date picker
import { CSVLink } from 'react-csv'; // Install react-csv if not already installed
import jsPDF from 'jspdf'; // Install jspdf if not already installed
import autoTable from 'jspdf-autotable'; // Install jspdf-autotable if not already installed
import * as XLSX from 'xlsx'; // Install xlsx if not already installed
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import styles from '../Warehouse/Warehouse.module.css'; // Use the same styles as Warehouse.js

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const Sales = () => {
    const [sales, setSales] = useState([]); // Ensure sales is initialized as an empty array
    const [filteredSales, setFilteredSales] = useState([]); // State for filtered sales
    const [error, setError] = useState(null); // State to track errors
    const [startDate, setStartDate] = useState(null); // Start date for date range filter
    const [endDate, setEndDate] = useState(null); // End date for date range filter
    const [searchQuery, setSearchQuery] = useState(''); // Search query for the search bar
    const [columnFilters, setColumnFilters] = useState({}); // Filters for individual columns
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration
    const [showAnalytics, setShowAnalytics] = useState(false); // Show/hide analytics panel
    const [reportType, setReportType] = useState('summary'); // Type of report to display

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('/api/sales/get-all-sales'); // Adjust the endpoint if necessary
                if (Array.isArray(response.data)) {
                    setSales(response.data); // Set sales if the response is an array
                    setFilteredSales(response.data); // Initialize filtered sales
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setSales([]); // Fallback to an empty array
                    setFilteredSales([]);
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                setError('Failed to fetch sales data. Please try again later.');
                setSales([]); // Fallback to an empty array
                setFilteredSales([]);
            }
        };

        fetchSales();
    }, []);

    useEffect(() => {
        console.log('Applying filters:', { sales, startDate, endDate, searchQuery, columnFilters }); // Debugging log

        // Apply all filters (date range, search query, and column filters)
        let filtered = [...sales];

        // Filter by date range
        if (startDate && endDate) {
            filtered = filtered.filter((sale) => {
                const saleDate = new Date(sale.timestamp);
                return saleDate >= startDate && saleDate <= endDate;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((sale) =>
                Object.values(sale).some((value) =>
                    String(value).toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }        // Filter by column filters
        Object.keys(columnFilters).forEach((key) => {
            if (columnFilters[key]) {
                console.log(`Filtering column: ${key}, Filter value: ${columnFilters[key]}`); // Debugging log
                filtered = filtered.filter((sale) => {
                    let saleValue;
                    
                    // Special handling for timestamp to match the displayed format
                    if (key === 'timestamp') {
                        saleValue = new Date(sale.timestamp).toLocaleDateString();
                    } else if (key === 'sizeId') {
                        saleValue = String(sale.size || ''); // Map 'sizeId' to 'size'
                    } else {
                        saleValue = String(sale[key] || '');
                    }
                    
                    saleValue = saleValue.trim().toLowerCase();
                    const filterValue = columnFilters[key].trim().toLowerCase();
                    console.log(`Sale value: ${saleValue}, Matches: ${saleValue.includes(filterValue)}`); // Debugging log
                    return saleValue.includes(filterValue);
                });
            }
        });

        console.log('Filtered sales:', filtered); // Debugging log
        setFilteredSales(filtered);
    }, [sales, startDate, endDate, searchQuery, columnFilters]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedSales = React.useMemo(() => {
        if (!sortConfig.key) return filteredSales;
        return [...filteredSales].sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredSales, sortConfig]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text('Sales Data', 20, 10);
        autoTable(doc, {
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],
            body: filteredSales.map((sale, index) => [
                index + 1,
                sale.fullName,
                new Date(sale.timestamp).toLocaleDateString(),
                sale.barcode,
                sale.size || 'N/A', // Use plain string value of sizeId
                sale.sellingPoint,
                sale.from,
                sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            ]),
        });
        doc.save('sales_data.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            filteredSales.map((sale, index) => ({
                Lp: index + 1,
                'Pełna nazwa': sale.fullName,
                Data: new Date(sale.timestamp).toLocaleDateString(),
                'Kod kreskowy': sale.barcode,
                Rozmiar: sale.size || 'N/A', // Use plain string value of sizeId
                'Punkt sprzedaży': sale.sellingPoint,
                Skąd: sale.from,
                Karta: sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                Gotówka: sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
        XLSX.writeFile(workbook, 'sales_data.xlsx');
    };

    if (error) {
        return <div className={styles.error}>{error}</div>; // Display error message if any
    }

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value.toLowerCase(), // Ensure case-insensitive filtering
        }));
    };

    const calculateSummary = (sales, key) => {
        const summary = {};
        sales.forEach((sale) => {
            sale[key].forEach((entry) => {
                const { price, currency } = entry;
                if (!summary[currency]) {
                    summary[currency] = 0;
                }
                summary[currency] += price;
            });
        });
        return summary;
    };

    const cardSummary = calculateSummary(filteredSales, 'card');
    const cashSummary = calculateSummary(filteredSales, 'cash');

    // Analytics functions
    const getSalesAnalytics = () => {
        const analytics = {
            totalSales: filteredSales.length,
            totalRevenue: {},
            avgSaleValue: {},
            topSellingProducts: {},
            salesByDate: {},
            salesBySellingPoint: {},
            salesBySize: {}
        };

        // Calculate total revenue and average sale value
        filteredSales.forEach(sale => {
            [...sale.card, ...sale.cash].forEach(payment => {
                if (!analytics.totalRevenue[payment.currency]) {
                    analytics.totalRevenue[payment.currency] = 0;
                }
                analytics.totalRevenue[payment.currency] += payment.price;
            });
        });

        // Calculate average sale value
        Object.keys(analytics.totalRevenue).forEach(currency => {
            analytics.avgSaleValue[currency] = (analytics.totalRevenue[currency] / filteredSales.length).toFixed(2);
        });

        // Group sales by date
        filteredSales.forEach(sale => {
            const date = new Date(sale.timestamp).toLocaleDateString();
            if (!analytics.salesByDate[date]) {
                analytics.salesByDate[date] = { count: 0, revenue: {} };
            }
            analytics.salesByDate[date].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                if (!analytics.salesByDate[date].revenue[payment.currency]) {
                    analytics.salesByDate[date].revenue[payment.currency] = 0;
                }
                analytics.salesByDate[date].revenue[payment.currency] += payment.price;
            });
        });

        // Group by selling point
        filteredSales.forEach(sale => {
            if (!analytics.salesBySellingPoint[sale.sellingPoint]) {
                analytics.salesBySellingPoint[sale.sellingPoint] = { count: 0, revenue: {} };
            }
            analytics.salesBySellingPoint[sale.sellingPoint].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                if (!analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency]) {
                    analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency] = 0;
                }
                analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency] += payment.price;
            });
        });

        // Group by product name
        filteredSales.forEach(sale => {
            if (!analytics.topSellingProducts[sale.fullName]) {
                analytics.topSellingProducts[sale.fullName] = { count: 0, revenue: {} };
            }
            analytics.topSellingProducts[sale.fullName].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                if (!analytics.topSellingProducts[sale.fullName].revenue[payment.currency]) {
                    analytics.topSellingProducts[sale.fullName].revenue[payment.currency] = 0;
                }
                analytics.topSellingProducts[sale.fullName].revenue[payment.currency] += payment.price;
            });
        });

        // Group by size
        filteredSales.forEach(sale => {
            const size = sale.size || 'Brak rozmiaru';
            if (!analytics.salesBySize[size]) {
                analytics.salesBySize[size] = { count: 0, revenue: {} };
            }
            analytics.salesBySize[size].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                if (!analytics.salesBySize[size].revenue[payment.currency]) {
                    analytics.salesBySize[size].revenue[payment.currency] = 0;
                }
                analytics.salesBySize[size].revenue[payment.currency] += payment.price;
            });
        });

        return analytics;
    };

    const analytics = getSalesAnalytics();

    // Chart data preparation
    const getChartData = () => {
        const salesByDate = analytics.salesByDate;
        const dates = Object.keys(salesByDate).sort();
        const counts = dates.map(date => salesByDate[date].count);
        
        return {
            dailySales: {
                labels: dates,
                datasets: [{
                    label: 'Liczba sprzedaży',
                    data: counts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            sellingPoints: {
                labels: Object.keys(analytics.salesBySellingPoint),
                datasets: [{
                    data: Object.values(analytics.salesBySellingPoint).map(point => point.count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            topProducts: {
                labels: Object.keys(analytics.topSellingProducts)
                    .sort((a, b) => analytics.topSellingProducts[b].count - analytics.topSellingProducts[a].count)
                    .slice(0, 10),
                datasets: [{
                    label: 'Liczba sprzedanych',
                    data: Object.keys(analytics.topSellingProducts)
                        .sort((a, b) => analytics.topSellingProducts[b].count - analytics.topSellingProducts[a].count)
                        .slice(0, 10)
                        .map(product => analytics.topSellingProducts[product].count),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            }
        };
    };

    const chartData = getChartData();

    const handleExportFullPDF = () => {
        const doc = new jsPDF();
        const analytics = getSalesAnalytics();
        
        // Tytuł raportu
        doc.setFontSize(20);
        doc.text('Pełny Raport Sprzedaży', 20, 20);
        
        // Okres raportu
        doc.setFontSize(12);
        doc.text(`Okres: ${startDate ? startDate.toLocaleDateString() : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString() : 'Wszystkie'}`, 20, 35);
        doc.text(`Data raportu: ${new Date().toLocaleDateString()}`, 20, 45);
        
        let yPosition = 60;
        
        // Podsumowanie
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
        
        Object.entries(analytics.avgSaleValue).forEach(([currency, avg]) => {
            doc.text(`Średnia wartość sprzedaży (${currency}): ${avg}`, 20, yPosition);
            yPosition += 10;
        });
        
        yPosition += 10;
        
        // Tabela z danymi sprzedaży
        autoTable(doc, {
            startY: yPosition,
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],
            body: filteredSales.slice(0, 50).map((sale, index) => [
                index + 1,
                sale.fullName,
                new Date(sale.timestamp).toLocaleDateString(),
                sale.barcode,
                sale.size || 'N/A',
                sale.sellingPoint,
                sale.from,
                sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });
        
        // Nowa strona dla analiz
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.text('Top 10 Produktów:', 20, yPosition);
        yPosition += 15;
        
        autoTable(doc, {
            startY: yPosition,
            head: [['Produkt', 'Liczba sprzedanych', 'Przychód']],
            body: Object.entries(analytics.topSellingProducts)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 10)
                .map(([product, data]) => [
                    product,
                    data.count,
                    Object.entries(data.revenue).map(([curr, amt]) => `${amt.toFixed(2)} ${curr}`).join(', ')
                ]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [46, 204, 113] }
        });
        
        doc.save('pelny_raport_sprzedazy.pdf');
    };

    const handlePrintReport = () => {
        const printWindow = window.open('', '_blank');
        const analytics = getSalesAnalytics();
        
        const reportHTML = `
            <html>
                <head>
                    <title>Raport Sprzedaży</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .summary { margin-bottom: 30px; }
                        .section { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Raport Sprzedaży</h1>
                        <p>Okres: ${startDate ? startDate.toLocaleDateString() : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString() : 'Wszystkie'}</p>
                        <p>Data raportu: ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div class="summary">
                        <h2>Podsumowanie</h2>
                        <div class="metric">
                            <strong>Łączna liczba sprzedaży:</strong> ${analytics.totalSales}
                        </div>
                        ${Object.entries(analytics.totalRevenue).map(([currency, amount]) => 
                            `<div class="metric"><strong>Przychód (${currency}):</strong> ${amount.toFixed(2)}</div>`
                        ).join('')}
                        ${Object.entries(analytics.avgSaleValue).map(([currency, avg]) => 
                            `<div class="metric"><strong>Średnia wartość sprzedaży (${currency}):</strong> ${avg}</div>`
                        ).join('')}
                    </div>

                    <div class="section">
                        <h2>Top 10 Produktów</h2>
                        <table>
                            <thead>
                                <tr><th>Produkt</th><th>Liczba sprzedanych</th><th>Przychód</th></tr>
                            </thead>
                            <tbody>
                                ${Object.entries(analytics.topSellingProducts)
                                    .sort(([,a], [,b]) => b.count - a.count)
                                    .slice(0, 10)
                                    .map(([product, data]) => 
                                        `<tr>
                                            <td>${product}</td>
                                            <td>${data.count}</td>
                                            <td>${Object.entries(data.revenue).map(([curr, amt]) => `${amt.toFixed(2)} ${curr}`).join(', ')}</td>
                                        </tr>`
                                    ).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Sprzedaż według punktów</h2>
                        <table>
                            <thead>
                                <tr><th>Punkt sprzedaży</th><th>Liczba sprzedaży</th><th>Przychód</th></tr>
                            </thead>
                            <tbody>
                                ${Object.entries(analytics.salesBySellingPoint)
                                    .sort(([,a], [,b]) => b.count - a.count)
                                    .map(([point, data]) => 
                                        `<tr>
                                            <td>${point}</td>
                                            <td>${data.count}</td>
                                            <td>${Object.entries(data.revenue).map(([curr, amt]) => `${amt.toFixed(2)} ${curr}`).join(', ')}</td>
                                        </tr>`
                                    ).join('')}
                            </tbody>
                        </table>
                    </div>
                </body>
            </html>
        `;
        
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.print();
    };

    const handleRemoveAllData = async () => {
        const confirmationWord = 'REMOVE';
        const userInput = prompt(`To confirm removing all data, type "${confirmationWord}"`);
        if (userInput === confirmationWord) {
            try {
                const response = await axios.delete('/api/sales/delete-all-sales', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                if (response.status === 200) {
                    setSales([]); // Clear all sales data from state
                    setFilteredSales([]); // Clear filtered sales data
                    alert('All data has been removed from database.');
                } else {
                    alert(`Error removing data: ${response.data?.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error removing all sales data:', error);
                alert('Error removing data from database.');
            }
        } else {
            alert('Data removal canceled.');
        }
    };

    const uniqueSellingPoints = [...new Set(sales.map((sale) => sale.sellingPoint))]; // Get unique selling points

    const handleDropdownFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

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
                        />
                    </div>
                </div>
                <div style={{ width: '200px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Wyszukiwarka"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>            </div>
            <div className="d-flex justify-content-center mb-3">
                <button className="btn btn-primary me-2" onClick={handleExportPDF}>
                    Eksportuj PDF (Tylko Dane)
                </button>
                <button className="btn btn-success me-2" onClick={handleExportExcel}>
                    Eksportuj Excel
                </button>
                <CSVLink
                    data={filteredSales.map((sale, index) => ({
                        Lp: index + 1,
                        'Pełna nazwa': sale.fullName,
                        Data: new Date(sale.timestamp).toLocaleDateString(),
                        'Kod kreskowy': sale.barcode,
                        Rozmiar: sale.size || 'N/A', // Use plain string value of sizeId
                        'Punkt sprzedaży': sale.sellingPoint,
                        Skąd: sale.from,
                        Karta: sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                        Gotówka: sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
                    }))}
                    filename="sales_data.csv"
                    className="btn btn-info me-2"
                >
                    Eksportuj CSV
                </CSVLink>
                <button className="btn btn-warning me-2" onClick={handleExportFullPDF}>
                    Eksportuj PDF (Dane + Podsumowanie)
                </button>
                <button className="btn btn-success me-2" onClick={handlePrintReport}>
                    Drukuj Raport
                </button>
                <button 
                    className="btn btn-info" 
                    onClick={() => setShowAnalytics(!showAnalytics)}
                >
                    {showAnalytics ? 'Ukryj Analizy' : 'Pokaż Analizy'}
                </button>
            </div>

            {/* Analytics Panel */}
            {showAnalytics && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className={styles.analyticsPanel}>
                            <div className={styles.analyticsPanelHeader}>
                                <h3 className={styles.analyticsPanelTitle}>Analizy Sprzedaży</h3>
                                <div className="btn-group" role="group">
                                    <button 
                                        className={`btn ${reportType === 'summary' ? 'btn-primary' : 'btn-outline-light'}`}
                                        onClick={() => setReportType('summary')}
                                    >
                                        Podsumowanie
                                    </button>
                                    <button 
                                        className={`btn ${reportType === 'charts' ? 'btn-primary' : 'btn-outline-light'}`}
                                        onClick={() => setReportType('charts')}
                                    >
                                        Wykresy
                                    </button>
                                    <button 
                                        className={`btn ${reportType === 'trends' ? 'btn-primary' : 'btn-outline-light'}`}
                                        onClick={() => setReportType('trends')}
                                    >
                                        Trendy
                                    </button>
                                </div>
                            </div>
                            <div className={styles.analyticsPanelBody}>
                                {reportType === 'summary' && (
                                    <div className="row">
                                        <div className="col-md-3">
                                            <div className={styles.metricCard}>
                                                <div className={styles.metricCardBody}>
                                                    <h4 className={styles.metricValue}>{analytics.totalSales}</h4>
                                                    <p className={styles.metricLabel}>Łączna liczba sprzedaży</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={styles.metricCard}>
                                                <div className={styles.metricCardBody}>
                                                    <h5 className={styles.metricValue}>
                                                        {Object.entries(analytics.totalRevenue).map(([currency, amount]) => (
                                                            <div key={currency}>{amount.toFixed(2)} {currency}</div>
                                                        ))}
                                                    </h5>
                                                    <p className={styles.metricLabel}>Łączny przychód</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={styles.metricCard}>
                                                <div className={styles.metricCardBody}>
                                                    <h5 className={styles.metricValue}>
                                                        {Object.entries(analytics.avgSaleValue).map(([currency, avg]) => (
                                                            <div key={currency}>{avg} {currency}</div>
                                                        ))}
                                                    </h5>
                                                    <p className={styles.metricLabel}>Średnia wartość sprzedaży</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={styles.metricCard}>
                                                <div className={styles.metricCardBody}>
                                                    <h4 className={styles.metricValue}>
                                                        {Object.keys(analytics.salesBySellingPoint).length}
                                                    </h4>
                                                    <p className={styles.metricLabel}>Aktywne punkty sprzedaży</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {reportType === 'charts' && (
                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                                <h5 className={styles.chartTitle}>Sprzedaż dzienne</h5>
                                                <Bar data={chartData.dailySales} options={{ 
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            display: false
                                                        }
                                                    },
                                                    scales: {
                                                        y: {
                                                            beginAtZero: true,
                                                            ticks: {
                                                                color: '#fff'
                                                            }
                                                        },
                                                        x: {
                                                            ticks: {
                                                                color: '#fff'
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-4">
                                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                                <h5 className={styles.chartTitle}>Punkty sprzedaży</h5>
                                                <Pie data={chartData.sellingPoints} options={{ 
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            position: 'bottom',
                                                            labels: {
                                                                color: '#fff',
                                                                fontSize: 10
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                        <div className="col-12 mb-4">
                                            <div className={`${styles.chartContainer} ${styles.compactChart}`}>
                                                <h5 className={styles.chartTitle}>Top 10 produktów</h5>
                                                <Bar data={chartData.topProducts} options={{ 
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    indexAxis: 'y',
                                                    plugins: {
                                                        legend: {
                                                            display: false
                                                        }
                                                    },
                                                    scales: {
                                                        y: {
                                                            ticks: {
                                                                color: '#fff',
                                                                fontSize: 10
                                                            }
                                                        },
                                                        x: {
                                                            ticks: {
                                                                color: '#fff'
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {reportType === 'trends' && (
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                                <h5 className={styles.chartTitle}>Trend sprzedaży dziennej</h5>
                                                <Line data={chartData.dailySales} options={{ 
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            display: false
                                                        }
                                                    },
                                                    scales: {
                                                        y: {
                                                            beginAtZero: true,
                                                            ticks: {
                                                                color: '#fff'
                                                            }
                                                        },
                                                        x: {
                                                            ticks: {
                                                                color: '#fff'
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                                <h5 className={styles.chartTitle}>Analiza rozmiarów</h5>
                                                <div className={styles.analyticsTable}>
                                                    <table className={styles.darkTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Rozmiar</th>
                                                                <th>Liczba</th>
                                                                <th>% udziału</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(analytics.salesBySize)
                                                                .sort(([,a], [,b]) => b.count - a.count)
                                                                .slice(0, 8) // Ograniczamy do 8 wierszy
                                                                .map(([size, data]) => (
                                                                    <tr key={size}>
                                                                        <td>{size}</td>
                                                                        <td>{data.count}</td>
                                                                        <td>{((data.count / analytics.totalSales) * 100).toFixed(1)}%</td>
                                                                    </tr>
                                                                ))
                                                            }
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.tableContainer}>
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('timestamp')}>
                                Data {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('timestamp', e.target.value)}
                                />
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sizeId')}>
                                Rozmiar {sortConfig.key === 'sizeId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('sizeId', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sellingPoint')}>
                                Punkt sprzedaży {sortConfig.key === 'sellingPoint' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('sellingPoint', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('from')}>
                                Skąd {sortConfig.key === 'from' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('from', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('card')}>
                                Karta {sortConfig.key === 'card' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('card', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('cash')}>
                                Gotówka {sortConfig.key === 'cash' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('cash', e.target.value)}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSales.map((sale, index) => (
                            <tr key={sale._id} className={styles.tableRow}>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{index + 1}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.fullName}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{new Date(sale.timestamp).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.barcode}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.size}</td> 
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.sellingPoint}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.from}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {sale.card.map((c, i) => (
                                        <div key={i}>{`${c.price} ${c.currency}`}</div>
                                    ))}
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {sale.cash.map((c, i) => (
                                        <div key={i}>{`${c.price} ${c.currency}`}</div>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7"></td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Karta:</strong>
                                {Object.entries(cardSummary).map(([currency, total], index) => (
                                    <div key={index}>
                                        {total.toFixed(2)} {currency}
                                    </div>
                                ))}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Gotówka:</strong>
                                {Object.entries(cashSummary).map(([currency, total], index) => (
                                    <div key={index}>
                                        {total.toFixed(2)} {currency}
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