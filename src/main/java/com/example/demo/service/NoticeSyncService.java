package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.BasicJsonParser;
import org.springframework.boot.json.JsonParser;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class NoticeSyncService {

    private static final int PAGE_SIZE = 1000;
    private static final int MAX_PAGES = 5;

    private final NoticeRepository noticeRepository;
    private final JsonParser jsonParser = new BasicJsonParser();

    @Value("${gg.api.url}")
    private String apiUrl;

    @Value("${gg.api.key}")
    private String apiKey;

    private static final String[] OTHER_CITIES = {
        "수원", "성남", "의정부", "안양", "부천", "광명", "평택", "동두천", "안산", "고양",
        "과천", "구리", "남양주", "오산", "군포", "의왕", "하남", "용인", "파주", "이천",
        "안성", "김포", "화성", "광주", "양주", "포천", "여주", "연천", "가평", "양평"
    };

    // 본문 텍스트 안에 숨어있는 날짜(예: 2026-03-15, 2025.11.01 등) 추출용 정규식
    private static final Pattern DATE_PATTERN = Pattern.compile("(202[3-6])[-./년\\s]+(0?[1-9]|1[0-2])[-./월\\s]+(0?[1-9]|[12][0-9]|3[01])");

    /** API에서 받아 필터를 통과한 공고 1건의 원본 데이터 (postedDate는 실제 날짜를 못 찾으면 null) */
    private record SourceNotice(String id, String title, String dept, String postedDate,
                                String supportType, String url, String cleanContent) {
    }

    /** API 수집 결과. complete가 true일 때만 "API에서 사라진 공고"를 판단할 수 있다. */
    private record FetchResult(Map<String, SourceNotice> notices, boolean complete) {
    }

    public NoticeSyncService(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    /**
     * 공공데이터를 수집해 notices 테이블에 upsert 한다.
     * - 새 공고: INSERT
     * - 기존 공고: 원본 필드만 UPDATE (AI 분석 결과, 번역, 북마크, 행동 로그는 유지)
     * - API에서 사라진 공고: 전체 목록을 끝까지 받았을 때만 DELETE
     *
     * @return API에서 받아 저장(신규+기존)한 공고 수
     */
    @Transactional
    public int fetchAndSaveSiheungNotices() {
        try {
            FetchResult fetched = fetchSiheungNotices();
            if (fetched.notices().isEmpty()) {
                // API 장애 등으로 아무것도 못 받았을 때 기존 데이터를 건드리지 않음
                return 0;
            }

            Map<String, Notice> existingById = noticeRepository.findAll().stream()
                    .collect(Collectors.toMap(Notice::getNoticeId, Function.identity()));

            List<Notice> newNotices = new ArrayList<>();
            int changedCount = 0;

            for (SourceNotice src : fetched.notices().values()) {
                Notice existing = existingById.get(src.id());

                if (existing == null) {
                    String postedDate = src.postedDate() != null ? src.postedDate() : fallbackDate(src.id());
                    newNotices.add(new Notice(src.id(), src.title(), src.dept(), postedDate,
                            src.supportType(), src.url(), src.cleanContent(), false));
                } else {
                    // 실제 날짜가 없으면 기존에 부여한 날짜를 유지 (동기화할 때마다 날짜가 바뀌지 않도록)
                    String postedDate = src.postedDate() != null ? src.postedDate()
                            : existing.getPostedDate() != null ? existing.getPostedDate()
                            : fallbackDate(src.id());

                    // existing은 영속 상태라 변경된 필드만 트랜잭션 커밋 시 자동으로 UPDATE 됨
                    boolean contentChanged = existing.updateSourceFields(src.title(), src.dept(), postedDate,
                            src.supportType(), src.url(), src.cleanContent());
                    if (contentChanged) changedCount++;
                }
            }

            noticeRepository.saveAll(newNotices);

            int deletedCount = 0;
            if (fetched.complete()) {
                List<String> staleIds = existingById.keySet().stream()
                        .filter(id -> !fetched.notices().containsKey(id))
                        .toList();
                if (!staleIds.isEmpty()) {
                    noticeRepository.deleteAllByIdInBatch(staleIds);
                    deletedCount = staleIds.size();
                }
            } else {
                System.out.println("⚠️ 공공데이터 목록을 끝까지 받지 못해 사라진 공고 삭제를 건너뜁니다.");
            }

            System.out.println("🔄 공고 동기화 완료: 신규 " + newNotices.size()
                    + "건, 내용 변경(AI 재분석 대상) " + changedCount
                    + "건, 삭제 " + deletedCount + "건");

            return fetched.notices().size();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * 경기 공공데이터 API를 페이지 단위로 호출해 시흥시/경기도 공통 공고만 모은다. (DB는 건드리지 않음)
     */
    @SuppressWarnings("unchecked")
    private FetchResult fetchSiheungNotices() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

        // 같은 ID가 여러 번 오면 마지막 값 사용
        Map<String, SourceNotice> result = new LinkedHashMap<>();
        long totalCount = -1;   // API가 알려주는 전체 건수 (모르면 -1)
        long fetchedRows = 0;   // 필터 전 실제로 받은 행 수
        boolean reachedLastPage = false;

        for (int page = 1; page <= MAX_PAGES; page++) {
            URI uri = UriComponentsBuilder.fromUriString(apiUrl)
                    .queryParam("KEY", apiKey.trim())
                    .queryParam("Type", "json")
                    .queryParam("pIndex", page)
                    .queryParam("pSize", PAGE_SIZE)
                    .build()
                    .toUri();

            String jsonResponse = restTemplate.getForObject(uri, String.class);
            if (jsonResponse == null || !jsonResponse.contains("PublServcList")) {
                break;
            }

            Map<String, Object> responseMap = jsonParser.parseMap(jsonResponse);
            List<Object> publServcList = (List<Object>) responseMap.get("PublServcList");
            if (publServcList == null || publServcList.size() < 2) {
                break;
            }

            if (totalCount < 0) {
                totalCount = extractTotalCount(publServcList.get(0));
            }

            Map<String, Object> secondElement = (Map<String, Object>) publServcList.get(1);
            List<Map<String, Object>> rows = (List<Map<String, Object>>) secondElement.get("row");
            if (rows == null || rows.isEmpty()) {
                break;
            }
            fetchedRows += rows.size();

            for (Map<String, Object> item : rows) {
                String id = getString(item, "PUBL_SERVC_ID", "");
                if (id.isEmpty()) continue;

                String title = getString(item, "PUBL_SERVC_TITLE", "제목 없음");
                String dept = getString(item, "PUBL_SERVC_JURSDCTN_INST_NM", "경기도");
                String rawDate = getString(item, "LAST_UPD_DE", "");
                String purpsDtcont = getString(item, "PUBL_SERVC_PURPS_DTCONT", "");
                String sportForm = getString(item, "SPORT_FORM_DTLS", "상시지원");
                String detailUrl = getString(item, "PUBL_SERVC_DETAIL_URL", "");

                if (detailUrl.isEmpty()) {
                    detailUrl = getString(item, "PUBL_SERVC_DETAIL_KOR_URL", "");
                }

                boolean isSiheung = dept.contains("시흥") || title.contains("시흥") || purpsDtcont.contains("시흥");
                boolean isOtherCity = isOtherCityNotice(dept, title);
                boolean isGyeonggiCommon = !isOtherCity && (dept.contains("경기") || title.contains("경기") || purpsDtcont.contains("경기도"));

                if (isSiheung || isGyeonggiCommon) {
                    result.put(id, new SourceNotice(
                            id,
                            title,
                            dept,
                            extractDate(rawDate, title + " " + purpsDtcont),
                            sportForm,
                            detailUrl,
                            cleanHtml(purpsDtcont)
                    ));
                }
            }

            if (rows.size() < PAGE_SIZE) {
                reachedLastPage = true;
                break;
            }
        }

        // 전체 건수를 알면 그만큼 받았는지로, 모르면 마지막 페이지(1000건 미만)에 도달했는지로 판단
        boolean complete = totalCount >= 0 ? fetchedRows >= totalCount : reachedLastPage;
        return new FetchResult(result, complete);
    }

    /** 응답의 head 영역에서 list_total_count를 꺼낸다. 형식이 다르면 -1 */
    @SuppressWarnings("unchecked")
    private long extractTotalCount(Object headElement) {
        try {
            List<Map<String, Object>> head = (List<Map<String, Object>>) ((Map<String, Object>) headElement).get("head");
            for (Map<String, Object> h : head) {
                Object count = h.get("list_total_count");
                if (count instanceof Number n) {
                    return n.longValue();
                }
            }
        } catch (Exception ignored) {
            // 형식이 예상과 다르면 전체 건수를 모르는 것으로 처리
        }
        return -1;
    }

    /**
     * 1순위: API의 LAST_UPD_DE 값 사용
     * 2순위: LAST_UPD_DE가 null이면 제목/본문 안에서 날짜 패턴(YYYY-MM-DD) 자동 추출
     * 둘 다 없으면 null (호출하는 쪽에서 기존 날짜 유지 또는 fallbackDate 사용)
     */
    private String extractDate(String rawDate, String textContent) {
        // 1. API 원본에 날짜가 있는 경우
        if (rawDate != null && !rawDate.trim().isEmpty() && !rawDate.equalsIgnoreCase("null")) {
            String digits = rawDate.replaceAll("[^0-9]", "");
            if (digits.length() >= 8) {
                return digits.substring(0, 4) + "-" + digits.substring(4, 6) + "-" + digits.substring(6, 8);
            }
        }

        // 2. 본문이나 제목 텍스트 안에 날짜가 적혀있는 경우 추출
        if (textContent != null) {
            Matcher matcher = DATE_PATTERN.matcher(textContent);
            if (matcher.find()) {
                String year = matcher.group(1);
                String month = String.format("%02d", Integer.parseInt(matcher.group(2)));
                String day = String.format("%02d", Integer.parseInt(matcher.group(3)));
                return year + "-" + month + "-" + day;
            }
        }

        return null;
    }

    /**
     * 3순위: 상시 서비스여서 날짜가 아예 없는 신규 공고는 공고 ID 해시값으로 최근 1~60일 전 날짜를 부여
     * (모두 같은 날짜로 찍히는 현상 방지. 한 번 부여한 날짜는 이후 동기화에서 유지됨)
     */
    private String fallbackDate(String noticeId) {
        int daysAgo = Math.abs(noticeId.hashCode() % 60);
        return LocalDate.now().minusDays(daysAgo).toString();
    }

    private boolean isOtherCityNotice(String dept, String title) {
        for (String city : OTHER_CITIES) {
            if (dept.contains(city) || title.contains(city + "시") || title.contains(city + "군")) {
                return true;
            }
        }
        return false;
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        if (val == null) return defaultValue;
        String str = String.valueOf(val).trim();
        return (str.isEmpty() || str.equalsIgnoreCase("null")) ? defaultValue : str;
    }

    private String cleanHtml(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        return cleaned.length() > 1500 ? cleaned.substring(0, 1500) : cleaned;
    }
}
