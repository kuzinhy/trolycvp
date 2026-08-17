// Client-side AI Utilities that securely communicate with our server-side API proxy.

// Custom definition of Type enum to replace client-side imports from @google/genai
export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

// Read AI preferences from localStorage
const getAIConfig = () => {
  try {
    const saved = localStorage.getItem('user-preferences');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        aiProvider: parsed.aiProvider || 'default_gemini',
        aiModel: parsed.aiModel || '',
        aiBaseUrl: parsed.aiBaseUrl || '',
        apiKeys: parsed.apiKeys || {}
      };
    }
  } catch (e) {
    console.error("Lỗi đọc cấu hình AI từ bộ nhớ trình duyệt:", e);
  }
  return {
    aiProvider: 'default_gemini',
    aiModel: '',
    aiBaseUrl: '',
    apiKeys: {}
  };
};

// Unified client-side function to generate content
export const generateContentWithRetry = async (params: any, retries = 3, delay = 2000) => {
  const config = getAIConfig();
  
  // Normalise legacy parameters if any
  if (params.generationConfig && !params.config) {
    params.config = params.generationConfig;
    delete params.generationConfig;
  }

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Delegate call to our secure Express server API
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ params, config })
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr;
        try {
          parsedErr = JSON.parse(errText);
        } catch(e) {}
        throw new Error(parsedErr?.error || `Lỗi kết nối máy chủ AI (${response.status}): ${errText}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`[SERVER GEMINI RETRY] Attempt ${attempt} failed for model ${params.model}. Error: ${err.message || String(err)}`);
      lastError = err;
      const isTransient = String(err).includes("503") || String(err).includes("429") || String(err).includes("UNAVAILABLE") || String(err).includes("high demand") || String(err).includes("temporary") || String(err).includes("Service Unavailable") || String(err).includes("404") || String(err).includes("not found");
      if (attempt < retries && isTransient) {
        // Dynamic fallback logic
        if (params.model === 'gemini-3.7-flash' || params.model === 'gemini-3.7-flash') {
           console.log(`[SERVER GEMINI RETRY] Falling back from ${params.model} to gemini-flash-latest`);
           params.model = 'gemini-flash-latest';
        } else if (params.model === 'gemini-flash-latest') {
           console.log(`[SERVER GEMINI RETRY] Falling back to gemini-3.1-flash-lite`);
           params.model = 'gemini-3.1-flash-lite';
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(1.5, attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError || new Error("Không thể kết nối đến máy chủ AI (generate)");
};

// Unified client-side function to stream content
export const generateContentStreamWithRetry = async (params: any, retries = 3, delay = 2000): Promise<any> => {
  const config = getAIConfig();

  if (params.generationConfig && !params.config) {
    params.config = params.generationConfig;
    delete params.generationConfig;
  }

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("/api/gemini/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ params, config })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Lỗi kết nối máy chủ AI Luồng (${response.status}): ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Không thể khởi tạo luồng dữ liệu (ReadableStream)");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = '';

      // Return an async iterator object that is compatible with 'for await...of' loops
      return {
        [Symbol.asyncIterator]: async function* () {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;

                if (cleanLine.startsWith('data: ')) {
                  try {
                    const jsonStr = cleanLine.slice(6);
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                    yield parsed;
                  } catch (e: any) {
                    if (e.message?.includes("Chưa") || e.message?.includes("Lỗi") || e.message?.includes("503") || e.message?.includes("UNAVAILABLE") || e.message?.includes("Service Unavailable")) {
                      throw e;
                    }
                    // Ignore incomplete SSE json chunk parses
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      };
    } catch (err: any) {
      console.warn(`[SERVER GEMINI STREAM RETRY] Attempt ${attempt} failed for model ${params.model}. Error: ${err.message || String(err)}`);
      lastError = err;
      const isTransient = String(err).includes("503") || String(err).includes("429") || String(err).includes("UNAVAILABLE") || String(err).includes("high demand") || String(err).includes("temporary") || String(err).includes("Service Unavailable") || String(err).includes("404") || String(err).includes("not found");
      if (attempt < retries && isTransient) {
        // Dynamic fallback logic
        if (params.model === 'gemini-3.7-flash' || params.model === 'gemini-3.7-flash') {
           console.log(`[SERVER GEMINI STREAM RETRY] Falling back from ${params.model} to gemini-flash-latest`);
           params.model = 'gemini-flash-latest';
        } else if (params.model === 'gemini-flash-latest') {
           console.log(`[SERVER GEMINI STREAM RETRY] Falling back to gemini-3.1-flash-lite`);
           params.model = 'gemini-3.1-flash-lite';
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(1.5, attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError || new Error("Không thể kết nối đến máy chủ AI (stream)");
};

export function getLocalFallbackResponse(query: string, meetings: any[], tasks: any[], events: any[], birthdays: any[], aiKnowledge: any[]): string {
  const normalizedQuery = query.toLowerCase();
  
  // 1. Check if user is asking about Schedule (Meetings, events, birthdays)
  const isAskingSchedule = /lịch|họp|nghị|sự kiện|ngày|bữa|sinh nhật|calendar|schedule|meeting/i.test(normalizedQuery);
  // 2. Check if user is asking about Tasks (nhiệm vụ, công việc)
  const isAskingTasks = /nhiệm vụ|công việc|tiến độ|trễ|pending|việc|báo cáo|task|work/i.test(normalizedQuery);
  // 3. Check if user is asking about general knowledge / guidelines / party documents
  const isAskingKnowledge = /tri thức|điều lệ|quy định|nghị quyết|văn bản|tài liệu|học tập|chỉ đạo|bộ não|brain|knowledge/i.test(normalizedQuery);

  let response = `🕵️‍♂️ **[Trợ lý Trí tuệ Ngoại tuyến Elite 8.0]**\n\n`;
  response += `*Kính gửi đồng chí Nguyễn Minh Huy, hệ thống đã kích hoạt **Bộ não Tri thức Cục bộ** thời gian thực của Văn phòng Đảng ủy để hỗ trợ tra cứu trực tiếp dữ liệu công tác cho đồng chí.* \n\n`;

  let matchedAny = false;

  if (isAskingSchedule) {
    matchedAny = true;
    response += `### 📅 TRA CỨU LỊCH CÔNG TÁC & SỰ KIỆN CỤC BỘ\n`;
    if (meetings && meetings.length > 0) {
      response += `**Các cuộc họp sắp tới:**\n`;
      meetings.slice(0, 5).forEach((m, idx) => {
        response += `${idx + 1}. **${m.time || ''} - ${m.date || ''}**: ${m.name || ''} tại *${m.location || 'Văn phòng'}*\n`;
      });
    } else {
      response += `- Hiện tại không có lịch họp nào được ghi nhận cục bộ.\n`;
    }
    
    if (events && events.length > 0) {
      response += `\n**Sự kiện quan trọng:**\n`;
      events.slice(0, 3).forEach((e, idx) => {
        response += `- Ngày ${e.date || ''}: ${e.name || ''}\n`;
      });
    }
    
    if (birthdays && birthdays.length > 0) {
      response += `\n**Sinh nhật trong tháng:**\n`;
      birthdays.slice(0, 3).forEach((b) => {
        response += `- Ngày ${b.date || ''}: Đồng chí **${b.name || ''}**\n`;
      });
    }
    response += `\n`;
  }

  if (isAskingTasks) {
    matchedAny = true;
    response += `### 📋 THEO DÕI NHIỆM VỤ & TIẾN ĐỘ CỤC BỘ\n`;
    if (tasks && tasks.length > 0) {
      const pending = tasks.filter(t => t.status !== 'Completed');
      const completed = tasks.filter(t => t.status === 'Completed');
      response += `- **Nhiệm vụ đang thực hiện (${pending.length}):**\n`;
      pending.slice(0, 5).forEach((t, idx) => {
        response += `  ${idx + 1}. **${t.title || ''}** (Hạn: ${t.deadline || 'Không có'}) - Trạng thái: *${t.status || 'Chưa thực hiện'}*\n`;
      });
      if (completed.length > 0) {
        response += `- **Nhiệm vụ đã hoàn thành:** ${completed.length} nhiệm vụ.\n`;
      }
    } else {
      response += `- Không có dữ liệu nhiệm vụ cục bộ.\n`;
    }
    response += `\n`;
  }

  if (isAskingKnowledge || !matchedAny) {
    // Try keyword searching inside local knowledge base
    const matches: any[] = [];
    if (aiKnowledge && aiKnowledge.length > 0) {
      aiKnowledge.forEach(k => {
        const titleMatch = k.title && k.title.toLowerCase().includes(normalizedQuery);
        const contentMatch = k.content && k.content.toLowerCase().includes(normalizedQuery);
        if (titleMatch || contentMatch) {
          matches.push(k);
        }
      });
    }

    if (matches.length > 0) {
      matchedAny = true;
      response += `### 🧠 KẾT QUẢ ĐỒNG BỘ TRI THỨC ĐẢNG ỦY\n`;
      response += `*Tìm thấy ${matches.length} tài liệu liên quan đến từ khóa của đồng chí:*\n\n`;
      matches.slice(0, 3).forEach((m, idx) => {
        response += `**${idx + 1}. ${m.title || 'Tài liệu tri thức'}** (Danh mục: ${m.category || 'Văn phòng'})\n`;
        const contentSnippet = m.content ? (m.content.substring(0, 350) + (m.content.length > 350 ? '...' : '')) : '';
        response += `> ${contentSnippet}\n\n`;
      });
    } else if (isAskingKnowledge) {
      response += `### 🧠 KHO TRI THỨC ĐẢNG ỦY\n`;
      response += `- Hệ thống chưa tìm thấy tài liệu cụ thể nào khớp hoàn toàn với truy vấn "${query}" của đồng chí. \n`;
      if (aiKnowledge && aiKnowledge.length > 0) {
        response += `**Một số tri thức Đảng ủy nổi bật có sẵn:**\n`;
        aiKnowledge.slice(0, 3).forEach((m, idx) => {
          response += `- **${m.title || 'Tài liệu'}**: ${m.content ? m.content.substring(0, 120) : ''}...\n`;
        });
      }
      response += `\n`;
    }
  }

  if (!matchedAny) {
    response += `### 💡 KIẾN NGHỊ THAM MƯU ĐIỀU HÀNH\n`;
    response += `- **Lịch trình**: Gõ *"Xem lịch họp"* hoặc *"Lịch công tác tuần"* để tra cứu lịch làm việc của văn phòng.\n`;
    response += `- **Nhiệm vụ**: Gõ *"Kiểm tra nhiệm vụ"* hoặc *"Tiến độ"* để xem chi tiết các đầu việc chưa hoàn thành.\n`;
    response += `- **Học tập điều lệ**: Gõ *"Quy định"* hoặc *"Điều lệ"* để truy vấn tài liệu chỉ đạo.\n\n`;
    response += `*Đồng chí có thể gửi lại câu hỏi sau ít giây khi máy chủ AI (Gemini) được phục hồi trạng thái hoạt động.*`;
  } else {
    response += `\n*Trích xuất thông tin an toàn từ Cơ sở dữ liệu Cục bộ của Hệ thống Chỉ huy Chiến lược Elite 8.0.*`;
  }

  return response;
}

export const parseAIResponse = (text: string) => {
  if (!text) return null;
  
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    const lines = cleanText.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop();
    }
    cleanText = lines.join('\n').trim();
  }
  
  let jsonCandidate = cleanText;
  const match = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) {
    jsonCandidate = match[0];
  }
 
  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    if (jsonCandidate.startsWith('[') && !jsonCandidate.endsWith(']')) {
      try {
        const repaired = jsonCandidate.replace(/,\s*[a-zA-Z0-9_"']+[\s:]*$/, '') + '}]';
        return JSON.parse(repaired);
      } catch (e2) {}
    }
    console.error("Lỗi phân tích cú pháp phản hồi AI JSON:", e, "Văn bản gốc:", text);
    throw new Error("Phản hồi từ mô hình AI không đúng định dạng cấu trúc dữ liệu yêu cầu.");
  }
};
