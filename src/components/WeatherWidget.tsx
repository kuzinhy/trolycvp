import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, CloudFog, CloudMoon, Moon, Thermometer, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const WeatherWidget: React.FC<{ variant?: 'pill' | 'card' }> = ({ variant = 'pill' }) => {
  const [weather, setWeather] = useState<{ temp: number, code: string, desc: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat?: number, lon?: number, retryCount = 0) => {
      try {
        const query = lat && lon ? `${lat},${lon}` : 'Thu Dau Mot';
        const res = await fetch(`/api/weather?query=${encodeURIComponent(query)}`);
        
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        
        if (!data || !data.current_condition?.[0]) {
          setWeather({ temp: 25, code: '113', desc: 'Trời quang đãng' });
          return;
        }

        const current = data.current_condition[0];
        setWeather({
          temp: parseInt(current.temp_C) || 0,
          code: current.weatherCode || '113',
          desc: current.lang_vi?.[0]?.value || current.weatherDesc?.[0]?.value || 'N/A'
        });
      } catch (e) {
        if (retryCount < 2) {
          setTimeout(() => fetchWeather(lat, lon, retryCount + 1), 2000);
        } else if (lat && lon) {
          fetchWeather();
        } else {
          setWeather({ temp: 25, code: '113', desc: 'Trời quang đãng' });
        }
      } finally {
        setLoading(false);
      }
    };

    const initWeather = async () => {
      // Always use default location to avoid geolocation permission prompts
      fetchWeather();
    };

    initWeather();
    const interval = setInterval(() => initWeather(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code: string, size = 14) => {
    const c = parseInt(code);
    if (c === 113) return <Sun className="text-amber-500" size={size} />;
    if (c === 116) return <Cloud className="text-blue-400" size={size} />;
    if (c >= 119 && c <= 122) return <Cloud className="text-slate-400" size={size} />;
    if (c >= 143 && c <= 260) return <CloudFog className="text-slate-300" size={size} />;
    if (c >= 263 && c <= 308) return <CloudRain className="text-blue-500" size={size} />;
    if (c >= 311 && c <= 338) return <CloudSnow className="text-indigo-300" size={size} />;
    if (c >= 353 && c <= 395) return <CloudLightning className="text-yellow-500" size={size} />;
    return <Cloud size={size} className="text-emerald-500" />;
  };

  if (loading) {
    return (
      <div className={variant === 'card' ? "bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-center h-full" : ""}>
        <Loader2 size={variant === 'card' ? 24 : 12} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!weather) return null;

  if (variant === 'card') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm interactive-card group relative overflow-hidden h-full flex flex-col justify-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 transition-all duration-300 group-hover:scale-110 shadow-sm">
            {getWeatherIcon(weather.code, 24)}
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thời tiết</div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{weather.desc}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-black text-slate-900 tracking-tight">{weather.temp}°</p>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Celsius</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-default group"
      title={weather.desc}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {getWeatherIcon(weather.code)}
        </motion.div>
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
      </div>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-black text-slate-700">{weather.temp}°</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">C</span>
      </div>
    </motion.div>
  );
};
