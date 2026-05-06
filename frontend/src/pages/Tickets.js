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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Ticket,
  Bug,
  Lightbulb,
  RefreshCw,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  Eye,
  MessageSquare
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

const Tickets = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    type: 'suggestion',
    title: '',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tickets')
        .insert([{
          ...formData,
          user_id: profile?.id
        }]);

      if (error) throw error;
      toast.success('Ticket créé avec succès');
      setShowAddDialog(false);
      resetForm();
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erreur lors de la création du ticket');
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket supprimé');
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'suggestion',
      title: '',
      description: '',
      priority: 'medium'
    });
  };

  const openDetailDialog = (ticket) => {
    setSelectedTicket(ticket);
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

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Mes Tickets
            </h1>
            <p className="text-muted-foreground">
              Signalez un bug, proposez une amélioration ou demandez une modification
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer un ticket</DialogTitle>
                <DialogDescription>
                  Décrivez votre demande ou signalez un problème
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Résumé de votre demande"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre demande en détail..."
                    rows={5}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Créer le ticket</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun ticket</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore créé de ticket
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer mon premier ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => {
              const TypeIcon = TICKET_TYPES[ticket.type]?.icon || Ticket;
              const StatusIcon = TICKET_STATUS[ticket.status]?.icon || Clock;
              return (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${TICKET_TYPES[ticket.type]?.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
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
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                          {ticket.admin_response && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <MessageSquare className="h-3 w-3" />
                                Réponse de l'administrateur
                              </p>
                              <p className="text-sm">{ticket.admin_response}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailDialog(ticket)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ticket.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTicket && (
                  <>
                    {React.createElement(TICKET_TYPES[selectedTicket.type]?.icon || Ticket, { className: 'h-5 w-5' })}
                    {selectedTicket.title}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={TICKET_TYPES[selectedTicket.type]?.color}>
                    {TICKET_TYPES[selectedTicket.type]?.label}
                  </Badge>
                  <Badge variant="outline" className={TICKET_STATUS[selectedTicket.status]?.color}>
                    {TICKET_STATUS[selectedTicket.status]?.label}
                  </Badge>
                  <Badge variant="outline" className={TICKET_PRIORITY[selectedTicket.priority]?.color}>
                    Priorité: {TICKET_PRIORITY[selectedTicket.priority]?.label}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {selectedTicket.description}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Créé le {formatDate(selectedTicket.created_at)}
                </div>
                {selectedTicket.admin_response && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4" />
                      Réponse de l'administrateur
                    </h4>
                    <p className="text-sm whitespace-pre-wrap bg-primary/5 p-4 rounded-lg border border-primary/20">
                      {selectedTicket.admin_response}
                    </p>
                    {selectedTicket.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Traité le {formatDate(selectedTicket.resolved_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Tickets;
