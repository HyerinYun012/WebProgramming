package com.example.demo.controller;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import com.example.demo.service.NoticeAiService;
import com.example.demo.service.NoticeSyncService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notices")
@CrossOrigin(origins = "*") // 프론트엔드(React/Vue/HTML)에서 CORS 에러 없이 호출 가능하도록 허용!
public class NoticeController {

    private final NoticeSyncService noticeSyncService;
    private final NoticeAiService noticeAiService;
    private final NoticeRepository noticeRepository;

    public NoticeController(NoticeSyncService noticeSyncService, NoticeAiService noticeAiService, NoticeRepository noticeRepository) {
        this.noticeSyncService = noticeSyncService;
        this.noticeAiService = noticeAiService;
        this.noticeRepository = noticeRepository;
    }

    // 1. 공공데이터 수집 + AI 자동 분류를 한 번에 실행!
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
                    "message", "공공데이터 수집 및 프론트엔드 필터 기준 AI 자동 분류 완료!"
            );
        } catch (Exception e) {
            return Map.of("status", "ERROR", "error_detail", e.getMessage());
        }
    }

    // 2. 이미 DB에 있는 데이터만 빠르게 AI 재분류 실행할 때 쓰는 주소
    // 호출 주소: http://localhost:8080/api/notices/classify
    @GetMapping("/classify")
    public Map<String, Object> classifyOnly() {
        int count = noticeAiService.classifyAllNotices();
        return Map.of("status", "SUCCESS", "classified_count", count);
    }

    // 3. 프론트엔드 메인 화면 [4대 필터 + 검색어] 실시간 맞춤형 조회 API
    // 호출 예시: http://localhost:8080/api/notices?category=청년&region=시흥시&keyword=월세
    @GetMapping
    public List<Notice> getFilteredNotices(
            @RequestParam(required = false, defaultValue = "전체") String age,
            @RequestParam(required = false, defaultValue = "전체") String nationality,
            @RequestParam(required = false, defaultValue = "전체") String category,
            @RequestParam(required = false, defaultValue = "전체") String region,
            @RequestParam(required = false, defaultValue = "") String keyword
    ) {
        List<Notice> allNotices = noticeRepository.findAll();

        return allNotices.stream()
                .filter(n -> "전체".equals(age) || age.equals(n.getTargetAge()) || "전체".equals(n.getTargetAge()))
                .filter(n -> "전체".equals(nationality) || nationality.equals(n.getTargetNationality()))
                .filter(n -> "전체".equals(category) || category.equals(n.getAiCategory()))
                .filter(n -> "전체".equals(region) || (n.getRegion() != null && n.getRegion().contains(region)))
                .filter(n -> keyword.isEmpty() ||
                        (n.getTitle() != null && n.getTitle().contains(keyword)) ||
                        (n.getCleanContent() != null && n.getCleanContent().contains(keyword)) ||
                        (n.getAiTags() != null && n.getAiTags().contains(keyword)))
                .collect(Collectors.toList());
    }

    // 4. 프론트엔드 [분야별로 찾아보기] 8개 아이콘 아래 건수(예: 청년 38건) 자동 계산 API
    // 호출 주소: http://localhost:8080/api/notices/counts
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
}
