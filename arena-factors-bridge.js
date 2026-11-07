/* R.O.K. Arena 2.5D — adapter to the ONE canonical factor engine.
 * No local copy of factor mechanics. The canonical ES module lives in
 * rok-lirte-html/nueva-version/compartido/factores-core.js.
 * Existing extraction handlers remain authoritative
 * until each one is migrated and equivalence-tested.
 */
const CORE_URL='https://cdn.jsdelivr.net/gh/dtokurisu-png/rok-lirte-html@f8ae4eef3a7cbd0ba819ee96f2eb6108415e0004/nueva-version/compartido/factores-core.js';
const own=(cardId,side)=>({
 kariona:[
  {factor:'escudo',semantic:{category:'magico'},application:{root:'factor',activation:'pasiva'},
   config:{mode:'hit',capacity:3,
    protectsCategories:['fisico','magico','elemental','psiquico']}},
  {factor:'armadura',semantic:{category:'fisico'},application:{root:'factor',activation:'pasiva'},
   config:{mode:'flat',potency:1,protectsCategories:['fisico']}}
 ],
 telepate:[{factor:'confusion',semantic:{category:'psiquico'},
  application:{root:'habilidad',activation:'disparador'},
  config:{mode:'action',radius:6}}],
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
 const shields=new Map();
 const timedShields=new Map();
 function load(){
  if(loading)return loading;
  loading=import(/* @vite-ignore */CORE_URL).then(module=>{
   if(typeof module.createFactorInstance!=='function'||typeof module.stepFactor!=='function'||
    typeof module.reduceFactorDamage!=='function')
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
  if(unit.cardId==='kariona'){
   const shield=items.find(f=>f.factor==='escudo');
   // A returning victorious summon keeps its previous remaining shield.
   shield.state.capacity=Math.min(shield.state.capacity,
    Math.max(0,Number(unit.magicShieldHits??shield.state.capacity)));
   shield.state.active=shield.state.capacity>0;
   shields.set(unit,shield);
  }
  if(unit.cardId==='astarium'){
   active.set(unit,items.find(f=>f.factor==='sanacion'));
   const psychic=items.find(f=>f.factor==='escudo'&&
    f.semantic.category==='psiquico');
   timedShields.set(unit,psychic);
   unit.rokPsychicShieldActive=true;
   unit.rokPsychicShieldRemaining=psychic.state.remaining;
  }
  return items;
 }
 function absorbShieldDamage(unit,damage,{category='fisico'}={}){
  if(!core||!unit||unit.cardId!=='kariona')return null;
  if(!seen.has(unit))register(unit);
  const shield=shields.get(unit);
  if(!shield)return null;
  // The old HUD field is a projection of canonical factor state, not a
  // second hit counter. Sync if an outside respawn refreshed the legacy HP.
  if(Number(unit.magicShieldHits)>shield.state.capacity){
   shield.state.capacity=Math.min(shield.config.capacity,
    Math.floor(unit.magicShieldHits));
   shield.state.active=shield.state.capacity>0;
  }
  const result=core.absorbFactorDamage(shield,damage,{category});
  unit.magicShieldHits=shield.state.capacity;
  return {...result,capacity:shield.state.capacity};
 }
 function refreshShield(unit,{newLife=false}={}){
  if(!core||!unit||unit.cardId!=='kariona')return false;
  if(!seen.has(unit))register(unit);
  const shield=shields.get(unit)||
   seen.get(unit)?.find(f=>f.factor==='escudo'&&f.semantic.category==='magico');
  if(!shield)return false;
  shields.set(unit,shield);
  if(newLife){
   shield.state.capacity=shield.config.capacity;shield.state.active=true;
  }
  unit.magicShieldHits=shield.state.capacity;
  return true;
 }
 function refreshPsychicShield(unit,{newLife=false}={}){
  if(!core||!unit||unit.cardId!=='astarium')return false;
  if(!seen.has(unit))register(unit);
  let shield=timedShields.get(unit)||seen.get(unit)?.find(f=>
   f.factor==='escudo'&&f.semantic.category==='psiquico');
  if(!shield)return false;
  timedShields.set(unit,shield);
  if(newLife){
   shield.state.remaining=shield.config.duration;
   shield.state.active=true;
   shield.state.elapsed=0;
  }
  unit.rokPsychicShieldActive=shield.state.active;
  unit.rokPsychicShieldRemaining=shield.state.remaining;
  return true;
 }
 function attachEquipment(unit){
  if(!unit||!core)return null;
  return core.createFactorInstance({factor:'armadura',
   semantic:{category:'fisico'},application:{root:'habilidad',activation:'activa'},
   config:{mode:'flat',potency:2,protectsCategories:['fisico']},
   sourceId:'ancient-oak-armor',targetId:unit.cardId});
 }
 // Base armor and equipped armor are distinct sources of the SAME factor.
 // Cache by equipment identity; the game continues owning item lifetime.
 const armorCache=new WeakMap();
 function mitigateArmorDamage(unit,damage,{category='fisico'}={}){
  if(!core||!unit)return null; // offline: caller uses legacy flat totals
  const equipped=unit.equippedBody==='ancient-oak-armor';
  const signature=unit.cardId+'|'+(equipped?'oak':'base');
  let cached=armorCache.get(unit);
  if(!cached||cached.signature!==signature){
   const specs=[];
   if(unit.cardId==='kariona')specs.push({
    factor:'armadura',semantic:{category:'fisico'},
    application:{root:'factor',activation:'pasiva'},
    config:{mode:'flat',potency:1,protectsCategories:['fisico']},
    sourceId:'kariona-base',targetId:unit.cardId
   });
   if(equipped){
    for(const [nature,potency] of [['fisico',2],['magico',1]])
     specs.push({factor:'armadura',semantic:{category:nature},
      application:{root:'habilidad',activation:'activa'},
      config:{mode:'flat',potency,protectsCategories:[nature]},
      sourceId:'ancient-oak-armor',targetId:unit.cardId});
   }
   cached={signature,instances:specs.map(spec=>core.createFactorInstance(spec))};
   armorCache.set(unit,cached);
  }
  return core.reduceFactorDamage(cached.instances,damage,{category});
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
   negative:true,remaining:null,source,
   outcome,resolved:false,actionGated:true};
  return true;
 }
 function resolveConfusion(target,result='completed'){
  const instance=confusion.get(target);
  if(!instance||!core)return false;
  core.completeFactorAction(instance,{result});
  confusion.delete(target);
  if(target?.rokConfusion)target.rokConfusion=null;
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
   }else if(target.rokConfusion&&!target.rokConfusion.actionGated)
    target.rokConfusion.remaining=factor.state.remaining;
  }
  for(const [unit,shield] of timedShields){
   if(!present.has(unit)||unit.hp<=0||
    ['dead','dying','vanishing'].includes(unit.stage)){
    timedShields.delete(unit);
    unit.rokPsychicShieldActive=false;
    continue;
   }
   if(unit.stage==='active'&&shield.state.active)
    core.stepFactor(shield,dt);
   unit.rokPsychicShieldActive=shield.state.active;
   unit.rokPsychicShieldRemaining=shield.state.remaining;
  }
  for(const [unit] of shields){
   if(!present.has(unit)||unit.hp<=0||
    ['dead','dying','vanishing'].includes(unit.stage))
    shields.delete(unit);
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
  const shield=timedShields.get(unit);
  // Status timer/cooldown isn't active until its ability is separately
  // implemented; do not give Astarin an unearned permanent immunity.
  return !!(shield&&unit.rokPsychicShieldActive&&core.factorBlocks(shield,event));
 }
 return {load,register,attachEquipment,tick,blocks,applyConfusion,resolveConfusion,
  absorbShieldDamage,refreshShield,refreshPsychicShield,mitigateArmorDamage,
  get managesConfusion(){return !!core;},
  get confusionCount(){return confusion.size;},
  get loaded(){return !!core;},
  get canonicalUrl(){return CORE_URL;},
  get activeCount(){return active.size;}
 };
}
