/**
 * Express app (API only) for MBTI-Career-NEU
 * This file is used by both local server and Vercel serverless.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as Minio from "minio";
import mammoth from "mammoth";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* ------------------------------- Middleware ------------------------------ */
app.use(cors());
app.use(express.json());

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

/* ------------------------------ MinIO Client ----------------------------- */
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "203.113.132.48";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "8008", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "course2";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "course2-s3-uiauia";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "syllabus";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** Read stream to Buffer (for .docx) */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

const SECTION_DEFS = [
  { key: "ten_tinh_cach", labels: ["TÊN TÍNH CÁCH", "TEN TINH CACH"] },
  { key: "khai_niem", labels: ["KHÁI NIỆM", "KHAI NIEM"] },
  { key: "phan_tich_cac_chieu_tinh_cach", labels: ["PHÂN TÍCH CÁC CHIỀU TÍNH CÁCH", "PHAN TICH CAC CHIEU TINH CACH"] },
  { key: "diem_manh", labels: ["ĐIỂM MẠNH", "DIEM MANH"] },
  { key: "diem_yeu", labels: ["ĐIỂM YẾU", "DIEM YEU"] },
  { key: "moi_truong", labels: ["MÔI TRƯỜNG", "MOI TRUONG"] },
  { key: "nganh_nghe_tuong_ung", labels: ["NGÀNH, NGHỀ TƯƠNG ỨNG", "NGANH, NGHE TUONG UNG"] },
];

const LABEL_TO_KEY = (() => {
  const map = new Map();
  for (const def of SECTION_DEFS) {
    for (const label of def.labels) {
      map.set(normalizeHeading(label), def.key);
    }
  }
  return map;
})();

function normalizeHeading(input) {
  if (!input) return "";
  return input
    .replace(/^[\s\dIVXLCDM\.\)\-]+/gi, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractSectionsByHeadings(text) {
  const sections = {};
  let currentKey = null;
  let buffer = [];
  const lines = text.replace(/\r/g, "").split("\n");

  const flush = () => {
    if (!currentKey) return;
    const content = buffer.join("\n").trim();
    if (content) sections[currentKey] = content;
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentKey) buffer.push("");
      continue;
    }
    const normalized = normalizeHeading(line);
    let matchedKey = null;
    for (const [labelNorm, key] of LABEL_TO_KEY.entries()) {
      if (normalized === labelNorm || normalized.startsWith(`${labelNorm} `)) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      flush();
      currentKey = matchedKey;
      const remainder = line.split(/[:\-–—]/).slice(1).join(":").trim();
      if (remainder) buffer.push(remainder);
      continue;
    }

    if (currentKey) buffer.push(rawLine);
  }

  flush();
  return sections;
}

function normalizeSections(sections) {
  if (!sections || typeof sections !== "object") return null;
  const normalized = {};
  for (const def of SECTION_DEFS) {
    const value = sections[def.key];
    if (typeof value === "string" && value.trim()) {
      normalized[def.key] = value.trim();
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

async function extractSectionsWithAI(text, mbtiType) {
  if (!openaiClient) return null;
  try {
    const response = await openaiClient.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Ban la tro ly trich xuat thong tin. Chi tra ve JSON hop le theo schema. Neu khong co muc nao, de chuoi rong.",
        },
        {
          role: "user",
          content:
            `Hay trich xuat cac muc sau tu tai lieu ve MBTI ${mbtiType}: ` +
            "TEN TINH CACH, KHAI NIEM, PHAN TICH CAC CHIEU TINH CACH, DIEM MANH, DIEM YEU, MOI TRUONG, NGANH NGHE TUONG UNG.\n\n" +
            "Tai lieu:\n" +
            text,
        },
      ],
      format: {
        type: "json_schema",
        name: "mbti_extract",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ten_tinh_cach: { type: "string" },
            khai_niem: { type: "string" },
            phan_tich_cac_chieu_tinh_cach: { type: "string" },
            diem_manh: { type: "string" },
            diem_yeu: { type: "string" },
            moi_truong: { type: "string" },
            nganh_nghe_tuong_ung: { type: "string" },
          },
          required: [
            "ten_tinh_cach",
            "khai_niem",
            "phan_tich_cac_chieu_tinh_cach",
            "diem_manh",
            "diem_yeu",
            "moi_truong",
            "nganh_nghe_tuong_ung",
          ],
          additionalProperties: false,
        },
      },
    });

    const outputText = response.output_text || "";
    const parsed = JSON.parse(outputText);
    return normalizeSections(parsed);
  } catch (err) {
    console.error("[AI Extract] Loi:", err.message);
    return null;
  }
}

/**
 * GET /api/ai-consultation?mbtiType=INTJ
 * Fetches MBTI personality document from MinIO and returns extracted text.
 */
app.get("/api/ai-consultation", async (req, res) => {
  try {
    const mbtiType = (req.query.mbtiType || "").toUpperCase();
    if (!MBTI_TYPES.includes(mbtiType)) {
      return res.status(400).json({ error: "mbtiType khong hop le. Can mot trong 16 loai MBTI." });
    }

    const objectName = `courses-processed/personality/M\u00f4 t\u1ea3 ${mbtiType}.docx`;
    let personalityData = "";

    try {
      const dataStream = await minioClient.getObject(MINIO_BUCKET, objectName);
      const buffer = await streamToBuffer(dataStream);
      const result = await mammoth.extractRawText({ buffer });
      personalityData = (result.value || "").trim();
    } catch (minioErr) {
      console.error("[MinIO] Doc file loi:", objectName, minioErr.message);
      return res.status(404).json({
        error: "Khong tim thay du lieu tinh cach cho " + mbtiType,
        detail: minioErr.message,
      });
    }

    if (!personalityData) {
      return res.status(500).json({ error: "Du lieu DOCX trong hoac khong trich xuat duoc van ban." });
    }

    const text = personalityData.trim();
    if (!text) {
      return res.status(500).json({ error: "Du lieu DOCX trong hoac khong trich xuat duoc van ban." });
    }

    const heuristicSections = normalizeSections(extractSectionsByHeadings(text));
    const useAIParam = String(req.query.useAI || "").toLowerCase();
    const useAI = openaiClient && useAIParam !== "false";
    const aiSections = useAI ? await extractSectionsWithAI(text, mbtiType) : null;
    const sections = aiSections || heuristicSections;

    return res.json({
      mbtiType,
      consultation: text,
      sections,
      sections_source: aiSections ? "ai" : heuristicSections ? "heuristic" : "none",
    });
  } catch (err) {
    console.error("[Consultation] Loi:", err.message);
    return res.status(500).json({
      error: "Loi khi tai tu van tu tai lieu.",
      detail: err.message,
    });
  }
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", service: "MBTI-NEU API" }));

export default app;
