
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuccessModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary p-4 sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex flex-col items-center max-w-md w-full text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-12 h-12 text-primary-foreground" />
            </motion.div>

            <div className="space-y-3">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary-foreground text-balance">
                ¡Registro Exitoso!
              </h2>
              <p className="text-lg sm:text-xl text-primary-foreground/90 font-medium">
                Los datos del cliente se han guardado correctamente en el sistema.
              </p>
            </div>

            <Button
              size="lg"
              onClick={onClose}
              className="mt-8 w-full sm:w-auto min-w-[240px] h-14 text-lg bg-white text-primary hover:bg-white/90 hover:scale-[0.98] active:scale-[0.95] transition-all rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Capturar otro registro
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
