(function(){
  'use strict';

  function byId(id){return document.getElementById(id)}
  function toast(text,isError){if(typeof window.showToast==='function')window.showToast(text,!!isError)}

  function exportCoreHandlers(){
    try{
      if(typeof setLeagueRounds==='function')window.setLeagueRounds=setLeagueRounds;
      if(typeof updateRoundButtons==='function')window.updateRoundButtons=updateRoundButtons;
      if(typeof openScoreModal==='function')window.openScoreModal=openScoreModal;
      if(typeof closeScoreModal==='function')window.closeScoreModal=closeScoreModal;
      if(typeof saveMatchScore==='function')window.saveMatchScore=saveMatchScore;
      if(typeof saveCurrentState==='function')window.saveCurrentState=saveCurrentState;
      if(typeof renderAll==='function')window.renderAll=renderAll;
    }catch(e){console.error('Не удалось экспортировать обработчики',e)}
  }

  function selectRounds(rounds){
    if(!window.IS_ADMIN){toast('Изменение доступно только администратору',true);return}
    if(!window.state)return;
    window.state.leagueRounds=rounds;
    if(typeof window.saveCurrentState==='function')window.saveCurrentState();
    if(typeof window.updateRoundButtons==='function')window.updateRoundButtons();
    [2,3,4,5,6].forEach(function(r){
      var button=byId('btn-round-'+r);
      if(!button)return;
      button.setAttribute('aria-pressed',String(r===rounds));
    });
    toast('Выбрано кругов: '+rounds);
  }

  function openScore(id){
    if(!window.IS_ADMIN){toast('Ввод счёта доступен только администратору',true);return}
    var match=window.state&&window.state.matches&&window.state.matches.find(function(item){return Number(item.id)===Number(id)});
    if(!match){toast('Матч не найден',true);return}
    window.activeMatchId=Number(id);
    var p1=byId('modal-p1-name'),p2=byId('modal-p2-name'),s1=byId('modal-p1-score'),s2=byId('modal-p2-score'),modal=byId('score-modal');
    if(!modal||!s1||!s2){toast('Окно ввода счёта не найдено',true);return}
    if(p1)p1.textContent=match.p1;
    if(p2)p2.textContent=match.p2;
    s1.value=match.completed?match.score1:'';
    s2.value=match.completed?match.score2:'';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    setTimeout(function(){s1.focus()},0);
  }

  function closeScore(){
    var modal=byId('score-modal');
    if(modal){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true')}
  }

  function saveScore(){
    if(!window.IS_ADMIN)return;
    var s1=parseInt((byId('modal-p1-score')||{}).value,10);
    var s2=parseInt((byId('modal-p2-score')||{}).value,10);
    if(!Number.isInteger(s1)||!Number.isInteger(s2)||s1<0||s2<0){toast('Введите корректный счёт',true);return}
    var id=Number(window.activeMatchId);
    var match=window.state&&window.state.matches&&window.state.matches.find(function(item){return Number(item.id)===id});
    if(!match){toast('Не удалось определить матч',true);return}
    match.score1=s1;
    match.score2=s2;
    match.completed=true;
    if(typeof window.saveCurrentState==='function')window.saveCurrentState();
    if(typeof window.renderAll==='function')window.renderAll();
    closeScore();
    toast('Результат сохранён. Нажмите «СОХРАНИТЬ», чтобы отправить его всем.');
  }

  function handleClick(event){
    var roundButton=event.target.closest&&event.target.closest('[id^="btn-round-"]');
    if(roundButton){
      event.preventDefault();event.stopPropagation();
      selectRounds(Number(roundButton.id.replace('btn-round-','')));
      return;
    }

    var scoreButton=event.target.closest&&event.target.closest('#matches-container button');
    if(scoreButton){
      var raw=scoreButton.getAttribute('onclick')||'';
      var found=raw.match(/openScoreModal\((\d+)\)/);
      if(found){event.preventDefault();event.stopPropagation();openScore(Number(found[1]));return}
    }

    var modal=byId('score-modal');
    if(modal&&!modal.classList.contains('hidden')){
      var button=event.target.closest&&event.target.closest('button');
      if(!button)return;
      var action=button.getAttribute('onclick')||'';
      if(action.indexOf('saveMatchScore')!==-1){event.preventDefault();event.stopPropagation();saveScore()}
      else if(action.indexOf('closeScoreModal')!==-1){event.preventDefault();event.stopPropagation();closeScore()}
    }
  }

  function normalizeButtons(){
    document.querySelectorAll('button').forEach(function(button){button.type='button'});
    var modal=byId('score-modal');
    if(modal)modal.setAttribute('aria-hidden',modal.classList.contains('hidden')?'true':'false');
  }

  function setup(){
    exportCoreHandlers();
    normalizeButtons();
    document.addEventListener('click',handleClick,true);
    var observer=new MutationObserver(normalizeButtons);
    observer.observe(document.body,{childList:true,subtree:true});
    if(typeof window.updateRoundButtons==='function')window.updateRoundButtons();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
