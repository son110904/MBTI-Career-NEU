import { useState, useCallback, useEffect } from "react";
import { MBTI_QUESTIONS, MBTI_TYPE_INFO } from "./mbti-data";
import type { MBTIQuestion } from "./mbti-data";
import { computeMBTI, type AnswerRecord } from "./mbti-score";

type Step = "intro" | "quiz" | "result";

const totalQuestions = MBTI_QUESTIONS.length;

export default function App() {
  const [step, setStep] = useState<Step>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord>({});

  const currentQuestion: MBTIQuestion | undefined = MBTI_QUESTIONS[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleAnswer = useCallback((rating: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: rating }));
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    }
    // Nếu đang ở câu cuối, chỉ lưu đáp án, chờ người dùng bấm nút "Xem kết quả"
  }, [currentIndex, currentQuestion]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
    else if (answeredCount === totalQuestions) setStep("result");
  }, [currentIndex, answeredCount]);

  const handleStart = useCallback(() => {
    setStep("quiz");
    setCurrentIndex(0);
    setAnswers({});
  }, []);

  const handleRetry = useCallback(() => {
    setStep("intro");
    setCurrentIndex(0);
    setAnswers({});
  }, []);

  const resultType = step === "result" ? computeMBTI(answers) : null;
  const resultInfo = resultType ? MBTI_TYPE_INFO[resultType] : null;


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-800">
            Trắc nghiệm MBTI 
          </h1>
          <p className="text-sm text-slate-500">
            Đại học Kinh tế Quốc dân (NEU)
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {step === "intro" && (
          <Intro onStart={handleStart} />
        )}

        {step === "quiz" && currentQuestion && (
          <Quiz
            question={currentQuestion}
            index={currentIndex}
            total={totalQuestions}
            progress={progress}
            answers={answers}
            answeredCount={answeredCount}
            onAnswer={handleAnswer}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === "result" && resultInfo && resultType && (
          <Result info={resultInfo} mbtiType={resultType} onRetry={handleRetry} />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        Công cụ tham khảo, không thay thế tư vấn chuyên nghiệp. © NEU
      </footer>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-800">
        Khám phá tính cách & nghề nghiệp phù hợp
      </h2>
      <p className="mt-3 text-slate-600">
        Bài trắc nghiệm MBTI gồm <strong>{totalQuestions} câu</strong>, mỗi câu được đánh giá
        theo thang Likert 7 mức từ "hoàn toàn không đồng ý" đến "hoàn toàn đồng ý".
        Kết quả giúp bạn nhận diện 4 chiều tính cách
        (Hướng ngoại – Hướng nội, Giác quan – Trực giác, Lý trí – Cảm xúc, Nguyên tắc – Linh hoạt)
        và gợi ý hướng nghề nghiệp phù hợp với sinh viên Đại học Kinh tế Quốc dân.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-600">
        <li>Chọn câu trả lời gần với cách bạn thường nghĩ hoặc hành động nhất.</li>
        <li>Không có đáp án đúng/sai – hãy trả lời trung thực.</li>
        <li>Kết quả bao gồm gợi ý nghề nghiệp và ngành học phù hợp NEU.</li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Bắt đầu làm bài
      </button>
    </div>
  );
}

function Quiz({
  question,
  index,
  total,
  progress,
  answers,
  answeredCount,
  onAnswer,
  onPrev,
  onNext,
}: {
  question: MBTIQuestion;
  index: number;
  total: number;
  progress: number;
  answers: AnswerRecord;
  answeredCount: number;
  onAnswer: (rating: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const currentAnswer = answers[question.id];
  const scaleOptions = [
    { value: 7, tone: "agree", size: 44, label: "Hoàn toàn đồng ý" },
    { value: 6, tone: "agree", size: 36, label: "Rất đồng ý" },
    { value: 5, tone: "agree", size: 30, label: "Đồng ý" },
    { value: 4, tone: "neutral", size: 22, label: "Trung lập" },
    { value: 3, tone: "disagree", size: 30, label: "Không đồng ý" },
    { value: 2, tone: "disagree", size: 36, label: "Rất không đồng ý" },
    { value: 1, tone: "disagree", size: 44, label: "Hoàn toàn không đồng ý" },
  ] as const;
  const toneClasses = {
    agree: "border-emerald-500 text-emerald-700 hover:border-emerald-600",
    neutral: "border-slate-300 text-slate-500 hover:border-slate-400",
    disagree: "border-purple-500 text-purple-700 hover:border-purple-600",
  } as const;
  const selectedClasses = {
    agree: "bg-emerald-50 ring-2 ring-emerald-300",
    neutral: "bg-slate-100 ring-2 ring-slate-300",
    disagree: "bg-purple-50 ring-2 ring-purple-300",
  } as const;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>Câu {index + 1} / {total}</span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-lg font-medium text-slate-800">
        {question.text}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-sm font-medium text-emerald-600 sm:w-24">
          Đồng ý
        </span>
        <div className="flex flex-1 items-center justify-center gap-3">
          {scaleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value)}
              aria-label={option.label}
              title={option.label}
              className={`rounded-full border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                toneClasses[option.tone]
              } ${
                currentAnswer === option.value ? selectedClasses[option.tone] : ""
              }`}
              style={{ width: option.size, height: option.size }}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-purple-600 sm:w-24 sm:text-right">
          Không đồng ý
        </span>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          ← Câu trước
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index >= total - 1 && answeredCount < total}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {index >= total - 1 ? "Xem kết quả" : "Câu sau →"}
        </button>
      </div>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function Result({
  info: { type, nameVi, traits },
  mbtiType,
  onRetry,
}: {
  info: import("./mbti-data").MBTITypeInfo;
  mbtiType: string;
  onRetry: () => void;
}) {
  const [consultationLoading, setConsultationLoading] = useState(true);
  const [consultationText, setConsultationText] = useState<string | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  useEffect(() => {
    setConsultationLoading(true);
    setConsultationError(null);
    setConsultationText(null);
    fetch(`${API_BASE}/api/ai-consultation?mbtiType=${encodeURIComponent(mbtiType)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Chưa có dữ liệu tư vấn cho tính cách này." : "Tải tư vấn thất bại.");
        return res.json();
      })
      .then((data) => {
        setConsultationText(data.consultation ?? "");
      })
      .catch((err) => {
        setConsultationError(err.message || "Không tải được lời tư vấn.");
      })
      .finally(() => {
        setConsultationLoading(false);
      });
  }, [mbtiType]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-indigo-100 px-4 py-2 text-2xl font-bold text-indigo-800">
            {type}
          </span>
          <h2 className="text-xl font-semibold text-slate-800">{nameVi}</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {traits.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <h3 className="font-semibold text-slate-800">Tư vấn từ tài liệu</h3>
        {consultationLoading && (
          <div className="mt-3 flex items-center gap-2 text-indigo-600">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Đang tải lời tư vấn...</span>
          </div>
        )}
        {!consultationLoading && consultationError && (
          <p className="mt-3 text-sm text-amber-700">{consultationError}</p>
        )}
        {!consultationLoading && consultationText && (
          <p className="mt-3 whitespace-pre-wrap text-slate-700 leading-relaxed">
            {consultationText}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Làm lại bài trắc nghiệm
      </button>
    </div>
  );
}
