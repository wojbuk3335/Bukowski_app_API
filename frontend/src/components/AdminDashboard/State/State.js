import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import Downshift from 'downshift';

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Set default to today's date
    const [sellingPoints, setSellingPoints] = useState([]);
    const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [filteredGoods, setFilteredGoods] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState('');
    const secondDownshiftInputRef = useRef(null); // Ref for the second Downshift input
    const buttonRef = useRef(null); // Ref for the button
    const [nonEditableInputValue, setNonEditableInputValue] = useState(''); // State for non-editable input value

    useEffect(() => {
        // Fetch selling points from the API
        axios.get('/api/user')
            .then(response => {
                const points = response.data.users
                    .map(user => user.sellingPoint)
                    .filter(point => point !== null);
                setSellingPoints(points);
            })
            .catch(error => {
                console.error('Error fetching selling points:', error);
            });

        // Fetch goods from the API
        axios.get('/api/excel/goods/get-all-goods')
            .then(response => {
                setGoods(response.data.goods || []);
            })
            .catch(error => {
                console.error('Error fetching goods:', error);
            });

        // Fetch sizes from the API
        axios.get('/api/excel/size/get-all-sizes')
            .then(response => {
                setSizes(response.data.sizes || []);
            })
            .catch(error => {
                console.error('Error fetching sizes:', error);
            });
    }, []);

    useEffect(() => {
        // Filter goods based on input value
        setFilteredGoods(
            goods.filter(good =>
                good.fullName.toLowerCase().includes(inputValue.toLowerCase())
            )
        );
    }, [inputValue, goods]);

    const updateCodeWithSizeAndChecksum = (baseCode, rozKod) => {
        // Ensure the base code is at least 11 digits long (excluding Roz_Kod and checksum)
        let paddedCode = baseCode.padEnd(11, '0');

        // Ensure Roz_Kod is exactly 3 digits
        const formattedRozKod = rozKod.padStart(3, '0');

        // Update the 6th, 7th, and 8th digits with Roz_Kod
        paddedCode = paddedCode.substring(0, 5) + formattedRozKod + paddedCode.substring(8);

        // Calculate checksum using the first 12 digits
        const checksum = paddedCode
            .split('')
            .slice(0, 12) // Use only the first 12 digits
            .reduce((sum, digit, index) => {
                const num = parseInt(digit, 10);
                return sum + (index % 2 === 0 ? num : num * 3); // Multiply every second digit by 3
            }, 0) % 10;

        const controlDigit = checksum === 0 ? 0 : 10 - checksum; // Calculate the control digit

        // Return the updated code with the new checksum
        return paddedCode.substring(0, 12) + controlDigit;
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Kalendarz</label>

                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        className="form-control"
                        style={{
                            width: '150px', // Set consistent width
                            marginRight: '15px', // Set a consistent margin
                        }}
                        data-displayid="num=1" // Add displayid attribute
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Punkt sprzedaży</label>
                    <select
                        className="form-control"
                        value={selectedSellingPoint}
                        onChange={(e) => setSelectedSellingPoint(e.target.value)}
                        style={{ width: '150px' }} // Set consistent width
                    >
                        {sellingPoints.length > 0 ? (
                            sellingPoints.map((point, index) => (
                                <option key={index} value={point}>
                                    {point}
                                </option>
                            ))
                        ) : (
                            <option disabled>Brak dostępnych punktów sprzedaży</option>
                        )}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Produkt</label>
                    <Downshift
                        inputValue={inputValue}
                        onInputValueChange={(value) => {
                            const matches = goods.filter((good) =>
                                good.fullName.toLowerCase().includes(value.toLowerCase())
                            );
                            if (matches.length > 0) {
                                setInputValue(value); // Allow input if matches exist
                            }
                        }}
                        onChange={(selectedItem) => {
                            console.log('Selected item:', selectedItem);
                            if (selectedItem) {
                                setNonEditableInputValue(selectedItem.code.padEnd(13, '0')); // Ensure 13 digits
                            }
                            if (secondDownshiftInputRef.current) {
                                secondDownshiftInputRef.current.focus(); // Focus on the second Downshift input
                            }
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
                            <div style={{ width: '250px', position: 'relative' }}> {/* Set consistent width */}
                                <input
                                    {...getInputProps({
                                        className: 'form-control',
                                        onKeyDown: (e) => {
                                            if (e.key === 'Enter' && isOpen && highlightedIndex !== null) {
                                                e.preventDefault();
                                                const selectedItem = goods.filter((good) =>
                                                    good.fullName.toLowerCase().includes(inputValue.toLowerCase())
                                                )[highlightedIndex];
                                                if (selectedItem) {
                                                    setInputValue(selectedItem.fullName);
                                                    setNonEditableInputValue(selectedItem.code.padEnd(13, '0')); // Ensure 13 digits
                                                    if (secondDownshiftInputRef.current) {
                                                        secondDownshiftInputRef.current.focus(); // Focus on the second Downshift input
                                                    }
                                                }
                                            }
                                        },
                                    })}
                                />
                                <ul
                                    {...getMenuProps()}
                                    style={{
                                        listStyleType: 'none',
                                        padding: 0,
                                        margin: 0,
                                        border: '1px solid #ccc',
                                        borderTop: 'none', // Remove the top border
                                        borderBottom: isOpen ? '1px solid #ccc' : 'none', // Conditionally show border-bottom
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        backgroundColor: 'black', // Set background color to black
                                        color: 'white', // Set text color to white
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        width: '100%',
                                        zIndex: 1000,
                                    }}
                                >
                                    {isOpen &&
                                        goods
                                            .filter((good) =>
                                                good.fullName.toLowerCase().includes(inputValue.toLowerCase())
                                            )
                                            .map((item, index) => (
                                                <li
                                                    key={item._id}
                                                    {...getItemProps({ item, index })}
                                                    style={{
                                                        padding: '5px 10px',
                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Hover background color
                                                        color: 'white', // Text color
                                                        cursor: 'pointer',
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Rozmiary</label>
                    <Downshift
                        inputValue={sizeInputValue}
                        onInputValueChange={(value) => {
                            const matches = sizes.filter((size) =>
                                size.Roz_Opis.toLowerCase().includes(value.toLowerCase())
                            );
                            if (matches.length > 0) {
                                setSizeInputValue(value); // Allow input if matches exist
                            }
                        }}
                        onChange={(selectedItem) => {
                            if (!inputValue) {
                                alert("Proszę najpierw uzupełnić produkt"); // Alert if product is empty
                                return;
                            }
                            console.log('Selected size:', selectedItem);
                            if (selectedItem) {
                                const updatedCode = updateCodeWithSizeAndChecksum(
                                    nonEditableInputValue,
                                    selectedItem.Roz_Kod
                                );
                                setNonEditableInputValue(updatedCode); // Update the non-editable input with the new code
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
                            <div style={{ width: '150px', position: 'relative' }}> {/* Set consistent width */}
                                <input
                                    {...getInputProps({
                                        className: 'form-control',
                                        ref: secondDownshiftInputRef,
                                        onKeyDown: (e) => {
                                            if (e.key === 'Enter' && isOpen && highlightedIndex !== null) {
                                                e.preventDefault();
                                                const selectedItem = sizes.filter((size) =>
                                                    size.Roz_Opis.toLowerCase().includes(sizeInputValue.toLowerCase())
                                                )[highlightedIndex];
                                                if (selectedItem) {
                                                    const updatedCode = updateCodeWithSizeAndChecksum(
                                                        nonEditableInputValue,
                                                        selectedItem.Roz_Kod
                                                    );
                                                    setNonEditableInputValue(updatedCode); // Update the non-editable input with the new code
                                                }
                                            }
                                        },
                                    })}
                                />
                                <ul
                                    {...getMenuProps()}
                                    style={{
                                        listStyleType: 'none',
                                        padding: 0,
                                        margin: 0,
                                        border: '1px solid #ccc',
                                        borderTop: 'none', // Remove the top border
                                        borderBottom: isOpen ? '1px solid #ccc' : 'none', // Conditionally show border-bottom
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        backgroundColor: 'black', // Set background color to black
                                        color: 'white', // Set text color to white
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        width: '100%',
                                        zIndex: 1000,
                                    }}
                                >
                                    {isOpen &&
                                        sizes
                                            .filter((size) =>
                                                size.Roz_Opis.toLowerCase().includes(sizeInputValue.toLowerCase())
                                            )
                                            .map((item, index) => (
                                                <li
                                                    key={item._id}
                                                    {...getItemProps({ item, index })}
                                                    style={{
                                                        padding: '5px 10px',
                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Hover background color
                                                        color: 'white', // Text color
                                                        cursor: 'pointer',
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Kod kreskowy</label>
                    <input
                        type="text"
                        value={`${nonEditableInputValue}`} // Add ordering number to value
                        readOnly
                        className="form-control text-center"
                        style={{
                            width: '150px', // Set consistent width
                            backgroundColor: 'black',
                            color: 'white',
                            cursor: 'not-allowed',
                        }}
                        tabIndex={-1}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "black" }}>Dodaj</label>
                    <button
                        ref={buttonRef}
                        className="btn btn-primary"
                        onClick={() => {
                            if (!selectedDate) {
                                alert("Proszę wybrać datę"); // Alert if the date is empty
                            } else if (!inputValue) {
                                alert("Proszę wybrać produkt"); // Alert if the Goods input is empty
                            } else {
                                const payload = {
                                    date: selectedDate.toISOString(),
                                    sellingPoint: selectedSellingPoint,
                                    fullName: inputValue, // Send product as fullName
                                    size: sizeInputValue,
                                    barcode: nonEditableInputValue,
                                };

                                axios.post('http://localhost:3000/api/state/add', payload)
                                    .then(response => {
                                        alert('Dane zostały pomyślnie wysłane!');
                                    })
                                    .catch(error => {
                                        console.error('Błąd podczas wysyłania danych:', error);
                                        alert('Wystąpił błąd podczas wysyłania danych.');
                                    });
                            }
                        }}
                    >
                        Dodaj
                    </button>
                </div>
            </div>
            <div>

            </div>
        </div>
    );
};

export default State;