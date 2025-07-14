import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, FormGroup, Label, Input, Button, Table, ModalFooter } from 'reactstrap';
import axios from 'axios';
import styles from './Users.module.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', symbol: '', role: 'user', sellingPoint: '', location: '' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [editUser, setEditUser] = useState({ _id: '', email: '', symbol: '', role: '', sellingPoint: '', location: '' });
    const [userIdToDelete, setUserIdToDelete] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const [initialRole, setInitialRole] = useState('');
    const [oldUser, setOldUser] = useState(null);
    const [updatedUser, setUpdatedUser] = useState(null);
    const [localizations, setLocalizations] = useState([]);

    const modalRef = useRef(null);

    useEffect(() => {
        fetchUsers();
        fetchLocalizations();
    }, []);

    useEffect(() => {
        if (isAddUserModalOpen || isModalOpen || isDeleteConfirmModalOpen) {
            setTimeout(() => {
                makeModalDraggable();
            }, 100);
        }
    }, [isAddUserModalOpen, isModalOpen, isDeleteConfirmModalOpen]);

    const fetchUsers = () => {
        setLoading(true);
        axios.get('/api/user', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
            }
        })
            .then(response => {
                setUsers(response.data.users);
            })
            .catch(error => {
                console.error('There was an error fetching the users!', error);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const fetchLocalizations = () => {
        axios.get('/api/excel/localization/get-all-localizations')
            .then(response => {
                // Filtruj tylko lokalizacje z niepustym opisem dla select w Users
                const localizationsWithDescription = response.data.localizations.filter(localization => 
                    localization.Miejsc_1_Opis_1 && 
                    localization.Miejsc_1_Opis_1.trim() !== ""
                );
                setLocalizations(localizationsWithDescription);
            })
            .catch(error => {
                console.error('There was an error fetching the localizations!', error);
            });
    };

    const toggleModal = () => setIsModalOpen(!isModalOpen);
    const toggleAddUserModal = () => {
        setIsAddUserModalOpen(!isAddUserModalOpen);
        if (!isAddUserModalOpen) {
            // Clear all inputs when opening the modal
            setNewUser({ email: '', password: '', symbol: '', role: 'user', sellingPoint: '', location: '' });
            setConfirmPassword('');
        }
    };
    const toggleDeleteConfirmModal = () => setIsDeleteConfirmModalOpen(!isDeleteConfirmModalOpen);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setNewUser({ ...newUser, [id]: value });
    };

    const handleRoleChange = (e) => {
        const { value } = e.target;
        setNewUser({ ...newUser, role: value, sellingPoint: (value === 'admin' || value === 'magazyn') ? '' : newUser.sellingPoint, location: (value === 'admin' || value === 'magazyn') ? '' : newUser.location });
    };

    const handleEditRoleChange = (e) => {
        const { value } = e.target;
        setEditUser({
            ...editUser,
            role: value,
            sellingPoint: (value === 'admin' || value === 'magazyn') ? null : editUser.sellingPoint,
            location: (value === 'admin' || value === 'magazyn') ? null : editUser.location
        });
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
    };

    const handleEditInputChange = (e) => {
        const { id, value } = e.target;
        setEditUser({ ...editUser, [id]: value });
    };

    const handleEditPasswordChange = (e) => {
        setEditPassword(e.target.value);
    };

    const handleEditConfirmPasswordChange = (e) => {
        setEditConfirmPassword(e.target.value);
    };

    const handleAddUser = () => {
        // Ensure sellingPoint and location are empty strings for administrators and magazyn
        if (newUser.role === 'admin' || newUser.role === 'magazyn') {
            newUser.sellingPoint = '';
            newUser.location = '';
        }

        // Ensure sellingPoint and location are not empty for users
        if (newUser.role === 'user' && newUser.sellingPoint === '') {
            alert('Użytkownik musi mieć punkt sprzedaży.');
            return;
        }

        if (newUser.role === 'user' && newUser.location === '') {
            alert('Użytkownik musi mieć lokalizację.');
            return;
        }

        // Check if email, symbol, or sellingPoint already exists (case-insensitive)
        const emailExists = users.some(user => user.email.toLowerCase() === newUser.email.toLowerCase());
        const symbolExists = users.some(user => user.symbol.toLowerCase() === newUser.symbol.toLowerCase());
        const sellingPointExists = users.some(user => user.sellingPoint && newUser.sellingPoint && user.sellingPoint.toLowerCase() === newUser.sellingPoint.toLowerCase() && newUser.role !== 'admin' && newUser.role !== 'magazyn');

        if (emailExists) {
            alert('Użytkownik z tym adresem email już istnieje.');
            return;
        }

        if (symbolExists) {
            alert('Użytkownik z tym symbolem już istnieje.');
            return;
        }

        if (sellingPointExists) {
            alert('Użytkownik z tym punktem sprzedaży już istnieje.');
            return;
        }

        // Check if password length is at least 5 characters
        if (newUser.password.length < 5) {
            alert('Hasło musi mieć co najmniej 5 znaków.');
            return;
        }

        // Check if passwords match
        if (newUser.password !== confirmPassword) {
            alert('Hasła nie są takie same.');
            return;
        }

        const payload = {
            ...newUser,
            userLoggedInId: localStorage.getItem('AdminEmail') // Add userLoggedInId to the payload
        };
        console.log("Payload wysyłany na backend:", payload);

        axios.post('/api/user/signup', payload, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
            }
        })
            .then(response => {
                toggleAddUserModal();
                fetchUsers(); // Refresh the user list
                // Clear all inputs
                setNewUser({ email: '', password: '', symbol: '', role: 'user', sellingPoint: '', location: '' });
                setConfirmPassword('');
            })
            .catch(error => {
                console.error('Wystąpił błąd podczas dodawania użytkownika!', error);
            });
    };

    const handleEditUser = (userId) => {
        axios.get(`/api/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
            }
        })
            .then(response => {
                const user = response.data.user;
                setEditUser({
                    _id: user._id,
                    email: user.email,
                    symbol: user.symbol,
                    role: user.role,
                    sellingPoint: user.sellingPoint, // Ensure sellingPoint is set
                    location: user.location // Ensure location is set
                });
                setEditPassword(''); // Clear password fields
                setEditConfirmPassword(''); // Clear confirm password fields
                setInitialRole(user.role); // Store the initial role
                toggleModal();
            })
            .catch(error => {
                console.error('There was an error fetching the user!', error);
            });
    };

    const handleUpdateUser = () => {
        // Ensure sellingPoint and location are empty strings for administrators and magazyn
        if (editUser.role === 'admin' || editUser.role === 'magazyn') {
            editUser.sellingPoint = '';
            editUser.location = '';
        }

        // Ensure sellingPoint and location are not empty for users
        if (editUser.role === 'user' && editUser.sellingPoint === '') {
            alert('Użytkownik musi mieć punkt sprzedaży.');
            return;
        }

        if (editUser.role === 'user' && editUser.location === '') {
            alert('Użytkownik musi mieć lokalizację.');
            return;
        }

        // Check if email or symbol already exists (case-insensitive)
        const emailExists = users.some(user => user.email.toLowerCase() === editUser.email.toLowerCase() && user._id !== editUser._id);
        const symbolExists = users.some(user => user.symbol.toLowerCase() === editUser.symbol.toLowerCase() && user._id !== editUser._id);
        const sellingPointExists = users.some(user => user.sellingPoint && editUser.sellingPoint && user.sellingPoint.toLowerCase() === editUser.sellingPoint.toLowerCase() && user._id !== editUser._id && editUser.role !== 'admin' && editUser.role !== 'magazyn');

        if (emailExists) {
            alert('Użytkownik z tym adresem email już istnieje.');
            return;
        }

        if (symbolExists) {
            alert('Użytkownik z tym symbolem już istnieje.');
            return;
        }

        if (sellingPointExists && editUser.role !== 'admin' && editUser.role !== 'magazyn') {
            alert('Użytkownik z tym punktem sprzedaży już istnieje.');
            return;
        }

        // Check if passwords match
        if (editPassword !== editConfirmPassword) {
            alert('Hasła nie są takie same.');
            return;
        }

        // Check if password length is at least 5 characters
        if (editPassword && editPassword.length < 5) {
            alert('Hasło musi mieć co najmniej 5 znaków.');
            return;
        }

        const updatedUser = { ...editUser };
        if (editPassword) {
            updatedUser.password = editPassword;
        }

        // Check if changing from admin to user and if this is the last admin
        if (initialRole === 'admin' && updatedUser.role !== 'admin') {
            axios.get('/api/user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
                }
            })
                .then(response => {
                    const adminUsers = response.data.users.filter(user => user.role === 'admin');
                    if (adminUsers.length <= 1) {
                        alert('Nie można zmienić ostatniego administratora na użytkownika.');
                        return;
                    } else {
                        updateUserInDatabase(updatedUser);
                    }
                })
                .catch(error => {
                    console.error('There was an error fetching the users!', error);
                });
        } else {
            updateUserInDatabase(updatedUser);
        }
    };

    const updateUserInDatabase = (updatedUser) => {
        axios.put(`/api/user/${updatedUser._id}`, updatedUser, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
            }
        })
            .then(response => {
                toggleModal();
                fetchUsers(); // Refresh the user list
                setOldUser(response.data.oldUser);
                setUpdatedUser(response.data.updatedUser);

                console.log('Old User:', response.data.oldUser);
                console.log('Updated User:', response.data.updatedUser);
            })
            .catch(error => {
                console.error('There was an error updating the user!', error);
            });
    };

    const handleDeleteUser = (userId) => {
        const userToDelete = users.find(user => user._id === userId);
        if (userToDelete.role === 'admin') {
            axios.get('/api/user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
                }
            })
                .then(response => {
                    const adminUsers = response.data.users.filter(user => user.role === 'admin');
                    if (adminUsers.length <= 1) {
                        alert('Nie można usunąć ostatniego administratora.');
                        return;
                    } else {
                        setUserIdToDelete(userId);
                        toggleDeleteConfirmModal();
                    }
                })
                .catch(error => {
                    console.error('There was an error fetching the users!', error);
                });
        } else {
            setUserIdToDelete(userId);
            toggleDeleteConfirmModal();
        }
    };

    const confirmDeleteUser = () => {
        axios.delete(`/api/user/${userIdToDelete}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdminEmail')}`
            }
        })
            .then(response => {
                toggleDeleteConfirmModal();
                fetchUsers(); // Refresh the user list
            })
            .catch(error => {
                console.error('There was an error deleting the user!', error);
            });
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
        <div>
            <Button color="primary" onClick={toggleAddUserModal} className={`${styles.addButton} btn-sm`}>Dodaj użytkownika</Button>

            <div className={styles.tableContainer}>
                <Table bordered className={`${styles.table} ${styles.responsiveTable}`}>
                    <thead>
                        <tr>
                            <th className={styles.tableHeader}>LP</th>
                            <th className={styles.tableHeader}>ID</th>
                            <th className={styles.tableHeader}>Email</th>
                            <th className={styles.tableHeader}>Symbol</th>
                            <th className={styles.tableHeader}>Rola</th>
                            <th className={`${styles.tableHeader} ${styles.sellingPointColumn}`}>Punkt sprzedaży</th>
                            <th className={`${styles.tableHeader} ${styles.sellingPointColumn}`}>Lokalizacja</th>
                            <th className={styles.tableHeader}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr key={user._id}>
                                <td className={styles.tableCell} data-label="LP">{index + 1}</td>
                                <td className={styles.tableCell} data-label="ID">{user._id}</td>
                                <td className={styles.tableCell} data-label="Email">{user.email}</td>
                                <td className={styles.tableCell} data-label="Symbol">{user.symbol}</td>
                                <td className={styles.tableCell} data-label="Rola">{user.role === 'admin' ? 'Administrator' : user.role === 'magazyn' ? 'Magazyn' : 'Użytkownik'}</td>
                                <td className={`${styles.tableCell} ${styles.sellingPointColumn}`} data-label="Punkt sprzedaży">
                                    {user.sellingPoint || '\u00A0'}
                                </td>
                                <td className={`${styles.tableCell} ${styles.sellingPointColumn}`} data-label="Lokalizacja">
                                    {user.location || '\u00A0'}
                                </td>
                                <td className={`${styles.tableCell} ${styles.buttonGroup}`} data-label="Akcje">
                                    <Button color="warning" onClick={() => handleEditUser(user._id)} className="btn-sm">Edytuj</Button>
                                    <Button color="danger" onClick={() => handleDeleteUser(user._id)} className="btn-sm">Usuń</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <Modal isOpen={isAddUserModalOpen} toggle={toggleAddUserModal} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggleAddUserModal}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    Dodaj użytkownika
                    <button className={styles.customCloseButton} onClick={toggleAddUserModal}></button>
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup className={styles.formGroup}>
                        <Label for="email" className={styles.emailLabel}>Email:</Label>
                        <Input
                            type="email"
                            id="email"
                            value={newUser.email}
                            onChange={handleInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="password" className={styles.emailLabel}>Hasło:</Label>
                        <Input
                            type="password"
                            id="password"
                            value={newUser.password}
                            onChange={handleInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="confirmPassword" className={styles.emailLabel}>Potwierdź hasło:</Label>
                        <Input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="symbol" className={styles.emailLabel}>Symbol:</Label>
                        <Input
                            type="text"
                            id="symbol"
                            value={newUser.symbol}
                            onChange={handleInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="role" className={styles.emailLabel}>Rola:</Label>
                        <Input
                            type="select"
                            id="role"
                            value={newUser.role}
                            onChange={handleRoleChange}
                            className={styles.inputField}
                        >
                            <option value="user">Użytkownik</option>
                            <option value="admin">Administrator</option>
                            <option value="magazyn">Magazyn</option>
                        </Input>
                    </FormGroup>
                    {newUser.role === 'user' && (
                        <FormGroup className={styles.formGroup}>
                            <Label for="sellingPoint" className={styles.emailLabel}>Punkt sprzedaży:</Label>
                            <Input
                                type="text"
                                id="sellingPoint"
                                value={newUser.sellingPoint}
                                onChange={handleInputChange}
                                className={styles.inputField}
                            />
                        </FormGroup>
                    )}
                    {newUser.role === 'user' && (
                        <FormGroup className={styles.formGroup}>
                            <Label for="location" className={styles.emailLabel}>Lokalizacja:</Label>
                            <Input
                                type="select"
                                id="location"
                                value={newUser.location}
                                onChange={handleInputChange}
                                className={styles.inputField}
                            >
                                {localizations.map(localization => (
                                    <option key={localization._id} value={localization.Miejsc_1_Opis_1}>
                                        {localization.Miejsc_1_Opis_1}
                                    </option>
                                ))}
                            </Input>
                        </FormGroup>
                    )}
                    <Button color="primary" onClick={handleAddUser} className="btn-sm">Dodaj użytkownika</Button>
                </ModalBody>
            </Modal>

            <Modal isOpen={isModalOpen} toggle={toggleModal} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggleModal}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    Edytuj użytkownika
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    {/* Display oldUser and updatedUser data */}
                    {oldUser && updatedUser && (
                        <div>
                            <p><b>Dane przed aktualizacją:</b></p>
                            <pre>{JSON.stringify(oldUser, null, 2)}</pre>
                            <p><b>Dane po aktualizacji:</b></p>
                            <pre>{JSON.stringify(updatedUser, null, 2)}</pre>
                            {/* Display userLoggedInId */}
                            <p><b>User Logged In ID:</b></p>
                            <pre>{localStorage.getItem('AdminEmail')}</pre>
                        </div>
                    )}
                    <FormGroup className={styles.formGroup}>
                        <Label for="email" className={styles.emailLabel}>Email:</Label>
                        <Input
                            type="email"
                            id="email"
                            value={editUser.email}
                            onChange={handleEditInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="password" className={styles.emailLabel}>Hasło:</Label>
                        <Input
                            type="password"
                            id="password"
                            value={editPassword}
                            onChange={handleEditPasswordChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="confirmPassword" className={styles.emailLabel}>Potwierdź hasło:</Label>
                        <Input
                            type="password"
                            id="confirmPassword"
                            value={editConfirmPassword}
                            onChange={handleEditConfirmPasswordChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="symbol" className={styles.emailLabel}>Symbol:</Label>
                        <Input
                            type="text"
                            id="symbol"
                            value={editUser.symbol}
                            onChange={handleEditInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="role" className={styles.emailLabel}>Rola:</Label>
                        <Input
                            type="select"
                            id="role"
                            value={editUser.role}
                            onChange={handleEditRoleChange}
                            className={styles.inputField}
                        >
                            <option value="user">Użytkownik</option>
                            <option value="admin">Administrator</option>
                            <option value="magazyn">Magazyn</option>
                        </Input>
                    </FormGroup>
                    {editUser.role === 'user' && (
                        <FormGroup className={styles.formGroup}>
                            <Label for="sellingPoint" className={styles.emailLabel}>Punkt sprzedaży:</Label>
                            <Input
                                type="text"
                                id="sellingPoint"
                                value={editUser.sellingPoint}
                                onChange={handleEditInputChange}
                                className={styles.inputField}
                            />
                        </FormGroup>
                    )}
                    {editUser.role === 'user' && (
                        <FormGroup className={styles.formGroup}>
                            <Label for="location" className={styles.emailLabel}>Lokalizacja:</Label>
                            <Input
                                type="select"
                                id="location"
                                value={editUser.location}
                                onChange={handleEditInputChange}
                                className={styles.inputField}
                            >
                                {localizations.map(localization => (
                                    <option key={localization._id} value={localization.Miejsc_1_Opis_1}>
                                        {localization.Miejsc_1_Opis_1}
                                    </option>
                                ))}
                            </Input>
                        </FormGroup>
                    )}
                    <Button color="primary" onClick={handleUpdateUser} className="btn-sm">Zaktualizuj użytkownika</Button>
                </ModalBody>
            </Modal>

            <Modal isOpen={isDeleteConfirmModalOpen} toggle={toggleDeleteConfirmModal} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggleDeleteConfirmModal}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    Potwierdź usunięcie
                    <button className={styles.customCloseButton} onClick={toggleDeleteConfirmModal}></button>
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    Czy na pewno chcesz usunąć tego użytkownika?
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="danger" onClick={confirmDeleteUser} className="btn-sm">Usuń</Button>
                    <Button color="secondary" onClick={toggleDeleteConfirmModal} className="btn-sm">Anuluj</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Users;