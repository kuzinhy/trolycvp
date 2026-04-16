import { useState, useCallback, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { ToastType } from '../components/ui/Toast';

export interface PublicOpinion {
  id: string;
  content: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
  createdAt: any;
}

export interface LocalSituation {
  id: string;
  content: string;
  category: 'economic' | 'social' | 'security' | 'other';
  date: string;
  createdAt: any;
}

export interface StrategicAnalysis {
  id: string;
  analysis: string;
  suggestions: string[];
  createdAt: any;
}

export function useStrategicIntelligence(showToast: (message: string, type?: ToastType) => void) {
  const { user, unitId } = useAuth();
  const [opinions, setOpinions] = useState<PublicOpinion[]>([]);
  const [situations, setSituations] = useState<LocalSituation[]>([]);
  const [analyses, setAnalyses] = useState<StrategicAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const currentUnitId = unitId || 'default_unit';

    // Listen to Public Opinions
    const qOpinions = query(
      collection(db, 'public_opinion'),
      where('unitId', '==', currentUnitId)
    );
    const unsubscribeOpinions = onSnapshot(qOpinions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicOpinion));
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setOpinions(data);
    });

    // Listen to Local Situations
    const qSituations = query(
      collection(db, 'local_situation'),
      where('unitId', '==', currentUnitId)
    );
    const unsubscribeSituations = onSnapshot(qSituations, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocalSituation));
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setSituations(data);
    });

    // Listen to Strategic Analyses
    const qAnalyses = query(
      collection(db, 'strategic_analyses'),
      where('unitId', '==', currentUnitId)
    );
    const unsubscribeAnalyses = onSnapshot(qAnalyses, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StrategicAnalysis));
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setAnalyses(data);
    });

    return () => {
      unsubscribeOpinions();
      unsubscribeSituations();
      unsubscribeAnalyses();
    };
  }, [user, unitId]);

  const addOpinion = useCallback(async (content: string, source: string, sentiment: 'positive' | 'neutral' | 'negative') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'public_opinion'), {
        content,
        source,
        sentiment,
        date: new Date().toISOString().split('T')[0],
        unitId: unitId || 'default_unit',
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      showToast("Đã thêm dư luận xã hội", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi thêm dư luận", "error");
    }
  }, [user, unitId, showToast]);

  const addSituation = useCallback(async (content: string, category: 'economic' | 'social' | 'security' | 'other') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'local_situation'), {
        content,
        category,
        date: new Date().toISOString().split('T')[0],
        unitId: unitId || 'default_unit',
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      showToast("Đã thêm tình hình địa phương", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi thêm tình hình", "error");
    }
  }, [user, unitId, showToast]);

  const generateAnalysis = useCallback(async (news: any[]) => {
    if (!user || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const newsContext = news.slice(0, 5).map(n => `Tin tức/Chỉ thị: ${n.title}\nNội dung: ${n.content}`).join('\n\n');
      const opinionContext = opinions.slice(0, 5).map(o => `Dư luận (${o.sentiment}): ${o.content}`).join('\n\n');
      const situationContext = situations.slice(0, 5).map(s => `Tình hình (${s.category}): ${s.content}`).join('\n\n');

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Bạn là một chuyên gia tham mưu chiến lược cấp cao cho cơ quan Đảng và chính quyền địa phương.
            Nhiệm vụ của bạn là thực hiện một cuộc "Phân tích Tổng hợp Chiến lược" (Strategic Synthesis Analysis) dựa trên 3 nguồn dữ liệu:
            1. Tin tức & Chỉ thị cấp trên (News/Directives)
            2. Dư luận xã hội (Public Opinion)
            3. Tình hình thực tế địa phương (Local Situation)
            
            Dữ liệu đầu vào:
            --- TIN TỨC & CHỈ THỊ ---
            ${newsContext}
            
            --- DƯ LUẬN XÃ HỘI ---
            ${opinionContext}
            
            --- TÌNH HÌNH ĐỊA PHƯƠNG ---
            ${situationContext}
            
            Yêu cầu phân tích sâu:
            1. Mối quan hệ biện chứng: Phân tích xem các chỉ thị cấp trên có đang giải quyết đúng bức xúc của dư luận không? Tình hình địa phương có đang tạo thuận lợi hay cản trở việc thực hiện các chỉ thị đó?
            2. Phân tích xung đột & Đồng thuận: Chỉ ra các điểm mâu thuẫn giữa mong muốn của dân (dư luận) và yêu cầu của cấp trên (chỉ thị), hoặc giữa chỉ thị và nguồn lực thực tế (tình hình địa phương).
            3. Dự báo rủi ro: Nếu không có hành động kịp thời, sự kết hợp của các yếu tố này sẽ dẫn đến hệ quả gì (ví dụ: mất niềm tin, mất an ninh trật tự, đình trệ kinh tế)?
            4. Đề xuất tham mưu "Đúng & Trúng": Đưa ra ít nhất 5 hành động chiến lược. Mỗi hành động phải giải quyết được ít nhất 2 trong 3 nguồn dữ liệu trên (ví dụ: vừa thực hiện chỉ thị, vừa xoa dịu dư luận).
            
            Trả về kết quả dưới định dạng JSON:
            {
              "analysis": "Nội dung phân tích sâu sắc, có cấu trúc (Markdown format, sử dụng các tiêu đề, in đậm để làm nổi bật các điểm mấu chốt)",
              "suggestions": ["Hành động chiến lược 1 (Giải thích ngắn gọn tại sao)", "Hành động chiến lược 2...", ...]
            }`
          }]
        }],
        config: { responseMimeType: "application/json" }
      });

      const result = parseAIResponse(response.text);
      
      if (result && result.analysis) {
        await addDoc(collection(db, 'strategic_analyses'), {
          analysis: result.analysis,
          suggestions: result.suggestions || [],
          unitId: unitId || 'default_unit',
          authorId: user.uid,
          createdAt: serverTimestamp()
        });
      }

      showToast("Đã hoàn tất phân tích chiến lược", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi phân tích chiến lược", "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, unitId, opinions, situations, isAnalyzing, showToast]);

  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'strategic_analyses', id));
      showToast("Đã xóa bản phân tích", "info");
    } catch (e) {
      showToast("Lỗi khi xóa", "error");
    }
  }, [showToast]);

  return {
    opinions,
    situations,
    analyses,
    isAnalyzing,
    addOpinion,
    addSituation,
    generateAnalysis,
    deleteAnalysis
  };
}
