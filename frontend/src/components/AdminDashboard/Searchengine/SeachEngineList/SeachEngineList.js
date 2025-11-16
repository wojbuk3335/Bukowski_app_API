import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import pl from 'date-fns/locale/pl';
import styles from './SeachEngineList.module.css'; // Import CSS module for responsive styles
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-free/css/all.min.css';

registerLocale('pl', pl);

const SeachEngineList = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [filters, setFilters] = useState({
        id: '',
        fullName: '',
        date: '',
        size: '',
        barcode: '',
        sellingPoint: '',
    });
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    const [globalSearch, setGlobalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;
    const [loading, setLoading] = useState(true);

    const formatDate = (isoDate) => {
        if (!isoDate) return ''; // Return an empty string if the date is invalid or undefined
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return ''; // Return an empty string if the date is invalid
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const refreshComponent = async () => {
        setLoading(true);
        setFilters({
            id: '',
            fullName: '',
            date: '',
            size: '',
            barcode: '',
            sellingPoint: '',
        });
        setSortConfig({ key: '', direction: '' });
        try {
            const response = await fetch('/api/state/');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            setData(result);
            setFilteredData(result);
        } catch (error) {
            console.error('Błąd podczas odświeżania danych:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshComponent();
    }, []);

    const handleFilterChange = (selectedOption, column) => {
        const value = selectedOption ? selectedOption.value : '';
        setFilters((prevFilters) => ({
            ...prevFilters,
            [column]: value,
        }));

        const newFilteredData = data.filter((item) =>
            Object.keys(filters).every((key) => {
                if (key === column && key === 'size') {
                    // Ensure precise matching for the size column
                    return item[key] === value;
                }
                return String(item[key] || '')
                    .toLowerCase()
                    .includes(filters[key].toLowerCase());
            })
        );
        setFilteredData(newFilteredData);
    };

    const handleDateFilterChange = (selectedDate) => {
        const formattedDate = selectedDate
            ? `${String(selectedDate.getDate()).padStart(2, '0')}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${selectedDate.getFullYear()}`
            : '';
        setFilters((prevFilters) => ({
            ...prevFilters,
            date: formattedDate,
        }));

        const newFilteredData = data.filter((item) =>
            Object.keys(filters).every((key) => {
                if (key === 'date') {
                    // Format the item's date to match the filter format
                    const itemFormattedDate = item.date
                        ? `${String(new Date(item.date).getDate()).padStart(2, '0')}.${String(new Date(item.date).getMonth() + 1).padStart(2, '0')}.${new Date(item.date).getFullYear()}`
                        : '';
                    return itemFormattedDate === formattedDate;
                }
                return String(item[key] || '')
                    .toLowerCase()
                    .includes(filters[key].toLowerCase());
            })
        );
        setFilteredData(newFilteredData);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...filteredData].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredData(sortedData);
    };

    const getSortArrow = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '▲' : '▼';
        }
        return '↕';
    };

    const getColumnOptions = (column) => {
        const uniqueValues = [...new Set(data.map((item) => item[column] || ''))];
        return uniqueValues.map((value) => ({ value, label: value }));
    };

    const handleGlobalSearch = (event) => {
        const searchValue = event.target.value.toLowerCase();
        setGlobalSearch(searchValue);

        const newFilteredData = data.filter((item) =>
            Object.values(item).some((value) =>
                String(value || '').toLowerCase().includes(searchValue)
            )
        );
        setFilteredData(newFilteredData);
    };

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

    const totalPages = Math.ceil(filteredData.length / recordsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
                <h2 style={{ marginRight: '3px' }}>Wyszukiwarka</h2>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={refreshComponent}
                    style={{ marginRight: '10px' }}
                >
                    Odśwież
                </button>
                <input
                    type="text"
                    className={`form-control ${styles.hideOnMobile}`} // Hide on mobile
                    placeholder="Szukaj w tabeli..."
                    value={globalSearch}
                    onChange={handleGlobalSearch}
                    style={{ maxWidth: '300px' }}
                />
            </div>
            {loading ? (
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
            ) : (
                <>
                    <table className={`table table-bordered table-dark text-center ${styles.responsiveTable}`}>
                        <thead className={styles.hideOnMobile}>
                            <tr>
                                <th>#</th>
                                <th>ID</th>
                                <th>Nazwa Towaru</th>
                                <th>Data</th>
                                <th>Rozmiar</th>
                                <th>Kod kreskowy</th>
                                <th>Punkt sprzedaży</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.map((item, index) => (
                                <tr key={item.id} className={styles.row}>
                                    <td data-label="#"> {indexOfFirstRecord + index + 1} </td>
                                    <td data-label="ID"> {item.id} </td>
                                    <td data-label="Nazwa Towaru"> {item.fullName} </td>
                                    <td data-label="Data"> {formatDate(item.date)} </td>
                                    <td data-label="Rozmiar"> {item.size} </td>
                                    <td data-label="Kod kreskowy"> {item.barcode} </td>
                                    <td data-label="Punkt sprzedaży"> {item.symbol} </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="d-flex justify-content-center mt-3">
                        <nav>
                            <ul className="pagination">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                                    <li
                                        key={pageNumber}
                                        className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}
                                    >
                                        <button
                                            className="page-link"
                                            onClick={() => handlePageChange(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </>
            )}
        </div>
    );
};

export default SeachEngineList;