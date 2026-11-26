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
  // 필터 검색값 유지 및 번역 키 연결
  const FILTERS = {
      age: {
          label: 'age',
          icon: I.user,
          options: [
              ['', 'all'],
              ['19 ~ 34세', 'ageYoung'],
              ['35 ~ 64세', 'ageAdult'],
              ['65세 이상', 'ageSenior']
          ]
      },
      nat: {
          label: 'nationality',
          icon: I.globe,
          options: [
              ['', 'all'],
              ['내국인', 'domesticResident'],
              ['외국인', 'foreigner'],
              ['다문화 가족', 'multiculturalFamily']
          ]
      },
      cat: {
          label: 'category',
          icon: I.grid,
          options: [
              ['', 'all'],
              ['취업,교육,문화', 'employmentEducationCulture'],
              ['취업', 'employment'],
              ['교육', 'education'],
              ['문화', 'cultureOnly'],
              ['생활지원', 'livingSupport'],
              ['환경', 'environment']
          ]
      },
      reg: {
          label: 'region',
          icon: I.pin,
          options: [
              ['', 'all'],
              ['정왕동', 'jeongwang'],
              ['배곧동', 'baegot'],
              ['대야동', 'daeya'],
              ['장현동', 'janghyeon']
          ]
      }
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

  // 검색창 및 접근성 안내 문구 다국어 적용
  function renderSearchBox() {
      const q = escapeHTML(state.draft);

      return `
        <div class="search ${state.searchOpen ? 'is-open' : ''}">
          <form class="search-box interactive-search" id="search-form" role="search">
            <span class="ic" aria-hidden="true">${I.search}</span>
            <input id="global-search" name="q" value="${q}" placeholder="${escapeHTML(translate('searchPlaceholder'))}" autocomplete="off" aria-label="${escapeHTML(translate('integratedSearch'))}" aria-expanded="${state.searchOpen}" aria-controls="search-suggestions">
            ${state.draft ? `<button class="clear" id="clear-search" type="button" aria-label="${escapeHTML(translate('clearSearch'))}">${I.x}</button>` : ''}
            <button class="go" type="submit">${escapeHTML(translate('search'))}</button>
          </form>
          ${state.searchOpen ? renderAutocomplete() : ''}
        </div>`;
  }

  // 최근 검색어 및 자동완성 고정 문구 다국어 적용
  function renderAutocomplete() {
    if (!state.draft.trim()) {
		return `<div class="ac" id="search-suggestions" role="dialog" aria-label="${escapeHTML(translate('recentAndPopularSearches'))}">
		      <div class="ac-sec">
		        <div class="ac-title">${translate('recentSearches')} <button type="button" id="clear-recent">${translate('clearAll')}</button></div>
          ${recent.length ? recent.map(function (keyword) {
            return `<div class="ac-row recent-row">
              <button class="ac-row-main" type="button" data-search-value="${encoded(keyword)}"><span class="row-icon">${I.clock}</span><span>${escapeHTML(keyword)}</span></button>
              <button class="row-remove" type="button" data-remove-recent="${encoded(keyword)}" aria-label="${escapeHTML(keyword)} ${escapeHTML(translate('delete'))}">${I.x}</button>
            </div>`;
          }).join('') : `<div class="ac-empty">${escapeHTML(translate('noRecentSearches'))}</div>`}
        </div>
        <div class="ac-sec">
          <div class="ac-title">${translate('popularSearches')}</div>
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
    return `<div class="ac" id="search-suggestions" role="listbox" aria-label="${escapeHTML(translate('recommendedSearches'))}">
      <div class="ac-sec">
       <div class="ac-title">${translate('recommendedSearches')}</div>
        ${suggestions.map(function (item, index) {
          return `<button class="ac-row ${index === 0 ? 'on' : ''}" type="button" data-search-value="${encoded(item.label)}" role="option" aria-selected="${index === 0}">
            <span class="row-icon">${I.search.replace(/24/g, '18')}</span><span>${highlight(item.label, keyword)}</span><span class="meta">${item.count}${translate('countUnit')}</span>
          </button>`;
        }).join('')}
      </div>
      ${direct.length ? `<div class="ac-sec">
        <div class="ac-title">${translate('directAnnouncements')}</div>
        ${direct.map(function (item) {
          return `<button class="ac-row" type="button" data-search-value="${encoded(keyword)}">${C.status(item.status)}<span>${highlight(item.title, keyword)}</span><span class="meta">${escapeHTML(item.dday)}</span></button>`;
        }).join('')}
      </div>` : ''}
      <div class="ac-help"><span>${translate('autocompleteHelp')}</span><button type="button" id="close-autocomplete">${translate('closeAutocomplete')}</button></div>
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
	  <!-- 언어별 문장 어순 및 도시명 강조 디자인 유지 -->
	  <h1>${escapeHTML(translate('heroTitle', {city: '{city}'})).replace('{city}', function () {
	      return `<em>${escapeHTML(translate('cityName'))}</em>`;
	  })}</h1>
	  <p class="sub">${translate('heroDescription')}</p>
        ${renderSearchBox()}
        ${compact ? '' : `<div class="hot-keywords"><span class="lbl">${translate('popularSearches')}</span>${POPULAR.slice(0, 5).map(function (keyword) { return `<button class="kw" type="button" data-search-value="${encoded(keyword)}"># ${escapeHTML(keyword)}</button>`; }).join('')}</div>`}
      </div>
    </section>`;
  }

  // 검색 필터 화면 다국어 적용
  function renderFilterBar() {
      return `<form class="filterbar filterbar-interactive" id="filter-form" aria-label="${escapeHTML(translate('searchResultFilters'))}">

          ${Object.keys(FILTERS).map(function (key) {

              const filter = FILTERS[key];
              const value = state.filters[key];

              // 필터 제목 번역
              const label = translate(filter.label);

              return `<label class="fb-item" for="filter-${key}">

                  <span class="fb-label">${filter.icon}${escapeHTML(label)}</span>

                  <span class="select filter-select ${value ? 'active' : ''}">

                      <select id="filter-${key}" data-filter="${key}" aria-label="${escapeHTML(label)}">

                          ${filter.options.map(function (option) {

                              //실제 검색값 유지, 표시 문구만 번역
                              return `<option value="${escapeHTML(option[0])}" ${option[0] === value ? 'selected' : ''}>${escapeHTML(translate(option[1]))}</option>`;

                          }).join('')}

                      </select>${I.chev}

                  </span>

              </label>`;

          }).join('')}

          <button class="fb-reset" id="reset-filters" type="button">${I.reset}${translate('reset')}</button>

      </form>`;
  }

  function activeFilterCount() {
    return Object.keys(state.filters).filter(function (key) { return state.filters[key]; }).length;
  }
  
  // 선택된 필터값을 화면 표시용 문구로 번역
  function translateFilterValue(key, value) {

      const filter = FILTERS[key];

      if (!filter) return value;

      const option = filter.options.find(function (item) {
          return item[0] === value;
      });

      return option ? translate(option[1]) : value;
  }

  // 적용된 필터 및 해제 버튼 다국어 적용
  function renderAppliedFilters() {

      if (!activeFilterCount()) return '';

      const chips = [];

      // 나이 필터 번역
      if (state.filters.age) {
          chips.push({
              key: 'age',
              label: translate('age') + ' : ' +
                     translateFilterValue('age', state.filters.age)
          });
      }

      // 국적 필터 번역
      if (state.filters.nat) {
          chips.push({
              key: 'nat',
              label: translate('nationality') + ' : ' +
                     translateFilterValue('nat', state.filters.nat)
          });
      }

      // 카테고리 필터 번역
      if (state.filters.cat) {
          state.filters.cat.split(',').forEach(function (category) {
              chips.push({
                  key: 'cat',
                  label: translateFilterValue('cat', category)
              });
          });
      }

      // 지역 필터 번역
      if (state.filters.reg) {
          chips.push({
              key: 'reg',
              label: translate('region') + ' : ' +
                     translateFilterValue('reg', state.filters.reg)
          });
      }

      return `<div class="applied">

          <span class="lbl">${translate('appliedFilters')}</span>

          ${chips.map(function (chip) {
              return `<button class="fchip" type="button" data-clear-filter="${chip.key}">${escapeHTML(chip.label)}${I.x}</button>`;
          }).join('')}

          <button class="clear-all" id="clear-all-filters" type="button">${translate('clearAllFilters')}</button>

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

  // 검색 결과 건수 및 정렬 영역 다국어 적용
  function renderResultsToolbar(count) {

      return `<div class="res-bar">

          <div class="count">
              ${translate('searchResults')} <b>${count}</b>${translate('countUnit')}

              ${activeFilterCount() ? `<small>‘${escapeHTML(state.query)}’ · ${escapeHTML(translate('filtersApplied', {count: activeFilterCount()}))}</small>` : ''}
          </div>

          <div class="res-tools">

              <label class="sort">

                  <span class="sr-only">${translate('sort')}</span>

                  <select id="sort-results" aria-label="${escapeHTML(translate('sortResults'))}">

                      <option value="latest" ${state.sort === 'latest' ? 'selected' : ''}>${translate('latest')}</option>

                      <option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>${translate('popular')}</option>

                      <option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>${translate('deadline')}</option>

                  </select>${I.chev}

              </label>

              <div class="view-toggle" role="group" aria-label="${escapeHTML(translate('resultView'))}">

                  <button class="${state.view === 'grid' ? 'on' : ''}" type="button" data-view="grid" aria-label="${escapeHTML(translate('gridView'))}" aria-pressed="${state.view === 'grid'}">${I.gridS}</button>

                  <button class="${state.view === 'list' ? 'on' : ''}" type="button" data-view="list" aria-label="${escapeHTML(translate('listView'))}" aria-pressed="${state.view === 'list'}">${I.list}</button>

              </div>

          </div>

      </div>`;
  }

  // 모집 상태 탭 다국어 적용
  function renderStatusTabs(counts) {

      const labels = [
          'all',
          'open',
          'closing',
          'soon',
          'closed'
      ];

      return `<div class="status-tabs" role="tablist">

          ${labels.map(function (label, index) {

              const status = STATUS_ORDER[index];

              return `<button class="${state.status === status ? 'on' : ''}" type="button" data-status="${status}" role="tab" aria-selected="${state.status === status}">${translate(label)} <small>${counts[index]}</small></button>`;

          }).join('')}

      </div>`;
  }

  // 검색 결과가 없을 때 안내 화면 다국어 적용
  function renderEmpty() {

      const query = state.query || translate('selectedConditions');

      // 검색어 강조 디자인 유지 및 검색 결과 안내 번역
      const emptyTitle = escapeHTML(
          translate('noSearchResults', {query: '{query}'})
      ).replace('{query}', function () {
          return `<em>${escapeHTML(query)}</em>`;
      });

      return `<div class="empty">

          <div class="icon">${I.emptyS}</div>

          <h3>${emptyTitle}</h3>

          <p>${translate('noResultsDescription')}</p>

          <ul>
              <li>${translate('checkSpelling')}</li>
              <li>${translate('shorterKeyword')}</li>
              <li>${translate('removeSelectedFilters')}</li>
          </ul>

          <div class="kws">

              <span class="empty-kws-label">${translate('suggestOtherKeywords')}</span>

              ${['자격증','직업훈련','청년 취업','국민내일배움카드'].map(function (keyword) {
                  return `<button class="kw" type="button" data-search-value="${encoded(keyword)}"># ${escapeHTML(keyword)}</button>`;
              }).join('')}

          </div>

          <div class="empty-actions">

              <button class="btn btn-line" id="empty-reset" type="button">
                  ${I.reset} ${translate('resetFilters')}
              </button>

              <button class="btn btn-primary" type="button">
                  ${I.bell} ${translate('relatedNotification')}
              </button>

          </div>

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
	// 공고 마감일 안내 다국어 적용
	const deadlineLabel = d.dday === '마감'
	    ? translate('applicationClosed')
	    : translate('deadlineRemaining', {dday: d.dday});
    return `${C.header(2)}
      <main class="container detail-page">
	  <!-- 상세 화면 상단 경로 다국어 적용 -->
	  <nav class="crumb" aria-label="${escapeHTML(translate('currentLocation'))}">
	      ${I.home}
	      <a href="index.html">${translate('home')}</a>
	      ›
	      <button type="button" data-back-results>
	          ${translate('searchResults')} ‘${escapeHTML(state.query || '시흥')}’
	      </button>
	      ›
	      <b>${translate('announcementDetail')}</b>
	  </nav>
        <div class="detail">
          <div>
            <div class="d-head">
              <div class="tags">${C.status(d.status)}${d.tags.map(C.tag).join('')}</div>
              <h1>${escapeHTML(d.title)}</h1>
			  <!-- 공고 기본 정보 제목 다국어 적용 -->
			  <div class="org">
			      <span>${translate('department')} : ${escapeHTML(d.org)}</span>
			      <span>${translate('registrationDate')} : 2024.10.28.</span>
			      <span>${translate('views')} 1,284</span>
			  </div>
            </div>
            ${C.ph(d.tags[0],d.img,'').replace('class="ph ','class="ph d-hero ')}
			<!-- 사업 개요 제목 다국어 적용 -->
			<section class="d-sec detail-intro">
			    <h3>${translate('programOverview')}</h3>
				<!-- 사업 개요 고정 안내 문구 다국어 적용 -->
				<p>${escapeHTML(translate('programOverviewDescription', {
				    benefit: d.benefit
				}))}</p>
            </section>
			<!-- 지원 내용 및 상세 정보 항목 다국어 적용 -->
			<section class="d-sec">

			    <h3>${translate('supportContent')}</h3>

			    <div class="d-table">

			        <div>${translate('participationTarget')}</div>
			        <div>${escapeHTML(d.target)}</div>

			        <div>${translate('recruitmentNumber')}</div>
			        <div>40명 (선착순)</div>

			        <div>${translate('applicationPeriod')}</div>
			        <div>${escapeHTML(d.period)}</div>

			        <div>${translate('operationPeriod')}</div>
			        <div>선정자에게 개별 안내</div>

			        <div>${translate('supportContent')}</div>
			        <div>${escapeHTML(d.benefit)}</div>

			        <div>${translate('participationFee')}</div>
			        <div>무료</div>

			        <div>${translate('location')}</div>
			        <div>시흥시 관내 지정 장소</div>

			    </div>

            </section>
			<!-- 신청 방법 및 신청 절차 다국어 적용 -->
			<section class="d-sec">

			    <h3>${translate('applicationMethod')}</h3>

			    <div class="steps">

			        ${[
			            ['onlineApplication', 'onlineApplicationDescription'],
			            ['documentReview', 'documentReviewDescription'],
			            ['selectionNotice', 'selectionNoticeDescription'],
			            ['programParticipation', 'programParticipationDescription']
			        ].map(function (step, index) {

			            return `<div class="step">

			                <div class="n">STEP 0${index + 1}</div>

			                <div class="t">${translate(step[0])}</div>

			                <div class="s">${translate(step[1])}</div>

			            </div>`;

			        }).join('')}

			    </div>

			</section>
			<!-- 첨부파일 제목 다국어 적용 -->
			<section class="d-sec">
			    <h3>${translate('attachments')}</h3>
              <div class="files"><a href="#">${I.file}공고문_상세안내.hwp<span class="sz">128KB</span></a><a href="#">${I.file}참가신청서_양식.pdf<span class="sz">64KB</span></a></div>
            </section>
          </div>
          <aside class="side-card">
            <span class="dday">${escapeHTML(deadlineLabel)}</span>
            <div class="big">${escapeHTML(d.title.replace('시흥시 ',''))}</div>
            ${C.infoRows(d)}
            <div class="progress"><i style="width:72%"></i></div>
			<!-- 신청 현황 다국어 적용 -->
			<div class="pl">
			    <span>${translate('applicationStatus')} 29 / 40${translate('personUnit')}</span>
			    <span>72%</span>
			</div>
			<!-- 신청 및 공고 관리 버튼 다국어 적용 -->
			<div class="acts">

			    <button class="btn btn-primary" type="button">
			        ${translate('apply')}
			    </button>

			    <button class="btn btn-line" type="button"
			        aria-label="${escapeHTML(translate('saveAnnouncement'))}">
			        ${I.heart}
			    </button>

			    <button class="btn btn-line" type="button"
			        aria-label="${escapeHTML(translate('shareAnnouncement'))}">
			        ${I.share}
			    </button>

			</div>
			<!-- 문의 및 운영시간 안내 다국어 적용 -->
			<div class="side-note">
			    ${translate('inquiry')} : ${escapeHTML(d.org)}
			    <br>
			    031-310-0000 (${translate('weekdaysOnly')} 09:00 ~ 18:00)
			</div>
          </aside>
        </div>
      </main>
      <section class="sec related-section">
	  <!-- 관련 공고 추천 영역 다국어 적용 -->
	  <div class="sec-head">

	      <div>
	          <h2>${translate('relatedAnnouncements')}</h2>
	      </div>

	      <button class="more" type="button" data-back-results>
	          ${translate('viewAll')} ${I.arrow}
	      </button>

	  </div>
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
      ${state.searchOpen ? `<button class="search-overlay" id="search-overlay" type="button" aria-label="${escapeHTML(translate('closeSuggestions'))}"></button>` : ''}
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
      ${state.searchOpen ? `<button class="search-overlay" id="search-overlay" type="button" aria-label="${escapeHTML(translate('closeSuggestions'))}"></button>` : ''}
      ${renderHero(false)}
      ${renderFilterBar()}


	  <section class="sec home-section">

	    <div class="sec-head">
	      <div>
	        <h2>${translate('categoryTitle')}</h2>
	        <div class="desc">${translate('categoryDescription')}</div>
	      </div>
	    </div>

	    ${/* 다국어 지원: 카테고리 이름과 공고 건수 단위 번역, 기존 검색값 유지 */ ''}
	    <div class="quick">${quick.map(function (item, index) {
	      const labels = translate('categoryLabels');
	      const name = Array.isArray(labels) ? (labels[index] || item[0]) : item[0];
	      const unit = translate('countUnit');

	      return `<a href="#" data-search-value="${encoded(item[0].replace(' · 행사',''))}"><span class="qi" style="background:${item[1]};color:${item[2]}">${I.grid.replace('width="20" height="20"','width="26" height="26"')}</span>${escapeHTML(name)}<small>${item[3]}${unit || '건'}</small></a>`;
	    }).join('')}</div>

	  </section>

	  <section class="sec home-block">

	  ${/*맞춤형 추천 카드 제목, 설명, 공고 건수 문구 다국어 적용 */ ''}
	        <div class="persona">${persona.map(function (item, index) {
	          const titles = translate('personaTitles');
	          const descriptions = translate('personaDescriptions');
	          const title = Array.isArray(titles) ? (titles[index] || item[0]) : item[0];
	          const description = Array.isArray(descriptions) ? (descriptions[index] || item[1]) : item[1];
	          const countText = translate('personaCountSuffix');

			  // 맞춤형 추천 카드 일러스트 문구 번역
			  return `<a href="#" data-search-value="${encoded(item[5])}" style="background:${item[2]};color:${item[3]}"><h5>${escapeHTML(title)}</h5><p>${escapeHTML(description)}</p><span class="n">${item[4]}${countText || '개 공고 보기'} ${I.arrow}</span>${C.ph(item[5],translate('illustration'))}</a>`;
	        }).join('')}</div>

	  </section>

      <section class="sec home-block">
	  <!-- 마감 예정 공고 안내 다국어 적용 -->
	  <div class="sec-head">
	      <div>
	          <h2>${translate('closingAnnouncements')}</h2>
	          <div class="desc">${translate('closingDescription')}</div>
	      </div>
	      <a class="more" href="#" data-search-value="${encoded('시흥')}">${translate('viewAll')} ${I.arrow}</a>
	  </div>
        <div class="deadline-grid">${deadline.map(function (item) { return `<article class="dcard" data-detail="${encoded(item.title)}" role="button" tabindex="0" aria-label="${escapeHTML(item.title)} ${escapeHTML(translate('viewDetails'))}">${C.ph(item.tags[0],item.img,C.status(item.status))}<div class="b"><div class="tags">${item.tags.map(C.tag).join('')}</div><h4>${item.title.replace('시흥시 ','')}</h4><div class="row"><span>${item.org}</span><b>${item.dday}</b></div></div></article>`; }).join('')}</div>
      </section>

      <section class="sec two-col home-block">
	  <!-- 공고 및 알림 메뉴 다국어 적용 -->
	  <div class="box">
	      <div class="box-head">
	          <h3>${translate('notice')}</h3>
	          <div class="notice-tabs">
	              <span class="on">${translate('all')}</span>
	              <span>${translate('announcement')}</span>
	              <span>${translate('officialNotice')}</span>
	              <span>${translate('pressRelease')}</span>
	          </div>
	      </div>
          ${[['공고','2025년 시흥시 청년 창업 지원사업 참여기업 모집 공고',1,'11.14'],['고시','시흥시 도시관리계획(공원) 결정 변경 고시',1,'11.14'],['공고','2024년 하반기 시흥시 공공근로사업 참여자 모집',0,'11.12'],['보도','시흥시, 외국인 주민 통역 서비스 7개 언어로 확대',0,'11.11'],['공고','시흥 갯골축제 자원봉사자 모집 결과 안내',0,'11.08'],['공고','2024년 소상공인 시설개선 지원사업 2차 공고',0,'11.06']].map(function (item) { return `<div class="nrow"><span class="cat">${escapeHTML(translate({'공고':'announcement','고시':'officialNotice','보도':'press'}[item[0]] || item[0]))}</span><span class="t">${item[1]}</span>${item[2] ? '<span class="new">N</span>' : ''}<span class="d">2024.${item[3]}</span></div>`; }).join('')}
        </div>
		<!-- 주간 행사 및 달력 제목 다국어 적용 -->
		<div class="box">
		    <div class="box-head">
		        <h3>${translate('weeklyEvents')}</h3>
		        <a class="more" href="#">${I.cal} ${translate('calendar')}</a>
		    </div>
			<!-- 달력 요일 다국어 적용 -->
			<div class="cal-week">${[['월',11,1],['화',12,0],['수',13,1],['목',14,1],['금',15,1],['토',16,1],['일',17,0]].map(function (item, index) {

			    const weekdays = translate('weekdays');

			    const day = Array.isArray(weekdays)
			        ? (weekdays[index] || item[0])
			        : item[0];

			    return `<div class="${index === 3 ? 'on' : ''}">${escapeHTML(day)}<b>${item[1]}</b>${item[2] ? '<span class="dot"></span>' : '<span style="height:4px"></span>'}</div>`;

			}).join('')}</div>
          ${[['10:00','청년 취업 특강 : 면접의 기술','시흥시 청년센터'],['14:00','다문화 가족 요리 교실','다문화가족지원센터'],['19:00','시흥 시민 오케스트라 정기공연','시흥ABC행복학습타운']].map(function (item) { return `<div class="ev"><span class="time">${item[0]}</span><div><div class="t">${item[1]}</div><div class="p">${I.pin.replace(/20/g,'14')}${item[2]}</div></div></div>`; }).join('')}
        </div>
      </section>

	  <!-- 알림 신청 배너 다국어 적용 -->
	  <section class="sec home-block">
	      <div class="banner">
	          <div class="ring banner-ring-one"></div>
	          <div class="ring banner-ring-two"></div>

	          <div>
	              <h3>${translate('notificationTitle')}</h3>
	              <p>${translate('notificationDescription')}</p>
	          </div>

	          <button class="btn" type="button">
	              ${I.bell} ${translate('subscribeNotification')}
	          </button>
	      </div>
	  </section>
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
	//  선택한 언어를 HTML 문서에 반영
	document.documentElement.lang = currentLanguage;

	//  언어 선택 안내 문구 다국어 적용
	const languageLabel = document.querySelector('label[for="site-language"]');

	if (languageLabel) {
	    languageLabel.textContent = translate('languageSelect') + ': ';
	}
	
	//  브라우저 탭 제목 다국어 적용
	document.title = state.screen === 'home'
	    ? `시흥쏙쏙 | ${translate('publicProgramSearch')}`
	    : state.screen === 'detail'
	      ? `${state.detailItem ? state.detailItem.title : translate('announcementDetail')} | 시흥쏙쏙`
	      : `${state.query} ${translate('searchResults')} | 시흥쏙쏙`;
		  //  페이지 설명 다국어 적용
		  const metaDescription = document.querySelector('meta[name="description"]');

		  if (metaDescription) {
		      metaDescription.setAttribute('content', translate('siteDescription'));
		  }
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
  
  // 다국어 지원: 언어 변경 시 현재 화면 다시 그리기
   window.addEventListener("siteLanguageChanged", function () {
     render();
   });
  
  render();
})();
