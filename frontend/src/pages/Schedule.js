import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
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
import { toast } from 'sonner';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2
} from 'lucide-react';

const EVENT_TYPES = {
  meeting: { label: 'Réunion', color: '#3b82f6' },
  training: { label: 'Formation', color: '#22c55e' },
  client: { label: 'Client', color: '#f97316' },
  personal: { label: 'Personnel', color: '#8b5cf6' },
  other: { label: 'Autre', color: '#6b7280' },
};

const Schedule = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'meeting',
    location: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, [currentDate, fetchEvents]);

  const fetchEvents = useCallback(async () => {
    try {
      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          user:profiles!schedules_user_id_fkey(id, name, email)
        `)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, email');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekDays = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        event_type: formData.event_type,
        location: formData.location || null,
        color: EVENT_TYPES[formData.event_type]?.color || '#3b82f6',
        user_id: profile?.id
      };

      if (selectedEvent) {
        const { error } = await supabase
          .from('schedules')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', selectedEvent.id);
        if (error) throw error;
        toast.success('Événement mis à jour');
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([payload]);
        if (error) throw error;
        toast.success('Événement créé');
      }

      setShowAddDialog(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Événement supprimé');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      event_type: event.event_type,
      location: event.location || '',
      color: event.color
    });
    setShowAddDialog(true);
  };

  const openAddDialog = (date = null) => {
    resetForm();
    if (date) {
      const startTime = new Date(date);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(10, 0, 0, 0);
      setFormData(prev => ({
        ...prev,
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16)
      }));
    }
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      event_type: 'meeting',
      location: '',
      color: '#3b82f6'
    });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const weekDays = getWeekDays();

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="schedule-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Planning</h1>
            <p className="text-muted-foreground mt-1">Planning partagé de l'équipe</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-event-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel événement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
                <DialogDescription>
                  {selectedEvent ? 'Modifiez les détails de l\'événement' : 'Ajoutez un événement au planning'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="event-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Début *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Fin *</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lieu</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="event-submit-btn">
                    {selectedEvent ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="font-semibold">
                  {weekDays[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Week View */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            
            return (
              <Card 
                key={index} 
                className={`min-h-[300px] ${today ? 'ring-2 ring-primary' : ''}`}
                data-testid={`schedule-day-${index}`}
              >
                <CardHeader className="p-3 pb-2">
                  <div 
                    className={`text-center cursor-pointer hover:bg-muted rounded-lg p-2 transition-colors ${today ? 'bg-primary text-primary-foreground rounded-lg' : ''}`}
                    onClick={() => openAddDialog(day)}
                  >
                    <p className="text-xs uppercase tracking-wider">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold">{day.getDate()}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <ScrollArea className="h-[220px]">
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Aucun événement
                        </p>
                      ) : (
                        dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                            onClick={() => openEditDialog(event)}
                          >
                            <div className="font-medium truncate" style={{ color: event.color }}>
                              {event.title}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </div>
                            {event.user && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <User className="h-3 w-3" />
                                {event.user.name}
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Schedule;
