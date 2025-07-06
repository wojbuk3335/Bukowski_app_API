import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker'; // Install react-datepicker if not already installed
import 'react-datepicker/dist/react-datepicker.css'; // Import styles for the date picker
import { pl } from 'date-fns/locale'; // Import Polish locale
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

// Register Polish locale for DatePicker
registerLocale('pl', pl);

const Sales = () => {    const [sales, setSales] = useState([]); // Ensure sales is initialized as an empty array
    const [filteredSales, setFilteredSales] = useState([]); // State for filtered sales
    const [error, setError] = useState(null); // State to track errors
    const [startDate, setStartDate] = useState(null); // Start date for date range filter
    const [endDate, setEndDate] = useState(null); // End date for date range filter
    const [searchQuery, setSearchQuery] = useState(''); // Search query for the search bar
    const [columnFilters, setColumnFilters] = useState({}); // Filters for individual columns
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration
    const [showAnalytics, setShowAnalytics] = useState(false); // Show/hide analytics panel
    const [reportType, setReportType] = useState('summary'); // Type of report to display
    
    // Dynamic analysis states
    const [availableSellingPoints, setAvailableSellingPoints] = useState([]);
    const [selectedSellingPoints, setSelectedSellingPoints] = useState([]);
    const [dynamicAnalysisResult, setDynamicAnalysisResult] = useState(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

    // Memoize conditions for dynamic analysis to avoid unnecessary re-renders
    const canShowAnalysis = React.useMemo(() => {
        return reportType === 'summary' && startDate && endDate && selectedSellingPoints.length > 0;
    }, [reportType, startDate, endDate, selectedSellingPoints.length]);

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
        };        fetchSales();
    }, []);

    // Fetch available selling points
    useEffect(() => {
        const fetchSellingPoints = async () => {
            try {
                const response = await axios.get('/api/sales/available-selling-points');
                setAvailableSellingPoints(response.data);
            } catch (error) {
                console.error('Error fetching selling points:', error);
            }
        };        fetchSellingPoints();
    }, []);    // Auto-fetch dynamic analysis when dates or selling points change (with debouncing)
    useEffect(() => {
        // Only run for summary report type
        if (reportType !== 'summary') {
            return;
        }

        // Clear previous results when conditions change
        if (!startDate || !endDate || selectedSellingPoints.length === 0) {
            setDynamicAnalysisResult(null);
            return;
        }

        console.log('Date change detected for dynamic analysis:');
        console.log('Start Date object:', startDate);
        console.log('End Date object:', endDate);
        console.log('Selected selling points:', selectedSellingPoints);
        
        // Debounce the API call to avoid multiple rapid calls
        const timeoutId = setTimeout(() => {
            fetchDynamicAnalysis();
        }, 300); // 300ms delay

        // Cleanup timeout if dependencies change before it executes
        return () => clearTimeout(timeoutId);
    }, [startDate, endDate, selectedSellingPoints, reportType]);useEffect(() => {
        console.log('Applying filters:', { sales, startDate, endDate, searchQuery, columnFilters }); // Debugging log

        // Apply all filters (date range, search query, and column filters)
        let filtered = [...sales];
        
        console.log('Total sales before filtering:', filtered.length);
        console.log('Sample sale data:', filtered[0]);        // Filter by date range - porównujemy w formacie DD.MM.YYYY
        if (startDate && endDate) {            console.log('Filtering by date range:', { startDate, endDate });
            
            // Ustawiamy czas na początek i koniec dnia dla porównania
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            console.log(`Date range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
            
            filtered = filtered.filter((sale) => {
                const saleDate = new Date(sale.date);
                const saleDateStr = saleDate.toLocaleDateString('pl-PL');
                
                console.log(`Sale date: ${sale.date} -> ${saleDateStr}`);
                console.log(`Comparing Date objects: ${saleDate.getTime()} between ${startOfDay.getTime()} and ${endOfDay.getTime()}`);
                
                // Porównujemy obiekty Date zamiast stringów
                const isInRange = saleDate >= startOfDay && saleDate <= endOfDay;
                console.log(`Date match: ${isInRange}`);
                
                return isInRange;
            });
            console.log('Sales after date filtering:', filtered.length);
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
                      // Special handling for date to match the displayed format
                    if (key === 'date') {
                        saleValue = new Date(sale.date).toLocaleDateString();
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
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],            body: filteredSales.map((sale, index) => [
                index + 1,
                sale.fullName,
                fixDateDisplay(sale.date),
                sale.barcode,sale.size || 'N/A', // Use plain string value of sizeId
                sale.sellingPoint,
                sale.from,
                sale.card.filter(c => c.price !== null && c.price !== undefined && c.price !== 0).map((c) => `${c.price} ${c.currency}`).join(', ') || '0.00 PLN',
                sale.cash.filter(c => c.price !== null && c.price !== undefined && c.price !== 0).map((c) => `${c.price} ${c.currency}`).join(', ') || '0.00 PLN',
            ]),
        });
        doc.save('sales_data.pdf');
    };    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            filteredSales.map((sale, index) => {
                // Filter out null/undefined/zero prices for card payments
                const validCardPayments = sale.card.filter(c => 
                    c.price !== null && c.price !== undefined && c.price !== 0
                );
                const cardDisplay = validCardPayments.length > 0 
                    ? validCardPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                    : '0.00 PLN';

                // Filter out null/undefined/zero prices for cash payments
                const validCashPayments = sale.cash.filter(c => 
                    c.price !== null && c.price !== undefined && c.price !== 0
                );
                const cashDisplay = validCashPayments.length > 0 
                    ? validCashPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                    : '0.00 PLN';

                return {
                    Lp: index + 1,
                    'Pełna nazwa': sale.fullName,
                    Data: fixDateDisplay(sale.date),
                    'Kod kreskowy': sale.barcode,
                    Rozmiar: sale.size || 'N/A', // Use plain string value of sizeId
                    'Punkt sprzedaży': sale.sellingPoint,
                    Skąd: sale.from,
                    Karta: cardDisplay,
                    Gotówka: cashDisplay,
                };
            })
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
    };    const calculateSummary = (sales, key) => {
        const summary = {};
        sales.forEach((sale) => {
            sale[key].forEach((entry) => {
                const { price, currency } = entry;
                // Skip entries with null, undefined or zero prices
                if (price !== null && price !== undefined && price !== 0) {
                    if (!summary[currency]) {
                        summary[currency] = 0;
                    }
                    summary[currency] += price;
                }
            });
        });
        return summary;
    };// Helper function to format summary with default PLN when empty
    const formatSummary = (summary) => {
        if (Object.keys(summary).length === 0) {
            return [{ currency: 'PLN', total: 0 }];
        }
        return Object.entries(summary).map(([currency, total]) => ({ currency, total }));
    };    // Helper function to format payment arrays for display in table cells
    const formatPaymentArray = (paymentArray) => {
        if (!paymentArray || paymentArray.length === 0) {
            return <div>0.00 PLN</div>;
        }
        
        // Filter out payments with null or undefined prices
        const validPayments = paymentArray.filter(payment => 
            payment.price !== null && payment.price !== undefined && payment.price !== 0
        );
        
        if (validPayments.length === 0) {
            return <div>0.00 PLN</div>;
        }
        
        return validPayments.map((payment, i) => (
            <div key={i}>{`${payment.price} ${payment.currency}`}</div>
        ));
    };// Funkcja do prawidłowego wyświetlania daty z pola 'date'
    const fixDateDisplay = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScript months are 0-based
        const day = date.getDate();
        
        // Wyświetlamy datę w formacie DD.MM.YYYY z zerami wiodącymi
        return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
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
        };        // Calculate total revenue and average sale value
        filteredSales.forEach(sale => {
            [...sale.card, ...sale.cash].forEach(payment => {
                // Skip payments with null, undefined or zero prices
                if (payment.price !== null && payment.price !== undefined && payment.price !== 0) {
                    if (!analytics.totalRevenue[payment.currency]) {
                        analytics.totalRevenue[payment.currency] = 0;
                    }
                    analytics.totalRevenue[payment.currency] += payment.price;
                }
            });
        });

        // Calculate average sale value
        Object.keys(analytics.totalRevenue).forEach(currency => {
            analytics.avgSaleValue[currency] = (analytics.totalRevenue[currency] / filteredSales.length).toFixed(2);
        });        // Group sales by date
        filteredSales.forEach(sale => {
            const date = new Date(sale.date).toLocaleDateString('en-US');
            if (!analytics.salesByDate[date]) {
                analytics.salesByDate[date] = { count: 0, revenue: {} };
            }
            analytics.salesByDate[date].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                // Skip payments with null, undefined or zero prices
                if (payment.price !== null && payment.price !== undefined && payment.price !== 0) {
                    if (!analytics.salesByDate[date].revenue[payment.currency]) {
                        analytics.salesByDate[date].revenue[payment.currency] = 0;
                    }
                    analytics.salesByDate[date].revenue[payment.currency] += payment.price;
                }
            });
        });        // Group by selling point
        filteredSales.forEach(sale => {
            if (!analytics.salesBySellingPoint[sale.sellingPoint]) {
                analytics.salesBySellingPoint[sale.sellingPoint] = { count: 0, revenue: {} };
            }
            analytics.salesBySellingPoint[sale.sellingPoint].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                // Skip payments with null, undefined or zero prices
                if (payment.price !== null && payment.price !== undefined && payment.price !== 0) {
                    if (!analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency]) {
                        analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency] = 0;
                    }
                    analytics.salesBySellingPoint[sale.sellingPoint].revenue[payment.currency] += payment.price;
                }
            });
        });        // Group by product name
        filteredSales.forEach(sale => {
            if (!analytics.topSellingProducts[sale.fullName]) {
                analytics.topSellingProducts[sale.fullName] = { count: 0, revenue: {} };
            }
            analytics.topSellingProducts[sale.fullName].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                // Skip payments with null, undefined or zero prices
                if (payment.price !== null && payment.price !== undefined && payment.price !== 0) {
                    if (!analytics.topSellingProducts[sale.fullName].revenue[payment.currency]) {
                        analytics.topSellingProducts[sale.fullName].revenue[payment.currency] = 0;
                    }
                    analytics.topSellingProducts[sale.fullName].revenue[payment.currency] += payment.price;
                }
            });
        });        // Group by size
        filteredSales.forEach(sale => {
            const size = sale.size || 'Brak rozmiaru';
            if (!analytics.salesBySize[size]) {
                analytics.salesBySize[size] = { count: 0, revenue: {} };
            }
            analytics.salesBySize[size].count++;
            [...sale.card, ...sale.cash].forEach(payment => {
                // Skip payments with null, undefined or zero prices
                if (payment.price !== null && payment.price !== undefined && payment.price !== 0) {
                    if (!analytics.salesBySize[size].revenue[payment.currency]) {
                        analytics.salesBySize[size].revenue[payment.currency] = 0;
                    }
                    analytics.salesBySize[size].revenue[payment.currency] += payment.price;
                }
            });
        });

        return analytics;
    };

    const analytics = getSalesAnalytics();    // Chart data preparation
    const getChartData = () => {
        const salesByDate = analytics.salesByDate;
        const dates = Object.keys(salesByDate).sort();
        const counts = dates.map(date => salesByDate[date].count);
          // Generate trends data for selling points over time
        const getTrendsData = () => {
            const sellingPoints = [...new Set(filteredSales.map(sale => sale.sellingPoint))];
            const allDates = [...new Set(filteredSales.map(sale => new Date(sale.date).toLocaleDateString('en-US')))].sort();
            
            // Color palette for different selling points
            const colorPalette = [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                '#9966FF', '#FF9F40', '#2ECC71', '#E74C3C',
                '#3498DB', '#F39C12', '#9B59B6', '#1ABC9C', 
                '#E67E22', '#95A5A6', '#8E44AD', '#16A085'
            ];
            
            const datasets = sellingPoints.map((sellingPoint, index) => {
                const pointSalesByDate = {};
                
                // Initialize all dates with 0
                allDates.forEach(date => {
                    pointSalesByDate[date] = 0;
                });
                
                // Count sales for this selling point by date
                filteredSales
                    .filter(sale => sale.sellingPoint === sellingPoint)
                    .forEach(sale => {
                        const date = new Date(sale.date).toLocaleDateString('en-US');
                        pointSalesByDate[date]++;
                    });
                
                const color = colorPalette[index % colorPalette.length];
                
                return {
                    label: sellingPoint,
                    data: allDates.map(date => pointSalesByDate[date]),
                    borderColor: color,
                    backgroundColor: color + '20', // Add transparency
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                };
            });
            
            return {
                labels: allDates,
                datasets: datasets
            };
        };
        
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
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#2ECC71', '#E74C3C', '#3498DB', '#F39C12',
                        '#9B59B6', '#1ABC9C', '#E67E22', '#95A5A6'
                    ],
                    borderColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#2ECC71', '#E74C3C', '#3498DB', '#F39C12',
                        '#9B59B6', '#1ABC9C', '#E67E22', '#95A5A6'
                    ],
                    borderWidth: 2
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
            },
            trends: getTrendsData()
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
        
        yPosition += 10;          // Tabela z danymi sprzedaży
        autoTable(doc, {
            startY: yPosition,
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],
            body: filteredSales.slice(0, 50).map((sale, index) => {
                // Filter out null/undefined/zero prices for card payments
                const validCardPayments = sale.card.filter(c => 
                    c.price !== null && c.price !== undefined && c.price !== 0
                );
                const cardDisplay = validCardPayments.length > 0 
                    ? validCardPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                    : '0.00 PLN';

                // Filter out null/undefined/zero prices for cash payments
                const validCashPayments = sale.cash.filter(c => 
                    c.price !== null && c.price !== undefined && c.price !== 0
                );
                const cashDisplay = validCashPayments.length > 0 
                    ? validCashPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                    : '0.00 PLN';

                return [
                    index + 1,
                    sale.fullName,
                    fixDateDisplay(sale.date),
                    sale.barcode,
                    sale.size || 'N/A',
                    sale.sellingPoint,
                    sale.from,
                    cardDisplay,
                    cashDisplay,
                ];
            }),
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
    };    const uniqueSellingPoints = [...new Set(sales.map((sale) => sale.sellingPoint))]; // Get unique selling points    // Dynamic analysis functions
    const handleSellingPointChange = (sellingPoint, isChecked) => {
        setSelectedSellingPoints(prev => {
            const newPoints = isChecked 
                ? [...prev, sellingPoint]
                : prev.filter(point => point !== sellingPoint);
            
            // Clear previous results when selection changes
            if (dynamicAnalysisResult) {
                setDynamicAnalysisResult(null);
            }
            
            return newPoints;
        });
    };const fetchDynamicAnalysis = async () => {
        // Prevent multiple simultaneous calls
        if (isLoadingAnalysis) {
            console.log('Analysis already in progress, skipping...');
            return;
        }

        if (!startDate || !endDate) {
            console.log('Missing dates:', { startDate, endDate });
            setDynamicAnalysisResult(null);
            return;
        }
        
        if (selectedSellingPoints.length === 0) {
            console.log('No selling points selected');
            setDynamicAnalysisResult(null);
            return;
        }

        console.log('=== STARTING DYNAMIC ANALYSIS ===');
        console.log('Selected Start Date object:', startDate);
        console.log('Selected End Date object:', endDate);
        console.log('Selected selling points:', selectedSellingPoints);

        setIsLoadingAnalysis(true);
        try {
            const response = await axios.post('/api/sales/dynamic-analysis', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                sellingPoints: selectedSellingPoints
            });
            console.log('Backend response:', response.data);
            setDynamicAnalysisResult(response.data);
        } catch (error) {
            console.error('Error fetching dynamic analysis:', error);
            setDynamicAnalysisResult(null);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

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
                        <label>Data początkowa:</label>                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="form-control"
                            placeholderText="Wybierz datę początkową"
                            dateFormat="dd.MM.yyyy"
                            locale="pl"
                        />
                    </div>
                    <div>
                        <label>Data końcowa:</label>                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="form-control"
                            placeholderText="Wybierz datę końcową"
                            dateFormat="dd.MM.yyyy"
                            locale="pl"
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
                </button>                <CSVLink
                    data={filteredSales.map((sale, index) => {
                        // Filter out null/undefined/zero prices for card payments
                        const validCardPayments = sale.card.filter(c => 
                            c.price !== null && c.price !== undefined && c.price !== 0
                        );
                        const cardDisplay = validCardPayments.length > 0 
                            ? validCardPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                            : '0.00 PLN';

                        // Filter out null/undefined/zero prices for cash payments
                        const validCashPayments = sale.cash.filter(c => 
                            c.price !== null && c.price !== undefined && c.price !== 0
                        );
                        const cashDisplay = validCashPayments.length > 0 
                            ? validCashPayments.map((c) => `${c.price} ${c.currency}`).join(', ')
                            : '0.00 PLN';

                        return {
                            Lp: index + 1,
                            'Pełna nazwa': sale.fullName,
                            Data: fixDateDisplay(sale.date),
                            'Kod kreskowy': sale.barcode,
                            Rozmiar: sale.size || 'N/A', // Use plain string value of sizeId
                            'Punkt sprzedaży': sale.sellingPoint,
                            Skąd: sale.from,
                            Karta: cardDisplay,
                            Gotówka: cashDisplay,
                        };
                    })}
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
                            <div className={styles.analyticsPanelBody}>                                {reportType === 'summary' && (
                                    <div>
                                        {/* Selling Points Selection */}
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <div className={styles.metricCard}>
                                                    <div className={styles.metricCardBody}>
                                                        <h5 className={styles.metricLabel} style={{marginBottom: '15px'}}>
                                                            Wybierz punkty sprzedaży dla analizy:
                                                        </h5>
                                                        <div className="row">                                                            {availableSellingPoints.map((point, index) => (
                                                                <div key={point} className="col-md-3 col-sm-6 mb-2">
                                                                    <div className="form-check d-flex align-items-center">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            id={`selling-point-${index}`}
                                                                            checked={selectedSellingPoints.includes(point)}
                                                                            onChange={(e) => handleSellingPointChange(point, e.target.checked)}
                                                                            style={{ marginRight: '8px', marginTop: '0' }}
                                                                        />
                                                                        <label 
                                                                            className="form-check-label" 
                                                                            htmlFor={`selling-point-${index}`}
                                                                            style={{ color: 'white', margin: '0', cursor: 'pointer' }}
                                                                        >
                                                                            {point}
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ))}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>                                        {/* Dynamic Analysis Results */}
                                        {selectedSellingPoints.length === 0 ? (
                                            <div className="row">
                                                <div className="col-12 text-center">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <p className={styles.metricLabel}>
                                                                Proszę wybrać przynajmniej jeden punkt sprzedaży
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : !startDate || !endDate ? (
                                            <div className="row">
                                                <div className="col-12 text-center">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <p className={styles.metricLabel}>
                                                                Proszę wybrać zakres dat aby zobaczyć analizę
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isLoadingAnalysis ? (
                                            <div className="row">
                                                <div className="col-12 text-center">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <h5>Ładowanie analizy...</h5>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : dynamicAnalysisResult ? (
                                            <div className="row">
                                                <div className="col-md-3">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <h4 className={styles.metricValue}>{dynamicAnalysisResult.totalQuantity}</h4>
                                                            <p className={styles.metricLabel}>Łączna ilość sprzedanych kurtek</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <h5 className={styles.metricValue}>
                                                                {Object.entries(dynamicAnalysisResult.totalValue).map(([currency, amount]) => (
                                                                    <div key={currency}>{amount.toFixed(2)} {currency}</div>
                                                                ))}
                                                            </h5>
                                                            <p className={styles.metricLabel}>Łączna wartość sprzedaży</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <h5 className={styles.metricValue}>
                                                                {Object.entries(dynamicAnalysisResult.totalValue).map(([currency, amount]) => (
                                                                    <div key={currency}>
                                                                        {dynamicAnalysisResult.totalQuantity > 0 ? (amount / dynamicAnalysisResult.totalQuantity).toFixed(2) : '0.00'} {currency}
                                                                    </div>
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
                                                                {dynamicAnalysisResult.selectedSellingPoints.length}
                                                            </h4>
                                                            <p className={styles.metricLabel}>Wybrane punkty sprzedaży</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="row">
                                                <div className="col-12 text-center">
                                                    <div className={styles.metricCard}>
                                                        <div className={styles.metricCardBody}>
                                                            <p className={styles.metricLabel}>
                                                                Brak danych dla wybranego zakresu
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {reportType === 'charts' && (
                                    <div className="row">                                        <div className="col-md-6 mb-4">
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
                                                                color: '#fff',
                                                                stepSize: 1,
                                                                precision: 0
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
                                        </div>                                        <div className="col-md-6 mb-4">
                                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                                <h5 className={styles.chartTitle}>Punkty sprzedaży</h5>
                                                <Pie data={chartData.sellingPoints} options={{ 
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            position: 'right',
                                                            labels: {
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                usePointStyle: true,
                                                                padding: 15
                                                            }
                                                        },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: function(context) {
                                                                    const label = context.label || '';
                                                                    const value = context.parsed;
                                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                                    const percentage = ((value / total) * 100).toFixed(1);
                                                                    return `${label}: ${value} (${percentage}%)`;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>                                        <div className="col-12 mb-4">
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
                                                            beginAtZero: true,
                                                            ticks: {
                                                                color: '#fff',
                                                                stepSize: 1,
                                                                precision: 0
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {reportType === 'trends' && (
                                    <div className="row">                                        <div className="col-md-6">
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
                                                                color: '#fff',
                                                                stepSize: 1,
                                                                precision: 0
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
                                        </div>                        <div className="col-md-6">
                            <div className={`${styles.chartContainer} ${styles.smallChart}`}>
                                <h5 className={styles.chartTitle}>Trendy sprzedaży według punktów sprzedaży</h5>
                                <Line data={chartData.trends} options={{ 
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: true,
                                            position: 'top',
                                            labels: {
                                                color: '#fff',
                                                boxWidth: 20,
                                                padding: 20,
                                                usePointStyle: true
                                            }
                                        },
                                        tooltip: {
                                            mode: 'index',
                                            intersect: false,
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                            titleColor: '#fff',
                                            bodyColor: '#fff',
                                            borderColor: '#fff',
                                            borderWidth: 1
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                color: '#fff',
                                                stepSize: 1,
                                                precision: 0
                                            },
                                            grid: {
                                                color: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        },
                                        x: {
                                            ticks: {
                                                color: '#fff',
                                                maxTicksLimit: 10
                                            },
                                            grid: {
                                                color: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        }
                                    },
                                    interaction: {
                                        mode: 'nearest',
                                        axis: 'x',
                                        intersect: false
                                    }
                                }} />
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
                            </th>                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')}>
                                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('date', e.target.value)}
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
                        {sortedSales.map((sale, index) => (                            <tr key={sale._id} className={styles.tableRow}>                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{index + 1}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.fullName}</td>                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {fixDateDisplay(sale.date)}
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.barcode}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.size}</td> 
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.sellingPoint}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.from}</td>                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {formatPaymentArray(sale.card)}
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {formatPaymentArray(sale.cash)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7"></td>                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Karta:</strong>
                                {formatSummary(cardSummary).map((item, index) => (
                                    <div key={index}>
                                        {item.total.toFixed(2)} {item.currency}
                                    </div>
                                ))}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Gotówka:</strong>
                                {formatSummary(cashSummary).map((item, index) => (
                                    <div key={index}>
                                        {item.total.toFixed(2)} {item.currency}
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