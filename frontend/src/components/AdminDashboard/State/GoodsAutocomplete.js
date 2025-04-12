import React, { useState, useEffect } from 'react';
import Downshift from 'downshift';

const GoodsAutocomplete = () => {
    const [goods, setGoods] = useState([]);

    useEffect(() => {
        // Fetch goods data from the API
        fetch('/api/excel/goods/get-all-goods')
            .then(response => response.json())
            .then(data => setGoods(data.goods || []))
            .catch(error => console.error('Error fetching goods:', error));
    }, []);

    return (
        <Downshift
            onChange={selection => alert(selection ? `You selected ${selection.Tow_Opis}` : 'Selection cleared')}
            itemToString={item => (item ? item.Tow_Opis : '')}
        >
            {({
                getInputProps,
                getItemProps,
                getMenuProps,
                isOpen,
                inputValue,
                highlightedIndex,
                selectedItem,
            }) => (
                <div>
                    <input {...getInputProps({ placeholder: 'Search goods...' })} />
                    <ul {...getMenuProps()}>
                        {isOpen &&
                            goods
                                .filter(item => !inputValue || item.stock.Tow_Opis.toLowerCase().includes(inputValue.toLowerCase()))
                                .map((item, index) => (
                                    <li
                                        {...getItemProps({
                                            key: item._id,
                                            index,
                                            item,
                                            style: {
                                                backgroundColor: highlightedIndex === index ? '#bde4ff' : 'white',
                                                fontWeight: selectedItem === item ? 'bold' : 'normal',
                                            },
                                        })}
                                    >
                                        {item.stock.Tow_Opis}
                                    </li>
                                ))}
                    </ul>
                </div>
            )}
        </Downshift>
    );
};

export default GoodsAutocomplete;
