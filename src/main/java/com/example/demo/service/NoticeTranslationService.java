package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.entity.NoticeTranslation;
import com.example.demo.repository.NoticeRepository;
import com.example.demo.repository.NoticeTranslationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Gemini 분석이 끝난 공고(is_ai_processed = true)의 제목/요약/본문을 설정된 언어로 번역해 notice_translations 에 저장한다.
 * - 원문 해시(source_hash)가 같고 DONE 인 번역은 다시 번역하지 않는다.
 * - 공고 1건당 Gemini 1회 호출로, 아직 번역이 필요한 언어를 한꺼번에 받는다.
 * - 필터/카테고리 값은 번역하지 않는다 (프론트엔드 i18n 에서 표시만 변환).
 */
@Service
public class NoticeTranslationService {

    private static final String PROMPT_PATH = "prompts/translate.txt";

    private final NoticeRepository noticeRepository;
    private final NoticeTranslationRepository translationRepository;
    private final GeminiClient geminiClient;
    private final String promptTemplate;
    private final List<String> languages;

    /** 한 번 실행할 때 Gemini를 호출하는 최대 공고 수 (무료 할당량 보호) */
    @Value("${app.translation.batch-size:10}")
    private int batchSize;

    public NoticeTranslationService(NoticeRepository noticeRepository,
                                    NoticeTranslationRepository translationRepository,
                                    GeminiClient geminiClient,
                                    @Value("${app.translation.languages:en,ja,zh-CN,zh-TW,vi}") String languages) {
        this.noticeRepository = noticeRepository;
        this.translationRepository = translationRepository;
        this.geminiClient = geminiClient;
        this.languages = Arrays.stream(languages.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
        this.promptTemplate = loadPrompt();
    }

    /**
     * 번역이 필요한 공고를 최대 batchSize 건까지 번역한다.
     * 트랜잭션을 걸지 않는다: 공고마다 바로 저장해서 중간에 실패해도 다음 실행에서 이어간다.
     *
     * @return 이번에 번역에 성공한 (공고, 언어) 행 수
     */
    public int translatePendingNotices() {
        if (!geminiClient.isEnabled() || languages.isEmpty()) {
            System.out.println("ℹ️ Gemini 키 또는 번역 언어가 설정되지 않아 번역을 건너뜁니다.");
            return 0;
        }

        // notice_id → (lang → 번역)
        Map<String, Map<String, NoticeTranslation>> existing = translationRepository.findAll().stream()
                .collect(Collectors.groupingBy(NoticeTranslation::getNoticeId,
                        Collectors.toMap(NoticeTranslation::getLang, t -> t)));

        List<Candidate> candidates = new ArrayList<>();
        for (Notice notice : noticeRepository.findAll()) {
            if (!notice.isAiProcessed()) continue; // Gemini 요약이 끝난 공고만 (요약이 바뀌면 재번역이 생기므로)

            String hash = sourceHash(notice);
            Map<String, NoticeTranslation> byLang = existing.getOrDefault(notice.getNoticeId(), Map.of());
            List<String> missing = languages.stream()
                    .filter(lang -> byLang.get(lang) == null || byLang.get(lang).needsTranslation(hash))
                    .toList();

            if (!missing.isEmpty()) {
                boolean hasFailed = byLang.values().stream().anyMatch(NoticeTranslation::isFailed);
                candidates.add(new Candidate(notice, hash, missing, byLang, hasFailed));
            }
        }

        // 계속 실패하는 공고가 배치를 차지하지 않도록 새 번역/원문 변경 건을 먼저 처리
        candidates.sort(Comparator.comparing(Candidate::hasFailed));

        int successRows = 0;
        int failedRows = 0;
        for (Candidate c : candidates.subList(0, Math.min(batchSize, candidates.size()))) {
            List<NoticeTranslation> toSave = translateNotice(c);
            translationRepository.saveAll(toSave);
            for (NoticeTranslation t : toSave) {
                if (t.isFailed()) failedRows++;
                else successRows++;
            }
        }

        System.out.println("🌐 공고 번역 완료: 성공 " + successRows + "건, 실패 " + failedRows
                + "건, 남은 대상 공고 " + Math.max(0, candidates.size() - batchSize) + "건");
        return successRows;
    }

    private record Candidate(Notice notice, String hash, List<String> missingLangs,
                             Map<String, NoticeTranslation> existingByLang, boolean hasFailed) {
    }

    /** 공고 1건을 필요한 언어들로 번역한다. 실패한 언어는 FAILED 로 기록한다. */
    private List<NoticeTranslation> translateNotice(Candidate c) {
        Notice notice = c.notice();
        List<NoticeTranslation> results = new ArrayList<>();

        JsonNode response = null;
        String error = null;
        try {
            response = geminiClient.generateJson(buildPrompt(notice, c.missingLangs()), 0.2);
        } catch (Exception e) {
            error = e.getMessage();
            System.out.println("ℹ️ 번역 실패 [" + notice.getNoticeId() + "]: " + error);
        }

        for (String lang : c.missingLangs()) {
            NoticeTranslation t = c.existingByLang().get(lang);
            if (t == null) {
                t = new NoticeTranslation(notice.getNoticeId(), lang);
            }

            JsonNode tr = response == null ? null : response.path(lang);
            String title = tr == null ? "" : tr.path("title").asString("").trim();

            if (error != null) {
                t.markFailed(c.hash(), error);
            } else if (title.isEmpty()) {
                t.markFailed(c.hash(), "Gemini 응답에 '" + lang + "' 번역이 없습니다");
            } else {
                t.markDone(title,
                        emptyToNull(tr.path("summary").asString("")),
                        emptyToNull(tr.path("content").asString("")),
                        c.hash(),
                        geminiClient.getModel());
            }
            results.add(t);
        }
        return results;
    }

    private String buildPrompt(Notice notice, List<String> langs) {
        String languageList = langs.stream()
                .map(code -> code + "(" + Locale.forLanguageTag(code).getDisplayName(Locale.KOREAN) + ")")
                .collect(Collectors.joining(", "));

        String outputFormat = langs.stream()
                .map(code -> "  \"" + code + "\": {\"title\": \"...\", \"summary\": \"...\", \"content\": \"...\"}")
                .collect(Collectors.joining(",\n", "{\n", "\n}"));

        // 원문은 마지막에 치환 (원문 안에 {{...}} 같은 글자가 있어도 템플릿이 깨지지 않도록)
        return promptTemplate
                .replace("{{languages}}", languageList)
                .replace("{{outputFormat}}", outputFormat)
                .replace("{{title}}", nullToEmpty(notice.getTitle()))
                .replace("{{summary}}", nullToEmpty(notice.getAiSummary()))
                .replace("{{content}}", nullToEmpty(notice.getCleanContent()));
    }

    /** 번역 대상 원문(제목+요약+본문)의 SHA-256. 이 값이 바뀌면 재번역한다. */
    static String sourceHash(Notice notice) {
        String source = nullToEmpty(notice.getTitle()) + "\u0000"
                + nullToEmpty(notice.getAiSummary()) + "\u0000"
                + nullToEmpty(notice.getCleanContent());
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String loadPrompt() {
        try {
            return new ClassPathResource(PROMPT_PATH).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("번역 프롬프트 파일을 읽을 수 없습니다: " + PROMPT_PATH, e);
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
