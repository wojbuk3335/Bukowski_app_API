import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Form, FormGroup, Label, Col } from 'reactstrap';
import axios from 'axios';

const Category = () => {
    const [categoryName, setCategoryName] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [subcategoryName, setSubcategoryName] = useState('');
    const [subcategories, setSubcategories] = useState({});
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [subsubcategoryName, setSubsubcategoryName] = useState('');
    const [subsubcategories, setSubsubcategories] = useState({});
    const [selectedSubsubcategory, setSelectedSubsubcategory] = useState('');
    const [subsubsubcategoryName, setSubsubsubcategoryName] = useState('');
    const [subsubsubcategories, setSubsubsubcategories] = useState({});
    const [savedCategories, setSavedCategories] = useState([]);

    const categoryInputRef = useRef(null);
    const subcategoryInputRef = useRef(null);
    const subsubcategoryInputRef = useRef(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/excel/category');
            setSavedCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleAddCategory = () => {
        if (categoryName.trim() !== '') {
            setCategories([...categories, categoryName]);
            setSubcategories({ ...subcategories, [categoryName]: [] });
            setCategoryName('');
            categoryInputRef.current.focus();
        }
    };

    const handleRemoveCategory = (category) => {
        setCategories(categories.filter((c) => c !== category));
        const updatedSubcategories = { ...subcategories };
        delete updatedSubcategories[category];
        setSubcategories(updatedSubcategories);

        const updatedSubsubcategories = { ...subsubcategories };
        Object.keys(updatedSubsubcategories).forEach((key) => {
            if (key.startsWith(`${category}-`)) {
                delete updatedSubsubcategories[key];
            }
        });
        setSubsubcategories(updatedSubsubcategories);

        const updatedSubsubsubcategories = { ...subsubsubcategories };
        Object.keys(updatedSubsubsubcategories).forEach((key) => {
            if (key.startsWith(`${category}-`)) {
                delete updatedSubsubsubcategories[key];
            }
        });
        setSubsubsubcategories(updatedSubsubsubcategories);

        if (selectedCategory === category) {
            setSelectedCategory('');
            setSelectedSubcategory('');
        }
    };

    const handleAddSubcategory = () => {
        if (selectedCategory && subcategoryName.trim() !== '') {
            setSubcategories({
                ...subcategories,
                [selectedCategory]: [...subcategories[selectedCategory], subcategoryName],
            });
            setSubsubcategories({
                ...subsubcategories,
                [`${selectedCategory}-${subcategoryName}`]: [],
            });
            setSubcategoryName('');
            subcategoryInputRef.current.focus();
        }
    };

    const handleRemoveSubcategory = (subcategory) => {
        const updatedSubcategories = {
            ...subcategories,
            [selectedCategory]: subcategories[selectedCategory].filter((s) => s !== subcategory),
        };
        setSubcategories(updatedSubcategories);

        const updatedSubsubcategories = { ...subsubcategories };
        delete updatedSubsubcategories[`${selectedCategory}-${subcategory}`];
        setSubsubcategories(updatedSubsubcategories);

        const updatedSubsubsubcategories = { ...subsubsubcategories };
        Object.keys(updatedSubsubsubcategories).forEach((key) => {
            if (key.startsWith(`${selectedCategory}-${subcategory}-`)) {
                delete updatedSubsubsubcategories[key];
            }
        });
        setSubsubsubcategories(updatedSubsubsubcategories);

        if (selectedSubcategory === subcategory) {
            setSelectedSubcategory('');
        }
    };

    const handleAddSubsubcategory = () => {
        if (selectedSubcategory && subsubcategoryName.trim() !== '') {
            const key = `${selectedCategory}-${selectedSubcategory}`;
            setSubsubcategories({
                ...subsubcategories,
                [key]: [...subsubcategories[key], subsubcategoryName],
            });
            setSubsubcategoryName('');
            subsubcategoryInputRef.current.focus();
        }
    };

    const handleRemoveSubsubcategory = (subsubcategory) => {
        const key = `${selectedCategory}-${selectedSubcategory}`;
        setSubsubcategories({
            ...subsubcategories,
            [key]: subsubcategories[key].filter((s) => s !== subsubcategory),
        });

        const updatedSubsubsubcategories = { ...subsubsubcategories };
        Object.keys(updatedSubsubsubcategories).forEach((key) => {
            if (key.startsWith(`${selectedCategory}-${selectedSubcategory}-${subsubcategory}-`)) {
                delete updatedSubsubsubcategories[key];
            }
        });
        setSubsubsubcategories(updatedSubsubsubcategories);
    };

    const handleAddSubsubsubcategory = () => {
        if (selectedSubcategory && selectedSubsubcategory && subsubsubcategoryName.trim() !== '') {
            const key = `${selectedCategory}-${selectedSubcategory}-${selectedSubsubcategory}`;
            setSubsubsubcategories({
                ...subsubsubcategories,
                [key]: [...(subsubsubcategories[key] || []), subsubsubcategoryName],
            });
            setSubsubsubcategoryName('');
            subsubcategoryInputRef.current.focus();
        }
    };

    const handleRemoveSubsubsubcategory = (subsubsubcategory) => {
        const key = `${selectedCategory}-${selectedSubcategory}-${selectedSubsubcategory}`;
        setSubsubsubcategories({
            ...subsubsubcategories,
            [key]: subsubsubcategories[key].filter((s) => s !== subsubsubcategory),
        });
    };

    const handleKeyPress = (event, addFunction) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addFunction();
        }
    };

    const handleSaveCategories = async () => {
        try {
            const formattedCategories = categories.map((category) => ({
                name: category,
                subcategories: subcategories[category]?.map((subcategory) => ({
                    name: subcategory,
                    subsubcategories: subsubcategories[`${category}-${subcategory}`]?.map((subsubcategory) => ({
                        name: subsubcategory,
                        subsubsubcategories: subsubsubcategories[`${category}-${subcategory}-${subsubcategory}`]?.map(
                            (subsubsubcategory) => ({
                                name: subsubsubcategory,
                            })
                        ),
                    })),
                })),
            }));

            console.log('Formatted JSON to be sent:', JSON.stringify(formattedCategories, null, 2)); // Log JSON

            await axios.post('http://localhost:3001/api/excel/category', formattedCategories);
            fetchCategories();
        } catch (error) {
            console.error('Error saving categories:', error.response?.data || error.message);
        }
    };

    return (
        <div className="container mt-4">
            <h2 style={{ color: 'white' }}>Zarządzanie Kategoriami</h2>
            <Form>
                {/* Category Input and Add Button */}
                <FormGroup row>
                    <Label for="categoryInput" sm={2}>Nazwa Kategorii</Label>
                    <Col sm={8}>
                        <Input
                            type="text"
                            id="categoryInput"
                            placeholder="Wpisz nazwę kategorii"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, handleAddCategory)}
                            innerRef={categoryInputRef}
                        />
                    </Col>
                    <Col sm={2}>
                        <Button color="primary" onClick={handleAddCategory}>
                            Dodaj Kategorię
                        </Button>
                    </Col>
                </FormGroup>

                {/* Category List with Remove Buttons */}
                <FormGroup row>
                    <Label sm={2}>Kategorie</Label>
                    <Col sm={10}>
                        {categories.map((category, index) => (
                            <div key={index} className="d-flex align-items-center mb-2">
                                <Input
                                    type="radio"
                                    name="category"
                                    value={category}
                                    checked={selectedCategory === category}
                                    onChange={() => {
                                        setSelectedCategory(category);
                                        setSelectedSubcategory('');
                                    }}
                                />
                                <span className="ms-2">{category}</span>
                                <Button
                                    color="danger"
                                    size="sm"
                                    className="ms-2"
                                    onClick={() => handleRemoveCategory(category)}
                                >
                                    Usuń
                                </Button>
                            </div>
                        ))}
                    </Col>
                </FormGroup>

                {/* Subcategory Input and Add Button */}
                {selectedCategory && (
                    <>
                        <FormGroup row>
                            <Label for="subcategoryInput" sm={2}>Nazwa Podkategorii</Label>
                            <Col sm={8}>
                                <Input
                                    type="text"
                                    id="subcategoryInput"
                                    placeholder={`Wpisz podkategorię dla ${selectedCategory}`}
                                    value={subcategoryName}
                                    onChange={(e) => setSubcategoryName(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, handleAddSubcategory)}
                                    innerRef={subcategoryInputRef}
                                />
                            </Col>
                            <Col sm={2}>
                                <Button color="secondary" onClick={handleAddSubcategory}>
                                    Dodaj Podkategorię
                                </Button>
                            </Col>
                        </FormGroup>

                        {/* Subcategory List with Remove Buttons */}
                        <FormGroup row>
                            <Label sm={2}>Podkategorie</Label>
                            <Col sm={10}>
                                {subcategories[selectedCategory]?.map((subcategory, index) => (
                                    <div key={index} className="d-flex align-items-center mb-2">
                                        <Input
                                            type="radio"
                                            name="subcategory"
                                            value={subcategory}
                                            checked={selectedSubcategory === subcategory}
                                            onChange={() => setSelectedSubcategory(subcategory)}
                                        />
                                        <span className="ms-2">{subcategory}</span>
                                        <Button
                                            color="danger"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleRemoveSubcategory(subcategory)}
                                        >
                                            Usuń
                                        </Button>
                                    </div>
                                ))}
                            </Col>
                        </FormGroup>
                    </>
                )}

                {/* Sub-subcategory Input and Add Button */}
                {selectedSubcategory && (
                    <>
                        <FormGroup row>
                            <Label for="subsubcategoryInput" sm={2}>Nazwa Pod-podkategorii</Label>
                            <Col sm={8}>
                                <Input
                                    type="text"
                                    id="subsubcategoryInput"
                                    placeholder={`Wpisz pod-podkategorię dla ${selectedSubcategory}`}
                                    value={subsubcategoryName}
                                    onChange={(e) => setSubsubcategoryName(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, handleAddSubsubcategory)}
                                    innerRef={subsubcategoryInputRef}
                                />
                            </Col>
                            <Col sm={2}>
                                <Button color="success" onClick={handleAddSubsubcategory}>
                                    Dodaj Pod-podkategorię
                                </Button>
                            </Col>
                        </FormGroup>

                        {/* Sub-subcategory List with Remove Buttons */}
                        <FormGroup row>
                            <Label sm={2}>Pod-podkategorie</Label>
                            <Col sm={10}>
                                {subsubcategories[`${selectedCategory}-${selectedSubcategory}`]?.map(
                                    (subsubcategory, index) => (
                                        <div key={index} className="d-flex align-items-center mb-2">
                                            <Input
                                                type="radio"
                                                name="subsubcategory"
                                                value={subsubcategory}
                                                checked={selectedSubsubcategory === subsubcategory}
                                                onChange={() => setSelectedSubsubcategory(subsubcategory)}
                                            />
                                            <span className="ms-2">{subsubcategory}</span>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                className="ms-2"
                                                onClick={() => handleRemoveSubsubcategory(subsubcategory)}
                                            >
                                                Usuń
                                            </Button>
                                        </div>
                                    )
                                )}
                            </Col>
                        </FormGroup>
                    </>
                )}

                {/* Sub-sub-subcategory Input and Add Button */}
                {selectedSubsubcategory && (
                    <>
                        <FormGroup row>
                            <Label for="subsubsubcategoryInput" sm={2}>Nazwa Pod-pod-podkategorii</Label>
                            <Col sm={8}>
                                <Input
                                    type="text"
                                    id="subsubsubcategoryInput"
                                    placeholder={`Wpisz pod-pod-podkategorię dla ${selectedSubsubcategory}`}
                                    value={subsubsubcategoryName}
                                    onChange={(e) => setSubsubsubcategoryName(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, handleAddSubsubsubcategory)}
                                />
                            </Col>
                            <Col sm={2}>
                                <Button color="info" onClick={handleAddSubsubsubcategory}>
                                    Dodaj Pod-pod-podkategorię
                                </Button>
                            </Col>
                        </FormGroup>

                        {/* Sub-sub-subcategory List with Remove Buttons */}
                        <FormGroup row>
                            <Label sm={2}>Pod-pod-podkategorie</Label>
                            <Col sm={10}>
                                {subsubsubcategories[`${selectedCategory}-${selectedSubcategory}-${selectedSubsubcategory}`]?.map(
                                    (subsubsubcategory, index) => (
                                        <div key={index} className="d-flex align-items-center mb-2">
                                            <span>{subsubsubcategory}</span>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                className="ms-2"
                                                onClick={() => handleRemoveSubsubsubcategory(subsubsubcategory)}
                                            >
                                                Usuń
                                            </Button>
                                        </div>
                                    )
                                )}
                            </Col>
                        </FormGroup>
                    </>
                )}
                <Button color="success" onClick={handleSaveCategories}>
                    Zapisz Kategorie
                </Button>
            </Form>
        </div>
    );
};

export default Category;
