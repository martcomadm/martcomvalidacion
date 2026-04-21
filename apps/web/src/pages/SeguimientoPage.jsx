
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, AlertTriangle, AlertCircle, Search, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import pb from '@/lib/pocketbaseClient';

export default function SeguimientoPage() {
  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [duplicatePhones, setDuplicatePhones] = useState(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);
      
      console.log('=== INICIO CARGA DE REGISTROS ===');
      console.log('Colección: registros');
      
      const registrosResult = await pb.collection('registros').getList(1, 500, {
        sort: '-created',
        $autoCancel: false
      });

      console.log('=== RESPUESTA DE CARGA ===');
      console.log('Total de registros cargados:', registrosResult.items.length);
      console.log('Registros completos:', registrosResult.items);
      
      // Verify each record has a valid .id property
      const invalidRecords = registrosResult.items.filter(r => !r.id || r.id.trim() === '');
      if (invalidRecords.length > 0) {
        console.error('⚠️ ADVERTENCIA: Se encontraron registros sin ID válido:', invalidRecords);
      }
      
      // Log first 3 records with their IDs for verification
      registrosResult.items.slice(0, 3).forEach((registro, index) => {
        console.log(`Registro ${index + 1}:`, {
          id: registro.id,
          titular: registro.titular,
          telefono: registro.telefono,
          llamada: registro.llamada,
          correo_electronico: registro.correo_electronico,
          terminos_condiciones: registro.terminos_condiciones,
          observaciones_admin: registro.observaciones_admin
        });
      });

      setRegistros(registrosResult.items);
      setLastUpdate(new Date());
      console.log('✓ Registros cargados y guardados en estado');
      console.log('=== FIN CARGA DE REGISTROS ===');

      // Calculate duplicate phones
      const phoneCount = {};
      registrosResult.items.forEach(r => {
        phoneCount[r.telefono] = (phoneCount[r.telefono] || 0) + 1;
      });
      
      const duplicates = new Set(
        Object.entries(phoneCount)
          .filter(([_, count]) => count > 1)
          .map(([phone]) => phone)
      );
      setDuplicatePhones(duplicates);

    } catch (err) {
      console.error('=== ERROR EN CARGA DE REGISTROS ===');
      console.error('Tipo de error:', err.name);
      console.error('Mensaje:', err.message);
      console.error('Error completo:', err);
      setError('No se pudo establecer conexión con la base de datos.');
      if (isManual) toast.error('Error al recargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const intervalId = setInterval(() => {
      if (!editingRow) {
        fetchData(false);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [editingRow]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRegistros(registros);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = registros.filter(r => 
      r.titular?.toLowerCase().includes(term) ||
      r.telefono?.includes(term) ||
      r.ejecutivo?.toLowerCase().includes(term)
    );
    setFilteredRegistros(filtered);
  }, [registros, searchTerm]);

  const startEditing = (registro) => {
    if (!solicitarClave()) return; // 🔐 AQUÍ SE VALIDA LA CLAVE
    
    console.log('=== INICIO EDICIÓN ===');
    console.log('Registro a editar:', registro);
    console.log('ID del registro:', registro.id);
    
    setEditingRow(registro.id);
    setEditData({
      llamada: registro.llamada || '',
      correo_electronico: registro.correo_electronico || '',
      terminos_condiciones: registro.terminos_condiciones || '',
      observaciones_admin: registro.observaciones_admin || ''
    });
    
    console.log('Datos cargados en formulario:', {
      llamada: registro.llamada || '',
      correo_electronico: registro.correo_electronico || '',
      terminos_condiciones: registro.terminos_condiciones || '',
      observaciones_admin: registro.observaciones_admin || ''
    });
  };

  const cancelEditing = () => {
    console.log('Edición cancelada');
    setEditingRow(null);
    setEditData({});
  };

  const saveChanges = async (registroId) => {
    console.log('=== INICIO GUARDADO DE CAMBIOS ===');
    console.log('ID del registro a actualizar:', registroId);
    console.log('Tipo de ID:', typeof registroId);
    console.log('ID es válido:', !!(registroId && registroId.trim()));
    
    // Validate registroId is not empty/undefined/null before update
    if (!registroId || registroId.trim() === '') {
      console.error('ERROR: ID de registro inválido');
      console.error('Valor recibido:', registroId);
      toast.error('Error: No se puede guardar - registro sin identificador válido');
      return;
    }
    
    try {
      setIsSaving(true);
      
      console.log('Datos a actualizar:', editData);
      
      const payload = {
        llamada: editData.llamada || null,
        correo_electronico: editData.correo_electronico || null,
        terminos_condiciones: editData.terminos_condiciones || null,
        observaciones_admin: editData.observaciones_admin || ''
      };

      console.log('=== LLAMADA A POCKETBASE ===');
      console.log('Colección: registros');
      console.log('Método: update');
      console.log('ID:', registroId);
      console.log('Payload:', payload);
      
      const response = await pb.collection('registros').update(registroId, payload, { $autoCancel: false });
      
      console.log('=== RESPUESTA DE ACTUALIZACIÓN ===');
      console.log('Respuesta completa:', response);
      console.log('ID actualizado:', response.id);
      console.log('Campos actualizados:', {
        llamada: response.llamada,
        correo_electronico: response.correo_electronico,
        terminos_condiciones: response.terminos_condiciones,
        observaciones_admin: response.observaciones_admin
      });
      console.log('✓ Registro actualizado exitosamente');

      toast.success('Registro actualizado correctamente');
      setEditingRow(null);
      setEditData({});
      
      await fetchData(true);
      console.log('=== FIN GUARDADO DE CAMBIOS ===');
    } catch (err) {
      console.error('=== ERROR EN ACTUALIZACIÓN ===');
      console.error('Tipo de error:', err.name);
      console.error('Código de estado:', err.status);
      console.error('Mensaje:', err.message);
      console.error('Error completo:', err);
      console.error('Datos del error:', err.data);
      
      if (err.status === 404) {
        toast.error('Error 404: El registro no existe o fue eliminado', {
          action: {
            label: 'Reintentar',
            onClick: () => saveChanges(registroId)
          }
        });
      } else {
        toast.error('Error al actualizar el registro', {
          description: err.message || 'Error desconocido',
          action: {
            label: 'Reintentar',
            onClick: () => saveChanges(registroId)
          }
        });
      }
    } finally {
      setIsSaving(false);
    }
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
  const solicitarClave = () => {
  const claveCorrecta = "2104"; // 🔑 CAMBIA AQUÍ TU CLAVE

  const clave = prompt("Ingresa la clave para evaluar:");

  if (clave === claveCorrecta) {
    return true;
  } else {
    alert("❌ Clave incorrecta");
    return false;
  }
  };
  return (
    <>
      <Helmet>
        <title>Seguimiento y validación - MARTCOM CRM</title>
        <meta name="description" content="Seguimiento y validación de registros" />
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
            <Button onClick={() => fetchData(true)} variant="secondary" className="w-full sm:w-auto gap-2" disabled={isSaving}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar Ahora
            </Button>
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
            <CardHeader className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Seguimiento y validación</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Valida el contacto y confirmación de cada registro ({registros.length} total).
                  </CardDescription>
                  {duplicatePhones.size > 0 && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-[hsl(var(--accent-orange))]/10 border border-[hsl(var(--accent-orange))]/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-[hsl(var(--accent-orange))]" />
                      <span className="text-sm font-medium text-[hsl(var(--accent-orange))]">
                        Atención: Se detectaron {duplicatePhones.size} teléfono{duplicatePhones.size !== 1 ? 's' : ''} duplicado{duplicatePhones.size !== 1 ? 's' : ''}.
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por titular o teléfono..."
                    className="pl-9 bg-white"
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
                        <TableHead className="whitespace-nowrap">Fecha Captura</TableHead>
                        <TableHead className="min-w-[200px]">Titular</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Ejecutivo</TableHead>
                        <TableHead className="min-w-[200px]">Comentarios (Captura)</TableHead>
                        <TableHead>Llamada</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Términos</TableHead>
                        <TableHead className="min-w-[250px]">Observaciones (Admin)</TableHead>
                        <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
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
                            {registros.length === 0 ? 'No hay registros en la base de datos' : 'No se encontraron registros para mostrar'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRegistros.map((registro) => {
                          const isDuplicate = duplicatePhones.has(registro.telefono);
                          const isEditing = editingRow === registro.id;

                          return (
                            <TableRow 
                              key={registro.id} 
                              className={`hover:bg-muted/30 transition-colors ${isDuplicate ? 'duplicate-highlight bg-[hsl(var(--accent-orange))]/5' : ''}`}
                            >
                              <TableCell className="font-medium text-xs whitespace-nowrap">
                                {formatDateTime(registro.fecha_registro || (registro.created ? registro.created.split(' ')[0] : ''), registro.hora_registro)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold">{registro.titular}</span>
                                  {isDuplicate && (
                                    <Badge variant="outline" className="w-fit bg-[hsl(var(--accent-orange))]/10 text-[hsl(var(--accent-orange))] border-[hsl(var(--accent-orange))]/40 uppercase text-[10px]">
                                      Teléfono Duplicado
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{registro.telefono}</TableCell>
                              <TableCell className="text-sm">{registro.plan}</TableCell>
                              <TableCell className="text-sm">{registro.ejecutivo}</TableCell>
                              
                              <TableCell className="text-sm text-muted-foreground">
                                <div className="max-w-[200px] line-clamp-2" title={registro.comentarios}>
                                  {registro.comentarios || '-'}
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                {isEditing ? (
                                  <Select 
                                    value={editData.llamada} 
                                    onValueChange={(value) => setEditData(prev => ({ ...prev, llamada: value }))}
                                  >
                                    <SelectTrigger className="w-[90px] h-8 text-sm">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`text-sm font-medium ${registro.llamada === 'Sí' ? 'text-emerald-600' : registro.llamada === 'No' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {registro.llamada || '-'}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell>
                                {isEditing ? (
                                  <Select 
                                    value={editData.correo_electronico} 
                                    onValueChange={(value) => setEditData(prev => ({ ...prev, correo_electronico: value }))}
                                  >
                                    <SelectTrigger className="w-[90px] h-8 text-sm">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`text-sm font-medium ${registro.correo_electronico === 'Sí' ? 'text-emerald-600' : registro.correo_electronico === 'No' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {registro.correo_electronico || '-'}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell>
                                {isEditing ? (
                                  <Select 
                                    value={editData.terminos_condiciones} 
                                    onValueChange={(value) => setEditData(prev => ({ ...prev, terminos_condiciones: value }))}
                                  >
                                    <SelectTrigger className="w-[90px] h-8 text-sm">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`text-sm font-medium ${registro.terminos_condiciones === 'Sí' ? 'text-emerald-600' : registro.terminos_condiciones === 'No' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {registro.terminos_condiciones || '-'}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell>
                                {isEditing ? (
                                  <Textarea
                                    value={editData.observaciones_admin}
                                    onChange={(e) => setEditData(prev => ({ ...prev, observaciones_admin: e.target.value }))}
                                    placeholder="Añadir nota admin..."
                                    className="w-full min-w-[200px] min-h-[60px] text-sm bg-white resize-y"
                                  />
                                ) : (
                                  <span className="max-w-[250px] line-clamp-2 text-sm" title={registro.observaciones_admin}>
                                    {registro.observaciones_admin || '-'}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={cancelEditing} 
                                      disabled={isSaving}
                                      className="h-8 px-2 text-muted-foreground"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => saveChanges(registro.id)} 
                                      disabled={isSaving}
                                      className="h-8 gap-1.5 px-3 min-w-[100px]"
                                    >
                                      {isSaving ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          Guardando...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="w-3.5 h-3.5" />
                                          Guardar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="secondary" onClick={() => startEditing(registro)} className="h-8 font-medium">
                                    Evaluar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
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
