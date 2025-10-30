// Definicja typu Klienta. Możesz ją przenieść do globalnego pliku `types.ts`
export interface Client {
    id: number; // Użyjemy timestamp jako unikalnego ID
    name: string;
    nip: string;
    address: string;
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

// Zapisuje klienta (dodaje nowego lub aktualizuje istniejącego)
export function saveClient(client: Omit<Client, 'id'> & { id?: number }): Client {
    const clients = getClients();

    if (client.id) {
        // Aktualizacja
        const index = clients.findIndex(c => c.id === client.id);
        if (index > -1) {
            clients[index] = { ...clients[index], ...client } as Client;
        }
    } else {
        // Dodanie nowego
        const newClient: Client = {
            ...client,
            id: Date.now(), // Proste unikalne ID
        };
        clients.push(newClient);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    return client as Client;
}

// Usuwa klienta
export function deleteClient(id: number): void {
    let clients = getClients();
    clients = clients.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}