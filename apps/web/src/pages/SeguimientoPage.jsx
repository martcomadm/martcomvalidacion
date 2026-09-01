import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, AlertTriangle, AlertCircle, Search, RefreshCw, Clock, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import pb from '@/lib/pocketbaseClient';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export default function SeguimientoPage() {
  const [registros, setRegistros] = useState([]);
  const [duplicatePhones, setDuplicatePhones] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const currentPageRef = useRef(1);
  const filtersRef = useRef({ term: '', startDate: '', endDate: '' });
  const editingRowRef = useRef(null);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    editingRowRef.current = editingRow;
  }, [editingRow]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(1);
      currentPageRef.current = 1;
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buildFilter = (term, fromDate, toDate) => {
    const filters = [];

    if (term) {
      filters.push(
        pb.filter(
          '(titular ~ {:search} || telefono ~ {:search} || ejecutivo ~ {:search})',
          { search: term }
        )
      );
    }

    if (fromDate) {
      filters.push(pb.filter('fecha_registro >= {:startDate}', { startDate: fromDate }));
    }

    if (toDate) {
      filters.push(pb.filter('fecha_registro <= {:endDate}', { endDate: toDate }));
    }

    return filters.join(' && ');
  };

  const fetchDuplicatePhones = async () => {
    try {
      const allPhones = await pb.collection('registros').getFullList({
        fields: 'telefono',
        $autoCancel: false
      });

      const phoneCount = {};
      allPhones.forEach((record) => {
        const phone = record.telefono?.trim();
        if (!phone) return;
        phoneCount[phone] = (phoneCount[phone] || 0) + 1;
      });

      const duplicates = new Set(
        Object.entries(phoneCount)
          .filter(([, count]) => count > 1)
          .map(([phone]) => phone)
      );

      setDuplicatePhones(duplicates);
    } catch (err) {
      console.error('Error al calcular teléfonos duplicados:', err);
    }
  };

  const fetchData = async (
    isManual = false,
    page = currentPageRef.current,
    filters = filtersRef.current
  ) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);

      const filter = buildFilter(filters.term, filters.startDate, filters.endDate);
      const result = await pb.collection('registros').getList(page, PAGE_SIZE, {
        sort: '-created',
        filter: filter || undefined,
        $autoCancel: false
      });

      if (result.totalPages > 0 && page > result.totalPages) {
        const safePage = result.totalPages;
        setCurrentPage(safePage);
        currentPageRef.current = safePage;
        return;
      }

      setRegistros(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(Math.max(result.totalPages, 1));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error al cargar registros de seguimiento:', err);
      setError('No se pudo establecer conexión con la base de datos.');
      if (isManual) toast.error('Error al recargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filtersRef.current = {
      term: debouncedSearchTerm,
      startDate,
      endDate
    };
    currentPageRef.current = currentPage;
    fetchData(true, currentPage, filtersRef.current);
  }, [currentPage, debouncedSearchTerm, startDate, endDate]);

  useEffect(() => {
    fetchDuplicatePhones();
  }, []);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const subscribeToRegistros = async () => {
      try {
        unsubscribe = await pb.collection('registros').subscribe('*', async () => {
          if (!isMounted || editingRowRef.current) return;

          await Promise.all([
            fetchData(false, currentPageRef.current, filtersRef.current),
            fetchDuplicatePhones()
          ]);
        });
      } catch (err) {
        console.error('Error al activar realtime en seguimiento:', err);
        if (isMounted) toast.error('No se pudo activar la actualización en tiempo real');
      }
    };

    subscribeToRegistros();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        pb.collection('registros').unsubscribe('*').catch(() => {});
      }
    };
  }, []);

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    if (startDate && endDate && startDate > endDate) {
      toast.error('La fecha inicial no puede ser posterior a la fecha final');
      return;
    }

    if (registros.length === 0) {
      toast.error('No hay registros visibles para exportar');
      return;
    }

    const dataToExport = registros.map((registro) => ({
      'Fecha captura': formatDateTime(
        registro.fecha_registro || (registro.created ? registro.created.split(' ')[0] : ''),
        registro.hora_registro
      ),
      Titular: registro.titular || '',
      'Teléfono': registro.telefono || '',
      Plan: registro.plan || '',
      Ejecutivo: registro.ejecutivo || '',
      'Comentarios (Captura)': registro.comentarios || '',
      Llamada: registro.llamada || '',
      Correo: registro.correo_electronico || '',
      'Términos': registro.terminos_condiciones || '',
      'Observaciones (Admin)': registro.observaciones_admin || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 24 },
      { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 45 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seguimiento');

    const rangeLabel = startDate || endDate
      ? `${startDate || 'inicio'}_a_${endDate || 'hoy'}`
      : format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(workbook, `seguimiento_martcom_${rangeLabel}.xlsx`);
    toast.success(`${registros.length} registro${registros.length === 1 ? '' : 's'} de la página actual exportado${registros.length === 1 ? '' : 's'}`);
  };

  const startEditing = (registro) => {
    if (!solicitarClave()) return;

    setEditingRow(registro.id);
    editingRowRef.current = registro.id;
    setEditData({
      llamada: registro.llamada || '',
      correo_electronico: registro.correo_electronico || '',
      terminos_condiciones: registro.terminos_condiciones || '',
      observaciones_admin: registro.observaciones_admin || ''
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    editingRowRef.current = null;
    setEditData({});
    fetchData(false, currentPageRef.current, filtersRef.current);
  };

  const saveChanges = async (registroId) => {
    if (!registroId || registroId.trim() === '') {
      toast.error('Error: No se puede guardar - registro sin identificador válido');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        llamada: editData.llamada || null,
        correo_electronico: editData.correo_electronico || null,
        terminos_condiciones: editData.terminos_condiciones || null,
        observaciones_admin: editData.observaciones_admin || ''
      };

      await pb.collection('registros').update(registroId, payload, { $autoCancel: false });

      toast.success('Registro actualizado correctamente');
      setEditingRow(null);
      editingRowRef.current = null;
      setEditData({});

      await fetchData(true, currentPageRef.current, filtersRef.current);
    } catch (err) {
      console.error('Error al actualizar el registro:', err);

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
    const claveCorrecta = '2104';
    const clave = prompt('Ingresa la clave para evaluar:');

    if (clave === claveCorrecta) return true;

    alert('❌ Clave incorrecta');
    return false;
  };

  const goToPreviousPage = () => {
    if (editingRow) return;
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    if (editingRow) return;
    setCurrentPage((page) => Math.min(totalPages, page + 1));
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
              <span className="hidden sm:inline text-emerald-600 font-medium">• Realtime activo</span>
            </div>
            <Button
              onClick={() => fetchData(true, currentPage, filtersRef.current)}
              variant="secondary"
              className="w-full sm:w-auto gap-2"
              disabled={isSaving || !!editingRow}
            >
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
                    {debouncedSearchTerm || startDate || endDate
                      ? `${totalItems} registro${totalItems === 1 ? '' : 's'} coincide${totalItems === 1 ? '' : 'n'} con los filtros.`
                      : `${totalItems} registros en total.`}
                  </CardDescription>
                  {duplicatePhones.size > 0 && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-[hsl(var(--accent-orange))]/10 border border-[hsl(var(--accent-orange))]/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-[hsl(var(--accent-orange))]" />
                      <span className="text-sm font-medium text-[hsl(var(--accent-orange))]">
                        Atención: Se detectaron {duplicatePhones.size} teléfono{duplicatePhones.size !== 1 ? 's' : ''} duplicado{duplicatePhones.size !== 1 ? 's' : ''} en la base completa.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80 md:self-end">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar titular, teléfono o ejecutivo..."
                      className="pl-9 bg-white"
                      disabled={!!editingRow}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="space-y-1">
                      <label htmlFor="seguimiento-desde" className="text-xs font-medium text-muted-foreground">Desde</label>
                      <Input
                        id="seguimiento-desde"
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white sm:w-[155px]"
                        disabled={!!editingRow}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="seguimiento-hasta" className="text-xs font-medium text-muted-foreground">Hasta</label>
                      <Input
                        id="seguimiento-hasta"
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white sm:w-[155px]"
                        disabled={!!editingRow}
                      />
                    </div>
                    {(startDate || endDate) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearDateFilter}
                        title="Limpiar rango de fechas"
                        aria-label="Limpiar rango de fechas"
                        disabled={!!editingRow}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exportToExcel}
                      disabled={isLoading || registros.length === 0 || !!editingRow}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Exportar página ({registros.length})
                    </Button>
                  </div>
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
                      ) : registros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12 text-muted-foreground font-medium">
                            {debouncedSearchTerm || startDate || endDate
                              ? 'No se encontraron registros para los filtros seleccionados.'
                              : 'No hay registros en la base de datos'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        registros.map((registro) => {
                          const isDuplicate = duplicatePhones.has(registro.telefono?.trim());
                          const isEditing = editingRow === registro.id;

                          return (
                            <TableRow
                              key={registro.id}
                              className={`hover:bg-muted/30 transition-colors ${isDuplicate ? 'duplicate-highlight bg-[hsl(var(--accent-orange))]/5' : ''}`}
                            >
                              <TableCell className="font-medium text-xs whitespace-nowrap">
                                {formatDateTime(
                                  registro.fecha_registro || (registro.created ? registro.created.split(' ')[0] : ''),
                                  registro.hora_registro
                                )}
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
                                  <Select value={editData.llamada} onValueChange={(value) => setEditData((prev) => ({ ...prev, llamada: value }))}>
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
                                  <Select value={editData.correo_electronico} onValueChange={(value) => setEditData((prev) => ({ ...prev, correo_electronico: value }))}>
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
                                  <Select value={editData.terminos_condiciones} onValueChange={(value) => setEditData((prev) => ({ ...prev, terminos_condiciones: value }))}>
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
                                    onChange={(e) => setEditData((prev) => ({ ...prev, observaciones_admin: e.target.value }))}
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
                                    <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={isSaving} className="h-8 px-2 text-muted-foreground">
                                      Cancelar
                                    </Button>
                                    <Button size="sm" onClick={() => saveChanges(registro.id)} disabled={isSaving} className="h-8 gap-1.5 px-3 min-w-[100px]">
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} · hasta {PAGE_SIZE} registros por página
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage <= 1 || isLoading || !!editingRow}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages || isLoading || !!editingRow}
                    className="gap-1"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
