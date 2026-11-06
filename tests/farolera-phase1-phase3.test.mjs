import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FAROLERA_RANGE,withinThrowRange,prepareLanternThrow,
 lerpLanternPosition,chainEndpoints,lampLightDescriptor
} from '../features/farolera/phase-1/phase-3-lantern.js';

test('phase 3: limit exactly 4 cells without using caster attack range',()=>{
 assert.equal(FAROLERA_RANGE,4);
 assert.equal(withinThrowRange({x:0,z:0},{x:4,z:0}),true);
 assert.equal(withinThrowRange({x:0,z:0},{x:4.1,z:0}),false);
 assert.throws(()=>prepareLanternThrow({x:0,z:0},{x:0,z:5}),RangeError);
});
test('phase 3: lamp flies outward; chain remains attached to hand',()=>{
 const plan=prepareLanternThrow({x:2,z:3},{x:6,z:3});
 const mid=lerpLanternPosition(plan,0.5);
 assert.equal(mid.x,4);
 assert.ok(mid.height>0.3);
 const endpoints=chainEndpoints({x:2,y:1.4,z:3},{x:mid.x,y:mid.height,z:mid.z});
 assert.deepEqual(endpoints.from,{x:2,y:1.4,z:3});
 assert.ok(endpoints.length>1.9);
 assert.equal(lerpLanternPosition(plan,1).x,6);
});
test('phase 3: static lamp landing glow',()=>{
 const light=lampLightDescriptor({x:6,z:3});
 assert.equal(light.x,6);assert.equal(light.z,3);
 assert.ok(light.radius>0&&light.intensity>0);
});
