import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Download, Search, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import pb from '@/lib/pocketbaseClient';

export default function HistorialPage() {
  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRegistros = async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);
      
      const result = await pb.collection('registros').getList(1, 500, {
        sort: '-created',
        $autoCancel: false
      });
      
      console.log('Registros obtenidos:', result.items);
      console.log('Total de registros:', result.items.length);
      
      setRegistros(result.items);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error al cargar registros:', err);
      setError('No se pudo establecer conexión con la base de datos.');
      if (isManual) toast.error('Error al recargar los registros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRegistros(true);

    // Auto-refresh interval (5 seconds)
    const intervalId = setInterval(() => {
      fetchRegistros(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRegistros(registros);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = registros.filter(r => 
      r.titular?.toLowerCase().includes(term) ||
      r.telefono?.includes(term) ||
      r.ejecutivo?.toLowerCase().includes(term) ||
      r.correo?.toLowerCase().includes(term) ||
      r.curp?.toLowerCase().includes(term) ||
      r.nss?.toLowerCase().includes(term)
    );
    setFilteredRegistros(filtered);
  }, [registros, searchTerm]);

  const exportToExcel = () => {
    if (filteredRegistros.length === 0) {
      toast.error('No hay registros para exportar');
      return;
    }

    const dataToExport = filteredRegistros.map(r => ({
      'Fecha': r.fecha_registro || (r.created ? r.created.split(' ')[0] : ''),
      'Hora': r.hora_registro || (r.created ? r.created.split(' ')[1] : ''),
      'Titular': r.titular,
      'Teléfono': r.telefono,
      'NSS': r.nss,
      'CURP': r.curp,
      'Correo': r.correo,
      'Ejecutivo': r.ejecutivo,
      'Plan': r.plan,
      'Tipo de Ingreso': r.tipo_ingreso,
      'Chat': r.chat,
      'Comentarios': r.comentarios || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    XLSX.writeFile(wb, `registros_martcom_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Reporte exportado exitosamente');
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    try {
      const parsedDate = parseISO(dateStr);
      const formattedDate = format(parsedDate, 'dd/MM/yyyy', { locale: es });
      return timeStr ? `${formattedDate} ${timeStr}` : formattedDate;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Helmet>
        <title>Historial de registros - MARTCOM CRM</title>
        <meta name="description" content="Historial completo de registros capturados" />
      </Helmet>

      <div className="min-h-[100dvh] bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-MX') : 'Cargando...'}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => fetchRegistros(true)} variant="secondary" className="flex-1 sm:flex-none gap-2">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Recargar Ahora
              </Button>
              <Button onClick={exportToExcel} variant="outline" className="flex-1 sm:flex-none gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Error de conexión</h4>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Historial de registros</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Mostrando todos los registros ({registros.length} en total).
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar registro..."
                    className="pl-9 text-gray-900 bg-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Fecha / Hora</TableHead>
                        <TableHead className="min-w-[200px]">Titular</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>NSS</TableHead>
                        <TableHead>CURP</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead className="min-w-[150px]">Ejecutivo</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Chat</TableHead>
                        <TableHead className="min-w-[250px]">Comentarios</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && registros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              Cargando registros...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredRegistros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12 text-muted-foreground font-medium">
                            {registros.length === 0 ? 'No hay registros en la base de datos' : 'No se encontraron registros que coincidan con la búsqueda.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRegistros.map((registro) => (
                          <TableRow key={registro.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-xs whitespace-nowrap">
                              {formatDateTime(registro.fecha_registro || (registro.created ? registro.created.split(' ')[0] : ''), registro.hora_registro)}
                            </TableCell>
                            <TableCell className="font-semibold">{registro.titular}</TableCell>
                            <TableCell className="font-mono text-sm">{registro.telefono}</TableCell>
                            <TableCell className="font-mono text-sm">{registro.nss}</TableCell>
                            <TableCell className="font-mono text-sm">{registro.curp}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm" title={registro.correo}>{registro.correo}</TableCell>
                            <TableCell className="text-sm">{registro.ejecutivo}</TableCell>
                            <TableCell className="text-sm">{registro.plan}</TableCell>
                            <TableCell className="text-sm">{registro.tipo_ingreso}</TableCell>
                            <TableCell className="text-sm">{registro.chat}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={registro.comentarios}>
                              {registro.comentarios || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}