import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Eye,
  User,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const DOCUMENT_CATEGORIES = {
  cv: 'CV',
  identity: "Carte d'identit\u00e9",
  diploma: 'Dipl\u00f4me',
  certificate: 'Certificat',
  contract: 'Contrat',
  recommendation: 'Recommandation',
  other: 'Autre',
};

const Documents = () => {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [trainers, setTrainers] = useState([]);
  const [talents, setTalents] = useState([]);

  useEffect(() => {
    fetchDocuments();
    fetchTrainersAndTalents();
  }, []);

  const fetchTrainersAndTalents = async () => {
    try {
      const [trainersRes, talentsRes] = await Promise.all([
        supabase.from('trainers').select('id, first_name, last_name').order('last_name'),
        supabase.from('talents').select('id, first_name, last_name').order('last_name')
      ]);
      setTrainers(trainersRes.data || []);
      setTalents(talentsRes.data || []);
    } catch (error) {
      console.error('Error fetching trainers/talents:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `general/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found')) {
          toast.error('Bucket "documents" introuvable. Créez-le dans Supabase Dashboard → Storage → New Bucket');
          return;
        }
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          entity_type: 'general',
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          document_category: 'other'
        }]);

      if (dbError) throw dbError;

      toast.success('Document téléchargé avec succès');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) {
        console.error('Download error:', error);
        toast.error('Le bucket de stockage n\'existe pas. Créez-le dans Supabase Dashboard → Storage');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handlePreview = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Preview error:', error);
        toast.error('Le bucket de stockage n\'existe pas. Veuillez le créer dans Supabase Dashboard → Storage → New Bucket → "documents"');
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast.success('Document supprimé');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return FileImage;
    if (type?.includes('spreadsheet') || type?.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityLabel = (type) => {
    switch (type) {
      case 'trainer': return 'Formateur';
      case 'talent': return 'Talent';
      case 'client': return 'Client';
      default: return 'Général';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.entity_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || doc.document_category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="documents-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Documents
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos documents et fichiers
            </p>
          </div>

          <label htmlFor="upload-file">
            <Button asChild className="cursor-pointer" disabled={uploading} data-testid="upload-document-btn">
              <span>
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Téléchargement...' : 'Télécharger'}
              </span>
            </Button>
            <input
              id="upload-file"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              data-testid="document-file-input"
            />
          </label>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="document-search-input"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="document-type-filter">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="trainer">Formateurs</SelectItem>
                  <SelectItem value="talent">Talents</SelectItem>
                  <SelectItem value="client">Clients</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[160px]" data-testid="document-category-filter">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun document trouvé
                </p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Téléchargez votre premier document
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow" data-testid={`document-card-${doc.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {doc.file_name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {formatFileSize(doc.file_size)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getEntityLabel(doc.entity_type)}
                      </Badge>
                      {doc.document_category && doc.document_category !== 'other' && (
                        <Badge variant="outline" className="text-xs">
                          {DOCUMENT_CATEGORIES[doc.document_category] || doc.document_category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreview(doc)}
                        className="flex-1"
                        data-testid={`preview-${doc.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="flex-1"
                        data-testid={`download-${doc.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                      {isAdmin() && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`delete-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Documents;
