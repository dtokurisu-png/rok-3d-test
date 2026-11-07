/* R.O.K. Arena 2.5D — incremental elemental storage.
   Starts at 0/0: orbs unlock ONE new full reservoir (maximum 30 total).
   Passive quarter-unit fragments regenerate only unlocked reservoirs.
   Equipped elements share the maximum capacity equally. */
import {arenaCharacterArt} from './arena-character-art.js?v=0.9.80';
export function createArenaCombatHud({onExtraction=null}={}){
 const el=document.getElementById('rokCombatHud');
 if(!el)throw Error('Falta el HUD superior');
 const clock=el.querySelector('#rokHudClock');
 // Portraits use the two supplied character images, cropped to faces.
 for(const [side,key,label] of [['ally','lyoren','Lyoren'],['enemy','chiara','Chiara']]){
  const portrait=el.querySelector('[data-hud-side="'+side+'"] .rokHudPortrait');
  if(!portrait)continue;
  const img=document.createElement('img');img.src=arenaCharacterArt[key];
  img.alt='Rostro de '+label;img.decoding='async';img.draggable=false;
  portrait.replaceChildren(img);
  portrait.setAttribute('aria-label','Retrato de '+label);
 }
 // Canonical Dominion palette and cost icons from R.O.K. Lite.
 const iconRoot='https://raw.githubusercontent.com/dtokurisu-png/rok-lirte-html/main/assets/cost-icons/';
 const palette={
  water:{label:'Agua',color:'#00FFE4',secondary:'#00FF8A',icon:iconRoot+'cost-water.png'},
  earth:{label:'Tierra',color:'#CCFF00',secondary:'#67400D',icon:iconRoot+'cost-earth.png'},
  fire:{label:'Fuego',color:'#FF0000',secondary:'#FF0000'},
  wind:{label:'Viento',color:'#57B569',secondary:'#FFFFFF'}
 };
 const sides={
  ally:{root:el.querySelector('[data-hud-side="ally"]'),levels:['earth'],hpMax:0,elementAmounts:{},unlocked:{},fragmentClock:0,regenBonus:0,nextElement:0,unlockCursor:0},
  enemy:{root:el.querySelector('[data-hud-side="enemy"]'),levels:['water'],hpMax:0,elementAmounts:{},unlocked:{},fragmentClock:0,regenBonus:0,nextElement:0,unlockCursor:0}
 };
 const TOTAL=30;
 let seconds=0,refreshLeft=0;
 function make(tag,className){
  const node=document.createElement(tag);node.className=className;return node;
 }
 const icon=(kind)=>{
  const node=make('span','rokHudStatIcon '+(kind==='life'?'rokHudLifeIcon':'rokHudDropIcon'));
  node.setAttribute('aria-hidden','true');
  // SVG icon matched to the symbolic heart/droplet in summon HUD.
  node.innerHTML=kind==='life'
   ?'♥'
   :'<svg viewBox="0 0 24 24"><path d="M12 2C9 7 4.5 12 4.5 16.1A7.5 7.5 0 0 0 19.5 16C19.5 12 15 7 12 2Z"/></svg>';
  return node;
 };
 function configure(side,selected){
  const player=sides[side];
  if(!player)return;
  const ids=[...new Set((Array.isArray(selected)?selected:['water']).filter(id=>Object.hasOwn(palette,id)))].slice(0,3);
  player.levels=ids.length?ids:[side==='ally'?'earth':'water'];
  const primary=palette[player.levels[0]];
  player.root.dataset.dominion=player.levels[0];
  player.root.style.setProperty('--dominion-primary',primary.color);
  player.root.style.setProperty('--dominion-secondary',primary.secondary);
  player.root.style.setProperty('--dominion-icon',primary.icon?'url("'+primary.icon+'")':'none');
  player.elementAmounts=Object.fromEntries(player.levels.map(id=>[id,0]));
  player.unlocked=Object.fromEntries(player.levels.map(id=>[id,0]));
  player.fragmentClock=0;player.regenBonus=0;player.nextElement=0;player.unlockCursor=0;
  const row=player.root.querySelector('.rokHudElementRows');
  row.replaceChildren();
  row.classList.add('rokHudElementRow');
  // One fixed-length strip with 30 individual squares. 1/2/3 elements
  // partition it as 30 / 15+15 / 10+10+10.
  const left=side==='ally';
  const displayOrder=left?[...player.levels].reverse():player.levels;
  const capacity=TOTAL/player.levels.length;
  const track=make('div','rokHudElementTrack');
  const labels=make('div','rokHudSectionLabels');
  track.setAttribute('role','img');
  track.setAttribute('aria-label',player.levels.map(id=>palette[id].label+' '+capacity+' casillas').join(', '));
  for(const id of displayOrder){
   const segment=make('div','rokHudElementSegment');
   segment.style.setProperty('--element-color',palette[id].color);
   segment.style.setProperty('--element-secondary',palette[id].secondary);
   segment.style.setProperty('--slot-count',String(capacity));
   segment.title=palette[id].label+': 0/0 depósitos obtenidos (límite '+capacity+')';
   for(let i=0;i<capacity;i++){
    const cell=make('span','rokHudElementCell');
    cell.dataset.element=id;
    cell.dataset.filled='false';cell.style.setProperty('--fill','0%');
    cell.hidden=true;
    cell.style.flex='0 0 calc('+(100/capacity).toFixed(5)+'% - 1px)';
    segment.append(cell);
   }
   track.append(segment);
   const label=make('span','rokHudSectionLabel');label.style.color=palette[id].color;
   if(palette[id].icon){
    const image=make('img','rokHudElementImage');
    image.src=palette[id].icon;image.alt='';image.decoding='async';
    label.append(image);
   }else label.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2C9 7 4.5 12 4.5 16.1A7.5 7.5 0 0 0 19.5 16C19.5 12 15 7 12 2Z"/></svg>';
   label.title=palette[id].label+' ('+capacity+')';labels.append(label);
  }
  const entry=make('div','rokHudElementBar');
  entry.append(labels,track);
  const badge=icon('drop');
  if(primary.icon){
   badge.replaceChildren();
   const image=make('img','rokHudElementImage');
   image.src=primary.icon;image.alt='';image.decoding='async';
   badge.append(image);
  }
  if(left){row.append(entry,badge);}else{row.append(badge,entry);}
  paintElements(side);
  }
 // Each elemental unit is one vertical reservoir; fractions (e.g. 2.35)
 // fill the next cell to 35% without changing the 30-unit partition.
 function paintElements(side){
  const player=sides[side];if(!player)return;
  const capacity=TOTAL/player.levels.length;
  const track=player.root.querySelector('.rokHudElementTrack');
  if(!track)return;
  let totalStored=0,totalUnlocked=0;
  for(const id of player.levels){
   const unlocked=Math.min(capacity,Math.max(0,Math.floor(player.unlocked[id]||0)));
   const amount=Math.min(unlocked,Math.max(0,Number(player.elementAmounts[id])||0));
   const segment=[...track.children].find(node=>node.style.getPropertyValue('--element-color')===palette[id].color);
   if(!segment)continue;
   const cells=[...segment.querySelectorAll('.rokHudElementCell')];
   const visual=side==='ally'?[...cells].reverse():cells;
   visual.forEach((cell,index)=>{
    const available=index<unlocked;
    cell.hidden=!available;
    if(!available)return;
    const portion=Math.max(0,Math.min(1,amount-index));
    cell.style.setProperty('--fill',(portion*100).toFixed(2)+'%');
    cell.dataset.filled=String(portion>=1);
    cell.title=palette[id].label+': '+Math.round(portion*100)+'%';
   });
   segment.title=palette[id].label+': '+amount.toFixed(2)+'/'+unlocked+
    ' unidades (límite '+capacity+')';
   totalStored+=amount;totalUnlocked+=unlocked;
  }
  track.setAttribute('aria-label','Energía elemental '+totalStored.toFixed(2)+
   '/'+totalUnlocked+' unidades; máximo futuro '+TOTAL);
  track.title='Energía elemental: '+totalStored.toFixed(2)+'/'+totalUnlocked+
   ' · Capacidad máxima desbloqueable: '+TOTAL+
   ' · Velocidad de recuperación: x'+(1+(player.regenBonus||0));
 }
 function setElements(side,amounts={}){
  const player=sides[side];if(!player)return;
  for(const id of player.levels){
   const value=Number(amounts[id]);
   player.elementAmounts[id]=Number.isFinite(value)?
    Math.min(player.unlocked[id]||0,Math.max(0,value)):0;
  }
  paintElements(side);
 }
 // Spend is atomic and happens when a card is SELECTED, before casting.
 // Cards with zero cost always pass; failed selections spend nothing.
 function spend(side,element,cost){
  const player=sides[side];
  const amount=Math.max(0,Math.floor(Number(cost)||0));
  if(!player||!player.levels.includes(element))return false;
  if(amount===0)return true;
  const available=player.elementAmounts[element]||0;
  if(available+1e-8<amount)return false;
  player.elementAmounts[element]=Math.max(0,available-amount);
  paintElements(side);
  return true;
 }
 // Guard upkeep: a quarter-element every half second of continuous hold.
 function spendFragment(side,element){
  const player=sides[side];
  if(!player||!player.levels.includes(element))return false;
  const available=Number(player.elementAmounts[element]||0);
  if(available+.00001<.25)return false;
  player.elementAmounts[element]=Math.max(0,Math.round((available-.25)*4)/4);
  paintElements(side);
  return true;
 }
 function refund(side,element,cost){
  const player=sides[side];if(!player||!player.levels.includes(element))return;
  player.elementAmounts[element]=Math.min(player.unlocked[element]||0,
   (player.elementAmounts[element]||0)+Math.max(0,Number(cost)||0));
  paintElements(side);
 }
 function buildLife(side,max){
  const player=sides[side];
  const rounded=Math.max(1,Math.ceil(max));
  if(player.hpMax===rounded)return;
  player.hpMax=rounded;
  const track=player.root.querySelector('.rokHudHpTrack');
  track.replaceChildren();
  track.classList.add('rokHudLifeTrack');
  const left=side==='ally';
  const bar=make('div','rokHudLifeCells');
  for(let i=0;i<rounded;i++){
   const cell=make('span','rokHudLifeCell');
   bar.append(cell);
  }
  if(left){track.append(bar,icon('life'));}else{track.append(icon('life'),bar);}
 }
 function draw(casters){
  const t=Math.max(0,Math.floor(seconds));
  clock.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  for(const side of ['ally','enemy']){
   const player=sides[side];
   const caster=casters.find(c=>c.side===side);
   const hp=Math.max(0,Number(caster?.hp)||0);
   const max=Math.max(1,Number(caster?.maxHp)||12);
   buildLife(side,max);
   const filled=Math.min(player.hpMax,Math.ceil(hp));
   const squares=player.root.querySelectorAll('.rokHudLifeCell');
   squares.forEach((cell,i)=>{
    // Ally portrait is on the RIGHT; enemy portrait is on LEFT.
    // Empty squares propagate from far outside toward the center.
    const live=side==='ally'?i>=player.hpMax-filled:i<filled;
    cell.dataset.filled=String(live);
   });
   player.root.querySelector('.rokHudHpTrack').title='Vida '+hp+' / '+max;
  }
 }
 // A single global fragment stream for each player, not one stream per element.
 // Every 4 ticks completes exactly one elemental unit.
 function regenerateFragment(side){
  const player=sides[side];
  let chosen=-1;
  for(let n=0;n<player.levels.length;n++){
   const index=(player.nextElement+n)%player.levels.length;
   const id=player.levels[index];
   if((player.elementAmounts[id]||0)<(player.unlocked[id]||0)-1e-8){
    chosen=index;break;
   }
  }
  if(chosen<0)return false; // No unlocked, partially empty reservoirs.
  const id=player.levels[chosen],current=player.elementAmounts[id]||0;
  const next=Math.min(player.unlocked[id],(Math.round(current*4)+1)/4);
  player.elementAmounts[id]=next;
  player.nextElement=(Math.round(next*4)%4===0||
    next===player.unlocked[id])?(chosen+1)%player.levels.length:chosen;
  paintElements(side);
  return true;
 }
 // One pickup grants ONE additional complete reservoir. It increases both
 // obtained capacity and current energy. Passive generation never does.
 function collectOrb(side){
  const player=sides[side];if(!player)return 0;
  return typeof onExtraction==='function'?
   onExtraction({side,sourceId:'element-orb',kind:'unlock',potency:1,
    commit:()=>collectOrbLegacy(side)}):collectOrbLegacy(side);
 }
 function collectOrbLegacy(side){
  const player=sides[side];if(!player)return 0;
  const limit=TOTAL/player.levels.length;
  for(let n=0;n<player.levels.length;n++){
   const index=(player.unlockCursor+n)%player.levels.length;
   const id=player.levels[index];
   if((player.unlocked[id]||0)>=limit)continue;
   player.unlocked[id]++;
   player.elementAmounts[id]=Math.min(player.unlocked[id],
    (player.elementAmounts[id]||0)+1);
   player.unlockCursor=(index+1)%player.levels.length;
   paintElements(side);
   return 1;
  }
  return 0; // Maximum 30 reservoirs already obtained.
 }
 // A Melánide Semillera pickup restores exactly ONE quarter-unit.
 // Unlike a fountain orb, it never unlocks a new reservoir; unlike a
 // regeneration bonus, it does not change the rate of later ticks.
 function collectFragment(side,sourceId='element-fragment'){
  if(!sides[side])return false;
  return typeof onExtraction==='function'?
   onExtraction({side,sourceId,kind:'recharge',potency:.25,
    commit:()=>regenerateFragment(side)}):regenerateFragment(side);
 }
 function addRegenSpeed(side,amount=1){
  const player=sides[side];if(!player)return 0;
  const increase=Math.max(0,Math.floor(Number(amount)||0));
  player.regenBonus=(player.regenBonus||0)+increase;
  paintElements(side);
  return player.regenBonus;
 }
 function reset(){
  seconds=0;refreshLeft=0;
  for(const side of ['ally','enemy']){
   sides[side].fragmentClock=0;sides[side].regenBonus=0;sides[side].nextElement=0;
   sides[side].unlockCursor=0;
   for(const id of sides[side].levels)sides[side].unlocked[id]=0;
   setElements(side,{});
  }
 }
 function advance(dt,casters){
  if(!Number.isFinite(dt)||dt<=0)return;
  seconds+=dt;refreshLeft-=dt;
  for(const side of ['ally','enemy']){
   const player=sides[side];
   player.fragmentClock+=dt;
   // 33% slower: one quarter fragment every 3 seconds (was 2).
   while(player.fragmentClock>=3){
    player.fragmentClock-=3;
    for(let n=0;n<1+(player.regenBonus||0);n++){
     if(typeof onExtraction==='function')
      onExtraction({side,sourceId:'passive-regeneration',
       kind:'recharge',potency:.25,commit:()=>regenerateFragment(side)});
     else regenerateFragment(side);
    }
   }
  }
  if(refreshLeft<=0){refreshLeft=.12;draw(casters);}
 }
 configure('ally',['earth']);configure('enemy',['water']);
 draw([]);
 function getResources(side,element=side==='ally'?'earth':'water'){
  const player=sides[side];
  if(!player||!player.levels.includes(element))return {available:0,unlocked:0};
  return {available:Number(player.elementAmounts[element]||0),
   unlocked:Number(player.unlocked[element]||0)};
 }
 return {configure,draw,reset,advance,setElements,collectOrb,collectFragment,addRegenSpeed,spend,spendFragment,refund,getResources};
}
