(function(){
  const videos=[
    {title:'ЗАСТАВКА ТУРНИРА',label:'Лига eFootball 2026',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781081277/Esports_intro_reveal_tournament___202606101147_do0n1i.mp4'},
    {title:'ЛУЧШИЕ МОМЕНТЫ #1',label:'Яркий момент матча',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348053/SHARE_20260613_1031370_ldkfzh.mp4'},
    {title:'ЛУЧШИЕ МОМЕНТЫ #2',label:'Яркий момент матча',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348036/SHARE_20260613_1050440_h6etzh.mp4'},
    {title:'ЛУЧШИЕ МОМЕНТЫ #3',label:'Яркий момент матча',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348036/SHARE_20260613_1052080_ebmk71.mp4'}
  ];
  let index=0;
  let switching=false;
  let endTimer=null;

  function setupPlaylist(){
    const video=document.querySelector('.hero-video');
    if(!video)return;
    video.removeAttribute('loop');
    video.id='hero-playlist-video';
    video.style.transition='opacity .65s ease, filter .65s ease';
    const header=document.querySelector('header');
    if(header&&!document.getElementById('hero-now-playing')){
      header.insertAdjacentHTML('afterend',`<div id="hero-now-playing" class="w-full max-w-7xl mx-auto px-4 pt-4 relative z-40 pointer-events-none"><div class="max-w-md rounded-[22px] border border-ef-pitch/25 bg-black/45 backdrop-blur-md p-3 shadow-pitch"><div class="title-font text-[9px] text-ef-pitch uppercase tracking-[.22em] mb-1">СЕЙЧАС НА ЭКРАНЕ</div><div id="hero-play-title" class="title-font text-lg sm:text-2xl text-white leading-tight">${videos[0].title}</div><div id="hero-play-label" class="text-white/55 text-xs mt-1 font-bold">${videos[0].label}</div><div id="hero-play-dots" class="flex gap-2 mt-3">${videos.map((_,i)=>`<span class="hero-dot h-2 rounded-full ${i===0?'w-8 bg-ef-pitch shadow-pitch':'w-2 bg-white/30'}"></span>`).join('')}</div></div></div>`);
    }
    function renderMeta(){
      const t=document.getElementById('hero-play-title'),l=document.getElementById('hero-play-label'),dots=document.querySelectorAll('.hero-dot');
      if(t)t.textContent=videos[index].title;
      if(l)l.textContent=videos[index].label;
      dots.forEach((d,i)=>{d.className='hero-dot h-2 rounded-full transition-all '+(i===index?'w-8 bg-ef-pitch shadow-pitch':'w-2 bg-white/30')});
    }
    function clearEndTimer(){if(endTimer){clearTimeout(endTimer);endTimer=null;}}
    function scheduleSafeEnd(){
      clearEndTimer();
      if(!Number.isFinite(video.duration)||video.duration<=0)return;
      const ms=Math.max(1200,(video.duration-video.currentTime)*1000+1400);
      endTimer=setTimeout(nextVideo,ms);
    }
    function playCurrent(){
      if(switching)return;
      switching=true;
      clearEndTimer();
      video.style.opacity='.18';
      video.style.filter='blur(4px) saturate(1.35)';
      setTimeout(()=>{
        video.src=videos[index].src;
        video.load();
        video.play().catch(()=>{});
        renderMeta();
        setTimeout(()=>{video.style.opacity='.96';video.style.filter='blur(0) saturate(1.05)';switching=false;scheduleSafeEnd();},220);
      },520);
    }
    function nextVideo(){if(switching)return;clearEndTimer();index=(index+1)%videos.length;playCurrent();}
    video.addEventListener('loadedmetadata',scheduleSafeEnd);
    video.addEventListener('canplay',scheduleSafeEnd);
    video.addEventListener('ended',()=>setTimeout(nextVideo,1400));
    video.addEventListener('error',nextVideo);
    renderMeta();
    scheduleSafeEnd();
  }

  function injectImprovements(){
    if(document.getElementById('readability-improvements'))return;
    const style=document.createElement('style');
    style.id='readability-improvements';
    style.textContent=`
      .hero-video{height:48vh!important;min-height:360px;max-height:520px}
      .hero-video-overlay{height:57vh!important;min-height:430px;max-height:620px}
      #hero-spacer{height:39vh!important;min-height:285px;max-height:420px}
      #hero-now-playing{padding-top:.7rem!important}
      .dashboard-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .profile-stat{background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
      @media(max-width:640px){
        .hero-video{height:40vh!important;min-height:300px}
        .hero-video-overlay{height:49vh!important;min-height:370px}
        #hero-spacer{height:32vh!important;min-height:235px}
        #hero-now-playing>div{max-width:260px}
        #hero-play-title{font-size:1rem}
      }
    `;
    document.head.appendChild(style);

    const main=document.querySelector('main');
    const oldOverview=main&&main.querySelector('section');
    if(oldOverview){
      oldOverview.outerHTML=`<section id="tournament-dashboard" class="board scanline rounded-[30px] p-4 sm:p-5 mb-5 relative overflow-hidden">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-5">
          <div><div class="text-[10px] font-black uppercase tracking-[.28em] text-ef-pitch mb-2">ЦЕНТР ТУРНИРА</div><h1 class="title-font text-2xl sm:text-4xl leading-tight">eFootball 2026<br><span class="text-ef-pitch">Турнирная лига</span></h1><p class="text-white/50 text-sm mt-2">Главная информация о текущем положении турнира.</p></div>
          <button onclick="switchTab('tab-matches')" class="bg-ef-pitch text-black title-font text-xs px-5 py-3 rounded-2xl shadow-pitch flex items-center justify-center gap-2"><i data-lucide="gamepad-2"></i> К матчам</button>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="tile rounded-2xl p-4"><div class="text-[9px] text-white/45 font-black uppercase mb-2">Лидер</div><div id="dash-leader" class="dashboard-value title-font text-ef-gold text-base sm:text-lg">—</div><div id="dash-leader-note" class="text-[10px] text-white/40 mt-1">Таблица ещё не сформирована</div></div>
          <div class="tile rounded-2xl p-4"><div class="text-[9px] text-white/45 font-black uppercase mb-2">Сыграно</div><div id="dash-progress" class="title-font text-ef-blue text-lg">0 / 0</div><div id="dash-progress-note" class="text-[10px] text-white/40 mt-1">матчей завершено</div></div>
          <div class="tile rounded-2xl p-4"><div class="text-[9px] text-white/45 font-black uppercase mb-2">Следующий матч</div><div id="dash-next" class="dashboard-value title-font text-white text-sm sm:text-base">—</div><div id="dash-next-note" class="text-[10px] text-white/40 mt-1">календарь не создан</div></div>
          <div class="tile rounded-2xl p-4"><div class="text-[9px] text-white/45 font-black uppercase mb-2">Формат</div><div id="dash-mode" class="title-font text-ef-pitch text-lg">Лига</div><div id="dash-mode-note" class="text-[10px] text-white/40 mt-1">участников: 0</div></div>
        </div>
      </section>`;
    }

    translateInterface();
    installDashboardUpdater();
    installProfileCards();
    updateDashboard();
    if(typeof window.renderProfiles==='function')window.renderProfiles();
    if(window.lucide)lucide.createIcons();
  }

  function translateInterface(){
    document.title='Турнир eFootball 2026';
    const badge=document.getElementById('access-badge');
    if(badge)badge.textContent=window.IS_ADMIN?'РЕЖИМ АДМИНИСТРАТОРА':'ПРОСМОТР ТУРНИРА';
    const live=document.querySelector('header .title-font');
    if(live)live.textContent='ТУРНИР ИДЁТ';
    const replacements={
      'Player Profiles':'Профили игроков','Match Center':'Центр матчей','League Table':'Турнирная таблица',
      'Tournament Podium':'Призовые места','Knockout Bracket':'Сетка плей-офф','Score Input':'Ввод счёта',
      'LEAGUE MODE':'РЕЖИМ ЛИГИ','KNOCKOUT MODE':'ПЛЕЙ-ОФФ','Auto bracket':'Автоматическая сетка',
      'RESET':'СБРОСИТЬ','SAVE':'СОХРАНИТЬ','Tournament Champion':'Чемпион турнира','CHAMPION':'ЧЕМПИОН'
    };
    document.querySelectorAll('h2,h3,span,button,div').forEach(el=>{
      if(el.children.length===0){const t=el.textContent.trim();if(replacements[t])el.textContent=replacements[t];}
    });
    const profileLabel=document.getElementById('profiles-mode-label');
    if(profileLabel)profileLabel.textContent=window.IS_ADMIN?'Редактирование':'Подробная статистика';
    const heads=document.querySelectorAll('#tab-tables thead th');
    const labels=['#','Игрок','И','В','Н','П','ЗМ','ПМ','РМ','О'];
    heads.forEach((h,i)=>{if(labels[i]){h.textContent=labels[i];h.title=['Место','Игрок','Игры','Победы','Ничьи','Поражения','Забитые мячи','Пропущенные мячи','Разница мячей','Очки'][i]||'';}});
  }

  function updateDashboard(){
    if(!window.state)return;
    const clean=(state.matches||[]).filter(m=>!m.isBye);
    const done=clean.filter(m=>m.completed).length;
    const next=clean.filter(m=>!m.completed).sort((a,b)=>a.id-b.id)[0];
    const sorted=typeof getLeagueSorted==='function'?getLeagueSorted():[];
    const leader=sorted[0];
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('dash-leader',leader?leader.name:'—');
    set('dash-leader-note',leader?(leader.pts+' очк. • РМ '+(leader.gd>0?'+':'')+leader.gd):'Таблица ещё не сформирована');
    set('dash-progress',done+' / '+clean.length);
    set('dash-progress-note',clean.length?(Math.round(done/clean.length*100)+'% турнира завершено'):'календарь не создан');
    set('dash-next',next?(next.p1+' — '+next.p2):'—');
    set('dash-next-note',next?('Матч №'+next.id):(clean.length?'Все матчи сыграны':'календарь не создан'));
    set('dash-mode',state.mode==='playoff'?'Плей-офф':'Лига');
    set('dash-mode-note','участников: '+(state.players||[]).length);
  }

  function installDashboardUpdater(){
    const original=window.updateHeaderStats;
    window.updateHeaderStats=function(){if(typeof original==='function')original();updateDashboard();};
  }

  function lastResult(name){
    const list=typeof getPlayerCompletedMatches==='function'?getPlayerCompletedMatches(name):[];
    const m=list[list.length-1];
    if(!m)return 'Нет сыгранных матчей';
    const own=m.p1===name?m.score1:m.score2;
    const opp=m.p1===name?m.score2:m.score1;
    const opponent=m.p1===name?m.p2:m.p1;
    const result=own>opp?'Победа':own===opp?'Ничья':'Поражение';
    return result+' '+own+':'+opp+' против '+opponent;
  }

  function nextOpponent(name){
    const m=(state.matches||[]).filter(x=>!x.isBye&&!x.completed&&(x.p1===name||x.p2===name)).sort((a,b)=>a.id-b.id)[0];
    return m?(m.p1===name?m.p2:m.p1):'Матчей не осталось';
  }

  function installProfileCards(){
    window.renderProfiles=function(){
      const box=document.getElementById('profiles-container');
      if(!box||!window.state)return;
      box.innerHTML='';
      const sorted=typeof getLeagueSorted==='function'?getLeagueSorted():[];
      state.players.forEach((name,idx)=>{
        const p=getProfile(name);
        const s=typeof getPlayerStats==='function'?getPlayerStats(name):{played:0,w:0,d:0,l:0,gf:0,ga:0,gd:0};
        const place=sorted.findIndex(x=>x.name===name)+1;
        const tableRow=sorted.find(x=>x.name===name)||{pts:0};
        const card=document.createElement('div');
        card.className='tile rounded-[26px] p-4 flex flex-col';
        const edit=window.IS_ADMIN?`<div class="mt-4 pt-4 border-t border-white/10"><label class="block text-[10px] uppercase font-black text-white/45 mb-2">Рейтинг</label><input type="number" value="${p.rating}" onchange="updateRating('${encodeURIComponent(name)}',this.value)" class="w-full bg-black/50 border border-white/12 rounded-2xl px-4 py-3 text-white title-font mb-3"><label class="block text-[10px] uppercase font-black text-white/45 mb-2">Ссылка на фото</label><input type="url" value="${p.photoUrl||''}" onchange="updatePhotoUrl('${encodeURIComponent(name)}',this.value)" class="w-full bg-black/50 border border-white/12 rounded-2xl px-4 py-3 text-white text-xs"></div>`:'';
        card.innerHTML=`<div class="flex items-center gap-4 mb-4">${avatarHtml(name,'w-20 h-20 rounded-[24px]')}<div class="min-w-0"><div class="title-font text-lg truncate">${name}</div><div class="text-[10px] text-white/40 mt-1">${place?place+' место в таблице':'Участник №'+(idx+1)}</div><div class="inline-flex mt-2 px-3 py-1 rounded-full bg-ef-gold/15 border border-ef-gold/30 text-ef-gold title-font text-xs">Рейтинг ${p.rating}</div></div></div>
          <div class="grid grid-cols-3 gap-2 mb-3"><div class="profile-stat rounded-xl p-2 text-center"><div class="title-font text-ef-pitch">${tableRow.pts||0}</div><div class="text-[9px] text-white/40 uppercase">Очки</div></div><div class="profile-stat rounded-xl p-2 text-center"><div class="title-font text-white">${s.w}-${s.d}-${s.l}</div><div class="text-[9px] text-white/40 uppercase">В-Н-П</div></div><div class="profile-stat rounded-xl p-2 text-center"><div class="title-font text-ef-blue">${s.gf}:${s.ga}</div><div class="text-[9px] text-white/40 uppercase">Мячи</div></div></div>
          <div class="profile-stat rounded-2xl p-3 mb-2"><div class="text-[9px] text-white/40 font-black uppercase mb-2">Форма за 5 матчей</div><div>${typeof getFormDots==='function'?getFormDots(name):'—'}</div></div>
          <div class="grid grid-cols-1 gap-2 text-xs"><div class="profile-stat rounded-2xl p-3"><span class="text-white/40">Следующий соперник:</span><div class="font-black text-white mt-1">${nextOpponent(name)}</div></div><div class="profile-stat rounded-2xl p-3"><span class="text-white/40">Последний результат:</span><div class="font-black text-white mt-1">${lastResult(name)}</div></div></div>${edit}`;
        box.appendChild(card);
      });
      if(window.lucide)lucide.createIcons();
    };
  }

  function setup(){setupPlaylist();injectImprovements();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();