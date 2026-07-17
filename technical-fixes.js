(function(){
  'use strict';

  var writeQueue=Promise.resolve();
  var stateDocument=null;
  var authReadyPromise=null;

  function byId(id){return document.getElementById(id)}
  function isAdmin(){return window.IS_ADMIN===true}
  function toast(text,isError){if(typeof window.showToast==='function')window.showToast(text,!!isError)}
  function clone(value){return JSON.parse(JSON.stringify(value))}
  function setStatus(text){var el=byId('sync-status');if(el)el.textContent=text}

  function getDocument(){
    if(!stateDocument)stateDocument=firebase.firestore().collection('tournament').doc('state');
    return stateDocument;
  }

  function renderEverything(){
    try{
      if(typeof window.renderMatches==='function')window.renderMatches();
      if(typeof window.calculateLeagueTable==='function')window.calculateLeagueTable();
      if(typeof window.renderProfiles==='function')window.renderProfiles();
      if(typeof window.renderNextMatch==='function')window.renderNextMatch();
      if(typeof window.refreshIcons==='function')window.refreshIcons();
      if(typeof window.renderAll==='function')window.renderAll();
    }catch(error){
      console.error('Ошибка обновления интерфейса',error);
    }
  }

  function loadAuthSdk(){
    if(firebase.auth)return Promise.resolve();
    return new Promise(function(resolve,reject){
      var existing=document.querySelector('script[data-firebase-auth]');
      if(existing){
        if(firebase.auth){resolve();return}
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      var script=document.createElement('script');
      script.src='https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js';
      script.async=false;
      script.setAttribute('data-firebase-auth','1');
      script.onload=resolve;
      script.onerror=function(){reject(new Error('Не удалось загрузить Firebase Auth'))};
      document.head.appendChild(script);
    });
  }

  function ensureAuthenticated(){
    if(authReadyPromise)return authReadyPromise;
    authReadyPromise=loadAuthSdk().then(async function(){
      var auth=firebase.auth();
      if(auth.currentUser)return auth.currentUser;
      var result=await auth.signInAnonymously();
      return result.user;
    });
    return authReadyPromise;
  }

  function saveLocal(snapshot){
    localStorage.setItem('ef_tournament_state',JSON.stringify(snapshot));
  }

  function readableFirebaseError(error){
    var code=(error&&error.code)||'';
    if(code.indexOf('permission-denied')!==-1)return 'Firebase запретил запись. Проверьте правила Firestore.';
    if(code.indexOf('operation-not-allowed')!==-1)return 'В Firebase не включена анонимная авторизация.';
    if(code.indexOf('network')!==-1||code.indexOf('unavailable')!==-1)return 'Нет соединения с Firebase.';
    return (error&&error.message)||'Неизвестная ошибка Firebase';
  }

  function saveRemote(snapshot,message){
    writeQueue=writeQueue.then(async function(){
      try{
        setStatus('Firebase: сохранение...');
        await ensureAuthenticated();
        await getDocument().set(snapshot,{merge:false});
        setStatus('Firebase: сохранено для всех');
        if(message)toast(message);
        return true;
      }catch(error){
        console.error('Ошибка сохранения турнира',error);
        setStatus('Локально сохранено • Firebase: ошибка');
        toast(readableFirebaseError(error),true);
        return false;
      }
    });
    return writeQueue;
  }

  function saveCurrent(message){
    if(!isAdmin()||!window.state)return Promise.resolve(false);
    var snapshot=clone(window.state);
    saveLocal(snapshot);
    return saveRemote(snapshot,message);
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
    saveCurrent('Количество кругов сохранено: '+window.state.leagueRounds);
  };

  window.toggleModeSelect=function(mode){
    if(!isAdmin()||!window.state)return;
    window.state.mode=mode==='playoff'?'playoff':'league';
    document.querySelectorAll('input[name="tournament-mode"]').forEach(function(input){input.checked=input.value===window.state.mode});
    saveCurrent('Режим турнира сохранён');
  };

  window.openScoreModal=function(id){
    if(!isAdmin()||!window.state)return;
    var match=(window.state.matches||[]).find(function(item){return Number(item.id)===Number(id)});
    if(!match){toast('Матч не найден',true);return}
    var modal=byId('score-modal');
    var p1=byId('modal-p1-name'),p2=byId('modal-p2-name'),s1=byId('modal-p1-score'),s2=byId('modal-p2-score');
    if(!modal||!s1||!s2){toast('Окно ввода счёта не найдено',true);return}
    modal.dataset.matchId=String(id);
    if(p1)p1.textContent=match.p1;
    if(p2)p2.textContent=match.p2;
    s1.value=match.completed?match.score1:'';
    s2.value=match.completed?match.score2:'';
    modal.classList.remove('hidden');
    setTimeout(function(){s1.focus()},0);
  };

  window.closeScoreModal=function(){var modal=byId('score-modal');if(modal)modal.classList.add('hidden')};

  function applyScore(){
    if(!isAdmin()||!window.state)return false;
    var modal=byId('score-modal');
    var id=Number(modal&&modal.dataset.matchId);
    var s1=parseInt((byId('modal-p1-score')||{}).value,10);
    var s2=parseInt((byId('modal-p2-score')||{}).value,10);
    if(!Number.isInteger(s1)||!Number.isInteger(s2)||s1<0||s2<0){toast('Введите корректный счёт',true);return false}
    var match=(window.state.matches||[]).find(function(item){return Number(item.id)===id});
    if(!match){toast('Не удалось определить выбранный матч',true);return false}
    match.score1=s1;
    match.score2=s2;
    match.completed=true;
    saveLocal(clone(window.state));
    window.closeScoreModal();
    renderEverything();
    toast('Результат внесён, таблица обновлена');
    saveRemote(clone(window.state),'Результат сохранён для всех');
    return true;
  }

  window.saveMatchScore=function(){applyScore()};

  window.saveSharedState=function(show){
    return saveCurrent(show===false?'':'Все данные турнира сохранены');
  };

  window.updateRating=function(encodedName,value){
    if(!isAdmin()||!window.state)return;
    var name=decodeURIComponent(encodedName);
    if(!window.state.profiles[name])window.state.profiles[name]={rating:100,photo:'',photoUrl:''};
    window.state.profiles[name].rating=Number(value)||0;
    renderEverything();
    saveCurrent('Рейтинг игрока сохранён');
  };

  window.updatePhotoUrl=function(encodedName,value){
    if(!isAdmin()||!window.state)return;
    var name=decodeURIComponent(encodedName);
    if(!window.state.profiles[name])window.state.profiles[name]={rating:100,photo:'',photoUrl:''};
    window.state.profiles[name].photoUrl=String(value||'').trim();
    renderEverything();
    saveCurrent('Фото игрока сохранено');
  };

  function interceptModalButtons(event){
    if(!isAdmin())return;
    var modal=byId('score-modal');
    if(!modal||modal.classList.contains('hidden'))return;
    var button=event.target.closest&&event.target.closest('button');
    if(!button||!modal.contains(button))return;
    var action=button.getAttribute('onclick')||'';
    if(action.indexOf('saveMatchScore')!==-1){
      event.preventDefault();
      event.stopImmediatePropagation();
      applyScore();
    }else if(action.indexOf('closeScoreModal')!==-1){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.closeScoreModal();
    }
  }

  function setup(){
    document.addEventListener('click',interceptModalButtons,true);
    paintRounds();
    ensureAuthenticated().then(function(){setStatus('Firebase: администратор подключён')}).catch(function(error){setStatus('Firebase: '+readableFirebaseError(error))});
    var observer=new MutationObserver(paintRounds);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();