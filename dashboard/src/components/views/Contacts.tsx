import React, { useState, useEffect } from 'react';
import { CopyIcon } from '../icons';
import { truncateAddress } from '../../lib/stellar';
import { 
  Contact, 
  getContacts, 
  saveContact, 
  deleteContact 
} from '../../services/contactsService';

interface ContactsProps {
  onCopy: (text: string) => void;
}

export const Contacts: React.FC<ContactsProps> = ({ onCopy }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    setContacts(getContacts());
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    setError('');

    if (!newName.trim()) {
      setError('Name is required');
      return;
    }

    if (!newAddress.trim()) {
      setError('Address is required');
      return;
    }

    if (!newAddress.startsWith('G') || newAddress.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }

    // Check for duplicate address (excluding current if editing)
    const existing = contacts.find(c => 
      c.address === newAddress && c.id !== editingContact?.id
    );
    if (existing) {
      setError('This address is already in your contacts');
      return;
    }

    const contact: Contact = {
      id: editingContact?.id || Date.now().toString(),
      name: newName.trim(),
      address: newAddress.trim(),
      notes: newNotes.trim() || undefined,
      createdAt: editingContact?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    saveContact(contact);
    loadContacts();
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    if (window.confirm(`Delete "${contact.name}" from contacts?`)) {
      deleteContact(id);
      loadContacts();
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setNewName(contact.name);
    setNewAddress(contact.address);
    setNewNotes(contact.notes || '');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    setNewName('');
    setNewAddress('');
    setNewNotes('');
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Book</h1>
          <p className="text-gray-400 mt-1">Save frequently used addresses for quick access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Contacts List */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-2">
              {searchQuery ? 'No contacts match your search' : 'No contacts yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Add your first contact →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 hover:bg-gray-800/30 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-lg">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{contact.name}</p>
                      <p className="text-sm text-gray-400 font-mono">{truncateAddress(contact.address)}</p>
                      {contact.notes && (
                        <p className="text-sm text-gray-500 mt-1">{contact.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onCopy(contact.address)}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                      title="Copy address"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                      title="Edit contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-red-500/20 hover:text-red-400 transition"
                      title="Delete contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500">
        {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Alice, Treasury, Exchange"
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stellar Address *</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="G..."
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  disabled={!!editingContact}
                />
                {editingContact && (
                  <p className="text-xs text-gray-500 mt-1">Address cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add any notes about this contact..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition font-medium"
              >
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
