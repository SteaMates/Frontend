/**
 * Nombre del fichero: ReportButton.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import api from '../../lib/api';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

type ReportTargetType = 'list' | 'comment' | 'user';

type ReportButtonProps = {
  targetId: string;
  targetType: ReportTargetType;
  buttonLabel?: string;
  buttonClassName?: string;
};

const REASON_OPTIONS: Record<ReportTargetType, Array<{ value: string; label: string }>> = {
  list: [
    { value: 'Spam', label: 'Spam' },
    { value: 'Contenido Ofensivo', label: 'Contenido Ofensivo' },
    { value: 'Información Falsa', label: 'Información Falsa' },
    { value: 'Otros', label: 'Otros' },
  ],
  comment: [
    { value: 'Spam', label: 'Spam' },
    { value: 'Contenido Ofensivo', label: 'Contenido Ofensivo' },
    { value: 'Información Falsa', label: 'Información Falsa' },
    { value: 'Otros', label: 'Otros' },
  ],
  user: [
    { value: 'Nombre Ofensivo', label: 'Nombre de Usuario Ofensivo' },
    { value: 'Imagen Inadecuada', label: 'Imagen de Perfil Inadecuada' },
    { value: 'Se hace pasar por otra persona', label: 'Se hace pasar por otra persona' },
    { value: 'Otros', label: 'Otros' },
  ],
};

/**
 * Función: ReportButton
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * ReportButton. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function ReportButton({
  targetId,
  targetType,
  buttonLabel = 'Reportar',
  buttonClassName = '',
}: ReportButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  /**
                 * Función: handleSubmit
         * Descripción: Manejador de eventos (handler) diseñado para responder a la acción de
         * submit. Captura la interacción del usuario o del sistema, valida el
         * contexto de ejecución y dispara las actualizaciones de estado necesarias
         * en la aplicación.
                 */
    const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!reason) {
      toast.error('Selecciona un motivo para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/reports', {
        targetId,
        targetType,
        reason,
        description,
      });

      toast.success('Reporte enviado correctamente.');
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      const backendMessage = error?.response?.data?.error;
      toast.error(backendMessage || 'No se pudo enviar el reporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
                 * Función: getTargetTypeLabel
         * Descripción: Función encargada de consultar y obtener los datos de target type label.
         * Procesa los parámetros de entrada requeridos, realiza la llamada
         * pertinente y devuelve la información estructurada para que la aplicación
         * pueda utilizarla.
                 */
    const getTargetTypeLabel = () => {
    if (targetType === 'user') return 'usuario';
    if (targetType === 'list') return 'lista';
    if (targetType === 'comment') return 'comentario';
    return 'contenido';
  };

  const reasons = REASON_OPTIONS[targetType];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={buttonClassName || 'inline-flex items-center gap-2 text-[#90a1b9] hover:text-[#ff8a8c] transition-colors text-[14px]'}
        >
          <Flag size={16} />
          {buttonLabel}
        </button>
      </DialogTrigger>

      <DialogContent className="bg-[#0f172b] border-[#1d293d] text-white">
        <DialogHeader>
          <DialogTitle>Reportar {getTargetTypeLabel()}</DialogTitle>
          <DialogDescription className="text-[#90a1b9]">
            Tu reporte sera revisado por el equipo de moderacion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-[#cad5e2]">Motivo del reporte</p>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="border-[#314158] bg-[rgba(2,6,24,0.5)] text-white">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172b] border-[#314158] text-white">
                {reasons.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm text-[#cad5e2]">Descripcion adicional (opcional)</p>
              <span className="text-xs text-[#62748e]">{description.length}/500</span>
            </div>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anade detalles para ayudar a moderacion..."
              maxLength={500}
              className="min-h-24 border-[#314158] bg-[rgba(2,6,24,0.5)] text-white placeholder:text-[#62748e] resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-[#314158] bg-transparent text-[#cad5e2] hover:bg-[#1d293d]"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !reason}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar reporte'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
