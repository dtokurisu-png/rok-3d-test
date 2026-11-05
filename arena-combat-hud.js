/* R.O.K. Arena 2.5D — Stage 3: elemental time regeneration.
   One fragment per second per player, four fragments per full unit.
   Regeneration finishes one unit before continuing to the next element.
   Cards, orbs and death fragments are reserved for subsequent stages.
 */
export function createArenaCombatHud(){
 const el=document.getElementById('rokCombatHud');
 if(!el)throw Error('Falta el HUD superior');
 const clock=el.querySelector('#rokHudClock');
 const palette={
  water:{label:'Agua',color:'#00ffe4'},
  fire:{label:'Fuego',color:'#ff884d'},
  wind:{label:'Viento',color:'#8cda91'}
 };
 const sides={
  ally:{root:el.querySelector('[data-hud-side="ally"]'),levels:['water'],hpMax:0,elementAmounts:{},fragmentClock:0,nextElement:0},
  enemy:{root:el.querySelector('[data-hud-side="enemy"]'),levels:['water'],hpMax:0,elementAmounts:{},fragmentClock:0,nextElement:0}
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
  player.levels=ids.length?ids:['water'];
  player.elementAmounts=Object.fromEntries(player.levels.map(id=>[id,0]));
  player.fragmentClock=0;player.nextElement=0;
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
   segment.title=palette[id].label+': 0/'+capacity+' unidades';
   for(let i=0;i<capacity;i++){
    const cell=make('span','rokHudElementCell');
    cell.dataset.element=id;
    cell.dataset.filled='false';cell.style.setProperty('--fill','0%');
    segment.append(cell);
   }
   track.append(segment);
   const label=make('span','rokHudSectionLabel');label.style.color=palette[id].color;
   label.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2C9 7 4.5 12 4.5 16.1A7.5 7.5 0 0 0 19.5 16C19.5 12 15 7 12 2Z"/></svg>';
   label.title=palette[id].label+' ('+capacity+')';labels.append(label);
  }
  const entry=make('div','rokHudElementBar');
  entry.append(labels,track);
  if(left){row.append(entry,icon('drop'));}else{row.append(icon('drop'),entry);}
  paintElements(side);
  }
 // Each elemental unit is one vertical reservoir; fractions (e.g. 2.35)
 // fill the next cell to 35% without changing the 30-unit partition.
 function paintElements(side){
  const player=sides[side];if(!player)return;
  const capacity=TOTAL/player.levels.length;
  const track=player.root.querySelector('.rokHudElementTrack');
  if(!track)return;
  for(const id of player.levels){
   const amount=Math.min(capacity,Math.max(0,Number(player.elementAmounts[id])||0));
   const segment=[...track.children].find(node=>node.style.getPropertyValue('--element-color')===palette[id].color);
   if(!segment)continue;
   const cells=[...segment.querySelectorAll('.rokHudElementCell')];
   // Fill toward the portrait on the ally and outward on the enemy.
   const visual=side==='ally'?[...cells].reverse():cells;
   visual.forEach((cell,index)=>{
    const portion=Math.max(0,Math.min(1,amount-index));
    cell.style.setProperty('--fill',(portion*100).toFixed(2)+'%');
    cell.dataset.filled=String(portion>=1);
    cell.title=palette[id].label+': '+Math.round(portion*100)+'%';
   });
   segment.title=palette[id].label+': '+amount.toFixed(2)+'/'+capacity+' unidades';
  }
 }
 function setElements(side,amounts={}){
  const player=sides[side];if(!player)return;
  for(const id of player.levels){
   const value=Number(amounts[id]);
   player.elementAmounts[id]=Number.isFinite(value)?Math.max(0,value):0;
  }
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
  const player=sides[side],capacity=TOTAL/player.levels.length;
  let chosen=-1;
  for(let n=0;n<player.levels.length;n++){
   const index=(player.nextElement+n)%player.levels.length;
   if((player.elementAmounts[player.levels[index]]||0)<capacity-1e-8){chosen=index;break;}
  }
  if(chosen<0)return false; // All selected elemental reservoirs are full.
  const id=player.levels[chosen];
  const current=player.elementAmounts[id]||0;
  // Values are integral quarters; avoid floating-point drift over long fights.
  const fragments=Math.round(current*4);
  const next=Math.min(capacity,(fragments+1)/4);
  player.elementAmounts[id]=next;
  if(Math.round(next*4)%4===0 || next===capacity){
   player.nextElement=(chosen+1)%player.levels.length;
  }else player.nextElement=chosen;
  paintElements(side);
  return true;
 }
 function reset(){
  seconds=0;refreshLeft=0;
  for(const side of ['ally','enemy']){
   sides[side].fragmentClock=0;sides[side].nextElement=0;
   setElements(side,{});
  }
 }
 function advance(dt,casters){
  if(!Number.isFinite(dt)||dt<=0)return;
  seconds+=dt;refreshLeft-=dt;
  for(const side of ['ally','enemy']){
   const player=sides[side];
   player.fragmentClock+=dt;
   while(player.fragmentClock>=1){
    player.fragmentClock-=1;
    regenerateFragment(side);
   }
  }
  if(refreshLeft<=0){refreshLeft=.12;draw(casters);}
 }
 configure('ally',['water']);configure('enemy',['water']);
 draw([]);
 return {configure,draw,reset,advance,setElements};
}
