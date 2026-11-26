package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NoticeAiService {

    private final NoticeRepository noticeRepository;

    @Value("${vertex.ai.key-file:vertex-key.json}")
    private String keyFileName;

    @Value("${vertex.ai.location:us-central1}")
    private String location;

    @Value("${vertex.ai.model:gemini-2.5-flash}")
    private String vertexModel;

    private String cachedAccessToken = null;
    private long tokenExpireTime = 0L;
    private String cachedProjectId = null;

    public NoticeAiService(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    @Transactional
    public int classifyAllNotices() {
        List<Notice> notices = noticeRepository.findAll();
        int processedCount = 0;
        int vertexCallCount = 0;

        boolean canUseVertex = initVertexCredentials();

        for (Notice notice : notices) {
            // 이미 실제 Vertex AI로 번역 완료된 공고는 건너뛰기
            if (notice.getTranslations() != null && notice.getTranslations().contains("\"vertexAi\":true")) {
                continue;
            }

            // 1. 기본 카테고리 분류
            applySmartClassification(notice);

            // 2. Vertex AI로 6개 국어 번역 수행 (한 번 실행 시 20건씩 처리)
            if (canUseVertex && vertexCallCount < 250) {
                boolean success = callVertexAiWithServiceAccount(notice);
                if (success) {
                    vertexCallCount++;
                    try { Thread.sleep(300); } catch (InterruptedException ignored) {}
                }
            }
            processedCount++;
        }

        noticeRepository.saveAll(notices);
        System.out.println("🌍 총 " + processedCount + "건 처리 완료! (실제 Vertex AI 번역 성공: " + vertexCallCount + "건)");
        return vertexCallCount > 0 ? vertexCallCount : processedCount;
    }

    private boolean initVertexCredentials() {
        try {
            if (cachedAccessToken != null && System.currentTimeMillis() < tokenExpireTime && cachedProjectId != null) {
                return true;
            }

            ClassPathResource resource = new ClassPathResource(keyFileName);
            if (!resource.exists()) {
                System.out.println("⚠️ src/main/resources/" + keyFileName + " 파일을 찾을 수 없습니다.");
                return false;
            }

            String rawJson;
            try (InputStream is = resource.getInputStream()) {
                rawJson = StreamUtils.copyToString(is, StandardCharsets.UTF_8);
            }

            this.cachedProjectId = extractJsonValue(rawJson, "project_id");
            String clientEmail = extractJsonValue(rawJson, "client_email");
            String privateKeyRaw = extractJsonValue(rawJson, "private_key");

            String cleanPem = privateKeyRaw
                    .replace("\\n", "")
                    .replace("\\r", "")
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");

            byte[] keyBytes = Base64.getDecoder().decode(cleanPem);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            PrivateKey privateKey = KeyFactory.getInstance("RSA").generatePrivate(spec);

            long nowSec = System.currentTimeMillis() / 1000;
            String headerJson = "{\"alg\":\"RS256\",\"typ\":\"JWT\"}";
            String claimJson = "{"
                    + "\"iss\":\"" + clientEmail + "\","
                    + "\"scope\":\"https://www.googleapis.com/auth/cloud-platform\","
                    + "\"aud\":\"https://oauth2.googleapis.com/token\","
                    + "\"iat\":" + nowSec + ","
                    + "\"exp\":" + (nowSec + 3600)
                    + "}";

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
            String encodedClaim = Base64.getUrlEncoder().withoutPadding().encodeToString(claimJson.getBytes(StandardCharsets.UTF_8));
            String signingInput = encodedHeader + "." + encodedClaim;

            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(privateKey);
            signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
            String encodedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(signature.sign());

            String jwt = signingInput + "." + encodedSignature;

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String formBody = "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt;

            HttpEntity<String> entity = new HttpEntity<>(formBody, headers);
            String tokenResponse = restTemplate.postForObject("https://oauth2.googleapis.com/token", entity, String.class);

            this.cachedAccessToken = extractJsonValue(tokenResponse, "access_token");
            this.tokenExpireTime = System.currentTimeMillis() + 3500 * 1000L;

            System.out.println("✅ Vertex AI 서비스 계정 인증 성공! (Project ID: " + this.cachedProjectId + ")");
            return true;

        } catch (Exception e) {
            System.out.println("❌ Vertex AI JSON 키 파일 인증 실패: " + e.getMessage());
            return false;
        }
    }

    private String extractJsonValue(String json, String key) {
        if (json == null) return "";
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    /**
     * JSON 파싱 에러가 절대 발생하지 않는 구분자(|||) 기반 Vertex AI 호출
     */
    @SuppressWarnings("unchecked")
    private boolean callVertexAiWithServiceAccount(Notice notice) {
        try {
            String url = "https://" + location.trim() + "-aiplatform.googleapis.com/v1/projects/"
                    + cachedProjectId + "/locations/" + location.trim()
                    + "/publishers/google/models/" + vertexModel.trim() + ":generateContent";

            // 💡 JSON 대신 절대 깨지지 않는 "키 ||| 번역값" 줄바꿈 포맷으로 요청!
            String prompt = "Translate the following Korean public service notice into 6 languages.\n"
                    + "Korean Title: " + notice.getTitle() + "\n"
                    + "Korean Content: " + notice.getCleanContent() + "\n\n"
                    + "Output ONLY in the exact format below (one line per key, separated by |||):\n"
                    + "KO_SUMMARY ||| (Write a 2-sentence summary in Korean)\n"
                    + "EN_TITLE ||| (Translate title into English)\n"
                    + "EN_SUMMARY ||| (Translate summary into English)\n"
                    + "ZH_CN_TITLE ||| (Translate title into Simplified Chinese)\n"
                    + "ZH_CN_SUMMARY ||| (Translate summary into Simplified Chinese)\n"
                    + "ZH_TW_TITLE ||| (Translate title into Traditional Chinese)\n"
                    + "ZH_TW_SUMMARY ||| (Translate summary into Traditional Chinese)\n"
                    + "JA_TITLE ||| (Translate title into Japanese)\n"
                    + "JA_SUMMARY ||| (Translate summary into Japanese)\n"
                    + "VI_TITLE ||| (Translate title into Vietnamese)\n"
                    + "VI_SUMMARY ||| (Translate summary into Vietnamese)";

            String requestBody = "{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"" + escapeJson(prompt) + "\"}]}],"
                    + "\"generationConfig\":{\"temperature\":0.1}}";

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(cachedAccessToken);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            // Spring RestTemplate이 자동으로 Map으로 파싱하게 하여 이스케이프 문제를 완전히 해결!
            Map<String, Object> resMap = restTemplate.postForObject(url, entity, Map.class);
            if (resMap == null || !resMap.containsKey("candidates")) {
                return false;
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) resMap.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String aiText = String.valueOf(parts.get(0).get("text"));

            // 줄 단위로 쪼개서 KEY ||| VALUE 추출
            Map<String, String> parsed = new HashMap<>();
            for (String line : aiText.split("\n")) {
                if (line.contains("|||")) {
                    String[] kv = line.split("\\|\\|\\|", 2);
                    if (kv.length == 2) {
                        parsed.put(kv[0].trim().toUpperCase(), kv[1].trim());
                    }
                }
            }

            String koTitle = notice.getTitle();
            String koSum = parsed.getOrDefault("KO_SUMMARY", notice.getAiSummary());
            String enTitle = parsed.getOrDefault("EN_TITLE", koTitle);
            String enSum = parsed.getOrDefault("EN_SUMMARY", koSum);
            String cnTitle = parsed.getOrDefault("ZH_CN_TITLE", koTitle);
            String cnSum = parsed.getOrDefault("ZH_CN_SUMMARY", koSum);
            String twTitle = parsed.getOrDefault("ZH_TW_TITLE", koTitle);
            String twSum = parsed.getOrDefault("ZH_TW_SUMMARY", koSum);
            String jaTitle = parsed.getOrDefault("JA_TITLE", koTitle);
            String jaSum = parsed.getOrDefault("JA_SUMMARY", koSum);
            String viTitle = parsed.getOrDefault("VI_TITLE", koTitle);
            String viSum = parsed.getOrDefault("VI_SUMMARY", koSum);

            // 실제로 영어 제목이 한국어와 다르게 번역되었는지 검증!
            if (enTitle.equals(koTitle)) {
                System.out.println("⚠️ AI 원문 응답 확인: " + aiText);
                return false;
            }

            notice.setAiSummary(koSum);
            String translationsJson = buildTranslationsJson(
                    true, koTitle, koSum, enTitle, enSum, cnTitle, cnSum, twTitle, twSum, jaTitle, jaSum, viTitle, viSum
            );
            notice.setTranslations(translationsJson);
            notice.setAiProcessed(true);

            System.out.println("==========================================");
            System.out.println("✨ [Vertex AI 6개국어 번역 완료] 원본: " + koTitle);
            System.out.println("   🇺🇸 EN: " + enTitle);
            System.out.println("   🇨🇳 ZH: " + cnTitle);
            System.out.println("   🇯🇵 JA: " + jaTitle);
            System.out.println("   🇻🇳 VI: " + viTitle);
            return true;

        } catch (Exception e) {
            System.out.println("ℹ️ Vertex AI 호출 예외 발생: " + e.getMessage());
            return false;
        }
    }

    private void applySmartClassification(Notice notice) {
        String text = (notice.getTitle() + " " + notice.getCleanContent() + " " + notice.getDept()).toLowerCase();
        List<String> tags = new ArrayList<>();

        if (text.contains("시흥")) {
            notice.setRegion("시흥시");
            tags.add("#시흥시");
        } else {
            notice.setRegion("경기도 전체");
            tags.add("#경기도광역");
        }

        if (text.contains("청년") || text.contains("대학생") || text.contains("구직") || text.contains("취업") || text.contains("장학")) {
            notice.setTargetAge("청년");
            tags.add("#청년");
        } else if (text.contains("노인") || text.contains("어르신") || text.contains("경로") || text.contains("고령") || text.contains("치매") || text.contains("65세")) {
            notice.setTargetAge("어르신");
            tags.add("#어르신");
        } else if (text.contains("아동") || text.contains("영유아") || text.contains("어린이") || text.contains("보육") || text.contains("초등") || text.contains("청소년")) {
            notice.setTargetAge("영유아·아동");
            tags.add("#아동·청소년");
        } else {
            notice.setTargetAge("전체");
        }

        if (text.contains("외국인") || text.contains("이민") || text.contains("체류") || text.contains("동포")) {
            notice.setTargetNationality("외국인");
            tags.add("#외국인주민");
        } else if (text.contains("다문화") || text.contains("결혼이민")) {
            notice.setTargetNationality("다문화");
            tags.add("#다문화가족");
        } else {
            notice.setTargetNationality("전체");
        }

        if ("외국인".equals(notice.getTargetNationality())) {
            notice.setAiCategory("외국인");
        } else if ("다문화".equals(notice.getTargetNationality())) {
            notice.setAiCategory("다문화");
        } else if (text.contains("소상공인") || text.contains("중소기업") || text.contains("창업") || text.contains("사업자") || text.contains("상점") || text.contains("농업") || text.contains("융자")) {
            notice.setAiCategory("소상공인");
            tags.add("#소상공인·기업");
        } else if ("청년".equals(notice.getTargetAge())) {
            notice.setAiCategory("청년");
        } else if ("어르신".equals(notice.getTargetAge())) {
            notice.setAiCategory("어르신");
        } else if (text.contains("교육") || text.contains("강좌") || text.contains("학교") || text.contains("장학") || text.contains("학습") || text.contains("연수")) {
            notice.setAiCategory("교육");
            tags.add("#교육지원");
        } else if (text.contains("문화") || text.contains("행사") || text.contains("공연") || text.contains("축제") || text.contains("체육") || text.contains("관광") || text.contains("예술")) {
            notice.setAiCategory("문화·행사");
            tags.add("#문화·행사");
        } else {
            notice.setAiCategory("가족");
            tags.add("#가족·생활복지");
        }

        if (notice.getSupportType() != null && !notice.getSupportType().isEmpty()) {
            tags.add("#" + notice.getSupportType().replaceAll("\\s+", ""));
        }
        notice.setAiTags(String.join(",", tags));

        String content = notice.getCleanContent();
        String koSummary;
        if (content == null || content.isEmpty()) {
            koSummary = notice.getDept() + "에서 제공하는 [" + notice.getTitle() + "] 지원 사업입니다.";
        } else if (content.length() > 110) {
            koSummary = content.substring(0, 110) + "...";
        } else {
            koSummary = content;
        }
        notice.setAiSummary(koSummary);

        if (notice.getTranslations() == null || notice.getTranslations().isEmpty()) {
            String cat = notice.getAiCategory();
            String reg = "시흥시".equals(notice.getRegion()) ? "Siheung City" : "Gyeonggi Province";
            String koTitle = notice.getTitle();

            String enTitle = "[" + reg + " Support] " + translateCategory(cat, "en") + " (" + koTitle + ")";
            String enSum = "Official public service provided by " + reg + " for " + translateCategory(cat, "en") + ". Support type: " + notice.getSupportType() + ".";
            String zhCnTitle = "【始兴·京畿支援】" + translateCategory(cat, "zh-CN") + "公共服务 (" + koTitle + ")";
            String zhCnSum = "由" + notice.getDept() + "提供的" + translateCategory(cat, "zh-CN") + "定制支援项目。支援形式：" + notice.getSupportType() + "。";
            String zhTwTitle = "【始興·京畿支援】" + translateCategory(cat, "zh-TW") + "公共服務 (" + koTitle + ")";
            String zhTwSum = "由" + notice.getDept() + "提供的" + translateCategory(cat, "zh-TW") + "定制支援項目。支援形式：" + notice.getSupportType() + "。";
            String jaTitle = "【始興・京畿支援】" + translateCategory(cat, "ja") + "公共サービス (" + koTitle + ")";
            String jaSum = notice.getDept() + "が提供する" + translateCategory(cat, "ja") + "向けの支援事業です。支援形態：" + notice.getSupportType() + "。";
            String viTitle = "[Hỗ trợ Siheung/Gyeonggi] Dịch vụ công cho " + translateCategory(cat, "vi") + " (" + koTitle + ")";
            String viSum = "Chương trình hỗ trợ dành cho " + translateCategory(cat, "vi") + " do " + notice.getDept() + " cung cấp. Hình thức: " + notice.getSupportType() + ".";

            notice.setTranslations(buildTranslationsJson(
                    false, koTitle, koSummary, enTitle, enSum, zhCnTitle, zhCnSum, zhTwTitle, zhTwSum, jaTitle, jaSum, viTitle, viSum
            ));
        }
        notice.setAiProcessed(true);
    }

    private String translateCategory(String cat, String lang) {
        Map<String, Map<String, String>> dict = Map.of(
            "청년", Map.of("en", "Youth", "zh-CN", "青年", "zh-TW", "青年", "ja", "青年・若者", "vi", "Thanh niên"),
            "외국인", Map.of("en", "Foreign Residents", "zh-CN", "外国居民", "zh-TW", "外國居民", "ja", "外国人住民", "vi", "Cư dân nước ngoài"),
            "다문화", Map.of("en", "Multicultural Families", "zh-CN", "多文化家庭", "zh-TW", "多文化家庭", "ja", "多文化家族", "vi", "Gia đình đa văn hóa"),
            "소상공인", Map.of("en", "Small Business", "zh-CN", "小工商业者", "zh-TW", "小工商業", "ja", "小規模事業者", "vi", "Tiểu thương & Doanh nghiệp"),
            "가족", Map.of("en", "Family & Welfare", "zh-CN", "家庭与福利", "zh-TW", "家庭與福利", "ja", "家族・生活福祉", "vi", "Gia đình & Phúc lợi"),
            "어르신", Map.of("en", "Senior Citizens", "zh-CN", "老年人", "zh-TW", "長者", "ja", "高齢者", "vi", "Người cao tuổi"),
            "교육", Map.of("en", "Education", "zh-CN", "教育支援", "zh-TW", "教育支援", "ja", "教育支援", "vi", "Giáo dục"),
            "문화·행사", Map.of("en", "Culture & Events", "zh-CN", "文化与活动", "zh-TW", "文化與活動", "ja", "文化・イベント", "vi", "Văn hóa & Sự kiện")
        );
        return dict.getOrDefault(cat, dict.get("가족")).getOrDefault(lang, cat);
    }

    private String buildTranslationsJson(boolean isVertexAi, String koT, String koS, String enT, String enS,
                                         String cnT, String cnS, String twT, String twS,
                                         String jaT, String jaS, String viT, String viS) {
        return "{"
                + "\"vertexAi\":" + isVertexAi + ","
                + "\"ko\":{\"title\":\"" + escapeJson(koT) + "\",\"summary\":\"" + escapeJson(koS) + "\"},"
                + "\"en\":{\"title\":\"" + escapeJson(enT) + "\",\"summary\":\"" + escapeJson(enS) + "\"},"
                + "\"zh-CN\":{\"title\":\"" + escapeJson(cnT) + "\",\"summary\":\"" + escapeJson(cnS) + "\"},"
                + "\"zh-TW\":{\"title\":\"" + escapeJson(twT) + "\",\"summary\":\"" + escapeJson(twS) + "\"},"
                + "\"ja\":{\"title\":\"" + escapeJson(jaT) + "\",\"summary\":\"" + escapeJson(jaS) + "\"},"
                + "\"vi\":{\"title\":\"" + escapeJson(viT) + "\",\"summary\":\"" + escapeJson(viS) + "\"}"
                + "}";
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}