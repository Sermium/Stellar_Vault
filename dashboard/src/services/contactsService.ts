export interface Contact {
  id: string;
  address: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'stellar_vault_contacts';

export const getContacts = (): Contact[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveContact = (contact: Contact): void => {
  const contacts = getContacts();
  const existingIndex = contacts.findIndex(c => c.id === contact.id);
  
  if (existingIndex >= 0) {
    contacts[existingIndex] = contact;
  } else {
    contacts.push(contact);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
};

export const deleteContact = (id: string): void => {
  const contacts = getContacts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
};

export const getContactByAddress = (address: string): Contact | undefined => {
  return getContacts().find(c => c.address === address);
};

// Add this function
export const getContactName = (address: string): string | null => {
  const contact = getContacts().find(c => c.address === address);
  return contact?.name || null;
};
