import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const root=new URL('../',import.meta.url);
const path=url=>new URL(url,root);
const manifest=JSON.parse(await readFile(path('assets/manifests/asset-paths.json'),'utf8'));
const clips=JSON.parse(await readFile(path('assets/manifests/caster-animations.json'),'utf8'));

test('all registered canonical assets are present and match original Git blob SHA',async()=>{
  assert.equal(manifest.assets.length,manifest.totals.models+manifest.totals.clips+manifest.totals.archives+(manifest.totals.textures||0));
  for(const asset of manifest.assets){
    assert.match(asset.path,/^assets\/(models|animations|texturas)\//);
    const file=path(asset.path);
    const meta=await stat(file);
    assert.equal(meta.size,asset.sizeBytes,asset.path);
    const hash=createHash('sha1').update('blob '+meta.size+'\0');
    await pipeline(createReadStream(file),new Writable({write(chunk,_encoding,cb){hash.update(chunk);cb();}}));
    assert.equal(hash.digest('hex'),asset.gitBlobSha,asset.path);
  }
});

test('binary 3D files no longer clutter the repository root',async()=>{
  const names=await readdir(root);
  const legacy=names.filter(name=>/\.(glb|fbx|zip)$/i.test(name));
  assert.deepEqual(legacy,[]);
});

test('each active animation in manifest points to an existing canonical FBX',async()=>{
  const active=clips.animations.filter(item=>item.status!=='rejected');
  assert.equal(active.length,manifest.totals.clips);
  for(const entry of active){
    assert.match(entry.path,/^assets\/animations\/casters\/shared\//);
    await stat(path(entry.path));
  }
});

test('viewer and arena reference canonical assets and rejected indices stay excluded',async()=>{
  const [viewer,arena]=await Promise.all([
    readFile(path('index.html'),'utf8'),
    readFile(path('arena-25d.html'),'utf8')
  ]);
  assert.match(viewer,/assets\/models\/casters\/farolera\/chiara_idle\.glb/);
  assert.match(arena,/assets\/models\/casters\/farolera\/chiara_idle\.glb/);
  assert.match(viewer,/assets\/animations\/casters\/shared\//);
  assert.match(arena,/animation\.path\.split\('\/'\)/);
  assert.match(viewer,/rejectedAnimationIds=new Set\(\[4,5,17,18,19,20\]\)/);
  assert.doesNotMatch(viewer,/\.load\('\.\/chiara_idle\.glb'/);
  assert.doesNotMatch(arena,/\.load\('\.\/chiara_idle\.glb'/);
});

test('shared editor model library points to canonical GLBs and excludes reserved statues from scenes',async()=>{
  const library=JSON.parse(await readFile(path('assets/manifests/model-library.json'),'utf8'));
  const registered=new Map(manifest.assets.filter(x=>x.type==='model').map(x=>[x.path,x]));
  assert.equal(library.models.length,manifest.totals.models);
  assert.equal(new Set(library.models.map(x=>x.id)).size,library.models.length);
  assert.equal(library.models.filter(x=>x.category==='reserved').length,2);
  for(const model of library.models){
    const asset=registered.get(model.path);
    assert.ok(asset,'Unregistered model '+model.path);
    assert.equal(model.gitBlobSha,asset.gitBlobSha,model.path);
    assert.equal(model.bytes,asset.sizeBytes,model.path);
    assert.equal(model.enabledInSceneEditor,model.category==='prop',model.id);
    await stat(path(model.path));
  }
  const [assetEditor,sceneEditor,script]=await Promise.all([
    readFile(path('asset-editor.html'),'utf8'),
    readFile(path('scene-editor.html'),'utf8'),
    readFile(path('model-library.js'),'utf8')
  ]);
  assert.match(assetEditor,/model-library\.js/);
  assert.match(sceneEditor,/model-library\.js/);
  assert.match(script,/enabledInSceneEditor/);
});
