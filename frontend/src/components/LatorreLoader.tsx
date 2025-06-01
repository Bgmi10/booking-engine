import { motion } from 'framer-motion';

const LaTorreLoader = () => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Premium Brand Container */}
        <div className="relative">
          <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" className='w-40 h-40' />
          <motion.div 
            className="flex justify-center items-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#d4af37' }}
                animate={{ 
                  scale: [0.8, 1.4, 0.8],
                  opacity: [0.4, 1, 0.4],
                  y: [0, -8, 0]
                }}
                transition={{ 
                  duration: 1.8,
                  repeat: Infinity,
                  delay: index * 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LaTorreLoader;