// src/services/clientService.ts

export interface Client {
    id: number;
    name: string;
    nip: string;
    address: string;
    bankAccount?: string;
    email?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
}

const STORAGE_KEY = 'appClients';

// Pobiera wszystkich klientów
export function getClients(): Client[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading clients from localStorage", error);
        return [];
    }
}

// Zapisuje wszystkich klientów (nadpisuje całą listę)
export function saveClients(clients: Client[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

// Zapisuje klienta (dodaje nowego lub aktualizuje istniejącego)
export function saveClient(client: Omit<Client, 'id'> & { id?: number }): Client {
    const clients = getClients();
    const now = new Date().toISOString();

    if (client.id) {
        // Aktualizacja
        const index = clients.findIndex(c => c.id === client.id);
        if (index > -1) {
            clients[index] = {
                ...clients[index],
                ...client,
                updatedAt: now,
            } as Client;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
            return clients[index];
        }
    }

    // Dodanie nowego
    const newClient: Client = {
        ...client,
        id: Date.now(),
        createdAt: now,
        updatedAt: now,
    };
    clients.push(newClient);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    return newClient;
}

// Dodaje nowego klienta (alias dla saveClient bez id)
export function addClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
    return saveClient(client);
}

// Aktualizuje istniejącego klienta
export function updateClient(id: number, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Client | null {
    const clients = getClients();
    const index = clients.findIndex(c => c.id === id);

    if (index === -1) return null;

    clients[index] = {
        ...clients[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    return clients[index];
}

// Usuwa klienta
export function deleteClient(id: number): boolean {
    const clients = getClients();
    const filtered = clients.filter(c => c.id !== id);

    if (filtered.length === clients.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
}

// Znajduje klienta po NIP
export function findClientByNip(nip: string): Client | undefined {
    const clients = getClients();
    const cleanNip = nip.replace(/[^0-9]/g, '');
    return clients.find(c => c.nip.replace(/[^0-9]/g, '') === cleanNip);
}

// Znajduje klienta po ID
export function findClientById(id: number): Client | undefined {
    const clients = getClients();
    return clients.find(c => c.id === id);
}

// Wyszukuje klientów po frazie (nazwa, NIP, adres)
export function searchClients(query: string): Client[] {
    if (!query.trim()) return getClients();

    const clients = getClients();
    const term = query.toLowerCase();

    return clients.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.nip.includes(query) ||
        (client.address?.toLowerCase().includes(term) ?? false) ||
        (client.email?.toLowerCase().includes(term) ?? false)
    );
}