import React from 'react';

export const SciFiBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
      
      {/* Nền hạt mờ rất nhẹ thay cho lưới */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.015] mix-blend-overlay"></div>

      {/* Static Mesh Gradients - Soft, Elegant Colors */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 blur-[100px]" />
      
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/15 blur-[120px]" />
      
      <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[40vw] rounded-full bg-purple-400/10 blur-[130px]" />
      
    </div>
  );
};
