import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import PrimaryButton from '../buttons/PrimaryButton';
import './ClientModal.css';
import type { Client } from '../../services/clientService';
import { sanitizeNip } from '../../helpers/nip';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Omit<Client, 'id'> & { id?: number }) => void;
    clientToEdit: Client | null;
}

const emptyClientForm = { name: '', nip: '', address: '' };

export default function ClientModal({ isOpen, onClose, onSave, clientToEdit }: Props) {
    const [formState, setFormState] = useState(emptyClientForm);

    useEffect(() => {
        if (clientToEdit) {
            setFormState({ name: clientToEdit.name, nip: clientToEdit.nip, address: clientToEdit.address });
        } else {
            setFormState(emptyClientForm);
        }
    }, [clientToEdit, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        onSave({
            ...formState,
            id: clientToEdit?.id,
            nip: sanitizeNip(formState.nip),
        });
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{clientToEdit ? 'Edytuj klienta' : 'Dodaj nowego klienta'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </header>
                <form onSubmit={handleSave}>
                    <div className="modal-body">
                        <label>
                            Nazwa firmy
                            <input type="text" name="name" value={formState.name} onChange={handleInputChange} required />
                        </label>
                        <label>
                            NIP
                            <input type="text" name="nip" value={formState.nip} onChange={handleInputChange} required maxLength={10} />
                        </label>
                        <label>
                            Adres
                            <input type="text" name="address" value={formState.address} onChange={handleInputChange} required />
                        </label>
                    </div>
                    <footer className="modal-footer">
                        <button type="button" className="btn-light" onClick={onClose}>Anuluj</button>
                        <PrimaryButton type="submit" icon="💾">Zapisz</PrimaryButton>
                    </footer>
                </form>
            </div>
        </div>
    );
}