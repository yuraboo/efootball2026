(function(){
  const videos=[
    {title:'TOURNAMENT INTRO',label:'eFootball 2026 League Room',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781081277/Esports_intro_reveal_tournament___202606101147_do0n1i.mp4'},
    {title:'BEST MOMENTS #1',label:'Gameplay highlight',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348053/SHARE_20260613_1031370_ldkfzh.mp4'},
    {title:'BEST MOMENTS #2',label:'Gameplay highlight',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348036/SHARE_20260613_1050440_h6etzh.mp4'},
    {title:'BEST MOMENTS #3',label:'Gameplay highlight',src:'https://res.cloudinary.com/dc1ybvaxd/video/upload/v1781348036/SHARE_20260613_1052080_ebmk71.mp4'}
  ];
  let index=0;
  function setup(){
    const video=document.querySelector('.hero-video');
    if(!video)return;
    video.removeAttribute('loop');
    video.id='hero-playlist-video';
    video.style.transition='opacity .65s ease, filter .65s ease';
    const header=document.querySelector('header');
    if(header&&!document.getElementById('hero-now-playing')){
      header.insertAdjacentHTML('afterend',`<div id="hero-now-playing" class="w-full max-w-7xl mx-auto px-4 pt-5 relative z-40 pointer-events-none"><div class="max-w-md rounded-[28px] border border-ef-pitch/25 bg-black/35 backdrop-blur-md p-4 shadow-pitch"><div class="title-font text-[10px] text-ef-pitch uppercase tracking-[.22em] mb-2">NOW PLAYING</div><div id="hero-play-title" class="title-font text-xl sm:text-3xl text-white leading-tight">${videos[0].title}</div><div id="hero-play-label" class="text-white/50 text-xs sm:text-sm mt-2 font-bold">${videos[0].label}</div><div id="hero-play-dots" class="flex gap-2 mt-4">${videos.map((_,i)=>`<span class="hero-dot h-2 rounded-full ${i===0?'w-8 bg-ef-pitch shadow-pitch':'w-2 bg-white/30'}"></span>`).join('')}</div></div></div>`);
    }
    function renderMeta(){
      const t=document.getElementById('hero-play-title'),l=document.getElementById('hero-play-label'),dots=document.querySelectorAll('.hero-dot');
      if(t)t.textContent=videos[index].title;
      if(l)l.textContent=videos[index].label;
      dots.forEach((d,i)=>{d.className='hero-dot h-2 rounded-full transition-all '+(i===index?'w-8 bg-ef-pitch shadow-pitch':'w-2 bg-white/30')});
    }
    function playCurrent(){
      video.style.opacity='.18';
      video.style.filter='blur(4px) saturate(1.35)';
      setTimeout(()=>{
        video.src=videos[index].src;
        video.load();
        video.play().catch(()=>{});
        renderMeta();
        setTimeout(()=>{video.style.opacity='.96';video.style.filter='blur(0) saturate(1.05)'},180);
      },520);
    }
    video.addEventListener('ended',()=>{index=(index+1)%videos.length;playCurrent()});
    setInterval(()=>{index=(index+1)%videos.length;playCurrent()},18000);
    renderMeta();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();