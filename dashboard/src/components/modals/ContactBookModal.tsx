import React, { useState, useEffect } from 'react';
import { Contact, getContacts, saveContact, deleteContact } from '../../services/contactsService';

interface ContactBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (address: string) => void;
  selectMode?: boolean;
}

export const ContactBookModal: React.FC<ContactBookModalProps> = ({
  isOpen,
  onClose,
  onSelectContact,
  selectMode = false,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContacts(getContacts());
    }
  }, [isOpen]);

  const handleAddContact = () => {
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    if (!newAddress.trim() || !newAddress.startsWith('G') || newAddress.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }

    saveContact({
      id: Date.now().toString(),
      address: newAddress.trim(),
      name: newName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setContacts(getContacts());
    setNewName('');
    setNewAddress('');
    setShowAddForm(false);
    setError('');
  };

  const handleDelete = (address: string) => {
    if (confirm('Delete this contact?')) {
      deleteContact(address);
      setContacts(getContacts());
    }
  };

  const handleSelect = (address: string) => {
    if (selectMode && onSelectContact) {
      onSelectContact(address);
      onClose();
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {selectMode ? 'Select Contact' : 'Contact Book'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0a0b0d] border border-gray-700 rounded-lg px-4 py-2 mb-4 text-white"
        />

        {/* Add Contact Form */}
        {showAddForm ? (
          <div className="mb-4 p-4 bg-[#0a0b0d] rounded-lg border border-gray-800">
            <h3 className="font-semibold mb-3">Add New Contact</h3>
            {error && (
              <p className="text-red-400 text-sm mb-2">{error}</p>
            )}
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#12131a] border border-gray-700 rounded-lg px-3 py-2 mb-2 text-white"
            />
            <input
              type="text"
              placeholder="Stellar Address (G...)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-[#12131a] border border-gray-700 rounded-lg px-3 py-2 mb-3 text-white font-mono text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                className="flex-1 px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-4 px-4 py-3 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
          >
            <span>+</span> Add Contact
          </button>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredContacts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm ? 'No contacts found' : 'No contacts yet'}
            </p>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.address}
                className={`p-3 bg-[#0a0b0d] border border-gray-800 rounded-lg ${
                  selectMode ? 'cursor-pointer hover:border-purple-500' : ''
                }`}
                onClick={() => handleSelect(contact.address)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {contact.address.slice(0, 12)}...{contact.address.slice(-8)}
                    </p>
                  </div>
                  {!selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact.address);
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
