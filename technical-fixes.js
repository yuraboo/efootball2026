(function(){
  'use strict';

  var selectedMatchId=null;
  var writeQueue=Promise.resolve();
  var stateDocument=null;

  function byId(id){return document.getElementById(id)}
  function isAdmin(){return window.IS_ADMIN===true}
  function toast(text,isError){if(typeof window.showToast==='function')window.showToast(text,!!isError)}
  function clone(value){return JSON.parse(JSON.stringify(value))}

  function getDocument(){
    if(!stateDocument)stateDocument=firebase.firestore().collection('tournament').doc('state');
    return stateDocument;
  }

  function setStatus(text){var el=byId('sync-status');if(el)el.textContent=text}

  function renderEverything(){
    if(typeof window.renderAll==='function')window.renderAll();
    else{
      if(typeof window.renderMatches==='function')window.renderMatches();
      if(typeof window.calculateLeagueTable==='function')window.calculateLeagueTable();
      if(typeof window.renderProfiles==='function')window.renderProfiles();
    }
  }

  function saveAndVerify(message){
    if(!isAdmin()||!window.state)return Promise.resolve(false);
    var snapshot=clone(window.state);
    writeQueue=writeQueue.then(async function(){
      try{
        setStatus('Firestore: сохранение...');
        await getDocument().set(snapshot);
        var check=await getDocument().get({source:'server'}).catch(function(){return getDocument().get()});
        if(!check.exists)throw new Error('Документ турнира не найден после сохранения');
        var confirmed=check.data();
        window.state=confirmed;
        localStorage.setItem('ef_tournament_state',JSON.stringify(confirmed));
        renderEverything();
        setStatus('Firestore: сохранено и проверено');
        if(message)toast(message);
        return true;
      }catch(error){
        console.error('Ошибка сохранения турнира',error);
        setStatus('Firestore: ошибка сохранения');
        toast('Ошибка: данные не были сохранены',true);
        return false;
      }
    });
    return writeQueue;
  }

  function paintRounds(){
    var current=Number((window.state||{}).leagueRounds)||2;
    [2,3,4,5,6].forEach(function(r){
      var b=byId('btn-round-'+r);if(!b)return;
      b.className=r===current?'px-3 py-2 bg-ef-pitch text-black font-black text-[10px] rounded-full transition-all':'px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] rounded-full transition-all';
      b.setAttribute('aria-pressed',String(r===current));
    });
  }

  window.setLeagueRounds=function(rounds,event){
    if(event)event.preventDefault();
    if(!isAdmin()||!window.state)return;
    window.state.leagueRounds=Number(rounds)||2;
    paintRounds();
    saveAndVerify('Количество кругов сохранено: '+window.state.leagueRounds);
  };

  window.toggleModeSelect=function(mode){
    if(!isAdmin()||!window.state)return;
    window.state.mode=mode==='playoff'?'playoff':'league';
    document.querySelectorAll('input[name="tournament-mode"]').forEach(function(input){input.checked=input.value===window.state.mode});
    saveAndVerify('Режим турнира сохранён');
  };

  window.openScoreModal=function(id){
    if(!isAdmin()||!window.state)return;
    var match=(window.state.matches||[]).find(function(item){return Number(item.id)===Number(id)});
    if(!match){toast('Матч не найден',true);return}
    selectedMatchId=Number(id);
    var p1=byId('modal-p1-name'),p2=byId('modal-p2-name'),s1=byId('modal-p1-score'),s2=byId('modal-p2-score'),modal=byId('score-modal');
    if(!modal||!s1||!s2){toast('Окно ввода счёта не найдено',true);return}
    if(p1)p1.textContent=match.p1;
    if(p2)p2.textContent=match.p2;
    s1.value=match.completed?match.score1:'';
    s2.value=match.completed?match.score2:'';
    modal.classList.remove('hidden');
    setTimeout(function(){s1.focus()},0);
  };

  window.closeScoreModal=function(){var modal=byId('score-modal');if(modal)modal.classList.add('hidden')};

  window.saveMatchScore=async function(){
    if(!isAdmin()||!window.state)return;
    var s1=parseInt((byId('modal-p1-score')||{}).value,10);
    var s2=parseInt((byId('modal-p2-score')||{}).value,10);
    if(!Number.isInteger(s1)||!Number.isInteger(s2)||s1<0||s2<0){toast('Введите корректный счёт',true);return}
    var match=(window.state.matches||[]).find(function(item){return Number(item.id)===Number(selectedMatchId)});
    if(!match){toast('Не удалось определить выбранный матч',true);return}
    match.score1=s1;
    match.score2=s2;
    match.completed=true;
    var saved=await saveAndVerify('Результат сохранён, таблица обновлена');
    if(saved)window.closeScoreModal();
  };

  window.saveSharedState=async function(show){
    var message=show===false?'':'Все данные турнира сохранены';
    return saveAndVerify(message);
  };

  window.updateRating=function(encodedName,value){
    if(!isAdmin()||!window.state)return;
    var name=decodeURIComponent(encodedName);
    if(!window.state.profiles[name])window.state.profiles[name]={rating:100,photo:'',photoUrl:''};
    window.state.profiles[name].rating=Number(value)||0;
    saveAndVerify('Рейтинг игрока сохранён');
  };

  window.updatePhotoUrl=function(encodedName,value){
    if(!isAdmin()||!window.state)return;
    var name=decodeURIComponent(encodedName);
    if(!window.state.profiles[name])window.state.profiles[name]={rating:100,photo:'',photoUrl:''};
    window.state.profiles[name].photoUrl=String(value||'').trim();
    saveAndVerify('Фото игрока сохранено');
  };

  function setup(){
    paintRounds();
    var observer=new MutationObserver(paintRounds);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();