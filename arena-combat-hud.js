/* R.O.K. Arena 2.5D — stage 2, visual-only segmented HUD.
   Health uses real caster HP; all 30 elemental cells remain empty until
   the separately approved elemental economy is implemented.
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
  ally:{root:el.querySelector('[data-hud-side="ally"]'),levels:['water'],hpMax:0},
  enemy:{root:el.querySelector('[data-hud-side="enemy"]'),levels:['water'],hpMax:0}
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
   ?'<svg viewBox="0 0 24 24"><path d="M12 21s-9-5.8-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.2-9 12-9 12Z"/></svg>'
   :'<svg viewBox="0 0 24 24"><path d="M12 2C9 7 4.5 12 4.5 16.1A7.5 7.5 0 0 0 19.5 16C19.5 12 15 7 12 2Z"/></svg>';
  return node;
 };
 function configure(side,selected){
  const player=sides[side];
  if(!player)return;
  const ids=[...new Set((Array.isArray(selected)?selected:['water']).filter(id=>Object.hasOwn(palette,id)))].slice(0,3);
  player.levels=ids.length?ids:['water'];
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
   segment.title=palette[id].label+': 0/'+capacity+' unidades (fase visual)';
   for(let i=0;i<capacity;i++){
    const cell=make('span','rokHudElementCell');
    cell.dataset.element=id;cell.dataset.filled='false';segment.append(cell);
   }
   track.append(segment);
   const label=make('span','rokHudSectionLabel');label.style.color=palette[id].color;
   label.textContent='◆';label.title=palette[id].label+' ('+capacity+')';labels.append(label);
  }
  const entry=make('div','rokHudElementBar');
  entry.append(labels,track);
  if(left){row.append(entry,icon('drop'));}else{row.append(icon('drop'),entry);}
  player.root.querySelector('.rokHudEnergyTrack')?.remove();
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
 function reset(){seconds=0;refreshLeft=0;}
 function advance(dt,casters){
  if(!Number.isFinite(dt)||dt<=0)return;
  seconds+=dt;refreshLeft-=dt;
  if(refreshLeft<=0){refreshLeft=.12;draw(casters);}
 }
 configure('ally',['water']);configure('enemy',['water']);
 draw([]);
 return {configure,draw,reset,advance};
}
