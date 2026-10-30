import { randomUUID, timingSafeEqual } from 'node:crypto';
export const json = (res, code, data) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
export async function body(req) {
  if (req.body !== undefined) { const s=typeof req.body==='string'?req.body:JSON.stringify(req.body); if(Buffer.byteLength(s)>12000) throw Error(); return JSON.parse(s); }
  let s=''; for await(const c of req) { s+=c; if(Buffer.byteLength(s)>12000) throw Error(); } return JSON.parse(s);
}
export function services(env=process.env, fetchImpl=fetch) {
  const namespace=env.REVIEWS_NAMESPACE || 'ivan-reviews';
  return {
    env,
    async db(...command) {
      if(!env.REVIEWS_REDIS_URL || !env.REVIEWS_REDIS_TOKEN) throw Error('Storage not configured');
      const r=await fetchImpl(env.REVIEWS_REDIS_URL,{method:'POST',headers:{Authorization:`Bearer ${env.REVIEWS_REDIS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});
      const d=await r.json(); if(!r.ok || d.error) throw Error('Storage unavailable'); return d.result;
    },
    key: id=>`${namespace}:${id}`,
    async vk(method, params) {
      const r=await fetchImpl(`https://api.vk.com/method/${method}`,{method:'POST',body:new URLSearchParams({access_token:env.VK_COMMUNITY_TOKEN,v:'5.199',...params}),signal:AbortSignal.timeout(10000)});
      const d=await r.json(); if(!r.ok || d.error) throw Error('VK unavailable'); return d.response;
    }
  };
}
export function secretEqual(a,b) { if(typeof a!=='string'||typeof b!=='string'||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y); }
export function createReviewsHandler(s=services()) {
  return async(req,res)=>{
    try {
      if(req.method==='GET') {
        const ids=await s.db('ZRANGE',s.key('published'),-100,-1);
        const rows=ids.length?await s.db('MGET',...ids.map(s.key)):[];
        return json(res,200,{reviews:rows.filter(Boolean).map(JSON.parse).filter(r=>r.status==='published').map(r=>({id:r.id,quote:r.text,topic:r.name}))});
      }
      if(req.method!=='POST') return json(res,405,{message:'Метод не поддерживается.'});
      if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{message:'Неверный формат.'});
      const origin=req.headers.origin;
      if(origin&&!['https://'+req.headers.host,'http://'+req.headers.host,s.env.LEAD_ALLOWED_ORIGIN].includes(origin))return json(res,403,{message:'Отправьте отзыв с сайта.'});
      const b=await body(req),name=String(b.name||'').trim(),text=String(b.text||'').trim();
      if(b.website||name.length<2||name.length>80||text.length<10||text.length>3000||b.consent!==true)return json(res,400,{message:'Укажите имя, отзыв от 10 до 3000 символов и согласие на публикацию.'});
      const e=s.env,peer=e.VK_TEST_MODE==='true'?e.VK_TEST_PEER_ID:e.VK_PEER_ID;
      if(!e.VK_COMMUNITY_TOKEN||!/^\d+$/.test(peer||'')||!e.VK_REVIEW_MODERATOR_IDS||!e.VK_CALLBACK_SECRET||!e.VK_GROUP_ID) return json(res,503,{message:'Приём отзывов пока настраивается.'});
      const ip=String(req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown');
      const rate=s.key('rate:'+ip);const count=await s.db('INCR',rate);if(count===1)await s.db('EXPIRE',rate,600);if(count>3)return json(res,429,{message:'Попробуйте снова через 10 минут.'});
      const id=randomUUID(),review={id,name,text,status:'pending',createdAt:Date.now()};
      await s.db('SET',s.key(id),JSON.stringify(review),'EX',2592000);
      try {
        await s.vk('messages.send',{peer_id:peer,random_id:String(parseInt(id.replaceAll('-','').slice(0,7),16)||1),message:`Новый отзыв на модерацию\n\n${name}\n\n${text}`,keyboard:JSON.stringify({inline:true,buttons:[[{action:{type:'callback',label:'Опубликовать',payload:JSON.stringify({review:id,decision:'published'})},color:'positive'},{action:{type:'callback',label:'Не публиковать',payload:JSON.stringify({review:id,decision:'rejected'})},color:'negative'}]]})});
      } catch { await s.db('DEL',s.key(id));return json(res,502,{message:'Не удалось доставить отзыв. Попробуйте позже.'}); }
      return json(res,200,{ok:true,message:'Спасибо! Отзыв отправлен на проверку и появится после одобрения.'});
    }catch{return json(res,503,{message:'Сервис отзывов временно недоступен.'});}
  };
}
export function createCallbackHandler(s=services()) {
 return async(req,res)=>{
  const plain=(code,t)=>{res.writeHead(code,{'Content-Type':'text/plain'});res.end(t);};
  if(req.method!=='POST')return plain(405,'Method not allowed');
  try {
   const b=await body(req),e=s.env;
   if(!secretEqual(b.secret,e.VK_CALLBACK_SECRET)||String(b.group_id)!==e.VK_GROUP_ID)return plain(403,'Forbidden');
   if(b.type==='confirmation')return plain(200,e.VK_CALLBACK_CONFIRMATION||'');
   if(b.type!=='message_event')return plain(200,'ok');
   const o=b.object,allowed=(e.VK_REVIEW_MODERATOR_IDS||'').split(',').map(x=>x.trim());
   if(!allowed.includes(String(o?.user_id)))return plain(403,'Forbidden');
   const p=o.payload;if(!p||!/^[-a-f0-9]{36}$/.test(p.review)||!['published','rejected'].includes(p.decision))return plain(400,'Invalid action');
   const raw=await s.db('GET',s.key(p.review));if(!raw)return plain(200,'ok');
   // Atomic compare/update makes double clicks and conflicting decisions safe.
   const script="local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local r=cjson.decode(raw); if r.status~='pending' then return 0 end; r.status=ARGV[1]; redis.call('SET',KEYS[1],cjson.encode(r)); if ARGV[1]=='published' then redis.call('ZADD',KEYS[2],r.createdAt,r.id) else redis.call('EXPIRE',KEYS[1],2592000) end; return 1";
   await s.db('EVAL',script,2,s.key(p.review),s.key('published'),p.decision);
   await s.vk('messages.sendMessageEventAnswer',{event_id:o.event_id,user_id:String(o.user_id),peer_id:String(o.peer_id),event_data:JSON.stringify({type:'show_snackbar',text:'Решение сохранено'})});
   return plain(200,'ok');
  }catch{return plain(503,'Retry');}
 };
}
