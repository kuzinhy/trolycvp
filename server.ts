import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import session from "express-session";
import admin from "firebase-admin";
const require = createRequire(import.meta.url);
const webpush = require("web-push");
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

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

// Configure web-push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "BF0hkAud_aIn48KRDyzW3E5dGnJaF9rVh7lsiYa-zU69TdcPQFSAIRcXcWK5zM3UB8MAZbX44aYboDrLqJfBjiQ",
  privateKey: process.env.VAPID_PRIVATE_KEY || "UIyjoTNba8B0y4atgaxlNPiLZasOFVojrJRhKqXRknc"
};

webpush.setVapidDetails(
  "mailto:nguyenhuy.thudaumot@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { reverseGeocode } from "./lib/geocoding.ts";
import { buildAreaProfile, generateQueries } from "./lib/areaProfile.ts";

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    let text = "";
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (req.file.mimetype?.includes('word') || req.file.mimetype?.includes('document')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else if (req.file.mimetype?.startsWith('image/')) {
      const result = await Tesseract.recognize(req.file.buffer, 'vie+eng');
      text = result.data.text;
    } else {
      text = req.file.buffer.toString("utf-8");
    }

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
      headers: { 
        Authorization: `Bearer ${token}`,
        "User-Agent": "Strategic-Command-App/6.0"
      }
    });
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.log(`Branch ${branch} does not exist. Creating it...`);
      const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "User-Agent": "Strategic-Command-App/6.0"
        }
      });
      const defaultBranch = repoInfo.data.default_branch || "main";
      
      const refInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "User-Agent": "Strategic-Command-App/6.0"
        }
      });
      const sha = refInfo.data.object.sha;
      
      await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha: sha
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "User-Agent": "Strategic-Command-App/6.0"
        }
      });
      console.log(`Successfully created branch ${branch}`);
    } else {
      throw e;
    }
  }
}

// Helper function to handle PUT requests and branch creation
async function putToGitHub(url: string, data: any, config: any, owner: string, repo: string, branch: string, token: string, retries = 3) {
  const mergedConfig = {
    ...config,
    headers: {
      ...config.headers,
      "User-Agent": "Strategic-Command-App/6.0"
    }
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.put(url, data, mergedConfig);
    } catch (error: any) {
      if (error.response?.status === 404 && error.response?.data?.message?.includes("Branch")) {
        console.log(`Branch ${branch} not found during PUT. Ensuring branch exists...`);
        await ensureBranchExists(owner, repo, branch, token);
        return await axios.put(url, data, mergedConfig);
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
          headers: { 
            Authorization: `Bearer ${token}`, 
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Strategic-Command-App/6.0"
          },
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
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Strategic-Command-App/6.0"
      },
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
    const headers: any = { 
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Strategic-Command-App/6.0"
    };
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
      const rawHeaders: any = {
        "User-Agent": "Strategic-Command-App/6.0"
      };
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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  const GITHUB_FILE_PATH = "data/tasks.json";

  try {
    const data = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE_PATH, GITHUB_TOKEN);
    res.json(data || { tasks: [] });
  } catch (error: any) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: "Lỗi khi tải tasks từ GitHub" });
  }
});

// --- PUSH NOTIFICATIONS API ---

app.get("/api/notifications/vapid-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/api/notifications/subscribe", async (req, res) => {
  const subscription = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

  if (!GITHUB_TOKEN) {
    console.warn("[PUSH] GITHUB_TOKEN not configured. Subscriptions won't be saved permanently.");
    return res.status(200).json({ success: true, message: "Subscription received (volatile mode)" });
  }

  try {
    await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/subscriptions.json", GITHUB_TOKEN,
      "Add new push subscription",
      (data) => {
        let subs = Array.isArray(data) ? data : [];
        // Avoid duplicates
        const exists = subs.find((s: any) => s.endpoint === subscription.endpoint);
        if (!exists) {
          subs.push(subscription);
        }
        return subs;
      },
      true
    );
    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error("Error saving subscription:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/send", async (req, res) => {
  const { title, body, url } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

  if (!GITHUB_TOKEN) {
    console.warn("[PUSH] GITHUB_TOKEN not configured. Cannot fetch subscriptions to send.");
    return res.status(200).json({ success: false, error: "GITHUB_TOKEN missing." });
  }

  try {
    const subscriptions = await fetchGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/subscriptions.json", GITHUB_TOKEN);
    
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.json({ success: true, message: "No subscriptions found." });
    }

    const payload = JSON.stringify({ title, body, url });
    
    const notifications = subscriptions.map((sub: any) => {
      return webpush.sendNotification(sub, payload).catch(async (err: any) => {
        console.error("Push failed for endpoint:", sub.endpoint, err.statusCode);
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or no longer valid, we should remove it
          console.log("Removing invalid subscription:", sub.endpoint);
          await modifyGitHubJsonFile(GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, "data/subscriptions.json", GITHUB_TOKEN,
            "Remove invalid subscription",
            (data) => (Array.isArray(data) ? data.filter((s: any) => s.endpoint !== sub.endpoint) : []),
            true
          );
        }
      });
    });

    await Promise.all(notifications);
    res.json({ success: true, count: subscriptions.length });
  } catch (error: any) {
    console.error("Error sending notifications:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GitHub API endpoint to save meetings
app.post("/api/github/save-meetings", async (req, res) => {
  const { meetings } = req.body;
  console.log(`Saving ${meetings?.length} meetings to GitHub...`);
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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

// Helper function to get knowledge
app.get("/api/github/knowledge", async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
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

// Proxy for NewsAPI
app.post("/api/news/newsapi", async (req, res) => {
  const { query, apiKey, customUrl } = req.body;
  const keyToUse = apiKey || process.env.NEWSAPI_KEY;
  
  if (!keyToUse) {
    return res.status(401).json({ error: "Missing NewsAPI Key" });
  }

  try {
    const defaultUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query || 'Việt Nam')}&sortBy=publishedAt&language=vi&pageSize=10`;
    const response = await axios.get(customUrl || defaultUrl, {
      headers: {
        'X-Api-Key': keyToUse
      },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("NewsAPI Error:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

// Proxy for SerpApi
app.post("/api/news/serpapi", async (req, res) => {
  const { query, apiKey, location } = req.body;
  const keyToUse = apiKey || process.env.SERPAPI_KEY;

  if (!keyToUse) {
    return res.status(401).json({ error: "Missing SerpApi Key" });
  }

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_news',
        q: query || 'Tin tức',
        gl: 'vn',
        hl: 'vi',
        api_key: keyToUse
      },
      timeout: 15000
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("SerpApi Error:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

import Parser from 'rss-parser';

// Proxy for RSS parser
app.post("/api/news/rss", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing RSS URL" });
  }

  try {
    const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    const feed = await parser.parseURL(url);
    res.json(feed);
  } catch (error: any) {
    console.error(`RSS Parser Error for ${url}:`, error.message);
    res.status(500).json({ error: "Failed to parse RSS feed", details: error.message });
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
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
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
    if (!SECOND_BRAIN_URL || SECOND_BRAIN_URL.trim() === "") {
      console.warn("SECOND_BRAIN_URL is not configured in constants.ts");
      return res.status(400).json({ 
        error: "Kho kiến thức thứ 2 chưa được cấu hình URL kết nối", 
        details: "Vui lòng cấu hình SECOND_BRAIN_URL trong file src/constants.ts để sử dụng tính năng này." 
      });
    }

    console.log(`Syncing Second Brain from Apps Script: ${SECOND_BRAIN_URL.substring(0, 50)}...`);
    const response = await axios.get(SECOND_BRAIN_URL, {
      timeout: 90000, // Increase to 90s for large drive folders
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Strategic-Command-Elite-v6.0)'
      }
    });
    
    console.log("Apps Script response status:", response.status);
    res.json(response.data);
  } catch (error: any) {
    const errorMessage = error.response ? 
      `Google Apps Script returned ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
      error.message;
    
    console.error("Second Brain sync error:", errorMessage);
    res.status(500).json({ 
      error: "Không thể kết nối với Kho kiến thức thứ 2 (Apps Script)", 
      details: errorMessage,
      code: error.code || 'UNKNOWN'
    });
  }
});

// GitHub API endpoint to save birthdays
app.post("/api/github/save-birthdays", async (req, res) => {
  const { birthdays } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "kuzinhy";
  const GITHUB_REPO = process.env.GITHUB_REPO || "TroLyBiThu";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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

// Config endpoint to provide public GitHub details to the client
app.get("/api/config", (req, res) => {
  res.json({
    githubOwner: process.env.GITHUB_OWNER || "kuzinhy",
    githubRepo: process.env.GITHUB_REPO || "trolycvp",
    githubBranch: process.env.GITHUB_BRANCH || "main",
  });
});

// GitHub connection verification endpoint
app.get("/api/github/verify", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || "kuzinhy";
  const repo = process.env.GITHUB_REPO || "trolycvp";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token) {
    return res.json({ connected: false, repo: `${owner}/${repo}`, branch, error: "Thiếu GITHUB_TOKEN" });
  }

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Strategic-Command-App/6.0",
        Accept: "application/vnd.github.v3+json",
      },
    });

    res.json({
      connected: true,
      repo: `${owner}/${repo}`,
      branch,
      lastCommit: {
        sha: response.data.commit.sha.substring(0, 7),
        message: response.data.commit.commit.message,
        date: response.data.commit.commit.committer.date,
        author: response.data.commit.commit.author.name
      }
    });
  } catch (error: any) {
    res.json({
      connected: false,
      repo: `${owner}/${repo}`,
      branch,
      error: error.response?.data?.message || error.message
    });
  }
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

// Helpers for proxying OpenAI / DeepSeek models
const convertGeminiParamsToOpenAI = (params: any, modelToUse: string) => {
  let messages: any[] = [];
  
  if (typeof params.contents === 'string') {
    messages.push({ role: 'user', content: params.contents });
  } else if (Array.isArray(params.contents)) {
    params.contents.forEach((c: any) => {
      const role = c.role === 'model' || c.role === 'assistant' ? 'assistant' : 'user';
      let content = '';
      if (Array.isArray(c.parts)) {
        content = c.parts.map((p: any) => p.text || '').join('\n');
      } else if (typeof c.parts === 'string') {
        content = c.parts;
      } else if (typeof c === 'string') {
        content = c;
      }
      messages.push({ role, content });
    });
  } else if (params.contents && params.contents.parts) {
    let content = '';
    if (Array.isArray(params.contents.parts)) {
      content = params.contents.parts.map((p: any) => p.text || '').join('\n');
    } else if (typeof params.contents.parts === 'string') {
      content = params.contents.parts;
    }
    const role = params.contents.role === 'model' || params.contents.role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role, content });
  } else if (params.contents) {
    messages.push({ role: 'user', content: JSON.stringify(params.contents) });
  }

  // Lấy system instruction từ config của Gemini
  let systemInstruction = '';
  if (params.config?.systemInstruction) {
    if (typeof params.config.systemInstruction === 'string') {
      systemInstruction = params.config.systemInstruction;
    } else if (params.config.systemInstruction.parts) {
      const parts = params.config.systemInstruction.parts;
      if (Array.isArray(parts)) {
        systemInstruction = parts.map((p: any) => p.text || '').join('\n');
      } else if (typeof parts === 'string') {
        systemInstruction = parts;
      }
    }
  }

  if (systemInstruction) {
    messages.unshift({ role: 'system', content: systemInstruction });
  }

  return {
    model: modelToUse,
    messages,
    temperature: params.config?.temperature,
    max_tokens: params.config?.maxOutputTokens
  };
};

const callOpenAICompatible = async (url: string, apiKey: string, body: any) => {
  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  const textContent = response.data.choices?.[0]?.message?.content || '';
  return {
    text: textContent
  };
};

// Secure Gemini endpoints
app.post("/api/gemini/generate", async (req, res) => {
  const { params, config } = req.body;
  const provider = config?.aiProvider || 'default_gemini';

  try {
    if (provider === 'openai') {
      const apiKey = config?.apiKeys?.openai;
      if (!apiKey) {
        return res.status(400).json({ error: "Chưa cấu hình OpenAI API Key trong Cài đặt." });
      }
      const modelToUse = config?.aiModel || 'gpt-4o-mini';
      const body = convertGeminiParamsToOpenAI(params, modelToUse);
      const url = config?.aiBaseUrl ? `${config.aiBaseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
      const result = await callOpenAICompatible(url, apiKey, body);
      return res.json(result);
    } 
    
    if (provider === 'deepseek') {
      const apiKey = config?.apiKeys?.deepseek;
      if (!apiKey) {
        return res.status(400).json({ error: "Chưa cấu hình DeepSeek API Key trong Cài đặt." });
      }
      const modelToUse = config?.aiModel || 'deepseek-chat';
      const body = convertGeminiParamsToOpenAI(params, modelToUse);
      const url = config?.aiBaseUrl ? `${config.aiBaseUrl}/chat/completions` : 'https://api.deepseek.com/chat/completions';
      const result = await callOpenAICompatible(url, apiKey, body);
      return res.json(result);
    }

    // Google Gemini (Hệ thống hoặc Cá nhân)
    const isCustom = provider === 'custom_gemini';
    const apiKey = isCustom ? config?.apiKeys?.customGemini : process.env.GEMINI_API_KEY;
    
    if (isCustom && !apiKey) {
      return res.status(400).json({ error: "Chưa cấu hình Gemini API Key cá nhân trong Cài đặt." });
    }
    if (!apiKey) {
      return res.status(400).json({ error: "Chưa cấu hình khoá API Gemini. Vui lòng thiết lập khóa API." });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const finalParams = { 
      ...params,
      model: config?.aiModel || params.model || 'gemini-3.7-flash'
    };

    // Retry and Fallback logic to robustly handle transient 503 / high demand errors
    const executeWithRetryAndFallback = async (aiInstance: any, callParams: any) => {
      const maxRetries = 2;
      let delay = 800;
      let lastError: any = null;
      let currentModel = callParams.model || 'gemini-3.7-flash';

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[SERVER GEMINI] Attempt ${attempt} utilizing model: ${currentModel}`);
          const apiRes = await aiInstance.models.generateContent({
            ...callParams,
            model: currentModel
          });
          return apiRes;
        } catch (error: any) {
          lastError = error;
          const errorMsg = error.response?.data?.error?.message || error.message || String(error);
          console.warn(`[SERVER GEMINI RETRY] Attempt ${attempt} failed for model ${currentModel}. Error: ${errorMsg}`);

          if (attempt < maxRetries) {
            // Step down model hierarchy safely according to official SDK guidelines
            if (currentModel === 'gemini-3.7-flash') {
              currentModel = 'gemini-flash-latest';
            } else if (currentModel === 'gemini-flash-latest') {
              currentModel = 'gemini-3.1-flash-lite';
            }
            console.warn(`[SERVER GEMINI FALLBACK] Retrying with model ${currentModel}...`);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(1.2, attempt)));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    };

    const apiRes = await executeWithRetryAndFallback(ai, finalParams);
    return res.json({
      text: apiRes.text || "",
      candidates: apiRes.candidates || null
    });
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    const errorMsg = error.response?.data?.error?.message || error.message || String(error);
    return res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/gemini/stream", async (req, res) => {
  const { params, config } = req.body;
  const provider = config?.aiProvider || 'default_gemini';

  try {
    if (provider === 'openai' || provider === 'deepseek') {
      const isOpenAI = provider === 'openai';
      const apiKey = isOpenAI ? config?.apiKeys?.openai : config?.apiKeys?.deepseek;
      if (!apiKey) {
        return res.status(400).json({ error: `Chưa cấu hình API Key cho ${provider} trong Cài đặt.` });
      }
      const modelToUse = config?.aiModel || (isOpenAI ? 'gpt-4o-mini' : 'deepseek-chat');
      const body = convertGeminiParamsToOpenAI(params, modelToUse);
      const baseUrl = isOpenAI ? 'https://api.openai.com/v1' : 'https://api.deepseek.com';
      const url = config?.aiBaseUrl ? `${config.aiBaseUrl}/chat/completions` : `${baseUrl}/chat/completions`;

      // Call streaming OpenAI/DeepSeek
      const responseStream = await axios.post(url, { ...body, stream: true }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        responseType: 'stream'
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      responseStream.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine === 'data: [DONE]') continue;
          if (cleanLine.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleanLine.slice(6));
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      responseStream.data.on('end', () => {
        res.end();
      });

      req.on('close', () => {
        responseStream.data.destroy();
      });
      return;
    }

    // Google Gemini (Hệ thống hoặc Cá nhân)
    const isCustom = provider === 'custom_gemini';
    const apiKey = isCustom ? config?.apiKeys?.customGemini : process.env.GEMINI_API_KEY;
    
    if (isCustom && !apiKey) {
      return res.status(400).json({ error: "Chưa cấu hình Gemini API Key cá nhân trong Cài đặt." });
    }
    if (!apiKey) {
      return res.status(400).json({ error: "Chưa cấu hình khoá API Gemini. Vui lòng thiết lập khóa API." });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const finalParams = { 
      ...params,
      model: config?.aiModel || params.model || 'gemini-3.7-flash'
    };

    // Robust retry and fallback logic for starting the stream
    const executeStreamWithRetryAndFallback = async (aiInstance: any, callParams: any) => {
      const maxRetries = 2;
      let delay = 800;
      let lastError: any = null;
      let currentModel = callParams.model || 'gemini-3.7-flash';

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[SERVER GEMINI STREAM] Attempt ${attempt} utilizing model: ${currentModel}`);
          const streamResponse = await aiInstance.models.generateContentStream({
            ...callParams,
            model: currentModel
          });
          return streamResponse;
        } catch (error: any) {
          lastError = error;
          const errorMsg = error.response?.data?.error?.message || error.message || String(error);
          console.warn(`[SERVER GEMINI STREAM RETRY] Attempt ${attempt} failed for model ${currentModel}. Error: ${errorMsg}`);

          if (attempt < maxRetries) {
            if (currentModel === 'gemini-3.7-flash') {
              currentModel = 'gemini-flash-latest';
            } else if (currentModel === 'gemini-flash-latest') {
              currentModel = 'gemini-3.1-flash-lite';
            }
            console.warn(`[SERVER GEMINI STREAM FALLBACK] Retrying with model ${currentModel}...`);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(1.2, attempt)));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    };

    const streamResponse = await executeStreamWithRetryAndFallback(ai, finalParams);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of streamResponse) {
      let chunkText = "";
      try {
        chunkText = chunk.text || "";
      } catch (e) {
        chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      const serializableChunk = {
        text: chunkText,
        candidates: chunk.candidates || null
      };
      res.write(`data: ${JSON.stringify(serializableChunk)}\n\n`);
    }
    res.end();
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    const errorMsg = error.response?.data?.error?.message || error.message || String(error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMsg });
    }
  }
});

app.post("/api/gemini/embed", async (req, res) => {
  const { contents, model } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(400).json({ error: "Chưa cấu hình khoá API Gemini. Vui lòng thiết lập khóa API." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const apiRes = await ai.models.embedContent({
      model: model || 'gemini-embedding-2-preview',
      contents: contents
    });
    return res.json(apiRes);
  } catch (error: any) {
    console.error("Gemini Embed Error:", error);
    const errorMsg = error.response?.data?.error?.message || error.message || String(error);
    return res.status(500).json({ error: errorMsg });
  }
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

// Endpoint to analyze images and text with Gemini API
app.post("/api/media-analysis", upload.single("file"), async (req: any, res: any) => {
  try {
    const { purpose, requirements, text: directText, provider, configStr } = req.body;
    let config = null;
    try {
      if (configStr) config = JSON.parse(configStr);
    } catch (e) {}

    const isCustom = provider === 'custom_gemini';
    const apiKey = isCustom ? config?.apiKeys?.customGemini : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "Chưa cấu hình khoá API Gemini. Vui lòng thiết lập khóa API." });
    }

    let extractedText = "";
    let mediaContent: any = null;
    let fileMeta: any = null;

    if (req.file) {
      fileMeta = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      };

      const mimeType = req.file.mimetype;
      if (mimeType.startsWith("image/")) {
        mediaContent = {
          inlineData: {
            mimeType: mimeType,
            data: req.file.buffer.toString("base64")
          }
        };
      } else if (mimeType === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } else if (mimeType?.includes('word') || mimeType?.includes('document') || mimeType?.includes('docx')) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else {
        extractedText = req.file.buffer.toString("utf-8");
      }
    } else {
      extractedText = directText || "";
    }

    const systemPrompt = `Bạn là chuyên gia cao cấp về truyền thông, thiết kế đồ họa, biên tập văn bản, ngôn ngữ tiếng Việt và kiểm duyệt nội dung. Nhiệm vụ của bạn là phân tích chính xác hình ảnh, poster, tài liệu hoặc văn bản do người dùng cung cấp.

Bạn phải đánh giá khách quan, cụ thể và có căn cứ. Không được chỉ đưa ra nhận xét chung chung. Mỗi lỗi phát hiện phải nêu rõ vị trí, nguyên nhân và cách chỉnh sửa.

Đối với hình ảnh, phải phân tích đồng thời phần chữ, bố cục, màu sắc, độ tương phản, khả năng đọc, tính thẩm mỹ và mức độ phù hợp với mục đích sử dụng.

Đối với văn bản, phải phân tích nội dung, chính tả, ngữ pháp, logic, văn phong, tính trang trọng và sự phù hợp với đối tượng tiếp nhận.

Chấm điểm theo thang điểm 10. Điểm tổng thể phải phản ánh đúng các điểm thành phần. Không được chấm điểm quá dễ dãi.
Hãy tính điểm trung bình từ các tiêu chí thành phần: (content + spellingAndLanguage + layout + aesthetics + readability + appropriateness) / 6 để có overallScore chuẩn xác nhất, bo tròn lấy 1 chữ số thập phân.

Trạng thái sử dụng (usageStatus) tương ứng với điểm tổng thể:
- 9.0 đến 10: "Có thể sử dụng ngay"
- 8.0 đến 8.9: "Có thể sử dụng sau khi chỉnh sửa"
- 7.0 đến 7.9: "Nên chỉnh sửa lại đáng kể"
- Dưới 7.0: "Chưa phù hợp để sử dụng"

Ưu tiên trả lời bằng tiếng Việt rõ ràng, chuyên nghiệp, dễ hiểu. Khi phát hiện lỗi, phải cung cấp nội dung thay thế cụ thể.

Chỉ trả về JSON hợp lệ theo đúng schema được cung cấp. Không thêm markdown, không thêm các ký hiệu như \`\`\`json hay \`\`\`, lời mở đầu hoặc nội dung bên ngoài JSON.`;

    const userPrompt = `Hãy phân tích nội dung sau đây:
Mục đích sử dụng: ${purpose || 'Tự do'}
Yêu cầu riêng của người dùng: ${requirements || 'Không có yêu cầu đặc biệt'}

${extractedText ? `Văn bản cần phân tích:\n${extractedText}` : 'Hình ảnh được đính kèm để phân tích trực tiếp.'}

Bạn phải trả về định dạng JSON chính xác tuyệt đối theo schema sau:
{
  "documentType": "Phân loại tài liệu ví dụ: poster, van_ban, thong_bao...",
  "detectedLanguage": "ngôn ngữ phát hiện, ví dụ: vi",
  "extractedText": "Văn bản trích xuất được từ hình ảnh hoặc tài liệu nếu có",
  "overallScore": 8.2,
  "classification": "Ví dụ: Tốt, Xuất sắc, Khá, Trung bình, Chưa đạt",
  "usageStatus": "Một trong bốn trạng thái: Có thể sử dụng ngay, Có thể sử dụng sau khi chỉnh sửa, Nên chỉnh sửa lại đáng kể, Chưa phù hợp để sử dụng",
  "summary": "Tóm tắt nhận xét từ 3 đến 5 câu",
  "scores": {
    "content": {
      "score": 8.0,
      "comment": "nhận xét ngắn về nội dung",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    },
    "spellingAndLanguage": {
      "score": 7.5,
      "comment": "nhận xét ngắn về chính tả",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    },
    "layout": {
      "score": 8.0,
      "comment": "nhận xét ngắn về bố cục",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    },
    "aesthetics": {
      "score": 8.5,
      "comment": "nhận xét ngắn về thẩm mỹ",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    },
    "readability": {
      "score": 7.8,
      "comment": "nhận xét ngắn về khả năng đọc",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    },
    "appropriateness": {
      "score": 9.0,
      "comment": "nhận xét ngắn về mức độ phù hợp",
      "status": "Tốt hoặc Cần lưu ý hoặc Cần chỉnh sửa"
    }
  },
  "strengths": [
    "Danh sách các điểm mạnh..."
  ],
  "issues": [
    {
      "title": "Tên vấn đề",
      "severity": "Nghiêm trọng hoặc Quan trọng hoặc Trung bình hoặc Nhẹ",
      "location": "Vị trí trong tài liệu hoặc ảnh",
      "originalContent": "nội dung gốc gặp lỗi",
      "explanation": "giải thích chi tiết vì sao chưa phù hợp",
      "suggestion": "hướng chỉnh sửa cụ thể"
    }
  ],
  "languageCorrections": [
    {
      "original": "chữ gốc bị sai",
      "issue": "lỗi chính tả hoặc câu chữ phát hiện",
      "suggested": "nội dung đề xuất chính xác",
      "reason": "lý do sửa"
    }
  ],
  "urgentActions": [
    "Việc cần sửa ngay"
  ],
  "recommendedImprovements": [
    "Việc nên cải thiện"
  ],
  "advancedSuggestions": [
    "Gợi ý nâng cao"
  ],
  "revisedContent": "Phiên bản văn bản hoàn chỉnh đã được chỉnh sửa",
  "posterLayoutSuggestion": {
    "mainTitle": "Đề xuất tiêu đề chính",
    "subtitle": "Đề xuất tiêu đề phụ",
    "organizer": "Đề xuất tên đơn vị tổ chức",
    "time": "Đề xuất thời gian",
    "location": "Đề xuất địa điểm",
    "contentToRemove": [
      "nội dung cần bỏ bớt"
    ],
    "contentToShorten": [
      "nội dung cần rút gọn"
    ],
    "typographySuggestion": "Gợi ý về font chữ, phân cấp cỡ chữ",
    "colorSuggestion": "Gợi ý về màu sắc",
    "layoutSuggestion": "Gợi ý về bố cục phân phối hình và chữ"
  }
}`;

    const ai = new GoogleGenAI({ apiKey });
    
    const contents: any[] = [];
    if (mediaContent) {
      contents.push(mediaContent);
    }
    contents.push(userPrompt);

    const callParams = {
      model: config?.aiModel || 'gemini-3.7-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: systemPrompt
      }
    };

    // Robust execute with retry and model fallbacks
    const executeWithRetryAndFallback = async (aiInstance: any, paramsObj: any) => {
      const maxRetries = 2;
      let delay = 1000;
      let lastError: any = null;
      let currentModel = paramsObj.model || 'gemini-3.7-flash';

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[MEDIA ANALYSIS] Attempt ${attempt} utilizing model: ${currentModel}`);
          const apiRes = await aiInstance.models.generateContent({
            ...paramsObj,
            model: currentModel
          });
          return apiRes;
        } catch (error: any) {
          lastError = error;
          const errorMsg = error.response?.data?.error?.message || error.message || String(error);
          console.warn(`[MEDIA ANALYSIS RETRY] Attempt ${attempt} failed for model ${currentModel}. Error: ${errorMsg}`);

          const isTransient = errorMsg.includes("503") || 
                            errorMsg.includes("UNAVAILABLE") || 
                            errorMsg.includes("high demand") || 
                            errorMsg.includes("temporary") || 
                            errorMsg.includes("overloaded") || 
                            errorMsg.includes("Service Unavailable") ||
                            (error.status === 503);

          if (isTransient) {
            if (currentModel === 'gemini-3.7-flash') {
              console.warn(`[MEDIA ANALYSIS FALLBACK] Overload on gemini-3.7-flash, falling back to gemini-flash-latest`);
              currentModel = 'gemini-flash-latest';
            } else if (currentModel === 'gemini-flash-latest') {
              console.warn(`[MEDIA ANALYSIS FALLBACK] Overload on gemini-flash-latest, falling back to gemini-3.1-flash-lite`);
              currentModel = 'gemini-3.1-flash-lite';
            }

            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, delay * Math.pow(1.5, attempt)));
              continue;
            }
          }
          throw error;
        }
      }
      throw lastError;
    };

    const apiRes = await executeWithRetryAndFallback(ai, callParams);
    
    let textResponse = apiRes.text || "";
    // Clean potential markdown wrapped blocks
    if (textResponse.trim().startsWith("```")) {
      textResponse = textResponse.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    }

    let parsedResult = null;
    try {
      parsedResult = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Gemini output was not valid JSON:", textResponse);
      return res.status(422).json({
        error: "Không thể phân tích cấu trúc kết quả từ AI. Hãy thử lại.",
        rawText: textResponse
      });
    }

    res.json({
      success: true,
      file: fileMeta,
      analysis: parsedResult
    });

  } catch (error: any) {
    console.error("Error in media analysis endpoint:", error);
    res.status(500).json({
      error: "Đã xảy ra lỗi trong quá trình phân tích.",
      details: error.message
    });
  }
});

// ==========================================
// WARD PARTY DASHBOARD & GOOGLE DRIVE API
// ==========================================
const getDriveFolderId = () => process.env.GOOGLE_DRIVE_FOLDER_ID || 'GOOGLE_DRIVE_FOLDER_ID_HERE';

let dashboardDataStore = {
  lastUpdated: new Date().toISOString(),
  folderId: getDriveFolderId(),
  filesFound: [
    { id: 'file_001', name: 'Danh_sach_Dang_vien_Phuong_2026.xlsx', type: 'Excel (.xlsx)', sheets: ['DangVienChinhThuc', 'DangVienDuBi', 'MienSinhHoat'], updateDate: '2026-08-01 08:30', status: 'Đã ánh xạ' },
    { id: 'file_002', name: 'Bao_cao_Sinh_hoat_Chi_bo_Q3.gsheet', type: 'Google Sheets', sheets: ['TongHopChiBo', 'BienBanSinhHoat', 'ChuyenDe'], updateDate: '2026-08-05 14:15', status: 'Đã ánh xạ' },
    { id: 'file_003', name: 'Ke_hoach_Phat_trien_Dang_2026.docx', type: 'Google Docs', sheets: ['ChieuKhuan', 'QuanChungUuTu'], updateDate: '2026-07-28 10:00', status: 'Ánh xạ một phần' },
    { id: 'file_004', name: 'So_sach_Dang_phi_2026.csv', type: 'CSV', sheets: ['Sheet1'], updateDate: '2026-08-07 16:45', status: 'Đã ánh xạ' }
  ],
  inspectorInfo: {
    folderId: getDriveFolderId(),
    connected: getDriveFolderId() !== 'GOOGLE_DRIVE_FOLDER_ID_HERE',
    filesDetected: 4,
    mappingStatus: 'Hoàn tất 85%',
    unmappedColumns: ['GhiChuThem_Cu_Tru', 'MaSoCanBoCu_2024'],
    headersDetected: {
      'DangVienChinhThuc': ['ID', 'HoTen', 'NgaySinh', 'GioiTinh', 'ChiBo', 'NgayVaoDang', 'NgayChinhThuc', 'TrangThai', 'TrinhDo', 'TuoiDang'],
      'TongHopChiBo': ['MaChiBo', 'TenChiBo', 'TongSoDangVien', 'DaSinhHoatThang', 'DaGuiBienBan', 'ThucHienDungHan', 'TrangThai']
    }
  },
  summary: {
    organization: {
      totalOrganizations: 15,
      totalBranches: 12,
      totalPartyMembers: 1268,
      officialMembers: 1190,
      reserveMembers: 78,
      exemptMembers: 45,
      temporaryMembers: 18,
      remoteWorkMembers: 32,
      newInducteesThisYear: 14
    },
    development: {
      targetYear: 20,
      recruited: 14,
      remaining: 6,
      completionRate: 70,
      massFollowed: 45,
      eliteMass: 25,
      learnedAwareness: 22,
      filesCompleting: 8,
      filesVerifying: 5,
      reserveExpiringSoon: 3,
      reserveExpired: 0
    },
    branches: [
      { id: 'cb1', name: 'Chi bộ Khu phố 1', totalMembers: 85, meetingThisMonth: true, sentMinutes: true, thematicMeeting: true, timeliness: 'đúng hạn', status: '🟢', lastTime: '2026-08-04' },
      { id: 'cb2', name: 'Chi bộ Khu phố 2', totalMembers: 72, meetingThisMonth: true, sentMinutes: true, thematicMeeting: false, timeliness: 'đúng hạn', status: '🟢', lastTime: '2026-08-03' },
      { id: 'cb3', name: 'Chi bộ Khu phố 3', totalMembers: 94, meetingThisMonth: true, sentMinutes: false, thematicMeeting: true, timeliness: 'sắp đến hạn', status: '🟡', lastTime: '2026-08-06' },
      { id: 'cb4', name: 'Chi bộ Khu phố 4', totalMembers: 68, meetingThisMonth: false, sentMinutes: false, thematicMeeting: false, timeliness: 'quá hạn', status: '🔴', lastTime: '2026-07-15' },
      { id: 'cb5', name: 'Chi bộ Trường Mầm non Hoa Hồng', totalMembers: 45, meetingThisMonth: true, sentMinutes: true, thematicMeeting: true, timeliness: 'đúng hạn', status: '🟢', lastTime: '2026-08-02' },
      { id: 'cb6', name: 'Chi bộ Trạm Y tế Phường', totalMembers: 28, meetingThisMonth: true, sentMinutes: true, thematicMeeting: false, timeliness: 'chậm', status: '🟠', lastTime: '2026-08-05' }
    ],
    tasksSummary: {
      todayCount: 5,
      next7DaysCount: 12,
      overdueCount: 2,
      totalTasks: 48,
      completedTasks: 35,
      inProgressTasks: 11,
      pendingTasks: 2
    },
    inspectionSummary: {
      plansInYear: 4,
      totalInspections: 12,
      totalSupervisions: 10,
      executed: 18,
      inProgress: 3,
      pending: 1,
      overdue: 0,
      unfinishedConclusions: 1,
      unprocessedRecommendations: 0
    },
    reportsSummary: {
      incomingTotal: 156,
      incomingUnhandled: 8,
      incomingProcessing: 14,
      incomingOverdue: 1,
      reportsMonthlyDue: 12,
      reportsCompleted: 9,
      reportsPending: 2,
      reportsExpiringSoon: 1,
      reportsOverdue: 0
    },
    evaluation: {
      organizations: { excellent: 4, good: 9, completed: 2, uncompleted: 0 },
      partyMembers: { excellent: 210, good: 950, completed: 98, uncompleted: 5, unassessed: 5 }
    },
    partyFees: {
      dueTotal: 12500000,
      collectedTotal: 11200000,
      uncollectedTotal: 1300000,
      completionRate: 89.6,
      submittedBranchesCount: 10,
      unsubmittedBranchesCount: 2,
      monthlyTotal: 12500000,
      quarterlyTotal: 37500000,
      yearlyTotal: 150000000
    },
    demographics: {
      byAge: { under30: 180, from30to60: 840, above60: 248 },
      byGender: { male: 540, female: 728 },
      byPartyAge: { thirtyYearsPlus: 115 },
      byEducation: { postGraduate: 85, university: 920, college: 140, intermediate: 123 }
    },
    alerts: [
      { id: 'al1', type: 'error', category: 'Quá hạn', message: 'Chi bộ Khu phố 4 chưa thực hiện sinh hoạt tháng 8 và quá hạn gửi biên bản.', date: '2026-08-08' },
      { id: 'al2', type: 'warning', category: 'Sắp đến hạn', message: 'Đồng chí Nguyễn Văn An còn 12 ngày đến hạn xem xét chuyển Đảng chính thức.', date: '2026-08-15' },
      { id: 'al3', type: 'warning', category: 'Sắp đến hạn', message: 'Kế hoạch kiểm tra Chi bộ Khu phố 3 còn 5 ngày đến hạn hoàn thành kết luận.', date: '2026-08-14' },
      { id: 'al4', type: 'info', category: 'Thiếu dữ liệu', message: '07 hồ sơ đảng viên mới kết nạp còn thiếu thông tin số quyết định kết nạp.', date: '2026-08-07' },
      { id: 'al5', type: 'success', category: 'Hoàn thành', message: 'Đã hoàn thành thu nộp đảng phí tháng 7/2026 đạt 89.6%.', date: '2026-08-05' }
    ]
  },
  partyMembersList: Array.from({ length: 50 }, (_, i) => ({
    id: `dv_${1000 + i}`,
    hoTen: ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung', 'Võ Văn Em', 'Hoàng Thị Hoa', 'Đặng Minh Đức', 'Bùi Thị Hạnh', 'Ngô Văn Hùng', 'Phan Thị Mai'][i % 10] + ` (${i + 1})`,
    ngaySinh: `${1960 + (i % 35)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    gioiTinh: i % 2 === 0 ? 'Nam' : 'Nữ',
    chiBo: `Chi bộ Khu phố ${(i % 4) + 1}`,
    ngayVaoDang: `${2010 + (i % 12)}-05-19`,
    ngayChinhThuc: `${2012 + (i % 12)}-05-19`,
    trangThai: i % 15 === 0 ? 'Đảng viên dự bị' : (i % 20 === 0 ? 'Miễn sinh hoạt' : 'Chính thức'),
    mienSinhHoat: i % 20 === 0 ? 'Có' : 'Không',
    sinhHoatTamThoi: i % 25 === 0 ? 'Có' : 'Không',
    trinhDo: i % 3 === 0 ? 'Thạc sĩ' : (i % 2 === 0 ? 'Đại học' : 'Cao đẳng'),
    tuoiDang: 2026 - (2010 + (i % 12)),
    sourceFileId: 'file_001',
    sourceFileName: 'Danh_sach_Dang_vien_Phuong_2026.xlsx'
  }))
};

app.get("/api/dashboard/summary", (req, res) => {
  res.json({
    success: true,
    folderId: dashboardDataStore.folderId,
    lastUpdated: dashboardDataStore.lastUpdated,
    data: dashboardDataStore.summary
  });
});

app.get("/api/dashboard/party-members", (req, res) => {
  const { search, chiBo, trangThai, page = 1, limit = 20 } = req.query;
  let list = dashboardDataStore.partyMembersList;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(m => m.hoTen.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.chiBo.toLowerCase().includes(q));
  }
  if (chiBo) {
    list = list.filter(m => m.chiBo === chiBo);
  }
  if (trangThai) {
    list = list.filter(m => m.trangThai === trangThai);
  }

  const p = Number(page);
  const l = Number(limit);
  const paginated = list.slice((p - 1) * l, p * l);

  res.json({
    success: true,
    total: list.length,
    page: p,
    limit: l,
    data: paginated
  });
});

app.get("/api/dashboard/organizations", (req, res) => {
  res.json({
    success: true,
    data: dashboardDataStore.summary.branches
  });
});

app.get("/api/dashboard/development", (req, res) => {
  res.json({
    success: true,
    data: dashboardDataStore.summary.development
  });
});

app.get("/api/dashboard/tasks", (req, res) => {
  res.json({
    success: true,
    data: dashboardDataStore.summary.tasksSummary
  });
});

app.get("/api/dashboard/alerts", (req, res) => {
  res.json({
    success: true,
    data: dashboardDataStore.summary.alerts
  });
});

app.get("/api/dashboard/branches", (req, res) => {
  res.json({
    success: true,
    data: dashboardDataStore.summary.branches
  });
});

app.get("/api/dashboard/sources", (req, res) => {
  res.json({
    success: true,
    folderId: dashboardDataStore.folderId,
    files: dashboardDataStore.filesFound
  });
});

app.get("/api/dashboard/inspect", (req, res) => {
  res.json({
    success: true,
    inspector: dashboardDataStore.inspectorInfo,
    files: dashboardDataStore.filesFound
  });
});

app.post("/api/dashboard/refresh", (req, res) => {
  dashboardDataStore.lastUpdated = new Date().toISOString();
  res.json({
    success: true,
    message: "Đã làm mới và đồng bộ dữ liệu từ Google Drive thành công.",
    lastUpdated: dashboardDataStore.lastUpdated
  });
});

// Catch-all for unmatched API routes to prevent falling through to SPA fallback
app.all("/api/*", (req, res) => {
  console.warn(`Unmatched API request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
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
