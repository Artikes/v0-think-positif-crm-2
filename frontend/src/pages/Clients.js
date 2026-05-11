import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Euro,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  MessageSquare,
  Clock,
  TrendingDown,
  TrendingUp,
  Briefcase,
  Upload,
  FileText,
  Download,
  Link,
  ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import ExportImportButtons from '../components/ExportImportButtons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const CLIENT_STATUS = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  negotiation: { label: 'Négociation', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const DOCUMENT_CATEGORIES = [
  { value: 'contract', label: 'Contrat' },
  { value: 'proposal', label: 'Proposition commerciale' },
  { value: 'invoice', label: 'Facture' },
  { value: 'quote', label: 'Devis' },
  { value: 'brief', label: 'Brief / Cahier des charges' },
  { value: 'report', label: 'Rapport' },
  { value: 'other', label: 'Autre' },
];

const Clients = () => {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    status: 'prospect',
    revenue: 0,
    cost: 0,
    project_name: '',
    notes: ''
  });
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [documents, setDocuments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState('other');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientActivities = async (clientId) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_type', 'client')
        .eq('entity_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchClientDocuments = async (clientId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'client')
        .eq('entity_id', clientId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const uploadFilesForEntity = async (entityId, entityType) => {
    // Upload files
    for (const pf of pendingFiles) {
      const file = pf.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${entityType}/${entityId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      await supabase.from('documents').insert([{
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        document_category: pf.category
      }]);
    }

    // Save links as documents
    for (const link of pendingLinks) {
      await supabase.from('documents').insert([{
        entity_type: entityType,
        entity_id: entityId,
        file_name: link.name,
        file_path: link.url,
        file_type: 'link',
        file_size: 0,
        document_category: link.category
      }]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(f => ({ file: f, category: 'other' }));
    setPendingFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index, category) => {
    setPendingFiles(prev => prev.map((pf, i) => i === index ? { ...pf, category } : pf));
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !newLinkName.trim()) return;
    setPendingLinks(prev => [...prev, { url: newLinkUrl, name: newLinkName, category: newLinkCategory }]);
    setNewLinkUrl('');
    setNewLinkName('');
    setNewLinkCategory('other');
  };

  const removePendingLink = (index) => {
    setPendingLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadDocument = async (doc) => {
    if (doc.file_type === 'link') {
      window.open(doc.file_path, '_blank');
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Supprimer ce document?')) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
      toast.success('Document supprimé');
      if (selectedClient) fetchClientDocuments(selectedClient.id);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let clientId = selectedClient?.id;

      if (selectedClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedClient.id);

        if (error) throw error;
      } else {
        // Create new client
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;
        clientId = newClient.id;
      }

      // Upload pending files and links
      if (clientId && (pendingFiles.length > 0 || pendingLinks.length > 0)) {
        await uploadFilesForEntity(clientId, 'client');
      }

      toast.success(selectedClient ? 'Client mis à jour' : 'Client ajouté');
      setShowAddDialog(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Client supprimé');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedClient) return;

    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          entity_type: 'client',
          entity_id: selectedClient.id,
          description: newNote,
          activity_type: 'note'
        }]);

      if (error) throw error;
      setNewNote('');
      fetchClientActivities(selectedClient.id);
      toast.success('Note ajoutée');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
    }
  };

  const openEditDialog = (client) => {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name,
      contact_name: client.contact_name || '',
      email: client.email || '',
      phone: client.phone || '',
      status: client.status || 'prospect',
      revenue: parseFloat(client.revenue) || 0,
      cost: parseFloat(client.cost) || 0,
      project_name: client.project_name || '',
      notes: client.notes || ''
    });
    setShowAddDialog(true);
  };

  const openDetailDialog = async (client) => {
    setSelectedClient(client);
    await Promise.all([
      fetchClientActivities(client.id),
      fetchClientDocuments(client.id)
    ]);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setPendingFiles([]);
    setPendingLinks([]);
    setNewLinkUrl('');
    setNewLinkName('');
    setNewLinkCategory('other');
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      status: 'prospect',
      revenue: 0,
      cost: 0,
      project_name: '',
      notes: ''
    });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(value) || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="clients-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              CRM Clients
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos clients et leurs activités
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ExportImportButtons
              data={clients}
              tableName="clients"
              filename="clients"
              exportColumns={['company_name', 'contact_name', 'email', 'phone', 'status', 'revenue', 'cost', 'project_name', 'notes']}
              importColumns={['company_name', 'contact_name', 'email', 'phone', 'status', 'revenue', 'cost', 'project_name', 'notes']}
              onImportComplete={fetchClients}
            />
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              setShowAddDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-client-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau client
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? 'Modifier le client' : 'Nouveau client'}
                </DialogTitle>
                <DialogDescription>
                  {selectedClient ? 'Modifiez les informations du client' : 'Ajoutez un nouveau client à votre CRM'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                      data-testid="client-company-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact principal</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      data-testid="client-contact-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="client-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLIENT_STATUS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="client-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="client-phone-input"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="project_name">Nom du projet</Label>
                    <Input
                      id="project_name"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="Ex: Formation digitale Q1"
                      data-testid="client-project-input"
                    />
                  </div>
                  {isAdmin() && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="revenue">Chiffre d'affaires (€)</Label>
                        <Input
                          id="revenue"
                          type="number"
                          value={formData.revenue}
                          onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })}
                          data-testid="client-revenue-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost">Coût (€)</Label>
                        <Input
                          id="cost"
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                          data-testid="client-cost-input"
                        />
                      </div>
                    </>
                  )}
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      data-testid="client-notes-input"
                    />
                  </div>
                </div>

                {/* Documents Section */}
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-medium">Documents et Liens</Label>
                  
                  <Tabs defaultValue="file" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Fichier
                      </TabsTrigger>
                      <TabsTrigger value="link" className="flex items-center gap-2">
                        <Link className="h-4 w-4" /> Lien
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="file" className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          onChange={handleFileSelect}
                          multiple
                          className="flex-1"
                        />
                      </div>
                      {pendingFiles.length > 0 && (
                        <div className="space-y-2">
                          {pendingFiles.map((pf, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate flex-1">{pf.file.name}</span>
                              <Select value={pf.category} onValueChange={(v) => updateFileCategory(index, v)}>
                                <SelectTrigger className="w-[140px] h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DOCUMENT_CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePendingFile(index)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="link" className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nom du lien"
                          value={newLinkName}
                          onChange={(e) => setNewLinkName(e.target.value)}
                        />
                        <Select value={newLinkCategory} onValueChange={setNewLinkCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={handleAddLink} disabled={!newLinkUrl || !newLinkName}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {pendingLinks.length > 0 && (
                        <div className="space-y-2">
                          {pendingLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate flex-1">{link.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {DOCUMENT_CATEGORIES.find(c => c.value === link.category)?.label}
                              </Badge>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePendingLink(index)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={uploading} data-testid="client-submit-btn">
                    {uploading ? 'Enregistrement...' : (selectedClient ? 'Mettre à jour' : 'Ajouter')}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
  
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="client-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="client-status-filter">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(CLIENT_STATUS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun client trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card 
                key={client.id} 
                className="hover:shadow-lg transition-all cursor-pointer group"
                data-testid={`client-card-${client.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{client.company_name}</h3>
                      {client.contact_name && (
                        <p className="text-sm text-muted-foreground truncate">{client.contact_name}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailDialog(client)}>
                          <Eye className="h-4 w-4 mr-2" /> Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(client)}>
                          <Edit className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {client.project_name && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate font-medium">{client.project_name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Badge className={CLIENT_STATUS[client.status]?.color || ''}>
                      {CLIENT_STATUS[client.status]?.label || client.status}
                    </Badge>
                    {isAdmin() && (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-green-700 dark:text-green-400 font-medium">{formatCurrency(client.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(client.cost)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 bg-muted/50 p-2 rounded">
                      {client.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedClient?.company_name}
              </DialogTitle>
              <DialogDescription>
                Détails et historique du client
              </DialogDescription>
            </DialogHeader>

            {selectedClient && (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px] pr-4">
                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{selectedClient.contact_name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge className={CLIENT_STATUS[selectedClient.status]?.color}>
                        {CLIENT_STATUS[selectedClient.status]?.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </p>
                      <p className="text-sm">{selectedClient.email || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Téléphone
                      </p>
                      <p className="text-sm">{selectedClient.phone || '-'}</p>
                    </div>
                    {selectedClient.project_name && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> Projet
                        </p>
                        <p className="text-sm font-medium">{selectedClient.project_name}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Créé le
                      </p>
                      <p className="text-sm">{formatDate(selectedClient.created_at)}</p>
                    </div>
                  </div>
                  {isAdmin() && (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                        <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                          <TrendingUp className="h-3 w-3" /> CA
                        </p>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">{formatCurrency(selectedClient.revenue)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1 mb-1">
                          <TrendingDown className="h-3 w-3" /> Coût
                        </p>
                        <p className="text-sm font-bold text-red-800 dark:text-red-300">{formatCurrency(selectedClient.cost)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Marge</p>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{formatCurrency((parseFloat(selectedClient.revenue) || 0) - (parseFloat(selectedClient.cost) || 0))}</p>
                      </div>
                    </div>
                  )}

                  {selectedClient.notes && (
                    <div className="mb-6">
                      <p className="text-xs text-muted-foreground mb-2">Notes</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedClient.notes}</p>
                    </div>
                  )}

                  {/* Documents Section */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents ({documents.length})
                    </h4>
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => {
                          const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === doc.document_category)?.label;
                          const isLink = doc.file_type === 'link';
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                {isLink ? (
                                  <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className="text-sm truncate block">{doc.file_name}</span>
                                  {catLabel && (
                                    <Badge variant="outline" className="text-xs mt-0.5">{catLabel}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadDocument(doc)}
                                >
                                  {isLink ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Activity Timeline */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Historique des activités
                    </h4>

                    {/* Add note */}
                    <div className="flex gap-2 mb-4">
                      <Input
                        placeholder="Ajouter une note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        data-testid="add-note-input"
                      />
                      <Button onClick={handleAddNote} size="icon" data-testid="add-note-btn">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune activité enregistrée
                        </p>
                      ) : (
                        activities.map((activity) => (
                          <div 
                            key={activity.id}
                            className="flex gap-3 p-3 rounded-lg border"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Clients;
