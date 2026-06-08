const OPENAI_ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL || "gpt-4o";

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
  return restoreKoreanSpacing(String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,!?])([^\s\n])/g, "$1 $2")
    .replace(/설명해주세요/g, "설명해 주세요")
    .replace(/말씀해주세요/g, "말씀해 주세요")
    .replace(/확인해주세요/g, "확인해 주세요")
    .replace(/평가하기 위함\.?/g, "확인하기 위한 질문입니다.")
    .replace(/하기 위함\.?/g, "하기 위한 질문입니다.")
    .trim());
}

function restoreKoreanSpacing(value) {
  const phraseRules = [
    ["커머스플랫폼개발및운영", "커머스 플랫폼 개발 및 운영"],
    ["플랫폼개발및운영", "플랫폼 개발 및 운영"],
    ["서비스개발및운영", "서비스 개발 및 운영"],
    ["시스템개발및운영", "시스템 개발 및 운영"],
    ["백엔드개발자", "백엔드 개발자"],
    ["프론트엔드개발자", "프론트엔드 개발자"],
    ["백엔드개발경력", "백엔드 개발 경력"],
    ["백엔드개발경험", "백엔드 개발 경험"],
    ["프론트엔드개발경험", "프론트엔드 개발 경험"],
    ["시스템개발경험", "시스템 개발 경험"],
    ["서비스운영경험", "서비스 운영 경험"],
    ["외부시스템연동", "외부 시스템 연동"],
    ["시스템연동", "시스템 연동"],
    ["데이터베이스모델링", "데이터베이스 모델링"],
    ["데이터모델", "데이터 모델"],
    ["데이터분석", "데이터 분석"],
    ["공통로직", "공통 로직"],
    ["레거시전환", "레거시 전환"],
    ["운영환경개선", "운영 환경 개선"],
    ["성능최적화", "성능 최적화"],
    ["운영이슈", "운영 이슈"],
    ["기술스택", "기술 스택"],
    ["요구사항분석", "요구사항 분석"],
    ["업무계획수립", "업무 계획 수립"],
    ["업무계획", "업무 계획"],
    ["일정관리", "일정 관리"],
    ["업무일정관리", "업무 일정 관리"],
    ["프로젝트관리", "프로젝트 관리"],
    ["운영관리", "운영 관리"],
    ["품질관리", "품질 관리"],
    ["성과관리", "성과 관리"],
    ["평가제도", "평가 제도"],
    ["채용프로세스", "채용 프로세스"],
    ["직무적합성", "직무 적합성"],
    ["핵심역량", "핵심 역량"],
    ["검증포인트", "검증 포인트"],
    ["후보자맞춤질문", "후보자 맞춤 질문"],
    ["구조화면접", "구조화 면접"],
    ["본인역할", "본인 역할"],
    ["본인이맡은역할", "본인이 맡은 역할"],
    ["개선효과", "개선 효과"],
    ["성과수치", "성과 수치"],
    ["산정기준", "산정 기준"],
    ["협업상황", "협업 상황"],
    ["의사결정", "의사 결정"],
    ["판단기준", "판단 기준"],
    ["커뮤니케이션능력", "커뮤니케이션 능력"],
    ["협업능력", "협업 능력"],
    ["팀워크", "팀워크"],
    ["가나안금융정보추출시스템", "가나안 금융 정보 추출 시스템"],
    ["삼성CRMBI", "삼성 CRM/BI"],
    ["CRMBI", "CRM/BI"],
    ["RESTAPI", "REST API"],
    ["OCRAPI", "OCR API"],
  ];

  let text = String(value || "");
  phraseRules.forEach(([from, to]) => {
    text = text.replace(new RegExp(from, "g"), to);
  });

  return text
    .replace(/Next\.\s*js/g, "Next.js")
    .replace(/Java\s+와/g, "Java와")
    .replace(/Spring\s+과/g, "Spring과")
    .replace(/TypeScript\s+와/g, "TypeScript와")
    .replace(/React\s+와/g, "React와")
    .replace(/([가-힣]{2,4})지원자/g, "$1 지원자")
    .replace(/(\d+)년(\d+)개월/g, "$1년 $2개월")
    .replace(/기반의(?=[가-힣A-Za-z0-9])/g, "기반의 ")
    .replace(/경험이풍부/g, "경험이 풍부")
    .replace(/강점을보입니다/g, "강점을 보입니다")
    .replace(/역할을수행/g, "역할을 수행")
    .replace(/능력을발휘/g, "능력을 발휘")
    .replace(/경험이있습니다/g, "경험이 있습니다")
    .replace(/경험은부족/g, "경험은 부족")
    .replace(/추가검증/g, "추가 검증")
    .replace(/분석력이부족/g, "분석력이 부족")
    .replace(/설계시/g, "설계 시")
    .replace(/연동시/g, "연동 시")
    .replace(/구축프로젝트/g, "구축 프로젝트")
    .replace(/프로젝트에서/g, "프로젝트에서")
    .replace(/설명해주세요/g, "설명해 주세요")
    .replace(/말씀해주세요/g, "말씀해 주세요")
    .replace(/확인해주세요/g, "확인해 주세요")
    .replace(/([가-힣])([0-9]+년|[0-9]+개월|[0-9]+일|[0-9]+명|[0-9]+건|[0-9]+회)/g, "$1 $2")
    .replace(/([0-9]+년|[0-9]+개월|[0-9]+일|[0-9]+명|[0-9]+건|[0-9]+회)([가-힣])/g, "$1 $2")
    .replace(/,(?=\S)/g, ", ")
    .replace(/\s{2,}/g, " ")
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

아래 [HR 등록 포지션 분석 기준]과 ${hasPdf ? "첨부된 PDF 원본" : "[지원자 이력서 텍스트]"}을 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

【출력 언어 규칙 - 반드시 준수】
- 모든 출력은 표준 한국어 맞춤법과 띄어쓰기를 적용해 작성하세요.
- 이력서에서 읽은 내용을 그대로 옮기지 마세요. 반드시 내용을 이해한 뒤 새로운 문장으로 재작성하세요.
- 이름, 프로젝트명, 회사명 등 고유명사는 띄어쓰기를 올바르게 적용해 표기하세요. 예: "이선우 지원자", "가나안 금융 정보 추출 시스템"
- 경력, 기술 스택, 업무 설명 등 모든 항목을 새로운 문장으로 재구성하세요.
- 한국어 조사와 영문 기술명은 자연스럽게 붙여 쓰세요. 예: "Java와", "TypeScript와", "SpringBoot를", "Next.js 기반".
- 붙어있는 단어를 그대로 출력하는 것은 절대 금지입니다. 예: "이선우지원자" → "이선우 지원자", "백엔드개발경력" → "백엔드 개발 경력", "RESTAPI" → "REST API", "데이터베이스모델링" → "데이터베이스 모델링"

중요한 처리 방식:
- 이력서의 헤더, 페이지 표기, 깨진 문장, 긴 원문 인용을 결과에 포함하지 마세요.
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

${hasPdf ? `[지원자 이력서]
PDF 원본 파일이 함께 첨부되어 있습니다. PDF의 텍스트 레이어와 시각적 렌더링을 함께 참고해 분석하세요.
PDF에서 읽은 문구를 그대로 옮기지 말고, 이력서 내용을 이해한 뒤 면접관이 읽기 좋은 자연스러운 한국어 문장으로 재작성하세요.` : `[지원자 이력서 텍스트]\n${String(resumeText || "").slice(0, 30000)}`}`;
}

function getOpenAIJsonSchema() {
  return {
    name: "resume_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        overallFitScore: { type: "number" },
        summary: { type: "string" },
        jdFit: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              competency: { type: "string" },
              score: { type: "number" },
              evidence: { type: "string" },
            },
            required: ["competency", "score", "evidence"],
          },
        },
        verificationPoints: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          items: { type: "string" },
        },
        customQuestions: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string" },
              main: { type: "string" },
              follow: { type: "array", items: { type: "string" } },
              intent: { type: "string" },
              relatedCompetency: { type: "string" },
              sourceEvidence: { type: "string" },
              points: { type: "array", items: { type: "string" } },
            },
            required: ["type", "main", "follow", "intent", "relatedCompetency", "sourceEvidence", "points"],
          },
        },
      },
      required: ["overallFitScore", "summary", "jdFit", "verificationPoints", "customQuestions"],
    },
  };
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
      if (typeof content?.json === "object") return JSON.stringify(content.json);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonLoose(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(raw); } catch (_) {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOpenAIStatus(status) {
  return status === 408 || status === 409 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchOpenAIJson(url, options, { retries = 1, timeoutMs = 90000 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || `OpenAI API 요청에 실패했습니다. (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        if (attempt < retries && isRetryableOpenAIStatus(response.status)) {
          lastError = error;
          await sleep(800 * (attempt + 1));
          continue;
        }
        throw error;
      }
      return data;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      const retryable = error?.name === "AbortError" || isRetryableOpenAIStatus(error?.status);
      if (attempt < retries && retryable) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("OpenAI API 요청에 실패했습니다.");
}

function buildResponsesPayload({ prompt, fileInput, resumeText }) {
  const content = [{ type: "input_text", text: prompt }];
  if (fileInput) {
    content.push(fileInput);
  } else if (String(resumeText || "").trim()) {
    content.push({ type: "input_text", text: `\n[지원자 이력서 텍스트]\n${String(resumeText).slice(0, 30000)}` });
  }
  return {
    model: OPENAI_ANALYSIS_MODEL,
    input: [{ role: "user", content }],
    temperature: 0.1,
    max_output_tokens: 6500,
    text: {
      format: {
        type: "json_schema",
        ...getOpenAIJsonSchema(),
      },
    },
  };
}

async function uploadPdfToOpenAI({ apiKey, resumePdfBase64, resumePdfMimeType, resumePdfName }) {
  const buffer = Buffer.from(String(resumePdfBase64 || ""), "base64");
  if (!buffer.length) throw new Error("업로드할 PDF 데이터가 비어 있습니다.");

  const filename = resumePdfName || "resume.pdf";
  const mimeType = resumePdfMimeType || "application/pdf";
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([buffer], { type: mimeType }), filename);

  const data = await fetchOpenAIJson("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  }, { retries: 1, timeoutMs: 60000 });

  if (!data?.id) throw new Error("OpenAI 파일 업로드 결과에서 file_id를 찾지 못했습니다.");
  return data.id;
}

async function deleteOpenAIFile({ apiKey, fileId }) {
  if (!fileId) return;
  try {
    await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (error) {
    console.warn("OpenAI temporary file cleanup skipped:", error?.message || error);
  }
}

async function callOpenAIResponses(payload, apiKey) {
  const data = await fetchOpenAIJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  }, { retries: 1, timeoutMs: 95000 });

  const text = extractOpenAIText(data);
  if (!text) throw new Error("OpenAI 응답에서 분석 결과를 찾지 못했습니다.");
  return parseJsonLoose(text);
}

async function callOpenAIWithPdf({ prompt, resumePdfBase64, resumeText, resumePdfMimeType, resumePdfName }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");

  if (!resumePdfBase64) {
    return callOpenAIResponses(buildResponsesPayload({ prompt, resumeText }), apiKey);
  }

  // Base64 PDF를 Responses API에 직접 넣으면 큰 PDF에서 간헐적으로 5xx가 발생할 수 있어,
  // 기본은 Files API에 임시 업로드한 file_id를 Responses API에 넘기는 방식으로 처리합니다.
  let uploadedFileId = "";
  try {
    uploadedFileId = await uploadPdfToOpenAI({ apiKey, resumePdfBase64, resumePdfMimeType, resumePdfName });
    const payload = buildResponsesPayload({
      prompt,
      fileInput: { type: "input_file", file_id: uploadedFileId },
      resumeText,
    });
    return await callOpenAIResponses(payload, apiKey);
  } catch (fileIdError) {
    console.warn("OpenAI file_id PDF path failed, trying inline base64 PDF:", fileIdError?.message || fileIdError);

    const mime = resumePdfMimeType || "application/pdf";
    const inlinePayload = buildResponsesPayload({
      prompt,
      fileInput: {
        type: "input_file",
        filename: resumePdfName || "resume.pdf",
        file_data: `data:${mime};base64,${resumePdfBase64}`,
      },
      resumeText,
    });

    try {
      return await callOpenAIResponses(inlinePayload, apiKey);
    } catch (inlineError) {
      const message = inlineError?.message || fileIdError?.message || "OpenAI PDF 분석 요청에 실패했습니다.";
      throw new Error(message.includes("503") ? "OpenAI PDF 분석 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요." : message);
    }
  } finally {
    if (uploadedFileId) await deleteOpenAIFile({ apiKey, fileId: uploadedFileId });
  }
}

function shouldRunLanguagePolish(analysis) {
  const text = JSON.stringify(analysis || "");
  return /(이선우지원자|[가-힣]{2,4}지원자|RESTAPI|OCRAPI|백엔드개발|데이터베이스모델링|요구사항분석|Java\s+와|TypeScript\s+와|Next\.\s+js|경험이풍부|추가검증|설명해주세요)/.test(text);
}

function enforceScoresFromOriginal(original, polished) {
  const result = normalizeAnalysis(polished || original);
  const base = normalizeAnalysis(original);
  result.overallFitScore = base.overallFitScore;
  result.jdFit = result.jdFit.map((item, index) => ({
    ...item,
    id: base.jdFit[index]?.id || item.id,
    score: base.jdFit[index]?.score ?? item.score,
  }));
  if (base.jdFit.length) {
    const avg = base.jdFit.reduce((sum, item) => sum + item.score, 0) / base.jdFit.length;
    const lowCount = base.jdFit.filter((item) => item.score < 70).length;
    let capped = Math.round(avg);
    if (lowCount >= 2) capped = Math.min(capped, 68);
    if (lowCount >= 1) capped = Math.min(capped, 76);
    result.overallFitScore = capped;
  }
  return result;
}

async function polishKoreanWithOpenAI(analysis) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return normalizeAnalysis(analysis);

  const normalized = normalizeAnalysis(analysis);
  if (!shouldRunLanguagePolish(normalized)) return normalized;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_POLISH_MODEL || "gpt-4o",
        input: [{
          role: "user",
          content: [{
            type: "input_text",
            text: `아래 JSON은 이력서 분석 결과입니다. 점수와 판단 내용은 바꾸지 말고, 한국어 띄어쓰기와 문장만 자연스럽게 교정해 주세요.

반드시 지킬 것:
- overallFitScore와 jdFit.score 숫자는 절대 변경하지 마세요.
- JSON 구조와 배열 개수는 유지하세요.
- "이선우지원자"처럼 붙은 이름/명사는 자연스럽게 띄어 쓰세요.
- "Java 와"는 "Java와", "TypeScript 와"는 "TypeScript와", "Next. js"는 "Next.js"로 고치세요.
- "RESTAPI"는 "REST API", "OCRAPI"는 "OCR API"로 고치세요.
- 질문은 면접관이 그대로 읽을 수 있게 "~설명해 주세요." 형태로 정리하세요.
- 질문 의도는 "~확인하기 위한 질문입니다." 형태로 통일하세요.

JSON:
${JSON.stringify(normalized)}`
          }]
        }],
        temperature: 0,
        max_output_tokens: 5000,
        text: {
          format: {
            type: "json_schema",
            ...getOpenAIJsonSchema(),
          },
        },
      }),
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return normalized;
    const text = extractOpenAIText(data);
    if (!text) return normalized;
    const polished = parseJsonLoose(text);
    return enforceScoresFromOriginal(normalized, polished);
  } catch (error) {
    clearTimeout(timeout);
    console.warn("Korean polish skipped:", error?.message || error);
    return normalized;
  }
}


export const config = {
  maxDuration: 120,
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
      if (body.length > 14_000_000) {
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
    const { positionContext, existingQuestions, resumeText, resumePdfBase64, resumePdfMimeType, resumePdfName } = body || {};

    const hasPdf = Boolean(resumePdfBase64);

    if (!positionContext) return jsonResponse(res, 400, { error: "포지션 분석 기준이 필요합니다." });
    if (!hasPdf && !String(resumeText || "").trim()) {
      return jsonResponse(res, 400, { error: "이력서 PDF 또는 이력서 텍스트가 필요합니다." });
    }
    if (resumePdfBase64 && String(resumePdfBase64).length > 10_500_000) {
      return jsonResponse(res, 413, { error: "PDF 파일이 너무 큽니다. 7MB 이하 파일로 다시 업로드해 주세요." });
    }
    const prompt = getPrompt({ positionContext, existingQuestions, hasPdf, resumeText });
    const raw = await callOpenAIWithPdf({ prompt, resumePdfBase64, resumeText, resumePdfMimeType, resumePdfName });
    const analysis = await polishKoreanWithOpenAI(raw);
    validateAnalysis(analysis);

    return jsonResponse(res, 200, { analysis, engine: "openai-pdf", model: OPENAI_ANALYSIS_MODEL });
  } catch (error) {
    console.error("OpenAI PDF resume analysis error:", error);
    return jsonResponse(res, 500, { error: error.message || "AI 분석 중 오류가 발생했습니다." });
  }
}
