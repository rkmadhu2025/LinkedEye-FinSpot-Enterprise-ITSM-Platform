import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardBody, Button, Input, Badge, Spinner } from '@/components/ui';
import { integrationService } from '@/services/integrationService';
import { Integration } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIsLoading(true);
        const data = await integrationService.getIntegrations();
        setIntegrations(data);
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
        toast.error('Failed to load integrations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const filteredIntegrations = integrations.filter((integration) =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusFromIntegration = (integration: Integration): string => {
    if (!integration.isActive) return 'inactive';
    return 'active';
  };

  const getLastSyncText = (integration: Integration): string => {
    if (!integration.lastSyncAt) return 'Never';
    try {
      return formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true });
    } catch {
      return 'Never';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} className="text-green-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
      case 'inactive': return <Clock size={16} className="text-gray-400" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500 mt-1">Connect external tools and services</p>
        </div>
        <Button leftIcon={<Plus size={16} />}>Add Integration</Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search integrations..."
                leftIcon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No integrations found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((integration) => {
                const status = getStatusFromIntegration(integration);
                const lastSync = getLastSyncText(integration);
                return (
                  <Link
                    key={integration.id}
                    to={`/integrations/${integration.id}`}
                    className="block p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">{integration.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{integration.name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{integration.type}</p>
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={status === 'active' ? 'success' : status === 'error' ? 'danger' : 'default'}>
                          {status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {status === 'active' ? `Synced ${lastSync}` : lastSync}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
            <Plus size={32} className="mx-auto text-gray-400 mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Add New Integration</h3>
            <p className="text-sm text-gray-500 mb-4">Connect more tools to enhance your ITSM workflows</p>
            <Button variant="outline">Browse Available Integrations</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
