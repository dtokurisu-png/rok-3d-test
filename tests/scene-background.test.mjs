import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BACKGROUND_DEFAULTS,DEFAULT_GOTHIC_TEXTURE,normalizeSceneBackground,createSceneBackground,resolveBackgroundTexture,textureCandidates} from '../scene-background.js';

class Group{
 constructor(){
  this.children=[];this.visible=true;this.rotation={};
  this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
 }
 add(node){this.children.push(node);}
 remove(node){this.children=this.children.filter(x=>x!==node);}
 traverse(cb){cb(this);for(const ch of this.children)ch.traverse(cb);}
}
class Geometry{
 setAttribute(k,v){this[k]=v;}
 setIndex(v){this.indices=v;}
 computeVertexNormals(){}
 dispose(){}
}
class Material{
 constructor(options){Object.assign(this,options);this.color={set(){}};}
 dispose(){}
}
class Mesh extends Group{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;}
}
class TextureLoader{load(url,onLoad,onProgress,onError){this.lastUrl=url;}}
class BufferAttribute{constructor(array,size){this.array=array;this.itemSize=size;}}
const THREE={
 Group,Mesh,MeshBasicMaterial:Material,BufferGeometry:Geometry,
 Float32BufferAttribute:BufferAttribute,PlaneGeometry:Geometry,TextureLoader,
 BackSide:1,DoubleSide:2,SRGBColorSpace:'srgb',ClampToEdgeWrapping:3
};
test('Gothic background defaults preserve 15x30 proportions with much larger enclosure',()=>{
 const c=normalizeSceneBackground();
 assert.equal(c.type,'gothic-vault');
 assert.equal(c.width,70);
 assert.equal(c.length,140);
 assert.equal(c.height,18);
 assert.equal(c.archRise,12);
 assert.equal(c.enabled,true);
});
test('sapphire Gothic panorama is selected automatically for new and legacy scenes',()=>{
 assert.equal(DEFAULT_GOTHIC_TEXTURE,'assets/texturas/Panorama gótica de vitrales zafiro');
 assert.equal(BACKGROUND_DEFAULTS.texture,DEFAULT_GOTHIC_TEXTURE);
 assert.equal(normalizeSceneBackground().texture,DEFAULT_GOTHIC_TEXTURE);
 assert.equal(normalizeSceneBackground({width:80}).texture,DEFAULT_GOTHIC_TEXTURE);
 assert.equal(normalizeSceneBackground({texture:''}).texture,'');
 assert.ok(textureCandidates(DEFAULT_GOTHIC_TEXTURE).some(p=>p.endsWith('.png')));
 assert.ok(textureCandidates(DEFAULT_GOTHIC_TEXTURE).some(p=>p.endsWith('.jpeg')));
 assert.ok(textureCandidates(DEFAULT_GOTHIC_TEXTURE).some(p=>p.endsWith('.webp')));
});
test('Gothic texture resolver discovers real filename extension and accented case',async()=>{
 const listing=[{type:'file',name:'Panorama gótica de vitrales zafiro.webp'},
  {type:'file',name:'Other.png'}];
 const candidates=await resolveBackgroundTexture(DEFAULT_GOTHIC_TEXTURE,listing);
 assert.equal(candidates[0],'assets/texturas/Panorama gótica de vitrales zafiro.webp');
 assert.equal(candidates.length>1,true);
});
test('Gothic panorama offsets are controllable and persist in scene JSON',()=>{
 const config=normalizeSceneBackground({textureOffsetX:.25,textureOffsetY:-.35});
 assert.equal(config.textureOffsetX,.25);
 assert.equal(config.textureOffsetY,-.35);
 assert.equal(normalizeSceneBackground({textureOffsetX:3}).textureOffsetX,1);
 assert.equal(normalizeSceneBackground({textureOffsetY:-3}).textureOffsetY,-1);
 const bg=createSceneBackground(THREE);
 bg.setTextureOffset(.4,-.2);
 assert.equal(bg.config.textureOffsetX,.4);
 assert.equal(bg.config.textureOffsetY,-.2);
 bg.dispose();
});
test('background custom width always keeps 1:2 ratio and safe height ranges',()=>{
 const c=normalizeSceneBackground({width:100,height:24,archRise:16});
 assert.equal(c.length,200);
 assert.equal(c.height,24);
 assert.equal(c.archRise,16);
 assert.equal(normalizeSceneBackground({width:1000}).width,120);
 assert.equal(normalizeSceneBackground({width:-5}).width,30);
 assert.throws(()=>normalizeSceneBackground({type:'sky-dome'}));
 assert.throws(()=>normalizeSceneBackground({texture:'https://untrusted.example/p.png'}));
 assert.throws(()=>normalizeSceneBackground({texture:'assets/texturas/../evil.png'}));
 assert.equal(normalizeSceneBackground({texture:'assets/texturas/vitrales zafiro.png'}).texture,
  'assets/texturas/vitrales zafiro.png');
});
test('background creates walls, arched vault, end caps and exterior-only floor at arena level',()=>{
 const bg=createSceneBackground(THREE);
 assert.equal(bg.group.name,'ROK_Gothic_Background_VisualOnly');
 assert.equal(bg.group.children.length,9);
 const roof=bg.group.children[2];
 const y=Array.from(roof.geometry.position.array).filter((_,i)=>i%3===1);
 assert.equal(Math.min(...y),18);
 assert.equal(Math.max(...y),30);
 const floors=bg.group.children.slice(5);
 assert.equal(floors.length,4);
 for(const floor of floors)assert.equal(floor.position.y,-.03);
 const c=bg.build({width:90,height:20,archRise:15});
 assert.equal(c.length,180);
 assert.equal(bg.group.children.length,9,'rebuild must replace not accumulate geometry');
 bg.show(false);assert.equal(bg.group.visible,false);
 bg.show(true);assert.equal(bg.group.visible,true);
 bg.dispose();
});
test('editor saves, restores, and tester loads independent background JSON',async()=>{
 const editor=await readFile(new URL('../scene-editor.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../scene-editor.html',import.meta.url),'utf8');
 const tester=await readFile(new URL('../arena-scene-overlay.js',import.meta.url),'utf8');
 assert.match(editor,/createSceneBackground\(THREE,\{onStatus:status\}\)/);
 assert.match(editor,/background:normalizeSceneBackground\(backgroundInputs\(\)\)/);
 assert.match(editor,/environment\.build\(next\.background\)/);
 assert.match(html,/id="sceneBackgroundWidth"/);
 assert.match(html,/id="sceneBackgroundArch"/);
 assert.match(html,/id="sceneBackgroundTexture"/);
 assert.match(html,/id="sceneBackgroundOffsetX"/);
 assert.match(html,/id="sceneBackgroundOffsetY"/);
 assert.match(editor,/environment\.setTextureOffset\(x,y\)/);
 assert.match(tester,/background\.build\(normalized\.background\)/);
 assert.match(tester,/background\.show\(false\)/);
});
