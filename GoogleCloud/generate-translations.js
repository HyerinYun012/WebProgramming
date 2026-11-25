//  Google Cloud API 기반 다국어 자동 번역

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Translate } = require("@google-cloud/translate").v2;

// 프로젝트 경로 및 인증키 경로 전달
const projectPath = process.argv[2];
const keyPath = process.argv[3];

if (!projectPath || !keyPath) {
    console.error("프로젝트 경로와 인증키 경로를 입력하세요.");
    process.exit(1);
}

// Google Cloud 인증 설정
process.env.GOOGLE_APPLICATION_CREDENTIALS =
    path.resolve(keyPath);

const translate = new Translate();

// 번역 대상 언어
const languages = {
    en: "영어",
    "zh-CN": "중국어 간체",
    "zh-TW": "중국어 번체",
    ja: "일본어",
    vi: "베트남어"
};

// 원본 파일 및 결과 파일 경로
const sourcePath = path.join(
    projectPath, "assets", "translations.js"
);

const outputPath = path.join(
    projectPath, "assets", "generated-translations.js"
);

//  한국어 원문만 가져오기
function loadKoreanTranslations() {

    const source = fs.readFileSync(sourcePath, "utf8");

    const result = vm.runInNewContext(
        source + "\nJSON.stringify(translations.ko);",
        {},
        { timeout: 1000 }
    );

    return JSON.parse(result);
}

//  문자열 및 배열 자동 번역
async function translateValue(value, language) {

    if (Array.isArray(value)) {
        return Promise.all(
            value.map(item => translateValue(item, language))
        );
    }

    if (typeof value !== "string") {
        return value;
    }

    //동적 변수 보호
    const variables = [];

    const protectedText = value.replace(
        /\{[a-zA-Z0-9_]+\}/g,
        function (match) {
    variables.push(match);
    return `<span class="notranslate">${match}</span>`;
}
    );

    const [result] = await translate.translate(
        protectedText,
        {
            from: "ko",
            to: language,
            format: variables.length ? "html" : "text"
        }
    );

    // 동적 변수 복원 및 검증
    const restored = result.replace(
        /<span\b[^>]*>(.*?)<\/span>/gi,
        "$1"
    );

    for (const variable of variables) {
        if (!restored.includes(variable)) {
            throw new Error(
                "번역 중 변수 손실: " + variable
            );
        }
    }

    return restored;
}

//  전체 언어 자동 번역
async function generateTranslations() {

    const korean = loadKoreanTranslations();
    const generated = {};

    console.log("한국어 원문 불러오기 완료");
    console.log("번역 키 개수:", Object.keys(korean).length);

    for (const [code, name] of Object.entries(languages)) {

        console.log(name + " 번역 시작");

        generated[code] = {};

        for (const [key, value] of Object.entries(korean)) {

            generated[code][key] =
                await translateValue(value, code);
        }

        console.log(name + " 번역 완료");
    }

    // 모든 번역 성공 후에만 결과 파일 저장
    const output =
        "//  Google Cloud 자동 생성 번역 데이터\n" +
        "// 자동 생성 파일이므로 직접 수정하지 않음\n\n" +
        "Object.assign(translations, " +
        JSON.stringify(generated, null, 4) +
        ");\n\n" +
        'translations.zh = translations["zh-CN"];\n';

    fs.writeFileSync(outputPath, output, "utf8");

    console.log("전체 번역 완료");
    console.log("저장 위치:", outputPath);
}

//  실행 및 오류 처리
generateTranslations().catch(function (error) {

    console.error("자동 번역 실패:", error.message);
    console.error("기존 번역 데이터는 유지됩니다.");

    process.exitCode = 1;
});