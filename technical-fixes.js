(function(){
  'use strict';

  var selectedMatchId=null;
  var saveChain=Promise.resolve();

  function byId(id){return document.getElementById(id)}
  function toast(text,isError){if(typeof window.showToast==='function')window.showToast(text,!!isError)}
  function isAdmin(){return window.IS_ADMIN===true}
  function cloneState(){return JSON.parse(JSON.stringify(window.state||{}))}

  function persist(message){
    if(!isAdmin()||!window.state)return Promise.resolve(false);
    var snapshot=cloneState();
    saveChain=saveChain.then(async function(){
      var status=byId('sync-status');
      try{
        if(status)status.textContent='Firestore: сохранение...';
        await firebase.firestore().collection('tournament').doc('state').set(snapshot);
        localStorage.setItem('ef_tournament_state',JSON.stringify(snapshot));
        if(status)status.textContent='Firestore: сохранено для всех';
        if(message)toast(message);
        return true;
      }catch(error){
        console.error('Ошибка сохранения',error);
        if(status)status.textContent='Firestore: ошибка сохранения';
        toast('Не удалось сохранить изменения',true);
        return false;
      }
    });
    return saveChain;
  }

  function refresh(){
    if(typeof window.renderAll==='function')window.renderAll();
    else if(typeof renderAll==='function')renderAll();
  }

  function paintRounds(){
    var current=Number((window.state||{}).leagueRounds)||2;
    [2,3,4,5,6].forEach(function(r){
      var b=byId('btn-round-'+r);if(!b)return;
      b.className=r===current?'px-3 py-2 bg-ef-pitch text-black font-black text-[10px] rounded-full transition-all':'px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] rounded-full transition-all';
      b.setAttribute('aria-pressed',String(r===current));
    });
  }

  function chooseRounds(rounds){
    if(!isAdmin())return;
    window.state.leagueRounds=rounds;
    paintRounds();
    persist('Выбрано кругов: '+rounds);
  }

  function chooseMode(mode){
    if(!isAdmin())return;
    window.state.mode=mode;
    document.querySelectorAll('input[name="tournament-mode"]').forEach(function(input){input.checked=input.value===mode});
    persist(mode==='league'?'Выбран режим лиги':'Выбран режим плей-офф');
  }

  function openScore(id){
    if(!isAdmin())return;
    var match=(window.state.matches||[]).find(function(m){return Number(m.id)===Number(id)});
    if(!match){toast('Матч не найден',true);return}
    selectedMatchId=Number(id);
    byId('modal-p1-name').textContent=match.p1;
    byId('modal-p2-name').textContent=match.p2;
    byId('modal-p1-score').value=match.completed?match.score1:'';
    byId('modal-p2-score').value=match.completed?match.score2:'';
    byId('score-modal').classList.remove('hidden');
  }

  function closeScore(){var modal=byId('score-modal');if(modal)modal.classList.add('hidden')}

  async function saveScore(){
    var s1=Number(byId('modal-p1-score').value),s2=Number(byId('modal-p2-score').value);
    if(!Number.isInteger(s1)||!Number.isInteger(s2)||s1<0||s2<0){toast('Введите корректный счёт',true);return}
    var match=(window.state.matches||[]).find(function(m){return Number(m.id)===Number(selectedMatchId)});
    if(!match){toast('Матч не найден',true);return}
    match.score1=s1;match.score2=s2;match.completed=true;
    localStorage.setItem('ef_tournament_state',JSON.stringify(window.state));
    closeScore();
    var saved=await persist('Результат сохранён для всех');
    if(saved)refresh();
  }

  function updateProfile(input){
    if(!isAdmin())return;
    var card=input.closest('#profiles-container > div');
    if(!card)return;
    var nameNode=card.querySelector('.title-font.text-lg');
    if(!nameNode)return;
    var name=nameNode.textContent.trim();
    if(!window.state.profiles[name])window.state.profiles[name]={rating:100,photo:'',photoUrl:''};
    if(input.type==='number')window.state.profiles[name].rating=Number(input.value)||0;
    if(input.type==='url')window.state.profiles[name].photoUrl=input.value.trim();
    persist('Профиль игрока сохранён');
  }

  function isMainSaveButton(button){
    return button&&((button.getAttribute('onclick')||'').indexOf('saveSharedState')!==-1);
  }

  function handleClick(event){
    if(!isAdmin())return;
    var round=event.target.closest('[id^="btn-round-"]');
    if(round){event.preventDefault();event.stopImmediatePropagation();chooseRounds(Number(round.id.split('-').pop()));return}

    var score=event.target.closest('#matches-container button');
    if(score){
      var found=(score.getAttribute('onclick')||'').match(/openScoreModal\((\d+)\)/);
      if(found){event.preventDefault();event.stopImmediatePropagation();openScore(Number(found[1]));return}
    }

    var clickedButton=event.target.closest('button');
    if(isMainSaveButton(clickedButton)){
      event.preventDefault();event.stopImmediatePropagation();
      persist('Все изменения сохранены для всех');
      return;
    }

    var modal=byId('score-modal');
    if(modal&&!modal.classList.contains('hidden')){
      var btn=event.target.closest('button');
      if(btn){
        var action=btn.getAttribute('onclick')||'';
        if(action.indexOf('saveMatchScore')!==-1){event.preventDefault();event.stopImmediatePropagation();saveScore();return}
        if(action.indexOf('closeScoreModal')!==-1){event.preventDefault();event.stopImmediatePropagation();closeScore();return}
      }
    }
  }

  function handleChange(event){
    if(!isAdmin())return;
    var mode=event.target.closest('input[name="tournament-mode"]');
    if(mode){event.stopImmediatePropagation();chooseMode(mode.value);return}
    if(event.target.closest('#profiles-container')&&(event.target.type==='number'||event.target.type==='url')){
      event.stopImmediatePropagation();updateProfile(event.target);
    }
  }

  function setup(){
    document.addEventListener('click',handleClick,true);
    document.addEventListener('change',handleChange,true);
    paintRounds();
    var observer=new MutationObserver(paintRounds);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();