const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function clampScore(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])([^\s\n])/g, "$1 $2")
    .replace(/설명해주세요/g, "설명해 주세요")
    .replace(/말씀해주세요/g, "말씀해 주세요")
    .replace(/확인해주세요/g, "확인해 주세요")
    .replace(/평가하기 위함\.?/g, "확인하기 위한 질문입니다.")
    .replace(/하기 위함\.?/g, "하기 위한 질문입니다.")
    .trim();
}

function normalizeIntent(value) {
  let text = cleanText(value);
  if (!text) return "해당 경험의 실제 수행 범위와 직무 연관성을 확인하기 위한 질문입니다.";
  text = text.replace(/하기 위해\.?$/g, "하기 위한 질문입니다.");
  text = text.replace(/확인하기 위해\.?$/g, "확인하기 위한 질문입니다.");
  text = text.replace(/평가하기 위해\.?$/g, "확인하기 위한 질문입니다.");
  if (!/[.!?]$/.test(text)) text += "입니다.";
  return text;
}

function normalizeQuestion(item, index) {
  const main = cleanText(item.main || item.question || "");
  return {
    id: item.id || `ai_question_${Date.now()}_${index}`,
    type: cleanText(item.type || "경험 검증"),
    main: main || "이력서에 기재된 관련 경험에서 본인이 직접 수행한 역할과 판단 기준을 구체적으로 설명해 주세요.",
    follow: toArray(item.follow || item.followUps || item.followup).map(cleanText).filter(Boolean).slice(0, 3),
    intent: normalizeIntent(item.intent || item.purpose || ""),
    relatedCompetency: cleanText(item.relatedCompetency || item.competency || "직무 적합성"),
    sourceEvidence: cleanText(item.sourceEvidence || item.evidence || "이력서상 관련 경험"),
    points: toArray(item.points || item.checkPoints || item.tags).map(cleanText).filter(Boolean).slice(0, 5),
  };
}

function normalizeAnalysis(raw) {
  const jdFit = toArray(raw.jdFit || raw.jdCompetencyFit || raw.competencyFit).map((item, index) => ({
    id: item.id || `jd_fit_${index}`,
    competency: cleanText(item.competency || item.name || item.title || `JD 역량 ${index + 1}`),
    score: clampScore(item.score || item.fitScore, 0),
    evidence: cleanText(item.evidence || item.reason || item.rationale || ""),
  })).filter((item) => item.competency && item.evidence).slice(0, 5);

  const customQuestions = toArray(raw.customQuestions || raw.recommendedQuestions || raw.questions)
    .map(normalizeQuestion)
    .filter((item) => item.main)
    .slice(0, 8);

  const verificationPoints = toArray(raw.verificationPoints || raw.checkPoints)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 8);

  let overallFitScore = clampScore(raw.overallFitScore || raw.fitScore || raw.score, 0);
  if (jdFit.length) {
    const avg = jdFit.reduce((sum, item) => sum + item.score, 0) / jdFit.length;
    const lowCount = jdFit.filter((item) => item.score < 70).length;
    if (lowCount >= 2) overallFitScore = Math.min(overallFitScore, 68);
    if (lowCount >= 1) overallFitScore = Math.min(overallFitScore, 76);
    overallFitScore = Math.min(overallFitScore, Math.round(avg + 5));
  }

  return {
    overallFitScore,
    summary: cleanText(raw.summary || raw.candidateSummary || ""),
    jdFit,
    strengths: [],
    concerns: [],
    verificationPoints,
    customQuestions,
  };
}

function validateAnalysis(analysis) {
  if (!analysis.summary || analysis.summary.length < 30) throw new Error("AI 분석 요약이 충분하지 않습니다. 다시 분석해 주세요.");
  if (!Array.isArray(analysis.jdFit) || analysis.jdFit.length < 3) throw new Error("JD 역량 적합도 결과가 충분하지 않습니다. 다시 분석해 주세요.");
  if (!Array.isArray(analysis.verificationPoints) || analysis.verificationPoints.length < 3) throw new Error("검증 포인트 결과가 충분하지 않습니다. 다시 분석해 주세요.");
  if (!Array.isArray(analysis.customQuestions) || analysis.customQuestions.length < 4) throw new Error("후보자 맞춤 질문 결과가 충분하지 않습니다. 다시 분석해 주세요.");
}

function getPrompt({ positionContext, existingQuestions, hasPdf, resumeText }) {
  const existing = (existingQuestions || []).slice(0, 120).map((item, i) => `${i + 1}. [${item.competency || ""}] ${item.question || ""}`).join("\n");
  return `당신은 채용담당자와 현업 면접관을 돕는 시니어 HRBP/채용 면접 설계자입니다.

아래 [HR 등록 포지션 분석 기준]과 ${hasPdf ? "첨부된 PDF 이력서 원본" : "[지원자 이력서 텍스트]"}을 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

중요한 처리 방식:
- PDF 원문을 그대로 옮기지 말고, 문서를 이해한 뒤 자연스러운 한국어로 재서술하세요.
- PDF의 텍스트 레이어가 깨져 있거나 띄어쓰기가 무너져 있어도, 출력 결과는 반드시 자연스러운 한국어 띄어쓰기로 작성하세요.
- 이력서의 헤더, 페이지 표기, 깨진 OCR 문장, 긴 원문 인용을 결과에 포함하지 마세요.
- JD 문구를 그대로 반복하지 말고 면접 평가 언어로 바꿔 작성하세요.
- 합격/불합격 판단을 하지 말고, 면접 전 검토 보조자료만 작성하세요.
- 민감정보, 차별 소지가 있는 내용, 사생활 질문은 제외하세요.

점수 산정 기준은 엄격하게 적용하세요:
- 90점 이상: JD 요구와 이력서 근거가 매우 직접적이고, 본인 역할·성과·맥락이 구체적입니다.
- 80~89점: JD와 직접 연결되는 경험이 충분하지만 일부 깊이 확인이 필요합니다.
- 70~79점: 관련 경험은 있으나 본인 역할, 기술 깊이, 의사결정 맥락, 성과 근거가 일부 불명확합니다.
- 60~69점: 간접 경험 위주이거나 JD 핵심 요구와의 연결성이 제한적입니다.
- 60점 미만: 이력서상 직접 근거가 부족합니다.
- 필수자격/필요경험 중 핵심 항목 1개라도 직접 확인되지 않으면 overallFitScore는 최대 76점입니다.
- 핵심 항목 2개 이상이 직접 확인되지 않으면 overallFitScore는 최대 68점입니다.
- 커뮤니케이션/팀워크는 이력서상 구체적 협업 상황과 본인 역할이 드러나지 않으면 75점 이상을 주지 마세요.

출력 구조:
1. overallFitScore: 0~100 정수. summary에는 점수를 반복하지 마세요.
2. summary: 2~4문장. 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 포함하세요.
3. jdFit: 필수자격/필요경험을 1차 기준으로 3~5개 항목을 재구성하세요. 예: "필수 기술 경험 충족도", "개발 요구사항 분석력", "업무 일정 관리 능력", "커뮤니케이션 능력", "팀워크". 각 항목은 competency, score, evidence를 포함하세요.
4. verificationPoints: 4~6개. 무엇을 왜 확인해야 하는지 구체적으로 작성하세요.
5. customQuestions: 6개. 이력서의 특정 경험/프로젝트/성과를 기반으로 개인화 질문을 작성하세요. 모든 질문은 면접관이 그대로 읽을 수 있는 존댓말 문장으로 쓰고, 의도는 모두 "~확인하기 위한 질문입니다." 형식으로 통일하세요.

질문 작성 규칙:
- 질문은 "~설명해 주세요.", "~말씀해 주세요."처럼 자연스러운 존댓말로 작성하세요.
- "~하기 위함", "~하기 위해"로 끝나는 불완전한 의도 문장을 쓰지 마세요.
- sourceEvidence는 원문 전체가 아니라 경험명/성과명만 짧게 적으세요.
- 기존 구조화면접 질문과 중복되는 일반 질문을 만들지 마세요.

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[기존 구조화면접 질문 예시 - 중복 금지]
${existing}

${hasPdf ? "[지원자 이력서]\nPDF 파일이 함께 첨부되어 있습니다. PDF를 직접 읽고 분석하세요." : `[지원자 이력서 텍스트]\n${String(resumeText || "").slice(0, 30000)}`}`;
}

function getGeminiSchema() {
  return {
    type: "OBJECT",
    properties: {
      overallFitScore: { type: "NUMBER" },
      summary: { type: "STRING" },
      jdFit: {
        type: "ARRAY",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "OBJECT",
          properties: {
            competency: { type: "STRING" },
            score: { type: "NUMBER" },
            evidence: { type: "STRING" },
          },
          required: ["competency", "score", "evidence"],
        },
      },
      verificationPoints: { type: "ARRAY", items: { type: "STRING" } },
      customQuestions: {
        type: "ARRAY",
        minItems: 4,
        maxItems: 8,
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
            main: { type: "STRING" },
            follow: { type: "ARRAY", items: { type: "STRING" } },
            intent: { type: "STRING" },
            relatedCompetency: { type: "STRING" },
            sourceEvidence: { type: "STRING" },
            points: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["type", "main", "follow", "intent", "relatedCompetency", "sourceEvidence", "points"],
        },
      },
    },
    required: ["overallFitScore", "summary", "jdFit", "verificationPoints", "customQuestions"],
  };
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("\n").trim();
}

function parseJsonLoose(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(raw); } catch (_) {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
}

async function callGemini({ prompt, resumePdfBase64, resumePdfMimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.");

  const parts = [{ text: prompt }];
  if (resumePdfBase64) {
    parts.push({ inlineData: { mimeType: resumePdfMimeType || "application/pdf", data: resumePdfBase64 } });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.15,
        topP: 0.9,
        responseMimeType: "application/json",
        responseSchema: getGeminiSchema(),
      },
    }),
  });

  clearTimeout(timeout);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini API 요청에 실패했습니다. (${response.status})`;
    throw new Error(message);
  }

  const text = extractGeminiText(data);
  if (!text) throw new Error("Gemini 응답에서 분석 결과를 찾지 못했습니다.");
  return parseJsonLoose(text);
}


export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12_000_000) {
        reject(new Error("요청 본문이 너무 큽니다. 7MB 이하 PDF로 다시 업로드해 주세요."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { positionContext, existingQuestions, resumeText, resumePdfBase64, resumePdfMimeType } = body || {};

    if (!positionContext) return jsonResponse(res, 400, { error: "포지션 분석 기준이 필요합니다." });
    if (!resumePdfBase64 && !String(resumeText || "").trim()) {
      return jsonResponse(res, 400, { error: "이력서 PDF 또는 이력서 텍스트가 필요합니다." });
    }
    if (resumePdfBase64 && String(resumePdfBase64).length > 10_500_000) {
      return jsonResponse(res, 413, { error: "PDF 파일이 너무 큽니다. 7MB 이하 파일로 다시 업로드해 주세요." });
    }

    const prompt = getPrompt({ positionContext, existingQuestions, hasPdf: Boolean(resumePdfBase64), resumeText });
    const raw = await callGemini({ prompt, resumePdfBase64, resumePdfMimeType });
    const analysis = normalizeAnalysis(raw);
    validateAnalysis(analysis);

    return jsonResponse(res, 200, { analysis, engine: "gemini-pdf", model: GEMINI_MODEL });
  } catch (error) {
    console.error("Gemini resume analysis error:", error);
    return jsonResponse(res, 500, { error: error.message || "AI 분석 중 오류가 발생했습니다." });
  }
}
