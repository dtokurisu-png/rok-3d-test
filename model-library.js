/* R.O.K. 3D Studio · Biblioteca compartida de modelos (etapa 2).
   Solo lectura: jamás modifica GLB, combate ni el catálogo de animaciones. */
(async function(){
 'use strict';
 const mount=document.querySelector('#modelLibrary');
 if(!mount)return;
 const page=document.body.dataset.studioPage;
 const isScene=page==='scenes';
 const search=document.querySelector('#librarySearch');
 const filter=document.querySelector('#libraryFilter');
 const summary=document.querySelector('#librarySummary');
 const selection=document.querySelector('#librarySelection');
 const list=document.querySelector('#libraryList');
 const path=document.querySelector('#libraryPath');
 let catalog=[];
 let selected=null;
 function present(item){
  selected=item;
  for(const node of list.querySelectorAll('[data-model-id]'))node.setAttribute('aria-pressed',String(node.dataset.modelId===item.id));
  selection.textContent=item.name;
  path.textContent=item.path;
  const open=document.querySelector('#libraryOpen');
  open.href='./'+item.path.split('/').map(encodeURIComponent).join('/');
  open.removeAttribute('aria-disabled');
 }
 function render(){
  const text=(search.value||'').trim().toLocaleLowerCase();
  const category=filter.value;
  const items=catalog.filter(m=>(!isScene||m.enabledInSceneEditor)&&(category==='all'||m.category===category)&&(!text||(m.name+' '+m.path).toLocaleLowerCase().includes(text)));
  summary.textContent=items.length+' modelos disponibles';
  list.replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='libraryEmpty';empty.textContent='No hay modelos con ese filtro.';list.append(empty);}
  for(const item of items){
    const button=document.createElement('button');button.type='button';button.className='libraryItem';button.dataset.modelId=item.id;button.setAttribute('aria-pressed',String(selected?.id===item.id));button.title=item.path;
    const name=document.createElement('strong');name.textContent=item.name;
    const meta=document.createElement('span');meta.className='libraryMeta';meta.textContent=(item.category==='caster'?'Personaje':item.category==='reserved'?'Especial reservado':'Escenario')+' · '+(item.bytes/1e6).toFixed(1)+' MB';
    button.append(name,meta);button.addEventListener('click',()=>present(item));list.append(button);
  }
 }
 try{
  const response=await fetch('./assets/manifests/model-library.json',{cache:'no-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const manifest=await response.json();
  if(!Array.isArray(manifest.models))throw Error('Catálogo inválido');
  catalog=manifest.models;
  filter.innerHTML=isScene?'<option value="all">Todos</option><option value="prop">Escenario</option>':'<option value="all">Todos</option><option value="prop">Escenario</option><option value="caster">Personajes</option><option value="reserved">Especiales</option>';
  search.addEventListener('input',render);filter.addEventListener('change',render);
  render();
 }catch(error){
  summary.textContent='No se pudo cargar la biblioteca';
  const message=document.createElement('p');message.className='libraryEmpty';message.textContent='Comprueba la conexión o abre el editor desde el servidor del repositorio. '+error.message;list.append(message);
 }
})();
