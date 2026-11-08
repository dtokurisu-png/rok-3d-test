/* R.O.K. tiny online neural utility estimator.
 * 16 input features -> 24 tanh units -> one outcome estimate.
 * Trains ONLY on observed game results; the game engine retains legality.
 * Weights are per-caster and persisted with the experiment archive.
 */
const FIN=16,HID=24;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const hash=s=>{let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
const init=(n,offset)=>Array.from({length:n},(_,i)=>
 (Math.sin((i+1)*12.9898+offset*4.1414)*43758.5453%1)*.09);
export function createCasterNeuralEvaluator(seed='caster'){
 let state={w1:init(FIN*HID,hash(seed)%97),b1:Array(HID).fill(0),
  w2:init(HID,(hash(seed)+5)%97),b2:0,examples:0};
 function features(context,card,role){
  const chunks=String(context||'').split('|');
  const [side,hp,threat,enemy,enemyHp,allies,mana]=chunks;
  return [1,hp==='critical'?1:0,hp==='hurt'?1:0,
   threat==='close'?1:0,threat==='near'?1:0,
   enemyHp==='fragile'?1:0,enemyHp==='durable'?1:0,
   allies==='some'?1:0,allies==='many'?1:0,
   mana==='one'?1:0,Number(card?.cost||0)/5,
   role==='defense'?1:0,role==='offense'?1:0,
   threat==='clear'?1:0,
   (hash(card?.id||card||'none')%997)/997,
   (hash(enemy||'none')%991)/991];
 }
 function forward(x){
  const hidden=Array.from({length:HID},(_,j)=>{
   let z=state.b1[j];
   for(let i=0;i<FIN;i++)z+=state.w1[j*FIN+i]*x[i];
   return Math.tanh(z);
  });
  let output=state.b2;
  for(let j=0;j<HID;j++)output+=state.w2[j]*hidden[j];
  return {hidden,prediction:Math.tanh(output)};
 }
 function predict(context,card,role){return forward(features(context,card,role)).prediction;}
 function train(context,card,role,outcome){
  const x=features(context,card,role),{hidden,prediction}=forward(x);
  const target=clamp(Number(outcome)/5||0,-1,1),lr=.025;
  const error=clamp(target-prediction,-2,2)*(1-prediction*prediction);
  const weights=state.w2.slice();
  for(let j=0;j<HID;j++)state.w2[j]=clamp(state.w2[j]+lr*error*hidden[j],-4,4);
  state.b2=clamp(state.b2+lr*error,-4,4);
  for(let j=0;j<HID;j++){
   const delta=error*weights[j]*(1-hidden[j]*hidden[j]);
   state.b1[j]=clamp(state.b1[j]+lr*delta,-4,4);
   for(let i=0;i<FIN;i++)state.w1[j*FIN+i]=clamp(
    state.w1[j*FIN+i]+lr*delta*x[i],-4,4);
  }
  state.examples++;
  return {prediction,target};
 }
 function snapshot(){return {schema:1,...state};}
 function restore(raw){
  if(!raw||raw.schema!==1||!Array.isArray(raw.w1)||raw.w1.length!==FIN*HID||
   !Array.isArray(raw.b1)||raw.b1.length!==HID||
   !Array.isArray(raw.w2)||raw.w2.length!==HID)return false;
  const numbers=[...raw.w1,...raw.b1,...raw.w2,raw.b2];
  if(!numbers.every(x=>Number.isFinite(x)&&Math.abs(x)<=10))return false;
  state={w1:raw.w1.slice(),b1:raw.b1.slice(),w2:raw.w2.slice(),
   b2:raw.b2,examples:Math.max(0,Math.floor(Number(raw.examples)||0))};
  return true;
 }
 return {predict,train,features,snapshot,restore,get examples(){return state.examples;}};
}
