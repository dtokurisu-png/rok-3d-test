/* R.O.K. Arena 2.5D — adapter to the ONE canonical factor engine.
 * No local copy of factor mechanics. The canonical ES module lives in
 * rok-lirte-html/nueva-version/compartido/factores-core.js.
 * Existing shield/armor/extraction handlers remain authoritative
 * until each one is migrated and equivalence-tested.
 */
const CORE_URL='https://cdn.jsdelivr.net/gh/dtokurisu-png/rok-lirte-html@5404064c7446565fcf45cef8819d2ca804160d06/nueva-version/compartido/factores-core.js';
const own=(cardId,side)=>({
 kariona:[
  {factor:'escudo',semantic:{category:'magico'},application:{root:'factor',activation:'pasiva'},
   config:{mode:'hit',capacity:3}},
  {factor:'armadura',semantic:{category:'fisico'},application:{root:'factor',activation:'pasiva'},
   config:{mode:'damage',capacity:1}}
 ],
 telepate:[{factor:'confusion',semantic:{category:'psiquico'},
  application:{root:'habilidad',activation:'disparador'},
  config:{mode:'time',duration:1,radius:6}}],
 semillera:[{factor:'extraccion',semantic:{category:'elemental'},
  application:{root:'habilidad',activation:'disparador'},
  config:{mode:'time',interval:10,potency:1}}],
 astarium:[
  {factor:'sanacion',semantic:{category:'magico'},application:{root:'habilidad',activation:'pasiva'},
   config:{mode:'time',interval:1,potency:1,radius:6}},
  {factor:'escudo',semantic:{category:'psiquico'},application:{root:'habilidad',activation:'disparador'},
   config:{mode:'time',duration:10,blocksCategories:['psiquico']}}
 ],
 controladora:[] // Factor 'control' reserved; behavior not yet defined by its card.
})[cardId]||[];
export function createArenaFactorsBridge({onHeal=()=>{},onLoad=()=>{},onError=()=>{}}={}){
 let core=null,loading=null;
 const active=new Map();
 const confusion=new Map();
 const seen=new WeakMap();
 function load(){
  if(loading)return loading;
  loading=import(/* @vite-ignore */CORE_URL).then(module=>{
   if(typeof module.createFactorInstance!=='function'||typeof module.stepFactor!=='function')
    throw Error('Motor compartido de factores incompatible');
   core=module;onLoad(module);return true;
  }).catch(error=>{onError(error);return false;});
  return loading;
 }
 function register(unit){
  if(!unit||!core)return [];
  const specs=own(unit.cardId,unit.side);
  const items=specs.map(spec=>core.createFactorInstance({...spec,
   sourceId:unit.cardId,targetId:unit.cardId}));
  seen.set(unit,items);
  if(unit.cardId==='astarium')
   active.set(unit,items.find(f=>f.factor==='sanacion'));
  return items;
 }
 function attachEquipment(unit){
  if(!unit||!core)return null;
  return core.createFactorInstance({factor:'armadura',
   semantic:{category:'fisico'},application:{root:'habilidad',activation:'activa'},
   config:{mode:'damage',capacity:2},sourceId:'ancient-oak-armor',
   targetId:unit.cardId});
 }
 // Confusion's lifetime belongs to the shared factor engine; the card
 // still chooses the 50/50 attack outcome and the arena renders it.
 function applyConfusion(target,source,outcome){
  if(!core||!target||!source)return false;
  const spec=own(source.cardId,source.side).find(s=>s.factor==='confusion');
  if(!spec)return false;
  const instance=core.createFactorInstance({...spec,
   sourceId:source.cardId,targetId:target.cardId||'summon'});
  confusion.set(target,instance);
  target.rokConfusion={factor:'confusion',category:'psiquico',
   negative:true,remaining:instance.state.remaining,source,
   outcome,resolved:false};
  return true;
 }
 function tick(dt,units=[]){
  if(!core||!Number.isFinite(dt)||dt<=0)return;
  // Update only the newly wired healing factor. Legacy factors must not be
  // stepped twice: their effects are already handled in existing combat code.
  const present=new Set(units);
  for(const [target,factor] of confusion){
   if(!present.has(target)||target.hp<=0||
    ['dead','dying','vanishing','restoring'].includes(target.stage)){
    confusion.delete(target);target.rokConfusion=null;continue;
   }
   core.stepFactor(factor,dt);
   if(!factor.state.active){
    confusion.delete(target);target.rokConfusion=null;
   }else if(target.rokConfusion)
    target.rokConfusion.remaining=factor.state.remaining;
  }
  for(const unit of units){
   if(!unit?.cardId)continue;
   if(!seen.has(unit))register(unit);
  }
  for(const [unit,factor] of active){
   if(!present.has(unit)||unit.hp<=0||['dead','dying','vanishing'].includes(unit.stage)){
    active.delete(unit);continue;
   }
   // Restoration pauses the aura without deleting the persistent instance.
   if(unit.stage!=='active')continue;
   const events=core.stepFactor(factor,dt);
   for(const event of events){
    for(const ally of units){
     if(ally.side!==unit.side||ally.hp<=0||ally.hp>=ally.maxHp||
      ally.role!=='summon'||['dead','dying','vanishing','restoring'].includes(ally.stage))
      continue;
     const dx=ally.outer.position.x-unit.outer.position.x;
     const dz=ally.outer.position.z-unit.outer.position.z;
     if(Math.hypot(dx,dz)<=event.radius+1e-8)
      onHeal(ally,event.potency,unit);
    }
   }
  }
 }
 function blocks(unit,event){
  if(!core||!unit||!seen.has(unit))return false;
  const shield=seen.get(unit).find(f=>f.factor==='escudo'&&
   f.semantic.category==='psiquico');
  // Status timer/cooldown isn't active until its ability is separately
  // implemented; do not give Astarin an unearned permanent immunity.
  return !!(shield&&unit.rokPsychicShieldActive&&core.factorBlocks(shield,event));
 }
 return {load,register,attachEquipment,tick,blocks,applyConfusion,
  get managesConfusion(){return !!core;},
  get confusionCount(){return confusion.size;},
  get loaded(){return !!core;},
  get canonicalUrl(){return CORE_URL;},
  get activeCount(){return active.size;}
 };
}
