import { useState, useCallback, useEffect } from "react";
import { MBTI_QUESTIONS, MBTI_TYPE_INFO } from "./mbti-data";
import type { MBTIQuestion } from "./mbti-data";
import { computeMBTI, computeMBTIScores, type AnswerRecord } from "./mbti-score";

type Step = "intro" | "quiz" | "result";

const totalQuestions = MBTI_QUESTIONS.length;

export default function App() {
  const [step, setStep] = useState<Step>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord>({});
  const [hasSavedResult, setHasSavedResult] = useState(false);

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
    setHasSavedResult(false);
  }, []);

  const handleRetry = useCallback(() => {
    setStep("intro");
    setCurrentIndex(0);
    setAnswers({});
    setHasSavedResult(false);
  }, []);

  const resultType = step === "result" ? computeMBTI(answers) : null;
  const resultInfo = resultType ? MBTI_TYPE_INFO[resultType] : null;

  useEffect(() => {
    if (step !== "result" || !resultType || hasSavedResult) return;

    const payload = {
      mbtiType: resultType,
      scores: computeMBTIScores(answers),
      answers,
      meta: {
        totalQuestions,
        answeredCount,
        completedAt: new Date().toISOString(),
      },
    };

    fetch("http://localhost:4000/api/mbti-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      })
      .then(() => {
        setHasSavedResult(true);
      })
      .catch((err) => {
        console.error("Lưu kết quả MBTI thất bại:", err);
      });
  }, [step, resultType, answers, hasSavedResult, answeredCount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-800">
            Trắc nghiệm MBTI – Định hướng nghề nghiệp
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

        {step === "result" && resultInfo && (
          <Result info={resultInfo} saved={hasSavedResult} onRetry={handleRetry} />
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
      <p className="text-sm text-slate-500 mt-2">
        (1 = hoàn toàn không đồng ý, 7 = hoàn toàn đồng ý)
      </p>

      <div className="mt-6 grid grid-cols-7 gap-2 text-center">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onAnswer(n)}
            className={`rounded-full border-2 px-3 py-2 font-medium transition ${
              currentAnswer === n
                ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            {n}
          </button>
        ))}
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

function Result({
  info: { type, nameVi, shortDesc, careers, neuMajors, traits },
  saved,
  onRetry,
}: {
  info: import("./mbti-data").MBTITypeInfo;
  saved: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-indigo-100 px-4 py-2 text-2xl font-bold text-indigo-800">
            {type}
          </span>
          <h2 className="text-xl font-semibold text-slate-800">{nameVi}</h2>
        </div>
        <p className="mt-3 text-slate-600">{shortDesc}</p>
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
        {saved && (
          <p className="mt-3 text-xs text-emerald-600">
            Kết quả đã được lưu vào hệ thống.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <h3 className="font-semibold text-slate-800">Gợi ý nghề nghiệp phù hợp</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
          {careers.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <h3 className="font-semibold text-slate-800">Ngành / Chuyên ngành gợi ý tại NEU</h3>
        <p className="mt-1 text-sm text-slate-500">
          Các ngành đào tạo tại Đại học Kinh tế Quốc dân phù hợp với nhóm tính cách của bạn:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
          {neuMajors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
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
