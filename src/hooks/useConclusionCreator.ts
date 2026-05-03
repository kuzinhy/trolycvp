import { useState, useCallback } from 'react';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';

export interface ConclusionSegment {
  id: string;
  rawText: string;
  selectedVersion: string;
  category: 'evaluation' | 'task' | 'organization' | 'general';
  timestamp: number;
}

export interface SuggestionVersion {
  id: number;
  content: string;
  title: string;
  reasoning?: string;
}

export function useConclusionCreator() {
  const [segments, setSegments] = useState<ConclusionSegment[]>([]);
  const [currentRawText, setCurrentRawText] = useState('');
  const [meetingType, setMeetingType] = useState('Họp thường kỳ');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [referencedKnowledgeIds, setReferencedKnowledgeIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [initialDraft, setInitialDraft] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDraftingInitial, setIsDraftingInitial] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionVersion[]>([]);
  const [finalAnnouncement, setFinalAnnouncement] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConcise, setIsConcise] = useState(false);

  const reset = useCallback(() => {
    setSegments([]);
    setCurrentRawText('');
    setMeetingTitle('');
    setProjectId('');
    setReferencedKnowledgeIds([]);
    setParticipants('');
    setSelectedParticipants([]);
    setInitialDraft('');
    setSuggestions([]);
    setFinalAnnouncement('');
    setIsConcise(false);
  }, []);

  const generateInitialDraft = useCallback(async (organization: string, aiKnowledge: any[]) => {
    if (!meetingTitle.trim()) return;
    
    setIsDraftingInitial(true);
    try {
      const knowledgeContext = aiKnowledge
        .slice(0, 15)
        .map(k => `- ${k.title}: ${k.content.substring(0, 400)}`)
        .join('\n');

      const prompt = `
        BẠN LÀ: Một Chuyên gia Tham mưu cao cấp cho Thường trực Đảng uỷ phường tại Việt Nam, am hiểu sâu sắc Quy định 66-QĐ/TW về thể thức văn bản của Đảng. 
        NHIỆM VỤ: Soạn thảo "Dàn ý Chiến lược và Nội dung Cốt lõi" cho Thông báo kết luận cuộc họp.
        PHONG CÁCH: Quyết liệt, thực chất, bám sát thực tiễn cơ sở, sử dụng ngôn ngữ chỉ đạo sắc bén của Đảng.

        THÔNG TIN CUỘC HỌP:
        - Đơn vị: ${organization}
        - Tên cuộc họp: ${meetingTitle}
        - Ngày họp: ${meetingDate}
        - Thành phần: ${participants}
        - Loại hình: ${meetingType}
        
        BỐI CẢNH ĐỊA PHƯƠNG & CHỈ ĐẠO CẤP TRÊN (Dữ liệu tri thức):
        ${knowledgeContext || "Sử dụng kiến thức nghiệp vụ tham mưu Đảng uỷ phường tiêu chuẩn và tinh thần Quy định 66-QĐ/TW."}

        YÊU CẦU CHI TIẾT:
        1. Xây dựng dàn ý 4 phần đúng chuẩn Quy định 66:
           - I. ĐÁNH GIÁ CHUNG: Phải nêu bật được kết quả đạt được và đặc biệt là những "điểm nghẽn", tồn tại tại cơ sở.
           - II. NHIỆM VỤ TRỌNG TÂM: Đưa ra các giải pháp cụ thể, có định hướng thực chất, không nói suông.
           - III. TỔ CHỨC THỰC HIỆN: Giao nhiệm vụ rõ người, rõ việc, rõ thời gian hoàn thành.
           - IV. KIẾN NGHỊ (nếu có).
        2. Dưới mỗi mục, viết 3-4 dòng nội dung mẫu có tính suy luận logic từ tên cuộc họp và bối cảnh địa phương.
        3. Tuyệt đối không dùng văn mẫu sáo rỗng. Hãy liên hệ với các nghị quyết, chỉ thị có trong tri thức nếu phù hợp.

        Sản phẩm: Văn bản thuần túy, có hệ thống mục rõ ràng, ngôn ngữ hành chính Đảng chuẩn mực theo Quy định 66-QĐ/TW.
      `;

      const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-exp",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      setInitialDraft(response.text || '');
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsDraftingInitial(false);
    }
  }, [meetingTitle, meetingDate, participants, meetingType]);

  const generateSuggestions = useCallback(async (rawText: string, organization: string, aiKnowledge: any[]) => {
    if (!rawText.trim()) return;
    
    setIsGenerating(true);
    setSuggestions([]);

    try {
      const knowledgeContext = aiKnowledge
        .slice(0, 20)
        .map(k => `- ${k.title || 'Văn bản'}: ${k.content.substring(0, 300)}...`)
        .join('\n');

      const conciseInstruction = isConcise 
        ? "CHẾ ĐỘ NGẮN GỌN: Hãy tập trung vào vấn đề chính, biểu đạt súc tích, dễ hiểu, lược bỏ rườm rà nhưng phải đảm bảo đầy đủ ý chí chỉ đạo của cấp uỷ."
        : "CHẾ ĐỘ TIÊU CHUẨN: Biên soạn chuyên nghiệp, chuẩn phong thái tham mưu, đầy đủ cả lý luận và thực tiễn, định hướng hành động rõ ràng.";

      const prompt = `
        BẠN LÀ: Trợ lý tham mưu cấp ủy thực chất, am hiểu sâu sắc về công tác Đảng, tình hình địa phương và Quy định 66-QĐ/TW. 
        VAI TRÒ: Một "bộ não" suy luận thông minh, hỗ trợ Thường trực Đảng uỷ ra quyết định và ban hành kết luận sắc bén, thực chất, chuẩn thể thức Đảng.

        BỐI CẢNH ĐƠN VỊ: ${organization}. 
        LOẠI HÌNH CHỈ ĐẠO: ${meetingType}.
        THÀNH PHẦN THAM DỰ: ${selectedParticipants.join(', ') || 'Cơ cấu thông thường'}.
        
        DỮ LIỆU THAM CHIẾU (Tri thức địa phương/Nghị quyết/Chỉ thị):
        ${knowledgeContext || "Sử dụng quy định chung về công tác Đảng cơ sở, Điều lệ Đảng và Quy định 66-QĐ/TW."}

        NỘI DUNG NGƯỜI DÙNG CUNG CẤP: "${rawText}"

        NHIỆM VỤ CHIẾN LƯỢC: 
        Dựa trên nội dung thảo luận thô và tri thức sẵn có, hãy suy luận logic để đưa ra 03 phương án biên tập văn bản chỉ đạo. 
        Đừng chỉ lặp lại ý kiến, hãy THAM MƯU: 
        - Nếu là đánh giá: Phải nhìn ra bản chất vấn đề, không né tránh khuyết điểm.
        - Nếu là nhiệm vụ: Phải cụ thể hóa thành "người - việc - thời gian", có tính khả thi.
        - Nếu là kiến nghị: Phải đúng thẩm quyền, rõ địa chỉ.

        ${conciseInstruction}

        MỖI PHƯƠNG ÁN CẦN:
        1. Title: Tiêu đề thể hiện rõ tinh thần chỉ đạo (ví dụ: "Chỉ đạo quyết liệt về GPMB").
        2. Content: Nội dung biên tập chuẩn văn phong Đảng theo Quy định 66-QĐ/TW (chuẩn mực, quyết liệt, trọng tâm).
        3. Reasoning: Giải thích lý do tại sao lại đề xuất hướng này (Ví dụ: "Bám sát Quy định 66-QĐ/TW và tình hình thực tế là...").

        ĐỊNH DẠNG JSON TRẢ VỀ:
        [
          {
            "id": 1, 
            "title": "...", 
            "content": "...", 
            "reasoning": "..."
          },
          ...
        ]
      `;

      const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-exp",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const result = parseAIResponse(response.text);
      setSuggestions(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [meetingType, isConcise, selectedParticipants]);

  const addSegment = useCallback((selectedVersion: string, category: ConclusionSegment['category'] = 'general') => {
    const newSegment: ConclusionSegment = {
      id: crypto.randomUUID(),
      rawText: currentRawText, // Capture the raw text that led to this segment
      selectedVersion,
      category,
      timestamp: Date.now(),
    };
    setSegments(prev => [...prev, newSegment]);
    // Note: We intentionally don't clear currentRawText and suggestions here
    // to allow users to pick multiple suggestions or fix the text and re-generate
  }, [currentRawText]);

  const updateSegment = useCallback((id: string, newContent: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, selectedVersion: newContent } : s));
  }, []);

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const generateFinalAnnouncement = useCallback(async (organization: string) => {
    if (segments.length === 0) return;

    setIsCompleting(true);
    try {
      const evaluation = segments.filter(s => s.category === 'evaluation').map(s => s.selectedVersion).join('\n');
      const tasks = segments.filter(s => s.category === 'task').map(s => s.selectedVersion).join('\n');
      const organizationTasks = segments.filter(s => s.category === 'organization').map(s => s.selectedVersion).join('\n');
      const others = segments.filter(s => s.category === 'general').map(s => s.selectedVersion).join('\n');

      const combinedContent = `
        BỐI CẢNH HÀNH CHÍNH (Tuân thủ Quy định 66-QĐ/TW):
        - Đơn vị ban hành: ${organization}
        - Chủ trì cuộc họp: Thường trực Đảng uỷ
        - Ngày họp: ${meetingDate}
        - Thành phần: ${participants}
        
        DÀN Ý ĐỊNH HƯỚNG:
        ${initialDraft || "Sử dụng dàn ý kết luận họp Đảng tiêu chuẩn theo Quy định 66-QĐ/TW."}

        CÁC NỘI DUNG CHỈ ĐẠO CHI TIẾT ĐÃ ĐƯỢC PHÊ DUYỆT:
        I. VỀ ĐÁNH GIÁ TÌNH HÌNH:
        ${evaluation || "Trên cơ sở báo cáo và ý kiến thảo luận, cuộc họp thống nhất đánh giá tình hình thực hiện nhiệm vụ vừa qua."}
        
        II. NHIỆM VỤ, GIẢI PHÁP TRỌNG TÂM:
        ${tasks || "Thực hiện đồng bộ các giải pháp trọng tâm sau:"}
        
        ${others ? `III. CÁC NỘI DUNG HƯỚNG DẪN KHÁC:\n${others}\n` : ""}
        
        IV. TỔ CHỨC THỰC HIỆN:
        ${organizationTasks || "Giao các chi bộ, ban ngành, đoàn thể phường căn cứ chức năng, nhiệm vụ để tổ chức thực hiện nghiêm túc kết luận này."}
      `;
      
      const prompt = `
        HÃY ĐÓNG VAI: Chánh Văn phòng Đảng uỷ phường, chuyên gia biên tập văn bản chỉ đạo cao cấp.
        NHIỆM VỤ: Hoàn thiện Thông báo kết luận cuộc họp "${meetingTitle}" của đơn vị "${organization}".
        XÁC TÍN VĂN BẢN: Phải tuyệt đối tuân thủ Quy định 66-QĐ/TW về thể thức văn bản của Đảng.

        YÊU CẦU BIÊN TẬP:
        1. KẾT CẤU: Chặt chẽ, logic, đúng chuẩn Quy định 66-QĐ/TW.
        2. NGÔN NGỮ: Sử dụng khẩu lệnh mạnh mẽ, mang tính hành động (như: "Yêu cầu", "Tập trung", "Kiên quyết", "Kịp thời").
        3. TIÊU ĐỀ CHUẨN ĐẢNG: "THÔNG BÁO Kết luận của Thường trực Đảng uỷ tại cuộc họp [${meetingTitle}]".
        4. TÍNH CHIẾN LƯỢC: Lồng ghép các nhiệm vụ bổ sung vào dàn ý định hướng một cách mượt mà, tạo thành một chỉnh thể văn bản thống nhất.
        5. ĐỊA PHƯƠNG: Ngôn ngữ phải sát với cấp phường/xã, thực chất, không vĩ mô hóa.

        NỘI DUNG DỮ LIỆU ĐỂ BIÊN TẬP:
        ${combinedContent}
      `;

      const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-exp",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      setFinalAnnouncement(response.text || '');
    } catch (error) {
      console.error('Error generating final announcement:', error);
    } finally {
      setIsCompleting(false);
    }
  }, [segments, meetingDate, participants, initialDraft, meetingTitle, meetingType]);

  return {
    segments,
    currentRawText,
    setCurrentRawText,
    meetingType,
    setMeetingType,
    meetingDate,
    setMeetingDate,
    meetingTitle,
    setMeetingTitle,
    participants,
    setParticipants,
    selectedParticipants,
    setSelectedParticipants,
    initialDraft,
    setInitialDraft,
    isGenerating,
    isDraftingInitial,
    generateInitialDraft,
    suggestions,
    generateSuggestions,
    addSegment,
    updateSegment,
    removeSegment,
    finalAnnouncement,
    setFinalAnnouncement,
    generateFinalAnnouncement,
    isCompleting,
    isConcise,
    setIsConcise,
    projectId,
    setProjectId,
    referencedKnowledgeIds,
    setReferencedKnowledgeIds,
    reset
  };
}
