import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=()=>readFile(new URL('../arena-25d.html',import.meta.url),'utf8');

test('desktop-only HUD cleanup removes corner debug without deleting runtime nodes',async()=>{
 const html=await source();
 assert.match(html,/@media \(min-width:760px\) and \(pointer:fine\)\{/);
 assert.match(html,/#phase,#hint,#cameraLiveMarker\{display:none!important\}/);
 for(const id of ['phase','hint','cameraLiveMarker','fps','cameraLiveDistance','cameraLivePitch'])
  assert.match(html,new RegExp('id="'+id+'"'));
});

test('desktop options collapse to accessible gear and open the original panel',async()=>{
 const html=await source();
 assert.match(html,/id="expand" aria-expanded="false" aria-controls="details" aria-label="Abrir opciones"[^>]*>⚙<\/button>/);
 assert.match(html,/menuButton\.addEventListener\('click',expand\)/);
 assert.match(html,/menuButton\.setAttribute\('aria-expanded',String\(open\)\)/);
 assert.match(html,/#top\.open #details\{display:block\}/);
 assert.match(html,/#top\.open\{width:min\(410px,94vw\)/);
});

test('desktop controller relocates to options and restores on touch/mobile',async()=>{
 const html=await source();
 assert.match(html,/desktopSettingsQuery=window\.matchMedia\('\(min-width:760px\) and \(pointer:fine\)'\)/);
 assert.match(html,/if\(desktopSettingsQuery\.matches\)qs\('#details'\)\.appendChild\(movePanel\)/);
 assert.match(html,/else moveAnchor\.parentNode\.insertBefore\(movePanel,moveAnchor\.nextSibling\)/);
 assert.match(html,/desktopSettingsQuery\.addEventListener\('change',placeDesktopControls\)/);
});

test('version is slightly larger bold upper-right on desktop and mobile badge retained',async()=>{
 const html=await source();
 assert.match(html,/#versionProof\{position:fixed;top:12px;left:auto;right:14px/);
 assert.match(html,/font:800 12px\/1\.25 Roboto/);
 assert.match(html,/id="mobileVersionBadge"/);
});
