import { useState, useEffect } from 'react';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import './ClientsView.css';
import '../dashboard/Dashboard.css';
import { Client, getClients, saveClient, deleteClient } from '../../services/clientService';
import ClientModal from '../../components/modal/ClientModal';
import SideNav from '../../components/layout/SideNav';

export default function ClientsView() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        setClients(getClients());
    }, []);

    const refreshClients = () => {
        setClients(getClients());
    };

    const handleOpenAddModal = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSave = (clientData: Omit<Client, 'id'> & { id?: number }) => {
        saveClient(clientData);
        refreshClients();
        handleCloseModal();
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Czy na pewno chcesz usunąć tego klienta? Tej akcji nie można cofnąć.')) {
            deleteClient(id);
            refreshClients();
        }
    };

    return (
        <div className="dash-root">

            <SideNav />

            <main className="dash-main">
                <header className="dash-header">
                    <h1>Klienci</h1>
                    <p className="subtitle">Zarządzaj swoją bazą kontrahentów</p>
                </header>

                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Lista klientów</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={handleOpenAddModal} icon="➕">Dodaj klienta</PrimaryButton>
                        </div>
                    </div>

                    <div className="card">
                        <div className="table-wrap">
                            <table className="clients-table data-table">
                                <thead>
                                <tr>
                                    <th>Nazwa</th>
                                    <th>NIP</th>
                                    <th>Adres</th>
                                    <th style={{ width: '150px' }}>Akcje</th>
                                </tr>
                                </thead>
                                <tbody>
                                {clients.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>Brak klientów. Dodaj pierwszego!</td></tr>
                                ) : (
                                    clients.map(client => (
                                        <tr key={client.id}>
                                            <td>{client.name}</td>
                                            <td>{client.nip}</td>
                                            <td>{client.address}</td>
                                            <td className="actions-cell">
                                                <button className="btn-light small" onClick={() => handleOpenEditModal(client)}>Edytuj</button>
                                                <button className="btn-light small danger" onClick={() => handleDelete(client.id)}>Usuń</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>

            {/* Renderowanie modala */}
            <ClientModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                clientToEdit={editingClient}
            />
        </div>
    );
}