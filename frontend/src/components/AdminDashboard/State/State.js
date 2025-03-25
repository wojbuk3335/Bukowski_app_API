import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Downshift from 'downshift';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './State.module.css'; // Import the CSS module

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today's date
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState(''); // Manage input value manually
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState(''); // Manage size input value manually
    const [tableData, setTableData] = useState([]); // State to store table data
    const sizeInputRef = React.useRef(null); // Ref for the size input field

    useEffect(() => {
        // Fetch data from the API
        const fetchGoods = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/excel/goods/get-all-goods');
                // Extract the goods array from the response
                if (response.data && Array.isArray(response.data.goods)) {
                    setGoods(response.data.goods);
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setGoods([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching goods:', error);
                setGoods([]); // Fallback to an empty array
            }
        };

        fetchGoods();
    }, []);

    useEffect(() => {
        // Fetch sizes from the API
        const fetchSizes = async () => {
            try {
                const response = await axios.get('/api/excel/size/get-all-sizes');
                // Extract the sizes array from the response
                if (response.data && Array.isArray(response.data.sizes)) {
                    setSizes(response.data.sizes);
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setSizes([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching sizes:', error);
                setSizes([]); // Fallback to an empty array
            }
        };

        fetchSizes();
    }, []);

    const fetchTableData = async () => {
        try {
            const response = await axios.get('/api/state'); // Fetch table data from backend
            const formattedData = response.data.map((row) => ({
                id: row.id,
                fullName: row.fullName?.fullName || row.fullName, // Ensure fullName is a string
                date: row.date,
                size: row.size?.Roz_Opis || row.size, // Ensure size is a string
            }));
            setTableData(formattedData); // Update table data state
        } catch (error) {
            console.error('Error fetching table data:', error);
        }
    };

    const sendDataToBackend = async (selectedSize) => {
        if (!inputValue.trim() || !selectedSize?.Roz_Opis || !selectedDate) { // Ensure all fields are filled
            alert('Wszystkie dane muszą być uzupełnione'); // Alert if any field is empty
            return;
        }

        try {
            await axios.post('/api/state', {
                fullName: inputValue.trim(), // Trim whitespace before sending
                size: selectedSize.Roz_Opis,
                date: selectedDate.toISOString(), // Ensure date is sent in ISO format
            });
            fetchTableData(); // Refresh table data after successful save

            // Clear inputs
            setInputValue('');
            setSizeInputValue('');

            // Move cursor to the product input field
            document.querySelector('[placeholder="Wybierz pełną nazwę"]')?.focus();
        } catch (error) {
            console.error('Error sending data to backend:', error);
        }
    };

    useEffect(() => {
        fetchTableData(); // Fetch table data on component mount
    }, []);

    return (
        <div>
            <div className="d-flex align-items-center gap-3 mb-4">
                <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)} // Update selectedDate on change
                    placeholderText="Wybierz datę" // Polish: Select a date
                    className="form-control"
                    dateFormat="yyyy-MM-dd" // Ensure a valid date format
                />
                <Downshift
                    inputValue={inputValue} // Bind inputValue to Downshift
                    onInputValueChange={(newInputValue) => {
                        // Check if the input value matches any item in the dropdown
                        const matches = goods.some((item) =>
                            item.fullName.toLowerCase().startsWith(newInputValue.toLowerCase())
                        );
                        if (matches || newInputValue === '') {
                            setInputValue(newInputValue); // Update input value only if it matches
                            setSizeInputValue(''); // Clear size input value when typing in the product input
                        }
                    }}
                    onChange={(selection) => {
                        sizeInputRef.current?.focus(); // Focus on the size input field
                    }}
                    itemToString={(item) => (item ? item.fullName : '')} // Use fullName for display
                >
                    {({
                        getInputProps,
                        getItemProps,
                        getMenuProps,
                        isOpen,
                        highlightedIndex,
                    }) => (
                        <div className="w-50 position-relative">
                            <input
                                {...getInputProps({
                                    placeholder: 'Wybierz pełną nazwę', // Polish: Select a full name
                                    className: 'form-control',
                                })}
                            />
                            <ul
                                {...getMenuProps()}
                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                            >
                                {isOpen &&
                                    goods
                                        .filter((item) =>
                                            item.fullName
                                                .toLowerCase()
                                                .includes(inputValue.toLowerCase())
                                        )
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <li
                                                key={item._id || index} // Ensure unique key for each item
                                                {...getItemProps({
                                                    index,
                                                    item,
                                                    className: `list-group-item ${highlightedIndex === index
                                                        ? styles.dropdownItemActive
                                                        : styles.dropdownItem
                                                        }`,
                                                })}
                                            >
                                                {item.fullName} {/* Display fullName */}
                                            </li>
                                        ))}
                            </ul>
                        </div>
                    )}
                </Downshift>
                <Downshift
                    inputValue={sizeInputValue} // Bind sizeInputValue to Downshift
                    onInputValueChange={(newInputValue) => {
                        // Check if the input value matches any item in the dropdown
                        const matches = sizes.some((item) =>
                            item.Roz_Opis.toLowerCase().startsWith(newInputValue.toLowerCase())
                        );
                        if (matches || newInputValue === '') {
                            setSizeInputValue(newInputValue); // Update input value only if it matches
                        }
                    }}
                    onChange={(selection) => {
                        if (selection) {
                            sendDataToBackend(selection); // Send data to backend
                            setSizeInputValue(''); // Clear size input value
                        }
                    }}
                    itemToString={(item) => (item ? item.Roz_Opis : '')}
                >
                    {({
                        getInputProps,
                        getItemProps,
                        getMenuProps,
                        isOpen,
                        highlightedIndex,
                    }) => (
                        <div className="w-50 position-relative">
                            <input
                                {...getInputProps({
                                    placeholder: 'Wybierz rozmiar', // Polish: Select a size
                                    className: 'form-control',
                                    ref: sizeInputRef, // Attach ref to the size input field
                                    onKeyDown: (e) => {
                                        if (e.key === 'Enter' && sizes.length > 0) {
                                            const matchedSize = sizes.find((item) =>
                                                item.Roz_Opis.toLowerCase().startsWith(sizeInputValue.toLowerCase())
                                            );
                                            if (matchedSize) {
                                                // Removed sendDataToBackend call here to avoid duplication
                                            }
                                        }
                                    },
                                })}
                            />
                            <ul
                                {...getMenuProps()}
                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                            >
                                {isOpen &&
                                    sizes
                                        .filter((item) =>
                                            item.Roz_Opis
                                                .toLowerCase()
                                                .includes(sizeInputValue.toLowerCase())
                                        )
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <li
                                                key={item._id} // Pass key directly
                                                {...getItemProps({
                                                    index,
                                                    item,
                                                    className: `list-group-item ${highlightedIndex === index
                                                        ? styles.dropdownItemActive
                                                        : styles.dropdownItem
                                                        }`,
                                                })}
                                            >
                                                {item.Roz_Opis}
                                            </li>
                                        ))}
                            </ul>
                        </div>
                    )}
                </Downshift>
            </div>
            <table className="table table-dark table-striped table-bordered">
                <thead style={{ backgroundColor: 'black', color: 'white' }}>
                    <tr>
                        <th>Nr zamówienia</th>
                        <th>Pełna nazwa</th>
                        <th>Data</th>
                        <th>Rozmiar</th>
                        <th>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: 'black', color: 'white' }}>
                            <td>{index + 1}</td>
                            <td>{row.fullName}</td>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td>{row.size}</td>
                            <td>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => {
                                        // Add logic for deleting or handling actions
                                        console.log(`Action for row ID: ${row.id}`);
                                    }}
                                >
                                    Usuń
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default State;