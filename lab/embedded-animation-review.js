// Catálogo nuevo aislado: un error en FBX no debe detener el visor principal.
// Todas las decisiones son por Kaster y solo se exportan; no se borran archivos.
export async function mountCasterReview({getCharacter,isReady,parseFBX,adaptClip,playClip}){
  const root=document.querySelector('#casterReviewList');
  const note=document.querySelector('#casterReviewStatus');
  if(!root||!note)return;
  const choices=new Map(),clips=new Map();
  let catalog=[],busy=false;
  const validCaster=()=>['chiara','lioren'].includes(getCharacter());
  const key=id=>getCharacter()+':'+id;
  const labelText=()=>getCharacter()==='chiara'?'Chiara':'Lioren';
  function update(message){note.textContent=String(message);}
  function serialize(){
    return {schemaVersion:1,repository:'dtokurisu-png/rok-3d-test',
      decisions:['chiara','lioren'].flatMap(caster=>catalog.map(item=>({
        caster,id:item.id,path:item.path,sha:item.sha,
        decision:choices.get(caster+':'+item.id)||'pending'
      })))};
  }
  async function play(item){
    if(busy||!validCaster()||!isReady())return;
    const target=getCharacter();
    busy=true;render();
    update('Cargando '+item.path+' para '+labelText()+'…');
    try{
      const cacheKey=target+':'+item.id;
      let adapted=clips.get(cacheKey);
      if(!adapted){
        const response=await fetch('./'+encodeURIComponent(item.path),{cache:'force-cache'});
        if(!response.ok)throw Error('HTTP '+response.status);
        const source=parseFBX(await response.arrayBuffer());
        if(!source.animations?.length)throw Error('FBX sin clip animado');
        adapted=adaptClip(source,source.animations[0],item.id);
        if(!adapted?.tracks?.length)throw Error('No se encontraron pistas compatibles');
        clips.set(cacheKey,adapted);
      }
      if(target!==getCharacter())throw Error('Cambió el Kaster; vuelve a probar');
      playClip(adapted);
      update(labelText()+' · '+item.path+' · '+adapted.duration.toFixed(2)+' segundos');
    }catch(error){update('Error con '+item.path+': '+String(error.message||error));}
    finally{busy=false;render();}
  }
  function render(){
    root.replaceChildren();
    const active=validCaster();
    for(const item of catalog){
      const card=document.createElement('div');
      card.style.cssText='background:#102c36;border:1px solid #37636a;border-radius:8px;padding:7px;margin:5px 0';
      const head=document.createElement('div');
      head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px';
      const name=document.createElement('b');
      name.textContent=item.path;name.style.fontSize='11px';
      const button=document.createElement('button');button.type='button';
      button.textContent='▶ Probar';button.disabled=!active||busy||!isReady();
      button.onclick=()=>void play(item);
      head.append(name,button);
      const meta=document.createElement('small');
      meta.textContent=item.group+' · '+item.sha.slice(0,12);
      meta.style.cssText='display:block;color:#b4d5d6;margin:4px 0;font-size:10px';
      const controls=document.createElement('div');
      controls.style.cssText='display:flex;flex-wrap:wrap;gap:9px';
      for(const [value,text] of [['pending','Pendiente'],['keep','Conservar'],['discard','Descartar']]){
        const label=document.createElement('label');label.style.fontSize='11px';
        const radio=document.createElement('input');radio.type='radio';
        radio.name='review-'+getCharacter()+'-'+item.id;
        radio.checked=(choices.get(key(item.id))||'pending')===value;
        radio.disabled=!active;
        radio.onchange=()=>{choices.set(key(item.id),value);
          update(labelText()+' · decisión marcada. Exporta JSON para registrarla en GitHub.');};
        label.append(radio,document.createTextNode(' '+text));
        controls.append(label);
      }
      card.append(head,meta,controls);root.append(card);
    }
    if(!active&&catalog.length)update('Selecciona Chiara o Lioren para probar las nueve animaciones.');
  }
  document.querySelector('#casterReviewCopy').onclick=async()=>{
    try{
      await navigator.clipboard.writeText(JSON.stringify(serialize(),null,2));
      update('Decisiones copiadas. Pégalas en el chat.');
    }catch{update('No se pudo copiar; usa Exportar JSON.');}
  };
  document.querySelector('#casterReviewExport').onclick=()=>{
    const blob=new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;
    anchor.download='rok-kaster-animation-decisions.json';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    update('Archivo JSON exportado. Envíalo para registrar decisiones en GitHub.');
  };
  document.addEventListener('rok:caster:changed',render);
  const response=await fetch('./assets/manifests/caster-animations.json',{cache:'no-store'});
  if(!response.ok)throw Error('No se encontró el catálogo de nuevas animaciones');
  const manifest=await response.json();
  catalog=Array.isArray(manifest.animations)?manifest.animations:[];
  render();
  update(catalog.length+' variantes inventariadas. Elige Chiara o Lioren.');
}
