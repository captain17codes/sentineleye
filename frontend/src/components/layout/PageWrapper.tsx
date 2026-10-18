import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('min-h-[calc(100vh-5rem)] pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto', className)}
    >
      {children}
    </motion.main>
  );
}
