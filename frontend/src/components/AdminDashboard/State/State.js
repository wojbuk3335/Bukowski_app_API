import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Downshift from 'downshift';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const State = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState(''); // Manage input value manually
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState(''); // Manage size input value manually
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
                const response = await axios.get('http://localhost:3000/api/excel/size/get-all-sizes');
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

    return (
        <div className="d-flex align-items-center gap-3">
            <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholderText="Select a date"
                className="form-control"
                readOnly
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
                    }
                }}
                onChange={(selection) => {
                    console.log('Selected:', selection);
                    sizeInputRef.current?.focus(); // Focus on the size input field
                }}
                itemToString={(item) => (item ? item.fullName : '')}
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
                                placeholder: 'Select a full name',
                                className: 'form-control',
                            })}
                        />
                        <ul
                            {...getMenuProps()}
                            className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'
                                }`}
                            style={{
                                zIndex: 1000,
                                maxHeight: 'auto', // Remove slider by not restricting height
                                backgroundColor: 'black', // Black background
                                color: 'white', // White text
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                            }}
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
                                            {...getItemProps({
                                                key: item._id,
                                                index,
                                                item,
                                                className: `list-group-item ${highlightedIndex === index
                                                    ? 'active'
                                                    : ''
                                                    }`,
                                            })}
                                            style={{
                                                backgroundColor:
                                                    highlightedIndex === index
                                                        ? '#0d6efd' // Updated background color for active item
                                                        : 'black',
                                                color: 'white', // White text
                                            }}
                                        >
                                            {item.fullName}
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
                    console.log('Selected size:', selection);
                    alert('The data has been sent'); // Alert message after selection
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
                                placeholder: 'Select a size',
                                className: 'form-control',
                                ref: sizeInputRef, // Attach ref to the size input field
                            })}
                        />
                        <ul
                            {...getMenuProps()}
                            className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'
                                }`}
                            style={{
                                zIndex: 1000,
                                maxHeight: 'auto', // Remove slider by not restricting height
                                backgroundColor: 'black', // Black background
                                color: 'white', // White text
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                            }}
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
                                            {...getItemProps({
                                                key: item._id,
                                                index,
                                                item,
                                                className: `list-group-item ${highlightedIndex === index
                                                    ? 'active'
                                                    : ''
                                                    }`,
                                            })}
                                            style={{
                                                backgroundColor:
                                                    highlightedIndex === index
                                                        ? '#0d6efd' // Updated background color for active item
                                                        : 'black',
                                                color: 'white', // White text
                                            }}
                                        >
                                            {item.Roz_Opis}
                                        </li>
                                    ))}
                        </ul>
                    </div>
                )}
            </Downshift>
        </div>
    );
};

export default State;