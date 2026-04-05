import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import session from "express-session";
import { google } from "googleapis";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
  try {
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON.trim();
    if (keyJson.startsWith('{')) {
      const serviceAccount = JSON.parse(keyJson);
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY_JSON is not a valid JSON string. Skipping Firebase Admin initialization.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}
const dbAdmin = admin.apps.length ? admin.firestore() : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { reverseGeocode } from "./lib/geocoding.ts";
import { buildAreaProfile, generateQueries } from "./lib/areaProfile.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true
  }
}));

// Debug logger for API requests
app.use("/api", (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  next();
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // Increase to 20MB
});

// Test endpoint
app.get("/api/parse-document", (req, res) => {
  res.json({ message: "Endpoint is reachable" });
});

// Weather proxy endpoint with retry logic
app.get("/api/weather", async (req, res) => {
  const { query: queryParam } = req.query;
  const weatherQuery = (queryParam as string) || 'Thu Dau Mot';
  
  try {
    console.log(`Fetching weather for: ${weatherQuery}`);
    
    let latitude: number | null = null;
    let longitude: number | null = null;
    let locationName: string = weatherQuery;

    // Check if query is coordinates (lat,lng)
    const coordMatch = weatherQuery.match(/^([-+]?[\d.]+),\s*([-+]?[\d.]+)$/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
      console.log(`Parsed coordinates: ${latitude}, ${longitude}`);
      
      // Try to get a name for these coordinates
      try {
        const revGeo = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
          params: { lat: latitude, lon: longitude, format: 'json', "accept-language": 'vi' },
          headers: { 'User-Agent': 'TroLyBiThu/1.0' },
          timeout: 3000
        });
        if (revGeo.data && revGeo.data.display_name) {
          locationName = revGeo.data.display_name.split(',')[0];
        }
      } catch (e) {
        console.warn("Reverse geocoding failed, using coordinates as name");
      }
    } else {
      // 1. Geocode the query to get lat/lng
      try {
        const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
          params: { name: weatherQuery, count: 1, language: 'vi', format: 'json' },
          timeout: 5000
        });

        if (geoRes.data && geoRes.data.results && geoRes.data.results.length > 0) {
          latitude = geoRes.data.results[0].latitude;
          longitude = geoRes.data.results[0].longitude;
          locationName = geoRes.data.results[0].name;
          console.log(`Geocoded ${weatherQuery} to ${latitude}, ${longitude} (${locationName})`);
        }
      } catch (geoErr: any) {
        console.warn(`Geocoding failed for ${weatherQuery}: ${geoErr.message}`);
      }
    }

    // 2. Fetch weather from Open-Meteo if we have coordinates
    if (latitude !== null && longitude !== null) {
      try {
        const meteoRes = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
          params: {
            latitude,
            longitude,
            current_weather: true,
            hourly: 'temperature_2m,relative_humidity_2m,weather_code',
            timezone: 'auto'
          },
          timeout: 5000
        });

        if (meteoRes.data && meteoRes.data.current_weather) {
          const cw = meteoRes.data.current_weather;
          
          let wttrCode = "113"; // Clear
          let desc = "Trời quang đãng";
          
          if (cw.weathercode === 1 || cw.weathercode === 2 || cw.weathercode === 3) {
            wttrCode = "116"; // Partly cloudy
            desc = "Có mây";
          } else if (cw.weathercode === 45 || cw.weathercode === 48) {
            wttrCode = "143"; // Fog
            desc = "Sương mù";
          } else if (cw.weathercode >= 51 && cw.weathercode <= 67) {
            wttrCode = "266"; // Rain
            desc = "Có mưa";
          } else if (cw.weathercode >= 71 && cw.weathercode <= 77) {
            wttrCode = "326"; // Snow
            desc = "Có tuyết";
          } else if (cw.weathercode >= 80 && cw.weathercode <= 82) {
            wttrCode = "353"; // Rain showers
            desc = "Mưa rào";
          } else if (cw.weathercode >= 95 && cw.weathercode <= 99) {
            wttrCode = "389"; // Thunderstorm
            desc = "Có giông bão";
          }

          return res.json({
            current_condition: [{
              temp_C: Math.round(cw.temperature).toString(),
              weatherCode: wttrCode,
              weatherDesc: [{ value: desc }],
              lang_vi: [{ value: desc }],
              humidity: meteoRes.data.hourly?.relative_humidity_2m?.[0]?.toString() || "70",
              windspeedKmph: Math.round(cw.windspeed).toString(),
              observation_time: new Date().toLocaleTimeString()
            }],
            nearest_area: [{
              areaName: [{ value: locationName }],
              country: [{ value: "Vietnam" }]
            }]
          });
        }
      } catch (meteoErr: any) {
        console.warn(`Open-Meteo forecast failed: ${meteoErr.message}`);
      }
    }
    
    // Fallback to wttr.in
    console.log(`Trying wttr.in fallback for ${weatherQuery}...`);
    
    let responseData;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Use coordinates if available for wttr.in too
        const wttrQuery = (latitude !== null && longitude !== null) 
          ? `${latitude},${longitude}` 
          : encodeURIComponent(weatherQuery);

        const response = await axios.get(`https://wttr.in/${wttrQuery}?format=j1&lang=vi`, {
          headers: { 
            'Accept-Language': 'vi',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });
        
        responseData = response.data;
        if (responseData && typeof responseData === 'object' && responseData.current_condition) {
          break;
        }
        throw new Error("Invalid data format from wttr.in");
      } catch (err: any) {
        console.warn(`wttr.in attempt ${attempt} failed: ${err.message}. ${attempt < 3 ? 'Retrying...' : 'Giving up.'}`);
        if (attempt === 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    if (responseData) {
      return res.json(responseData);
    }
    
  } catch (error: any) {
    console.error("Weather proxy error:", error.message);
    // Return a fallback structure even on error to prevent frontend crashes
    res.json({
      current_condition: [{
        temp_C: "25",
        weatherCode: "113",
        weatherDesc: [{ value: "Clear" }],
        lang_vi: [{ value: "Trời quang đãng" }],
        humidity: "70",
        windspeedKmph: "10"
      }],
      nearest_area: [{
        areaName: [{ value: "Thu Dau Mot" }],
        country: [{ value: "Vietnam" }]
      }]
    });
  }
});

// Endpoint to fetch news from hcmcpv.org.vn
app.get("/api/fetch-news", async (req, res) => {
  const url = (req.query.url as string) || "https://www.hcmcpv.org.vn/";
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    res.json({ content: response.data });
  } catch (error: any) {
    console.error("Error fetching news:", error.message);
    res.status(500).json({ error: "Không thể tải tin tức từ trang web." });
  }
});

// Endpoint to parse text documents
app.post("/api/parse-document", (req, res, next) => {
  console.log(`Incoming POST request to /api/parse-document. Content-Type: ${req.headers['content-type']}`);
  next();
}, upload.single("file"), async (req: any, res: any) => {
  console.log("File received by multer:", req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : "No file");
  
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const text = req.file.buffer.toString("utf-8");

    if (!text || text.trim().length === 0) {
      console.warn("Extracted text is empty");
      return res.status(422).json({ error: "Tệp không chứa văn bản hoặc không thể trích xuất văn bản." });
    }

    res.json({ text });
  } catch (error: any) {
    console.error("General document parse error:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi phân tích tài liệu", details: error.message });
  }
});

// Helper function to create a branch if it doesn't exist
async function ensureBranchExists(owner: string, repo: string, branch: string, token: string) {
  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.log(`Branch ${branch} does not exist. Creating it...`);
      const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const defaultBranch = repoInfo.data.default_branch;
      
      const refInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sha = refInfo.data.object.sha;
      
      await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha: sha
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Successfully created branch ${branch}`);
    } else {
      throw e;
    }
  }
}

// Helper function to handle PUT requests and branch creation
async function putToGitHub(url: string, data: any, config: any, owner: string, repo: string, branch: string, token: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.put(url, data, config);
    } catch (error: any) {
      if (error.response?.status === 404 && error.response?.data?.message?.includes("Branch")) {
        console.log(`Branch ${branch} not found during PUT. Ensuring branch exists...`);
        await ensureBranchExists(owner, repo, branch, token);
        return await axios.put(url, data, config);
      }
      if (error.response?.status === 502 && attempt < retries) {
        console.warn(`GitHub API 502 Bad Gateway on PUT. Retrying attempt ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}

// Helper function to modify a JSON file on GitHub
async function modifyGitHubJsonFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
  commitMessage: string,
  modifier: (data: any) => any,
  retryOnConflict: boolean = false
) {
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&t=${Date.now()}`;
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  
  const performUpdate = async (retries = 3) => {
    let sha: string | undefined;
    let currentData: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const getRes = await axios.get(getUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
        });
        sha = getRes.data.sha;
        const content = Buffer.from(getRes.data.content, "base64").toString("utf-8");
        try {
          currentData = JSON.parse(content);
        } catch (e) {
          console.warn(`File ${filePath} is not valid JSON, resetting.`);
        }
        break; // Success, exit loop
      } catch (error: any) {
        if (error.response?.status === 404) {
          break; // File doesn't exist, which is fine
        }
        if (error.response?.status === 502 && attempt < retries) {
          console.warn(`GitHub API 502 Bad Gateway on GET. Retrying attempt ${attempt + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }

    const newData = modifier(currentData);
    
    // Invalidate cache on update
    const cacheKey = `${owner}/${repo}/${branch}/${filePath}`;
    delete githubCache[cacheKey];
    
    await putToGitHub(putUrl, {
      message: commitMessage,
      content: Buffer.from(JSON.stringify(newData, null, 2)).toString("base64"),
      sha,
      branch: branch,
    }, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    }, owner, repo, branch, token);
    
    return newData;
  };

  try {
    return await performUpdate();
  } catch (error: any) {
    if (retryOnConflict && error.response?.status === 409) {
      console.warn(`Conflict updating ${filePath}, retrying once...`);
      return await performUpdate();
    }
    throw error;
  }
}

// Simple in-memory cache for GitHub fetch requests
const githubCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds

// Helper function to fetch a JSON file from GitHub
async function fetchGitHubJsonFile(owner: string, repo: string, branch: string, filePath: string, token?: string, retries = 3) {
  const cacheKey = `${owner}/${repo}/${branch}/${filePath}`;
  const now = Date.now();

  if (githubCache[cacheKey] && (now - githubCache[cacheKey].timestamp < CACHE_TTL)) {
    console.log(`Serving ${filePath} from cache`);
    return githubCache[cacheKey].data;
  }

  const tryFetch = async (useToken: boolean, currentAttempt = 1): Promise<any> => {
    const headers: any = { Accept: "application/vnd.github.v3+json" };
    if (useToken && token && token.trim()) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Try GitHub API
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&t=${Date.now()}`;
      const res = await axios.get(apiUrl, { 
        headers,
        timeout: 10000 // 10 seconds timeout
      });
      
      if (res.data && res.data.content) {
        const content = Buffer.from(res.data.content, "base64").toString("utf-8");
        const data = JSON.parse(content);
        
        // Update cache
        githubCache[cacheKey] = { data, timestamp: Date.now() };
        
        return data;
      }
    } catch (apiError: any) {
      if (apiError.response?.status === 404) return null;
      if (apiError.response?.status === 403 && apiError.response?.headers?.['x-ratelimit-remaining'] === '0') {
        console.warn(`GitHub API rate limit hit for ${filePath}.`);
        // If we hit rate limit on API, we can still try Raw URL as it has different limits
        return null; // This will trigger the fallback to Raw URL
      }
      if (useToken && apiError.response?.status === 401) {
        console.warn(`GitHub API 401 for ${filePath} with token. Retrying without token...`);
        return await tryFetch(false, currentAttempt);
      }
      if (apiError.response?.status === 502 && currentAttempt < retries) {
        console.warn(`GitHub API 502 Bad Gateway on fetch. Retrying attempt ${currentAttempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * currentAttempt));
        return await tryFetch(useToken, currentAttempt + 1);
      }
      throw apiError;
    }

    // Fallback to Raw URL if API didn't return content
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?t=${Date.now()}`;
      const rawHeaders: any = {};
      if (useToken && token && token.trim()) {
        rawHeaders.Authorization = `Bearer ${token}`;
      }
      
      const rawRes = await axios.get(rawUrl, { 
        headers: rawHeaders,
        timeout: 10000 // 10 seconds timeout
      });
      let data = rawRes.data;
      
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error(`Failed to parse raw content as JSON for ${filePath}`);
          throw new Error("Dữ liệu không đúng định dạng JSON");
        }
      }

      // Update cache
      githubCache[cacheKey] = { data, timestamp: Date.now() };

      return data;
    } catch (rawError: any) {
      if (rawError.response?.status === 404) return null;
      if (useToken && rawError.response?.status === 401) {
        console.warn(`GitHub Raw 401 for ${filePath} with token. Retrying without token...`);
        return await tryFetch(false, currentAttempt);
      }
      if (rawError.response?.status === 502 && currentAttempt < retries) {
        console.warn(`GitHub Raw 502 Bad Gateway on fetch. Retrying attempt ${currentAttempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * currentAttempt));
        return await tryFetch(useToken, currentAttempt + 1);
      }
      throw rawError;
    }
  };

  return await tryFetch(!!token);
}

// GitHub API endpoint to save knowledge
app.post("/api/github/save", async (req, res) => {
  const { content, tags } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/knowledge.json", GITHUB_TOKEN, 
      `Update knowledge: ${content.substring(0, 50)}...`, 
      (data) => {
        const currentData = data || { knowledge: [] };
        // Handle migration from array of strings
        if (Array.isArray(currentData.knowledge) && currentData.knowledge.length > 0 && typeof currentData.knowledge[0] === 'string') {
          currentData.knowledge = currentData.knowledge.map((k: string) => ({ content: k, tags: [] }));
        }
        if (!currentData.knowledge) currentData.knowledge = [];
        currentData.knowledge.push({ content, tags: tags || [] });
        return currentData;
      },
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã lưu vào bộ nhớ GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to save the entire knowledge list (for reordering)
app.post("/api/github/save-knowledge-list", async (req, res) => {
  const { knowledge } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/knowledge.json", GITHUB_TOKEN,
      `Reorder knowledge list: ${knowledge.length} items`,
      () => ({ knowledge }),
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã lưu sắp xếp kiến thức vào GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to delete knowledge
app.delete("/api/github/delete", async (req, res) => {
  const { index } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/knowledge.json", GITHUB_TOKEN,
      `Delete knowledge at index ${index}`,
      (data) => {
        const currentData = data || { knowledge: [] };
        if (currentData.knowledge && currentData.knowledge[index] !== undefined) {
          currentData.knowledge.splice(index, 1);
        } else {
          throw new Error("Index not found");
        }
        return currentData;
      },
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã xóa khỏi bộ nhớ GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi xóa khỏi GitHub", details: error.message });
  }
});

// GitHub API endpoint to edit knowledge
app.put("/api/github/edit", async (req, res) => {
  const { index, content, tags } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/knowledge.json", GITHUB_TOKEN,
      `Edit knowledge at index ${index}`,
      (data) => {
        const currentData = data || { knowledge: [] };
        // Handle migration
        if (Array.isArray(currentData.knowledge) && currentData.knowledge.length > 0 && typeof currentData.knowledge[0] === 'string') {
          currentData.knowledge = currentData.knowledge.map((k: string) => ({ content: k, tags: [] }));
        }
        
        if (currentData.knowledge && currentData.knowledge[index] !== undefined) {
          currentData.knowledge[index] = { content, tags: tags || [] };
        } else {
          throw new Error("Index not found");
        }
        return currentData;
      },
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã cập nhật bộ nhớ GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi cập nhật GitHub", details: error.message });
  }
});

// GitHub API endpoint to log chat history
app.post("/api/github/log-chat", async (req, res) => {
  const { content, role } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/chat_history.json", GITHUB_TOKEN,
      `Log chat: ${role}`,
      (data) => {
        let history = Array.isArray(data) ? data : [];
        history.push({ role, content, timestamp: new Date().toISOString() });
        if (history.length > 500) history = history.slice(-500);
        return history;
      },
      true // retryOnConflict
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Log chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GitHub API endpoint to delete chat history item
app.delete("/api/github/delete-chat", async (req, res) => {
  const { index } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/chat_history.json", GITHUB_TOKEN,
      `Delete chat history at index ${index}`,
      (data) => {
        let history = Array.isArray(data) ? data : [];
        // The index from frontend is based on the reversed array
        const realIndex = history.length - 1 - index;
        if (realIndex >= 0 && realIndex < history.length) {
          history.splice(realIndex, 1);
        }
        return history;
      },
      true
    );
    res.json({ success: true, message: "Đã xóa khỏi bộ nhớ GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi xóa khỏi GitHub", details: error.message });
  }
});

// GitHub API endpoint to clear all chat history
app.delete("/api/github/clear-chat", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/chat_history.json", GITHUB_TOKEN,
      "Clear all chat history",
      () => [],
      true
    );
    res.json({ success: true, message: "Đã xóa toàn bộ lịch sử khỏi GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi xóa toàn bộ lịch sử khỏi GitHub", details: error.message });
  }
});

// GitHub API endpoint to save tasks
app.post("/api/github/save-tasks", async (req, res) => {
  const { tasks } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/tasks.json", GITHUB_TOKEN,
      `Update tasks: ${tasks.length} items`,
      () => ({ tasks }),
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã lưu nhiệm vụ vào GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to get tasks
app.get("/api/github/tasks", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/tasks.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || { tasks: [] });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi tải tasks từ GitHub" });
  }
});

// GitHub API endpoint to save meetings
app.post("/api/github/save-meetings", async (req, res) => {
  const { meetings } = req.body;
  console.log(`Saving ${meetings?.length} meetings to GitHub...`);
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is missing");
    return res.status(500).json({ 
      error: "Chưa cấu hình GITHUB_TOKEN.", 
      details: "Vui lòng cấu hình GITHUB_TOKEN trong biến môi trường để sử dụng tính năng lưu trữ đám mây." 
    });
  }

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/meetings.json", GITHUB_TOKEN,
      `Update meetings: ${meetings.length} items`,
      () => ({ meetings }),
      true // retryOnConflict
    );
    console.log("Successfully saved meetings to GitHub");
    res.json({ success: true, message: "Đã lưu lịch họp vào GitHub" });
  } catch (error: any) {
    console.error("GitHub API error saving meetings:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu lịch họp vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to get meetings
app.get("/api/github/meetings", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/meetings.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || { meetings: [] });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi tải lịch họp từ GitHub" });
  }
});

// GitHub API endpoint to get HCMCPV knowledge
app.get("/api/github/hcmcpv-knowledge", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/hcmcpv_knowledge.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || { knowledge: [] });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi tải tri thức HCMCPV từ GitHub" });
  }
});

// GitHub API endpoint to save HCMCPV knowledge
app.post("/api/github/save-hcmcpv", async (req, res) => {
  const { content, tags } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/hcmcpv_knowledge.json", GITHUB_TOKEN,
      `Update HCMCPV knowledge: ${content.substring(0, 50)}...`,
      (data) => {
        const currentData = data || { knowledge: [] };
        if (!currentData.knowledge) currentData.knowledge = [];
        currentData.knowledge.push({ content, tags: tags || [] });
        return currentData;
      },
      true
    );
    res.json({ success: true, message: "Đã lưu vào kho tri thức HCMCPV" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to get knowledge
app.get("/api/github/knowledge", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/knowledge.json";

  console.log(`Fetching knowledge from ${GITHUB_OWNER}/${GITHUB_REPO} on branch ${GITHUB_BRANCH}`);

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    if (!data) {
      console.warn("Knowledge file not found (404)");
      return res.json({ knowledge: [] });
    }
    res.json(data);
  } catch (error: any) {
    console.error("GitHub API error fetching knowledge:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Lỗi khi tải kiến thức từ GitHub", 
      details: error.response?.data?.message || error.message 
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GitHub API endpoint to get chat history
app.get("/api/github/chat-history", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/chat_history.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || []);
  } catch (error: any) {
    console.error("GitHub API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Lỗi khi tải lịch sử chat từ GitHub" });
  }
});

import { SECOND_BRAIN_URL } from "./src/constants.ts";

// ... (existing code)

// Proxy endpoint for Second Brain (Google Apps Script) to bypass CORS
app.get("/api/second-brain/sync", async (req, res) => {
  try {
    console.log("Syncing Second Brain from Apps Script...");
    const response = await axios.get(SECOND_BRAIN_URL, {
      timeout: 30000,
      maxRedirects: 5
    });
    
    // Apps Script usually returns JSON if configured correctly
    res.json(response.data);
  } catch (error: any) {
    console.error("Second Brain sync error:", error.message);
    res.status(500).json({ 
      error: "Không thể kết nối với Kho kiến thức thứ 2", 
      details: error.message 
    });
  }
});

// GitHub API endpoint to save birthdays
app.post("/api/github/save-birthdays", async (req, res) => {
  const { birthdays } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";

  if (!GITHUB_TOKEN) return res.status(500).json({ error: "Chưa cấu hình GITHUB_TOKEN." });

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/birthdays.json", GITHUB_TOKEN,
      `Update birthdays: ${birthdays.length} items`,
      () => ({ birthdays }),
      true // retryOnConflict
    );
    res.json({ success: true, message: "Đã lưu ngày sinh nhật vào GitHub" });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi lưu vào GitHub", details: error.message });
  }
});

// GitHub API endpoint to get birthdays
app.get("/api/github/birthdays", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "src";
  const GITHUB_FILE_PATH = "data/birthdays.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || { birthdays: [] });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi tải ngày sinh nhật từ GitHub" });
  }
});

// --- Google Drive Integration ---

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req: any, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    req.session.tokens = tokens;
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <h2 style="color: #059669;">Kết nối thành công!</h2>
            <p style="color: #64748b;">Cửa sổ này sẽ tự đóng sau giây lát...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/drive/status", (req: any, res) => {
  res.json({ connected: !!req.session.tokens });
});

app.post("/api/drive/sync", async (req: any, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: "Chưa kết nối Google Drive" });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || req.body.folderId;
  if (!folderId) {
    return res.status(400).json({ error: "Thiếu Folder ID" });
  }

  try {
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // List files in folder with modifiedTime
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, version)',
    });

    const files = response.data.files || [];
    const results = [];

    // Get sync history from Firestore if available
    let syncHistory: Record<string, string> = {};
    if (dbAdmin) {
      const historySnap = await dbAdmin.collection('drive_sync_history').get();
      historySnap.forEach(doc => {
        syncHistory[doc.id] = doc.data().modifiedTime;
      });
    }

    for (const file of files) {
      if (!file.id) continue;

      // Skip if file hasn't changed
      if (syncHistory[file.id] === file.modifiedTime) {
        console.log(`File ${file.name} already synced and unchanged.`);
        continue;
      }

      try {
        let content = "";
        if (file.mimeType === 'application/vnd.google-apps.document') {
          // Export Google Doc as text
          const exportRes = await drive.files.export({
            fileId: file.id!,
            mimeType: 'text/plain',
          });
          content = exportRes.data as string;
        } else if (file.mimeType === 'text/plain' || file.mimeType === 'application/pdf' || file.mimeType?.includes('word')) {
          // Download binary file
          const downloadRes = await drive.files.get({
            fileId: file.id!,
            alt: 'media',
          }, { responseType: 'arraybuffer' });
          
          const buffer = Buffer.from(downloadRes.data as ArrayBuffer);
          
          content = buffer.toString('utf-8');
        }

        if (content.trim()) {
          results.push({
            title: file.name,
            content: content.trim(),
            source: 'Google Drive',
            fileId: file.id,
            modifiedTime: file.modifiedTime
          });

          // Update sync history in Firestore
          if (dbAdmin) {
            await dbAdmin.collection('drive_sync_history').doc(file.id).set({
              name: file.name,
              modifiedTime: file.modifiedTime,
              syncedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      }
    }

    res.json({ success: true, filesSynced: results.length, data: results });
  } catch (error: any) {
    console.error("Drive Sync Error:", error);
    res.status(500).json({ error: "Lỗi khi đồng bộ Drive", details: error.message });
  }
});

app.get("/api/drive/search-sample-speech", async (req: any, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: "Chưa kết nối Google Drive" });
  }

  try {
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Search for file named "Bài phát biểu mẫu"
    const response = await drive.files.list({
      q: "name = 'Bài phát biểu mẫu' and trashed = false",
      fields: 'files(id, name, mimeType)',
    });

    const files = response.data.files || [];
    if (files.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy file 'Bài phát biểu mẫu' trên Drive" });
    }

    const file = files[0];
    let content = "";

    if (file.mimeType === 'application/vnd.google-apps.document') {
      const exportRes = await drive.files.export({
        fileId: file.id!,
        mimeType: 'text/plain',
      });
      content = exportRes.data as string;
    } else {
      const downloadRes = await drive.files.get({
        fileId: file.id!,
        alt: 'media',
      }, { responseType: 'arraybuffer' });
      
      const buffer = Buffer.from(downloadRes.data as ArrayBuffer);
      
      content = buffer.toString('utf-8');
    }

    res.json({ title: file.name, content: content.trim() });
  } catch (error: any) {
    console.error("Drive Search Error:", error);
    res.status(500).json({ error: "Lỗi khi tìm kiếm trên Drive", details: error.message });
  }
});

// --- Microsoft OneNote Integration ---

const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MS_REDIRECT_URI = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/onenote/callback`;

app.get("/api/auth/onenote/url", (req, res) => {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: MS_REDIRECT_URI,
    response_mode: 'query',
    scope: 'offline_access User.Read Notes.Read Notes.Read.All',
    prompt: 'consent'
  });
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  res.json({ url });
});

app.get("/api/auth/onenote/callback", async (req: any, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
      new URLSearchParams({
        client_id: MS_CLIENT_ID || '',
        client_secret: MS_CLIENT_SECRET || '',
        code: code as string,
        redirect_uri: MS_REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.msTokens = response.data;
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f9ff;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <h2 style="color: #2563eb;">Kết nối OneNote thành công!</h2>
            <p style="color: #64748b;">Cửa sổ này sẽ tự đóng sau giây lát...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'ONENOTE_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OneNote Auth Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/onenote/status", (req: any, res) => {
  res.json({ connected: !!req.session.msTokens });
});

app.post("/api/onenote/sync", async (req: any, res) => {
  if (!req.session.msTokens) {
    return res.status(401).json({ error: "Chưa kết nối Microsoft OneNote" });
  }

  try {
    const accessToken = req.session.msTokens.access_token;
    
    // Fetch OneNote pages
    // https://learn.microsoft.com/en-us/graph/api/onenote-list-pages
    const pagesRes = await axios.get('https://graph.microsoft.com/v1.0/me/onenote/pages', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        $select: 'id,title,lastModifiedDateTime,contentUrl',
        $top: 20,
        $orderby: 'lastModifiedDateTime desc'
      }
    });

    const pages = pagesRes.data.value || [];
    const results = [];

    for (const page of pages) {
      try {
        // Fetch page content (HTML format)
        const contentRes = await axios.get(`https://graph.microsoft.com/v1.0/me/onenote/pages/${page.id}/content`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        // Basic HTML to text conversion (OneNote content is HTML)
        const html = contentRes.data;
        const textContent = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        if (textContent) {
          results.push({
            title: page.title,
            content: textContent,
            source: 'OneNote',
            pageId: page.id,
            modifiedTime: page.lastModifiedDateTime
          });
        }
      } catch (pageErr) {
        console.error(`Error fetching OneNote page ${page.id}:`, pageErr);
      }
    }

    res.json({ success: true, pagesSynced: results.length, data: results });
  } catch (error: any) {
    console.error("OneNote Sync Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Lỗi khi đồng bộ OneNote", details: error.message });
  }
});

// Config endpoint to provide public GitHub details to the client
app.get("/api/config", (req, res) => {
  res.json({
    githubOwner: process.env.GITHUB_OWNER || "kuzinhy",
    githubRepo: process.env.GITHUB_REPO || "TroLyBiThu",
    githubBranch: process.env.GITHUB_BRANCH || "src",
  });
});

// API route for reverse geocoding (Identify Ward)
app.post("/api/reverse-geocode", async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Thiếu tọa độ latitude hoặc longitude." });
  }

  try {
    const result = await reverseGeocode(Number(latitude), Number(longitude));
    res.json(result);
  } catch (error: any) {
    console.error("Reverse geocoding error:", error.message);
    res.status(500).json({ error: "Lỗi khi xác định địa bàn.", details: error.message });
  }
});

// API route for preparing scan data (Area Profile & Queries)
app.post("/api/prepare-scan", async (req, res) => {
  const { latitude, longitude, customQuery } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Thiếu tọa độ latitude hoặc longitude." });
  }

  try {
    const area = await reverseGeocode(Number(latitude), Number(longitude));
    const profile = buildAreaProfile(area);
    const queries = generateQueries(profile, customQuery);

    res.json({
      gps_input: { latitude, longitude },
      detected_area: {
        ward: area.ward,
        district_or_city: area.district_or_city,
        province_or_city: area.province_or_city,
        formatted_address: area.formatted_address
      },
      area_profile: {
        aliases: profile.aliases,
        landmarks: profile.landmarks,
        roads: profile.roads,
        institutions: profile.institutions
      },
      queries_used: queries
    });
  } catch (error: any) {
    console.error("Prepare scan error:", error.message);
    res.status(500).json({ error: "Lỗi khi chuẩn bị dữ liệu quét.", details: error.message });
  }
});

// Legacy endpoint kept for compatibility if needed
app.post("/api/toxic-info/identify-ward", async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Thiếu tọa độ latitude hoặc longitude." });
  }

  try {
    const result = await reverseGeocode(Number(latitude), Number(longitude));
    res.json(result);
  } catch (error: any) {
    console.error("Reverse geocoding error:", error.message);
    res.status(500).json({ error: "Lỗi khi xác định địa bàn.", details: error.message });
  }
});

// API route for scanning news sources (Server-side logic preparation)
// Note: Gemini API calls are recommended on frontend per platform guidelines, 
// but we provide the structure for other server-side tasks here.
app.post("/api/toxic-info/scan-sources", async (req, res) => {
  const { wardInfo } = req.body;

  if (!wardInfo) {
    return res.status(400).json({ error: "Thiếu thông tin địa bàn để quét." });
  }

  try {
    console.log(`Scanning sources for: ${wardInfo.ward}`);
    
    // Simulating scanning process
    await new Promise(resolve => setTimeout(resolve, 1500));

    // This endpoint could be used to fetch raw data from various sources 
    // before sending it to Gemini on the frontend, or for other backend processing.
    
    res.json({ 
      status: "success", 
      message: "Đã chuẩn bị dữ liệu nguồn tin cho phân tích.",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Source scanning error:", error.message);
    res.status(500).json({ error: "Lỗi khi quét nguồn tin.", details: error.message });
  }
});

// Catch-all for unmatched API routes to prevent falling through to SPA fallback
app.all("/api/*", (req, res) => {
  console.warn(`Unmatched API request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.post("/api/remote-sync", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Thiếu URL đồng bộ" });

  try {
    const response = await axios.get(url);
    const data = response.data;
    
    if (!data || !data.data) {
      throw new Error("Dữ liệu từ Apps Script không hợp lệ hoặc rỗng");
    }

    res.json({ success: true, filesSynced: data.data.length, data: data.data });
  } catch (error: any) {
    console.error("Remote Sync Error:", error);
    res.status(500).json({ error: "Lỗi khi đồng bộ từ Apps Script", details: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
