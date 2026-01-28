// src/views/clients/ClientsView.tsx
import { useState, useEffect } from 'react';
import './ClientsView.css';
import '../dashboard/Dashboard.css';
import SideNav from '../../components/layout/SideNav';
import TopBar from '../../components/layout/TopBar';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import BankAccountInput from '../../components/form/BankAccountInput';
import { getClients, saveClient, deleteClient, type Client } from '../../services/clientService';
import { isValidNip, sanitizeNip } from '../../helpers/nip';

interface ClientFormData {
    name: string;
    nip: string;
    address: string;
    bankAccount: string;
    email: string;
    phone: string;
}

const emptyForm: ClientFormData = {
    name: '',
    nip: '',
    address: '',
    bankAccount: '',
    email: '',
    phone: '',
};

export default function ClientsView() {
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState<ClientFormData>(emptyForm);
    const [errors, setErrors] = useState<string[]>([]);
    const [info, setInfo] = useState<string | null>(null);

    useEffect(() => {
        loadClients();
    }, []);

    function loadClients() {
        const data = getClients();
        setClients(data);
    }

    const filteredClients = clients.filter(client => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            client.name.toLowerCase().includes(term) ||
            client.nip.includes(searchTerm) ||
            (client.address?.toLowerCase().includes(term) ?? false) ||
            (client.email?.toLowerCase().includes(term) ?? false)
        );
    });

    function openAddModal() {
        setEditingClient(null);
        setFormData(emptyForm);
        setErrors([]);
        setIsModalOpen(true);
    }

    function openEditModal(client: Client) {
        setEditingClient(client);
        setFormData({
            name: client.name,
            nip: client.nip,
            address: client.address || '',
            bankAccount: client.bankAccount || '',
            email: client.email || '',
            phone: client.phone || '',
        });
        setErrors([]);
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData(emptyForm);
        setErrors([]);
    }

    function validateForm(): string[] {
        const errs: string[] = [];

        if (!formData.name.trim()) {
            errs.push('Nazwa firmy jest wymagana.');
        }

        if (!formData.nip.trim()) {
            errs.push('NIP jest wymagany.');
        } else if (!isValidNip(sanitizeNip(formData.nip))) {
            errs.push('NIP jest nieprawidłowy (wymagane 10 cyfr + poprawna suma kontrolna).');
        }

        if (!formData.address.trim()) {
            errs.push('Adres jest wymagany.');
        }

        if (formData.bankAccount) {
            const digits = formData.bankAccount.replace(/[^0-9]/g, '');
            if (digits.length > 0 && digits.length !== 26) {
                errs.push('Numer konta bankowego musi mieć 26 cyfr.');
            }
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errs.push('Nieprawidłowy format adresu email.');
        }

        return errs;
    }

    function handleSave() {
        const validationErrors = validateForm();
        setErrors(validationErrors);

        if (validationErrors.length > 0) {
            return;
        }

        const clientData = {
            name: formData.name.trim(),
            nip: sanitizeNip(formData.nip),
            address: formData.address.trim(),
            bankAccount: formData.bankAccount || undefined,
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
        };

        if (editingClient) {
            saveClient({ ...clientData, id: editingClient.id });
            setInfo('Kontrahent został zaktualizowany.');
        } else {
            saveClient(clientData);
            setInfo('Kontrahent został dodany.');
        }

        loadClients();
        closeModal();
        setTimeout(() => setInfo(null), 2000);
    }

    function handleDelete(client: Client) {
        if (window.confirm(`Czy na pewno chcesz usunąć kontrahenta "${client.name}"?`)) {
            deleteClient(client.id);
            loadClients();
            setInfo('Kontrahent został usunięty.');
            setTimeout(() => setInfo(null), 2000);
        }
    }

    function updateField(field: keyof ClientFormData, value: string) {
        if (field === 'nip') {
            setFormData(prev => ({ ...prev, nip: sanitizeNip(value) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <TopBar />
                <div className="dash-content">
                    <header className="dash-header">
                        <h1>Kontrahenci</h1>
                        <p className="subtitle">Zarządzaj listą kontrahentów (nabywców)</p>
                    </header>

                    <section className="ops-section">
                        <div className="ops-header">
                            <h2>Lista kontrahentów</h2>
                            <div className="ops-actions">
                                <input
                                    type="text"
                                    placeholder="Szukaj po nazwie, NIP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                <PrimaryButton onClick={openAddModal} icon="➕">
                                    Dodaj kontrahenta
                                </PrimaryButton>
                            </div>
                        </div>

                        {info && (
                            <div className="info-banner">{info}</div>
                        )}

                        {clients.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h3>Brak kontrahentów</h3>
                                <p>Dodaj pierwszego kontrahenta, aby móc go szybko wybierać podczas wystawiania faktur.</p>
                                <PrimaryButton onClick={openAddModal} icon="➕">
                                    Dodaj kontrahenta
                                </PrimaryButton>
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🔍</div>
                                <h3>Brak wyników</h3>
                                <p>Nie znaleziono kontrahentów pasujących do "{searchTerm}"</p>
                            </div>
                        ) : (
                            <div className="clients-grid">
                                {filteredClients.map((client) => (
                                    <div key={client.id} className="client-card">
                                        <div className="client-info">
                                            <h3 className="client-name">{client.name}</h3>
                                            <div className="client-nip">NIP: {client.nip}</div>
                                            {client.address && (
                                                <div className="client-address">{client.address}</div>
                                            )}
                                            {client.bankAccount && (
                                                <div className="client-bank">🏦 {client.bankAccount}</div>
                                            )}
                                            {client.email && (
                                                <div className="client-email">✉️ {client.email}</div>
                                            )}
                                            {client.phone && (
                                                <div className="client-phone">📞 {client.phone}</div>
                                            )}
                                        </div>
                                        <div className="client-actions">
                                            <button
                                                className="btn-light small"
                                                onClick={() => openEditModal(client)}
                                            >
                                                ✏️ Edytuj
                                            </button>
                                            <button
                                                className="btn-light small danger"
                                                onClick={() => handleDelete(client)}
                                            >
                                                🗑️ Usuń
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {isModalOpen && (
                        <div className="modal-overlay" onClick={closeModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2>{editingClient ? 'Edytuj kontrahenta' : 'Dodaj kontrahenta'}</h2>
                                    <button className="modal-close" onClick={closeModal}>✕</button>
                                </div>

                                {errors.length > 0 && (
                                    <div className="error-message">
                                        <strong>Popraw błędy:</strong>
                                        <ul>
                                            {errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="modal-body">
                                    <label className="field">
                                        <span className="label">Nazwa firmy *</span>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            placeholder="Nazwa kontrahenta"
                                            className="input"
                                        />
                                    </label>

                                    <label className="field">
                                        <span className="label">NIP *</span>
                                        <input
                                            type="text"
                                            value={formData.nip}
                                            onChange={(e) => updateField('nip', e.target.value)}
                                            placeholder="0000000000"
                                            className="input"
                                            maxLength={10}
                                            inputMode="numeric"
                                        />
                                    </label>

                                    <label className="field">
                                        <span className="label">Adres *</span>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => updateField('address', e.target.value)}
                                            placeholder="Ulica, numer, kod pocztowy, miasto"
                                            className="input"
                                        />
                                    </label>

                                    <BankAccountInput
                                        label="Rachunek bankowy"
                                        value={formData.bankAccount}
                                        onChange={(v) => updateField('bankAccount', v)}
                                    />

                                    <label className="field">
                                        <span className="label">Email</span>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            placeholder="kontakt@firma.pl"
                                            className="input"
                                        />
                                    </label>

                                    <label className="field">
                                        <span className="label">Telefon</span>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            placeholder="+48 000 000 000"
                                            className="input"
                                        />
                                    </label>
                                </div>

                                <div className="modal-footer">
                                    <button className="btn-light" onClick={closeModal}>
                                        Anuluj
                                    </button>
                                    <PrimaryButton onClick={handleSave} icon="💾">
                                        {editingClient ? 'Zapisz zmiany' : 'Dodaj kontrahenta'}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}