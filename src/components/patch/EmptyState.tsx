import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onGenerate: () => void;
}

const EmptyState = ({ onGenerate }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-1 flex flex-col items-center justify-center p-12 text-center"
    >
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
        <Plus className="text-primary" size={32} />
      </div>
      <h2 className="text-xl font-medium text-foreground mb-2">
        Ready for surgery.
      </h2>
      <p className="text-muted-foreground max-w-xs mb-8">
        Generate a track or drop an audio file to start editing.
      </p>
      <button
        onClick={onGenerate}
        className="px-6 py-3 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95"
      >
        Generate Track
      </button>
    </motion.div>
  );
};

export default EmptyState;
