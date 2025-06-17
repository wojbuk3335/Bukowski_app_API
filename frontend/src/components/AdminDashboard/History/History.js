import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import pl from 'date-fns/locale/pl'; // Import Polish locale
import styles from './History.module.css';
import tableStyles from '../History/History.module.css';

const History = () => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        collectionName: '',
        operation: '',
        from: '',
        to: '',
        userloggedinId: '',
        details: '',
    });
    const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]); // State for date range
    const [isDateRangePickerVisible, setIsDateRangePickerVisible] = useState(false); // State to toggle date range picker visibility
    const calendarRef = useRef(null); // Ref for the calendar container

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/history');
                setHistoryData(response.data);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handleFilterChange = (field, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [field]: value,
        }));
    };

    const handleTextFilterChange = (field, value) => {
        const validValues = [...new Set(historyData.map((item) => {
            if (field === 'userloggedinId') {
                // Handle both username and localStorage value for admin
                const username = item.userloggedinId?.username?.toLowerCase() || ''; // Extract username if available
                const adminEmail = localStorage.getItem('AdminEmail')?.toLowerCase() || ''; // Get admin email from localStorage
                return username || adminEmail; // Return either username or admin email
            }
            return item[field]?.toString().toLowerCase() || ''; // Ensure undefined values are replaced with an empty string
        }))];
        const matches = validValues.some((validValue) => validValue.includes(value.toLowerCase())); // Match anywhere in the word

        if (matches || value === '') {
            handleFilterChange(field, value);
        }
    };

    const filteredHistoryData = historyData.filter((item) => {
        const matchesDateRange =
            dateRange[0].startDate && dateRange[0].endDate
                ? new Date(item.timestamp) >= dateRange[0].startDate && new Date(item.timestamp) <= dateRange[0].endDate
                : true;

        return (
            matchesDateRange &&
            Object.keys(filters).every((key) => {
                if (key === 'userloggedinId') {
                    const username = item.userloggedinId?.username?.toLowerCase() || '';
                    const adminEmail = localStorage.getItem('AdminEmail')?.toLowerCase() || '';
                    const valueToMatch = username || adminEmail; // Combine both username and admin email
                    return filters[key] ? valueToMatch.includes(filters[key].toLowerCase()) : true;
                }
                return filters[key]
                    ? item[key]?.toString().toLowerCase().includes(filters[key].toLowerCase())
                    : true;
            })
        );
    });

    const toggleDateRangePicker = () => {
        setIsDateRangePickerVisible((prev) => !prev); // Toggle visibility
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsDateRangePickerVisible(false); // Close the calendar if clicked outside
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Customize static and input ranges
    const customStaticRanges = originalStaticRanges.map((range) => {
        if (range.label === 'Today') return { ...range, label: 'Dzisiaj' };
        if (range.label === 'Yesterday') return { ...range, label: 'Wczoraj' };
        if (range.label === 'This Week') return { ...range, label: 'Ten tydzień' };
        if (range.label === 'Last Week') return { ...range, label: 'Poprzedni tydzień' };
        if (range.label === 'This Month') return { ...range, label: 'Ten miesiąc' };
        if (range.label === 'Last Month') return { ...range, label: 'Poprzedni miesiąc' };
        return range;
    });

    const customInputRanges = originalInputRanges.map((range) => {
        if (range.label === 'days up to today') return { ...range, label: 'dni do dzisiaj' };
        if (range.label === 'days starting today') return { ...range, label: 'dni od dzisiaj' };
        return range;
    });

    if (loading) {
        return (
            <div
                className="spinner-container"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'black',
                }}
            >
                <div
                    className="spinner-border"
                    role="status"
                    style={{
                        color: 'white',
                        width: '3rem',
                        height: '3rem',
                    }}
                >
                    <span className="sr-only"></span>
                </div>
            </div>
        );
    }

    return (
        <div className={tableStyles.container}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px' }}>
                <h1 className={tableStyles.title} style={{ marginRight: '10px' }}>Historia</h1>
            </div>
            <div className={tableStyles.tableContainer} style={{ width: '100%' }}>
                <table className={`${tableStyles.table} ${tableStyles.responsiveTable}`}>
                    <thead>
                        <tr>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }}>Lp.</th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                Kolekcja
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.collectionName}
                                    onChange={(e) => handleTextFilterChange('collectionName', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                Operacja
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.operation}
                                    onChange={(e) => handleTextFilterChange('operation', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                Skąd
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.from}
                                    onChange={(e) => handleTextFilterChange('from', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                Dokąd
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.to}
                                    onChange={(e) => handleTextFilterChange('to', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '300px', width: '300px', textAlign: 'center' }}>
                                <div className="d-flex flex-column align-items-center">
                                    <span onClick={toggleDateRangePicker} style={{ cursor: 'pointer' }}>
                                        Czas
                                    </span>
                                    {isDateRangePickerVisible && (
                                        <div
                                            ref={calendarRef}
                                            style={{
                                                position: 'absolute',
                                                top: '50px', // Adjust position relative to the table header
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                zIndex: 10,
                                                backgroundColor: 'black',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                                padding: '10px',
                                                color: 'white',
                                            }}
                                        >
                                            <DateRangePicker
                                                ranges={dateRange}
                                                onChange={(ranges) => setDateRange([ranges.selection])}
                                                locale={pl}
                                                rangeColors={['#0d6efd']}
                                                staticRanges={customStaticRanges}
                                                inputRanges={customInputRanges}
                                            />
                                        </div>
                                    )}
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                Użytkownik
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.userloggedinId}
                                    onChange={(e) => handleTextFilterChange('userloggedinId', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                Produkt
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filtruj"
                                    value={filters.details}
                                    onChange={(e) => handleTextFilterChange('details', e.target.value)}
                                />
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                Szczegóły
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistoryData.map((item, index) => (
                            <tr key={item._id}>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }} data-label="Lp.">{index + 1}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Kolekcja">{item.collectionName}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }} data-label="Operacja">{item.operation}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Skąd">
                                    {item.from === "" ? "-" : item.from}
                                </td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Dokąd">
                                    {item.to === "" ? "-" : item.to}
                                </td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Czas">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Użytkownik">{item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }} data-label="Produkt">
                                    {item.product || '-'} {/* Display product */}
                                </td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }} data-label="Szczegóły">
                                    {item.details || '-'} {/* Display details */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default History;