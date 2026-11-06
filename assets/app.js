/* 시흥쏙쏙 – shared components (plain JS, static DOM output for Figma import) */
(function(){
const I = {
  search:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  arrow:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  user:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  globe:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z"/></svg>',
  grid:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
  pin:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  list:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
  gridS:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  people:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/></svg>',
  cal:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  gift:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.5 9 8 12 8Zm0 0s1.5-4.5 4-3.5S15 8 12 8Z"/></svg>',
  spark:'<svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor"><path d="M16 4c1 7 3.5 9.5 10.5 10.5C19.5 15.5 17 18 16 25c-1-7-3.5-9.5-10.5-10.5C12.5 13.5 15 11 16 4Z"/><path d="M30 20c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z" opacity=".6"/><path d="M29 3c.4 2.5 1.3 3.4 3.8 3.8-2.5.4-3.4 1.3-3.8 3.8-.4-2.5-1.3-3.4-3.8-3.8C27.7 6.4 28.6 5.5 29 3Z" opacity=".4"/></svg>',
  reset:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>',
  clock:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  trend:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 4 8-8M15 7h6v6"/></svg>',
  heart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/></svg>',
  share:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/></svg>',
  file:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z"/><path d="M14 3v5h5"/></svg>',
  bell:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0"/></svg>',
  emptyS:'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8.5 9.5h.01M13.5 9.5h.01M8.5 13.5c1.5-1 3.5-1 5 0"/></svg>',
  home:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z"/></svg>',
};
window.SI = I;

/* image placeholder palette */
const PH = {
  '외국인':'#CFE8D6','청년':'#D3E2FB','다문화':'#D9EFE1','소상공인':'#FBE3C8','가족':'#E6F2C9','문화':'#E4DAF7',
  '취업':'#D6EEF0','교육':'#E7E0FA','생활지원':'#FADCE8','어르신':'#F6E6CF','환경':'#D7EFD9','아동':'#FCE0E6','주거':'#DCE8F8','행사':'#FBE9C9'
};
const ph = (cat,label,cls='') => `<div class="ph ${cls}" style="background:${PH[cat]||'#E3E8F0'}">__S__<span>${label}</span></div>`;

const statusLbl = {open:'모집중',closing:'마감임박',soon:'접수예정',closed:'마감'};
const status = s => `<span class="status ${s}"><i></i>${statusLbl[s]}</span>`;
const tag = t => `<span class="tag t-${t}">${t}</span>`;

const infoRows = (d, labels=['참여 대상','신청 기간','지원 내용']) => `
  <div class="info">
    <div class="info-row"><span class="k">${I.people}${labels[0]}</span><span class="v">${d.target}</span></div>
    <div class="info-row"><span class="k">${I.cal}${labels[1]}</span><span class="v ${d.status==='closing'?'hl':''}">${d.period}</span></div>
    <div class="info-row"><span class="k">${I.gift}${labels[2]}</span><span class="v">${d.benefit}</span></div>
  </div>`;

/* ---------- DATA ---------- */
const DATA = {
  reco:[
    {tags:['외국인','생활지원'],title:'외국인 주민 생활지원 안내',img:'외국인 주민 모임 사진',target:'시흥시 거주 외국인 주민',period:'2024.11.15. ~ 2024.11.30.',benefit:'생활 상담, 통역 지원, 행정 안내 등'},
    {tags:['청년','취업'],title:'청년 취업역량 강화 프로그램',img:'청년 구직자 사진',target:'19세 ~ 34세 청년',period:'2024.11.15. ~ 2024.11.30.',benefit:'취업 특강, 면접 컨설팅, 직무 교육 등'},
    {tags:['다문화','교육'],title:'다문화 가족 한국어 교육',img:'한국어 수업 사진',target:'시흥시 거주 다문화 가족',period:'2024.11.01. ~ 2024.11.30.',benefit:'한국어 교육, 생활 적응 지원 등'},
    {tags:['소상공인','지원사업'],title:'소상공인 지원 공고',img:'가게 운영자 사진',target:'시흥시 관내 소상공인',period:'2024.11.10. ~ 2024.12.10.',benefit:'경영 컨설팅, 시설개선비, 홍보 지원 등'},
    {tags:['가족','문화'],title:'가족 체험 행사 참가자 모집',img:'가족 야외행사 사진',target:'시흥시 거주 가족 (유아~초등 자녀)',period:'2024.11.05. ~ 2024.11.25.',benefit:'가족 체험 프로그램, 놀이 체험, 공연 등'},
  ],
  results:[
    {status:'open',tags:['문화','청년'],title:'시흥시 청년 문화 프로그램 참여자 모집',img:'청년 야외 문화행사',target:'시흥시 거주 청년 (만 19세 ~ 34세)',period:'2024.11.01. ~ 2024.11.20.',benefit:'문화 체험, 예술 창작 프로그램 등',dday:'D-6',org:'문화예술과'},
    {status:'open',tags:['생활지원','외국인'],title:'시흥시 외국인 주민 생활지원 안내',img:'외국인 주민 모임',target:'시흥시 거주 외국인 주민',period:'2024.10.20. ~ 2024.12.31.',benefit:'생활 상담, 통역 지원, 행정 안내 등',dday:'D-47',org:'외국인주민지원과'},
    {status:'closing',tags:['교육','취업'],title:'시흥시 취업 역량 강화 교육 신청',img:'서류 작성 클로즈업',target:'시흥시 거주 구직자 및 청년',period:'2024.11.01. ~ 2024.11.15.',benefit:'이력서 작성, 면접 준비, 직무 교육 등',dday:'D-1',org:'일자리정책과'},
    {status:'open',tags:['문화','가족'],title:'시흥시 가족 체험 행사 참가자 모집',img:'가족 야외 체험',target:'시흥시 거주 가족 (유아 ~ 초등 자녀)',period:'2024.11.05. ~ 2024.11.25.',benefit:'가족 체험 프로그램, 놀이체험, 공연 등',dday:'D-11',org:'가족정책과'},
    {status:'soon',tags:['소상공인','지원사업'],title:'시흥시 소상공인 지원 공고',img:'가게 앞 점주',target:'시흥시 관내 소상공인',period:'2024.11.10. ~ 2024.12.10.',benefit:'경영 컨설팅, 시설개선비, 홍보 지원 등',dday:'오픈 D-3',org:'소상공인과'},
    {status:'open',tags:['교육','다문화'],title:'시흥시 다문화 가족 한국어 교육',img:'한국어 교실',target:'시흥시 거주 다문화 가족',period:'2024.11.01. ~ 2024.11.30.',benefit:'한국어 교육, 생활 적응 지원 등',dday:'D-16',org:'다문화가족지원센터'},
    {status:'open',tags:['어르신','생활지원'],title:'시흥시 어르신 디지털 교육 수강생 모집',img:'어르신 스마트폰 교육',target:'시흥시 거주 만 65세 이상',period:'2024.11.04. ~ 2024.11.29.',benefit:'스마트폰 활용, 키오스크 사용 교육',dday:'D-15',org:'노인복지과'},
    {status:'closing',tags:['주거','청년'],title:'시흥시 청년 월세 한시 특별지원',img:'원룸 실내',target:'만 19세 ~ 34세 무주택 청년',period:'2024.10.01. ~ 2024.11.15.',benefit:'월 최대 20만원, 최대 12개월',dday:'D-1',org:'주택정책과'},
    {status:'closed',tags:['환경','행사'],title:'시흥 갯골 환경정화 시민 봉사단 모집',img:'갯골생태공원',target:'시흥시민 누구나',period:'2024.10.01. ~ 2024.10.31.',benefit:'봉사시간 인정, 기념품 제공',dday:'마감',org:'환경정책과'},
  ]
};
window.SDATA = DATA;

/* ---------- Components ---------- */
const C = {};
C.header = (active) => {
  const m = ['사업 · 지원사업','공고 · 알림','문화 · 행사','생활정보','시민참여'];
  return `<header class="gnb"><div class="container">
    <a class="logo" href="index.html" aria-label="시흥쏙쏙 홈"><span class="logo-mark"><i></i><i></i></span>시흥<b>쏙쏙</b></a>
    <nav class="gnb-menu">${m.map((x,i)=>`<a class="${i===active?'on':''}">${x}</a>`).join('')}</nav>
    <div class="gnb-right"><a class="login">${I.user}로그인</a><a class="btn btn-primary">회원가입</a></div>
  </div></header>`;
};
C.heroDeco = () => `<div class="hero-deco"><div class="hill h1"></div><div class="hill h3"></div><div class="hill h2"></div></div>`;
C.searchBox = (q, opts={}) => `
  <div class="search-box">
    <span class="ic">${I.search}</span>
    <span class="q ${q?'':'ph'}">${q || '관심 있는 지원사업, 행사, 교육을 검색해 보세요'}${opts.caret?'<span class="caret"></span>':''}</span>
    ${q?`<span class="clear">${I.x}</span>`:''}
    <button class="go">검색</button>
  </div>`;
C.filterbar = (vals={}) => {
  const f = [['나이',I.user,'age'],['국적',I.globe,'nat'],['카테고리',I.grid,'cat'],['지역',I.pin,'reg']];
  return `<div class="filterbar">${f.map(([l,ic,k])=>`
    <div class="fb-item"><span class="fb-label">${ic}${l}</span><span class="select ${vals[k]?'active':''}">${vals[k]||'전체'}${I.chev}</span></div>`).join('')}
    <a class="fb-reset">${I.reset}초기화</a></div>`;
};
C.vcard = d => `<article class="vcard" data-detail="${encodeURIComponent(d.title)}" role="button" tabindex="0" aria-label="${d.title} 상세 보기">
  <div class="tags">${d.tags.map(tag).join('')}</div>
  ${ph(d.tags[0],d.img).replace('__S__','')}
  <h4>${d.title}</h4>
  ${infoRows(d,['지원 대상','신청 기간','지원 내용'])}
  <a class="arrow-btn go" style="margin-top:14px">${I.arrow}</a>
</article>`;
C.hcard = d => `<article class="hcard ${d.status==='closed'?'closed':''}" data-detail="${encodeURIComponent(d.title)}" role="button" tabindex="0" aria-label="${d.title} 상세 보기">
  ${ph(d.tags[0],d.img).replace('__S__',status(d.status))}
  <div class="body">
    <div class="tags">${d.tags.map(tag).join('')}</div>
    <h4>${d.title}</h4>
    ${infoRows(d)}
    <div class="foot"><a class="arrow-btn">${I.arrow}</a></div>
  </div></article>`;
C.lrow = d => `<article class="lrow" data-detail="${encodeURIComponent(d.title)}" role="button" tabindex="0" aria-label="${d.title} 상세 보기">
  ${ph(d.tags[0],d.img).replace('__S__','')}
  <div class="body">
    <div class="top">${status(d.status)}${d.tags.map(tag).join('')}</div>
    <h4>${d.title}</h4>
    <div class="desc">${d.benefit}</div>
    <div class="meta"><span>${I.people}<b>${d.target}</b></span><span>${I.cal}<b>${d.period}</b></span></div>
  </div>
  <div class="side"><span class="dday ${d.status==='closing'?'urgent':d.status==='closed'?'muted':''}">${d.dday}</span><span style="font-size:13px;color:var(--g-500)">${d.org}</span><a class="btn btn-line btn-sm">자세히 보기 ${I.arrow}</a></div>
</article>`;
C.reco = (title='이런것도 있어요!', desc='검색어 외에도 국적, 관심 카테고리, 연령, 언어 설정을 바탕으로 필요한 공고를 재분류해서 추천해드려요.') => `
  <div class="reco">
    <div class="reco-intro"><span class="spark">${I.spark}</span><h3>${title}</h3><p>${desc}</p><a class="more">전체 보기 ${I.arrow}</a></div>
    <div class="reco-list">${DATA.reco.map(C.vcard).join('')}</div>
  </div>`;
C.resBar = (count, view='grid', extra='') => `
  <div class="res-bar">
    <div class="count">검색 결과 <b>${count}</b>건${extra}</div>
    <div class="res-tools"><span class="sort">최신순${I.chev}</span>
      <div class="view-toggle"><span class="${view==='grid'?'on':''}">${I.gridS}</span><span class="${view==='list'?'on':''}">${I.list}</span></div></div>
  </div>`;
C.statusTabs = (counts, on=0) => `<div class="status-tabs">${[['전체',counts[0]],['모집중',counts[1]],['마감임박',counts[2]],['접수예정',counts[3]],['마감',counts[4]]].map(([l,n],i)=>`<a class="${i===on?'on':''}">${l} <small>${n}</small></a>`).join('')}</div>`;
C.pager = () => `<div class="pager"><span class="nav">‹</span><span class="on">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>…</span><span>14</span><span class="nav">›</span></div>`;
C.footer = () => `<footer class="footer"><div class="container">
  <div class="links"><a>개인정보처리방침</a><a>이용약관</a><a>저작권정책</a><a>웹 접근성</a><a>사이트맵</a></div>
  <div class="row"><div class="addr">(14988) 경기도 시흥시 시청로 20 (장현동) 시흥시청 · 대표전화 031-310-2114<br>Copyright © Siheung City. All rights reserved.</div>
  <span class="logo"><span class="logo-mark"><i></i><i></i></span>시흥<b>쏙쏙</b></span></div>
</div></footer>`;
C.ph = (cat,label,inner='') => ph(cat,label).replace('__S__',inner);
C.status = status; C.tag = tag; C.infoRows = infoRows;
window.SC = C;

/* auto-mount: <div data-c="header" data-arg="0"></div> */
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-c]').forEach(el=>{
    const fn = C[el.dataset.c]; if(!fn) return;
    let args = el.dataset.arg ? JSON.parse(el.dataset.arg) : [];
    if(!Array.isArray(args)) args=[args];
    el.outerHTML = fn(...args);
  });
});
})();
