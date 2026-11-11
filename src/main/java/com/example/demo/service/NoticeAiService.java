package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.BasicJsonParser;
import org.springframework.boot.json.JsonParser;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class NoticeAiService {

    private final NoticeRepository noticeRepository;
    private final JsonParser jsonParser = new BasicJsonParser();

    @Value("${gemini.api.key:NONE}")
    private String geminiApiKey;

    public NoticeAiService(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    /**
     * DB의 모든 공고를 프론트엔드 필터(나이, 국적, 8대 분야, 지역)에 맞게 일괄 AI 분류
     */
    @Transactional
    public int classifyAllNotices() {
        List<Notice> notices = noticeRepository.findAll();
        int processedCount = 0;

        boolean useRealGemini = geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equals("NONE");

        for (Notice notice : notices) {
            // 1. 실제 Gemini API 키가 설정된 경우 상위 10건은 실시간 LLM 호출 (속도 및 무료 할당량 보호)
            if (useRealGemini && processedCount < 10 && !notice.isAiProcessed()) {
                boolean success = callGeminiApi(notice);
                if (success) {
                    processedCount++;
                    continue;
                }
            }

            // 2. 스마트 문맥 분류 엔진 (프론트엔드 8대 분야 & 4대 필터 완벽 매핑)
            applySmartClassification(notice);
            processedCount++;
        }

        noticeRepository.saveAll(notices);
        System.out.println("🤖 총 " + processedCount + "건의 공고 AI 카테고리 및 필터 태깅 완료!");
        return processedCount;
    }

    /**
     * Google Gemini 2.5 Flash REST API 직접 호출
     */
    @SuppressWarnings("unchecked")
    private boolean callGeminiApi(Notice notice) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey.trim();

            String prompt = "다음 공공서비스 공고를 분석해서 프론트엔드 필터용 JSON으로만 응답해줘.\n"
                    + "제목: " + notice.getTitle() + "\n"
                    + "소관기관: " + notice.getDept() + "\n"
                    + "내용: " + notice.getCleanContent() + "\n\n"
                    + "반드시 아래 JSON 키와 허용된 값만 사용해:\n"
                    + "{\n"
                    + "  \"targetAge\": \"전체\" | \"청년\" | \"어르신\" | \"영유아·아동\" | \"중장년\",\n"
                    + "  \"targetNationality\": \"전체\" | \"외국인\" | \"다문화\",\n"
                    + "  \"aiCategory\": \"청년\" | \"외국인\" | \"다문화\" | \"소상공인\" | \"가족\" | \"어르신\" | \"교육\" | \"문화·행사\",\n"
                    + "  \"region\": \"시흥시\" | \"경기도 전체\",\n"
                    + "  \"aiSummary\": \"공고 핵심 내용 2문장 요약\",\n"
                    + "  \"aiTags\": \"#해시태그1,#해시태그2,#해시태그3\"\n"
                    + "}";

            String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + escapeJson(prompt) + "\"}]}],"
                    + "\"generationConfig\":{\"responseMimeType\":\"application/json\",\"temperature\":0.1}}";

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            String response = restTemplate.postForObject(url, entity, String.class);

            Map<String, Object> resMap = jsonParser.parseMap(response);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) resMap.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String aiJsonText = String.valueOf(parts.get(0).get("text"));

            Map<String, Object> result = jsonParser.parseMap(aiJsonText);

            notice.setTargetAge(String.valueOf(result.getOrDefault("targetAge", "전체")));
            notice.setTargetNationality(String.valueOf(result.getOrDefault("targetNationality", "전체")));
            notice.setAiCategory(String.valueOf(result.getOrDefault("aiCategory", "가족")));
            notice.setRegion(String.valueOf(result.getOrDefault("region", "시흥시")));
            notice.setAiSummary(String.valueOf(result.getOrDefault("aiSummary", notice.getCleanContent())));
            notice.setAiTags(String.valueOf(result.getOrDefault("aiTags", "#시흥시,#맞춤지원")));
            notice.setAiProcessed(true);
            return true;

        } catch (Exception e) {
            System.out.println("ℹ️ Gemini API 대신 내장 스마트 분류기로 처리합니다: " + e.getMessage());
            return false;
        }
    }

    /**
     * 프론트엔드 화면의 8대 아이콘 및 4대 드롭다운 필터에 100% 매칭시키는 스마트 분석기
     */
    private void applySmartClassification(Notice notice) {
        String text = (notice.getTitle() + " " + notice.getCleanContent() + " " + notice.getDept()).toLowerCase();
        List<String> tags = new ArrayList<>();

        // 1. 지역(region) 필터 분류
        if (text.contains("시흥")) {
            notice.setRegion("시흥시");
            tags.add("#시흥시");
        } else {
            notice.setRegion("경기도 전체");
            tags.add("#경기도광역");
        }

        // 2. 나이(targetAge) 필터 분류
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

        // 3. 국적/대상(targetNationality) 필터 분류
        if (text.contains("외국인") || text.contains("이민") || text.contains("체류") || text.contains("동포")) {
            notice.setTargetNationality("외국인");
            tags.add("#외국인주민");
        } else if (text.contains("다문화") || text.contains("결혼이민")) {
            notice.setTargetNationality("다문화");
            tags.add("#다문화가족");
        } else {
            notice.setTargetNationality("전체");
        }

        // 4. 프론트엔드 메인 화면 8대 분야 아이콘(aiCategory) 정확히 매핑!
        // [청년, 외국인, 다문화, 소상공인, 가족, 어르신, 교육, 문화·행사]
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
            // 임산부, 출산, 보육, 주거, 일반 생활복지 등은 '가족' 카테고리로 통합
            notice.setAiCategory("가족");
            tags.add("#가족·생활복지");
        }

        // 지원형태 태그 추가
        if (notice.getSupportType() != null && !notice.getSupportType().isEmpty()) {
            tags.add("#" + notice.getSupportType().replaceAll("\\s+", ""));
        }

        notice.setAiTags(String.join(",", tags));

        // 5. 카드 UI에 보여줄 깔끔한 2줄 요약(aiSummary) 생성
        String content = notice.getCleanContent();
        if (content == null || content.isEmpty()) {
            notice.setAiSummary(notice.getDept() + "에서 제공하는 [" + notice.getTitle() + "] 지원 사업입니다.");
        } else if (content.length() > 110) {
            notice.setAiSummary(content.substring(0, 110) + "...");
        } else {
            notice.setAiSummary(content);
        }

        notice.setAiProcessed(true);
    }

    private String escapeJson(String str) {
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
