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
    .replace(/([,.!?])([^\s\n])/g, "$1 $2")
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
    ["풀스택개발자", "풀스택 개발자"],
    ["서버개발자", "서버 개발자"],
    ["웹개발자", "웹 개발자"],
    ["앱개발자", "앱 개발자"],
    ["개발및운영", "개발 및 운영"],
    ["설계및개발", "설계 및 개발"],
    ["구축및운영", "구축 및 운영"],
    ["분석및설계", "분석 및 설계"],
    ["개선및고도화", "개선 및 고도화"],
    ["요구사항분석", "요구사항 분석"],
    ["일정관리", "일정 관리"],
    ["업무일정관리", "업무 일정 관리"],
    ["프로젝트관리", "프로젝트 관리"],
    ["운영관리", "운영 관리"],
    ["품질관리", "품질 관리"],
    ["성과관리", "성과 관리"],
    ["평가제도", "평가 제도"],
    ["채용프로세스", "채용 프로세스"],
    ["외부시스템연동", "외부 시스템 연동"],
    ["시스템연동", "시스템 연동"],
    ["데이터모델", "데이터 모델"],
    ["데이터분석", "데이터 분석"],
    ["공통로직", "공통 로직"],
    ["레거시전환", "레거시 전환"],
    ["운영이슈", "운영 이슈"],
    ["기술스택", "기술 스택"],
    ["직무적합성", "직무 적합성"],
    ["핵심역량", "핵심 역량"],
    ["검증포인트", "검증 포인트"],
    ["후보자맞춤질문", "후보자 맞춤 질문"],
    ["구조화면접", "구조화 면접"],
    ["본인역할", "본인 역할"],
    ["개선효과", "개선 효과"],
    ["성과수치", "성과 수치"],
    ["산정기준", "산정 기준"],
    ["협업상황", "협업 상황"],
    ["의사결정", "의사 결정"],
    ["판단기준", "판단 기준"],
    ["백엔드개발경력", "백엔드 개발 경력"],
    ["백엔드개발경험", "백엔드 개발 경험"],
    ["시스템개발경험", "시스템 개발 경험"],
    ["시스템개발", "시스템 개발"],
    ["서비스개발", "서비스 개발"],
    ["시스템구축", "시스템 구축"],
    ["서비스구축", "서비스 구축"],
    ["데이터베이스모델링", "데이터베이스 모델링"],
    ["정산대사", "정산 대사"],
    ["필수기술경험충족도", "필수 기술 경험 충족도"],
    ["개발요구사항분석력", "개발 요구사항 분석력"],
    ["업무계획수립능력", "업무 계획 수립 능력"],
    ["커뮤니케이션능력", "커뮤니케이션 능력"],
    ["커뮤니케이션및팀워크", "커뮤니케이션 및 팀워크"],
  ];

  let text = String(value || "");
  phraseRules.forEach(([from, to]) => {
    text = text.replace(new RegExp(from, "g"), to);
  });

  return text
    .replace(/([가-힣])([A-Za-z0-9+#.])/g, "$1 $2")
    .replace(/([A-Za-z0-9+#.])([가-힣])/g, "$1 $2")
    .replace(/,(?=\S)/g, ", ")
    .replace(/\.(?=\S)/g, ". ")
    .replace(/([가-힣])(및|또는|기반|담당|참여|수행|진행|운영|관리|설계|구축|개발|개선|전환|연동|분석|검증|확인|경험|프로젝트|성과|역량|능력|질문|의도|근거|질문입니다)(?=[가-힣A-Za-z0-9])/g, "$1 $2")
    .replace(/(및|또는)(?=[가-힣A-Za-z0-9])/g, "$1 ")
    .replace(/(백엔드|프론트엔드|시스템|서비스|외부|데이터|모델|평가|채용|온보딩|보상|노무|협업)([가-힣])/g, "$1 $2")
    .replace(/([가-힣])([0-9]+년|[0-9]+개월|[0-9]+일|[0-9]+명|[0-9]+건|[0-9]+회)/g, "$1 $2")
    .replace(/([0-9]+년|[0-9]+개월|[0-9]+일|[0-9]+명|[0-9]+건|[0-9]+회)([가-힣])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}


function compactKoreanTokenCount(value) {
  const matches = String(value || "").match(/[가-힣]{10,}/g) || [];
  return matches.length;
}

function hasWeakEvidence(value) {
  const text = String(value || "");
  return /(확인\s*필요|추가\s*확인|검증\s*필요|명확히\s*확인되지|직접\s*근거.*(부족|제한|없)|근거가\s*(부족|제한)|제한적|불명확|단정하기\s*어렵|확인하기\s*어렵|이력서상\s*확인되지|부족)/i.test(text);
}

function hasDirectEvidence(value) {
  const text = String(value || "");
  return /(구축|개발|설계|운영|개선|전환|연동|도입|리팩토링|마이그레이션|자동화|고도화|모델링|배포|장애|성능|정산|대사|API|DB|Spring|Java|TypeScript|Next|React|프로젝트|시스템|서비스)/i.test(text);
}

function capJdFitScore(item) {
  let score = clampScore(item.score, 0);
  const competency = String(item.competency || "");
  const evidence = String(item.evidence || "");
  const combined = `${competency} ${evidence}`;

  if (hasWeakEvidence(combined)) score = Math.min(score, 72);
  if (/명확히\s*확인되지|직접\s*근거.*(없|부족|제한)|이력서상\s*확인되지|부족/i.test(combined)) score = Math.min(score, 68);
  if (/(TypeScript|Next\.?\s*js|프론트엔드)/i.test(combined) && hasWeakEvidence(evidence)) score = Math.min(score, 65);
  if (/(커뮤니케이션|팀워크|협업|일정|계획|요구사항)/i.test(competency) && !hasDirectEvidence(evidence)) score = Math.min(score, 75);
  if (/(커뮤니케이션|팀워크|협업)/i.test(competency) && hasWeakEvidence(evidence)) score = Math.min(score, 72);
  return score;
}

function calculateOverallFromJdFit(jdFit, rawScore = 0) {
  if (!Array.isArray(jdFit) || jdFit.length === 0) return clampScore(rawScore, 0);
  const avg = Math.round(jdFit.reduce((sum, item) => sum + clampScore(item.score, 0), 0) / jdFit.length);
  const weakCount = jdFit.filter((item) => hasWeakEvidence(`${item.competency} ${item.evidence}`) || item.score < 70).length;
  let overall = avg;
  if (weakCount >= 1) overall = Math.min(overall, 76);
  if (weakCount >= 2) overall = Math.min(overall, 68);
  return clampScore(overall, 0);
}

function isGenericQuestion(value) {
  const text = String(value || "");
  return /(가장\s*(어려웠던|도전적이었던)\s*부분|어떤\s*어려움|문제를\s*어떻게\s*해결|경험을\s*설명|배운\s*점은\s*무엇|느낀\s*점|강점은\s*무엇)/i.test(text) || text.length < 35;
}

function rewriteGenericQuestion(question) {
  const evidence = cleanText(question.sourceEvidence || "해당 이력서 경험");
  const competency = cleanText(question.relatedCompetency || question.type || "직무 관련 역량");
  return `${evidence} 경험에서 본인이 직접 맡은 역할과 주요 판단 기준, ${competency}과 연결되는 실행 과정을 구체적으로 설명해 주세요.`;
}

function polishQuestionMain(question) {
  let main = cleanText(question.main || question.question || "");
  const temp = {
    main,
    sourceEvidence: question.sourceEvidence || question.evidence || "",
    relatedCompetency: question.relatedCompetency || question.competency || "",
    type: question.type || "",
  };
  if (isGenericQuestion(main)) main = rewriteGenericQuestion(temp);
  if (!/[.!?]$/.test(main)) main += ".";
  return main;
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
  const main = polishQuestionMain(item);
  return {
    id: item.id || `ai_question_${Date.now()}_${index}`,
    type: cleanText(item.type || "AI 이력서 기반"),
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
    const normalized = {
      id: item.id || `jd_fit_${index}`,
      competency: cleanText(item.competency || item.name || item.title || `JD 역량 ${index + 1}`),
      score: clampScore(item.score || item.fitScore, 0),
      evidence: cleanText(item.evidence || item.reason || item.rationale || ""),
    };
    normalized.score = capJdFitScore(normalized);
    return normalized;
  }).filter((item) => item.competency && item.evidence).slice(0, 5);

  const customQuestions = toArray(raw.customQuestions || raw.recommendedQuestions || raw.questions)
    .map(normalizeQuestion)
    .filter((item) => item.main)
    .slice(0, 8);

  const verificationPoints = toArray(raw.verificationPoints || raw.checkPoints)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 8);

  const overallFitScore = calculateOverallFromJdFit(jdFit, raw.overallFitScore || raw.fitScore || raw.score || 0);

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

아래 [HR 등록 포지션 분석 기준]과 ${hasPdf ? "첨부된 이력서 이미지" : "[지원자 이력서 텍스트]"}을 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

【출력 언어 규칙 - 반드시 준수】
- 모든 출력은 표준 한국어 맞춤법과 띄어쓰기를 적용해 작성하세요.
- 이력서에서 읽은 내용을 그대로 옮기지 마세요. 반드시 내용을 이해한 뒤 새로운 문장으로 재작성하세요.
- 이름, 프로젝트명, 회사명 등 고유명사는 띄어쓰기를 올바르게 적용해 표기하세요. 예: "이선우 지원자", "가나안 금융 정보 추출 시스템"
- 경력, 기술스택, 업무 설명 등 모든 항목을 새로운 문장으로 재구성하세요.
- 붙어있는 단어를 그대로 출력하는 것은 절대 금지입니다. 예: "백엔드개발경력" → "백엔드 개발 경력", "외부시스템연동" → "외부 시스템 연동"

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
- 필수자격/필요경험 중 핵심 항목 1개라도 직접 확인되지 않으면 해당 JD 역량 점수와 overallFitScore는 최대 76점입니다.
- 핵심 항목 2개 이상이 직접 확인되지 않으면 overallFitScore는 최대 68점입니다.
- 커뮤니케이션/팀워크/일정 관리/요구사항 분석은 이력서상 구체적 상황, 본인 역할, 실행 방식이 드러나지 않으면 75점 이상을 주지 마세요.
- "경험이 있어 보임", "관련성이 있음" 수준의 간접 근거는 70점대 초반 이하로 평가하세요.
- overallFitScore는 JD 역량 적합도 점수의 평균을 기준으로 하며, 개별 JD 역량 점수 평균보다 높게 산정하지 마세요.

출력 구조:
1. overallFitScore: 0~100 정수. summary에는 점수를 반복하지 마세요.
2. summary: 2~4문장. 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 포함하세요.
3. jdFit: 필수자격/필요경험을 1차 기준으로 3~5개 항목을 재구성하세요. 예: "필수 기술 경험 충족도", "개발 요구사항 분석력", "업무 일정 관리 능력", "커뮤니케이션 능력", "팀워크". 각 항목은 competency, score, evidence를 포함하세요. competency에는 "Java/Spring 기반백엔드개발경험"처럼 붙여 쓰지 말고 "Java/Spring 기반 백엔드 개발 경험"처럼 자연스러운 띄어쓰기를 적용하세요.
4. verificationPoints: 4~6개. 무엇을 왜 확인해야 하는지 구체적으로 작성하세요.
5. customQuestions: 6개. 이력서의 특정 경험/프로젝트/성과를 기반으로 개인화 질문을 작성하세요. 모든 질문은 면접관이 그대로 읽을 수 있는 존댓말 문장으로 쓰고, 의도는 모두 "~확인하기 위한 질문입니다." 형식으로 통일하세요. 질문은 반드시 특정 경험명/프로젝트/성과를 포함하고, 본인 역할·판단 기준·성과 산정 근거·기술적 깊이 중 하나 이상을 확인해야 합니다.

질문 작성 규칙:
- 질문은 "~설명해 주세요.", "~말씀해 주세요."처럼 자연스러운 존댓말로 작성하세요.
- "~하기 위함", "~하기 위해"로 끝나는 불완전한 의도 문장을 쓰지 마세요.
- sourceEvidence는 원문 전체가 아니라 경험명/성과명만 짧게 적으세요.
- 기존 구조화면접 질문과 중복되는 일반 질문을 만들지 마세요.
- "가장 어려웠던 점은 무엇인가요?", "도전적이었던 부분은 무엇인가요?", "배운 점은 무엇인가요?"처럼 어느 후보자에게나 물을 수 있는 질문은 금지합니다.
- 좋은 질문 예: "정산 대사 시스템 개발 경험에서 본인이 직접 설계한 데이터 검증 로직과 오류 처리 기준을 구체적으로 설명해 주세요."

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[기존 구조화면접 질문 예시 - 중복 금지]
${existing}

${hasPdf ? `[지원자 이력서]
이력서 페이지 이미지가 함께 첨부되어 있습니다. 이미지를 직접 읽고 이해한 뒤 분석하세요.
보이는 텍스트의 띄어쓰기가 깨져 있더라도, 원문을 그대로 옮기지 말고 반드시 자연스러운 한국어 문장으로 새로 작성하세요.` : `[지원자 이력서 텍스트]\n${String(resumeText || "").slice(0, 30000)}`}`;
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


function getOpenAiJsonSchema() {
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
          maxItems: 6,
          items: { type: "string" },
        },
        customQuestions: {
          type: "array",
          minItems: 6,
          maxItems: 6,
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

function extractOpenAiText(data) {
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  return "";
}

function parseJsonLoose(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(raw); } catch (_) {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
}

function buildOpenAiContent({ prompt, resumePdfBase64, resumePdfImages, resumePdfMimeType }) {
  const content = [{ type: "text", text: prompt }];

  if (Array.isArray(resumePdfImages) && resumePdfImages.length > 0) {
    resumePdfImages.forEach((imgBase64) => {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imgBase64}`,
          detail: "high",
        },
      });
    });
  } else if (resumePdfBase64) {
    // OpenAI vision endpoint does not reliably accept PDF as image_url.
    // The current ai-resume.html normally sends rendered page images; if not, fail clearly.
    throw new Error("PDF 이미지 변환 결과가 필요합니다. PDF를 다시 업로드해 주세요.");
  }

  return content;
}

async function callOpenAI({ prompt, resumePdfBase64, resumePdfImages, resumePdfMimeType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");

  const messages = [
    {
      role: "system",
      content: "당신은 채용담당자와 현업 면접관을 돕는 시니어 HRBP/구조화면접 설계자입니다. 모든 결과는 자연스러운 한국어 띄어쓰기와 문장으로 작성하고, 이력서 원문을 복사하지 말고 이해한 뒤 재작성합니다.",
    },
    {
      role: "user",
      content: buildOpenAiContent({ prompt, resumePdfBase64, resumePdfImages, resumePdfMimeType }),
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 85000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: OPENAI_ANALYSIS_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 4500,
      response_format: {
        type: "json_schema",
        json_schema: getOpenAiJsonSchema(),
      },
    }),
  });

  clearTimeout(timeout);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI API 요청에 실패했습니다. (${response.status})`;
    throw new Error(message);
  }

  const text = extractOpenAiText(data);
  if (!text) throw new Error("OpenAI 응답에서 분석 결과를 찾지 못했습니다.");
  return parseJsonLoose(text);
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
    const { positionContext, existingQuestions, resumeText, resumePdfBase64, resumePdfImages, resumePdfMimeType } = body || {};

    const hasImages = Array.isArray(resumePdfImages) && resumePdfImages.length > 0;
    const hasPdf = hasImages || Boolean(resumePdfBase64);

    if (!positionContext) return jsonResponse(res, 400, { error: "포지션 분석 기준이 필요합니다." });
    if (!hasPdf && !String(resumeText || "").trim()) {
      return jsonResponse(res, 400, { error: "이력서 PDF 또는 이력서 텍스트가 필요합니다." });
    }
    if (resumePdfBase64 && String(resumePdfBase64).length > 10_500_000) {
      return jsonResponse(res, 413, { error: "PDF 파일이 너무 큽니다. 7MB 이하 파일로 다시 업로드해 주세요." });
    }
    if (hasImages) {
      const totalImageSize = resumePdfImages.reduce((sum, img) => sum + String(img).length, 0);
      if (totalImageSize > 12_000_000) {
        return jsonResponse(res, 413, { error: "이미지 변환 용량이 너무 큽니다. PDF 페이지 수를 줄이거나 파일 용량을 낮춰 주세요." });
      }
    }

    const prompt = getPrompt({ positionContext, existingQuestions, hasPdf, resumeText });
    const raw = await callOpenAI({ prompt, resumePdfBase64, resumePdfImages, resumePdfMimeType });
    const analysis = normalizeAnalysis(raw);
    validateAnalysis(analysis);

    return jsonResponse(res, 200, { analysis, engine: "openai-vision", model: OPENAI_ANALYSIS_MODEL });
  } catch (error) {
    console.error("OpenAI resume analysis error:", error);
    return jsonResponse(res, 500, { error: error.message || "AI 분석 중 오류가 발생했습니다." });
  }
}
