import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Server, Monitor, Database, HardDrive, Wifi, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Modal, Input, Select, Spinner, Textarea } from '@/components/ui';
import { assetService } from '@/services/assetService';
import { Asset } from '@/types';
import toast from 'react-hot-toast';

const AssetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await assetService.getAssetById(id);
        setAsset(data);
      } catch (error) {
        console.error('Failed to fetch asset:', error);
        toast.error('Failed to load asset details');
        navigate('/assets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id, navigate]);

  const handleEdit = () => {
    if (asset) {
      setEditingAsset({ ...asset });
      setIsEditModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!id || !editingAsset) return;

    try {
      setIsSaving(true);
      const updated = await assetService.updateAsset(id, editingAsset);
      setAsset(updated);
      setIsEditModalOpen(false);
      toast.success('Asset updated successfully');
    } catch (error) {
      console.error('Failed to update asset:', error);
      toast.error('Failed to update asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this asset?')) return;

    try {
      await assetService.deleteAsset(id);
      toast.success('Asset deleted successfully');
      navigate('/assets');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const getAssetIcon = (type?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      server: <Server size={32} className="text-primary-600" />,
      workstation: <Monitor size={32} className="text-primary-600" />,
      database: <Database size={32} className="text-primary-600" />,
      storage: <HardDrive size={32} className="text-primary-600" />,
      network: <Wifi size={32} className="text-primary-600" />,
    };
    return iconMap[type?.toLowerCase() || 'server'] || <Server size={32} className="text-primary-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Asset not found</p>
        <Link to="/assets" className="text-primary-600 mt-2 inline-block">Back to Assets</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-primary-600">{asset.assetNumber}</span>
              <StatusBadge status={asset.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{asset.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Edit size={16} />} onClick={handleEdit}>Edit</Button>
          <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>Overview</CardHeader>
            <CardBody>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                  {getAssetIcon(asset.type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{asset.name}</h3>
                  <p className="text-gray-500">{asset.manufacturer} {asset.model}</p>
                </div>
              </div>
              <p className="text-gray-700">{asset.description || 'No description available.'}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Hardware Specifications</CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                {asset.specifications?.cpu && (
                  <div><span className="text-gray-500">CPU:</span> <span className="font-medium">{asset.specifications.cpu}</span></div>
                )}
                {asset.specifications?.memory && (
                  <div><span className="text-gray-500">RAM:</span> <span className="font-medium">{asset.specifications.memory}</span></div>
                )}
                {asset.specifications?.storage && (
                  <div><span className="text-gray-500">Storage:</span> <span className="font-medium">{asset.specifications.storage}</span></div>
                )}
                {asset.specifications?.network && (
                  <div><span className="text-gray-500">Network:</span> <span className="font-medium">{asset.specifications.network}</span></div>
                )}
                {asset.serialNumber && (
                  <div><span className="text-gray-500">Serial Number:</span> <span className="font-medium font-mono">{asset.serialNumber}</span></div>
                )}
                {asset.operatingSystem && (
                  <div><span className="text-gray-500">OS:</span> <span className="font-medium">{asset.operatingSystem}</span></div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>Details</CardHeader>
            <CardBody className="space-y-3">
              <div><span className="text-xs text-gray-500">Type</span><p className="font-medium">{asset.type}</p></div>
              <div>
                <span className="text-xs text-gray-500">Criticality</span>
                <p><Badge variant={asset.criticality === 'critical' ? 'danger' : asset.criticality === 'high' ? 'warning' : 'default'}>{asset.criticality}</Badge></p>
              </div>
              {asset.ipAddress && (
                <div><span className="text-xs text-gray-500">IP Address</span><p className="font-mono">{asset.ipAddress}</p></div>
              )}
              {asset.location && (
                <div><span className="text-xs text-gray-500">Location</span><p className="font-medium">{asset.location}</p></div>
              )}
              {asset.assignedTo && (
                <div><span className="text-xs text-gray-500">Assigned To</span><p className="font-medium">{asset.assignedTo.displayName}</p></div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Asset" size="lg">
        {editingAsset && (
          <div className="space-y-4">
            <Input
              label="Asset Name"
              value={editingAsset.name || ''}
              onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                value={editingAsset.type || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, type: e.target.value })}
                options={[
                  { value: 'server', label: 'Server' },
                  { value: 'workstation', label: 'Workstation' },
                  { value: 'laptop', label: 'Laptop' },
                  { value: 'network', label: 'Network Device' },
                  { value: 'storage', label: 'Storage' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select
                label="Status"
                value={editingAsset.status || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value as Asset['status'] })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Manufacturer"
                value={editingAsset.manufacturer || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, manufacturer: e.target.value })}
              />
              <Input
                label="Model"
                value={editingAsset.model || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, model: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IP Address"
                value={editingAsset.ipAddress || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, ipAddress: e.target.value })}
              />
              <Input
                label="Location"
                value={editingAsset.location || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
              />
            </div>
            <Textarea
              label="Description"
              value={editingAsset.description || ''}
              onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssetDetailPage;
