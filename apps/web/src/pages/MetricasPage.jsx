
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const COLORS = ['#148286', '#2f888c', '#FF8042', '#FFBB28', '#00C49F', '#8884d8', '#82ca9d', '#a4de6c'];

const RANGE_OPTIONS = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'all', label: 'Todo' }
];

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getRecordDate = (registro) => {
  if (registro?.fecha_registro) {
    const [y, m, d] = registro.fecha_registro.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const created = registro?.created ? new Date(registro.created) : null;
  return created && !Number.isNaN(created.getTime()) ? created : null;
};

const formatDateLabel = (date) =>
  date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });

export default function MetricasPage() {
  const [registros, setRegistros] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);

      const result = await pb.collection('registros').getList(1, 500, {
        sort: '-created',
        $autoCancel: false
      });

      setRegistros(result.items);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('No se pudo establecer conexión con la base de datos.');
      if (isManual) toast.error('Error al recargar las métricas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const dailyCheckId = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        fetchData(false);
      }
    }, 60000);

    return () => clearInterval(dailyCheckId);
  }, []);

  const { registrosFiltrados, historialDiario, customError } = useMemo(() => {
    const today = toDateOnly(new Date());
    let minDate = null;

    if (selectedRange === 'today') {
      minDate = today;
    } else if (selectedRange === '7d') {
      minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 6);
    } else if (selectedRange === '30d') {
      minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 29);
    }

    let customError = null;
    let customStart = null;
    let customEnd = null;

    if (selectedRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        customError = 'Selecciona fecha de inicio y fin para aplicar el rango personalizado.';
      } else {
        const [sy, sm, sd] = customStartDate.split('-').map(Number);
        const [ey, em, ed] = customEndDate.split('-').map(Number);
        customStart = new Date(sy, sm - 1, sd);
        customEnd = new Date(ey, em - 1, ed);

        if (customStart > customEnd) {
          customError = 'La fecha de inicio no puede ser mayor que la fecha fin.';
        }
      }
    }

    const filtered = registros.filter((registro) => {
      const date = getRecordDate(registro);
      if (!date) return false;
      const normalized = toDateOnly(date);

      if (selectedRange === 'custom') {
        if (customError || !customStart || !customEnd) return false;
        return normalized >= customStart && normalized <= customEnd;
      }

      if (!minDate) return true;
      return normalized >= minDate;
    });

    const byDay = filtered.reduce((acc, curr) => {
      const date = getRecordDate(curr);
      if (!date) return acc;
      const key = toDateOnly(date).toISOString().split('T')[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const sortedHistory = Object.entries(byDay)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, cantidad]) => ({
        fecha: formatDateLabel(new Date(date)),
        cantidad
      }));

    return {
      registrosFiltrados: filtered,
      historialDiario: selectedRange === 'all' ? sortedHistory.slice(-30) : sortedHistory,
      customError
    };
  }, [registros, selectedRange, customStartDate, customEndDate]);

  const totalRegistros = registrosFiltrados.length;

  useEffect(() => {
    if (selectedRange !== 'custom') return;
    if (!customStartDate || !customEndDate) return;
    if (customStartDate > customEndDate) {
      toast.error('La fecha de inicio no puede ser mayor que la fecha fin.');
    }
  }, [selectedRange, customStartDate, customEndDate]);

  const dataPlan = Object.entries(
    registrosFiltrados.reduce((acc, curr) => {
      acc[curr.plan] = (acc[curr.plan] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: name || 'Sin Plan', value }))
    .filter((item) => item.value > 0);

  const dataTipoIngreso = Object.entries(
    registrosFiltrados.reduce((acc, curr) => {
      acc[curr.tipo_ingreso] = (acc[curr.tipo_ingreso] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: name || 'Sin Tipo', value }))
    .filter((item) => item.value > 0);

  const dataChat = Object.entries(
    registrosFiltrados.reduce((acc, curr) => {
      acc[curr.chat] = (acc[curr.chat] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: name || 'Sin Chat', value }))
    .filter((item) => item.value > 0);

  const dataEjecutivo = Object.entries(
    registrosFiltrados.reduce((acc, curr) => {
      acc[curr.ejecutivo] = (acc[curr.ejecutivo] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([ejecutivo, cantidad]) => ({
      ejecutivo: ejecutivo?.split(' ')[0] || 'Desconocido',
      cantidad
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 15);

  const dataTipoIngresoChart = useMemo(() => {
    const total = dataTipoIngreso.reduce((sum, item) => sum + item.value, 0);
    if (!total) return dataTipoIngreso;

    const threshold = total * 0.03;
    const major = [];
    let others = 0;

    dataTipoIngreso.forEach((item) => {
      if (item.value < threshold) {
        others += item.value;
      } else {
        major.push(item);
      }
    });

    if (others > 0) {
      major.push({ name: 'Otros', value: others });
    }

    return major;
  }, [dataTipoIngreso]);

  const tipoIngresoTooltipFormatter = (value, name) => {
    const total = dataTipoIngresoChart.reduce((sum, item) => sum + item.value, 0);
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return [`${value} (${percent}%)`, name];
  };

  const statsPorAgente = useMemo(() => {
    const acc = registrosFiltrados.reduce((map, curr) => {
      const agente = curr?.ejecutivo?.trim() ? curr.ejecutivo.trim() : 'Desconocido';

      if (!map[agente]) {
        map[agente] = {
          agente,
          totalRegistros: 0,
          planes: new Set(),
          chats: new Set(),
          tipoIngresoCount: {}
        };
      }

      map[agente].totalRegistros += 1;
      if (curr?.plan) map[agente].planes.add(curr.plan);
      if (curr?.chat) map[agente].chats.add(curr.chat);

      const tipo = curr?.tipo_ingreso || 'Sin Tipo';
      map[agente].tipoIngresoCount[tipo] = (map[agente].tipoIngresoCount[tipo] || 0) + 1;

      return map;
    }, {});

    return Object.values(acc)
      .map((item) => {
        const tipoIngresoTop = Object.entries(item.tipoIngresoCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin Tipo';
        return {
          agente: item.agente,
          totalRegistros: item.totalRegistros,
          planesDistintos: item.planes.size,
          chatsDistintos: item.chats.size,
          tipoIngresoTop
        };
      })
      .sort((a, b) => b.totalRegistros - a.totalRegistros)
      .slice(0, 20);
  }, [registrosFiltrados]);

  return (
    <>
      <Helmet>
        <title>Métricas y reportes - MARTCOM CRM</title>
        <meta name="description" content="Dashboard de métricas y análisis de registros" />
      </Helmet>

      <div className="min-h-screen bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Última actualización: {lastUpdate ? lastUpdate.toLocaleString('es-MX') : 'Cargando...'}
                </span>
              </div>
              <Button onClick={() => fetchData(true)} variant="secondary" className="w-full sm:w-auto gap-2">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Recargar Ahora
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((range) => (
                <Button
                  key={range.key}
                  variant={selectedRange === range.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRange(range.key)}
                >
                  {range.label}
                </Button>
              ))}
              <Button
                variant={selectedRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange('custom')}
              >
                Personalizado
              </Button>
            </div>

            {selectedRange === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Fecha inicio</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Fecha fin</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                  />
                </div>
              </div>
            )}
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

          {selectedRange === 'custom' && customError && (
            <div className="mb-6 p-4 bg-amber-100 border border-amber-300 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Rango personalizado inválido</h4>
                <p className="text-sm text-amber-700 mt-1">{customError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Mostrando métricas para:{' '}
              <span className="font-medium">
                {selectedRange === 'custom'
                  ? customStartDate && customEndDate
                    ? customStartDate === customEndDate
                      ? `Día específico (${customStartDate})`
                      : `Personalizado (${customStartDate} a ${customEndDate})`
                    : 'Personalizado'
                  : RANGE_OPTIONS.find((r) => r.key === selectedRange)?.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de registros</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRegistros}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registros capturados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ejecutivos activos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataEjecutivo.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Con registros asignados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planes vendidos</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataPlan.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Tipos de planes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Canales (Chats)</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataChat.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Fuentes de ingreso</p>
                </CardContent>
              </Card>
            </div>

            {totalRegistros === 0 && !isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground font-medium text-lg">
                    No hay registros en la base de datos para generar métricas en este período.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Historial diario de registros</CardTitle>
                    <CardDescription>
                      Evolución diaria de capturas {selectedRange === 'all' ? '(mostrando últimos 30 días)' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={historialDiario}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="cantidad" stroke="#148286" strokeWidth={2} dot={{ r: 3 }} name="Registros" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Registros por Plan</CardTitle>
                    <CardDescription>Distribución de los planes contratados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dataPlan}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dataPlan.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Registros por Tipo de Ingreso</CardTitle>
                    <CardDescription>Volumen según el tipo de ingreso del cliente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dataTipoIngresoChart}
                          cx="38%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dataTipoIngresoChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={tipoIngresoTooltipFormatter} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Registros por Ejecutivo (Top 15)</CardTitle>
                    <CardDescription>Productividad basada en número de registros capturados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={dataEjecutivo}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ejecutivo" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cantidad" fill="#148286" name="Total registros" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Registros por Chat</CardTitle>
                    <CardDescription>Distribución de capturas por canal / chat asignado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={dataChat}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#FF8042" name="Cantidad" radius={[4, 4, 0, 0]}>
                          {dataChat.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Estadísticas por agente (Top 20)</CardTitle>
                    <CardDescription>Resumen de desempeño por ejecutivo en el período seleccionado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agente</TableHead>
                            <TableHead className="text-right">Total registros</TableHead>
                            <TableHead className="text-right">Planes distintos</TableHead>
                            <TableHead className="text-right">Chats distintos</TableHead>
                            <TableHead>Tipo ingreso top</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsPorAgente.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Sin datos para mostrar en este período.
                              </TableCell>
                            </TableRow>
                          ) : (
                            statsPorAgente.map((item) => (
                              <TableRow key={item.agente}>
                                <TableCell className="font-medium">{item.agente}</TableCell>
                                <TableCell className="text-right">{item.totalRegistros}</TableCell>
                                <TableCell className="text-right">{item.planesDistintos}</TableCell>
                                <TableCell className="text-right">{item.chatsDistintos}</TableCell>
                                <TableCell>{item.tipoIngresoTop}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

