import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, CheckCircle2, Volume2, RefreshCw, GraduationCap, ExternalLink, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface EnglishWord {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  context: string;
  category: 'professional' | 'general' | 'leadership';
}

const WORDS_POOL: EnglishWord[] = [
  {
    id: '1',
    word: 'Strategic',
    phonetic: '/strəˈtiːdʒɪk/',
    meaning: 'Chiến lược',
    example: 'We need a strategic plan for the next quarter.',
    context: 'Dùng khi nói về các kế hoạch dài hạn, quan trọng của cơ quan.',
    category: 'professional'
  },
  {
    id: '2',
    word: 'Implement',
    phonetic: '/ˈɪmplɪment/',
    meaning: 'Triển khai, thực hiện',
    example: 'The new policy will be implemented next month.',
    context: 'Dùng khi nói về việc đưa một nghị quyết, quyết định vào thực tế.',
    category: 'professional'
  },
  {
    id: '3',
    word: 'Collaborate',
    phonetic: '/kəˈlæbəreɪt/',
    meaning: 'Cộng tác, phối hợp',
    example: 'We should collaborate with other departments.',
    context: 'Dùng khi nói về việc phối hợp giữa các ban ngành, đoàn thể.',
    category: 'professional'
  },
  {
    id: '4',
    word: 'Evaluate',
    phonetic: '/ɪˈvæljueɪt/',
    meaning: 'Đánh giá',
    example: 'We need to evaluate the results of the campaign.',
    context: 'Dùng trong công tác kiểm tra, đánh giá cán bộ hoặc kết quả công việc.',
    category: 'professional'
  },
  {
    id: '5',
    word: 'Consensus',
    phonetic: '/kənˈsensəs/',
    meaning: 'Sự đồng thuận',
    example: 'The committee reached a consensus on the issue.',
    context: 'Dùng khi nói về việc đạt được sự thống nhất trong cuộc họp.',
    category: 'leadership'
  },
  {
    id: '6',
    word: 'Transparent',
    phonetic: '/trænsˈpærənt/',
    meaning: 'Minh bạch',
    example: 'The selection process must be transparent.',
    context: 'Dùng khi nói về tính công khai, minh bạch trong quản lý.',
    category: 'professional'
  },
  {
    id: '7',
    word: 'Innovation',
    phonetic: '/ˌɪnəˈveɪʃn/',
    meaning: 'Sự đổi mới, sáng tạo',
    example: 'Innovation is key to our success.',
    context: 'Dùng khi khuyến khích các ý tưởng mới, cải cách hành chính.',
    category: 'professional'
  },
  {
    id: '8',
    word: 'Accountability',
    phonetic: '/əˌkaʊntəˈbɪləti/',
    meaning: 'Trách nhiệm giải trình',
    example: 'There is a lack of accountability in the system.',
    context: 'Dùng khi nói về trách nhiệm của cá nhân, tổ chức trước công việc.',
    category: 'leadership'
  },
  {
    id: '9',
    word: 'Sustainable',
    phonetic: '/səˈsteɪnəbl/',
    meaning: 'Bền vững',
    example: 'We aim for sustainable development.',
    context: 'Dùng khi nói về các mục tiêu phát triển kinh tế - xã hội lâu dài.',
    category: 'professional'
  },
  {
    id: '10',
    word: 'Compliance',
    phonetic: '/kəmˈplaɪəns/',
    meaning: 'Sự tuân thủ',
    example: 'The company is in full compliance with the law.',
    context: 'Dùng khi nói về việc chấp hành các quy định, pháp luật.',
    category: 'professional'
  },
  {
    id: '11',
    word: 'Bureaucracy',
    phonetic: '/bjʊəˈrɒkrəsi/',
    meaning: 'Bộ máy hành chính / Thủ tục rườm rà',
    example: 'We need to reduce bureaucracy to speed up the process.',
    context: 'Dùng khi thảo luận về cải cách hành chính, giảm bớt thủ tục.',
    category: 'professional'
  },
  {
    id: '12',
    word: 'Jurisdiction',
    phonetic: '/ˌdʒʊərɪsˈdɪkʃn/',
    meaning: 'Thẩm quyền / Quyền hạn pháp lý',
    example: 'This matter falls under the jurisdiction of the local government.',
    context: 'Dùng khi xác định phạm vi giải quyết công việc của các đơn vị.',
    category: 'professional'
  },
  {
    id: '13',
    word: 'Protocol',
    phonetic: '/ˈprəʊtəkɒl/',
    meaning: 'Nghi thức / Quy trình',
    example: 'We must follow the official protocol for the ceremony.',
    context: 'Dùng trong các sự kiện ngoại giao hoặc quy trình làm việc chuẩn.',
    category: 'professional'
  },
  {
    id: '14',
    word: 'Resolution',
    phonetic: '/ˌrezəˈluːʃn/',
    meaning: 'Nghị quyết / Sự giải quyết',
    example: 'The Party Congress passed a new resolution.',
    context: 'Dùng khi nói về các nghị quyết của Đảng, Hội đồng nhân dân.',
    category: 'professional'
  },
  {
    id: '15',
    word: 'Delegation',
    phonetic: '/ˌdelɪˈɡeɪʃn/',
    meaning: 'Phái đoàn / Sự ủy quyền',
    example: 'A high-level delegation visited the province.',
    context: 'Dùng khi nói về các đoàn khách cấp cao hoặc việc giao quyền cho cấp dưới.',
    category: 'leadership'
  },
  {
    id: '16',
    word: 'Incentive',
    phonetic: '/ɪnˈsentɪv/',
    meaning: 'Sự khuyến khích / Động lực',
    example: 'The government offers incentives for green energy projects.',
    context: 'Dùng khi nói về các chính sách ưu đãi, khuyến khích phát triển.',
    category: 'professional'
  },
  {
    id: '17',
    word: 'Infrastructure',
    phonetic: '/ˈɪnfrəstrʌktʃə(r)/',
    meaning: 'Cơ sở hạ tầng',
    example: 'Investment in rural infrastructure is a priority.',
    context: 'Dùng khi nói về xây dựng đường xá, cầu cống, điện đường.',
    category: 'professional'
  },
  {
    id: '18',
    word: 'Objective',
    phonetic: '/əbˈdʒektɪv/',
    meaning: 'Mục tiêu / Khách quan',
    example: 'Our primary objective is to improve public services.',
    context: 'Dùng khi xác định mục tiêu công tác hoặc yêu cầu tính khách quan.',
    category: 'professional'
  },
  {
    id: '19',
    word: 'Paradigm',
    phonetic: '/ˈpærədaɪm/',
    meaning: 'Mô hình / Kiểu mẫu',
    example: 'This represents a paradigm shift in our approach.',
    context: 'Dùng khi nói về sự thay đổi căn bản trong tư duy hoặc phương pháp làm việc.',
    category: 'leadership'
  },
  {
    id: '20',
    word: 'Resilience',
    phonetic: '/rɪˈzɪliəns/',
    meaning: 'Khả năng phục hồi / Sự kiên cường',
    example: 'The community showed great resilience after the flood.',
    context: 'Dùng khi nói về khả năng chịu đựng và vượt qua khó khăn của tổ chức.',
    category: 'leadership'
  }
];

export const EnglishLearningWidget: React.FC = () => {
  const { user } = useAuth();
  const [currentWord, setCurrentWord] = useState<EnglishWord | null>(null);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check time and load state
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      // Active from 07:00 to 22:00
      setIsVisible(hour >= 7 && hour < 22);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute

    // Load learned words from localStorage
    const saved = localStorage.getItem(`learned_words_${user?.uid || 'guest'}`);
    if (saved) {
      setLearnedIds(JSON.parse(saved));
    }

    return () => clearInterval(interval);
  }, [user]);

  const selectNewWord = useCallback(() => {
    const availableWords = WORDS_POOL.filter(w => !learnedIds.includes(w.id));
    
    if (availableWords.length === 0) {
      // If all words learned, reset or show a message
      // For now, let's reset to allow re-learning
      const randomIndex = Math.floor(Math.random() * WORDS_POOL.length);
      setCurrentWord(WORDS_POOL[randomIndex]);
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    setCurrentWord(availableWords[randomIndex]);
  }, [learnedIds]);

  useEffect(() => {
    if (isVisible && !currentWord) {
      selectNewWord();
    }
  }, [isVisible, currentWord, selectNewWord]);

  const markAsLearned = () => {
    if (!currentWord) return;
    
    const newLearnedIds = [...learnedIds, currentWord.id];
    setLearnedIds(newLearnedIds);
    localStorage.setItem(`learned_words_${user?.uid || 'guest'}`, JSON.stringify(newLearnedIds));
    
    // Select next word
    selectNewWord();
    setIsExpanded(false);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isVisible || !currentWord) return null;

  return (
    <div className="relative">
      <motion.div 
        layout
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
          isExpanded ? 'bg-white border-indigo-200 ring-4 ring-indigo-50 w-64' : 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-1 bg-indigo-600 rounded-lg text-white">
          <GraduationCap size={14} />
        </div>
        
        {!isExpanded ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] font-bold text-indigo-900 whitespace-nowrap">{currentWord.word}</span>
            <span className="text-[10px] text-indigo-500 truncate">: {currentWord.meaning}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">Học từ mới</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <RefreshCw size={12} className="animate-spin-slow" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-72 bg-white rounded-2xl border border-indigo-100 shadow-2xl p-4 z-[100] overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />
            
            <div className="relative space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-indigo-900 leading-tight">{currentWord.word}</h3>
                  <p className="text-xs font-medium text-indigo-400 font-mono">{currentWord.phonetic}</p>
                </div>
                <button 
                  onClick={() => speak(currentWord.word)}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <BookOpen size={12} />
                    <span>Nghĩa tiếng Việt</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{currentWord.meaning}</p>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                    <Lightbulb size={12} />
                    <span>Ngữ cảnh áp dụng</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed italic">
                    "{currentWord.context}"
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                    <ExternalLink size={12} />
                    <span>Ví dụ</span>
                  </div>
                  <p className="text-[11px] text-indigo-900 font-medium">
                    {currentWord.example}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={markAsLearned}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <CheckCircle2 size={16} />
                  Đã nhớ từ này
                </button>
                <button
                  onClick={selectNewWord}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Đổi từ khác"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                <span>Tiến độ: {learnedIds.length} từ đã học</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
