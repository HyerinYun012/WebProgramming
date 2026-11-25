
/*
 * 목적:
 * - 현재 선택된 언어 관리
 * - 번역 데이터 불러오기
 * - Google Cloud 자동 생성 번역 데이터 적용
 * - 번역문이 없는 경우 한국어 사용
 * - 언어 변경 시 웹사이트 화면 갱신
 */
// 기본 언어: 한국어
let currentLanguage = "ko";

// 언어 변경
function changeLanguage(language) {
    if (!translations[language]) {
        console.warn("지원하지 않는 언어:", language);
        return;
    }

    currentLanguage = language;
}

// 선택된 언어의 번역문 가져오기

// 자동 생성 번역 데이터 및 한국어 대체 처리
function translate(key, variables = {}) {

    const languageData = translations[currentLanguage] || {};

    //  선택 언어의 번역 데이터 확인
    let value = languageData[key];

    //  번역 데이터가 없으면 한국어 사용
    if (value === undefined) {
        value = translations.ko[key];
    }

    //  한국어 원문도 없으면 기존 키 반환
    if (value === undefined) {
        return key;
    }

    //  검색어, 숫자 등 동적 변수 처리
    if (typeof value === "string") {
        value = value.replace(
            /\{([a-zA-Z0-9_]+)\}/g,
            function (match, name) {
                return variables[name] !== undefined
                    ? String(variables[name])
                    : match;
            }
        );
    }

    return value;
}

/*
 * 공고 데이터 번역 함수
 *
 * announcementKey : 번역할 공고의 고유 키
 * field : title(제목), target(지원 대상), benefit(지원 내용)
 *
 * 선택한 언어의 번역문을 반환하며,
 * 번역문이 없으면 한국어를 기본값으로 사용
 */
function translateAnnouncement(announcementKey, field) {

    // 현재 선택된 언어의 공고 데이터
    var languageData = announcementTranslations[currentLanguage];

    // 해당 언어에 번역문이 있는 경우
    if (languageData &&
        languageData[announcementKey] &&
        languageData[announcementKey][field] !== undefined) {

        return languageData[announcementKey][field];
    }

    // 번역문이 없으면 한국어 사용
    var koreanData = announcementTranslations.ko;

    if (koreanData &&
        koreanData[announcementKey] &&
        koreanData[announcementKey][field] !== undefined) {

        return koreanData[announcementKey][field];
    }

    return "";
}


/*
 * 공고 전체 번역 함수
 *
 * announcementKey : 공고 고유 키
 * originalData : 기존 사이트의 원본 공고 데이터
 *
 * 원본 데이터를 수정하지 않고,
 * 번역된 제목, 지원 대상, 지원 내용을 적용한
 * 새로운 공고 데이터를 반환
 */
function translateAnnouncementData(announcementKey, originalData) {

    // 원본 공고 데이터를 복사
    var translatedData = Object.assign({}, originalData);

    // 현재 선택된 언어의 번역 데이터 확인
    var languageData = announcementTranslations[currentLanguage];

    // 해당 공고의 번역 데이터가 있는지 확인
    var announcement = languageData &&
                       languageData[announcementKey];

    // 번역 데이터가 없으면 원본 반환
    if (!announcement) {
        return translatedData;
    }

    // 번역 데이터 적용
    if (announcement.title !== undefined) {
        translatedData.title = announcement.title;
    }

    if (announcement.target !== undefined) {
        translatedData.target = announcement.target;
    }

    if (announcement.benefit !== undefined) {
        translatedData.benefit = announcement.benefit;
    }

    return translatedData;
}



/*
 * 기존 공고 제목과 다국어 번역 키 연결
 *
 * - app.js, site.js의 원본 공고 제목 사용
 * - 같은 공고의 제목이 조금 달라도 동일한 키로 연결
 * - 기존 공고 데이터는 수정하지 않음
 */
var announcementKeys = {
    "외국인 주민 생활지원 안내": "foreignResident",
    "시흥시 외국인 주민 생활지원 안내": "foreignResident",

    "청년 취업역량 강화 프로그램": "youthEmployment",

    "다문화 가족 한국어 교육": "multiculturalEducation",
    "시흥시 다문화 가족 한국어 교육": "multiculturalEducation",

    "소상공인 지원 공고": "smallBusiness",
    "시흥시 소상공인 지원 공고": "smallBusiness",

    "가족 체험 행사 참가자 모집": "familyEvent",
    "시흥시 가족 체험 행사 참가자 모집": "familyEvent",

    "시흥시 청년 문화 프로그램 참여자 모집": "youthCulture",
    "시흥시 취업 역량 강화 교육 신청": "jobTraining",
    "시흥시 어르신 디지털 교육 수강생 모집": "seniorDigital",
    "시흥시 청년 월세 한시 특별지원": "youthRent",
    "시흥 갯골 환경정화 시민 봉사단 모집": "environmentVolunteer",

    "시흥시 청년 면접정장 무료 대여 사업": "interviewSuit",
    "시흥 청년 버스킹 페스티벌 참가팀 모집": "buskingFestival",
    "시흥시 청년 금융 교육 아카데미": "financialEducation"
};

/*
 * 공고 데이터 자동 번역
 *
 * 원본 공고 제목으로 번역 키를 찾은 후
 * 해당 언어의 공고 데이터로 변환
 */
function translateOriginalAnnouncement(originalData) {

    // 공고 제목에 해당하는 고유 키 찾기
    var announcementKey = announcementKeys[originalData.title];

    // 등록되지 않은 공고는 원본 그대로 반환
    if (!announcementKey) {
        return Object.assign({}, originalData);
    }

    // 기존에 만든 공고 번역 함수 사용
    return translateAnnouncementData(
        announcementKey,
        originalData
    );
}


/*
 * 국가 선택 시 언어 설정 변경 및 화면 갱신
 */
function changeSiteLanguage(language) {

    //  지원하는 언어 확인
    const supportedLanguages = [
        "ko",
        "en",
        "zh-CN",
        "zh-TW",
        "ja",
        "vi"
    ];

    if (!supportedLanguages.includes(language)) {
        return;
    }

    // 선택한 언어로 변경
    changeLanguage(language);

    // HTML 문서 언어 변경
    document.documentElement.lang = currentLanguage;

    // 현재 화면 다시 그리기
    window.dispatchEvent(new Event("siteLanguageChanged"));

    console.log("선택된 사이트 언어:", currentLanguage);
}

