package com.example.demo.service;

import com.example.demo.entity.AnonymousContext;
import com.example.demo.entity.BehaviorLog;
import com.example.demo.entity.Notice;
import com.example.demo.repository.AnonymousContextRepository;
import com.example.demo.repository.BehaviorLogRepository;
import com.example.demo.repository.NoticeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class BehaviorContextService {

    private final AnonymousContextRepository contextRepository;
    private final BehaviorLogRepository logRepository;
    private final NoticeRepository noticeRepository;

    public BehaviorContextService(AnonymousContextRepository contextRepository,
                                  BehaviorLogRepository logRepository,
                                  NoticeRepository noticeRepository) {
        this.contextRepository = contextRepository;
        this.logRepository = logRepository;
        this.noticeRepository = noticeRepository;
    }

    /**
     * 1. 사용자의 실시간 행동(클릭, 검색, 필터 선택, 찜/찜해제) 기록
     */
    @Transactional
    public Map<String, Object> recordBehavior(String contextId, String eventType, String noticeId,
                                              String category, String keyword, int dwellTimeSec) {
        AnonymousContext context = contextRepository.findById(contextId)
                .orElseGet(() -> new AnonymousContext(contextId));

        // noticeId가 넘어왔다면 해당 공고의 정확한 카테고리를 DB에서 조회해 보정
        if (noticeId != null && !noticeId.isEmpty()) {
            Optional<Notice> optNotice = noticeRepository.findById(noticeId);
            if (optNotice.isPresent()) {
                category = optNotice.get().getAiCategory();
            }
        }

        BehaviorLog log = new BehaviorLog(contextId, eventType, noticeId, category, keyword, dwellTimeSec);
        logRepository.save(log);

        List<BehaviorLog> recentLogs = logRepository.findTop20ByContextIdOrderByCreatedAtDesc(contextId);
        updateContextSummary(context, recentLogs);
        contextRepository.save(context);

        return Map.of(
                "status", "LOG_SAVED",
                "contextId", contextId,
                "inferredPersona", context.getInferredPersona(),
                "totalLogsCount", recentLogs.size()
        );
    }

    /**
     * 2. [전면 업그레이드] 최신성 시간 감쇠(Time-Decay) + 찜(Bookmark) 유사도 기반 초민감 AI 맞춤 추천 엔진
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPersonalizedRecommendations(String contextId) {
        AnonymousContext context = contextRepository.findById(contextId)
                .orElseGet(() -> new AnonymousContext(contextId));

        // 최신순으로 정렬된 최근 행동 로그 20건 (index 0이 방금 한 가장 최신 행동!)
        List<BehaviorLog> logs = logRepository.findTop20ByContextIdOrderByCreatedAtDesc(contextId);
        List<Notice> allNotices = noticeRepository.findAll();

        Map<String, Double> categoryWeights = new HashMap<>();
        List<String> recentSearchKeywords = new ArrayList<>();
        Set<String> activeBookmarkedIds = new LinkedHashSet<>();
        Set<String> unbookmarkedIds = new HashSet<>();
        Set<String> viewedNoticeIds = new HashSet<>();

        // 가장 최근에 명시적으로 클릭한 카테고리 기록 (즉각 반응용!)
        String latestExplicitCategory = null;

        for (int i = 0; i < logs.size(); i++) {
            BehaviorLog log = logs.get(i);
            String type = log.getEventType() != null ? log.getEventType().toUpperCase() : "VIEW";
            String cat = log.getCategory();
            String nId = log.getNoticeId();

            // ⏳ 핵심 1: 최신성 시간 감쇠 (방금 한 행동 i=0 은 1.0배, 이전 행동으로 갈수록 0.82^i 로 급감!)
            double recencyMultiplier = Math.pow(0.82, i);
            if (i == 0) recencyMultiplier = 1.6; // 방금 직전에 한 행동에 강력한 부스트!
            else if (i == 1) recencyMultiplier = 1.25;

            // 찜하기 / 찜 해제 상태 추적 (최신순이므로 먼저 나온 상태가 현재 상태)
            if ("UNBOOKMARK".equals(type) && nId != null) {
                unbookmarkedIds.add(nId);
                continue;
            }
            if ("BOOKMARK".equals(type) && nId != null && !unbookmarkedIds.contains(nId)) {
                activeBookmarkedIds.add(nId);
            }
            if ("VIEW".equals(type) && nId != null) {
                viewedNoticeIds.add(nId);
            }

            // 행동 유형별 기본 점수 (찜하기 > 필터클릭 > 정독조회)
            double baseActionScore = 15.0;
            if ("BOOKMARK".equals(type)) {
                baseActionScore = 55.0; // ❤️ 찜하기에 가장 강력한 가중치 부여!
            } else if ("FILTER".equals(type)) {
                baseActionScore = 40.0; // 분야 아이콘/드롭다운 선택 시 즉시 반응!
            } else if ("VIEW".equals(type)) {
                baseActionScore = log.getDwellTimeSec() >= 20 ? 35.0 : 25.0;
            } else if ("SEARCH".equals(type)) {
                baseActionScore = 30.0;
            }

            if (cat != null && !cat.isEmpty() && !"전체".equals(cat)) {
                if (latestExplicitCategory == null) {
                    latestExplicitCategory = cat;
                }
                double addedWeight = baseActionScore * recencyMultiplier;
                categoryWeights.put(cat, categoryWeights.getOrDefault(cat, 0.0) + addedWeight);
            }

            // 실제 검색창에 입력한 키워드만 추출 (카테고리 이름과 동일한 단순 태그 제외)
            if ("SEARCH".equals(type) && log.getKeyword() != null && !log.getKeyword().trim().isEmpty()) {
                String kw = log.getKeyword().trim();
                if (!recentSearchKeywords.contains(kw) && recentSearchKeywords.size() < 3) {
                    recentSearchKeywords.add(kw);
                }
            }
        }

        // ❤️ 핵심 2: 현재 '찜한 공고'들의 카테고리, 해시태그, 핵심 단어를 추출하여 강력한 프로필 형성!
        Map<String, Integer> bookmarkedCategoryCount = new HashMap<>();
        Set<String> bookmarkedTagsAndWords = new HashSet<>();

        for (Notice n : allNotices) {
            if (activeBookmarkedIds.contains(n.getNoticeId())) {
                String bCat = n.getAiCategory();
                if (bCat != null) {
                    bookmarkedCategoryCount.put(bCat, bookmarkedCategoryCount.getOrDefault(bCat, 0) + 1);
                    // 찜 목록에 있는 카테고리에 추가 강력 가중치 부여
                    categoryWeights.put(bCat, categoryWeights.getOrDefault(bCat, 0.0) + 45.0);
                }
                // 찜한 공고의 해시태그 추출
                if (n.getAiTags() != null) {
                    for (String t : n.getAiTags().split(",")) {
                        String cleanTag = t.replace("#", "").trim();
                        if (cleanTag.length() >= 2 && !cleanTag.equals("시흥시") && !cleanTag.equals("경기도광역")) {
                            bookmarkedTagsAndWords.add(cleanTag);
                        }
                    }
                }
                // 찜한 공고 제목에서 핵심 명사(2글자 이상 단어) 추출
                if (n.getTitle() != null) {
                    for (String word : n.getTitle().split("[\\s()\\[\\]·,]+")) {
                        if (word.length() >= 2 && !word.equals("시흥시") && !word.equals("경기도") && !word.equals("지원") && !word.equals("사업")) {
                            bookmarkedTagsAndWords.add(word);
                        }
                    }
                }
            }
        }

        // 가장 가중치가 높은 1순위 카테고리 및 최고 가중치 값 계산
        String topCategory = "청년";
        double maxCatWeight = 0.0;
        for (Map.Entry<String, Double> entry : categoryWeights.entrySet()) {
            if (entry.getValue() > maxCatWeight) {
                maxCatWeight = entry.getValue();
                topCategory = entry.getKey();
            }
        }
        if (latestExplicitCategory != null && maxCatWeight == 0.0) {
            topCategory = latestExplicitCategory;
        }

        List<Map<String, Object>> scoredNotices = new ArrayList<>();

        for (Notice n : allNotices) {
            String nCat = n.getAiCategory() != null ? n.getAiCategory() : "가족";
            String nText = (n.getTitle() + " " + n.getCleanContent() + " " + n.getAiTags());

            // 기본 점수를 35점으로 낮추어 아무 공고나 99점이 되는 현상 원천 차단!
            double rawScore = 35.0;
            List<String> reasons = new ArrayList<>();

            // ① 카테고리 행동 매칭 점수 (0 ~ 42점: 1순위 관심 분야는 42점 만점, 무관한 분야는 0점!)
            if (maxCatWeight > 0 && categoryWeights.containsKey(nCat)) {
                double ratio = categoryWeights.get(nCat) / maxCatWeight; // 0.0 ~ 1.0
                double catPoints = Math.round(ratio * 42.0);
                rawScore += catPoints;

                if (nCat.equals(topCategory)) {
                    reasons.add("최근 집중 탐색하신 [" + nCat + "] 분야 1순위 맞춤 공고");
                } else if (ratio >= 0.4) {
                    reasons.add("관심 있게 보신 [" + nCat + "] 관련 지원사업");
                }
            } else if (logs.isEmpty() && "청년".equals(nCat)) {
                rawScore += 30.0;
                reasons.add("시흥시 주요 청년 맞춤 지원 정책");
            }

            // 방금 직전에 클릭한 카테고리와 정확히 일치하면 즉각 부스트 (+8점)
            if (latestExplicitCategory != null && latestExplicitCategory.equals(nCat)) {
                rawScore += 8.0;
            }

            // ② ❤️ 찜(Bookmark) 목록과의 컨텐츠 유사도 보너스 (+최대 22점)
            if (bookmarkedCategoryCount.containsKey(nCat)) {
                rawScore += 10.0;
                if (!reasons.get(0).contains("찜")) {
                    reasons.add("찜하신 [" + nCat + "] 공고와 연관된 추천 정책");
                }
            }

            int matchedBookmarkWords = 0;
            String matchedWordExample = "";
            for (String bw : bookmarkedTagsAndWords) {
                if (nText.contains(bw)) {
                    matchedBookmarkWords++;
                    if (matchedWordExample.isEmpty()) matchedWordExample = bw;
                }
            }
            if (matchedBookmarkWords > 0) {
                rawScore += Math.min(matchedBookmarkWords * 6.0, 12.0);
                reasons.add("찜 목록의 '" + matchedWordExample + "' 키워드 맥락과 유사");
            }

            // 이미 내가 찜해둔 공고 자체는 추천 칸을 독점하지 않도록 약간 뒤로 양보(새로운 유사 공고 발굴 유도), 단 점수는 높게 유지
            boolean isAlreadyBookmarked = activeBookmarkedIds.contains(n.getNoticeId());
            if (isAlreadyBookmarked) {
                rawScore += 5.0;
                reasons.add(0, "❤️ 회원님이 직접 찜하신 핵심 관심 공고");
            }

            // ③ 최근 검색어 직접 매칭 (+15점)
            for (String kw : recentSearchKeywords) {
                if (nText.contains(kw)) {
                    rawScore += 15.0;
                    reasons.add("최근 검색어('" + kw + "')와 직접 일치");
                    break;
                }
            }

            // ④ 시흥시 직접 사업 소폭 우대 (+4점)
            if ("시흥시".equals(n.getRegion())) {
                rawScore += 4.0;
            }

            // ⑤ 이미 방금 읽은 공고보다 아직 안 읽은 새로운 맞춤 공고를 우선 발견하도록 미세 조정
            if (!viewedNoticeIds.contains(n.getNoticeId()) && nCat.equals(topCategory)) {
                rawScore += 3.0;
            }

            // ⑥ 동점자 발생 시 '가족' 공고만 계속 나오는 현상을 막기 위한 공고 고유 해시 미세 편차 (0~2점)
            int tieBreaker = Math.abs(n.getNoticeId().hashCode() % 3);
            int finalScore = (int) Math.min(98, Math.max(40, Math.round(rawScore) + tieBreaker));

            if (reasons.isEmpty()) {
                reasons.add("시흥시민이 신청 가능한 [" + nCat + "] 분야 주요 혜택");
            }

            Map<String, Object> card = new LinkedHashMap<>();
            card.put("noticeId", n.getNoticeId());
            card.put("title", n.getTitle());
            card.put("dept", n.getDept());
            card.put("postedDate", n.getPostedDate());
            card.put("supportType", n.getSupportType());
            card.put("aiCategory", n.getAiCategory());
            card.put("targetAge", n.getTargetAge());
            card.put("targetNationality", n.getTargetNationality());
            card.put("region", n.getRegion());
            card.put("aiSummary", n.getAiSummary());
            card.put("aiTags", n.getAiTags());
            card.put("url", n.getUrl());
            card.put("isBookmarked", isAlreadyBookmarked);
            card.put("matchScore", finalScore);
            card.put("matchReason", String.join(" · ", reasons));

            scoredNotices.add(card);
        }

        // 최종 점수(matchScore) 내림차순 정렬
        scoredNotices.sort((a, b) -> Integer.compare((int) b.get("matchScore"), (int) a.get("matchScore")));

        return Map.of(
                "contextId", contextId,
                "inferredPersona", context.getInferredPersona(),
                "topInterestCategory", topCategory,
                "recentKeywords", recentSearchKeywords,
                "bookmarkedCount", activeBookmarkedIds.size(),
                "totalBehaviorLogs", logs.size(),
                "recommendations", scoredNotices.subList(0, Math.min(8, scoredNotices.size()))
        );
    }

    @Transactional
    public void resetContext(String contextId) {
        logRepository.deleteByContextId(contextId);
        contextRepository.deleteById(contextId);
    }

    // 최신성 가중치와 찜 목록을 반영하여 상단 'AI 실시간 분석 맥락' 문구 생성
    private void updateContextSummary(AnonymousContext context, List<BehaviorLog> logs) {
        Map<String, Double> weightedCat = new HashMap<>();
        List<String> searchWords = new ArrayList<>();
        int bookmarkActions = 0;

        for (int i = 0; i < logs.size(); i++) {
            BehaviorLog l = logs.get(i);
            double decay = Math.pow(0.8, i);
            String type = l.getEventType() != null ? l.getEventType() : "VIEW";

            if ("BOOKMARK".equals(type)) bookmarkActions++;

            if (l.getCategory() != null && !l.getCategory().isEmpty() && !"전체".equals(l.getCategory())) {
                double w = ("BOOKMARK".equals(type) ? 3.0 : ("FILTER".equals(type) ? 2.0 : 1.0)) * decay;
                weightedCat.put(l.getCategory(), weightedCat.getOrDefault(l.getCategory(), 0.0) + w);
            }
            if ("SEARCH".equals(type) && l.getKeyword() != null && !l.getKeyword().isEmpty() && !searchWords.contains(l.getKeyword())) {
                searchWords.add(l.getKeyword());
            }
        }

        String mainCat = weightedCat.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("청년");

        context.setActiveFilters(mainCat);
        context.setRecentKeywords(String.join(",", searchWords));
        context.setLastActiveAt(LocalDateTime.now());

        StringBuilder persona = new StringBuilder();
        persona.append("현재 [").append(mainCat).append("] 분야를 최우선 탐색 중");
        if (bookmarkActions > 0) {
            persona.append(" · ❤️ 찜한 공고 기반 유사 정책 추천 활성");
        }
        if (!searchWords.isEmpty()) {
            persona.append(" · 최근 검색어: '").append(searchWords.get(0)).append("'");
        }
        context.setInferredPersona(persona.toString());
    }
}
