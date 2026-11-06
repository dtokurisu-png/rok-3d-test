/* R.O.K. Arena v1 — persistent same-origin immutable asset cache.
 * No HTML, JS, CSS, or manifests cached: deployments remain current.
 * Never touches localStorage or the user's custom mobile control layout.
 */
const CACHE_NAME='rok-arena-assets-v1';
const MAX_FILE_BYTES=48*1024*1024;
const EXT=/\.(?:glb|gltf|bin|fbx|png|jpe?g|webp|ktx2|basis)$/i;
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(n=>n.startsWith('rok-arena-assets-')&&n!==CACHE_NAME)
   .map(n=>caches.delete(n)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.cache==='no-store')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!EXT.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok&&response.type==='basic'){
   const bytes=Number(response.headers.get('content-length')||0);
   if(!bytes||bytes<=MAX_FILE_BYTES){
    event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
   }
  }
  return response;
 })());
});
