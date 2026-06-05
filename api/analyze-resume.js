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

function applyKoreanSpacingRules(text) {
  let t = String(text || "");
  const replacements = [
    [/RESTAPI/g, "REST API"],
    [/OCRAPI/g, "OCR API"],
    [/CI\/CD환경/g, "CI/CD 환경"],
    [/CI\/CD 환경구축/g, "CI/CD 환경 구축"],
    [/TypeScript및Next\.js/g, "TypeScript 및 Next.js"],
    [/TypeScript\s*및\s*Next\.\s*js/g, "TypeScript 및 Next.js"],
    [/Next\.\s*js/g, "Next.js"],
    [/Java\s*와\s*Spring\s*을/g, "Java와 Spring을"],
    [/Java\/Spring\s*기반백엔드/g, "Java/Spring 기반 백엔드"],
    [/Java\/Spring\s*기반/g, "Java/Spring 기반"],
    [/SpringBoot\s*와\s*Java/g, "Spring Boot와 Java"],
    [/SpringBoot/g, "Spring Boot"],
    [/DynamoDB/g, "DynamoDB"],
    [/관계형DB/g, "관계형 DB"],
    [/DB\s*모델링/g, "DB 모델링"],
    [/DB\s*모델/g, "DB 모델"],
    [/백엔드개발/g, "백엔드 개발"],
    [/백엔드서비스/g, "백엔드 서비스"],
    [/프론트엔드및서비스연동경험/g, "프론트엔드 및 서비스 연동 경험"],
    [/프론트엔드서비스/g, "프론트엔드 서비스"],
    [/서비스연동/g, "서비스 연동"],
    [/서비스개발/g, "서비스 개발"],
    [/서비스설계/g, "서비스 설계"],
    [/서비스운영/g, "서비스 운영"],
    [/시스템유지보수/g, "시스템 유지보수"],
    [/웹시스템/g, "웹 시스템"],
    [/기능개선/g, "기능 개선"],
    [/외부시스템연동/g, "외부 시스템 연동"],
    [/외부시스템/g, "외부 시스템"],
    [/통신프로토콜/g, "통신 프로토콜"],
    [/TCP통신/g, "TCP 통신"],
    [/API통신/g, "API 통신"],
    [/API설계/g, "API 설계"],
    [/API연동/g, "API 연동"],
    [/운영관리용/g, "운영 관리용"],
    [/어드민웹/g, "어드민 웹"],
    [/화면구성/g, "화면 구성"],
    [/사용자흐름/g, "사용자 흐름"],
    [/요구사항분석/g, "요구사항 분석"],
    [/업무계획/g, "업무 계획"],
    [/업무일정/g, "업무 일정"],
    [/일정관리/g, "일정 관리"],
    [/리스크조기공유/g, "리스크 조기 공유"],
    [/문제해결/g, "문제 해결"],
    [/기술적문제/g, "기술적 문제"],
    [/기술적기여/g, "기술적 기여"],
    [/본인의역할/g, "본인의 역할"],
    [/수행범위/g, "수행 범위"],
    [/주도범위/g, "주도 범위"],
    [/판단근거/g, "판단 근거"],
    [/성과근거/g, "성과 근거"],
    [/운영관점/g, "운영 관점"],
    [/협업경험/g, "협업 경험"],
    [/협업방식/g, "협업 방식"],
    [/커뮤니케이션능력/g, "커뮤니케이션 능력"],
    [/팀워크마인드/g, "팀워크 마인드"],
    [/팀워크/g, "팀워크"],
    [/기술스택/g, "기술 스택"],
    [/직접경험/g, "직접 경험"],
    [/직접개발/g, "직접 개발"],
    [/구체적근거/g, "구체적 근거"],
    [/추가확인/g, "추가 확인"],
    [/추가검증/g, "추가 검증"],
    [/확인이필요/g, "확인이 필요"],
    [/검증이필요/g, "검증이 필요"],
    [/확인해야합니다/g, "확인해야 합니다"],
    [/보여주었습니다/g, "보여주었습니다"],
    [/필요합니다/g, "필요합니다"],
    [/어렵습니다/g, "어렵습니다"],
    [/부족합니다/g, "부족합니다"],
    [/있습니다/g, "있습니다"],
    [/하였습니다/g, "하였습니다"],
    [/수행했습니다/g, "수행했습니다"],
    [/수행하였습니다/g, "수행하였습니다"],
    [/수행하는/g, "수행하는"],
    [/활용해/g, "활용해"],
    [/기반으로/g, "기반으로"],
    [/중심으로/g, "중심으로"],
    [/과정에서/g, "과정에서"],
    [/관련하여/g, "관련하여"],
    [/중요합니다/g, "중요합니다"],
    [/구체적으로설명해 주세요/g, "구체적으로 설명해 주세요"],
    [/구체적으로설명해주세요/g, "구체적으로 설명해 주세요"],
    [/설명해주세요/g, "설명해 주세요"],
    [/말씀해주세요/g, "말씀해 주세요"],
    [/확인해주세요/g, "확인해 주세요"],
    [/평가하기 위함\.?/g, "확인하기 위한 질문입니다."],
    [/하기 위함\.?/g, "하기 위한 질문입니다."],
  ];
  replacements.forEach(([pattern, replacement]) => { t = t.replace(pattern, replacement); });
  // Common particle spacing after English/tech tokens and after Korean compound words.
  t = t
    .replace(/([A-Za-z0-9/+.#-]+)(및|와|과|을|를|은|는|이|가|에|에서|으로|로|부터|까지|도)(?=[가-힣])/g, "$1 $2")
    .replace(/([가-힣])(Java|Spring|TypeScript|Next\.js|React|Redis|AWS|API|TCP|DB|ORM|OCR|CI\/CD)/g, "$1 $2")
    .replace(/(Java|Spring|TypeScript|Next\.js|React|Redis|AWS|API|TCP|DB|ORM|OCR|CI\/CD)([가-힣])/g, "$1 $2")
    .replace(/([가-힣])및/g, "$1 및")
    .replace(/([가-힣])와([가-힣])/g, "$1와 $2")
    .replace(/([가-힣])과([가-힣])/g, "$1과 $2")
    .replace(/([가-힣])에서([가-힣])/g, "$1에서 $2")
    .replace(/([가-힣])으로([가-힣])/g, "$1으로 $2")
    .replace(/([가-힣])기반([가-힣])/g, "$1 기반 $2")
    .replace(/([가-힣])경험([가-힣])/g, "$1 경험 $2")
    .replace(/([가-힣])역량([가-힣])/g, "$1 역량 $2")
    .replace(/([가-힣])능력([가-힣])/g, "$1 능력 $2")
    .replace(/([가-힣])로직([가-힣])/g, "$1 로직 $2")
    .replace(/([가-힣])구축([가-힣])/g, "$1 구축 $2")
    .replace(/([가-힣])설계([가-힣])/g, "$1 설계 $2")
    .replace(/([가-힣])개선([가-힣])/g, "$1 개선 $2")
    .replace(/([가-힣])연동([가-힣])/g, "$1 연동 $2")
    .replace(/([가-힣])운영([가-힣])/g, "$1 운영 $2")
    .replace(/([가-힣])분석([가-힣])/g, "$1 분석 $2")
    .replace(/([가-힣])관리([가-힣])/g, "$1 관리 $2")
    .replace(/([가-힣])확인([가-힣])/g, "$1 확인 $2")
    .replace(/([가-힣])검증([가-힣])/g, "$1 검증 $2")
    .replace(/([가-힣])프로젝트/g, "$1 프로젝트")
    .replace(/프로젝트([가-힣])/g, "프로젝트 $1");
  return t;
}

function cleanText(value) {
  return applyKoreanSpacingRules(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])([^\s\n])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function adjustScoreByEvidence(score, evidence) {
  const text = String(evidence || "");
  let adjusted = clampScore(score, 0);
  if (/직접 근거가 부족|근거가 부족|확인되지 않|드러나지 않|명확하지 않|단정하기 어렵|제한적/.test(text)) {
    adjusted = Math.min(adjusted, 68);
  } else if (/추가 확인|추가 검증|확인이 필요|검증이 필요|구체성 확인|수준 확인|범위 확인|역할 확인/.test(text)) {
    adjusted = Math.min(adjusted, 75);
  }
  return adjusted;
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
  const jdFit = toArray(raw.jdFit || raw.jdCompetencyFit || raw.competencyFit).map((item, index) => {
    const evidence = cleanText(item.evidence || item.reason || item.rationale || "");
    return {
      id: item.id || `jd_fit_${index}`,
      competency: cleanText(item.competency || item.name || item.title || `JD 역량 ${index + 1}`),
      score: adjustScoreByEvidence(item.score || item.fitScore, evidence),
      evidence,
    };
  }).filter((item) => item.competency && item.evidence).slice(0, 5);

  const customQuestions = toArray(raw.customQuestions || raw.recommendedQuestions || raw.questions)
    .map(normalizeQuestion)
    .filter((item) => item.main)
    .slice(0, 8);

  const verificationPoints = toArray(raw.verificationPoints || raw.checkPoints)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 8);

  // AI 참고 점수는 JD 역량 적합도 평균으로 계산해 화면과 판단 기준을 일치시킵니다.
  let overallFitScore = clampScore(raw.overallFitScore || raw.fitScore || raw.score, 0);
  if (jdFit.length) {
    overallFitScore = Math.round(jdFit.reduce((sum, item) => sum + item.score, 0) / jdFit.length);
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



function hasAwkwardRawText(text) {
  const t = String(text || "");
  if (!t) return false;
  const badPatterns = [
    /[가-힣]{10,}(개발|경험|설계|운영|관리|분석|구축|연동|처리|개선|역량|능력|확인|검증)/,
    /(기반백엔드|백엔드개발|서비스운영|서비스개발|API설계|외부시스템|요구사항분석|업무계획|업무일정|커뮤니케이션능력|팀워크마인드)/,
    /(Java\/Spring기반|TypeScript및|Next\.js기반|RESTAPI|OCRAPI|TCP통신|관계형DB)/,
    /(설명해주세요|말씀해주세요|확인해주세요|하기위함|평가하기위함|확인하기위함)/,
  ];
  return badPatterns.some((rx) => rx.test(t.replace(/\s+/g, ""))) || /[가-힣][A-Za-z][가-힣]/.test(t);
}

function analysisNeedsRewrite(analysis) {
  const chunks = [];
  chunks.push(analysis.summary);
  (analysis.jdFit || []).forEach((item) => chunks.push(item.competency, item.evidence));
  (analysis.verificationPoints || []).forEach((item) => chunks.push(item));
  (analysis.customQuestions || []).forEach((item) => {
    chunks.push(item.type, item.main, item.intent, item.relatedCompetency, item.sourceEvidence);
    (item.follow || []).forEach((v) => chunks.push(v));
    (item.points || []).forEach((v) => chunks.push(v));
  });
  return chunks.some(hasAwkwardRawText);
}

function getRewritePrompt(analysis) {
  return `아래 JSON은 이력서 분석 결과입니다. 판단 내용, 점수, 항목 개수, 질문의 핵심 의미는 절대 바꾸지 말고, 문장만 면접관이 읽기 좋은 자연스러운 한국어로 다시 다듬어 주세요.

반드시 지킬 것:
- 원문 이력서 문장을 그대로 복사하지 말고 자연스럽게 재서술하세요.
- 붙어 있는 한국어 표현을 모두 자연스럽게 띄어 쓰세요.
- 기술 용어는 자연스럽게 표기하세요. 예: REST API, OCR API, 관계형 DB, 외부 시스템 연동, 요구사항 분석, 업무 계획, 백엔드 개발 경험.
- 질문은 모두 존댓말로 작성하세요. 예: "구체적으로 설명해 주세요.", "말씀해 주세요."
- 질문 의도는 모두 "~을 확인하기 위한 질문입니다." 또는 "~을 평가하기 위한 질문입니다." 형태의 완결 문장으로 통일하세요.
- "~하기 위함", "~하기 위해"로 끝나는 문장을 만들지 마세요.
- overallFitScore와 jdFit.score 값은 절대 변경하지 마세요.
- 출력은 스키마와 동일한 JSON만 반환하세요.

분석 결과 JSON:
${JSON.stringify(analysis, null, 2)}`;
}

async function rewriteAnalysisWithGemini(analysis) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return analysis;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: getRewritePrompt(analysis) }] }],
        generationConfig: {
          temperature: 0.05,
          topP: 0.8,
          responseMimeType: "application/json",
          responseSchema: getGeminiSchema(),
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return analysis;
    const text = extractGeminiText(data);
    if (!text) return analysis;
    const rewritten = normalizeAnalysis(parseJsonLoose(text));
    // Safety: keep original scores exactly after rewrite.
    rewritten.overallFitScore = analysis.overallFitScore;
    rewritten.jdFit = (rewritten.jdFit || []).map((item, idx) => ({
      ...item,
      score: analysis.jdFit?.[idx]?.score ?? item.score,
    }));
    validateAnalysis(rewritten);
    // If rewrite is still clearly bad, keep the original rather than breaking the UI.
    if (analysisNeedsRewrite(rewritten)) return analysis;
    return rewritten;
  } catch (_) {
    return analysis;
  } finally {
    clearTimeout(timeout);
  }
}

function getPrompt({ positionContext, existingQuestions, hasPdf, resumeText }) {
  const existing = (existingQuestions || []).slice(0, 120).map((item, i) => `${i + 1}. [${item.competency || ""}] ${item.question || ""}`).join("\n");
  return `당신은 채용담당자와 현업 면접관을 돕는 시니어 HRBP/채용 면접 설계자입니다.

아래 [HR 등록 포지션 분석 기준]과 ${hasPdf ? "첨부된 PDF 이력서 원본" : "[지원자 이력서 텍스트]"}을 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

중요한 처리 방식:
- 이 작업은 텍스트 추출이 아니라 문서 이해 후 재작성입니다. PDF 원문을 그대로 옮기지 말고, 이력서의 경력·프로젝트·성과를 이해한 뒤 면접관이 읽기 좋은 자연스러운 한국어로 재서술하세요.
- PDF의 텍스트 레이어가 깨져 있거나 띄어쓰기가 무너져 있어도, 출력 결과에는 깨진 문장이나 붙은 단어를 절대 그대로 쓰지 마세요.
- 이력서 헤더, 페이지 표기, 파일명, 원문 문장, 긴 인용문을 결과에 포함하지 마세요.
- JD 문구를 그대로 반복하지 말고 평가 언어로 재구성하세요. 예: "TypeScript, Next.js 기반 서비스 개발 경험이 있으신 분" → "프론트엔드 서비스 개발 경험의 직접성".
- 모든 문장은 면접관이 그대로 읽어도 어색하지 않은 문장으로 작성하세요.
- 합격/불합격 판단을 하지 말고, 면접 전 검토 보조자료만 작성하세요.
- 민감정보, 차별 소지가 있는 내용, 사생활 질문은 제외하세요.

절대 사용하면 안 되는 출력 예시:
- "Java/Spring기반백엔드개발경험"
- "서비스운영경험"
- "API설계"
- "외부시스템연동"
- "요구사항분석"
- "업무계획"
- "평가하기위함"
- "설명해주세요"

반드시 이런 식으로 다시 써야 합니다:
- "Java/Spring 기반 백엔드 개발 경험"
- "서비스 운영 경험"
- "API 설계"
- "외부 시스템 연동"
- "요구사항 분석"
- "업무 계획"
- "백엔드 개발 역량을 확인하기 위한 질문입니다."
- "구체적으로 설명해 주세요."

점수 산정 기준은 매우 엄격하게 적용하세요:
- 90점 이상: 필수자격/필요경험과 이력서 근거가 매우 직접적으로 일치하고, 본인 역할·기술 깊이·성과 맥락이 모두 구체적입니다. 단순 관련 경험만으로는 90점 이상을 주지 마세요.
- 80~89점: 필수요건과 직접 연결되는 경험이 충분하지만, 일부 수행 범위나 깊이 확인이 필요한 수준입니다.
- 70~79점: 관련 경험은 있으나 본인 역할, 기술 깊이, 의사결정 맥락, 성과 근거가 일부 불명확합니다.
- 60~69점: 간접 경험 위주이거나 핵심 필수요건과의 직접 연결성이 제한적입니다.
- 60점 미만: 이력서상 직접 근거가 부족합니다.
- 필수자격/필요경험 중 핵심 항목 1개라도 직접 확인되지 않으면 해당 jdFit 항목은 최대 75점입니다.
- 필수자격/필요경험 중 핵심 항목 2개 이상이 직접 확인되지 않으면 overallFitScore는 70점 이하로 산정하세요.
- 커뮤니케이션/팀워크는 이력서상 구체적 협업 상황과 본인 역할이 드러나지 않으면 75점 이상을 주지 마세요.
- overallFitScore는 jdFit 항목 점수의 평균과 일관되어야 합니다. 개별 항목 평균보다 높게 산정하지 마세요.

출력 구조:
1. overallFitScore: 0~100 정수. summary에는 점수를 반복하지 마세요.
2. summary: 2~4문장. 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 포함하세요.
3. jdFit: 필수자격/필요경험을 1차 기준으로 3~5개 항목을 재구성하세요. 예: "필수 기술 경험 충족도", "개발 요구사항 분석력", "업무 일정 관리 능력", "커뮤니케이션 능력", "팀워크". 각 항목은 competency, score, evidence를 포함하세요.
4. verificationPoints: 4~6개. 무엇을 왜 확인해야 하는지 구체적으로 작성하세요.
5. customQuestions: 6개. 이력서의 특정 경험/프로젝트/성과를 기반으로 개인화 질문을 작성하세요. 모든 질문은 면접관이 그대로 읽을 수 있는 존댓말 문장으로 쓰고, 의도는 모두 "~확인하기 위한 질문입니다." 형식으로 통일하세요.

질문 작성 규칙:
- 질문은 반드시 "~설명해 주세요.", "~말씀해 주세요.", "~구체적으로 설명해 주세요."처럼 자연스러운 존댓말 완성문으로 작성하세요.
- 질문 의도는 반드시 "~을 확인하기 위한 질문입니다." 또는 "~을 평가하기 위한 질문입니다." 형태로 작성하세요.
- "~하기 위함", "~하기 위해", "~평가하기 위해"처럼 끝나는 불완전한 의도 문장을 쓰지 마세요.
- sourceEvidence는 원문 전체가 아니라 경험명/성과명만 짧게 적으세요.
- 기존 구조화면접 질문과 중복되는 일반 질문을 만들지 마세요.
- 질문과 의도 모두 이력서 원문을 복사하지 말고 면접 질문 문장으로 다시 쓰세요.

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
    let analysis = normalizeAnalysis(raw);
    validateAnalysis(analysis);

    // Gemini가 PDF 원문을 일부 붙여 쓴 형태로 반환하면, 판단/점수는 유지하고 문장만 재작성합니다.
    if (analysisNeedsRewrite(analysis)) {
      analysis = await rewriteAnalysisWithGemini(analysis);
      analysis = normalizeAnalysis(analysis);
      validateAnalysis(analysis);
    }

    return jsonResponse(res, 200, { analysis, engine: "gemini-pdf-rewrite", model: GEMINI_MODEL });
  } catch (error) {
    console.error("Gemini resume analysis error:", error);
    return jsonResponse(res, 500, { error: error.message || "AI 분석 중 오류가 발생했습니다." });
  }
}
