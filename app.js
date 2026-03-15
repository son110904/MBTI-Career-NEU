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
  {
    key: "phan_tich_cac_chieu_tinh_cach",
    labels: [
      "PHÂN TÍCH CÁC CHIỀU TÍNH CÁCH", "PHAN TICH CAC CHIEU TINH CACH",
      "CẤU TRÚC TÍNH CÁCH", "CAU TRUC TINH CACH",
      "Ý NGHĨA CÁC CHIỀU TÍNH CÁCH", "Y NGHIA CAC CHIEU TINH CACH",
    ],
  },
  { key: "diem_manh", labels: ["ĐIỂM MẠNH", "DIEM MANH"] },
  { key: "diem_yeu", labels: ["ĐIỂM YẾU", "DIEM YEU", "HẠN CHẾ", "HAN CHE"] },
  { key: "moi_truong", labels: ["MÔI TRƯỜNG", "MOI TRUONG"] },
  {
    key: "nganh_nghe_tuong_ung",
    labels: [
      "NGÀNH, NGHỀ TƯƠNG ỨNG", "NGANH, NGHE TUONG UNG",
      "DANH MỤC NGÀNH VÀ NGHỀ NGHIỆP TƯƠNG ỨNG", "DANH MUC NGANH VA NGHE NGHIEP TUONG UNG",
    ],
  },
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

/**
 * Strip leading bullets/numbering from a single line.
 * Removes patterns like: 1. / 1) / (1) / - / • / 6.1.2.3
 */
function stripLeadingNumber(line) {
  return line
    .replace(/^\s*(\d+\.)+\d*\s+/g, "")
    .replace(/^\s*\d+[\.)\]\s]+/g, "")
    .replace(/^\s*\(\d+\)\s+/g, "")
    .replace(/^\s*[IVXLCDM]+\.\s+/gi, "")
    .replace(/^\s*[-–•]\s+/g, "");
}

/**
 * Clean generic section text: remove leading numbers/bullets from every line,
 * collapse multiple blank lines, trim.
 */
function cleanSectionText(text) {
  if (!text) return text;
  return text
    .split("\n")
    .map(stripLeadingNumber)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse the raw nganh_nghe_tuong_ung block into a clean formatted string.
 */
function cleanNganhNghe(text) {
  if (!text) return text;

  const ngheHeaderRe = /Ngh[eề]\s+nghi[eệ]p\s+t[uư][oơ]ng\s+[uứ]ng\s*[:\-]?\s*/i;
  const codeRe = /\(([\d][\w_.]*(?:_[\w.]+)*)\)/;

  // ── Detect if text is already in clean format ──
  // Clean format: has "Ngành tại NEU" heading AND no inline "Nghề nghiệp tương ứng:" on the same line as a code
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasCleanHeader = lines.some((l) => /^Ng[àa]nh\s+t[aạ]i\s+NEU/i.test(l));
  const hasRawInlineLines = lines.some((l) => codeRe.test(l) && ngheHeaderRe.test(l));

  if (hasCleanHeader && !hasRawInlineLines) {
    // Already clean — just ensure the closing sentence is present
    const closing = "Hy vọng có thể giúp bạn lựa chọn được định hướng phù hợp.";
    const hasClosing = lines.some((l) => l.includes("Hy vọng"));
    return hasClosing ? text.trim() : text.trim() + "\n\n" + closing;
  }

  // ── Parse raw format ──
  // Each line typically: "6.x.x Tên ngành (MãNgành) Nghề nghiệp tương ứng: Nghề1, Nghề2, ..."
  const nganhSet = new Map();
  const ngheSet = new Set();

  for (const line of lines) {
    const splitIdx = line.search(ngheHeaderRe);
    if (splitIdx > -1) {
      const nganhPart = line.slice(0, splitIdx).trim();
      const codeMatch = nganhPart.match(codeRe);
      if (codeMatch) {
        const code = codeMatch[1];
        const name = nganhPart
          .replace(codeRe, "")
          .replace(/^[\s\d\.]+/, "")
          .replace(/^Ng[àa]nh\s+/i, "")
          .trim();
        if (name && !nganhSet.has(code)) nganhSet.set(code, name);
      }
      const ngheHeaderMatch = line.match(ngheHeaderRe);
      const jobsPart = line.slice(splitIdx + (ngheHeaderMatch ? ngheHeaderMatch[0].length : 0)).trim();
      for (const job of jobsPart.split(/[,;]/)) {
        const j = job.replace(/\.?$/, "").trim();
        if (j) ngheSet.add(j);
      }
    }
  }

  const parts = [];
  if (nganhSet.size) {
    parts.push("Ngành tại NEU");
    for (const [code, name] of nganhSet) parts.push(`${name} (${code})`);
  }
  if (ngheSet.size) {
    parts.push("");
    parts.push("Nghề nghiệp tương ứng");
    for (const job of ngheSet) parts.push(job);
  }
  parts.push("");
  parts.push("Hy vọng có thể giúp bạn lựa chọn được định hướng phù hợp.");
  return parts.join("\n").trim();
}

function normalizeSections(sections) {
  if (!sections || typeof sections !== "object") return null;
  const normalized = {};
  for (const def of SECTION_DEFS) {
    const value = sections[def.key];
    if (typeof value === "string" && value.trim()) {
      if (def.key === "nganh_nghe_tuong_ung") {
        const cleaned = cleanNganhNghe(value);
        if (cleaned) normalized[def.key] = cleaned;
      } else {
        normalized[def.key] = cleanSectionText(value);
      }
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
            "Bạn là trợ lý trích xuất và định dạng thông tin MBTI. Chỉ trả về JSON hợp lệ theo schema được yêu cầu. Nếu không tìm thấy mục nào, để chuỗi rỗng.",
        },
        {
          role: "user",
          content:
            `Hãy trích xuất và định dạng các mục sau từ tài liệu về MBTI ${mbtiType}. Tuân thủ nghiêm ngặt các yêu cầu định dạng bên dưới.\n\n` +

            "## YÊU CẦU ĐỊNH DẠNG TỪNG MỤC\n\n" +

            `**ten_tinh_cach**: Chỉ lấy đúng mã loại tính cách (ví dụ: "${mbtiType}"). Không lấy tên mô tả, không lấy số thứ tự, không lấy gì khác.\n\n` +

            "**khai_niem**: Lấy đúng phần khái niệm/mô tả tổng quan về tính cách này. Bỏ tiêu đề mục, bỏ số thứ tự đầu dòng nếu có.\n\n" +

            "**phan_tich_cac_chieu_tinh_cach**: Lấy phần phân tích các chiều/cấu trúc tính cách. " +
            "Bỏ hoàn toàn các tiêu đề mục và số thứ tự đầu dòng (ví dụ: '1.', '2.', 'I.', 'II.' ...). " +
            "Giữ nguyên nội dung, trình bày rõ ràng từng chiều tính cách.\n\n" +

            "**diem_manh**: Lấy phần điểm mạnh (là mục số 3 trong tài liệu). " +
            "Bỏ tiêu đề mục và tất cả số thứ tự đầu dòng. Chỉ giữ nội dung.\n\n" +

            "**diem_yeu**: Lấy phần hạn chế (là mục số 4 trong tài liệu). " +
            "Bỏ tiêu đề mục và tất cả số thứ tự đầu dòng. Chỉ giữ nội dung.\n\n" +

            "**moi_truong**: Lấy phần môi trường làm việc phù hợp (thường là mục số 5 trong tài liệu). " +
            "Bỏ tiêu đề mục và tất cả số thứ tự đầu dòng. Chỉ giữ nội dung.\n\n" +

            "**nganh_nghe_tuong_ung**: Lấy toàn bộ danh mục ngành nghề trong tài liệu. "  +
            "Tài liệu có thể tổ chức theo nhiều lĩnh vực con, nhóm ngành — hãy gom tất cả lại. "  +
            "Định dạng output theo cấu trúc sau (chỉ text thuần, không markdown):\n" +
            "Ngành tại NEU\n" +
            "Tên ngành đầy đủ (Mã ngành)\n" +
            "Tên ngành đầy đủ (Mã ngành)\n" +
            "... (liệt kê hết tất cả ngành)\n" +
            "\n" +
            "Nghề nghiệp tương ứng\n" +
            "Liệt kê các nghề, mỗi nghề một dòng\n" +
            "\n" +
            "Hy vọng có thể giúp bạn lựa chọn được định hướng phù hợp.\n\n" +
            "TUYỆT ĐỐI không để lại: số thứ tự (6.1, 6.2.1...), tiêu đề lĩnh vực/nhóm ngành, từ 'Nghề nghiệp tương ứng:' inline sau tên ngành.\n\n" +

            "## TÀI LIỆU\n" +
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