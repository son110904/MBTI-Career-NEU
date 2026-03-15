/**
 * Backend MBTI-Career-NEU
 * Express + MinIO
 * Chạy: node server.js  (hoặc nodemon server.js)
 * Port: 4000
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as Minio from "minio";
import mammoth from "mammoth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ─────────────────────────── MinIO Client ───────────────────────────── */
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


/* ───────────────────────────── Middleware ───────────────────────────── */
app.use(cors());
app.use(express.json());

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

/** Đọc stream MinIO thành Buffer (dùng cho file .docx) */
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
 * Lấy dữ liệu tính cách từ MinIO (courses-processed/personality/Mô tả {MBTI}.docx),
 * trích xuất văn bản từ DOCX, trả về văn bản tư vấn cho tính cách đó.
 */
app.get("/api/ai-consultation", async (req, res) => {
  try {
    const mbtiType = (req.query.mbtiType || "").toUpperCase();
    if (!MBTI_TYPES.includes(mbtiType)) {
      return res.status(400).json({ error: "mbtiType không hợp lệ. Cần một trong 16 loại MBTI." });
    }

    const objectName = `courses-processed/personality/Mô tả ${mbtiType}.docx`;
    let personalityData = "";

    try {
      const dataStream = await minioClient.getObject(MINIO_BUCKET, objectName);
      const buffer = await streamToBuffer(dataStream);
      const result = await mammoth.extractRawText({ buffer });
      personalityData = (result.value || "").trim();
    } catch (minioErr) {
      console.error("[MinIO] Lỗi đọc file:", objectName, minioErr.message);
      return res.status(404).json({
        error: "Không tìm thấy dữ liệu tính cách cho " + mbtiType,
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
    console.error("[Consultation] Lỗi:", err.message);
    return res.status(500).json({
      error: "Loi khi tai tu van tu tai lieu.",
      detail: err.message,
    });
  }
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", service: "MBTI-NEU API" }));

// Production: phục vụ frontend đã build (dist/) và SPA fallback
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express v5 + path-to-regexp v6 doesn't accept bare "*"
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

/* ──────────────────────────── Khởi động ─────────────────────────────── */
app.listen(PORT, () => {
  console.log(`[Server] Đang chạy tại http://localhost:${PORT}`);
});
