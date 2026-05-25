import React from 'react';
import { motion } from 'motion/react';

export const SciFiBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
      
      {/* Nền hạt mờ rất nhẹ thay cho lưới */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.015] mix-blend-overlay"></div>

      {/* Mesh Gradients - Soft, Elegant Colors */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/15 blur-[120px]"
        animate={{
          x: [0, -40, 0],
          y: [0, 60, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      <motion.div
        className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[40vw] rounded-full bg-purple-400/10 blur-[130px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />
      
      {/* Vệt sáng mờ quét tinh tế */}
      <motion.div 
        className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-blue-400/10 to-transparent top-1/3 -rotate-12"
        animate={{ 
          x: ['-100%', '50%'],
          opacity: [0, 1, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      />
      
    </div>
  );
};
