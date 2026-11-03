/* R.O.K. Studio — navegación y presentación no destructiva; sin alterar motores 3D. */
(function(){
 'use strict';
 const pages=[['tester','Tester de juego','arena-25d.html'],['animations','Animaciones','index.html'],['assets','Creador de assets','asset-editor.html'],['scenes','Escenarios','scene-editor.html']];
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
 const applyModel=()=>document.body.classList.toggle('studioFarolera',currentModel()==='farolera');
 document.getElementById('casterDropdown')?.addEventListener('change',applyModel);
 document.getElementById('characterSelect')?.addEventListener('click',()=>setTimeout(applyModel,0));
 applyModel();
})();
