
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const COLORS = ['#148286', '#2f888c', '#FF8042', '#FFBB28', '#00C49F', '#8884d8', '#82ca9d', '#a4de6c'];

export default function MetricasPage() {
  const [registros, setRegistros] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);
      
      const result = await pb.collection('registros').getList(1, 500, {
        sort: '-created',
        $autoCancel: false
      });

      console.log('Registros para métricas:', result.items);
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

    const intervalId = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const totalRegistros = registros.length;

  // Calculos basados en TODOS los registros
  const dataPlan = Object.entries(
    registros.reduce((acc, curr) => {
      acc[curr.plan] = (acc[curr.plan] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name || 'Sin Plan', value })).filter(item => item.value > 0);

  const dataTipoIngreso = Object.entries(
    registros.reduce((acc, curr) => {
      acc[curr.tipo_ingreso] = (acc[curr.tipo_ingreso] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name || 'Sin Tipo', value })).filter(item => item.value > 0);

  const dataChat = Object.entries(
    registros.reduce((acc, curr) => {
      acc[curr.chat] = (acc[curr.chat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name || 'Sin Chat', value })).filter(item => item.value > 0);

  const dataEjecutivo = Object.entries(
    registros.reduce((acc, curr) => {
      acc[curr.ejecutivo] = (acc[curr.ejecutivo] || 0) + 1;
      return acc;
    }, {})
  )
  .map(([ejecutivo, cantidad]) => ({ ejecutivo: ejecutivo.split(' ')[0] || 'Desconocido', cantidad }))
  .sort((a, b) => b.cantidad - a.cantidad)
  .slice(0, 15); // Mostrar el Top 15 para no saturar la gráfica

  return (
    <>
      <Helmet>
        <title>Métricas y reportes - MARTCOM CRM</title>
        <meta name="description" content="Dashboard de métricas y análisis de registros" />
      </Helmet>

      <div className="min-h-screen bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-MX') : 'Cargando...'}
              </span>
            </div>
            <Button onClick={() => fetchData(true)} variant="secondary" className="w-full sm:w-auto gap-2">
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

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de registros</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRegistros}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registros capturados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ejecutivos activos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataEjecutivo.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Con registros asignados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planes vendidos</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataPlan.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tipos de planes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Canales (Chats)</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataChat.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fuentes de ingreso
                  </p>
                </CardContent>
              </Card>
            </div>

            {totalRegistros === 0 && !isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground font-medium text-lg">No hay registros en la base de datos para generar métricas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
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
                          data={dataTipoIngreso}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dataTipoIngreso.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
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
                        <XAxis dataKey="ejecutivo" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 12}} />
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
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 12}} />
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

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
