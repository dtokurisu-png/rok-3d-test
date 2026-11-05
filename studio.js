/* R.O.K. Studio — navegación y presentación no destructiva; sin alterar motores 3D. */
(function(){
 'use strict';
 const pages=[['tester','Tester de juego','arena-25d.html'],['animations','Animaciones','index.html'],['creator','Creador de animaciones','animation-creator.html'],['assets','Creador de assets','asset-editor.html'],['scenes','Escenarios','scene-editor.html']];
 const page=document.body.dataset.studioPage||'animations';
 document.body.classList.add('studio'+page[0].toUpperCase()+page.slice(1));
 const nav=document.createElement('nav');
 nav.id='rokStudioNav';nav.setAttribute('aria-label','Herramientas de R.O.K. 3D');
 const brand=document.createElement('span');brand.className='studioBrand';brand.textContent='R.O.K. 3D';
 const tabs=document.createElement('div');tabs.className='studioTabs';
 pages.forEach(([key,title,href])=>{const a=document.createElement('a');a.href='./'+href;a.textContent=title;if(key===page)a.setAttribute('aria-current','page');tabs.append(a);});
 nav.append(brand,tabs);document.body.prepend(nav);
 if(page!=='animations')return;
 const hud=document.querySelector('.hud');if(!hud)return;
 const currentModel=()=>document.querySelector('#casterDropdown')?.value||'farolera';
 const tools=document.createElement('details');tools.className='studioTools';
 const summary=document.createElement('summary');summary.textContent='Herramientas';
 const buttons=document.createElement('div');buttons.className='studioToolButtons';
 ['wire','physics','lampReset'].forEach(id=>{const el=document.getElementById(id);if(el)buttons.append(el);});
 const diagnostics=document.createElement('div');diagnostics.className='studioDiagnostics';
 ['groundInfo','fps','lampInfo','debugInfo','error'].forEach(id=>{const el=document.getElementById(id);if(el)diagnostics.append(el);});
 tools.append(summary,buttons,diagnostics);
 const animLab=document.querySelector('.animLab');
 if(animLab)hud.insertBefore(tools,animLab);else hud.append(tools);
 // User-authored animation queue is separate from original and composite
 // catalog entries; it is a browser-local draft, not a published FBX.
 const editedQueue=document.createElement('details');
 editedQueue.className='studioTools rokEditedQueue';
 const editedSummary=document.createElement('summary');
 editedSummary.textContent='Animaciones creadas / editadas';
 const editedItems=document.createElement('div');editedItems.className='studioToolButtons';
 const explain=document.createElement('p');
 explain.className='studioDiagnostics';
 explain.textContent='Borradores locales. Para reproducir o publicarlos, ábrelos en el Creador.';
 editedQueue.append(editedSummary,editedItems,explain);
 if(animLab)hud.insertBefore(editedQueue,animLab);
 else hud.append(editedQueue);
 function paintEditedQueue(){
  editedItems.replaceChildren();
  let entries=[];
  try{
   const data=JSON.parse(localStorage.getItem('ROK_ANIMATION_CREATOR_QUEUE_V1')||'[]');
   if(Array.isArray(data))entries=data;
  }catch{}
  if(!entries.length){
   const empty=document.createElement('span');
   empty.textContent='Sin animaciones editadas';editedItems.append(empty);return;
  }
  for(const item of entries){
   if(item.kind!=='ROK_AnimationCreator')continue;
   const link=document.createElement('a');
   link.href='./animation-creator.html';
   link.textContent=(item.mode==='replace'?'↻ ':'✦ ')+item.name;
   link.title=item.mode==='replace'?'Versión reemplazada localmente':'Nueva animación';
   link.className=item.mode==='replace'?'rokLocalOverride':'rokLocalAnimation';
   editedItems.append(link);
  }
 }
 paintEditedQueue();
 window.addEventListener('focus',paintEditedQueue);
 window.addEventListener('storage',paintEditedQueue);
 const applyModel=()=>document.body.classList.toggle('studioFarolera',currentModel()==='farolera');
 document.getElementById('casterDropdown')?.addEventListener('change',applyModel);
 document.getElementById('characterSelect')?.addEventListener('click',()=>setTimeout(applyModel,0));
 applyModel();
})();
