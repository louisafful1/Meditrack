import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";


const AISuggestionsSection = ({ suggestions }) => {
      
  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-6 rounded-xl shadow-lg border border-amber-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center">
        <AlertCircle className="mr-2" size={20} />
        AI Redistribution Suggestions
      </h3>

      <ul className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 text-sm text-amber-100 bg-amber-500/10 rounded-lg border-l-4 border-amber-400"
          >
            {suggestion}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default AISuggestionsSection;
