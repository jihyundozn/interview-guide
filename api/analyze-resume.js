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
  let text = String(value || "");
  const replacements = [
    ["RESTAPI", "REST API"],
    ["OCRAPI", "OCR API"],
    ["Next. js", "Next.js"],
    ["Next .js", "Next.js"],
    ["Java 와", "Java와"],
    ["Spring 과", "Spring과"],
    ["TypeScript 와", "TypeScript와"],
    ["React 와", "React와"],
    ["Java와SpringBoot", "Java와 SpringBoot"],
    ["TypeScript와Next.js", "TypeScript와 Next.js"],
    ["TypeScript와Next. js", "TypeScript와 Next.js"],
    ["백엔드개발", "백엔드 개발"],
    ["프론트엔드개발", "프론트엔드 개발"],
    ["데이터베이스모델링", "데이터베이스 모델링"],
    ["요구사항분석", "요구사항 분석"],
    ["외부시스템연동", "외부 시스템 연동"],
    ["CI/CD환경", "CI/CD 환경"],
    ["설명해주세요", "설명해 주세요"],
    ["말씀해주세요", "말씀해 주세요"],
    ["확인해주세요", "확인해 주세요"],
  ];
  replacements.forEach(([from, to]) => { text = text.replaceAll(from, to); });
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,!?])([^\s\n])/g, "$1 $2")
    .replace(/\.([가-힣A-Z])/g, ". $1")
    .replace(/평가하기 위함\.?/g, "확인하기 위한 질문입니다.")
    .replace(/하기 위함\.?/g, "하기 위한 질문입니다.")
    .replace(/\s{2,}/g, " ")
    .trim();
}


function sanitizeCandidateAttribution(value) {
  let text = String(value || "");
  const replacements = [
    [/부족하다고\s*하셨는데/g, "이력서상 명확히 확인되지 않아"],
    [/부족하다고\s*말씀하셨는데/g, "이력서상 명확히 확인되지 않아"],
    [/강점이라고\s*하셨는데/g, "강점으로 볼 수 있는 경험이 있어"],
    [/강점이라고\s*말씀하셨는데/g, "강점으로 볼 수 있는 경험이 있어"],
    [/강조하셨는데/g, "중요하게 생각한다고 적어주셨는데"],
    [/강조하신/g, "중요하게 생각한다고 적어주신"],
    [/언급하셨는데/g, "적어주셨는데"],
    [/언급하신/g, "적어주신"],
    [/명시하셨는데/g, "적어주셨는데"],
    [/명시하신/g, "적어주신"],
  ];
  replacements.forEach(([pattern, to]) => { text = text.replace(pattern, to); });
  return text;
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

function isCompleteQuestionSentence(value) {
  const text = cleanText(value || "");
  if (!text) return false;
  // main은 UI에서 큰 제목처럼 노출되므로 반드시 면접관이 그대로 읽을 수 있는 질문문이어야 합니다.
  if (/[?？]$/.test(text)) return true;
  if (/(주세요|말씀해 주세요|설명해 주세요|확인해 주세요|주시겠어요|습니까|나요|까요)\.?$/.test(text)) return true;
  return false;
}

function toCompleteQuestionMain(item, main, follow) {
  const cleanedMain = cleanText(main || "");
  if (isCompleteQuestionSentence(cleanedMain)) return cleanedMain;

  const firstFollow = (follow || []).find((text) => cleanText(text));
  if (firstFollow) {
    const followText = cleanText(firstFollow);
    // 모델이 main에 검증 주제만 쓰고 follow에 실제 질문을 넣는 경우,
    // main의 구체 경험 앵커를 살리면서 follow 질문을 결합합니다.
    if (isCompleteQuestionSentence(followText)) {
      return cleanText(`${cleanedMain}와 관련해 ${followText}`);
    }
  }

  const evidence = cleanText(item?.sourceEvidence || item?.evidence || cleanedMain || "이력서에 기재된 관련 경험");
  const focus = cleanedMain && cleanedMain !== evidence ? cleanedMain : evidence;
  return cleanText(`${focus}와 관련해 본인이 직접 수행한 역할, 판단 기준, 실행 범위를 구체적으로 설명해 주세요.`);
}

function naturalizeQuestionAttribution(value) {
  let text = cleanText(value || "");

  // 질문의 근거는 sourceEvidence 박스에서 보여주므로, main에는 "이력서에서/이력서상/이력서에"를 반복적으로 넣지 않습니다.
  text = text.replace(/^이력서에서\s+(.+?)\s+경험을\s+확인했는데,\s*/g, "$1 경험과 관련해 ");
  text = text.replace(/^이력서에서\s+(.+?)\s+확인했는데,\s*/g, "$1와 관련해 ");
  text = text.replace(/^(.+?)\s+경험을\s+이력서에서\s+확인했는데,\s*/g, "$1 경험과 관련해 ");
  text = text.replace(/^이력서에\s+(.+?)\s+적어주셨는데,\s*/g, "$1와 관련해 ");
  text = text.replace(/^이력서에\s+(.+?)\s+기재되어\s+있는데,\s*/g, "$1와 관련해 ");
  text = text.replace(/^이력서에\s+(.+?)\s+수행하신\s+것으로\s+보이는데,\s*/g, "$1와 관련해 ");
  text = text.replace(/^이력서에\s+(.+?)\s+개발하신\s+것으로\s+보이는데,\s*/g, "$1와 관련해 ");
  text = text.replace(/^이력서상\s+(.+?)\s+관련\s+경험이\s+명확히\s+확인되지\s+않습니다\.\s*관련\s+경험이\s+있다면/g, "이번 포지션에서는 $1 관련 경험이 중요하게 요구됩니다. 관련 경험이나 학습·실무 적용 사례가 있다면");
  text = text.replace(/^이력서상\s+(.+?)\s+명확히\s+확인되지\s+않습니다\.\s*관련\s+경험이\s+있다면/g, "이번 포지션에서는 $1 경험이 중요하게 요구됩니다. 관련 경험이나 학습·실무 적용 사례가 있다면");

  return cleanText(text);
}

function buildFallbackFollowQuestions(main, item) {
  const text = cleanText(main || "해당 경험");
  const competency = cleanText(item?.relatedCompetency || item?.competency || "해당 역량");

  const questions = [];

  if (/관련 경험이나 학습·실무 적용 사례가 있다면/.test(text) || /중요하게 요구됩니다/.test(text)) {
    questions.push("해당 경험이 있다면 실제 프로젝트에서 어떤 역할로 참여하셨는지 설명해 주세요.");
    questions.push("실무 경험이 없다면 어떤 방식으로 학습했고, 실제 업무에 적용 가능한 수준인지 설명해 주세요.");
    return questions;
  }

  if (/설계|구조|아키텍처|패턴|API|인증|연동/.test(text)) {
    questions.push("그 구조를 선택할 때 비교했던 대안이나 판단 기준은 무엇이었나요?");
    questions.push("본인이 직접 결정한 범위와 팀에서 함께 정한 범위는 어떻게 구분되었나요?");
    questions.push("적용 후 개선 효과를 어떤 기준으로 확인했나요?");
    return questions.slice(0, 3);
  }

  if (/요구사항|기획|고객사|정책|화면 흐름/.test(text)) {
    questions.push("요구사항을 구체화하는 과정에서 본인이 직접 정리하거나 제안한 내용은 무엇이었나요?");
    questions.push("고객사 요청과 개발 가능 범위가 달랐던 부분이 있었다면 어떻게 조율했나요?");
    questions.push("최종 구현 범위를 결정할 때 가장 중요하게 본 기준은 무엇이었나요?");
    return questions.slice(0, 3);
  }

  if (/협업|공유|온보딩|컨벤션|문서|DX|생산성/.test(text + " " + competency)) {
    questions.push("그 활동에서 본인이 직접 만든 기준이나 산출물은 무엇이었나요?");
    questions.push("팀원들이 실제로 활용하도록 만들기 위해 어떤 방식으로 공유하거나 정착시켰나요?");
    questions.push("활동 이후 협업 방식이나 개발 생산성에 어떤 변화가 있었나요?");
    return questions.slice(0, 3);
  }

  questions.push("그 경험에서 본인이 직접 판단하거나 결정한 부분은 무엇이었나요?");
  questions.push("그 판단이 결과에 어떤 영향을 미쳤는지 구체적으로 설명해 주세요.");
  questions.push("다시 같은 상황이 주어진다면 보완하고 싶은 부분은 무엇인가요?");
  return questions.slice(0, 3);
}

function normalizeQuestion(item, index) {
  let follow = toArray(item?.follow || item?.followUps || item?.followup).map(cleanText).filter(Boolean).slice(0, 3);
  const rawMain = sanitizeCandidateAttribution(cleanText(item?.main || item?.question || ""));
  const main = naturalizeQuestionAttribution(toCompleteQuestionMain(item, rawMain, follow));

  if (follow.length < 2) {
    const fallbackFollow = buildFallbackFollowQuestions(main, item);
    follow = [...follow, ...fallbackFollow].map(cleanText).filter(Boolean);
  }

  follow = Array.from(new Set(follow))
    .filter((question) => question && question !== main)
    .slice(0, 3);

  return {
    id: item?.id || `ai_question_${Date.now()}_${index}`,
    type: cleanText(item?.type || "경험 검증"),
    main: main || "관련 경험에서 본인이 직접 수행한 역할과 판단 기준을 구체적으로 설명해 주세요.",
    follow,
    intent: normalizeIntent(item?.intent || item?.purpose || ""),
    relatedCompetency: cleanText(item?.relatedCompetency || item?.competency || "직무 적합성"),
    sourceEvidence: cleanText(item?.sourceEvidence || item?.evidence || "이력서상 관련 경험"),
    points: toArray(item?.points || item?.checkPoints || item?.tags).map(cleanText).filter(Boolean).slice(0, 5),
  };
}


function isGenericQuestionText(value) {
  const text = cleanText(value || "");
  if (!text) return true;
  if (!isCompleteQuestionSentence(text)) return true;
  const genericPatterns = [
    /가장\s*도전적/i,
    /주요\s*도전\s*과제/i,
    /어려웠던\s*부분|어떤\s*어려움/i,
    /무엇이었나요\??$/,
    /어떻게\s*해결하셨나요\??$/,
    /문제를\s*어떻게\s*해결/i,
    /경험이\s*있다면\s*말씀/i,
    /역할은\s*무엇/i,
    /성과를\s*낸\s*경험/i,
  ];
  const hasResumeAnchor = /(프로젝트|시스템|서비스|모듈|플랫폼|솔루션|제도|프로세스|온보딩|평가|보상|조직|리더|연동|전환|개선|구축|설계|모델링|정산|OCR|REST API|CI\/CD|GitLab|Jenkins|CRM\/BI|Syncbox|LAOS|가나안|삼성)/.test(text);
  const asksDeepProbe = /(본인|직접|역할|기여|판단\s*기준|선택\s*이유|산정\s*기준|성과\s*근거|설계\s*방식|처리\s*방식|트레이드오프|의사결정|조율|검증|운영\s*관점|개선\s*전후)/.test(text);
  if (genericPatterns.some((pattern) => pattern.test(text))) return true;
  if (!hasResumeAnchor || !asksDeepProbe) return true;
  if (text.length < 34) return true;
  return false;
}

function isGenericEvidence(value) {
  const text = cleanText(value || "");
  if (!text || text.length < 6) return true;
  return /(다양한\s*프로젝트|관련\s*경험|이력서상\s*관련|팀\s*프로젝트|프로젝트\s*경험|기술\s*경험|업무\s*경험)$/i.test(text);
}

function questionNeedsRefine(question) {
  return isGenericQuestionText(question?.main) || isGenericEvidence(question?.sourceEvidence);
}

function questionQualityWarnings(questions = []) {
  return (questions || [])
    .map((question, index) => ({ index, main: question?.main || "", sourceEvidence: question?.sourceEvidence || "" }))
    .filter((item) => questionNeedsRefine(item));
}

function hasStrongEvidence(text) {
  return /(직접|주도|설계|구축|운영|개선|리딩|리더|성과|수치|단축|증가|자동화|고도화|모델링|연동|배포|장애|최적화)/.test(cleanText(text));
}

function isWeakEvidence(text) {
  const t = cleanText(text);
  return /(확인\s*필요|추가\s*확인|추가\s*검증|명확하지|부족|불명확|드러나지|단정하기\s*어렵|간접|일부|제한적|확인되지|미기재|기재되어\s*있지|찾기\s*어렵|없습니다)/.test(t);
}

function isMissingEvidence(text) {
  const t = cleanText(text);
  return /(명확히\s*확인되지|확인되지\s*않|기재되어\s*있지|미기재|드러나지|찾기\s*어렵|관련\s*경험\s*없|경험이\s*없|부족|불명확)/.test(t);
}

function isIndirectEvidence(text) {
  const t = cleanText(text);
  return /(간접|유사|일부|제한적|학습|스터디|개인\s*프로젝트|보조적|가능성|추정|보입니다|판단됩니다)/.test(t);
}

function isTechnicalOrRequiredCompetency(text, positionContext = {}) {
  const t = cleanText(text);
  const terms = getPositionRequiredTerms(positionContext).join(' ');
  return /(Java|Spring|SpringBoot|TypeScript|Next\.js|React|API|TCP|ORM|JPA|MyBatis|Oracle|MSSQL|DB|SQL|백엔드|프론트엔드|개발|서버|아키텍처|인증|연동|배치|Web|Batch|Docker|ECS|AWS|Git|GitLab|CI\/CD)/i.test(`${t} ${terms}`);
}

function isLikelySoftSkillCompetency(text) {
  return /(커뮤니케이션|팀워크|협업|소통|책임감|주도성|일정|계획|요구사항|분석|관리|조율|이해관계)/.test(cleanText(text));
}

function getPositionRequiredTerms(positionContext = {}) {
  const raw = [
    ...(Array.isArray(positionContext.requiredQualifications) ? positionContext.requiredQualifications : []),
    ...(Array.isArray(positionContext.keyTasks) ? positionContext.keyTasks : []),
    ...(Array.isArray(positionContext.coreCompetencies) ? positionContext.coreCompetencies : []),
  ].join(' ');

  const englishTerms = raw.match(/[A-Za-z][A-Za-z0-9.+/#-]*/g) || [];
  const koreanTerms = raw
    .split(/[\n,;·•]/)
    .map((item) => cleanText(item))
    .filter((item) => item.length >= 4 && item.length <= 28);

  return [...new Set([...englishTerms, ...koreanTerms])].filter(Boolean);
}

function isDirectRequiredGap(combined, positionContext = {}) {
  if (!isWeakEvidence(combined)) return false;
  const terms = getPositionRequiredTerms(positionContext);
  if (!terms.length) return false;
  return terms.some((term) => {
    const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i').test(combined);
  });
}

function applyStrictScoreRules(items, positionContext = {}) {
  return (items || []).map((item) => {
    const competency = cleanText(item.competency);
    const evidence = cleanText(item.evidence);
    const combined = `${competency} ${evidence}`;
    let score = clampScore(item.score, 0);

    const missingEvidence = isMissingEvidence(combined);
    const weakEvidence = isWeakEvidence(combined);
    const indirectEvidence = isIndirectEvidence(combined);
    const directRequiredGap = isDirectRequiredGap(combined, positionContext);
    const technicalOrRequired = isTechnicalOrRequiredCompetency(combined, positionContext);
    const softSkill = isLikelySoftSkillCompetency(competency);
    const strongEvidence = hasStrongEvidence(combined);

    // 점수 하한을 두지 않습니다. 이력서상 직접 근거가 없으면 60점 미만까지 내려갈 수 있어야 합니다.
    // 특히 필수자격/필요경험에 명시된 기술·업무가 확인되지 않으면 20~40점대까지 제한합니다.
    if (missingEvidence && (directRequiredGap || technicalOrRequired)) {
      score = Math.min(score, 35);
    } else if (missingEvidence) {
      score = Math.min(score, 45);
    }

    // 유사/간접 경험 또는 학습 수준은 60점 미만으로 제한합니다.
    if (indirectEvidence) {
      score = Math.min(score, technicalOrRequired ? 50 : 58);
    }

    // 직접 수행, 설계, 구축, 성과 등 강한 근거가 없으면 고득점을 제한합니다.
    if (!strongEvidence) {
      score = Math.min(score, softSkill ? 65 : 60);
    } else {
      score = Math.min(score, 85);
    }

    // 약한 근거 표현이 있으면 70점 이상을 제한합니다.
    if (weakEvidence) {
      score = Math.min(score, missingEvidence ? score : 68);
    }

    // 소프트스킬은 직무가 달라도 일부 근거가 있을 수 있으므로 0점화하지 않되,
    // 구체적 상황·본인 역할·산출물이 약하면 60점대 중반 이하로 제한합니다.
    if (softSkill) {
      if (!/(조율|협업|리더|리딩|일정|계획|우선순위|요구사항|분석|공유|갈등|이해관계|고객사|산출물|정리|제안|개선)/.test(evidence)) {
        score = Math.min(score, 55);
      } else {
        score = Math.min(score, 68);
      }
    }

    if (score >= 90) score = 85;
    return { ...item, competency, evidence, score: clampScore(score, 0) };
  });
}

function buildQuestionTypeFromFit(fit, fallback = "경험 검증") {
  const competency = cleanText(fit?.competency || fallback);
  if (!competency) return fallback;
  const compact = competency
    .replace(/\s*충족도$/g, "")
    .replace(/\s*능력$/g, "")
    .replace(/\s*경험$/g, "")
    .replace(/\s*이해$/g, "")
    .trim();
  return compact.length > 14 ? `${compact.slice(0, 14)}… 검증` : `${compact} 검증`;
}

function alignQuestionTypesWithJdFit(questions, jdFit) {
  if (!questions?.length) return [];
  if (!jdFit?.length) {
    return questions.map((question) => ({ ...question, type: cleanText(question.type || "경험 검증") }));
  }

  return questions.map((question, index) => {
    const fit = jdFit[index % jdFit.length];
    const relatedCompetency = cleanText(question.relatedCompetency || fit?.competency || question.type || "직무 적합성");
    return {
      ...question,
      type: buildQuestionTypeFromFit(fit, question.type || "경험 검증"),
      relatedCompetency,
    };
  });
}

function calculateOverallFromJdFit(jdFit) {
  if (!jdFit?.length) return 0;
  const scores = jdFit.map((item) => clampScore(item.score, 0));
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const severeGapCount = scores.filter((score) => score <= 39).length;
  const weakCount = scores.filter((score) => score <= 59).length;
  const midWeakCount = scores.filter((score) => score <= 69).length;
  const strongCount = scores.filter((score) => score >= 75).length;

  let overall = Math.round(avg);

  // 핵심 필수요건이 거의 확인되지 않는 경우 전체 점수를 60점 이상으로 올리지 않습니다.
  if (severeGapCount >= 2) overall = Math.min(overall, 39);
  else if (severeGapCount >= 1 && weakCount >= 2) overall = Math.min(overall, 49);
  else if (weakCount >= 3) overall = Math.min(overall, 54);
  else if (midWeakCount >= 3) overall = Math.min(overall, 64);

  // 모든 항목이 60점 미만이면 직무 매칭도가 낮은 것으로 보고 45점 이하로 제한합니다.
  if (strongCount === 0 && scores.every((score) => score <= 59)) {
    overall = Math.min(overall, 45);
  }

  return clampScore(overall, 0);
}

function normalizeAnalysis(raw, positionContext = {}) {
  const source = raw || {};
  let jdFit = toArray(source.jdFit || source.jdCompetencyFit || source.competencyFit).map((item, index) => ({
    id: item?.id || `jd_fit_${index}`,
    competency: cleanText(item?.competency || item?.name || item?.title || `JD 역량 ${index + 1}`),
    score: clampScore(item?.score || item?.fitScore, 0),
    evidence: cleanText(item?.evidence || item?.reason || item?.rationale || ""),
  })).filter((item) => item.competency && item.evidence).slice(0, 5);
  jdFit = applyStrictScoreRules(jdFit, positionContext);

  let customQuestions = toArray(source.customQuestions || source.recommendedQuestions || source.questions)
    .map(normalizeQuestion)
    .filter((item) => item.main)
    .slice(0, 8);
  customQuestions = alignQuestionTypesWithJdFit(customQuestions, jdFit);

  const verificationPoints = toArray(source.verificationPoints || source.checkPoints)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 8);

  const overallFitScore = calculateOverallFromJdFit(jdFit);

  return {
    overallFitScore,
    summary: cleanText(source.summary || source.candidateSummary || ""),
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

[매우 중요한 출력 원칙]
- 이력서 문구를 그대로 옮기지 말고, 반드시 내용을 이해한 뒤 새로운 한국어 문장으로 재작성하세요.
- 모든 출력은 표준 한국어 맞춤법과 띄어쓰기를 적용하세요.
- 기술명과 조사는 자연스럽게 표기하세요. 예: "Java와", "SpringBoot를", "TypeScript와", "Next.js 기반".
- 붙은 단어를 그대로 출력하지 마세요. 예: "이선우지원자" 금지, "백엔드개발경력" 금지, "RESTAPI" 금지.
- JD 문구를 그대로 반복하지 말고 면접 평가 언어로 바꿔 작성하세요.
- 합격/불합격 판단은 하지 말고, 면접 전 검토 보조자료만 작성하세요.

[점수 산정 기준: 반드시 보수적으로 평가]
- 이 점수는 합격 가능성 점수가 아니라, 이력서만으로 확인되는 JD 근거의 강도입니다. 점수 하한은 없습니다.
- 90~100점: JD 필수요건과 거의 직접 일치하고, 본인 역할·성과·기술 수준이 구체적으로 확인될 때만 사용하세요. 일반적으로 거의 사용하지 않습니다.
- 80~89점: 직접 관련 경험이 있고, 주요 필수요건을 대부분 충족합니다.
- 70~79점: 관련 경험은 있으나 범위, 수준, 성과 근거가 일부 불명확합니다.
- 60~69점: 유사 경험은 있으나 JD 필수요건과의 직접 연결은 약합니다.
- 40~59점: 인접 경험은 있으나 핵심 필수요건 충족 근거가 부족합니다.
- 20~39점: 직무, 기술, 업무 경험이 크게 다르거나 핵심 요건이 이력서상 확인되지 않습니다.
- 0~19점: 판단 가능한 관련 근거가 거의 없습니다.
- 해당 포지션의 필수자격/필요경험에 직접 명시된 기술·도메인·업무 경험이 이력서에서 명확히 확인되지 않으면 해당 항목은 20~40점대로 평가하세요.
- 단순 학습, 관심, 유사 경험, 간접 경험만 있는 경우는 40~59점대로 평가하세요.
- 소프트스킬이나 실행 역량은 다른 직무에서도 근거가 있을 수 있으므로 0점 처리하지는 말되, 구체적 상황·본인 역할·산출물이 확인되지 않으면 55~65점 이하로 평가하세요.
- overallFitScore는 jdFit 점수 평균을 기반으로 하되, 핵심 필수요건 미충족 항목이 2개 이상이면 39점 이하, 1개 이상이면 49점 이하까지 내려갈 수 있습니다.
- 개발자 포지션에 영업 이력서처럼 직무군이 크게 다른 경우, 커뮤니케이션 항목이 일부 맞더라도 overallFitScore는 40점대 이하가 자연스럽습니다.

[출력 구조]
1. overallFitScore: 0~100 정수. summary에는 점수를 반복하지 마세요.
2. summary: 2~4문장. 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 포함하세요.
3. jdFit: 필수자격/필요경험을 1차 기준으로 3~5개 항목을 재구성하세요. 각 항목은 competency, score, evidence를 포함하세요.
4. verificationPoints: 4~6개. 무엇을 왜 확인해야 하는지 구체적으로 작성하세요.
5. customQuestions: 6개. 이력서의 특정 경험/프로젝트/성과를 기반으로 개인화 질문을 작성하세요.

[후보자 맞춤 질문 작성 규칙: 매우 중요]
- customQuestions는 기존 구조화면접 공통질문을 대체하는 질문이 아니라, 이력서에 적힌 개별 경험을 검증하는 질문입니다. 따라서 일반 역량 질문을 만들지 마세요.
- customQuestions는 위에서 도출한 jdFit 항목을 골고루 검증하도록 구성하세요. 특정 직무에만 해당하는 고정 항목을 임의로 넣지 말고, 반드시 [HR 등록 포지션 분석 기준]에서 실제로 도출되는 평가 항목을 기준으로 질문을 분산하세요.
- 각 질문의 main에는 반드시 이력서에 실제로 등장하는 구체 경험 앵커를 포함하세요. 앵커는 프로젝트명, 서비스명, 시스템명, 제도명, 업무명, 기술 조합, 성과명 중 하나여야 합니다.
- main은 반드시 면접관이 그대로 읽을 수 있는 완성된 질문문이어야 합니다. 검증 주제, 제목, 명사형 문장으로 작성하지 마세요.
- main은 반드시 "~설명해 주세요.", "~말씀해 주세요.", "~확인해 주세요." 또는 물음표로 끝나는 질문형 문장이어야 합니다.
- 예: "Sinsunro 프로젝트에서 Next.js와 TypeScript를 활용해 API 연동 구조를 개선할 때, 본인이 직접 판단한 설계 기준과 실행 범위를 설명해 주세요."
- 금지: "Sinsunro 프로젝트에서 Next.js와 TypeScript를 활용한 API 연동 구조 개선"처럼 제목만 쓰는 방식.
- sourceEvidence에는 "다양한 프로젝트", "관련 경험", "팀 프로젝트", "이력서상 관련 경험"처럼 포괄적인 표현을 쓰지 마세요. 반드시 PDF에 등장한 경험명/업무명/기술 조합을 짧게 적으세요.
- 질문은 단순히 "어려움/도전 과제/해결 방법"을 묻는 방식으로 작성하지 마세요. 본인 역할, 판단 기준, 설계 선택, 우선순위 결정, 성과 산정 기준, 협업 조율, 운영상 트레이드오프 중 하나 이상을 구체적으로 물어야 합니다.
- 아래 표현으로 질문을 끝내지 마세요: "가장 도전적이었던 부분은 무엇인가요?", "어떤 어려움이 있었나요?", "어떻게 해결했나요?", "역할은 무엇이었나요?", "경험이 있다면 말씀해 주세요."
- 같은 문장 구조를 반복하지 마세요. 6개 질문은 서로 다른 검증 초점을 가져야 합니다.
- 질문은 "~설명해 주세요.", "~말씀해 주세요."처럼 면접관이 그대로 읽을 수 있는 존댓말로 작성하세요.
- follow에는 반드시 2~3개의 꼬리 질문을 작성하세요. 빈 배열([])로 두지 마세요.
- follow는 main 질문을 그대로 반복하지 말고, 답변을 깊게 파고들 수 있는 후속 질문이어야 합니다. 예: "그 기준을 선택한 이유는 무엇이었나요?", "본인이 직접 결정한 범위와 팀에서 정한 범위는 어떻게 구분되었나요?", "결과를 어떤 지표나 피드백으로 확인했나요?"
- follow도 반드시 면접관이 그대로 읽을 수 있는 자연스러운 질문문으로 작성하세요.
- AI가 JD와 비교해 판단한 부족/우려/추가 확인 사항을 후보자가 직접 말한 것처럼 표현하지 마세요. 특히 "부족하다고 하셨는데", "강점이라고 하셨는데", "강조하셨는데", "언급하셨는데"는 사용하지 마세요.
- 질문이 이력서 기반이라는 점은 sourceEvidence 필드에서 명확히 보여주면 됩니다. main 문장에 매번 "이력서에서", "이력서상", "이력서에"라는 표현을 넣지 마세요.
- 후보자가 실제로 이력서에 작성한 표현을 확인할 때만 예외적으로 "~라고 적어주셨는데"를 사용할 수 있습니다. 단, 이 표현도 6개 질문 중 1개 이하로만 사용하세요.
- JD상 중요한 요건이지만 이력서에서 명확히 확인되지 않는 항목을 묻는 경우에도 "이력서상"으로 시작하지 말고, "이번 포지션에서는 ~ 경험이 중요하게 요구됩니다. 관련 경험이나 학습·실무 적용 사례가 있다면 설명해 주세요."처럼 자연스럽게 작성하세요.
- main은 자연스러운 면접 질문이어야 하며, 출처 표시는 sourceEvidence에 맡기세요.
- 질문 의도는 모두 "~확인하기 위한 질문입니다." 형식으로 통일하세요.
- 좋은 질문 예시의 형태: "[이력서의 특정 경험명]에서 [구체 업무/기술/제도]를 수행할 때 본인이 직접 판단한 기준과 실행 범위를 설명해 주세요."
- 나쁜 질문 예시: "프로젝트에서 가장 도전적이었던 부분은 무엇이었나요?" / "팀 프로젝트에서 협업을 통해 성과를 낸 경험이 있다면 말씀해 주세요."

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[기존 구조화면접 질문 예시 - 중복 금지]
${existing}

${hasPdf ? `[지원자 이력서]\nPDF 원본 파일이 함께 첨부되어 있습니다. PDF의 텍스트 레이어와 시각적 렌더링을 함께 참고해 분석하세요.` : `[지원자 이력서 텍스트]\n${String(resumeText || "").slice(0, 30000)}`}`;
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
        verificationPoints: { type: "array", minItems: 4, maxItems: 8, items: { type: "string" } },
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
              follow: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
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

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function isRetryableOpenAIStatus(status) { return [408,409,429,500,502,503,504].includes(status); }

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
  if (fileInput) content.push(fileInput);
  else if (String(resumeText || "").trim()) content.push({ type: "input_text", text: `\n[지원자 이력서 텍스트]\n${String(resumeText).slice(0, 30000)}` });
  return {
    model: OPENAI_ANALYSIS_MODEL,
    input: [{ role: "user", content }],
    temperature: 0.1,
    max_output_tokens: 6500,
    text: { format: { type: "json_schema", ...getOpenAIJsonSchema() } },
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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  }, { retries: 1, timeoutMs: 95000 });
  const text = extractOpenAIText(data);
  if (!text) throw new Error("OpenAI 응답에서 분석 결과를 찾지 못했습니다.");
  return parseJsonLoose(text);
}

async function callOpenAIWithPdf({ prompt, resumePdfBase64, resumeText, resumePdfMimeType, resumePdfName }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  if (!resumePdfBase64) return callOpenAIResponses(buildResponsesPayload({ prompt, resumeText }), apiKey);
  let uploadedFileId = "";
  try {
    uploadedFileId = await uploadPdfToOpenAI({ apiKey, resumePdfBase64, resumePdfMimeType, resumePdfName });
    const payload = buildResponsesPayload({ prompt, fileInput: { type: "input_file", file_id: uploadedFileId }, resumeText });
    return await callOpenAIResponses(payload, apiKey);
  } catch (fileIdError) {
    console.warn("OpenAI file_id PDF path failed, trying inline base64 PDF:", fileIdError?.message || fileIdError);
    const mime = resumePdfMimeType || "application/pdf";
    const inlinePayload = buildResponsesPayload({
      prompt,
      fileInput: { type: "input_file", filename: resumePdfName || "resume.pdf", file_data: `data:${mime};base64,${resumePdfBase64}` },
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
  return /(이선우지원자|지원자는\d|[가-힣]{2,4}지원자|RESTAPI|OCRAPI|백엔드개발|데이터베이스모델링|요구사항분석|Java와Spring|TypeScript와Next|Next\.\s+js|CI\/CD환경|경험이풍부|경험이있|보유하고있|추가검증|추가확인|설명해주세요)/.test(text);
}

function enforceScoresFromOriginal(original, polished, positionContext = {}) {
  const result = normalizeAnalysis(polished || original, positionContext);
  const base = normalizeAnalysis(original, positionContext);
  result.overallFitScore = base.overallFitScore;
  result.jdFit = result.jdFit.map((item, index) => ({ ...item, id: base.jdFit[index]?.id || item.id, score: base.jdFit[index]?.score ?? item.score }));
  if (base.jdFit.length) {
    result.overallFitScore = calculateOverallFromJdFit(base.jdFit);
  }
  return result;
}

async function polishKoreanWithOpenAI(analysis, positionContext = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return normalizeAnalysis(analysis, positionContext);
  const normalized = normalizeAnalysis(analysis, positionContext);
  if (!shouldRunLanguagePolish(normalized)) return normalized;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_POLISH_MODEL || "gpt-4o",
        input: [{ role: "user", content: [{ type: "input_text", text: `아래 JSON은 이력서 분석 결과입니다. 점수와 판단 내용은 바꾸지 말고, 모든 한국어 문장을 면접관이 읽을 수 있는 자연스러운 문장으로 다시 작성해 주세요.\n\n반드시 지킬 것:\n- overallFitScore와 jdFit.score 숫자는 절대 변경하지 마세요.\n- JSON 구조와 배열 개수는 유지하세요.\n- "이선우지원자"처럼 붙은 이름/명사는 자연스럽게 띄어 쓰세요.\n- "Java 와"는 "Java와", "TypeScript 와"는 "TypeScript와", "Next. js"는 "Next.js"로 고치세요.\n- "RESTAPI"는 "REST API", "OCRAPI"는 "OCR API"로 고치세요.\n- 질문은 sourceEvidence의 특정 경험을 바탕으로 본인 역할·판단 기준·성과 근거를 묻는 구체적인 질문으로 정리하세요.\n- 질문 의도는 "~확인하기 위한 질문입니다." 형태로 통일하세요.\n\nJSON:\n${JSON.stringify(normalized)}` }] }],
        temperature: 0,
        max_output_tokens: 5000,
        text: { format: { type: "json_schema", ...getOpenAIJsonSchema() } },
      }),
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return normalized;
    const text = extractOpenAIText(data);
    if (!text) return normalized;
    const polished = parseJsonLoose(text);
    return enforceScoresFromOriginal(normalized, polished, positionContext);
  } catch (error) {
    clearTimeout(timeout);
    console.warn("Korean polish skipped:", error?.message || error);
    return normalized;
  }
}


async function refineQuestionsWithOpenAI(analysis, positionContext = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const normalized = normalizeAnalysis(analysis, positionContext);
  const warnings = questionQualityWarnings(normalized.customQuestions);
  if (!apiKey || !warnings.length) return normalized;

  const timeoutMs = 30000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_POLISH_MODEL || "gpt-4o",
        input: [{
          role: "user",
          content: [{
            type: "input_text",
            text: `아래 JSON은 이력서 분석 결과입니다. 점수, jdFit, summary, verificationPoints는 바꾸지 말고 customQuestions만 다시 작성하세요.

목표:
- 기존 구조화면접 공통질문이 아니라, 이력서에 적힌 개별 경험을 검증하는 질문으로 만드세요.
- 각 질문은 jdFit 항목을 골고루 검증해야 합니다.
- 각 질문 main에는 sourceEvidence의 구체 경험 앵커가 반드시 들어가야 합니다.
- main은 반드시 면접관이 그대로 읽을 수 있는 완성된 질문문이어야 합니다. 검증 주제, 제목, 명사형 문장으로 작성하지 마세요.
- main은 반드시 "~설명해 주세요.", "~말씀해 주세요.", "~확인해 주세요." 또는 물음표로 끝나는 질문형 문장이어야 합니다.
- sourceEvidence는 "다양한 프로젝트", "관련 경험", "팀 프로젝트" 같은 포괄 표현이 아니라 구체 프로젝트명/업무명/기술 조합이어야 합니다.
- "가장 도전적", "어떤 어려움", "어떻게 해결", "역할은 무엇" 같은 일반 질문은 금지입니다.
- 질문은 본인 역할, 판단 기준, 설계 선택, 성과 산정 기준, 협업 조율, 운영상 트레이드오프 중 하나 이상을 구체적으로 물어야 합니다.
- AI가 판단한 부족/우려/추가 확인 사항을 후보자가 직접 말한 것처럼 표현하지 마세요. "부족하다고 하셨는데", "강점이라고 하셨는데", "강조하셨는데", "언급하셨는데"는 금지입니다.
- 질문이 이력서 기반이라는 점은 sourceEvidence 필드에서 보여주세요. main 문장에 매번 "이력서에서", "이력서상", "이력서에"를 넣지 마세요.
- 후보자가 실제로 이력서에 작성한 표현을 확인할 때만 예외적으로 "~라고 적어주셨는데"를 사용할 수 있습니다. 단, 이 표현도 6개 질문 중 1개 이하로만 사용하세요.
- 이력서에서 직접 확인되지 않는 JD 필수요건을 묻는 경우에는 "이력서상"으로 시작하지 말고, "이번 포지션에서는 ~ 경험이 중요하게 요구됩니다. 관련 경험이나 학습·실무 적용 사례가 있다면 설명해 주세요."처럼 자연스럽게 작성하세요.
- main은 자연스러운 면접 질문이어야 하며, 출처 표시는 sourceEvidence에 맡기세요.
- 질문 의도는 "~확인하기 위한 질문입니다."로 끝내세요.

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[현재 분석 JSON]
${JSON.stringify(normalized)}`,
          }],
        }],
        temperature: 0,
        max_output_tokens: 5000,
        text: { format: { type: "json_schema", ...getOpenAIJsonSchema() } },
      }),
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return normalized;
    const text = extractOpenAIText(data);
    if (!text) return normalized;
    const polished = parseJsonLoose(text);
    const result = enforceScoresFromOriginal(normalized, polished, positionContext);
    const afterWarnings = questionQualityWarnings(result.customQuestions);
    // 재작성 후 더 나빠졌거나 대부분 여전히 일반 질문이면 원본을 유지합니다.
    if (afterWarnings.length >= result.customQuestions.length - 1) return normalized;
    return result;
  } catch (error) {
    clearTimeout(timeout);
    console.warn("Question refinement skipped:", error?.message || error);
    return normalized;
  }
}


function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase 환경변수가 설정되어 있지 않습니다.");

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!response.ok) {
    const message = data && typeof data === "object"
      ? data.message || data.error || JSON.stringify(data)
      : text;
    throw new Error(message || `Supabase 요청 실패: ${response.status}`);
  }

  return data;
}

function encodeSupabaseValue(value) {
  return encodeURIComponent(String(value || "").trim());
}

function getPositionTitleForSave(positionContext = {}, body = {}) {
  return cleanText(
    body.position_title ||
    body.positionTitle ||
    positionContext.positionName ||
    positionContext.name ||
    positionContext.title ||
    positionContext.positionId ||
    ""
  );
}

function getCandidateNameForSave(body = {}) {
  return cleanText(
    body.candidate_name ||
    body.candidateName ||
    body.applicant_name ||
    body.applicantName ||
    ""
  );
}

async function findOrCreateCandidate({ positionTitle, candidateName, source = "ai_resume" }) {
  const existing = await supabaseRequest(
    `candidates?select=id,latest_analysis_id&position_title=eq.${encodeSupabaseValue(positionTitle)}&candidate_name=eq.${encodeSupabaseValue(candidateName)}&limit=1`,
    { method: "GET" }
  );

  if (Array.isArray(existing) && existing[0]?.id) {
    return existing[0];
  }

  const inserted = await supabaseRequest("candidates", {
    method: "POST",
    body: JSON.stringify({
      position_title: positionTitle,
      candidate_name: candidateName,
      source,
      status: "analyzed",
      is_added_to_guide: false,
    }),
  });

  const candidate = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!candidate?.id) throw new Error("후보자 저장 결과에서 candidate_id를 찾지 못했습니다.");
  return candidate;
}

async function saveAnalysisToSupabase({ body, positionContext, analysis }) {
  if (!getSupabaseConfig()) {
    return { saved: false, reason: "supabase_env_missing" };
  }

  const positionTitle = getPositionTitleForSave(positionContext, body);
  const candidateName = getCandidateNameForSave(body);

  // 현재 ai-resume.html이 candidateName을 아직 보내지 않는 버전일 수 있으므로,
  // 이름이 없으면 분석은 정상 반환하고 공통 저장만 건너뜁니다.
  if (!positionTitle || !candidateName) {
    return { saved: false, reason: "missing_position_or_candidate_name" };
  }

  const candidate = await findOrCreateCandidate({
    positionTitle,
    candidateName,
    source: "ai_resume",
  });

  const insertedAnalysis = await supabaseRequest("ai_resume_analyses", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidate.id,
      position_title: positionTitle,
      candidate_name: candidateName,
      overall_fit_score: clampScore(analysis.overallFitScore, null),
      analysis_result: analysis,
      selected_questions: [],
    }),
  });

  const savedAnalysis = Array.isArray(insertedAnalysis) ? insertedAnalysis[0] : insertedAnalysis;
  if (!savedAnalysis?.id) throw new Error("AI 분석 결과 저장 후 analysis_id를 찾지 못했습니다.");

  await supabaseRequest(`candidates?id=eq.${encodeURIComponent(candidate.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      latest_analysis_id: savedAnalysis.id,
      status: "analyzed",
      updated_at: new Date().toISOString(),
    }),
  });

  return {
    saved: true,
    candidate_id: candidate.id,
    analysis_id: savedAnalysis.id,
    position_title: positionTitle,
    candidate_name: candidateName,
  };
}

export const config = { maxDuration: 120, api: { bodyParser: false } };

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function getErrorMessage(error, fallback = "AI 분석 중 오류가 발생했습니다.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  try { return JSON.stringify(error); } catch (_) { return fallback; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, 405, { error: "POST 요청만 허용됩니다." });
  try {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { positionContext, resumeText, resumePdfBase64, resumePdfMimeType, resumePdfName, existingQuestions, debug } = body;
    if (!positionContext?.keyTasks?.length && !positionContext?.requiredQualifications?.length) {
      return jsonResponse(res, 400, { error: "포지션 분석 기준이 충분하지 않습니다." });
    }
    if (!resumePdfBase64 && !String(resumeText || "").trim()) {
      return jsonResponse(res, 400, { error: "이력서 PDF 또는 텍스트가 필요합니다." });
    }
    const prompt = getPrompt({ positionContext, existingQuestions, hasPdf: Boolean(resumePdfBase64), resumeText });
    const raw = await callOpenAIWithPdf({ prompt, resumePdfBase64, resumeText, resumePdfMimeType, resumePdfName });
    const polished = await polishKoreanWithOpenAI(raw, positionContext);
    let analysis = normalizeAnalysis(polished, positionContext);
    const beforeQuestionRefine = analysis;
    analysis = await refineQuestionsWithOpenAI(analysis, positionContext);
    analysis = normalizeAnalysis(analysis, positionContext);
    validateAnalysis(analysis);

    let supabaseSave = { saved: false, reason: "not_attempted" };
    try {
      supabaseSave = await saveAnalysisToSupabase({ body, positionContext, analysis });
    } catch (saveError) {
      // 분석 자체는 성공했으므로, 공통 저장 실패가 전체 분석 실패로 이어지지 않게 합니다.
      console.error("AI analysis saved locally but Supabase save failed:", saveError);
      supabaseSave = {
        saved: false,
        reason: "supabase_save_failed",
        error: getErrorMessage(saveError, "Supabase 저장 중 오류가 발생했습니다."),
      };
    }

    const payload = {
      analysis,
      engine: "openai-pdf",
      model: OPENAI_ANALYSIS_MODEL,
      supabaseSave,
      candidate_id: supabaseSave.candidate_id || null,
      analysis_id: supabaseSave.analysis_id || null,
    };
    if (debug || process.env.AI_RESUME_DEBUG === "true") {
      payload.debug = { raw, polished, beforeQuestionRefine, normalized: analysis, questionWarnings: questionQualityWarnings(analysis.customQuestions) };
    }
    return jsonResponse(res, 200, payload);
  } catch (error) {
    console.error("AI resume analysis error:", error);
    return jsonResponse(res, 500, { error: getErrorMessage(error) });
  }
}
