(function(){
  function byId(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function getState(){return window.state || state}
  function nextMatch(){var st=getState(); return (st.matches||[]).filter(function(m){return !m.completed && !m.isBye}).sort(function(a,b){return a.id-b.id})[0]||null}
  function totalLeft(){var st=getState(); return (st.matches||[]).filter(function(m){return !m.completed && !m.isBye}).length}
  function avatar(name,cls){return typeof avatarHtml==='function'?avatarHtml(name,cls):'<div class="'+cls+' bg-white/10 rounded-2xl"></div>'}
  function renderNextMatch(){
    var box=byId('next-match-box'); if(!box)return;
    var m=nextMatch(); var left=totalLeft();
    if(!m){
      box.innerHTML='<div class="board rounded-[30px] p-5 mb-5 border-ef-gold/35 relative overflow-hidden"><div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,220,92,.14),transparent_45%)] pointer-events-none"></div><div class="relative z-10 flex items-center justify-between gap-4"><div><div class="title-font text-[11px] text-ef-gold uppercase tracking-[.18em] mb-2">Calendar</div><h2 class="title-font text-2xl">Все матчи сыграны</h2><p class="text-white/45 text-sm mt-1">Турнир завершён. Смотри итоговую таблицу и вкладку Итоги.</p></div><div class="text-5xl">🏁</div></div></div>';
      return;
    }
    box.innerHTML='<section class="board rounded-[32px] p-5 mb-5 relative overflow-hidden border-ef-blue/35">'+
      '<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,183,255,.16),transparent_46%),radial-gradient(circle_at_80%_30%,rgba(0,255,136,.12),transparent_32%)] pointer-events-none"></div>'+
      '<div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5"><div><div class="title-font text-[11px] text-ef-blue uppercase tracking-[.18em] mb-2 flex items-center gap-2"><i data-lucide="calendar-clock"></i> Следующий матч</div><h2 class="title-font text-2xl sm:text-3xl">Match #'+esc(m.id)+'</h2><p class="text-white/45 text-sm mt-1">Показывается только ближайший несыгранный матч. Прогнозы и аналитика отключены.</p></div><div class="tile rounded-2xl px-4 py-3 text-center"><div class="title-font text-ef-pitch text-xl">'+left+'</div><div class="text-[9px] text-white/40 font-black uppercase">матчей осталось</div></div></div>'+
      '<div class="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">'+
      '<div class="tile rounded-[26px] p-4 text-center">'+avatar(m.p1,'w-20 h-20 rounded-[24px] mx-auto mb-3')+'<div class="title-font text-lg sm:text-xl truncate">'+esc(m.p1)+'</div><div class="text-[10px] text-white/35 font-black uppercase mt-1">Home</div></div>'+
      '<div class="flex flex-col items-center"><div class="w-14 h-14 rounded-full border border-ef-pitch/40 bg-black/55 flex items-center justify-center title-font text-ef-pitch shadow-pitch">VS</div><div class="mt-3 text-[10px] text-white/40 font-black uppercase">Next</div></div>'+
      '<div class="tile rounded-[26px] p-4 text-center">'+avatar(m.p2,'w-20 h-20 rounded-[24px] mx-auto mb-3')+'<div class="title-font text-lg sm:text-xl truncate">'+esc(m.p2)+'</div><div class="text-[10px] text-white/35 font-black uppercase mt-1">Away</div></div>'+
      '</div>'+
      '<div class="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Статус</div><div class="title-font text-ef-blue mt-1">Ожидает игры</div></div>'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Формат</div><div class="title-font text-white mt-1">'+(getState().mode==='league'?'Лига':'Плей-офф')+'</div></div>'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">После матча</div><div class="title-font text-ef-pitch mt-1">Откроется следующий</div></div>'+
      '</div>'+
      '</section>';
    if(window.lucide)lucide.createIcons();
  }
  function ensureNextMatchBlock(){
    if(byId('next-match-box'))return;
    var main=document.querySelector('main'); var anchor=byId('champion-panel'); if(!main||!anchor)return;
    anchor.insertAdjacentHTML('afterend','<div id="next-match-box"></div>');
    var oldRenderAll=window.renderAll; if(typeof oldRenderAll==='function'){window.renderAll=function(){oldRenderAll(); renderNextMatch();}}
    var oldRenderMatches=window.renderMatches; if(typeof oldRenderMatches==='function'){window.renderMatches=function(){oldRenderMatches(); renderNextMatch();}}
    var oldUpdate=window.updateTablesAndSchedules; if(typeof oldUpdate==='function'){window.updateTablesAndSchedules=function(){oldUpdate(); renderNextMatch();}}
    renderNextMatch();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureNextMatchBlock);else ensureNextMatchBlock();
})();