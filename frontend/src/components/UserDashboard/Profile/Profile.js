import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, Modal, ModalHeader, ModalBody, FormGroup, Label, Input, ModalFooter } from 'reactstrap';
import axios from 'axios';
import styles from './Profile.module.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUser, setEditUser] = useState({ email: '', symbol: '', role: '', sellingPoint: '' });
    const [editPassword, setEditPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        const userId = localStorage.getItem('UserId'); // Get userId from localStorage
        const baseUrl = process.env.REACT_APP_API_BASE_URL; // Get base URL from environment variable
        axios.get(`${baseUrl}/api/user/${userId}`)
            .then(response => {
                setUser(response.data.user); // Access the user data correctly
            })
            .catch(error => {
                console.error('There was an error fetching the user data!', error);
            });
    }, []);

    const toggleModal = () => setIsModalOpen(!isModalOpen);

    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                makeModalDraggable();
            }, 100);
        }
    }, [isModalOpen]);

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

    const handleEditUser = () => {
        setEditUser(user);
        setEditPassword('');
        setEditConfirmPassword('');
        toggleModal();
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setEditUser({ ...editUser, [id]: value });
    };

    const handlePasswordChange = (e) => {
        setEditPassword(e.target.value);
    };

    const handleConfirmPasswordChange = (e) => {
        setEditConfirmPassword(e.target.value);
    };

    const handleUpdateUser = () => {
        // Check if passwords match
        if (editPassword !== editConfirmPassword) {
            alert('Hasła nie są takie same.');
            return;
        }

        const updatedUser = { ...editUser };
        if (editPassword) {
            updatedUser.password = editPassword;
        }

        const userId = localStorage.getItem('UserId');
        const baseUrl = process.env.REACT_APP_API_BASE_URL;
        axios.put(`${baseUrl}/api/user/${userId}`, updatedUser)
            .then(response => {
                const updatedUserData = response.data.user || updatedUser; // Adjust based on actual response structure
                setUser(updatedUserData); // Update the user state with the updated user data
                toggleModal();
            })
            .catch(error => {
                console.error('There was an error updating the user!', error);
            });
    };

    if (!user) {
        return <div>Ładowanie...</div>;
    }

    return (
        <div className={styles.profile}>
            <h3 className={`${styles.title}`}>Profil Użytkownika</h3>
            <div className={styles.tableContainer}>
                <Table bordered className={`${styles.table} ${styles.responsiveTable}`}>
                    <thead>
                        <tr className={styles.tableHeader}>
                            <th>Id</th>
                            <th>Punkt Sprzedaży</th>
                            <th>Email</th>
                            <th>Symbol</th>
                            <th>Rola</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Id">{user._id}</td>
                            <td className={styles.tableCell} data-label="Punkt Sprzedaży" style={{ whiteSpace: 'nowrap' }}>{user.sellingPoint}</td>
                            <td className={styles.tableCell} data-label="Email">{user.email}</td>
                            <td className={styles.tableCell} data-label="Symbol">{user.symbol}</td>
                            <td className={styles.tableCell} data-label="Rola">{user.role === 'user' ? 'Użytkownik' : user.role}</td>
                            <td className={styles.buttonGroup} data-label="Akcje">
                                <Button color="warning" className="btn-sm" onClick={handleEditUser}>Edytuj</Button>
                            </td>
                        </tr>
                    </tbody>
                </Table>
            </div>

            <Modal isOpen={isModalOpen} toggle={toggleModal} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab' }
                    toggle={toggleModal}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    Edytuj użytkownika
                    <button className={styles.customCloseButton} onClick={toggleModal}></button>
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup className={styles.formGroup}>
                        <Label for="email" className={styles.emailLabel}>Email:</Label>
                        <Input
                            type="email"
                            id="email"
                            value={editUser.email}
                            onChange={handleInputChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="password" className={styles.emailLabel}>Hasło:</Label>
                        <Input
                            type="password"
                            id="password"
                            value={editPassword}
                            onChange={handlePasswordChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="confirmPassword" className={styles.emailLabel}>Potwierdź hasło:</Label>
                        <Input
                            type="password"
                            id="confirmPassword"
                            value={editConfirmPassword}
                            onChange={handleConfirmPasswordChange}
                            className={styles.inputField}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="symbol" className={styles.emailLabel}>Symbol:</Label>
                        <Input
                            type="text"
                            id="symbol"
                            value={editUser.symbol}
                            onChange={handleInputChange}
                            className={styles.inputField}
                            disabled
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="role" className={styles.emailLabel}>Rola:</Label>
                        <Input
                            type="select"
                            id="role"
                            value={editUser.role}
                            onChange={handleInputChange}
                            className={styles.inputField}
                            disabled
                        >
                            <option value="user">Użytkownik</option>
                            <option value="admin">Administrator</option>
                        </Input>
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="sellingPoint" className={styles.emailLabel}>Punkt sprzedaży:</Label>
                        <Input
                            type="text"
                            id="sellingPoint"
                            value={editUser.sellingPoint}
                            onChange={handleInputChange}
                            className={styles.inputField}
                            disabled
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="primary" onClick={handleUpdateUser} className="btn-sm">Zaktualizuj użytkownika</Button>
                    <Button color="secondary" onClick={toggleModal} className="btn-sm">Anuluj</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Profile;