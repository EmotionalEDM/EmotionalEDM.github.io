(() => {
  const BPM = 64, JUDGE_Y = 50, NOTE_H = 64;
  const audio = document.querySelector('#music');
  const screens = { select: document.querySelector('#select-screen'), game: document.querySelector('#game-screen'), result: document.querySelector('#result-screen') };
  const field = document.querySelector('#playfield'), speed = document.querySelector('#drop-speed'), syncOffset = document.querySelector('#sync-offset'), difficulty = document.querySelector('#difficulty'), songSelect = document.querySelector('#song-select');
  const startButton = document.querySelector('#start-button'), loadStatus = document.querySelector('#load-status');
  const speedAlert = document.querySelector('#speed-alert');
  const starField = document.querySelector('#star-field');
  const songSources = { 'under-the-sun':'music1.mp3', 'energy-action':'music2.mp3', 'edm-party':'music3.mp3' };
  const songTitles = { 'under-the-sun':'Under The Sun', 'energy-action':'Energy Action', 'edm-party':'EDM Party' };
  const trackIds = Object.keys(songSources);
  const difficultyMeta = { 1:{label:'简单',className:'difficulty-easy'}, 2:{label:'中等',className:'difficulty-medium'}, 4:{label:'困难',className:'difficulty-hard'} };
  const rewardColors = [
    {main:'#45a7ff',light:'#b9e5ff'}, {main:'#48d97d',light:'#bcffd1'}, {main:'#ffd83d',light:'#fff5a4'},
    {main:'#ff65c4',light:'#ffd1ee'}, {main:'#ff2548',light:'#ffb6c0'}, {main:'#ffffff',light:'#ffffff'}, {main:'#ff9b35',light:'#ffe0ab'}
  ];
  const els = Object.fromEntries(['speed-value','score','combo','rate','life-bar','life-text','judgement','final-score','result-detail','current-song','current-difficulty','result-difficulty'].map(id => [id, document.getElementById(id)]));
  let state, raf = 0, betweenLoops = false, audioReady = false, roundTimer = 0, activeTrack = null, trackReadyCallback = null, starTimer = 0, starRun = 0;
  const touchPointers = new Map();
  const randomLanes = () => { const a=[0,1,2,3]; for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a.slice(0,1+Math.floor(Math.random()*4)); };
  function show(name) { Object.entries(screens).forEach(([key,node]) => node.hidden = key !== name); }
  function updateDifficulty(element) { element.textContent=state.difficulty.label; element.className=`difficulty-text ${state.difficulty.className}`; }
  function updateHud() { els.score.textContent=state.score; els.combo.textContent=state.combo; els.rate.textContent=`${state.rate.toFixed(1)}× / ${(BPM*state.rate).toFixed(1)}`; els['life-bar'].style.width=`${state.life}%`; els['life-text'].textContent=`${state.life} / 100`; els['current-song'].textContent=`当前播放：${songTitles[activeTrack]}`; updateDifficulty(els['current-difficulty']); }
  function clearVisualNotes() { [...field.querySelectorAll('.note')].forEach(note => note.remove()); }
  function makeChart() {
    clearVisualNotes(); state.notes=[];
    // 歌曲末尾没有足够时间让方块完成判定，预留 16 次打击的安全区。
    const chartEnd=Math.max(0,audio.duration-state.step*16);
    for(let t=0; t<chartEnd; t+=state.step) for(const lane of randomLanes()) state.notes.push({lane,time:t,done:false,element:null});
    state.speedMarkers=[audio.duration/4,audio.duration/2,audio.duration*3/4];
    state.nextSpeedIndex=0; state.speedWarningShown=false;
  }
  function start() {
    if (!audioReady) { loadStatus.textContent='歌曲仍在读取中，请稍候再点击。'; return; }
    stopStarfall(); const hitsPerBeat=+difficulty.value;
    state={life:100,score:0,combo:0,perfect:0,great:0,bad:0,miss:0,rate:1,drop:+speed.value,offset:+syncOffset.value/1000+.210,hitsPerBeat,difficulty:difficultyMeta[hitsPerBeat],step:60/BPM/hitsPerBeat,notes:[]};
    audio.currentTime=0; audio.playbackRate=1; makeChart(); updateHud(); show('game'); beginRound(); tick();
  }
  function finish() { state.finished=true; clearTimeout(roundTimer); cancelAnimationFrame(raf); audio.pause(); stopStarfall(); clearVisualNotes(); els['final-score'].textContent=state.score; updateDifficulty(els['result-difficulty']); els['result-detail'].innerHTML=`<span>Perfect ${state.perfect}</span><span>Great ${state.great}</span><span>Bad ${state.bad}</span><span>Miss ${state.miss}</span>`; show('result'); }
  function judge(note, type) {
    if(note.done || !state) return; note.done=true; note.element?.remove();
    const wasReward=state.combo>=100;
    if(type==='perfect') { state.score+=3; state.combo++; state.perfect++; if(state.perfect%3===0) state.life=Math.min(100,state.life+1); }
    else if(type==='great') { state.score+=2; state.combo++; state.great++; }
    else { state.combo=0; state[type]++; state.life-=type==='bad'?5:10; }
    const hasReward=state.combo>=100;
    if(wasReward !== hasReward) {
      refreshVisibleNoteColors();
      if(hasReward) { triggerComboEffect(); startStarfall(); } else stopStarfall();
    }
    els.judgement.textContent=type.toUpperCase(); els.judgement.style.color=({perfect:'#ffe778',great:'#75eaff',bad:'#ff9e55',miss:'#ff637b'})[type]; updateHud();
    if(state.life<=0) { state.life=0; updateHud(); finish(); }
  }
  function renderNote(note, realDelta) {
    const approach = 1.85 / state.drop; // real seconds of travel
    if(realDelta > approach || note.done) return;
    if(!note.element) { const node=document.createElement('div'); node.className='note'; node.style.left=`${note.lane*25}%`; field.append(node); note.element=node; applyNoteColor(node); }
    const progress=1-realDelta/approach, height=field.clientHeight, target=height-JUDGE_Y-NOTE_H/2;
    note.element.style.top=`${progress*target-NOTE_H/2}px`;
  }
  function applyNoteColor(node) {
    if(state.combo>=100) {
      const color=rewardColors[Math.floor(Math.random()*rewardColors.length)];
      node.style.background=`linear-gradient(135deg,${color.light},${color.main})`;
      node.style.boxShadow=`0 5px 14px ${color.main}99`;
    } else { node.style.background=''; node.style.boxShadow=''; }
  }
  function refreshVisibleNoteColors() { [...field.querySelectorAll('.note')].forEach(applyNoteColor); }
  function triggerSpeedEffect() {
    const effect=document.createElement('div'); effect.className='speed-rush'; field.append(effect);
    effect.addEventListener('animationend', () => effect.remove(), {once:true});
  }
  function triggerComboEffect() {
    const effect=document.createElement('div'); effect.className='combo-rush'; field.append(effect);
    effect.addEventListener('animationend', () => effect.remove(), {once:true});
  }
  function spawnStar() {
    const color=rewardColors[Math.floor(Math.random()*rewardColors.length)];
    const star=document.createElement('span'); star.className='falling-star'; star.textContent=Math.random()>.45?'✦':'✧';
    star.style.left=`${Math.random()*100}%`; star.style.setProperty('--star-color',color.main);
    star.style.setProperty('--star-size',`${12+Math.random()*18}px`); star.style.setProperty('--star-duration',`${6+Math.random()*5}s`);
    star.style.setProperty('--star-drift',`${-70+Math.random()*140}px`); starField.append(star);
    star.addEventListener('animationend', () => star.remove(), {once:true});
  }
  function startStarfall() {
    if(starTimer) return; const run=++starRun;
    for(let i=0;i<12;i++) setTimeout(() => { if(run===starRun) spawnStar(); },i*110);
    starTimer=setInterval(() => { if(run===starRun) spawnStar(); },480);
  }
  function stopStarfall() { starRun++; clearInterval(starTimer); starTimer=0; starField.replaceChildren(); }
  function beginRound() {
    betweenLoops=true; state.counting=true; audio.pause(); audio.currentTime=0;
    speedAlert.textContent='';
    const beatMs=60000/(BPM*state.rate), words=['3','2','1','Go!!'];
    state.musicStartAt=performance.now()+beatMs*4;
    function count(index) {
      if(!state || state.finished) return;
      if(index===4) {
        state.counting=false; betweenLoops=false; state.musicStartAt=performance.now();
        els.judgement.textContent=''; audio.play().catch(() => { els.judgement.textContent='无法播放歌曲'; els.judgement.style.color='#ff637b'; }); return;
      }
      els.judgement.textContent=words[index]; els.judgement.style.color=index===3?'#75eaff':'#ffe778';
      roundTimer=setTimeout(() => count(index+1),beatMs);
    }
    count(0);
  }
  function startNextRound() {
    if(!state || state.life<=0 || state.finished) return;
    audio.playbackRate=state.rate; audio.currentTime=0; makeChart(); updateHud(); triggerSpeedEffect(); beginRound();
  }
  function nextLoop() {
    betweenLoops=true; state.counting=false; clearVisualNotes(); els.judgement.textContent='下一轮准备中…';
    roundTimer=setTimeout(() => {
      if(!state || state.life<=0 || state.finished) return;
      state.rate=+(state.rate+.1).toFixed(1);
      if(songSelect.value==='random') loadTrack(randomTrack(activeTrack), startNextRound);
      else startNextRound();
    },1000);
  }
  function updateMidSongSpeed(now) {
    const marker=state.speedMarkers[state.nextSpeedIndex];
    if(marker===undefined) return;
    const secondsUntil=(marker-now)/state.rate;
    if(!state.speedWarningShown && secondsUntil>0 && secondsUntil<=5) {
      state.speedWarningShown=true; speedAlert.textContent='要加速了哟！！';
    }
    if(now>=marker) {
      state.rate=+(state.rate+.1).toFixed(1); audio.playbackRate=state.rate;
      state.nextSpeedIndex++; state.speedWarningShown=false; speedAlert.textContent=''; updateHud(); triggerSpeedEffect();
    }
  }
  function tick() {
    if(!state) return; const now=audio.currentTime;
    if(state.counting) {
      for(const note of state.notes) renderNote(note, (state.musicStartAt-performance.now())/1000 + note.time/state.rate + state.offset);
    } else if(!betweenLoops) {
      updateMidSongSpeed(now);
      for(const note of state.notes) { const realDelta=(note.time-now)/state.rate+state.offset; if(!note.done && realDelta < -.140) judge(note,'miss'); renderNote(note,realDelta); }
    }
    if(audio.ended && !betweenLoops && state.life>0) nextLoop();
    raf=requestAnimationFrame(tick);
  }
  function press(lane) {
    if(!state || screens.game.hidden || betweenLoops) return;
    // 同轨只处理画面中最靠近判定线（位置最低）的方块，绝不跳过它去判定后面的方块。
    const candidates=state.notes.filter(n=>n.lane===lane&&!n.done&&n.element); if(!candidates.length)return;
    const note=candidates.reduce((lowest,current)=>current.element.offsetTop>lowest.element.offsetTop?current:lowest);
    const ms=((audio.currentTime-note.time)/state.rate-state.offset)*1000;
    let type; if(Math.abs(ms)<=40) type='perfect'; else if(Math.abs(ms)<=80) type='great'; else if(ms>=-140&&ms<-80) type='bad'; else type='miss'; judge(note,type);
  }
  speed.addEventListener('input',()=>els['speed-value'].textContent=`${(+speed.value).toFixed(2)}×`);
  syncOffset.addEventListener('input',()=>{ const value=+syncOffset.value; document.querySelector('#offset-value').textContent=`${value>0?'+':''}${value} ms`; });
  function randomTrack(exclude) {
    const choices=trackIds.filter(track => track!==exclude);
    return choices[Math.floor(Math.random()*choices.length)];
  }
  function loadTrack(track, onReady=null) {
    audioReady=false; audio.pause(); audio.playbackRate=1;
    startButton.disabled=true; startButton.textContent='正在载入歌曲…'; loadStatus.textContent='正在读取歌曲…';
    activeTrack=track; trackReadyCallback=onReady;
    audio.src=songSources[track]; audio.load();
  }
  function loadSelectedSong() { loadTrack(songSelect.value==='random' ? randomTrack(activeTrack) : songSelect.value); }
  songSelect.addEventListener('change', loadSelectedSong);
  startButton.onclick=start; document.querySelector('#retry-button').onclick=()=>show('select');
  function markAudioReady() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audioReady=true; startButton.disabled=false;
    startButton.textContent='开始游戏'; loadStatus.textContent=`歌曲已载入（${audio.duration.toFixed(1)} 秒）`;
    const callback=trackReadyCallback; trackReadyCallback=null; callback?.();
  }
  ['loadedmetadata','loadeddata','canplay','canplaythrough','durationchange'].forEach(event => audio.addEventListener(event, markAudioReady));
  audio.addEventListener('error', () => { audioReady=false; trackReadyCallback=null; startButton.disabled=true; loadStatus.textContent=`歌曲无法读取（错误 ${audio.error?.code ?? '未知'}）：请使用 run_game.bat 打开的浏览器页面。`; });
  loadSelectedSong();
  setTimeout(() => { if (!audioReady) loadStatus.textContent='歌曲读取超时：刷新重试'; }, 8000);
  document.addEventListener('keydown', e=>{ const lane={s:0,d:1,j:2,k:3}[e.key.toLowerCase()]; if(lane===undefined || e.repeat) return; e.preventDefault(); field.querySelector(`[data-lane="${lane}"]`)?.classList.add('active'); press(lane); });
  document.addEventListener('keyup', e=>{const lane={s:0,d:1,j:2,k:3}[e.key.toLowerCase()]; if(lane!==undefined)field.querySelector(`[data-lane="${lane}"]`)?.classList.remove('active');});
  function touchLaneFromEvent(event) {
    const rect=field.getBoundingClientRect();
    return Math.max(0,Math.min(3,Math.floor((event.clientX-rect.left)/(rect.width/4))));
  }
  function refreshTouchLanes() {
    for(let lane=0;lane<4;lane++) field.querySelector(`[data-lane="${lane}"]`)?.classList.toggle('active',[...touchPointers.values()].includes(lane));
  }
  field.addEventListener('pointerdown', event => {
    if(screens.game.hidden) return; event.preventDefault();
    const lane=touchLaneFromEvent(event); touchPointers.set(event.pointerId,lane); field.setPointerCapture?.(event.pointerId);
    refreshTouchLanes(); press(lane);
  });
  const releaseTouch = event => { if(touchPointers.delete(event.pointerId)) refreshTouchLanes(); };
  field.addEventListener('pointerup',releaseTouch); field.addEventListener('pointercancel',releaseTouch);
})();
