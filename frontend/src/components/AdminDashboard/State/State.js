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
                onChange={(selection) => console.log('Selected:', selection)}
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
                                maxHeight: '150px',
                                overflowY: 'auto',
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
                                                        ? '#333' // Darker background for highlighted item
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
        </div>
    );
};

export default State;