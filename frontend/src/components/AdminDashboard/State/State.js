import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import Downshift from 'downshift';
import Barcode from 'react-barcode'; // Ensure this import is present
import styles from './State.module.css'; // Import the CSS module
import { Modal, ModalHeader, ModalBody, Button, FormGroup, Label, Input, ModalFooter } from 'reactstrap'; // Import reactstrap components

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [sellingPoints, setSellingPoints] = useState([]);
    const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [filteredGoods, setFilteredGoods] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState('');
    const secondDownshiftInputRef = useRef(null);
    const buttonRef = useRef(null);
    const [nonEditableInputValue, setNonEditableInputValue] = useState('');
    const [tableData, setTableData] = useState([]);
    const productInputRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [loading, setLoading] = useState(false); // Add a loading state
    const modalRef = useRef(null);

    useEffect(() => {
        // Fetch selling points
        axios.get('/api/user')
            .then(response => {
                const points = response.data.users
                    .map(user => user.sellingPoint)
                    .filter(point => point !== null);
                setSellingPoints(points);
                if (points.length > 0) {
                    setSelectedSellingPoint(points[0]); // Set the first selling point as default
                }
            })
            .catch(error => {
                console.error('Error fetching selling points:', error);
            });

        // Fetch goods
        axios.get('/api/excel/goods/get-all-goods')
            .then(response => {
                setGoods(response.data.goods || []);
            })
            .catch(error => {
                console.error('Error fetching goods:', error);
            });

        // Fetch sizes
        axios.get('/api/excel/size/get-all-sizes')
            .then(response => {
                setSizes(response.data.sizes || []);
            })
            .catch(error => {
                console.error('Error fetching sizes:', error);
            });

        // Fetch table data (states)
        axios.get('http://localhost:3000/api/state/get')
            .then(response => {
                const fetchedStates = response.data.states || [];
                setTableData(fetchedStates);

                // Log fetched states only if debugging is enabled
                if (process.env.NODE_ENV === 'development') {
                    console.log('Fetched states:', fetchedStates);
                }

                // Ensure the first state's sellingPoint and barcode are set
                if (fetchedStates.length > 0) {
                    const firstState = fetchedStates[0];

                    // Check and set sellingPoint
                    if (firstState.sellingPoint) {
                        setSelectedSellingPoint(firstState.sellingPoint);
                    } else {
                        console.warn('Missing sellingPoint in the first state:', firstState);
                        setSelectedSellingPoint(''); // Fallback to empty string
                    }

                    // Check and set barcode
                    if (firstState.barcode) {
                        setNonEditableInputValue(firstState.barcode);
                    } else {
                        console.warn('Missing barcode in the first state:', firstState);
                        setNonEditableInputValue(''); // Fallback to empty string
                    }
                } else {
                    console.warn('No states fetched from the API.');
                    setSelectedSellingPoint(''); // Reset to empty if no states
                    setNonEditableInputValue(''); // Reset to empty if no states
                }
            })
            .catch(error => {
                console.error('Error fetching table data:', error);
                setSelectedSellingPoint(''); // Reset to empty on error
                setNonEditableInputValue(''); // Reset to empty on error
            });
    }, []);

    // Debugging: Log state changes only in development mode
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Selected Selling Point:', selectedSellingPoint);
            console.log('Non-Editable Barcode:', nonEditableInputValue);
        }
    }, [selectedSellingPoint, nonEditableInputValue]);

    useEffect(() => {
        setFilteredGoods(
            goods.filter(good =>
                good.fullName.toLowerCase().includes(inputValue.toLowerCase())
            )
        );
    }, [inputValue, goods]);

    const updateCodeWithSizeAndChecksum = (baseCode, rozKod) => {
        let paddedCode = baseCode.padEnd(11, '0');
        const formattedRozKod = rozKod.padStart(3, '0');
        paddedCode = paddedCode.substring(0, 5) + formattedRozKod + paddedCode.substring(8);
        const checksum = paddedCode
            .split('')
            .slice(0, 12)
            .reduce((sum, digit, index) => {
                const num = parseInt(digit, 10);
                return sum + (index % 2 === 0 ? num : num * 3);
            }, 0) % 10;
        const controlDigit = checksum === 0 ? 0 : 10 - checksum;
        return paddedCode.substring(0, 12) + controlDigit;
    };

    // Prevent double-triggering of handleAddToTable
    const handleAddToTable = () => {
        if (loading) return; // Prevent re-execution if already processing

        if (!inputValue || !sizeInputValue || !selectedSellingPoint) {
            alert("Proszę uzupełnić wszystkie wymagane pola: produkt, rozmiar i punkt sprzedaży.");
            return;
        }

        const payload = {
            date: selectedDate.toISOString(),
            sellingPoint: selectedSellingPoint,
            fullName: inputValue,
            size: sizeInputValue.toUpperCase(), // Ensure size is uppercase
            barcode: nonEditableInputValue,
        };

        setLoading(true); // Set loading to true to prevent duplicate submissions

        // Prevent multiple submissions by disabling the button temporarily
        if (buttonRef.current) {
            buttonRef.current.disabled = true;
        }

        axios.post('http://localhost:3000/api/state/add', payload)
            .then(response => {
                const newProduct = response.data.createdState;
                setTableData(prevData => [...prevData, newProduct]);
                setInputValue('');
                setSizeInputValue('');
                setNonEditableInputValue('');
                if (productInputRef.current) {
                    productInputRef.current.focus();
                }
            })
            .catch(error => {
                console.error('Błąd podczas dodawania do tabeli:', error.response || error);
                alert('Wystąpił błąd podczas dodawania do tabeli.');
            })
            .finally(() => {
                setLoading(false); // Reset loading state
                if (buttonRef.current) {
                    buttonRef.current.disabled = false;
                }
            });
    };

    const handleDelete = (index) => {
        const itemToDelete = tableData[index];
        axios
            .delete(`http://localhost:3000/api/state/delete/${itemToDelete._id}`)
            .then(() => {
                const updatedTableData = [...tableData];
                updatedTableData.splice(index, 1);
                setTableData(updatedTableData);
                alert('Produkt został usunięty.');
            })
            .catch((error) => {
                console.error('Błąd podczas usuwania produktu:', error.response || error);
                alert('Wystąpił błąd podczas usuwania produktu.');
            });
    };

    const handleEdit = (index) => {
        const itemToEdit = tableData[index];
        setInputValue(itemToEdit.fullName);
        setSelectedDate(new Date(itemToEdit.date));
        setSelectedSellingPoint(itemToEdit.sellingPoint);
        setSizeInputValue(itemToEdit.size);
        setNonEditableInputValue(itemToEdit.barcode);
        setEditIndex(index);
        setIsModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (editIndex !== null) {
            const itemToEdit = tableData[editIndex];
            const payload = {
                fullName: inputValue,
                date: selectedDate.toISOString(),
                sellingPoint: selectedSellingPoint,
                size: sizeInputValue,
                barcode: nonEditableInputValue,
            };

            // Log all modal values
            console.log('Modal Values:');
            console.log('Full Name:', inputValue);
            console.log('Date:', selectedDate.toISOString());
            console.log('Selling Point:', selectedSellingPoint);
            console.log('Size:', sizeInputValue);
            console.log('Barcode:', nonEditableInputValue);

            console.log('Payload:', payload); // Log the payload
            console.log('Updating ID:', itemToEdit._id); // Log the ID being updated

            axios
                .patch(`http://localhost:3000/api/state/update/${itemToEdit._id}`, payload)
                .then(() => {
                    const updatedTableData = [...tableData];
                    updatedTableData[editIndex] = { ...itemToEdit, ...payload };
                    setTableData(updatedTableData);
                    setIsModalOpen(false);
                    setInputValue('');
                    setSizeInputValue('');
                    setNonEditableInputValue('');
                    setEditIndex(null);
                    alert('Produkt został zaktualizowany.');
                })
                .catch((error) => {
                    console.error('Błąd podczas aktualizacji produktu:', error.response || error);
                    if (error.response) {
                        console.error('Response Data:', error.response.data);
                        console.error('Response Status:', error.response.status);
                    }
                    alert('Wystąpił błąd podczas aktualizacji produktu.');
                });
        }
    };

    const makeModalDraggable = () => {
        const modal = modalRef.current;
        if (!modal) return;

        const header = modal.querySelector('.modal-header');
        if (!header) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = modal.offsetLeft;
            initialY = modal.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                modal.style.left = `${initialX + dx}px`;
                modal.style.top = `${initialY + dy}px`;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        header.addEventListener('mousedown', onMouseDown);
    };

    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                makeModalDraggable();
            }, 100);
        }
    }, [isModalOpen]);

    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <input
            type="text"
            className="form-control custom-datepicker-input"
            onClick={onClick}
            value={value}
            readOnly
            ref={ref}
        />
    ));

    return (
        <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Kalendarz</label>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        customInput={<CustomInput />}
                        data-displayid="num=1"
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "white" }}>Punkt sprzedaży</label>
                    <select
                        className="form-control"
                        value={selectedSellingPoint}
                        onChange={(e) => setSelectedSellingPoint(e.target.value)}
                        style={{ width: '150px' }}
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
                            setInputValue(value);
                        }}
                        onChange={(selectedItem) => {
                            if (selectedItem) {
                                setInputValue(selectedItem.fullName);
                                setNonEditableInputValue(selectedItem.code.padEnd(13, '0'));
                                if (secondDownshiftInputRef.current) {
                                    secondDownshiftInputRef.current.focus();
                                }
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
                            <div style={{ width: '250px', position: 'relative' }}>
                                <input
                                    {...getInputProps({
                                        className: 'form-control',
                                        ref: productInputRef,
                                        onKeyDown: (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const matchedItem = goods.find((good) =>
                                                    good.fullName.toLowerCase() === inputValue.toLowerCase()
                                                );
                                                if (matchedItem) {
                                                    setInputValue(matchedItem.fullName);
                                                    setNonEditableInputValue(matchedItem.code.padEnd(13, '0'));
                                                    if (secondDownshiftInputRef.current) {
                                                        secondDownshiftInputRef.current.focus();
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
                                        border: isOpen ? '1px solid #ccc' : 'none', // Show border only when open
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        backgroundColor: 'black',
                                        color: 'white',
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
                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black',
                                                        color: 'white',
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
                            setSizeInputValue(value.toUpperCase()); // Convert input to uppercase
                        }}
                        onChange={(selectedItem) => {
                            if (selectedItem) {
                                const updatedCode = updateCodeWithSizeAndChecksum(
                                    nonEditableInputValue,
                                    selectedItem.Roz_Kod
                                );
                                setNonEditableInputValue(updatedCode);
                                setSizeInputValue(selectedItem.Roz_Opis.toUpperCase()); // Ensure selected size is uppercase
                                handleAddToTable();
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
                            <div style={{ width: '150px', position: 'relative' }}>
                                <input
                                    {...getInputProps({
                                        className: 'form-control',
                                        ref: secondDownshiftInputRef,
                                        onKeyDown: (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const matchedItem = sizes.find((size) =>
                                                    size.Roz_Opis.toLowerCase() === sizeInputValue.toLowerCase()
                                                );
                                                if (matchedItem) {
                                                    const updatedCode = updateCodeWithSizeAndChecksum(
                                                        nonEditableInputValue,
                                                        matchedItem.Roz_Kod
                                                    );
                                                    setNonEditableInputValue(updatedCode);
                                                    setSizeInputValue(matchedItem.Roz_Opis.toUpperCase()); // Ensure matched size is uppercase
                                                    handleAddToTable();
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
                                        border: isOpen ? '1px solid #ccc' : 'none', // Show border only when open
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        backgroundColor: 'black',
                                        color: 'white',
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
                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black',
                                                        color: 'white',
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
                        value={`${nonEditableInputValue}`}
                        readOnly
                        className="form-control text-center"
                        style={{
                            width: '150px',
                            backgroundColor: 'black',
                            color: 'white',
                            cursor: 'not-allowed',
                        }}
                        tabIndex={-1}
                    />
                    {/* Removed the barcode rendering here */}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ color: "black" }}>Dodaj</label>
                    <button
                        ref={buttonRef}
                        className="btn btn-primary btn-sm" // Add btn-sm class
                        onClick={handleAddToTable}
                    >
                        Dodaj
                    </button>
                </div>
            </div>
            <div>
                <table style={{ width: '100%', marginTop: '20px', color: 'white', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Numer Zamówienia</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Pełna Nazwa</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Data</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Punkt Sprzedaży</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Rozmiar</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Kod Kreskowy</th>
                            <th style={{ border: '1px solid white', padding: '10px' }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid white', padding: '10px' }}>{index + 1}</td><td style={{ border: '1px solid white', padding: '10px' }}>{row.fullName}</td><td style={{ border: '1px solid white', padding: '10px' }}>{new Date(row.date).toLocaleDateString()}</td><td style={{ border: '1px solid white', padding: '10px' }}>{row.sellingPoint}</td><td style={{ border: '1px solid white', padding: '10px' }}>{row.size}</td><td style={{ border: '1px solid white', padding: '10px', textAlign: 'center' }}>{row.barcode && (<Barcode value={row.barcode} width={1} height={25} />)}</td><td style={{ border: '1px solid white', padding: '10px', textAlign: 'center' }}><button style={{ marginRight: '10px' }} className="btn btn-warning btn-sm" onClick={() => handleEdit(index)}>Edytuj</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(index)}>Usuń</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal
                isOpen={isModalOpen}
                toggle={() => setIsModalOpen(!isModalOpen)}
                className={styles.customModal}
                innerRef={modalRef} // Attach the ref to the modal
                backdrop={false} // Disable the backdrop to allow free movement
            >
                <ModalHeader
                    toggle={() => setIsModalOpen(false)}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                >
                    Edytuj Produkt
                    <button className={styles.customCloseButton} onClick={() => setIsModalOpen(false)}></button>
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="modalProduct">Produkt</Label>
                        <Downshift
                            inputValue={inputValue} // Use a separate state for the modal if needed
                            onInputValueChange={(value) => setInputValue(value)}
                            onChange={(selectedItem) => {
                                if (selectedItem) {
                                    setInputValue(selectedItem.fullName);
                                    setNonEditableInputValue(selectedItem.code.padEnd(13, '0'));
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
                                <div style={{ position: 'relative' }}>
                                    <input
                                        {...getInputProps({
                                            className: 'form-control',
                                        })}
                                    />
                                    <ul
                                        {...getMenuProps()}
                                        style={{
                                            listStyleType: 'none',
                                            padding: 0,
                                            margin: 0,
                                            border: isOpen ? '1px solid #ccc' : 'none', // Show border only when open
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            backgroundColor: 'black', // Set background to black
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
                                                            backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black',
                                                            color: 'white',
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
                    </FormGroup>
                    <FormGroup>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            <Label for="productDate" style={{ marginBottom: '5px' }}>Data</Label>
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date) => setSelectedDate(date)}
                                className="form-control xxx"
                                style={{ width: '600px' }} // Set input width to 100%
                            />
                        </div>
                    </FormGroup>
                    <FormGroup>
                        <Label for="sellingPoint">Punkt Sprzedaży</Label>
                        <select
                            id="sellingPoint"
                            className="form-control"
                            value={selectedSellingPoint}
                            onChange={(e) => setSelectedSellingPoint(e.target.value)}
                        >
                            {sellingPoints.map((point, index) => (
                                <option key={index} value={point}>
                                    {point}
                                </option>
                            ))}
                        </select>
                    </FormGroup>
                    <FormGroup>
                        <Label for="productSize">Rozmiar</Label>
                        <Downshift
                            inputValue={sizeInputValue}
                            onInputValueChange={(value) => setSizeInputValue(value.toUpperCase())} // Convert input to uppercase
                            onChange={(selectedItem) => {
                                if (selectedItem) {
                                    const updatedCode = updateCodeWithSizeAndChecksum(
                                        nonEditableInputValue,
                                        selectedItem.Roz_Kod
                                    );
                                    setNonEditableInputValue(updatedCode);
                                    setSizeInputValue(selectedItem.Roz_Opis.toUpperCase()); // Ensure selected size is uppercase
                                }
                            }}
                            itemToString={(item) => (item ? item.Roz_Opis : '')}
                        >
                            {({
                                getInputProps,
                                getItemProps, d
                                getMenuProps,
                                isOpen,
                                highlightedIndex,
                            }) => (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        {...getInputProps({
                                            className: 'form-control',
                                        })}
                                    />
                                    <ul
                                        {...getMenuProps()}
                                        style={{
                                            listStyleType: 'none',
                                            padding: 0,
                                            margin: 0,
                                            border: isOpen ? '1px solid #ccc' : 'none', // Show border only when open
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            backgroundColor: 'black', // Set background to black
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
                                                            backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black',
                                                            color: 'white',
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
                    </FormGroup>
                    <FormGroup>
                        <Label for="barcode">Kod Kreskowy</Label>
                        <Input
                            type="text"
                            id="barcode"
                            value={nonEditableInputValue}
                            readOnly
                            className="form-control"
                        />
                    </FormGroup>

                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="primary btn-sm" onClick={handleSaveEdit}>
                        Zapisz
                    </Button>
                    <Button color="secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default State;