/**
 * Beispiel-Admin-Interface für Frontend-Integration
 * 
 * Dieses Beispiel zeigt, wie Sie den Auth-Baustein in Ihr Frontend integrieren können.
 * Kopieren Sie diesen Code in Ihr Frontend-Projekt und passen Sie die Endpunkte an.
 * 
 * Voraussetzungen:
 * - React/TypeScript Frontend
 * - Shadcn/ui Komponenten (oder ähnliche UI-Bibliothek)
 * - API-Service für HTTP-Requests .
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface User {
  id: number;
  email: string;
  name?: string;
  role: 'ADMIN' | 'MANAGER' | 'EXPERT' | 'CLIENT';
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  created_at: string;
  tenant_id: number;
}

interface WorkshopRegistration {
  id?: number;
  userId?: number;
  user?: {
    id: number;
    name?: string;
    email: string;
  };
  workshopType?: string;
  workshopDate: string;
  company?: string;
  experience?: string;
  goals: string;
  message?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Tenant {
  id: number;
  name: string;
  created_at: string;
  license_plan?: string;
  license_status?: string;
  license_valid_until?: string;
}

// ============================================================================
// API SERVICE
// ============================================================================

class AuthBausteinService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Benutzer-Management
  async getAllUsers(): Promise<{ success: boolean; data: User[] }> {
    // TODO: Implementieren Sie diesen Endpunkt im Auth-Baustein
    // return this.request('/api/auth/users');
    
    // Mock-Daten für das Beispiel
    return {
      success: true,
      data: [
        {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          tenant_id: 1
        }
      ]
    };
  }

  // Workshop-Management
  async getAllWorkshopRegistrations(): Promise<{ success: boolean; data: WorkshopRegistration[] }> {
    return this.request('/api/workshops/all');
  }

  async getMyWorkshopRegistrations(): Promise<{ success: boolean; data: WorkshopRegistration[] }> {
    return this.request('/api/workshops/my-registrations');
  }

  async registerForWorkshop(data: Partial<WorkshopRegistration>): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/workshops/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkshopRegistration(id: number, data: Partial<WorkshopRegistration>): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/workshops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkshopRegistration(id: number): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/workshops/${id}`, {
      method: 'DELETE',
    });
  }

  // Tenant-Management
  async getAllTenants(): Promise<{ success: boolean; data: Tenant[] }> {
    return this.request('/api/auth/tenants');
  }

  async createTenant(name: string): Promise<{ success: boolean; data: Tenant }> {
    return this.request('/api/auth/tenants', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteTenant(id: number): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/auth/tenants/${id}`, {
      method: 'DELETE',
    });
  }
}

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkshops: 0,
    upcomingWorkshops: 0,
    completedWorkshops: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState<WorkshopRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // Konfiguration - Passen Sie diese URL an Ihre Auth-Baustein-Instanz an
  const authService = new AuthBausteinService('https://accounts.revalenz.de/api');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Workshop-Anmeldungen laden
      const workshopsResponse = await authService.getAllWorkshopRegistrations();
      if (workshopsResponse.success && workshopsResponse.data) {
        const workshops = workshopsResponse.data;
        const now = new Date();
        
        setStats({
          totalUsers: new Set(workshops.map(w => w.user?.email)).size,
          totalWorkshops: workshops.length,
          upcomingWorkshops: workshops.filter(w => new Date(w.workshopDate) > now).length,
          completedWorkshops: workshops.filter(w => new Date(w.workshopDate) < now).length
        });

        // Neueste Anmeldungen (letzte 5)
        setRecentRegistrations(
          workshops
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Dashboard-Daten laden Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registered: { color: 'bg-blue-100 text-blue-800', text: 'Angemeldet' },
      confirmed: { color: 'bg-green-100 text-green-800', text: 'Bestätigt' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Storniert' },
      completed: { color: 'bg-gray-100 text-gray-800', text: 'Abgeschlossen' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.registered;
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Dashboard wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Übersicht über das System und aktuelle Aktivitäten
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamte Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registrierte Benutzer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workshop-Anmeldungen</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkshops}</div>
            <p className="text-xs text-muted-foreground">
              Alle Anmeldungen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kommende Workshops</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingWorkshops}</div>
            <p className="text-xs text-muted-foreground">
              Geplante Termine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abgeschlossene Workshops</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedWorkshops}</div>
            <p className="text-xs text-muted-foreground">
              Durchgeführte Workshops
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Schnellzugriff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Workshop-Management
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Benutzer-Verwaltung
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiken
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Neueste Anmeldungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRegistrations.length > 0 ? (
              <div className="space-y-3">
                {recentRegistrations.map((registration) => (
                  <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {registration.user?.name || 'Unbekannt'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {registration.user?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(registration.workshopDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(registration.status || 'registered')}
                      <span className="text-xs text-gray-500">
                        {formatDate(registration.createdAt || '')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Keine Anmeldungen vorhanden
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            System-Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Auth-Baustein: Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Datenbank: Verbunden</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Workshop-API: Aktiv</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

// ============================================================================
// WORKSHOP MANAGEMENT COMPONENT
// ============================================================================

const WorkshopManagement: React.FC = () => {
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<WorkshopRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const authService = new AuthBausteinService('https://accounts.revalenz.de/api');

  useEffect(() => {
    loadRegistrations();
  }, []);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, searchTerm, statusFilter, dateFilter]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await authService.getAllWorkshopRegistrations();
      if (response.success && response.data) {
        setRegistrations(response.data);
      }
    } catch (error) {
      console.error('Workshop-Anmeldungen laden Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = [...registrations];

    // Suchfilter
    if (searchTerm) {
      filtered = filtered.filter(reg => 
        reg.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(reg => reg.status === statusFilter);
    }

    // Datum-Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(reg => {
        const workshopDate = new Date(reg.workshopDate);
        switch (dateFilter) {
          case 'upcoming':
            return workshopDate > now;
          case 'past':
            return workshopDate < now;
          case 'today':
            return workshopDate.toDateString() === now.toDateString();
          default:
            return true;
        }
      });
    }

    setFilteredRegistrations(filtered);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Organisation', 'Workshop-Datum', 'Status', 'Vorkenntnisse', 'Ziele', 'Anmeldung'],
      ...filteredRegistrations.map(reg => [
        reg.user?.name || '',
        reg.user?.email || '',
        reg.company || '',
        new Date(reg.workshopDate).toLocaleDateString('de-DE'),
        reg.status || 'registered',
        reg.experience || '',
        reg.goals || '',
        new Date(reg.createdAt || '').toLocaleString('de-DE')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `workshop-anmeldungen-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Workshop-Anmeldungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Workshop-Management
          </h1>
          <p className="text-gray-600">
            Verwalte alle Workshop-Anmeldungen und Teilnehmer
          </p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button onClick={loadRegistrations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Name, Email oder Organisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="registered">Angemeldet</option>
                <option value="confirmed">Bestätigt</option>
                <option value="cancelled">Storniert</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Datum</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Termine</option>
                <option value="upcoming">Kommende</option>
                <option value="past">Vergangene</option>
                <option value="today">Heute</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Workshop-Anmeldungen ({filteredRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teilnehmer</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Workshop-Datum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vorkenntnisse</TableHead>
                    <TableHead>Anmeldung</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {registration.user?.name || 'Unbekannt'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {registration.user?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {registration.company || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(registration.workshopDate).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">
                          {registration.status || 'registered'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {registration.experience || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {new Date(registration.createdAt || '').toLocaleString('de-DE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Keine Workshop-Anmeldungen gefunden</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { WorkshopManagement };

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/**
 * VERWENDUNG:
 * 
 * 1. Kopieren Sie diese Datei in Ihr Frontend-Projekt
 * 2. Installieren Sie die erforderlichen Abhängigkeiten:
 *    - @radix-ui/react-* (für Shadcn/ui)
 *    - lucide-react (für Icons)
 *    - tailwindcss (für Styling)
 * 
 * 3. Passen Sie die API-URL an:
 *    const authService = new AuthBausteinService('https://ihre-auth-baustein-url.com/api');
 * 
 * 4. Implementieren Sie die fehlenden Endpunkte im Auth-Baustein:
 *    - GET /api/auth/users (für Benutzer-Liste)
 *    - PUT /api/workshops/:id (für Workshop-Updates)
 *    - DELETE /api/workshops/:id (für Workshop-Löschung)
 * 
 * 5. Fügen Sie die Komponenten zu Ihren Routen hinzu:
 *    <Route path="/admin" element={<AdminDashboard />} />
 *    <Route path="/admin/workshops" element={<WorkshopManagement />} />
 * 
 * 6. Implementieren Sie Authentifizierung und Rollen-basierte Zugriffskontrolle
 * 
 * 7. Passen Sie das Styling an Ihr Design-System an
 * 
 * 8. Erweitern Sie die Funktionalität nach Bedarf
 */
