package com.example.demo.controller;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import com.example.demo.service.NoticeAiService;
import com.example.demo.service.NoticeSyncService;
import org.springframework.boot.json.BasicJsonParser;
import org.springframework.boot.json.JsonParser;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notices")
@CrossOrigin(origins = "*")
public class NoticeController {

    private final NoticeSyncService noticeSyncService;
    private final NoticeAiService noticeAiService;
    private final NoticeRepository noticeRepository;
    private final JsonParser jsonParser = new BasicJsonParser();

    public NoticeController(NoticeSyncService noticeSyncService, NoticeAiService noticeAiService, NoticeRepository noticeRepository) {
        this.noticeSyncService = noticeSyncService;
        this.noticeAiService = noticeAiService;
        this.noticeRepository = noticeRepository;
    }

    // 1. 공공데이터 수집 + 6개 국어 AI 번역/분류 일괄 실행
    // 호출 주소: http://localhost:8080/api/notices/sync
    @GetMapping("/sync")
    public Map<String, Object> syncAndClassifyNotices() {
        try {
            int savedCount = noticeSyncService.fetchAndSaveSiheungNotices();
            int classifiedCount = noticeAiService.classifyAllNotices();
            return Map.of(
                    "status", "SUCCESS",
                    "saved_count", savedCount,
                    "ai_classified_count", classifiedCount,
                    "supported_languages", List.of("ko", "en", "zh-CN", "zh-TW", "ja", "vi"),
                    "message", "공공데이터 수집 및 Vertex AI 6개 국어 번역/분류 완료!"
            );
        } catch (Exception e) {
            return Map.of("status", "ERROR", "error_detail", e.getMessage());
        }
    }

    // 2. 기존 DB 데이터에 대해 AI 분류 및 6개 국어 번역만 즉시 실행
    // 호출 주소: http://localhost:8080/api/notices/classify
    @GetMapping("/classify")
    public Map<String, Object> classifyOnly() {
        int count = noticeAiService.classifyAllNotices();
        return Map.of(
                "status", "SUCCESS",
                "classified_count", count,
                "supported_languages", List.of("ko", "en", "zh-CN", "zh-TW", "ja", "vi")
        );
    }

    // 3. [다국어 + 4대 필터 지원] 공고 목록 조회 API
    // 지원 언어(lang): ko, en, zh-CN, zh-TW, ja, vi
    // 호출 예시: http://localhost:8080/api/notices?lang=vi&category=청년
    @GetMapping
    public List<Notice> getFilteredNotices(
            @RequestParam(value = "age", required = false, defaultValue = "전체") String age,
            @RequestParam(value = "nationality", required = false, defaultValue = "전체") String nationality,
            @RequestParam(value = "category", required = false, defaultValue = "전체") String category,
            @RequestParam(value = "region", required = false, defaultValue = "전체") String region,
            @RequestParam(value = "keyword", required = false, defaultValue = "") String keyword,
            @RequestParam(value = "lang", required = false, defaultValue = "ko") String lang
    ) {
        List<Notice> allNotices = noticeRepository.findAll();

        return allNotices.stream()
                // ① 나이 필터 (선택 시 해당 연령대 타겟이거나 제목/본문/카테고리에 해당 연령 키워드가 포함된 공고만 엄격 매칭!)
                .filter(n -> {
                    if ("전체".equals(age)) return true;
                    String text = (n.getTitle() + " " + n.getCleanContent() + " " + n.getAiTags());
                    return age.equals(n.getTargetAge()) || age.equals(n.getAiCategory()) || text.contains(age.split(" ")[0]);
                })
                // ② 국적/대상 필터 (외국인, 다문화 등)
                .filter(n -> {
                    if ("전체".equals(nationality)) return true;
                    String text = (n.getTitle() + " " + n.getCleanContent() + " " + n.getAiTags());
                    return nationality.equals(n.getTargetNationality()) || nationality.equals(n.getAiCategory()) || text.contains(nationality);
                })
                // ③ 카테고리 필터 (8대 분야)
                .filter(n -> {
                    if ("전체".equals(category)) return true;
                    String text = (n.getTitle() + " " + n.getCleanContent() + " " + n.getAiTags());
                    return category.equals(n.getAiCategory()) || category.equals(n.getTargetAge()) || text.contains(category);
                })
                // ④ 관할지역 필터 (시흥시 직접 vs 경기도 광역)
                .filter(n -> "전체".equals(region) || (n.getRegion() != null && n.getRegion().contains(region)))
                // ⑤ 검색어 필터
                .filter(n -> keyword.isEmpty() ||
                        (n.getTitle() != null && n.getTitle().toLowerCase().contains(keyword.toLowerCase())) ||
                        (n.getCleanContent() != null && n.getCleanContent().toLowerCase().contains(keyword.toLowerCase())) ||
                        (n.getAiTags() != null && n.getAiTags().toLowerCase().contains(keyword.toLowerCase())))
                .map(n -> applyLanguageView(n, lang))
                .collect(Collectors.toList());
    }

    // 4. 8대 분야별 건수 조회 API
    @GetMapping("/counts")
    public Map<String, Long> getCategoryCounts() {
        List<Notice> all = noticeRepository.findAll();
        Map<String, Long> counts = new LinkedHashMap<>();
        String[] categories = {"청년", "외국인", "다문화", "소상공인", "가족", "어르신", "교육", "문화·행사"};

        for (String cat : categories) {
            long cnt = all.stream().filter(n -> cat.equals(n.getAiCategory())).count();
            counts.put(cat, cnt);
        }
        counts.put("전체", (long) all.size());
        return counts;
    }

    // 5. 공고 상세 조회 API (다국어 lang 파라미터 지원)
    // 호출 예시: http://localhost:8080/api/notices/W00001234?lang=zh-CN
    @GetMapping("/{noticeId}")
    public Notice getNoticeDetail(
            @PathVariable("noticeId") String noticeId,
            @RequestParam(value = "lang", required = false, defaultValue = "ko") String lang
    ) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new RuntimeException("해당 공고를 찾을 수 없습니다: " + noticeId));
        return applyLanguageView(notice, lang);
    }

    // DB의 translations JSON에서 요청 언어(ko, en, zh-CN, zh-TW, ja, vi)를 꺼내어 응답 객체에 적용하는 도우미 함수
    @SuppressWarnings("unchecked")
    private Notice applyLanguageView(Notice org, String lang) {
        if (lang == null || "ko".equalsIgnoreCase(lang) || org.getTranslations() == null || org.getTranslations().isEmpty()) {
            return org;
        }
        try {
            Map<String, Object> transMap = jsonParser.parseMap(org.getTranslations());
            Map<String, Object> langObj = (Map<String, Object>) transMap.get(lang);
            if (langObj == null) {
                return org;
            }

            // 원본 엔티티가 DB에 덮어써지지 않도록 화면 반환용 복사본 생성
            Notice viewCopy = new Notice(
                    org.getNoticeId(),
                    String.valueOf(langObj.getOrDefault("title", org.getTitle())),
                    org.getDept(),
                    org.getPostedDate(),
                    org.getSupportType(),
                    org.getUrl(),
                    org.getCleanContent(),
                    org.isAiProcessed()
            );
            viewCopy.setTargetAge(org.getTargetAge());
            viewCopy.setTargetNationality(org.getTargetNationality());
            viewCopy.setAiCategory(org.getAiCategory());
            viewCopy.setRegion(org.getRegion());
            viewCopy.setAiSummary(String.valueOf(langObj.getOrDefault("summary", org.getAiSummary())));
            viewCopy.setAiTags(org.getAiTags());
            viewCopy.setTranslations(org.getTranslations());
            return viewCopy;
        } catch (Exception e) {
            return org;
        }
    }
}
