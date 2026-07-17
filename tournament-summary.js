(function(){
  'use strict';
  function loadControls(){
    if(document.querySelector('script[data-technical-fixes]'))return;
    var script=document.createElement('script');
    script.src='./technical-fixes.js?v=6';
    script.async=false;
    script.setAttribute('data-technical-fixes','1');
    document.body.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadControls);else loadControls();
})();