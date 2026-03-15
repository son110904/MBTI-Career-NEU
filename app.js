/**
 * Express app (API only) for MBTI-Career-NEU
 * This file is used by both local server and Vercel serverless.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as Minio from "minio";
import mammoth from "mammoth";

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

/** Read stream to Buffer (for .docx) */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
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

    return res.json({ mbtiType, consultation: text });
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
