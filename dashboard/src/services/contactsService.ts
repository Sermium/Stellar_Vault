export interface Contact {
  id: string;
  name: string;
  address: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'stellar_vault_contacts';

export const getContacts = (): Contact[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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

export const getContactName = (address: string): string | undefined => {
  return getContactByAddress(address)?.name;
};

export const formatAddress = (address: string): string => {
  const contact = getContactByAddress(address);
  if (contact) {
    return contact.name;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
