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
          
          {/* Sophisticated Flying Bird - Exact Recreation */}
          <motion.div 
            className="mb-8 relative"
            animate={{ 
              x: [0, 25, -15, 10, 0],
              y: [0, -12, -8, -15, 0],
              rotate: [0, 3, -2, 1, 0]
            }}
            transition={{ duration: 0.2, ease: [0.20, 0.40, 0.40, 0.90] }}
          >
            <svg
              width="50"
              height="30"
              viewBox="0 0 50 30"
              className="mx-auto drop-shadow-sm"
            >
              {/* Bird Head */}
              <motion.circle
                cx="42"
                cy="15"
                r="3.5"
                fill="#2c3e50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "backOut" }}
              />
              
              {/* Bird Beak */}
              <motion.path
                d="M45 14 L49 12.5 L47.5 16.5 Z"
                fill="#e74c3c"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              />
              
              {/* Bird Body with sophisticated curve */}
              <motion.path
                d="M15 18 C20 14, 30 14, 38.5 16 C40 15.5, 41 15.8, 42 16.5 C41 18, 39.5 17.5, 38 17.2 C30 19, 20 19, 15 18 Z"
                fill="#34495e"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ 
                  delay: 0.2,
                  duration: 1.5, 
                  ease: [0.25, 0.46, 0.45, 0.94] 
                }}
              />
              
              {/* Main Wing - Premium Animation */}
              <motion.path
                d="M22 15 C28 10, 36 11, 40 15.5 C37 18, 30 17, 25 16.2 Z"
                fill="#d4af37"
                animate={{ 
                  rotateZ: [0, -20, 15, -10, 0],
                  scaleY: [1, 0.6, 1.2, 0.8, 1],
                  opacity: [0.9, 1, 0.95, 1, 0.9]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                style={{ transformOrigin: "31px 13px" }}
              />
              
              {/* Wing Details */}
              <motion.path
                d="M26 13.5 C30 12, 34 12.5, 37 14.5 C35 15.5, 31 15, 28 14.2 Z"
                fill="#f39c12"
                animate={{ 
                  rotateZ: [0, -15, 10, -8, 0],
                  scaleY: [1, 0.7, 1.1, 0.9, 1]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.2
                }}
                style={{ transformOrigin: "31px 13px" }}
              />
              
              {/* Wing Feather Tips */}
              <motion.g
                animate={{ 
                  rotateZ: [0, -25, 20, -15, 0],
                  opacity: [0.8, 1, 0.9, 1, 0.8]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.1
                }}
                style={{ transformOrigin: "31px 13px" }}
              >
                <path d="M30 11 L32 9 L34 11.5 Z" fill="#e67e22" />
                <path d="M33 10.5 L35 8.5 L37 11 Z" fill="#e67e22" />
                <path d="M36 10 L38 8 L40 10.5 Z" fill="#e67e22" />
              </motion.g>
              
              {/* Bird Tail */}
              <motion.path
                d="M15 18 L8 16.5 L10 20.5 L12 19 Z"
                fill="#2c3e50"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              />
              
              {/* Bird Eye with Premium Animation */}
              <motion.circle 
                cx="41" 
                cy="14.5" 
                r="1" 
                fill="white"
                animate={{ 
                  scaleY: [1, 0.1, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <circle cx="41.3" cy="14.5" r="0.4" fill="#2c3e50" />
              
              {/* Eye Highlight */}
              <circle cx="41.1" cy="14.2" r="0.15" fill="white" opacity="0.8" />
            </svg>
            
            {/* Premium Flight Trail */}
            <motion.div 
              className="absolute -left-8 top-1/2 flex space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 bg-gray-300 rounded-full"
                  animate={{ 
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
          
          {/* Premium Typography - Exact Match */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.4, 
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <motion.h1 
              className="text-4xl text-black mb-3"
              style={{ 
                fontFamily: 'Times, "Times New Roman", serif',
                fontWeight: '400',
                fontStyle: 'italic',
                letterSpacing: '0.02em',
                lineHeight: '1.1'
              }}
              animate={{ 
                opacity: [0.7, 1, 0.7] 
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              La Torre
            </motion.h1>
            
            {/* Subtitle - exact match */}
            <motion.p 
              className="text-xs text-gray-600 uppercase tracking-widest mb-6"
              style={{ 
                fontFamily: 'Arial, sans-serif',
                fontWeight: '400',
                letterSpacing: '0.15em'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Sulla Via Francigena
            </motion.p>
          </motion.div>
          
          {/* Premium Loading Animation */}
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
          
          {/* Subtle Loading Text */}
          <motion.p 
            className="text-gray-500 text-xs mt-4 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ 
              delay: 2,
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Loading your experience...
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default LaTorreLoader;