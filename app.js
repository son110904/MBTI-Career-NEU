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
  { key: "ten_tinh_cach", labels: ["TEN TINH CACH", "TINH CACH"] },
  { key: "khai_niem", labels: ["KHAI NIEM"] },
  {
    key: "phan_tich_cac_chieu_tinh_cach",
    labels: [
      "PHAN TICH CAC CHIEU TINH CACH",
      "CAU TRUC TINH CACH",
      "Y NGHIA CAC CHIEU TINH CACH",
    ],
  },
  { key: "diem_manh", labels: ["DIEM MANH", "UU DIEM"] },
  { key: "diem_yeu", labels: ["DIEM YEU", "HAN CHE", "NHUOC DIEM"] },
  { key: "moi_truong", labels: ["MOI TRUONG", "MOI TRUONG LAM VIEC PHU HOP"] },
  {
    key: "nganh_nghe_tuong_ung",
    labels: [
      "NGANH NGHE TUONG UNG",
      "DANH MUC NGANH VA NGHE NGHIEP TUONG UNG",
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
      const remainder = line.split(/[:\-â€“â€”]/).slice(1).join(":").trim();
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
 * Removes patterns like: 1. / 1) / (1) / - / â€¢ / 6.1.2.3
 */
function stripLeadingNumber(line) {
  return line
    .replace(/^\s*(\d+\.)+\d*\s+/g, "")
    .replace(/^\s*\d+[\.)\]\s]+/g, "")
    .replace(/^\s*\(\d+\)\s+/g, "")
    .replace(/^\s*[IVXLCDM]+\.\s+/gi, "")
    .replace(/^\s*[-â€“â€¢]\s+/g, "");
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

  const ngheHeaderRe = /Ngh[eá»]\s+nghi[eá»‡]p\s+t[uÆ°][oÆ¡]ng\s+[uá»©]ng\s*[:\-]?\s*/i;
  const codeRe = /\(([\d][\w_.]*(?:_[\w.]+)*)\)/;

  // â”€â”€ Detect if text is already in clean format â”€â”€
  // Clean format: has "NgÃ nh táº¡i NEU" heading AND no inline "Nghá» nghiá»‡p tÆ°Æ¡ng á»©ng:" on the same line as a code
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasCleanHeader = lines.some((l) => /^Ng[Ã a]nh\s+t[aáº¡]i\s+NEU/i.test(l));
  const hasRawInlineLines = lines.some((l) => codeRe.test(l) && ngheHeaderRe.test(l));

  if (hasCleanHeader && !hasRawInlineLines) {
    // Already clean â€” just ensure the closing sentence is present
    const closing = "Hy vá»ng cÃ³ thá»ƒ giÃºp báº¡n lá»±a chá»n Ä‘Æ°á»£c Ä‘á»‹nh hÆ°á»›ng phÃ¹ há»£p.";
    const hasClosing = lines.some((l) => l.includes("Hy vá»ng"));
    return hasClosing ? text.trim() : text.trim() + "\n\n" + closing;
  }

  // â”€â”€ Parse raw format â”€â”€
  // Each line typically: "6.x.x TÃªn ngÃ nh (MÃ£NgÃ nh) Nghá» nghiá»‡p tÆ°Æ¡ng á»©ng: Nghá»1, Nghá»2, ..."
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
          .replace(/^Ng[Ã a]nh\s+/i, "")
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
    parts.push("NgÃ nh táº¡i NEU");
    for (const [code, name] of nganhSet) parts.push(`${name} (${code})`);
  }
  if (ngheSet.size) {
    parts.push("");
    parts.push("Nghá» nghiá»‡p tÆ°Æ¡ng á»©ng");
    for (const job of ngheSet) parts.push(job);
  }
  parts.push("");
  parts.push("Hy vá»ng cÃ³ thá»ƒ giÃºp báº¡n lá»±a chá»n Ä‘Æ°á»£c Ä‘á»‹nh hÆ°á»›ng phÃ¹ há»£p.");
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
      "Ban la tro ly trich xuat va dinh dang thong tin MBTI. Chi tra ve JSON hop le theo schema yeu cau. Neu khong tim thay muc nao, de chuoi rong.",
  },
  {
    role: "user",
    content:
      `Hay trich xuat va dinh dang cac muc sau tu tai lieu ve MBTI ${mbtiType}. Tuan thu nghiem ngat cac yeu cau dinh dang ben duoi.\n\n` +
      "## YEU CAU DINH DANG TUNG MUC\n\n" +
      `**ten_tinh_cach**: Chi lay dung ma loai tinh cach (vi du: "${mbtiType}"). Khong lay ten mo ta, khong lay so thu tu, khong lay gi khac.\n\n` +
      "**khai_niem**: Lay dung phan khai niem/mo ta tong quan ve tinh cach nay. Bo tieu de muc, bo so thu tu dau dong neu co.\n\n" +
      "**phan_tich_cac_chieu_tinh_cach**: Lay phan phan tich cac chieu/cau truc tinh cach. " +
      "Bo hoan toan cac tieu de muc va so thu tu dau dong (vi du: '1.', '2.', 'I.', 'II.' ...). " +
      "Giu nguyen noi dung, trinh bay ro rang tung chieu tinh cach.\n\n" +
      "**diem_manh**: Lay phan diem manh (thuong la muc so 3 trong tai lieu). " +
      "Bo tieu de muc va tat ca so thu tu dau dong. Chi giu noi dung.\n\n" +
      "**diem_yeu**: Lay phan han che/nhuoc diem (thuong la muc so 4 trong tai lieu). " +
      "Bo tieu de muc va tat ca so thu tu dau dong. Chi giu noi dung.\n\n" +
      "**moi_truong**: Lay phan moi truong lam viec phu hop (thuong la muc so 5 trong tai lieu). " +
      "Bo tieu de muc va tat ca so thu tu dau dong. Chi giu noi dung.\n\n" +
      "**nganh_nghe_tuong_ung**: Lay toan bo danh muc nganh nghe trong tai lieu. " +
      "Tai lieu co the to chuc theo nhieu linh vuc con, nhom nganh -- hay gom tat ca lai. " +
      "Dinh dang output theo cau truc sau (chi text thuan, khong markdown):\n" +
      "Nganh tai NEU\n" +
      "Ten nganh day du (Ma nganh)\n" +
      "Ten nganh day du (Ma nganh)\n" +
      "... (liet ke het tat ca nganh)\n\n" +
      "Nghe nghiep tuong ung\n" +
      "Liet ke cac nghe, moi nghe mot dong\n\n" +
      "Hy vong co the giup ban lua chon duoc dinh huong phu hop.\n\n" +
      "TUYET DOI khong de lai: so thu tu (6.1, 6.2.1...), tieu de linh vuc/nhom nganh, tu 'Nghe nghiep tuong ung:' inline sau ten nganh.\n\n" +
      "## TAI LIEU\n" +
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

    const typeVariants = [mbtiType, mbtiType.toLowerCase()];
    const objectNames = [];
    for (const typeVariant of typeVariants) {
      objectNames.push(`courses-processed/personality/M\u00f4 t\u1ea3 ${typeVariant}.docx`);
      objectNames.push(`courses-processed/personality/Mo ta ${typeVariant}.docx`);
    }
    let personalityData = "";
    let lastErr = null;
    let usedObject = null;

    for (const objectName of objectNames) {
      try {
        const dataStream = await minioClient.getObject(MINIO_BUCKET, objectName);
        const buffer = await streamToBuffer(dataStream);
        const result = await mammoth.extractRawText({ buffer });
        personalityData = (result.value || "").trim();
        usedObject = objectName;
        break;
      } catch (minioErr) {
        lastErr = minioErr;
      }
    }

    if (!personalityData) {
      const errMessage = lastErr && lastErr.message ? lastErr.message : "Unknown MinIO error";
      console.error("[MinIO] Doc file loi:", objectNames.join(" | "), errMessage);
      return res.status(404).json({
        error: "Khong tim thay du lieu tinh cach cho " + mbtiType,
        detail: errMessage,
        tried: objectNames,
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


