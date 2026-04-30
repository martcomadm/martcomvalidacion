
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import SuccessModal from '@/components/SuccessModal.jsx';

const EJECUTIVOS = [
  'ADRIANA RANGEL', 'ARTURO GARCIA', 'DEREK CORONA', 'HORTENSIA RAMIREZ', 'MABEL ARETAGA',
  'CLAUDIA BARRIOS', 'BLANCA SEGUNDO', 'CARLOS RUIZ',
  'CLAUDIA RAMIREZ', 'DIETER MARTINEZ', 'ELIZABETH AGUILERA', 'FATIMA OLVERA',
  'ISELA GALICIA', 'JOSE LARA', 'JONATHAN NUÑEZ', 'JOSE LUIS MARTINEZ', 'JOSSELINE GALICIA',
  'JOZIC MARTINEZ', 'JULIETA GALLEGOS', 'KENJI MARTINEZ', 'LIZETTE MORALES', 'MONSERRAT OLVERA',
  'PAOLA SERRANO', 'PAMELA MONTIEL', 'SARAHI MORALES', 'SUSANA SOLIS',
  'TONATIHU RAMIREZ', 'VICTOR DIOSDADO', 'VICENTE MARTINEZ', 'WENDY MENDOZA',
  'YAIR RUIZ', 'YESSICA BECERRIL'
];

const PLANES = ['PLAN 1', 'PLAN 2'];

const TIPOS_INGRESO = ['PREDICTIVO', 'RECUPERACIÓN', 'REACTIVACION', 'PROVEEDOR', 'REFERIDO', 'NUEVA'];

const CHATS = [
  'CRM', 'PREDICTIVO', 'CHAT 01', 'CHAT 02', 'CHAT 03', 'CHAT 04',
  'CHAT 05', 'CHAT 06', 'CHAT 07', 'CHAT 09', 'CHAT 11', 'CHAT B','CHAT EXTERNO'
];

const INITIAL_FORM_DATA = {
  titular: '',
  telefono: '',
  nss: '',
  curp: '',
  correo: '',
  ejecutivo: '',
  plan: '',
  tipo_ingreso: '',
  chat: '',
  comentarios: ''
};

export default function CapturePage() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nssFeedback, setNssFeedback] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.titular.trim()) {
      newErrors.titular = 'El nombre del titular es requerido';
    }

    if (!formData.nss.trim()) {
      newErrors.nss = 'El NSS es requerido';
    } else if (!/^\d+$/.test(formData.nss)) {
      newErrors.nss = 'El NSS debe contener solo números';
    }

    if (!formData.curp.trim()) {
      newErrors.curp = 'El CURP es requerido';
    } else if (formData.curp.length < 18) {
      newErrors.curp = 'El CURP debe tener 18 caracteres';
    }

    if (!formData.ejecutivo) {
      newErrors.ejecutivo = 'Selecciona un ejecutivo';
    }

    if (!formData.plan) {
      newErrors.plan = 'Selecciona un plan';
    }

    if (!formData.tipo_ingreso) {
      newErrors.tipo_ingreso = 'Selecciona el tipo de ingreso';
    }

    if (!formData.chat) {
      newErrors.chat = 'Selecciona un chat';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error('Por favor corrige los errores en el formulario');
    return;
  }

  setIsSubmitting(true);

  try {
    const now = new Date();
    const fecha_registro = now.toISOString().split('T')[0];
    const hora_registro = now.toLocaleTimeString('es-MX', { hour12: false });

    const payload = {
      ...formData,
      fecha_registro,
      hora_registro
    };

    console.log('=== INICIO CREACIÓN DE REGISTRO ===');
    console.log('Payload enviado:', payload);

    const response = await pb.collection('registros').create(payload, {
    $autoCancel: false
    });

    console.log('=== RESPUESTA DEL SERVIDOR ===');
    console.log('RESPONSE KEYS:', Object.keys(response));
    console.log('RESPONSE COMPLETO:', response);

    // 🔥 DETECTAR ID CORRECTAMENTE
    const recordId = response?.id || response?.data?.id;

    console.log('ID detectado:', recordId);

    // ✅ VALIDACIÓN CORRECTA
    if (!recordId) {
    console.error('❌ Respuesta inválida:', response);
    throw new Error('No se pudo crear el registro');
    }

    console.log('✅ Registro creado con ID:', recordId);
    
    toast.success('Registro guardado correctamente');

    // Mostrar modal de éxito
    setShowSuccessModal(true);

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error completo:', error);
    console.error('Error data:', error?.data);

    // 🔥 MENSAJE MÁS INTELIGENTE
    if (error?.data?.data) {
      const errores = Object.values(error.data.data)
        .map(e => e.message)
        .join(', ');

      toast.error('Error en campos', {
        description: errores
      });
    } else if (error.status === 404) {
      toast.error('La colección "registros" no existe');
    } else {
      toast.error('Error al guardar', {
        description: error.message || 'Intenta nuevamente'
      });
    }

  } finally {
    setIsSubmitting(false);
  }
};

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNssChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    handleInputChange('nss', value);
    
    if (value.length > 0 && value.length < 11) {
      setNssFeedback('El NSS suele tener 11 dígitos');
    } else if (value.length === 12) {
      setNssFeedback('Límite máximo de caracteres alcanzado');
    } else {
      setNssFeedback('');
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setNssFeedback('');
    setShowSuccessModal(false);
  };

  return (
    <>
      <Helmet>
        <title>Captura de registros - MARTCOM CRM</title>
        <meta name="description" content="Sistema de captura de nuevos registros para MARTCOM" />
      </Helmet>

      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={resetForm} 
      />

      <div className="min-h-[100dvh] bg-muted/30 py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <Card className="shadow-lg border-border/50">
            <CardHeader className="pb-8">
              <CardTitle className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                <UserPlus className="w-8 h-8 text-primary" />
                Captura de registro
              </CardTitle>
              <CardDescription className="text-base">
                Completa la información solicitada para ingresar un nuevo prospecto al sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  
                  <div className="space-y-2">
                    <Label htmlFor="titular">Titular <span className="text-destructive">*</span></Label>
                    <Input
                      id="titular"
                      value={formData.titular}
                      onChange={(e) => handleInputChange('titular', e.target.value.toUpperCase())}
                      placeholder="NOMBRE COMPLETO"
                      className="uppercase text-gray-900 font-medium"
                    />
                    {errors.titular && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.titular}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono <span className="text-destructive">*</span></Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10 DÍGITOS"
                      maxLength={10}
                      className="text-gray-900 font-medium font-mono"
                    />
                    {errors.telefono && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.telefono}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nss">NSS <span className="text-destructive">*</span></Label>
                    <Input
                      id="nss"
                      type="text"
                      inputMode="numeric"
                      value={formData.nss}
                      onChange={handleNssChange}
                      placeholder="NÚMERO DE SEGURO SOCIAL"
                      className="text-gray-900 font-medium font-mono"
                    />
                    {errors.nss ? (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.nss}
                      </p>
                    ) : nssFeedback ? (
                      <p className="text-sm text-muted-foreground mt-1">{nssFeedback}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curp">CURP <span className="text-destructive">*</span></Label>
                    <Input
                      id="curp"
                      value={formData.curp}
                      onChange={(e) => handleInputChange('curp', e.target.value.toUpperCase().slice(0, 18))}
                      placeholder="18 CARACTERES"
                      maxLength={18}
                      className="uppercase text-gray-900 font-medium font-mono"
                    />
                    {errors.curp && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.curp}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="correo">Correo electrónico <span className="text-destructive">*</span></Label>
                    <Input
                      id="correo"
                      type="email"
                      value={formData.correo}
                      onChange={(e) => handleInputChange('correo', e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="correo@ejemplo.com"
                      className="text-gray-900 font-medium"
                    />
                    {errors.correo && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.correo}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ejecutivo">Ejecutivo <span className="text-destructive">*</span></Label>
                    <Select value={formData.ejecutivo} onValueChange={(value) => handleInputChange('ejecutivo', value)}>
                      <SelectTrigger id="ejecutivo" className="font-medium text-gray-900">
                        <SelectValue placeholder="Selecciona ejecutivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {EJECUTIVOS.map((ejecutivo) => (
                          <SelectItem key={ejecutivo} value={ejecutivo}>
                            {ejecutivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.ejecutivo && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.ejecutivo}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan <span className="text-destructive">*</span></Label>
                    <Select value={formData.plan} onValueChange={(value) => handleInputChange('plan', value)}>
                      <SelectTrigger id="plan" className="font-medium text-gray-900">
                        <SelectValue placeholder="Selecciona plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANES.map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.plan && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.plan}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_ingreso">Tipo de ingreso <span className="text-destructive">*</span></Label>
                    <Select value={formData.tipo_ingreso} onValueChange={(value) => handleInputChange('tipo_ingreso', value)}>
                      <SelectTrigger id="tipo_ingreso" className="font-medium text-gray-900">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_INGRESO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tipo_ingreso && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.tipo_ingreso}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chat">Chat <span className="text-destructive">*</span></Label>
                    <Select value={formData.chat} onValueChange={(value) => handleInputChange('chat', value)}>
                      <SelectTrigger id="chat" className="font-medium text-gray-900">
                        <SelectValue placeholder="Selecciona chat" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHATS.map((chat) => (
                          <SelectItem key={chat} value={chat}>
                            {chat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.chat && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.chat}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="comentarios">Comentarios (Opcional)</Label>
                    <Textarea
                      id="comentarios"
                      value={formData.comentarios}
                      onChange={(e) => handleInputChange('comentarios', e.target.value)}
                      placeholder="Notas adicionales sobre el registro..."
                      className="min-h-[100px] resize-y text-gray-900"
                    />
                  </div>

                </div>

                <div className="pt-4 border-t">
                  <Button 
                    type="submit" 
                    size="lg"
                    className="w-full gap-2 text-base font-semibold transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Procesando...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Finalizar Captura
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
