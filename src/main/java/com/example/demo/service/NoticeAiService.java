package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class NoticeAiService {

    private static final Set<String> AGES = Set.of("전체", "청년", "어르신", "영유아·아동", "중장년");
    private static final Set<String> NATIONALITIES = Set.of("전체", "외국인", "다문화");
    private static final Set<String> CATEGORIES = Set.of("청년", "외국인", "다문화", "소상공인", "가족", "어르신", "교육", "문화·행사");
    private static final Set<String> REGIONS = Set.of("시흥시", "경기도 전체");

    private final NoticeRepository noticeRepository;
    private final GeminiClient geminiClient;

    /** 한 번 실행할 때 Gemini를 호출하는 최대 공고 수 (무료 할당량 보호) */
    @Value("${gemini.classify.batch-size:10}")
    private int geminiBatchSize;

    public NoticeAiService(NoticeRepository noticeRepository, GeminiClient geminiClient) {
        this.noticeRepository = noticeRepository;
        this.geminiClient = geminiClient;
    }

    /**
     * 아직 Gemini 분석이 끝나지 않은 공고(is_ai_processed = false)만 분류한다.
     * - Gemini 분석에 성공한 공고: is_ai_processed = true 로 저장 → 이후 실행에서는 건드리지 않음
     * - 나머지 공고: 키워드 분류기로 임시 분류 (is_ai_processed = false 유지 → 다음 실행에서 Gemini 분석 대상)
     *
     * 트랜잭션을 걸지 않는다: Gemini HTTP 호출 동안 DB 트랜잭션을 붙잡지 않고,
     * 중간에 실패해도 이미 저장한 Gemini 결과는 남도록 공고마다 바로 저장한다.
     *
     * @return 이번에 분류한 공고 수 (Gemini + 키워드 분류)
     */
    public int classifyAllNotices() {
        List<Notice> pending = noticeRepository.findAll().stream()
                .filter(n -> !n.isAiProcessed())
                .toList();

        int geminiAttempts = 0;
        int geminiSuccess = 0;
        List<Notice> ruleClassified = new ArrayList<>();

        for (Notice notice : pending) {
            // 1. Gemini 키가 있으면 배치 크기만큼 실제 LLM 호출 (실패 건도 시도 횟수에 포함해 할당량 낭비 방지)
            if (geminiClient.isEnabled() && geminiAttempts < geminiBatchSize) {
                geminiAttempts++;
                if (classifyWithGemini(notice)) {
                    noticeRepository.save(notice);
                    geminiSuccess++;
                    continue;
                }
            }

            // 2. 스마트 문맥 분류 엔진으로 임시 분류 (프론트엔드 8대 분야 & 4대 필터 매핑)
            applySmartClassification(notice);
            ruleClassified.add(notice);
        }

        noticeRepository.saveAll(ruleClassified);
        System.out.println("🤖 공고 분류 완료: Gemini " + geminiSuccess + "건, 키워드 임시 분류 " + ruleClassified.size() + "건");
        return geminiSuccess + ruleClassified.size();
    }

    /**
     * Gemini로 공고를 분석해 필터/카테고리/요약/태그를 채운다. 실패하면 false (공고는 변경하지 않음)
     */
    private boolean classifyWithGemini(Notice notice) {
        try {
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

            JsonNode result = geminiClient.generateJson(prompt, 0.1);

            // 허용되지 않은 값이 오면 필터가 깨지므로 기본값으로 대체
            notice.setTargetAge(allowed(result, "targetAge", AGES, "전체"));
            notice.setTargetNationality(allowed(result, "targetNationality", NATIONALITIES, "전체"));
            notice.setAiCategory(allowed(result, "aiCategory", CATEGORIES, "가족"));
            notice.setRegion(allowed(result, "region", REGIONS, "시흥시"));
            notice.setAiSummary(text(result, "aiSummary", notice.getCleanContent()));
            notice.setAiTags(text(result, "aiTags", "#시흥시,#맞춤지원"));
            notice.setAiProcessed(true);
            return true;

        } catch (Exception e) {
            System.out.println("ℹ️ Gemini 분석 실패 [" + notice.getNoticeId() + "], 키워드 분류기로 처리합니다: " + e.getMessage());
            return false;
        }
    }

    private String text(JsonNode node, String field, String defaultValue) {
        String value = node.path(field).asString("").trim();
        return value.isEmpty() ? defaultValue : value;
    }

    private String allowed(JsonNode node, String field, Set<String> allowedValues, String defaultValue) {
        String value = text(node, field, defaultValue);
        return allowedValues.contains(value) ? value : defaultValue;
    }

    /**
     * 프론트엔드 화면의 8대 아이콘 및 4대 드롭다운 필터에 매칭시키는 키워드 기반 임시 분류기.
     * is_ai_processed 는 바꾸지 않는다 (Gemini 분석 완료 여부만 나타내도록).
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

        // 4. 프론트엔드 메인 화면 8대 분야 아이콘(aiCategory) 매핑
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
    }
}
