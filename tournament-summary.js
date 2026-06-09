(function(){
  function byId(id){return document.getElementById(id)}
  function safeText(v){return String(v??'')}
  function esc(v){return safeText(v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function getState(){return window.state || state}
  function completedRealMatches(st){return (st.matches||[]).filter(function(m){return m.completed && !m.isBye})}
  function allMatchesCompleted(st){return st.matches && st.matches.length>0 && st.matches.every(function(m){return m.completed})}
  function leagueSorted(){return typeof getLeagueSorted==='function'?getLeagueSorted():[]}
  function playerStats(name){return typeof getPlayerStats==='function'?getPlayerStats(name):{played:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,last:[]}}
  function bestMatch(st){
    var matches=completedRealMatches(st); if(!matches.length)return null;
    return matches.slice().sort(function(a,b){return ((b.score1+b.score2)-(a.score1+a.score2)) || (Math.abs(b.score1-b.score2)-Math.abs(a.score1-a.score2))})[0];
  }
  function biggestUpset(st){
    var matches=completedRealMatches(st); if(!matches.length)return null;
    var best=null,score=-999;
    matches.forEach(function(m){
      var p1=getProfile?getProfile(m.p1):{rating:100}; var p2=getProfile?getProfile(m.p2):{rating:100};
      var winner=m.score1>m.score2?m.p1:(m.score2>m.score1?m.p2:null); if(!winner)return;
      var loser=winner===m.p1?m.p2:m.p1; var wr=Number((winner===m.p1?p1:p2).rating)||100; var lr=Number((loser===m.p1?p1:p2).rating)||100;
      var delta=wr-lr; var margin=Math.abs(m.score1-m.score2); var s=delta*2+margin;
      if(s>score){score=s;best=m;}
    });
    return best;
  }
  function bestAttack(sorted){return sorted.slice().sort(function(a,b){return b.gf-a.gf})[0]||null}
  function bestDefense(sorted){return sorted.slice().sort(function(a,b){return a.ga-b.ga})[0]||null}
  function maxWinStreak(name){
    var ms=getPlayerCompletedMatches?getPlayerCompletedMatches(name):[]; var best=0,cur=0;
    ms.forEach(function(m){var f=m.p1===name?m.score1:m.score2; var a=m.p1===name?m.score2:m.score1; if(f>a){cur++; best=Math.max(best,cur)}else cur=0});
    return best;
  }
  function makeArticle(){
    var st=getState(); var sorted=leagueSorted(); if(!allMatchesCompleted(st)||!sorted.length)return '';
    var champ=sorted[0], second=sorted[1], cs=playerStats(champ.name), bm=bestMatch(st), upset=biggestUpset(st), attack=bestAttack(sorted), defense=bestDefense(sorted), streak=maxWinStreak(champ.name);
    var gd=(champ.gd>0?'+':'')+champ.gd;
    var title=champ.name+' — чемпион eFootball 2026';
    var p1=champ.name+' завершил турнир eFootball 2026 на первом месте и сделал это не за счёт одного яркого матча, а за счёт стабильности на всей дистанции. Чемпион набрал '+champ.pts+' очков, одержал '+champ.w+' побед, '+champ.d+' раз сыграл вничью и потерпел '+champ.l+' поражений. Разница мячей '+champ.gf+':'+champ.ga+' ('+gd+') показывает главное: этот титул был построен не только на атаке, но и на контроле матчей.';
    var p2=second?'Главным преследователем стал '+second.name+', который до последнего сохранял давление на лидера. Но решающим отличием чемпиона стала способность брать очки именно тогда, когда турнирная гонка становилась нервной. Серия из '+streak+' побед подряд стала тем отрезком, где '+champ.name+' создал задел и фактически заставил соперников играть без права на ошибку.':'На этой дистанции чемпион оказался самым собранным участником: каждый результат работал на итоговую первую строчку.';
    var p3=bm?'Матчем турнира можно назвать встречу '+bm.p1+' — '+bm.p2+', завершившуюся со счётом '+bm.score1+':'+bm.score2+'. Это была игра с высоким темпом, большим количеством моментов и настоящим турнирным напряжением. Такие матчи обычно становятся проверкой характера: кто выдерживает давление, тот и получает преимущество в чемпионской гонке.':'Турнир прошёл без лишней случайности: итоговая таблица хорошо отразила баланс сил участников.';
    var p4=upset?'Отдельно стоит отметить результат '+upset.p1+' — '+upset.p2+' '+upset.score1+':'+upset.score2+'. Этот матч стал одной из самых заметных точек турнира, потому что он изменил динамику борьбы и напомнил: даже фаворит здесь не мог позволить себе расслабиться.':'Сенсационного перелома не случилось, но почти каждый тур добавлял интригу в борьбу за позиции.';
    var p5='Финальный вывод простой: '+champ.name+' заслуженно стал чемпионом. В турнире, где важны не только техника и атака, но и холодная голова, он оказался самым устойчивым игроком. Лучшая атака турнира — '+(attack?attack.name+' ('+attack.gf+' голов)':'—')+', лучшая оборона — '+(defense?defense.name+' ('+defense.ga+' пропущенных)':'—')+'. Но главный заголовок остаётся один: '+title+'.';
    return title+'\n\n'+p1+'\n\n'+p2+'\n\n'+p3+'\n\n'+p4+'\n\n'+p5;
  }
  window.copyTournamentArticle=function(){
    var text=makeArticle(); if(!text){showToast&&showToast('Статья появится после окончания турнира',true); return;}
    navigator.clipboard.writeText(text).then(function(){showToast&&showToast('Статья скопирована')}).catch(function(){showToast&&showToast('Не удалось скопировать',true)});
  }
  function renderSummary(){
    var box=byId('summary-content'); if(!box)return; var st=getState();
    if(!allMatchesCompleted(st)){
      box.innerHTML='<div class="board rounded-[28px] p-6 text-center"><div class="text-4xl mb-3">📰</div><h2 class="title-font text-xl mb-2">Итоги турнира</h2><p class="text-white/55 text-sm leading-relaxed">Спортивная статья появится автоматически после завершения всех матчей. Пока турнир продолжается, система собирает статистику, форму игроков, ключевые матчи и будущую историю чемпиона.</p></div>';
      return;
    }
    var sorted=leagueSorted(); var champ=sorted[0]; var second=sorted[1]; var bm=bestMatch(st); var attack=bestAttack(sorted); var defense=bestDefense(sorted); var article=makeArticle();
    box.innerHTML='<div class="board rounded-[30px] p-5 sm:p-7 relative overflow-hidden border-ef-gold/35">'+
      '<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,220,92,.18),transparent_45%)] pointer-events-none"></div>'+
      '<div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><div class="title-font text-[11px] text-ef-gold uppercase tracking-[.18em] mb-2">Final Report</div><h2 class="title-font text-2xl sm:text-4xl">Итоги турнира</h2><p class="text-white/45 text-sm mt-2">Журналистская статья создана автоматически по результатам матчей.</p></div><button onclick="copyTournamentArticle()" class="bg-ef-gold text-black hover:bg-white title-font text-xs py-3 px-5 rounded-2xl transition-all">📋 Скопировать статью</button></div>'+
      '<div class="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Чемпион</div><div class="title-font text-ef-gold mt-1">'+esc(champ.name)+'</div></div>'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Главный конкурент</div><div class="title-font text-white mt-1">'+esc(second?second.name:'—')+'</div></div>'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Лучшая атака</div><div class="title-font text-ef-pitch mt-1">'+esc(attack?attack.name+' • '+attack.gf:'—')+'</div></div>'+
      '<div class="tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase">Лучшая оборона</div><div class="title-font text-ef-blue mt-1">'+esc(defense?defense.name+' • '+defense.ga:'—')+'</div></div>'+
      '</div>'+
      '<article class="relative z-10 bg-black/30 border border-white/10 rounded-[26px] p-5 sm:p-6 text-white/80 leading-relaxed text-sm sm:text-base whitespace-pre-line">'+esc(article)+'</article>'+
      (bm?'<div class="relative z-10 mt-4 tile rounded-2xl p-4"><div class="text-[10px] text-white/40 font-black uppercase mb-1">Матч турнира</div><div class="title-font text-lg text-white">'+esc(bm.p1)+' '+bm.score1+':'+bm.score2+' '+esc(bm.p2)+'</div></div>':'')+
      '</div>';
  }
  function ensureSummaryTab(){
    if(byId('btn-tab-summary'))return;
    var tabs=byId('tabs-grid'); var main=document.querySelector('main'); if(!tabs||!main)return;
    tabs.className=(window.IS_ADMIN||false)?'grid grid-cols-5 gap-2':'grid grid-cols-4 gap-2';
    tabs.insertAdjacentHTML('beforeend','<button onclick="switchTab(\'tab-summary\')" id="btn-tab-summary" class="tab-btn px-2 py-3 rounded-2xl title-font text-[10px] sm:text-xs transition-all text-white/80 hover:bg-white/8 flex items-center justify-center gap-2"><i data-lucide="newspaper"></i><span>Итоги</span></button>');
    main.insertAdjacentHTML('beforeend','<section id="tab-summary" class="tab-content hidden"><div id="summary-content"></div></section>');
    var original=window.switchTab;
    window.switchTab=function(tabId){
      original(tabId);
      if(tabId==='tab-summary'){
        document.querySelectorAll('.tab-btn').forEach(function(btn){btn.className='tab-btn px-2 py-3 rounded-2xl title-font text-[10px] sm:text-xs transition-all text-white/80 hover:bg-white/8 flex items-center justify-center gap-2'});
        var active=byId('btn-tab-summary'); if(active)active.className='tab-btn px-2 py-3 rounded-2xl title-font text-[10px] sm:text-xs transition-all bg-ef-gold/25 text-white border border-ef-gold/30 flex items-center justify-center gap-2';
        renderSummary(); if(window.lucide)lucide.createIcons();
      }
    };
    var oldRenderAll=window.renderAll; if(typeof oldRenderAll==='function'){window.renderAll=function(){oldRenderAll(); renderSummary();}}
    var oldUpdate=window.updateTablesAndSchedules; if(typeof oldUpdate==='function'){window.updateTablesAndSchedules=function(){oldUpdate(); renderSummary();}}
    renderSummary(); if(window.lucide)lucide.createIcons();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureSummaryTab);else ensureSummaryTab();
})();