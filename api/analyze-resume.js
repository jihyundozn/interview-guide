function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('요청 본문이 너무 큽니다. 이력서 텍스트를 줄여주세요.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function safeString(value) {
  return String(value || '').trim();
}

function compactWhitespace(text) {
  const normalized = safeString(text)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[￾�]/g, ' ')
    .replace(/\[[0-9]+p\]/gi, ' ')
    .replace(/페이지\s*[0-9]+\s*\/\s*[0-9]+/g, ' ')
    .replace(/([가-힣A-Za-z0-9])\|([가-힣A-Za-z0-9])/g, '$1 / $2')
    .replace(/\s+/g, ' ')
    .trim();

  return rescueKoreanSpacing(normalized);
}

function cleanResumeTextForPrompt(text) {
  let cleaned = compactWhitespace(text);

  const brokenTerms = [
    ['백 엔 드', '백엔드'],
    ['프 론 트 엔 드', '프론트엔드'],
    ['개 발 자', '개발자'],
    ['경 력', '경력'],
    ['기 반', '기반'],
    ['업 무', '업무'],
    ['시 스 템', '시스템'],
    ['연 동', '연동'],
    ['모 델', '모델'],
    ['재 설 계', '재설계'],
    ['경 험', '경험'],
    ['보 유', '보유'],
    ['프 로 젝 트', '프로젝트'],
    ['서 비 스', '서비스'],
  ];

  brokenTerms.forEach(([from, to]) => {
    cleaned = cleaned.replaceAll(from, to);
  });

  return cleaned
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/([,.:;!?])(?=[가-힣A-Za-z0-9])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}



function rescueKoreanSpacing(text) {
  let t = safeString(text);

  const phraseReplacements = [
    ['CRMBI', 'CRM/BI'],
    ['CRM BI', 'CRM/BI'],
    ['Java 와', 'Java와'],
    ['Spring 을', 'Spring을'],
    ['Spring 를', 'Spring을'],
    ['을활용해', '을 활용해'],
    ['를활용해', '를 활용해'],
    ['을사용해', '을 사용해'],
    ['를사용해', '를 사용해'],
    ['웹시스템', '웹 시스템'],
    ['웹 시스템유지보수', '웹 시스템 유지보수'],
    ['유지보수와기능개선', '유지보수와 기능 개선'],
    ['기능개선을수행', '기능 개선을 수행'],
    ['과정에서가장', '과정에서 가장'],
    ['기술적문제와이를', '기술적 문제와 이를'],
    ['해결한방식을', '해결한 방식을'],
    ['설명해주세요', '설명해 주세요'],
    ['OCR API 연동과후처리', 'OCR API 연동과 후처리'],
    ['후처리로직설계', '후처리 로직 설계'],
    ['로직설계', '로직 설계'],
    ['구축시,', '구축 시,'],
    ['구축시', '구축 시'],
    ['Java 와 Spring 을활용해', 'Java와 Spring을 활용해'],
    ['Java 와 Spring 을 활용해', 'Java와 Spring을 활용해'],
    ['Java와 Spring 을활용해', 'Java와 Spring을 활용해'],
    ['TypeScript 및 Next. js', 'TypeScript 및 Next.js'],
    ['TypeScript 및 Next.js 직접 개발 경험', 'TypeScript 및 Next.js 직접 개발 경험'],
    ['Next. js', 'Next.js'],
    ['OCRAPI', 'OCR API'],
    ['RESTAPI', 'REST API'],
    ['TCP통신', 'TCP 통신'],
    ['API설계', 'API 설계'],
    ['API 연동과후처리', 'API 연동과 후처리'],
    ['API 시사용자', 'API 설계 시 사용자'],
    ['사용자화면흐름', '사용자 화면 흐름'],
    ['운영관점을어떻게고려', '운영 관점을 어떻게 고려'],
    ['구체사례와함께설명', '구체 사례와 함께 설명'],
    ['설명해주세요', '설명해 주세요'],
    ['수행해주세요', '수행해 주세요'],
    ['말씀해주세요', '말씀해 주세요'],
    ['상세히설명', '상세히 설명'],
    ['구체적으로설명', '구체적으로 설명'],
    ['본인의역할', '본인의 역할'],
    ['기술적기여', '기술적 기여'],
    ['가장어려웠던', '가장 어려웠던'],
    ['기술적문제', '기술적 문제'],
    ['해결한방식', '해결한 방식'],
    ['수행하는과정', '수행하는 과정'],
    ['구축시', '구축 시'],
    ['구현시', '구현 시'],
    ['설계시', '설계 시'],
    ['운영시', '운영 시'],
    ['금융문서', '금융 문서'],
    ['처리자동화', '처리 자동화'],
    ['자동화파이프라인', '자동화 파이프라인'],
    ['파이프라인구축', '파이프라인 구축'],
    ['후처리로직', '후처리 로직'],
    ['복합로직', '복합 로직'],
    ['구현능력', '구현 능력'],
    ['능력을평가', '능력을 평가'],
    ['역량을평가', '역량을 평가'],
    ['경험을평가', '경험을 평가'],
    ['기여를확인', '기여를 확인'],
    ['수준을확인', '수준을 확인'],
    ['범위를확인', '범위를 확인'],
    ['여부를확인', '여부를 확인'],
    ['백엔드개발역량', '백엔드 개발 역량'],
    ['프론트엔드및서비스연동경험', '프론트엔드 및 서비스 연동 경험'],
    ['외부시스템연동과복합로직구현능력', '외부 시스템 연동과 복합 로직 구현 능력'],
    ['문제해결능력', '문제 해결 능력'],
    ['구체적으로 설명해주세요', '구체적으로 설명해 주세요'],
  ];

  phraseReplacements.forEach(([from, to]) => {
    t = t.replaceAll(from, to);
  });

  // 영어/기술 토큰과 한국어 사이의 공백을 보정합니다.
  t = t
    .replace(/([A-Za-z0-9])\s+([.,/])/g, '$1$2')
    .replace(/([A-Za-z0-9/.+#-])(?=[가-힣])/g, '$1 ')
    .replace(/([가-힣])(?=(Java|Spring|Spring Boot|TypeScript|Next\.js|React|Node\.js|API|REST API|TCP|DB|SQL|AWS|Redis|OCR|CRM|BI))/g, '$1 ')
    .replace(/(Next)\.\s*(js)/g, 'Next.js')
    .replace(/(REST)\s+API/g, 'REST API')
    .replace(/(OCR)\s+API/g, 'OCR API')
    .replace(/(CRM)\s*\/\s*(BI)/g, 'CRM/BI');

  // 조사 뒤에 바로 동사/명사가 붙은 경우를 넓게 보정합니다.
  t = t
    .replace(/([가-힣A-Za-z0-9/.+#-]+)(을|를|이|가|은|는|과|와|및|에서|으로|로|부터|까지|에게|에도|에서는|에서는)(?=[가-힣]{2,})/g, '$1$2 ')
    .replace(/([가-힣]{2,})(시)(?=[,\s]|$)/g, '$1 시')
    .replace(/([가-힣]{2,})(경험|역량|능력|수준|범위|여부|방식|과정|기준|근거|역할|기여|성과|문제|요건|항목|내용|사례|계획|일정|리스크|프로젝트|시스템|서비스|화면|흐름|관점|로직|파이프라인|문서|자동화|연동|통신|개발|설계|구현|운영|관리|분석|개선|전환)(?=[가-힣]{2,})/g, '$1$2 ')
    .replace(/(활용|확인|검증|분석|설계|구현|개발|운영|관리|전환|연동|고려|평가|설명|수행|구축|개선|처리|작성|조율|공유|대응)(?=[가-힣]{2,})/g, '$1 ')
    .replace(/(?<!\s)(다만|특히|반면|따라서|또한|이 과정에서|면접에서는|추가로|후보자는|지원자는)(?=\S)/g, ' $1');

  // 너무 공격적인 보정 후 흔한 오분리를 되돌립니다.
  t = t
    .replace(/유지 보수/g, '유지보수')
    .replace(/커뮤니케이션/g, '커뮤니케이션')
    .replace(/프로 젝트/g, '프로젝트')
    .replace(/시 스템/g, '시스템')
    .replace(/서 비스/g, '서비스')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?])(?=\S)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

function normalizeIntentTone(value) {
  let t = rescueKoreanSpacing(normalizeGeneratedText(value));
  t = t.replace(/[.。\s]+$/g, '');
  t = t
    .replace(/하기\s*위함$/g, '하기 위한 질문입니다')
    .replace(/하기\s*위해$/g, '하기 위한 질문입니다')
    .replace(/평가하기\s*위함$/g, '평가하기 위한 질문입니다')
    .replace(/평가하기\s*위해$/g, '평가하기 위한 질문입니다')
    .replace(/확인하기\s*위함$/g, '확인하기 위한 질문입니다')
    .replace(/검증하기\s*위함$/g, '검증하기 위한 질문입니다');

  if (/하기\s*위한\s*질문입니다$/.test(t)) {
    return rescueKoreanSpacing(t + '.');
  }

  if (/(평가|확인|검증|파악|구분|점검)/.test(t)) {
    t = t.replace(/(능력|역량|경험|수준|범위|기여|역할|방식|근거|숙련도|이해도)$/g, '$1을');
    if (!/(을|를)\s*$/.test(t)) t += '을';
    t += ' 확인하기 위한 질문입니다';
  } else {
    t += '을 확인하기 위한 질문입니다';
  }

  return rescueKoreanSpacing(t + '.');
}

function normalizeGeneratedText(value) {
  let text = safeString(value);

  const replacements = [
    ['CRMBI', 'CRM/BI'],
    ['CRM BI', 'CRM/BI'],
    ['Java 와', 'Java와'],
    ['Spring 을', 'Spring을'],
    ['Spring 를', 'Spring을'],
    ['을활용해', '을 활용해'],
    ['를활용해', '를 활용해'],
    ['을사용해', '을 사용해'],
    ['를사용해', '를 사용해'],
    ['웹시스템', '웹 시스템'],
    ['웹 시스템유지보수', '웹 시스템 유지보수'],
    ['유지보수와기능개선', '유지보수와 기능 개선'],
    ['기능개선을수행', '기능 개선을 수행'],
    ['과정에서가장', '과정에서 가장'],
    ['기술적문제와이를', '기술적 문제와 이를'],
    ['해결한방식을', '해결한 방식을'],
    ['OCR API 연동과후처리', 'OCR API 연동과 후처리'],
    ['후처리로직설계', '후처리 로직 설계'],
    ['로직설계', '로직 설계'],
    ['구축시,', '구축 시,'],
    ['구축시', '구축 시'],
    ['TypeScript,Next.js', 'TypeScript, Next.js'],
    ['Java/Spring,ORM', 'Java/Spring, ORM'],
    ['API및TCP통신', 'API 및 TCP 통신'],
    ['API/TCP통신', 'API/TCP 통신'],
    ['TypeScript, Next.js기반', 'TypeScript, Next.js 기반'],
    ['Java/Spring, ORM기반', 'Java/Spring, ORM 기반'],
    ['기반서비스개발경험', '기반 서비스 개발 경험'],
    ['기반서비스개발', '기반 서비스 개발'],
    ['서비스개발경험', '서비스 개발 경험'],
    ['서비스개발', '서비스 개발'],
    ['개발경험', '개발 경험'],
    ['외부시스템연동', '외부 시스템 연동'],
    ['시스템연동', '시스템 연동'],
    ['운영관리용', '운영 관리용'],
    ['어드민웹개발', '어드민 웹 개발'],
    ['DB모델', 'DB 모델'],
    ['모델재설계', '모델 재설계'],
    ['요구사항분석', '요구사항 분석'],
    ['업무계획', '업무 계획'],
    ['업무일정관리', '업무 일정 관리'],
    ['커뮤니케이션능력', '커뮤니케이션 능력'],
    ['팀워크마인드', '팀워크 마인드'],
    ['필수경험충족도', '필수 경험 충족도'],
    ['개발요구사항', '개발 요구사항'],
    ['직접연관성', '직접 연관성'],
    ['충족도', '충족도'],
    ['문제해결력', '문제 해결력'],
    ['분석력', '분석력'],
    ['백엔드개발', '백엔드 개발'],
    ['프론트엔드개발', '프론트엔드 개발'],
    ['업무시스템', '업무 시스템'],
    ['레거시전환', '레거시 전환'],
    ['DB모델재설계', 'DB 모델 재설계'],
    ['공통로직개선', '공통 로직 개선'],
    ['운영이슈분석', '운영 이슈 분석'],
    ['세션관리', '세션 관리'],
    ['외부연동', '외부 연동'],
    ['본인기여', '본인 기여'],
    ['책임범위', '책임 범위'],
    ['성과수치', '성과 수치'],
    ['산정기준', '산정 기준'],
    ['개선전후', '개선 전후'],
    ['추가확인', '추가 확인'],
    ['면접확인', '면접 확인'],
    ['직무적합성', '직무 적합성'],
    ['경험소재', '경험 소재'],
    ['포지션과연결', '포지션과 연결'],
    ['연결가능한', '연결 가능한'],
    ['연결가능성', '연결 가능성'],
    ['수행범위', '수행 범위'],
    ['독립적으로수행', '독립적으로 수행'],
    ['반복적으로수행', '반복적으로 수행'],
    ['1회성프로젝트', '1회성 프로젝트'],
    ['SpringBoot', 'Spring Boot'],
    ['백엔드서비스', '백엔드 서비스'],
    ['프론트엔드서비스', '프론트엔드 서비스'],
    ['모바일앱개발', '모바일 앱 개발'],
    ['운영관리', '운영 관리'],
    ['관계형DB', '관계형 DB'],
    ['비관계형DB', '비관계형 DB'],
    ['인프라활용', '인프라 활용'],
    ['서비스설계', '서비스 설계'],
    ['직접개발경험', '직접 개발 경험'],
    ['기술스택', '기술 스택'],
    ['금융서비스', '금융 서비스'],
    ['사용자경험', '사용자 경험'],
    ['운영관점', '운영 관점'],
    ['구체경험', '구체 경험'],
    ['추가검증', '추가 검증'],
    ['구체성검증', '구체성 검증'],
    ['주도범위', '주도 범위'],
    ['분담범위', '분담 범위'],
    ['업무범위', '업무 범위'],
    ['역할구체성', '역할 구체성'],
    ['판단근거', '판단 근거'],
    ['대응방식', '대응 방식'],
    ['일정관리', '일정 관리'],
    ['리스크관리', '리스크 관리'],
    ['협업마인드', '협업 마인드'],
  ];

  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });

  text = text
    .replace(/\[[0-9]+p\]/gi, ' ')
    .replace(/[￾�]+/g, ' ')
    .replace(/(\d+)\s*\/\s*100\s*종합\s*적합도[\s\.:：-]*/gi, '')
    .replace(/\b(Java\s*\/\s*Spring|TypeScript|Next\.js|React|Node\.js|Python)\s*기반\s*[가-힣A-Za-z0-9|·\s]{0,45}\|?\s*경력\s*\d+\s*년\s*\d*\s*개월?/gi, ' ')
    .replace(/필수자격\s*\/\s*필요경험\s*중\s*/g, '')
    .replace(/이력서에서는\s*/g, '')
    .replace(/내용이\s*우선적으로\s*확인되며,?/g, '')
    .replace(/또한(?=[A-Za-z가-힣])/g, '')
    .replace(/,(?=\S)/g, ', ')
    .replace(/\.(?=\S)/g, '. ')
    .replace(/\)(?=\S)/g, ') ')
    .replace(/([가-힣])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])([가-힣])/g, '$1 $2')
    .replace(/(후보자|지원자)는(?=\S)/g, '$1는 ')
    .replace(/(후보자|지원자)가(?=\S)/g, '$1가 ')
    .replace(/(확인됩니다|확인됩니다\.)(?=다만|면접|해당)/g, '$1 ')
    .replace(/(확인되며|확인되나|보유하고 있습니다|드러납니다|있습니다|어렵습니다|필요합니다|적절합니다)\.(?=\S)/g, '$1. ')
    .replace(/(?<!\s)(다만|면접에서는|해당 경험은|이 과정에서|특히|반면|따라서|추가로|후보자는|지원자는)(?=\S)/g, ' $1')
    .replace(/(와|과|및|또는)(?=(Java|Spring|Spring Boot|TypeScript|Next\.js|React|API|TCP|DB|AWS|Redis))/g, '$1 ')
    .replace(/(Java|Spring|Spring Boot|TypeScript|Next\.js|React|API|TCP|DB|AWS|Redis)(?=(와|과|및|또는|를|을|가|이|에서|으로|기반|경험|설계|개발))/g, '$1 ')
    .replace(/(를|을|가|이|은|는|에서|으로|로|와|과)(?=(활용|확인|검증|분석|설계|구현|개발|운영|관리|전환|연동|고려|필요))/g, '$1 ')
    .replace(/(활용|확인|검증|분석|설계|구현|개발|운영|관리|전환|연동|고려)(?=(경험|역량|능력|범위|수준|여부|방식|과정|내용|필요))/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAnalysisPayload(analysis) {
  if (!analysis || typeof analysis !== 'object') return analysis;

  const clean = normalizeGeneratedText;
  return {
    ...analysis,
    summary: clean(analysis.summary),
    jdFit: Array.isArray(analysis.jdFit)
      ? analysis.jdFit.map((item) => ({
          ...item,
          competency: clean(item.competency),
          evidence: clean(item.evidence),
        }))
      : [],
    verificationPoints: Array.isArray(analysis.verificationPoints)
      ? analysis.verificationPoints.map(clean).filter(Boolean)
      : [],
    customQuestions: Array.isArray(analysis.customQuestions)
      ? analysis.customQuestions.map((item) => ({
          ...item,
          type: clean(item.type),
          main: clean(item.main),
          follow: Array.isArray(item.follow) ? item.follow.map(clean).filter(Boolean) : [],
          intent: normalizeIntentTone(item.intent),
          relatedCompetency: clean(item.relatedCompetency),
          sourceEvidence: clean(item.sourceEvidence),
          points: Array.isArray(item.points) ? item.points.map(clean).filter(Boolean) : [],
        }))
      : [],
  };
}


function flattenAnalysisText(analysis) {
  const parts = [];
  if (!analysis || typeof analysis !== 'object') return '';
  parts.push(analysis.summary || '');
  (analysis.jdFit || []).forEach((item) => {
    parts.push(item.competency || '', item.evidence || '');
  });
  (analysis.verificationPoints || []).forEach((item) => parts.push(item || ''));
  (analysis.customQuestions || []).forEach((item) => {
    parts.push(item.main || '', item.intent || '', item.relatedCompetency || '', item.sourceEvidence || '');
    (item.follow || []).forEach((f) => parts.push(f || ''));
    (item.points || []).forEach((p) => parts.push(p || ''));
  });
  return parts.join(' ');
}

function hasSevereSpacingIssue(analysis) {
  const text = flattenAnalysisText(analysis);
  if (!text) return false;

  const badPatterns = [
    /[가-힣]{18,}/,
    /(기반|경험|분석|개발|운영|관리|연동|성과|면접|확인|필요|후보자|지원자)(?=[가-힣]{2,})/,
    /(Java\/Spring|TypeScript|Next\.js|API|TCP|Redis|DB)(?=[가-힣])/,
    /[가-힣](?=(Java\/Spring|TypeScript|Next\.js|API|TCP|Redis|DB))/,
    /[,\.]\S/,
  ];

  return badPatterns.some((pattern) => pattern.test(text));
}

function buildPolishPrompt(analysis) {
  return `아래 JSON은 채용 이력서 분석 결과입니다. 같은 JSON 구조를 유지하되, 모든 텍스트 필드를 최종 사용자에게 보여주기 전 문장으로 다시 작성하세요.

중요:
- 점수, 판단 방향, 항목 수, JSON 구조는 유지합니다.
- competency, evidence, verificationPoints, customQuestions의 고유명사와 구체 경험은 삭제하거나 'JD 역량1', '근거 없음' 같은 일반 표현으로 바꾸지 않습니다.
- 단어와 문장은 기존 문구를 보존하려고 하지 말고, 의미만 유지한 채 새 문장으로 다시 씁니다.
- 띄어쓰기 오류가 있는 표현은 반드시 자연스럽게 재작성합니다.
- JSON 외 설명 문장은 절대 쓰지 않습니다.

필수 교정 규칙:
1. 붙어 있는 한국어 표현 금지
- 잘못된 예: Java 와 Spring 을활용해, CRMBI 웹시스템유지보수와기능개선, OCRAPI 연동과후처리로직설계, 본인의역할과기술적기여
- 올바른 예: Java와 Spring을 활용해, CRM/BI 웹 시스템의 유지보수와 기능 개선, OCR API 연동과 후처리 로직 설계, 본인의 역할과 기술적 기여

2. 질문(main) 문장 규칙
- 면접관이 그대로 읽을 수 있는 존댓말 문장으로 씁니다.
- 문장 끝은 반드시 “설명해 주세요.”, “구체적으로 설명해 주세요.”, “말씀해 주세요.” 중 하나로 끝냅니다.
- 질문에는 붙어 쓴 표현이 절대 없어야 합니다.

3. 질문 의도(intent) 문장 규칙
- 모든 intent는 반드시 “~을 확인하기 위한 질문입니다.” 또는 “~을 검증하기 위한 질문입니다.” 형식으로 통일합니다.
- “~하기 위해”, “~하기 위함”, “~평가하기 위해”처럼 끊긴 문장은 금지합니다.
- 예: “백엔드 개발 역량과 문제 해결 능력을 확인하기 위한 질문입니다.”

4. 용어 표기 규칙
- Java와 Spring
- TypeScript와 Next.js
- Java/Spring 기반
- TypeScript·Next.js 기반
- REST API
- OCR API
- API 및 TCP 통신
- CRM/BI 웹 시스템
- 외부 시스템 연동
- 후처리 로직
- 기능 개선
- 유지보수
- 본인 역할
- 기술적 기여
- 수행 과정

5. summary, jdFit.evidence, verificationPoints도 동일하게 자연스럽게 재작성합니다.
- 이력서 원문 제목이나 JD 문구를 그대로 쓰지 마세요.
- “경험은 실질적 변화를 만든 사례로 볼 여지가 있습니다.” 같은 어색한 표현은 “실질적인 개선 경험으로 해석할 수 있습니다.”처럼 바꿉니다.
- summary에는 점수 표현을 쓰지 않습니다. 점수는 overallFitScore 필드에만 둡니다.

[교정할 JSON]
${JSON.stringify(analysis, null, 2)}`;
}

function buildFinalTextRewritePrompt(analysis) {
  return `아래 JSON은 이미 분석이 끝난 결과입니다. 분석 내용은 바꾸지 말고, 텍스트 품질만 최종 검수하세요.

작업 범위:
- 전체 텍스트의 띄어쓰기, 문장 어체, 존댓말, 문장 끝맺음을 교정합니다.
- 점수와 판단 방향은 바꾸지 않습니다.
- JSON 구조와 필드명은 그대로 유지합니다.
- JSON만 반환합니다.

최종 품질 기준:
- 붙어 있는 한국어 단어가 있으면 자연스럽게 띄어 씁니다.
- 질문(main)은 면접관이 그대로 읽을 수 있어야 하며 “설명해 주세요.” 또는 “구체적으로 설명해 주세요.”로 끝나야 합니다.
- 의도(intent)는 모두 “~을 확인하기 위한 질문입니다.” 형식으로 끝나야 합니다.
- “하기 위함”, “하기 위해”, “평가하기 위해”로 끝나는 문장은 금지합니다.
- “Java 와 Spring 을활용해”, “웹시스템유지보수와기능개선”, “OCRAPI 연동과후처리로직설계” 같은 표현이 있으면 반드시 고칩니다.

[최종 검수할 JSON]
${JSON.stringify(analysis, null, 2)}`;
}

async function rewriteAnalysisTextOnly({ analysis, model, apiKey }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_POLISH_MODEL || model,
      store: false,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: '당신은 한국어 채용 문서 최종 검수자입니다. 분석 판단은 바꾸지 말고 문장과 띄어쓰기만 교정하세요. 응답은 JSON만 반환하세요.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildFinalTextRewritePrompt(analysis),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'resume_interview_analysis_final_text_review',
          strict: true,
          schema: getAnalysisSchema(),
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Final text rewrite failed:', data.error?.message || data);
    return analysis;
  }

  const outputText = extractOutputText(data);
  if (!outputText) return analysis;

  try {
    return normalizeAnalysisPayload(parseAnalysisJson(outputText));
  } catch (error) {
    console.error('Final text rewrite parse failed:', error);
    return analysis;
  }
}

function isLowQualityAnalysis(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object') return true;

  const summary = safeString(candidate.summary);
  const fallbackSummary = safeString(fallback?.summary);
  const jdFit = Array.isArray(candidate.jdFit) ? candidate.jdFit : [];
  const verificationPoints = Array.isArray(candidate.verificationPoints) ? candidate.verificationPoints : [];
  const customQuestions = Array.isArray(candidate.customQuestions) ? candidate.customQuestions : [];

  if (summary.length < 40) return true;
  if (fallbackSummary && summary.length < Math.max(40, fallbackSummary.length * 0.45)) return true;
  if (jdFit.length < 3) return true;
  if (verificationPoints.length < 3) return true;
  if (customQuestions.length < 4) return true;

  const genericCompetency = jdFit.some((item) => /^JD\s*역량\s*\d+$/i.test(safeString(item.competency)));
  if (genericCompetency) return true;

  const emptyEvidence = jdFit.some((item) => {
    const evidence = safeString(item.evidence);
    return evidence.length < 20 || /근거\s*없음|내용\s*없음|확인\s*불가/.test(evidence);
  });
  if (emptyEvidence) return true;

  const emptyVerification = verificationPoints.some((item) => /내용\s*없음|근거\s*없음/.test(safeString(item)));
  if (emptyVerification) return true;

  const weakQuestions = customQuestions.some((item) => {
    const main = safeString(item.main);
    const intent = safeString(item.intent);
    return main.length < 25 || intent.length < 15 || /확인하기위한질문입니다|질문입니다\.?$/.test(intent.replace(/\s+/g, '')) && intent.length < 18;
  });
  if (weakQuestions) return true;

  return false;
}

async function polishAnalysisIfNeeded({ analysis, model, apiKey }) {
  const baseline = finalHardPolishPayload(normalizeAnalysisPayload(analysis));

  if (process.env.DISABLE_ANALYSIS_POLISH === 'true') return baseline;

  // 2차 AI 교정은 결과를 훼손할 수 있으므로, 심한 띄어쓰기 문제가 감지될 때만 시도합니다.
  // 교정 결과가 'JD 역량1', '근거 없음'처럼 내용이 유실된 형태라면 즉시 원본 분석 결과로 되돌립니다.
  if (!hasSevereSpacingIssue(baseline)) return baseline;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_POLISH_MODEL || model,
      store: false,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: '당신은 한국어 채용 문서 교정자입니다. 기존 분석의 정보량, 고유명사, 점수, 항목 수를 절대 줄이지 말고 띄어쓰기와 어체만 교정하세요. 응답은 JSON만 반환하세요.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPolishPrompt(baseline),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'resume_interview_analysis_polished_safe',
          strict: true,
          schema: getAnalysisSchema(),
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Polish request failed:', data.error?.message || data);
    return baseline;
  }

  const outputText = extractOutputText(data);
  if (!outputText) return baseline;

  try {
    const polished = finalHardPolishPayload(normalizeAnalysisPayload(parseAnalysisJson(outputText)));
    if (isLowQualityAnalysis(polished, baseline)) {
      console.error('Polish result rejected because it lost analysis content. Returning baseline analysis.');
      return baseline;
    }
    return polished;
  } catch (error) {
    console.error('Polish parse failed:', error);
    return baseline;
  }
}

function buildPrompt({ positionContext, resumeText, existingQuestions }) {
  const cleanResume = cleanResumeTextForPrompt(resumeText).slice(0, 30000);
  const questionText = Array.isArray(existingQuestions)
    ? existingQuestions.slice(0, 120).map((item, index) => {
        if (typeof item === 'string') return `${index + 1}. ${item}`;
        return `${index + 1}. [${safeString(item.competency)}] ${safeString(item.question)}`;
      }).join('\n')
    : '';

  return `당신은 채용담당자와 현업 면접관을 돕는 시니어 HRBP/채용 면접 설계자입니다.
아래 [HR 등록 포지션 분석 기준]과 [지원자 이력서 텍스트]를 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

핵심 목표:
- 이력서 원문을 복사해 붙여넣지 말고, 이력서에 담긴 경험을 해석해 JD 기준의 의미로 바꿔 작성하세요.
- JD 문장을 그대로 반복하지 말고, JD 요구사항을 면접 평가 언어로 재구성하세요.
- 결과물은 "이 후보자가 어떤 경험을 가지고 있고, 그 경험이 이 포지션에서 어떤 의미가 있으며, 면접에서 무엇을 확인해야 하는지"가 자연스럽게 드러나야 합니다.
- 서류 불합격 가능성이 있는 후보자도 무난히 75점 이상으로 평가하지 마세요. 필수요건이 직접 확인되지 않으면 낮은 점수를 사용하세요.

출력 톤:
- HR이 면접관에게 전달하는 사전 검토 메모처럼 작성하세요.
- 자연스러운 한국어 문장으로 작성하세요. PDF 추출 텍스트에 띄어쓰기가 없어도 최종 결과는 반드시 사람이 읽기 좋은 띄어쓰기로 다시 작성하세요. 특히 조사 뒤에는 공백을 넣어 'Spring을활용해'가 아니라 'Spring을 활용해'처럼 작성하세요.
- 후보자의 경험을 무조건 긍정적으로 해석하지 마세요. 필수자격/필요경험과 직접 연결되는 근거가 명확할 때만 강하게 평가하고, 근거가 부족하면 점수를 낮추고 검증 필요 사항으로 남기세요.
- 사용자가 예시로 든 문장처럼 작성하세요. 예: "평가제도 설계부터 온보딩, 노무 이슈까지 HR 전반을 실제로 '작동'시킨 경험이 인상적입니다. 다만, 각 프로젝트에서 '왜 그 방향을 선택했는지' 의사결정 맥락이 빠져있어, HRBP로서의 전략적 판단력은 면접에서 추가 확인이 필요합니다."

절대 금지:
- 이력서 본문 또는 JD 문장을 긴 따옴표로 그대로 가져오지 마세요.
- OCR 텍스트의 페이지 표기, 깨진 문자, 불필요한 띄어쓰기, 원문 문단을 그대로 출력하지 마세요. 예: "[1p]", "기 반 백 엔 드", "Java/Spring기반백엔드개발자", 긴 원문 복사 금지.
- 후보자 직무 헤더를 그대로 쓰지 마세요. 예: "Java/Spring 기반 백엔드 개발자 | 경력 3년 7개월" 같은 제목성 문구 금지.
- "이력서에서는 ‘...긴 원문...’ 내용이 우선적으로 확인되며" 같은 표현을 쓰지 마세요.
- "Java 와 Spring 을활용해", "웹시스템유지보수와기능개선", "OCRAPI 연동과후처리로직설계"처럼 띄어쓰기가 깨진 표현을 절대 출력하지 마세요.
- "필수자격/필요경험 중 ‘...JD 원문...’에 대해서는"처럼 JD 항목을 그대로 붙이지 마세요.
- summary 본문에 "76/100 종합 적합도"처럼 점수를 반복하지 마세요. 점수는 overallFitScore 필드에만 작성하세요.
- "커뮤니케이션 능력이 좋아 보입니다", "문제해결력이 있습니다"처럼 이력서 없이도 쓸 수 있는 일반론을 쓰지 마세요.
- 합격/불합격을 판단하지 마세요. 면접 전 검토 보조자료만 작성하세요.
- 민감정보, 차별 소지가 있는 내용, 사생활 질문은 제외하세요.

근거 사용 방식:
- 이력서 근거는 프로젝트명, 업무명, 성과 수치, 경력 흐름 정도만 짧게 언급하세요.
- 근거를 언급할 때도 원문을 그대로 복사하지 말고, "운영관리용 어드민 개발", "외부 시스템 연동", "ATS 전환을 통한 채용 리드타임 개선"처럼 요약해 표현하세요.
- sourceEvidence 필드는 원문 전체가 아니라 근거가 되는 경험명/성과명만 짧게 적으세요.

점수 산정 기준:
- overallFitScore는 0~100 정수로 산정하세요.
- JD 역량별 score도 0~100 정수로 산정하세요.
- 점수는 엄격하게 부여하세요. 서류 합격 가능성이 충분히 높다고 볼 수 있는 경우가 아니라면 80점 이상을 주지 마세요.
- 90점 이상: 필수자격/필요경험 대부분이 직접 충족되고, 본인 역할·성과·의사결정 맥락이 매우 구체적인 경우에만 사용하세요. 일반적인 우수 후보자에게도 쉽게 주지 마세요.
- 80~89점: 필수 경험 대부분이 직접 확인되고, 핵심 업무와의 연결성이 높지만 1~2개 항목은 면접 확인이 필요한 경우입니다.
- 70~79점: 일부 관련 경험은 있으나 필수 기술/경험의 직접 근거가 부족하거나, 본인 역할·성과 기준·경험 깊이가 불명확한 경우입니다. 서류 검토에서 추가 확인이 필요한 후보자에 해당합니다.
- 60~69점: JD 핵심요건과 직접 연결되는 경험이 제한적이거나 간접 경험 위주인 경우입니다.
- 60점 미만: 필수자격/필요경험의 핵심 근거가 이력서에서 거의 확인되지 않는 경우입니다.
- 필수자격/필요경험 중 명시된 핵심 기술·업무 경험이 1개라도 직접 확인되지 않으면 overallFitScore는 최대 76점으로 제한하세요.
- 필수자격/필요경험 중 핵심 항목 2개 이상이 직접 확인되지 않으면 overallFitScore는 최대 68점으로 제한하세요.
- 커뮤니케이션, 팀워크처럼 이력서에서 간접적으로만 보이는 역량은 75점 이상을 주지 마세요. 구체적인 협업 방식, 갈등 조율, 의사소통 성과가 있어야 80점 이상이 가능합니다.
- 경험이 있어도 본인 역할, 의사결정 기준, 성과 산정 방식이 불명확하면 해당 JD 역량 점수는 70점대로 조정하세요.
- 경력연차만으로 점수를 올리지 마세요. 반드시 JD 필수요건과 이력서 근거의 직접성을 기준으로 판단하세요.

출력 품질 기준:
1. overallFitScore
- 0~100 정수로 작성하세요.

2. summary
- 점수는 별도 필드(overallFitScore)에만 작성하세요. summary 본문에는 점수 표현을 반복하지 마세요.
- 2~4문장으로 작성하세요.
- 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 모두 포함하세요.
- 원문 인용 대신 해석 문장으로 작성하세요.
- OCR 텍스트에 띄어쓰기가 무너져 있어도, 반드시 자연스러운 한국어 띄어쓰기로 다시 작성하세요. "TypeScript,Next.js기반서비스개발경험"처럼 붙은 표현은 "TypeScript·Next.js 기반 서비스 개발 경험"처럼 고쳐 쓰세요.
- JD 자격요건 문구를 그대로 쓰지 말고 "프론트엔드 서비스 개발 경험", "외부 시스템 연동 경험"처럼 평가 언어로 바꿔 쓰세요.

3. jdFit
- JD 역량 적합도는 반드시 [HR 등록 포지션 분석 기준]의 requiredQualifications, 즉 필수자격/필요경험 내용을 1차 기준으로 도출하세요.
- keyTasks는 포지션 맥락을 이해하기 위한 보조 정보로만 사용하고, jdFit 항목명은 주요업무 문장을 그대로 가져오지 마세요.
- 필수자격/필요경험에 기술 스택, 요구사항 분석, 일정 관리, 커뮤니케이션, 팀워크가 함께 들어있다면 아래처럼 묶어 3~5개 항목으로 재구성하세요.
  예: "필수 기술 경험 충족도", "개발 요구사항 분석력", "업무 일정 관리 능력", "커뮤니케이션 능력", "팀워크"
- 기술 스택이 여러 개라면 하나의 항목 안에서 묶어 평가하세요. 예: TypeScript/Next.js, Java/Spring/ORM, API/TCP 통신 이해를 "필수 기술 경험 충족도"로 통합.
- 각 항목은 competency, score, evidence로 작성하세요.
- competency에는 JD 원문을 그대로 붙이지 말고 면접관이 보기 쉬운 평가 항목명으로 바꿔 쓰세요.
- evidence는 1~3문장으로 작성하세요.
- evidence에는 이력서상 확인되는 경험을 해석한 내용과 아직 면접에서 확인해야 할 한계를 함께 쓰세요.
- evidence는 원문을 복사하지 말고 자연스러운 평가 문장으로 작성하세요.
- evidence의 첫 문장을 "또한"으로 시작하지 마세요.
- "경험은 실질적 변화를 만든 사례로 볼 여지가 있습니다"처럼 어색한 문장은 쓰지 말고, "실질적인 개선 경험으로 해석할 수 있습니다"처럼 자연스럽게 작성하세요.

4. verificationPoints
- 4~6개 작성하세요.
- 면접에서 확인해야 할 항목을 구체적으로 작성하세요.
- 각 항목은 “무엇을 / 왜 확인해야 하는지”가 드러나야 합니다.
- 검증 포인트도 원문/JD 복사가 아니라, 경험 해석 기반으로 작성하세요.

5. customQuestions
- 6개 작성하세요.
- 모든 질문은 후보자의 이력서에 적힌 특정 경험/프로젝트/성과를 바탕으로 작성하되, 긴 원문을 그대로 복사하지 마세요.
- 질문(main)은 모두 면접관이 그대로 읽을 수 있는 존댓말 문장으로 작성하세요. 문장 끝은 '~설명해 주세요.', '~말씀해 주세요.', '~구체적으로 설명해 주세요.' 중 하나로 자연스럽게 마무리하세요.
- 질문 의도(intent)는 모두 '~하기 위해 확인합니다.' 형식으로 통일하세요. '~하기 위함', '~평가하기 위해'처럼 끊긴 표현은 쓰지 마세요.
- 질문은 본인 기여도 확인, 성과 수치/개선 효과의 산정 기준 확인, 주요업무와 실제 경험의 연결성 확인, 필수 경험의 깊이 확인, 팀 성과와 개인 역할 구분, 우려사항 해소 중 하나 이상을 충족해야 합니다.
- “가장 어려웠던 경험을 말해주세요”처럼 모든 후보자에게 물을 수 있는 질문은 금지합니다.
- sourceEvidence에는 원문 문장 전체가 아니라 "전사 평가제도 기획 및 SaaS툴 도입", "리드타임 평균 3일 단축"처럼 짧은 근거 라벨을 적으세요.

좋지 않은 질문 예시:
- 협업 과정에서 어려웠던 경험을 말씀해주세요.
- 문제를 해결했던 경험을 말씀해주세요.
- 우리 회사에 지원한 이유는 무엇인가요?
- 이력서에 적힌 "[1p] Java/Spring 기 반 백 엔 드 개 발 자..." 내용에 대해 설명해 주세요.

좋은 질문 예시:
- 전사 평가제도와 SaaS 평가툴 도입 과정에서, 평가 항목과 직급별 기대 수준을 정할 때 어떤 대안을 비교했고 왜 그 방향을 선택했는지 설명해 주세요.
- ATS 전환으로 채용 리드타임을 단축한 경험에서, 병목을 어떻게 정의했고 본인이 직접 바꾼 프로세스는 무엇이었는지 설명해 주세요.
- 포괄임금제 로직 개선 과정에서 법적 리스크와 비용 부담 사이의 균형을 어떤 기준으로 판단했는지 설명해 주세요.

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[기존 구조화면접 질문 예시 - 중복 금지]
${questionText}

[지원자 이력서 텍스트]
${cleanResume}`;
}

function getAnalysisSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      overallFitScore: { type: 'number' },
      summary: { type: 'string' },
      jdFit: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            competency: { type: 'string' },
            score: { type: 'number' },
            evidence: { type: 'string' },
          },
          required: ['competency', 'score', 'evidence'],
        },
      },
      verificationPoints: { type: 'array', items: { type: 'string' } },
      customQuestions: {
        type: 'array',
        minItems: 4,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string' },
            main: { type: 'string' },
            follow: { type: 'array', items: { type: 'string' } },
            intent: { type: 'string' },
            relatedCompetency: { type: 'string' },
            sourceEvidence: { type: 'string' },
            points: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'main', 'follow', 'intent', 'relatedCompetency', 'sourceEvidence', 'points'],
        },
      },
    },
    required: ['overallFitScore', 'summary', 'jdFit', 'verificationPoints', 'customQuestions'],
  };
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;

  const chunks = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      // output_text 타입은 content.text에 이미 담겨 있습니다.
      // 같은 텍스트를 두 번 push하면 { ... }\n{ ... } 형태가 되어 JSON.parse 오류가 발생합니다.
      if (content.type === 'output_text' && content.text) {
        chunks.push(content.text);
      } else if (content.text) {
        chunks.push(content.text);
      }
    });
  });
  return chunks.join('\n');
}

function parseAnalysisJson(outputText) {
  const text = safeString(outputText);

  try {
    return JSON.parse(text);
  } catch (firstError) {
    // 혹시 모델/SDK 응답에 JSON 앞뒤 설명 또는 중복 JSON이 섞이면
    // 첫 번째 완전한 JSON 객체만 안전하게 잘라서 다시 파싱합니다.
    const start = text.indexOf('{');
    if (start === -1) throw firstError;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;

      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }

    throw firstError;
  }
}



function finalHardPolishPayload(analysis) {
  const clean = (value) => rescueKoreanSpacing(normalizeGeneratedText(value));
  const ensureQuestionEnding = (value) => {
    let t = clean(value).replace(/[.。\s]+$/g, '');
    if (!/(설명해 주세요|말씀해 주세요|구체적으로 설명해 주세요)$/.test(t)) {
      t += '에 대해 구체적으로 설명해 주세요';
    }
    return clean(t + '.');
  };

  if (!analysis || typeof analysis !== 'object') return analysis;

  return {
    ...analysis,
    summary: clean(analysis.summary),
    jdFit: Array.isArray(analysis.jdFit)
      ? analysis.jdFit.map((item) => ({
          ...item,
          competency: clean(item.competency),
          evidence: clean(item.evidence),
        }))
      : [],
    verificationPoints: Array.isArray(analysis.verificationPoints)
      ? analysis.verificationPoints.map(clean).filter(Boolean)
      : [],
    customQuestions: Array.isArray(analysis.customQuestions)
      ? analysis.customQuestions.map((item) => ({
          ...item,
          type: clean(item.type),
          main: ensureQuestionEnding(item.main),
          follow: Array.isArray(item.follow) ? item.follow.map(ensureQuestionEnding).filter(Boolean) : [],
          intent: normalizeIntentTone(item.intent),
          relatedCompetency: clean(item.relatedCompetency),
          sourceEvidence: clean(item.sourceEvidence),
          points: Array.isArray(item.points) ? item.points.map(clean).filter(Boolean) : [],
        }))
      : [],
  };
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function calibrateScores(analysis) {
  if (!analysis || typeof analysis !== 'object') return analysis;

  const jdFit = Array.isArray(analysis.jdFit) ? analysis.jdFit : [];
  const scores = jdFit.map((item) => clampNumber(item.score, 0, 100));
  const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : clampNumber(analysis.overallFitScore, 0, 100);
  const minScore = scores.length ? Math.min(...scores) : avg;

  let calibratedOverall = clampNumber(analysis.overallFitScore, 0, 100);

  // AI가 전반적으로 후하게 점수를 주는 문제를 막기 위한 보정입니다.
  // 역량 평균보다 종합 점수가 과도하게 높게 나오지 않도록 제한합니다.
  calibratedOverall = Math.min(calibratedOverall, avg + 3);

  if (minScore < 60) calibratedOverall = Math.min(calibratedOverall, 68);
  else if (minScore < 70) calibratedOverall = Math.min(calibratedOverall, 74);
  else if (minScore < 75) calibratedOverall = Math.min(calibratedOverall, 78);

  // 모든 항목이 높은 경우가 아니라면 80점대 이상으로 과대평가하지 않습니다.
  const highScores = scores.filter((score) => score >= 80).length;
  if (scores.length && highScores < Math.ceil(scores.length * 0.7)) {
    calibratedOverall = Math.min(calibratedOverall, 79);
  }

  return {
    ...analysis,
    overallFitScore: calibratedOverall,
    jdFit: jdFit.map((item) => ({
      ...item,
      score: clampNumber(item.score, 0, 100),
    })),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'POST 요청만 지원합니다.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(res, 500, { error: 'Vercel 환경변수 OPENAI_API_KEY가 설정되어 있지 않습니다.' });
  }

  try {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody || '{}');
    const positionContext = body.positionContext || {};
    const resumeText = safeString(body.resumeText);
    const existingQuestions = Array.isArray(body.existingQuestions) ? body.existingQuestions : [];

    if (!resumeText) {
      return jsonResponse(res, 400, { error: '이력서 텍스트가 비어 있습니다.' });
    }

    const prompt = buildPrompt({ positionContext, resumeText, existingQuestions });
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '당신은 채용담당자와 현업 면접관을 돕는 HR 어시스턴트입니다. 모든 응답은 한국어로 작성하고, 반드시 요청한 JSON 구조만 반환하세요.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'resume_interview_analysis',
            strict: true,
            schema: getAnalysisSchema(),
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return jsonResponse(res, response.status, { error: data.error?.message || 'OpenAI 분석 요청에 실패했습니다.' });
    }

    const outputText = extractOutputText(data);
    if (!outputText) {
      return jsonResponse(res, 502, { error: 'AI 응답에서 분석 결과를 찾지 못했습니다.' });
    }

    const initialAnalysis = normalizeAnalysisPayload(parseAnalysisJson(outputText));
    const polishedAnalysis = await polishAnalysisIfNeeded({
      analysis: initialAnalysis,
      model,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const analysis = finalHardPolishPayload(normalizeAnalysisPayload(calibrateScores(polishedAnalysis)));
    if (isLowQualityAnalysis(analysis, initialAnalysis)) {
      return jsonResponse(res, 502, { error: 'AI 분석 결과의 내용이 충분하지 않습니다. 다시 분석해 주세요.' });
    }
    return jsonResponse(res, 200, { analysis });
  } catch (error) {
    console.error(error);
    return jsonResponse(res, 500, { error: error.message || 'AI 분석 중 오류가 발생했습니다.' });
  }
};
