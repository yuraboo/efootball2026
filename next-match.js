(function(){
  function byId(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function getState(){return window.state || state}
  function nextMatch(){var st=getState(); return (st.matches||[]).filter(function(m){return !m.completed && !m.isBye}).sort(function(a,b){return a.id-b.id})[0]||null}
  function totalLeft(){var st=getState(); return (st.matches||[]).filter(function(m){return !m.completed && !m.isBye}).length}
  function avatar(name,cls){return typeof avatarHtml==='function'?avatarHtml(name,cls):'<div class="'+cls+' bg-white/10 rounded-2xl"></div>'}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function stats(name){return typeof getPlayerStats==='function'?getPlayerStats(name):{played:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,last:[]}}
  function profile(name){return typeof getProfile==='function'?getProfile(name):{rating:100}}
  function h2h(a,b){var st=getState(); var list=(st.matches||[]).filter(function(m){return m.completed&&!m.isBye&&((m.p1===a&&m.p2===b)||(m.p1===b&&m.p2===a))}); var aw=0,bw=0,d=0,gA=0,gB=0; list.forEach(function(m){var ag=m.p1===a?m.score1:m.score2; var bg=m.p1===a?m.score2:m.score1; gA+=ag; gB+=bg; if(ag>bg)aw++; else if(bg>ag)bw++; else d++;}); return {played:list.length,aw:aw,bw:bw,d:d,gA:gA,gB:gB}}
  function formScore(name){var ms=typeof getPlayerCompletedMatches==='function'?getPlayerCompletedMatches(name):[]; var recent=ms.slice(-5); if(!recent.length)return 0; var score=0; recent.forEach(function(m,i){var f=m.p1===name?m.score1:m.score2; var a=m.p1===name?m.score2:m.score1; var weight=(i+1)/recent.length; if(f>a)score+=3*weight; else if(f===a)score+=1*weight;}); return score/recent.length}
  function prediction(a,b){
    var pa=profile(a), pb=profile(b), sa=stats(a), sb=stats(b), hh=h2h(a,b);
    var ra=Number(pa.rating)||100, rb=Number(pb.rating)||100;
    var ratingEdge=clamp((rb-ra)*0.55,-28,28);
    var formEdge=clamp((formScore(a)-formScore(b))*8,-12,12);
    var goalEdge=clamp(((sa.gd/(sa.played||1))-(sb.gd/(sb.played||1)))*4,-10,10);
    var hEdge=hh.played?clamp((hh.aw-hh.bw)*7,-12,12):0;
    var edge=ratingEdge+formEdge+goalEdge+hEdge;
    var aChance=Math.round(clamp(50+edge,22,78)); var bChance=100-aChance;
    var fav=aChance>=bChance?a:b; var diff=Math.abs(aChance-bChance);
    var level=diff<=8?'равный матч':diff<=18?'небольшой перевес':diff<=32?'заметный фаворит':'явный фаворит';
    var text='';
    if(diff<=8) text='Пара выглядит максимально плотной: решающим может стать первый гол и качество игры после потери мяча.';
    else if(diff<=18) text=fav+' имеет небольшой перевес, но матч остаётся открытым. Ошибка в начале может быстро перевернуть сценарий.';
    else if(diff<=32) text=fav+' подходит к матчу с заметным преимуществом. Главная задача фаворита — не дать сопернику поймать темп.';
    else text=fav+' выглядит явным фаворитом. Аутсайдеру нужен почти идеальный старт и максимальная реализация моментов.';
    return {aChance:aChance,bChance:bChance,level:level,text:text,hh:hh,sa:sa,sb:sb,ra:ra,rb:rb,fav:fav};
  }
  function mini(title,value,label,colorClass){return '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase mb-2">'+title+'</div><div class="title-font '+colorClass+' text-xl">'+value+'</div><div class="text-[11px] text-white/45 mt-1">'+label+'</div></div>'}
  function renderNextMatch(){
    var box=byId('next-match-box'); if(!box)return;
    var m=nextMatch(); var left=totalLeft();
    if(!m){box.innerHTML='<div class="board rounded-[30px] p-5 mb-5 border-ef-gold/35 relative overflow-hidden"><div class="relative z-10 flex items-center justify-between gap-4"><div><div class="title-font text-[11px] text-ef-gold uppercase tracking-[.18em] mb-2">Calendar</div><h2 class="title-font text-2xl">Все матчи сыграны</h2><p class="text-white/45 text-sm mt-1">Турнир завершён. Смотри итоговую таблицу и вкладку Итоги.</p></div><div class="text-5xl">🏁</div></div></div>';return;}
    var p=prediction(m.p1,m.p2);
    box.innerHTML='<section class="board rounded-[32px] p-5 mb-5 relative overflow-hidden border-ef-blue/35">'+
      '<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,183,255,.16),transparent_46%),radial-gradient(circle_at_80%_30%,rgba(0,255,136,.12),transparent_32%)] pointer-events-none"></div>'+ 
      '<div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5"><div><div class="title-font text-[11px] text-ef-blue uppercase tracking-[.18em] mb-2 flex items-center gap-2"><i data-lucide="calendar-clock"></i> Следующий матч</div><h2 class="title-font text-2xl sm:text-3xl">Match #'+esc(m.id)+'</h2><p class="text-white/45 text-sm mt-1">Один ближайший несыгранный матч с прогнозом, графиками и аналитикой.</p></div><div class="tile rounded-2xl px-4 py-3 text-center"><div class="title-font text-ef-pitch text-xl">'+left+'</div><div class="text-[9px] text-white/40 font-black uppercase">матчей осталось</div></div></div>'+ 
      '<div class="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 mb-5">'+
      '<div class="tile rounded-[26px] p-4 text-center">'+avatar(m.p1,'w-20 h-20 rounded-[24px] mx-auto mb-3')+'<div class="title-font text-lg sm:text-xl truncate">'+esc(m.p1)+'</div><div class="text-[10px] text-ef-pitch font-black uppercase mt-1">'+p.aChance+'% шанс</div></div>'+ 
      '<div class="flex flex-col items-center"><div class="w-14 h-14 rounded-full border border-ef-pitch/40 bg-black/55 flex items-center justify-center title-font text-ef-pitch shadow-pitch">VS</div><div class="mt-3 text-[10px] text-white/40 font-black uppercase">'+esc(p.level)+'</div></div>'+ 
      '<div class="tile rounded-[26px] p-4 text-center">'+avatar(m.p2,'w-20 h-20 rounded-[24px] mx-auto mb-3')+'<div class="title-font text-lg sm:text-xl truncate">'+esc(m.p2)+'</div><div class="text-[10px] text-ef-danger font-black uppercase mt-1">'+p.bChance+'% шанс</div></div>'+ 
      '</div>'+ 
      '<div class="relative z-10 mb-5"><div class="flex justify-between text-xs font-black mb-2"><span class="text-ef-pitch">'+esc(m.p1)+' '+p.aChance+'%</span><span class="text-ef-danger">'+p.bChance+'% '+esc(m.p2)+'</span></div><div class="h-4 rounded-full overflow-hidden bg-white/10 border border-white/10"><div style="width:'+p.aChance+'%;height:100%;background:linear-gradient(90deg,#00ff88,#00b7ff)"></div></div></div>'+ 
      '<div class="relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">'+
      mini('Рейтинг',p.ra+' / '+p.rb,'меньше число = сильнее','text-ef-gold')+
      mini('Форма',p.sa.w+'-'+p.sa.d+'-'+p.sa.l+' / '+p.sb.w+'-'+p.sb.d+'-'+p.sb.l,'В-Н-П по сыгранным матчам','text-ef-pitch')+
      mini('Голы',p.sa.gf+':'+p.sa.ga+' / '+p.sb.gf+':'+p.sb.ga,'забито / пропущено','text-ef-blue')+
      mini('Очные',p.hh.aw+'-'+p.hh.d+'-'+p.hh.bw,p.hh.played?'личные встречи':'ещё не играли','text-white')+
      '</div>'+ 
      '<div class="relative z-10 tile rounded-[24px] p-5"><div class="title-font text-[11px] text-ef-gold uppercase tracking-[.16em] mb-2 flex items-center gap-2"><i data-lucide="activity"></i> Короткая аналитика</div><p class="text-white/75 text-sm leading-relaxed">'+esc(p.text)+' Фактор матча — дисциплина в обороне и реализация первых моментов. После внесения результата эта карточка автоматически переключится на следующий матч календаря.</p></div>'+ 
      '</section>';
    if(window.lucide)lucide.createIcons();
  }
  window.renderNextMatch=renderNextMatch;
  function ensureNextMatchBlock(){
    var box=byId('next-match-box');
    if(!box){var anchor=byId('champion-panel'); if(!anchor)return; anchor.insertAdjacentHTML('afterend','<div id="next-match-box"></div>')}
    renderNextMatch();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureNextMatchBlock);else ensureNextMatchBlock();
})();