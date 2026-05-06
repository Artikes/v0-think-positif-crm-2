import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import {
  Search,
  Ticket,
  Bug,
  Lightbulb,
  RefreshCw,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  MessageSquare,
  Send,
  User,
  Filter
} from 'lucide-react';

const TICKET_TYPES = {
  bug: { label: 'Bug', icon: Bug, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  suggestion: { label: 'Suggestion', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  change_request: { label: 'Demande de modification', icon: RefreshCw, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  other: { label: 'Autre', icon: MoreVertical, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' }
};

const TICKET_STATUS = {
  open: { label: 'Ouvert', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En cours', icon: AlertCircle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  resolved: { label: 'Résolu', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed: { label: 'Fermé', icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' }
};

const TICKET_PRIORITY = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' }
};

const TicketAdmin = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          user:profiles!tickets_user_id_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessTicket = async () => {
    if (!selectedTicket) return;
    setProcessing(true);
    try {
      const updates = {
        status: newStatus,
        admin_response: adminResponse || selectedTicket.admin_response,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = profile?.id;
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', selectedTicket.id);

      if (error) throw error;
      toast.success('Ticket mis à jour');
      setShowDetailDialog(false);
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessing(false);
    }
  };

  const openDetailDialog = (ticket) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.admin_response || '');
    setNewStatus(ticket.status);
    setShowDetailDialog(true);
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesType = typeFilter === 'all' || ticket.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Gestion des Tickets
            </h1>
            <p className="text-muted-foreground">
              Gérez les demandes et signalements des utilisateurs
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">Ouverts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground">Résolus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, description ou utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(TICKET_STATUS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(TICKET_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun ticket trouvé</h3>
              <p className="text-muted-foreground">
                {tickets.length === 0 ? 'Aucun ticket n\'a été soumis' : 'Aucun ticket ne correspond aux filtres'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => {
              const TypeIcon = TICKET_TYPES[ticket.type]?.icon || Ticket;
              const StatusIcon = TICKET_STATUS[ticket.status]?.icon || Clock;
              return (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetailDialog(ticket)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${TICKET_TYPES[ticket.type]?.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{ticket.title}</h3>
                            {ticket.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">Urgent</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge variant="outline" className={TICKET_STATUS[ticket.status]?.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {TICKET_STATUS[ticket.status]?.label}
                            </Badge>
                            <Badge variant="outline" className={TICKET_PRIORITY[ticket.priority]?.color}>
                              {TICKET_PRIORITY[ticket.priority]?.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {ticket.user?.name || ticket.user?.email || 'Utilisateur inconnu'}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetailDialog(ticket); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail/Process Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTicket && (
                  <>
                    {React.createElement(TICKET_TYPES[selectedTicket.type]?.icon || Ticket, { className: 'h-5 w-5' })}
                    Traiter le ticket
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar>
                    <AvatarFallback>
                      {selectedTicket.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedTicket.user?.name || 'Utilisateur'}</p>
                    <p className="text-sm text-muted-foreground">{selectedTicket.user?.email}</p>
                  </div>
                </div>

                {/* Ticket Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedTicket.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={TICKET_TYPES[selectedTicket.type]?.color}>
                      {TICKET_TYPES[selectedTicket.type]?.label}
                    </Badge>
                    <Badge variant="outline" className={TICKET_PRIORITY[selectedTicket.priority]?.color}>
                      Priorité: {TICKET_PRIORITY[selectedTicket.priority]?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Créé le {formatDate(selectedTicket.created_at)}
                    </span>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Process Form */}
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Changer le statut</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_STATUS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Réponse / Commentaire</Label>
                    <Textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Ajoutez une réponse pour l'utilisateur..."
                      rows={4}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleProcessTicket} disabled={processing} className="gap-2">
                    {processing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Mettre à jour
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TicketAdmin;
