/**
 * Client Selector Component
 * Dropdown for admins to switch between client contexts
 */

import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, Globe, X } from 'lucide-react';
import { Client } from '@/types';
import { clientService } from '@/services/clientService';
import { useClickOutside } from '@/hooks/useClickOutside';
import clsx from 'clsx';

interface ClientSelectorProps {
  isAdmin: boolean;
  userClientId?: string;
  onClientChange?: (clientId: string | null) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  isAdmin,
  userClientId,
  onClientChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Restore selected client from localStorage
    const savedClientId = clientService.getSelectedClientId();
    if (savedClientId && clients.length > 0) {
      const client = clients.find((c) => c.id === savedClientId);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.listClients({ status: 'active' });
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClient = (client: Client | null) => {
    setSelectedClient(client);
    clientService.setSelectedClient(client?.id || null);
    onClientChange?.(client?.id || null);
    setIsOpen(false);
    setSearchQuery('');

    // Reload the current page to apply the filter
    window.location.reload();
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectClient(null);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.client_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // Group clients by environment
  const groupedClients = filteredClients.reduce(
    (acc, client) => {
      const env = client.environment;
      if (!acc[env]) acc[env] = [];
      acc[env].push(client);
      return acc;
    },
    {} as Record<string, Client[]>
  );

  const envOrder = ['production', 'dr', 'uat', 'staging', 'development'];
  const sortedEnvs = Object.keys(groupedClients).sort(
    (a, b) => envOrder.indexOf(a) - envOrder.indexOf(b)
  );

  // Non-admin users don't see the selector
  if (!isAdmin) {
    return null;
  }

  const getEnvColor = (env: string) => {
    const colors: Record<string, string> = {
      production: 'text-green-600 bg-green-50',
      dr: 'text-orange-600 bg-orange-50',
      uat: 'text-blue-600 bg-blue-50',
      staging: 'text-gray-600 bg-gray-100',
      development: 'text-purple-600 bg-purple-50',
    };
    return colors[env] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
          selectedClient
            ? 'bg-primary-50 text-primary-700 border border-primary-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
        )}
      >
        <Building2 size={16} />
        <span className="max-w-[150px] truncate">
          {selectedClient
            ? clientService.getDisplayName(selectedClient)
            : 'All Clients'}
        </span>
        {selectedClient && (
          <button
            onClick={handleClearSelection}
            className="p-0.5 hover:bg-primary-200 rounded"
          >
            <X size={12} />
          </button>
        )}
        <ChevronDown
          size={14}
          className={clsx('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-dropdown border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
              autoFocus
            />
          </div>

          {/* All Clients Option */}
          <div className="p-1 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleSelectClient(null)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                !selectedClient
                  ? 'bg-primary-50 text-primary-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}
            >
              <Globe size={16} />
              <span className="flex-1 text-left font-medium">All Clients</span>
              {!selectedClient && <Check size={16} className="text-primary-600" />}
            </button>
          </div>

          {/* Client List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full mx-auto" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No clients found
              </div>
            ) : (
              sortedEnvs.map((env) => (
                <div key={env}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                    {env.replace('_', ' ')}
                  </div>
                  {groupedClients[env].map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                        selectedClient?.id === client.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <div className={clsx('w-2 h-2 rounded-full', getEnvColor(client.environment))} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">
                          {client.display_name || client.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate font-mono">
                          {client.client_code}
                        </p>
                      </div>
                      {client.location && (
                        <span className="text-xs text-gray-400">{client.location}</span>
                      )}
                      {selectedClient?.id === client.id && (
                        <Check size={16} className="text-primary-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs text-gray-400 text-center">
              {clients.length} client{clients.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSelector;
