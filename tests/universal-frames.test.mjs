import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('universal inspector uses the existing visor mixer and has one of each required control',async()=>{
 const [viewer,inspector,style]=await Promise.all([
   read('index.html'),read('universal-frames.js'),read('universal-frames.css')
 ]);
 for(const id of ['universalFrames','ufSource','ufTimeline','ufFrame','ufTime','ufFPS',
   'ufSpeed','ufSpeedValue','ufPlay','ufPrev','ufNext','ufFirst','ufLast',
   'ufMarkStart','ufMarkEnd','ufStart','ufEnd','ufCopy','ufExport','ufStatus']){
   const matched=viewer.match(new RegExp('id="'+id+'"','g'))||[];
   assert.equal(matched.length,1,id);
 }
 assert.match(viewer,/from '\.\/universal-frames\.js'/);
 assert.match(viewer,/createUniversalFrameInspector\(\{/);
 assert.match(viewer,/universalInspector\.update\(\)/);
 assert.match(viewer,/mixer\.clipAction\(clip\)\.reset\(\)/);
 assert.match(inspector,/adapter\.current\(\)/);
 assert.match(inspector,/inspectionFPS/);
 assert.match(inspector,/rok3d\.animation-range/);
 assert.match(style,/#universalFrames/);
});
test('universal scrubbing preserves special archer preview and avoids source mutation',async()=>{
 const [viewer,inspector]=await Promise.all([read('index.html'),read('universal-frames.js')]);
 assert.match(viewer,/archerSeekAttackFrame\(Math\.round\(seconds\*archerAttackFPS\(\)\)\)/);
 assert.match(viewer,/captureOriginalArmPose\(\);previewArmAngles\(\);/);
 assert.match(viewer,/archerArmOffsets/);
 assert.match(inspector,/rangeStart=0;rangeEnd=/);
 assert.match(inspector,/markStart\.addEventListener/);
 assert.match(inspector,/markEnd\.addEventListener/);
 assert.doesNotMatch(inspector,/localStorage|indexedDB|sessionStorage|writeFile/);
});
