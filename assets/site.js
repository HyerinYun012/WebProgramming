/* 시흥쏙쏙 – interactive single-page search flow */
(function () {
  'use strict';

  const I = window.SI;
  const C = window.SC;
  const D = window.SDATA;
  const root = document.getElementById('root');

  if (!I || !C || !D || !root) return;

  const EXTRA_RESULTS = [
    {status:'open',tags:['청년','취업'],title:'시흥시 청년 면접정장 무료 대여 사업',img:'정장 대여 매장',target:'만 19세 ~ 34세 구직 청년',period:'2024.01.02. ~ 2024.12.31.',benefit:'면접 정장 연 3회 무료 대여',dday:'D-47',org:'청년청소년과'},
    {status:'soon',tags:['청년','문화'],title:'시흥 청년 버스킹 페스티벌 참가팀 모집',img:'야외 버스킹 공연',target:'시흥시 거주·활동 청년 예술인',period:'2024.11.18. ~ 2024.12.06.',benefit:'공연비 지원, 무대·음향 제공',dday:'오픈 D-4',org:'문화예술과'},
    {status:'open',tags:['청년','교육'],title:'시흥시 청년 금융 교육 아카데미',img:'금융 교육 강의실',target:'시흥시 거주 청년 (만 19세 ~ 39세)',period:'2024.11.01. ~ 2024.11.28.',benefit:'재무 상담, 자산 관리 교육 등',dday:'D-14',org:'청년청소년과'}
  ];

  const ALL_RESULTS = D.results.concat(EXTRA_RESULTS);
  const DEFAULT_RECENT = ['한국어 교육', '소상공인 지원금', '가족 체험 행사'];
  const POPULAR = ['청년 월세', '외국인 통역', '소상공인 지원금', '한국어 교육', '가족 체험', '어르신 디지털', '공공근로', '갯골축제'];
  const STATUS_ORDER = ['all', 'open', 'closing', 'soon', 'closed'];
  const FILTERS = {
    age: {label:'나이', icon:I.user, options:[['','전체'],['19 ~ 34세','19 ~ 34세'],['35 ~ 64세','35 ~ 64세'],['65세 이상','65세 이상']]},
    nat: {label:'국적', icon:I.globe, options:[['','전체'],['내국인','내국인'],['외국인','외국인'],['다문화 가족','다문화 가족']]},
    cat: {label:'카테고리', icon:I.grid, options:[['','전체'],['취업,교육,문화','취업 · 교육 · 문화'],['취업','취업'],['교육','교육'],['문화','문화'],['생활지원','생활지원'],['환경','환경']]},
    reg: {label:'지역', icon:I.pin, options:[['','전체'],['정왕동','정왕동'],['배곧동','배곧동'],['대야동','대야동'],['장현동','장현동']]}
  };

  const state = {
    screen: 'home',
    previousScreen: 'home',
    detailItem: null,
    query: '',
    draft: '',
    searchOpen: false,
    view: 'grid',
    sort: 'latest',
    status: 'all',
    filters: {age:'', nat:'', cat:'', reg:''}
  };

  let recent = loadRecent();
  let isComposing = false;

  function loadRecent() {
    try {
      const saved = JSON.parse(localStorage.getItem('siheung-recent-searches'));
      return Array.isArray(saved) && saved.length ? saved.slice(0, 5) : DEFAULT_RECENT.slice();
    } catch (_) {
      return DEFAULT_RECENT.slice();
    }
  }

  function saveRecent() {
    try { localStorage.setItem('siheung-recent-searches', JSON.stringify(recent)); } catch (_) {}
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];
    });
  }

  function encoded(value) {
    return encodeURIComponent(value);
  }

  function decoded(value) {
    try { return decodeURIComponent(value); } catch (_) { return value; }
  }

  function highlight(text, keyword) {
    const safeText = escapeHTML(text);
    const safeKeyword = escapeHTML(keyword.trim());
    if (!safeKeyword) return safeText;
    const pattern = safeKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safeText.replace(new RegExp(pattern, 'gi'), '<mark>$&</mark>');
  }

  function renderSearchBox() {
    const q = escapeHTML(state.draft);
    return `
      <div class="search ${state.searchOpen ? 'is-open' : ''}">
        <form class="search-box interactive-search" id="search-form" role="search">
          <span class="ic" aria-hidden="true">${I.search}</span>
          <input id="global-search" name="q" value="${q}" placeholder="관심 있는 지원사업, 행사, 교육을 검색해 보세요" autocomplete="off" aria-label="통합검색" aria-expanded="${state.searchOpen}" aria-controls="search-suggestions">
          ${state.draft ? `<button class="clear" id="clear-search" type="button" aria-label="검색어 지우기">${I.x}</button>` : ''}
          <button class="go" type="submit">검색</button>
        </form>
        ${state.searchOpen ? renderAutocomplete() : ''}
      </div>`;
  }

  function renderAutocomplete() {
    if (!state.draft.trim()) {
      return `<div class="ac" id="search-suggestions" role="dialog" aria-label="최근 검색어와 인기 검색어">
        <div class="ac-sec">
          <div class="ac-title">최근 검색어 <button type="button" id="clear-recent">전체 삭제</button></div>
          ${recent.length ? recent.map(function (keyword) {
            return `<div class="ac-row recent-row">
              <button class="ac-row-main" type="button" data-search-value="${encoded(keyword)}"><span class="row-icon">${I.clock}</span><span>${escapeHTML(keyword)}</span></button>
              <button class="row-remove" type="button" data-remove-recent="${encoded(keyword)}" aria-label="${escapeHTML(keyword)} 삭제">${I.x}</button>
            </div>`;
          }).join('') : '<div class="ac-empty">최근 검색어가 없습니다.</div>'}
        </div>
        <div class="ac-sec">
          <div class="ac-title">지금 많이 찾는 검색어</div>
          <div class="popular-grid">
            ${POPULAR.map(function (keyword, index) {
              return `<button class="ac-row" type="button" data-search-value="${encoded(keyword)}"><b class="rank ${index < 3 ? 'top' : ''}">${index + 1}</b><span>${escapeHTML(keyword)}</span>${index < 3 ? `<span class="meta trend">${I.trend}</span>` : ''}</button>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    }

    const keyword = state.draft.trim();
    const suggestions = buildSuggestions(keyword);
    const direct = ALL_RESULTS.filter(function (item) { return itemMatches(item, keyword); }).slice(0, 2);
    return `<div class="ac" id="search-suggestions" role="listbox" aria-label="추천 검색어">
      <div class="ac-sec">
        <div class="ac-title">추천 검색어</div>
        ${suggestions.map(function (item, index) {
          return `<button class="ac-row ${index === 0 ? 'on' : ''}" type="button" data-search-value="${encoded(item.label)}" role="option" aria-selected="${index === 0}">
            <span class="row-icon">${I.search.replace(/24/g, '18')}</span><span>${highlight(item.label, keyword)}</span><span class="meta">${item.count}건</span>
          </button>`;
        }).join('')}
      </div>
      ${direct.length ? `<div class="ac-sec">
        <div class="ac-title">바로가기 공고</div>
        ${direct.map(function (item) {
          return `<button class="ac-row" type="button" data-search-value="${encoded(keyword)}">${C.status(item.status)}<span>${highlight(item.title, keyword)}</span><span class="meta">${escapeHTML(item.dday)}</span></button>`;
        }).join('')}
      </div>` : ''}
      <div class="ac-help"><span>↑↓ 키로 이동 · Enter로 검색</span><button type="button" id="close-autocomplete">자동완성 닫기</button></div>
    </div>`;
  }

  function buildSuggestions(keyword) {
    if (keyword.indexOf('청년') !== -1) {
      return [
        {label:'청년 월세 지원', count:12},
        {label:'청년 취업역량 강화 프로그램', count:8},
        {label:'청년 문화 프로그램', count:6},
        {label:'청년 창업 지원사업', count:5},
        {label:'시흥시 청년센터 행사', count:4}
      ];
    }
    const suffixes = ['지원사업', '교육 프로그램', '문화 행사', '생활지원 안내', '참여자 모집'];
    return suffixes.map(function (suffix, index) {
      return {label: keyword + ' ' + suffix, count: Math.max(2, 10 - index * 2)};
    });
  }

  function renderHero(compact) {
    return `<section class="hero ${compact ? 'compact' : 'tall'} ${state.searchOpen ? 'search-active' : ''}">${C.heroDeco()}
      <div class="hero-inner">
        <h1><em>시흥시</em>의 다양한 공공사업과 소식을 찾아보세요.</h1>
        <p class="sub">시민을 위한 지원사업, 문화행사, 교육프로그램 등 유용한 정보를 한 번에 검색할 수 있습니다.</p>
        ${renderSearchBox()}
        ${compact ? '' : `<div class="hot-keywords"><span class="lbl">인기 검색어</span>${POPULAR.slice(0, 5).map(function (keyword) { return `<button class="kw" type="button" data-search-value="${encoded(keyword)}"># ${escapeHTML(keyword)}</button>`; }).join('')}</div>`}
      </div>
    </section>`;
  }

  function renderFilterBar() {
    return `<form class="filterbar filterbar-interactive" id="filter-form" aria-label="검색 결과 필터">
      ${Object.keys(FILTERS).map(function (key) {
        const filter = FILTERS[key];
        const value = state.filters[key];
        return `<label class="fb-item" for="filter-${key}">
          <span class="fb-label">${filter.icon}${filter.label}</span>
          <span class="select filter-select ${value ? 'active' : ''}">
            <select id="filter-${key}" data-filter="${key}" aria-label="${filter.label} 필터">
              ${filter.options.map(function (option) { return `<option value="${escapeHTML(option[0])}" ${option[0] === value ? 'selected' : ''}>${escapeHTML(option[1])}</option>`; }).join('')}
            </select>${I.chev}
          </span>
        </label>`;
      }).join('')}
      <button class="fb-reset" id="reset-filters" type="button">${I.reset}초기화</button>
    </form>`;
  }

  function activeFilterCount() {
    return Object.keys(state.filters).filter(function (key) { return state.filters[key]; }).length;
  }

  function renderAppliedFilters() {
    if (!activeFilterCount()) return '';
    const chips = [];
    if (state.filters.age) chips.push({key:'age', label:'나이 : ' + state.filters.age});
    if (state.filters.nat) chips.push({key:'nat', label:'국적 : ' + state.filters.nat});
    if (state.filters.cat) state.filters.cat.split(',').forEach(function (category) { chips.push({key:'cat', label:category}); });
    if (state.filters.reg) chips.push({key:'reg', label:'지역 : ' + state.filters.reg});
    return `<div class="applied"><span class="lbl">적용된 필터</span>
      ${chips.map(function (chip) { return `<button class="fchip" type="button" data-clear-filter="${chip.key}">${escapeHTML(chip.label)}${I.x}</button>`; }).join('')}
      <button class="clear-all" id="clear-all-filters" type="button">전체 해제</button>
    </div>`;
  }

  function itemMatches(item, query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized || normalized === '시흥' || normalized === '시흥시') return true;
    const haystack = [item.title, item.target, item.period, item.benefit, item.org].concat(item.tags).join(' ').toLowerCase();
    return normalized.split(/\s+/).filter(Boolean).some(function (token) { return haystack.indexOf(token) !== -1; });
  }

  function filteredResults() {
    let items = ALL_RESULTS.filter(function (item) { return itemMatches(item, state.query); });
    const f = state.filters;
    if (f.age === '19 ~ 34세') items = items.filter(function (item) { return /청년|19세|34세/.test([item.title, item.target].join(' ')); });
    if (f.age === '65세 이상') items = items.filter(function (item) { return /어르신|65세/.test([item.title, item.target].join(' ')); });
    if (f.nat === '외국인') items = items.filter(function (item) { return /외국인/.test([item.title, item.target].concat(item.tags).join(' ')); });
    if (f.nat === '다문화 가족') items = items.filter(function (item) { return /다문화/.test([item.title, item.target].concat(item.tags).join(' ')); });
    if (f.cat) {
      const allowed = f.cat.split(',');
      items = items.filter(function (item) { return item.tags.some(function (tag) { return allowed.indexOf(tag) !== -1; }); });
    }
    if (state.status !== 'all') items = items.filter(function (item) { return item.status === state.status; });
    if (state.sort === 'deadline') {
      items = items.slice().sort(function (a, b) { return deadlineNumber(a.dday) - deadlineNumber(b.dday); });
    } else if (state.sort === 'popular') {
      items = items.slice().reverse();
    }
    return items;
  }

  function deadlineNumber(value) {
    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : 999;
  }

  function totalCount(items) {
    if (!items.length) return 0;
    if (/청년/.test(state.query)) return activeFilterCount() ? 18 : 18;
    if (/시흥/.test(state.query) || !state.query) return activeFilterCount() ? 36 : 124;
    const known = {'외국인 통역':21, '소상공인 지원금':17, '한국어 교육':14, '가족 체험':22};
    const key = Object.keys(known).find(function (name) { return state.query.indexOf(name) !== -1; });
    return key ? known[key] : items.length;
  }

  function statusCounts(total, unfilteredItems) {
    if (total === 124) return [124, 86, 9, 12, 17];
    if (total === 18) return [18, 12, 2, 3, 1];
    const values = STATUS_ORDER.slice(1).map(function (status) { return unfilteredItems.filter(function (item) { return item.status === status; }).length; });
    return [unfilteredItems.length].concat(values);
  }

  function renderResultsToolbar(count) {
    return `<div class="res-bar">
      <div class="count">검색 결과 <b>${count}</b>건${activeFilterCount() ? `<small>‘${escapeHTML(state.query)}’ · 필터 ${activeFilterCount()}개 적용</small>` : ''}</div>
      <div class="res-tools">
        <label class="sort"><span class="sr-only">정렬</span><select id="sort-results" aria-label="검색 결과 정렬">
          <option value="latest" ${state.sort === 'latest' ? 'selected' : ''}>최신순</option>
          <option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>인기순</option>
          <option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>마감순</option>
        </select>${I.chev}</label>
        <div class="view-toggle" role="group" aria-label="검색 결과 보기 방식">
          <button class="${state.view === 'grid' ? 'on' : ''}" type="button" data-view="grid" aria-label="카드형 보기" aria-pressed="${state.view === 'grid'}">${I.gridS}</button>
          <button class="${state.view === 'list' ? 'on' : ''}" type="button" data-view="list" aria-label="리스트형 보기" aria-pressed="${state.view === 'list'}">${I.list}</button>
        </div>
      </div>
    </div>`;
  }

  function renderStatusTabs(counts) {
    const labels = ['전체','모집중','마감임박','접수예정','마감'];
    return `<div class="status-tabs" role="tablist">${labels.map(function (label, index) {
      const status = STATUS_ORDER[index];
      return `<button class="${state.status === status ? 'on' : ''}" type="button" data-status="${status}" role="tab" aria-selected="${state.status === status}">${label} <small>${counts[index]}</small></button>`;
    }).join('')}</div>`;
  }

  function renderEmpty() {
    const query = state.query || '선택한 조건';
    return `<div class="empty">
      <div class="icon">${I.emptyS}</div>
      <h3>‘<em>${escapeHTML(query)}</em>’에 대한 검색 결과가 없어요</h3>
      <p>현재 진행 중인 공고가 없거나, 다른 표현으로 등록되어 있을 수 있어요.</p>
      <ul><li>단어의 철자가 정확한지 확인해 주세요.</li><li>‘드론’, ‘자격증’처럼 더 짧은 검색어로 검색해 보세요.</li><li>선택된 필터를 해제해 보세요.</li></ul>
      <div class="kws"><span class="empty-kws-label">이 검색어는 어떠세요?</span>${['자격증','직업훈련','청년 취업','국민내일배움카드'].map(function (keyword) { return `<button class="kw" type="button" data-search-value="${encoded(keyword)}"># ${keyword}</button>`; }).join('')}</div>
      <div class="empty-actions"><button class="btn btn-line" id="empty-reset" type="button">${I.reset} 필터 초기화</button><button class="btn btn-primary" type="button">${I.bell} 관련 공고 알림 받기</button></div>
    </div>`;
  }

  function normalizeDetail(item) {
    return Object.assign({
      status:'open', tags:['문화'], img:'공고 대표 이미지', target:'시흥시민 누구나',
      period:'상시 모집', benefit:'상세 공고 내용을 확인해 주세요.', dday:'D-12', org:'시흥시 담당부서'
    }, item || D.results[0]);
  }

  function renderDetailPage() {
    const d = normalizeDetail(state.detailItem);
    const related = ALL_RESULTS.filter(function (item) { return item.title !== d.title; }).slice(0, 3);
    const deadlineLabel = d.dday === '마감' ? '접수 마감' : `마감까지 ${d.dday}`;
    return `${C.header(2)}
      <main class="container detail-page">
        <nav class="crumb" aria-label="현재 위치">${I.home}<a href="index.html">홈</a>›<button type="button" data-back-results>검색 결과 ‘${escapeHTML(state.query || '시흥')}’</button>›<b>공고 상세</b></nav>
        <div class="detail">
          <div>
            <div class="d-head">
              <div class="tags">${C.status(d.status)}${d.tags.map(C.tag).join('')}</div>
              <h1>${escapeHTML(d.title)}</h1>
              <div class="org"><span>담당 : ${escapeHTML(d.org)}</span><span>등록일 : 2024.10.28.</span><span>조회 1,284</span></div>
            </div>
            ${C.ph(d.tags[0],d.img,'').replace('class="ph ','class="ph d-hero ')}
            <section class="d-sec detail-intro"><h3>사업 개요</h3>
              <p>${escapeHTML(d.benefit)}을 중심으로 시민에게 필요한 정보와 참여 기회를 제공하는 시흥시 공공사업입니다. 신청 대상과 기간을 확인한 뒤 온라인으로 간편하게 신청할 수 있습니다.</p>
            </section>
            <section class="d-sec"><h3>지원 내용</h3>
              <div class="d-table"><div>참여 대상</div><div>${escapeHTML(d.target)}</div><div>모집 인원</div><div>40명 (선착순)</div><div>신청 기간</div><div>${escapeHTML(d.period)}</div><div>운영 기간</div><div>선정자에게 개별 안내</div><div>지원 내용</div><div>${escapeHTML(d.benefit)}</div><div>참가비</div><div>무료</div><div>장소</div><div>시흥시 관내 지정 장소</div></div>
            </section>
            <section class="d-sec"><h3>신청 방법</h3>
              <div class="steps">${[['온라인 신청','시흥쏙쏙에서 신청서 작성'],['서류 확인','자격 요건 확인 (3일 이내)'],['선정 안내','문자 · 이메일로 개별 안내'],['사업 참여','안내된 일정에 맞춰 참여']].map(function (step, index) { return `<div class="step"><div class="n">STEP 0${index + 1}</div><div class="t">${step[0]}</div><div class="s">${step[1]}</div></div>`; }).join('')}</div>
            </section>
            <section class="d-sec"><h3>첨부파일</h3>
              <div class="files"><a href="#">${I.file}공고문_상세안내.hwp<span class="sz">128KB</span></a><a href="#">${I.file}참가신청서_양식.pdf<span class="sz">64KB</span></a></div>
            </section>
          </div>
          <aside class="side-card">
            <span class="dday">${escapeHTML(deadlineLabel)}</span>
            <div class="big">${escapeHTML(d.title.replace('시흥시 ',''))}</div>
            ${C.infoRows(d)}
            <div class="progress"><i style="width:72%"></i></div>
            <div class="pl"><span>신청 현황 29 / 40명</span><span>72%</span></div>
            <div class="acts"><button class="btn btn-primary" type="button">신청하기</button><button class="btn btn-line" type="button" aria-label="관심 공고 저장">${I.heart}</button><button class="btn btn-line" type="button" aria-label="공고 공유">${I.share}</button></div>
            <div class="side-note">문의 : ${escapeHTML(d.org)}<br>031-310-0000 (평일 09:00 ~ 18:00)</div>
          </aside>
        </div>
      </main>
      <section class="sec related-section">
        <div class="sec-head"><div><h2>함께 보면 좋은 공고</h2></div><button class="more" type="button" data-back-results>전체 보기 ${I.arrow}</button></div>
        <div class="res-grid">${related.map(C.hcard).join('')}</div>
      </section>
      ${C.footer()}`;
  }

  function renderResultsPage() {
    const allForQuery = ALL_RESULTS.filter(function (item) { return itemMatches(item, state.query); });
    const items = filteredResults();
    const total = totalCount(items);
    const counts = statusCounts(total, allForQuery);
    const selectedCount = state.status === 'all' ? total : counts[STATUS_ORDER.indexOf(state.status)];
    return `${C.header(-1)}
      ${state.searchOpen ? '<button class="search-overlay" id="search-overlay" type="button" aria-label="검색 제안 닫기"></button>' : ''}
      ${renderHero(true)}
      ${renderFilterBar()}
      ${renderAppliedFilters()}
      <section class="sec recommendation-section">${C.reco()}</section>
      <section class="sec results-section">
        ${renderResultsToolbar(selectedCount)}
        ${renderStatusTabs(counts)}
        ${items.length ? (state.view === 'grid' ? `<div class="res-grid">${items.map(C.hcard).join('')}</div>` : `<div class="res-list">${items.map(C.lrow).join('')}</div>`) : renderEmpty()}
        ${items.length ? C.pager() : ''}
      </section>
      ${C.footer()}`;
  }

  function renderHomePage() {
    const quick = [['청년','#E6EFFF','#2F6BF0',38],['외국인','#E7F7EC','#16A34A',21],['다문화','#E2F6F3','#0E9488',14],['소상공인','#FFF3DF','#E58A00',17],['가족','#FDEAF3','#D9468F',22],['어르신','#FFF3DF','#C2410C',12],['교육','#F1EAFF','#7C4DDB',29],['문화 · 행사','#F1EAFF','#7C4DDB',33]];
    const persona = [
      ['청년이라면','취업·주거·문화 지원 한눈에','#E6EFFF','#1747B5',38,'청년'],
      ['외국인 주민이라면','생활·통역·행정 안내','#E7F7EC','#0F6B33',21,'외국인'],
      ['어르신이라면','건강·디지털·돌봄 서비스','#FFF3DF','#8A4B00',12,'어르신'],
      ['사장님이라면','소상공인 경영·시설 지원','#F1EAFF','#4B2A9A',17,'소상공인']
    ];
    const deadline = [D.results[2], D.results[7], D.results[0], D.results[3]];
    return `${C.header(-1)}
      ${state.searchOpen ? '<button class="search-overlay" id="search-overlay" type="button" aria-label="검색 제안 닫기"></button>' : ''}
      ${renderHero(false)}
      ${renderFilterBar()}

      <section class="sec home-section">
        <div class="sec-head"><div><h2>분야별로 찾아보기</h2><div class="desc">관심 있는 분야를 선택하면 관련 공고만 모아서 보여드려요.</div></div></div>
        <div class="quick">${quick.map(function (item) { return `<a href="#" data-search-value="${encoded(item[0].replace(' · 행사',''))}"><span class="qi" style="background:${item[1]};color:${item[2]}">${I.grid.replace('width="20" height="20"','width="26" height="26"')}</span>${item[0]}<small>${item[3]}건</small></a>`; }).join('')}</div>
      </section>

      <section class="sec home-block">
        <div class="sec-head"><div><h2>나에게 맞는 지원, <em>쏙쏙</em> 골라봤어요</h2><div class="desc">로그인하면 연령·국적·관심사에 맞춰 자동으로 추천해 드려요.</div></div><a class="more" href="#">맞춤 설정 ${I.arrow}</a></div>
        <div class="persona">${persona.map(function (item) { return `<a href="#" data-search-value="${encoded(item[5])}" style="background:${item[2]};color:${item[3]}"><h5>${item[0]}</h5><p>${item[1]}</p><span class="n">${item[4]}개 공고 보기 ${I.arrow}</span>${C.ph(item[5],'일러스트')}</a>`; }).join('')}</div>
      </section>

      <section class="sec home-block">
        <div class="sec-head"><div><h2>곧 마감되는 공고</h2><div class="desc">놓치기 전에 확인하세요.</div></div><a class="more" href="#" data-search-value="${encoded('시흥')}">전체 보기 ${I.arrow}</a></div>
        <div class="deadline-grid">${deadline.map(function (item) { return `<article class="dcard" data-detail="${encoded(item.title)}" role="button" tabindex="0" aria-label="${item.title} 상세 보기">${C.ph(item.tags[0],item.img,C.status(item.status))}<div class="b"><div class="tags">${item.tags.map(C.tag).join('')}</div><h4>${item.title.replace('시흥시 ','')}</h4><div class="row"><span>${item.org}</span><b>${item.dday}</b></div></div></article>`; }).join('')}</div>
      </section>

      <section class="sec two-col home-block">
        <div class="box"><div class="box-head"><h3>공고 · 알림</h3><div class="notice-tabs"><span class="on">전체</span><span>공고</span><span>고시</span><span>보도자료</span></div></div>
          ${[['공고','2025년 시흥시 청년 창업 지원사업 참여기업 모집 공고',1,'11.14'],['고시','시흥시 도시관리계획(공원) 결정 변경 고시',1,'11.14'],['공고','2024년 하반기 시흥시 공공근로사업 참여자 모집',0,'11.12'],['보도','시흥시, 외국인 주민 통역 서비스 7개 언어로 확대',0,'11.11'],['공고','시흥 갯골축제 자원봉사자 모집 결과 안내',0,'11.08'],['공고','2024년 소상공인 시설개선 지원사업 2차 공고',0,'11.06']].map(function (item) { return `<div class="nrow"><span class="cat">${item[0]}</span><span class="t">${item[1]}</span>${item[2] ? '<span class="new">N</span>' : ''}<span class="d">2024.${item[3]}</span></div>`; }).join('')}
        </div>
        <div class="box"><div class="box-head"><h3>이번 주 행사</h3><a class="more" href="#">${I.cal} 달력</a></div>
          <div class="cal-week">${[['월',11,1],['화',12,0],['수',13,1],['목',14,1],['금',15,1],['토',16,1],['일',17,0]].map(function (item, index) { return `<div class="${index === 3 ? 'on' : ''}">${item[0]}<b>${item[1]}</b>${item[2] ? '<span class="dot"></span>' : '<span style="height:4px"></span>'}</div>`; }).join('')}</div>
          ${[['10:00','청년 취업 특강 : 면접의 기술','시흥시 청년센터'],['14:00','다문화 가족 요리 교실','다문화가족지원센터'],['19:00','시흥 시민 오케스트라 정기공연','시흥ABC행복학습타운']].map(function (item) { return `<div class="ev"><span class="time">${item[0]}</span><div><div class="t">${item[1]}</div><div class="p">${I.pin.replace(/20/g,'14')}${item[2]}</div></div></div>`; }).join('')}
        </div>
      </section>

      <section class="sec home-block"><div class="banner"><div class="ring banner-ring-one"></div><div class="ring banner-ring-two"></div><div><h3>새 공고가 올라오면 바로 알려드릴게요</h3><p>관심 분야를 등록하면 카카오톡·문자로 맞춤 공고 알림을 보내드려요.</p></div><button class="btn" type="button">${I.bell} 알림 신청하기</button></div></section>
      ${C.footer()}`;
  }

  function runSearch(value) {
    const query = String(value || '').trim();
    if (!query) return;
    state.query = query;
    state.draft = query;
    state.screen = 'results';
    state.searchOpen = false;
    state.status = 'all';
    recent = [query].concat(recent.filter(function (item) { return item !== query; })).slice(0, 5);
    saveRecent();
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function openDetail(title) {
    const item = ALL_RESULTS.concat(D.reco).find(function (entry) { return entry.title === title; });
    if (!item) return;
    if (state.screen !== 'detail') state.previousScreen = state.screen;
    state.detailItem = normalizeDetail(item);
    state.screen = 'detail';
    state.searchOpen = false;
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function closeDetail() {
    state.screen = state.previousScreen === 'home' ? 'home' : 'results';
    state.detailItem = null;
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function bindEvents() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('global-search');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!isComposing) runSearch(state.draft);
    });
    if (input) {
      input.addEventListener('focus', function () {
        if (!state.searchOpen) { state.searchOpen = true; render(true); }
      });
      input.addEventListener('compositionstart', function () { isComposing = true; });
      input.addEventListener('input', function (event) {
        state.draft = event.target.value;
        state.searchOpen = true;
        if (isComposing || event.isComposing) return;
        render(true);
      });
      input.addEventListener('compositionend', function (event) {
        isComposing = false;
        state.draft = event.target.value;
        state.searchOpen = true;
        render(true);
      });
      input.addEventListener('keydown', function (event) {
        if (isComposing || event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape') { state.searchOpen = false; render(); }
      });
    }

    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) clearSearch.addEventListener('click', function () { state.draft = ''; state.searchOpen = true; render(true); });
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.addEventListener('click', function () { state.searchOpen = false; render(); });
    const closeAutocomplete = document.getElementById('close-autocomplete');
    if (closeAutocomplete) closeAutocomplete.addEventListener('click', function () { state.searchOpen = false; render(); });

    document.querySelectorAll('[data-search-value]').forEach(function (button) {
      button.addEventListener('click', function (event) { event.preventDefault(); runSearch(decoded(button.dataset.searchValue)); });
    });
    document.querySelectorAll('[data-detail]').forEach(function (card) {
      card.addEventListener('click', function () { openDetail(decoded(card.dataset.detail)); });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetail(decoded(card.dataset.detail));
        }
      });
    });
    document.querySelectorAll('[data-back-results]').forEach(function (button) {
      button.addEventListener('click', closeDetail);
    });
    document.querySelectorAll('[data-remove-recent]').forEach(function (button) {
      button.addEventListener('click', function () {
        const keyword = decoded(button.dataset.removeRecent);
        recent = recent.filter(function (item) { return item !== keyword; });
        saveRecent();
        render(true);
      });
    });
    const clearRecent = document.getElementById('clear-recent');
    if (clearRecent) clearRecent.addEventListener('click', function () { recent = []; saveRecent(); render(true); });

    document.querySelectorAll('[data-filter]').forEach(function (select) {
      select.addEventListener('change', function () {
        state.filters[select.dataset.filter] = select.value;
        if (state.screen === 'home') {
          state.screen = 'results';
          state.query = state.draft.trim() || '시흥';
          state.draft = state.query;
        }
        state.status = 'all';
        render();
      });
    });
    const resetFilters = document.getElementById('reset-filters');
    if (resetFilters) resetFilters.addEventListener('click', resetAllFilters);
    const clearAll = document.getElementById('clear-all-filters');
    if (clearAll) clearAll.addEventListener('click', resetAllFilters);
    const emptyReset = document.getElementById('empty-reset');
    if (emptyReset) emptyReset.addEventListener('click', resetAllFilters);
    document.querySelectorAll('[data-clear-filter]').forEach(function (button) {
      button.addEventListener('click', function () { state.filters[button.dataset.clearFilter] = ''; state.status = 'all'; render(); });
    });

    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () { state.view = button.dataset.view; render(); });
    });
    document.querySelectorAll('[data-status]').forEach(function (button) {
      button.addEventListener('click', function () { state.status = button.dataset.status; render(); });
    });
    const sort = document.getElementById('sort-results');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; render(); });

    document.querySelectorAll('a[href="#"]:not([data-search-value])').forEach(function (link) {
      link.addEventListener('click', function (event) { event.preventDefault(); });
    });
  }

  function resetAllFilters() {
    state.filters = {age:'', nat:'', cat:'', reg:''};
    state.status = 'all';
    render();
  }

  function render(restoreFocus) {
    root.innerHTML = state.screen === 'home' ? renderHomePage() : state.screen === 'detail' ? renderDetailPage() : renderResultsPage();
    document.title = state.screen === 'home'
      ? '시흥쏙쏙 | 공공사업 통합검색'
      : state.screen === 'detail'
        ? `${state.detailItem ? state.detailItem.title : '공고 상세'} | 시흥쏙쏙`
        : `${state.query} 검색 결과 | 시흥쏙쏙`;
    bindEvents();
    if (restoreFocus && state.searchOpen) {
      requestAnimationFrame(function () {
        const input = document.getElementById('global-search');
        if (!input) return;
        try { input.focus({preventScroll:true}); } catch (_) { input.focus(); }
        const end = input.value.length;
        input.setSelectionRange(end, end);
      });
    }
  }

  render();
})();
