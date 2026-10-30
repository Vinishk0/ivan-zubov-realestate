import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewsHandler,createCallbackHandler} from '../lib/reviews.mjs';
function response(){return {code:0,setHeader(){},writeHead(code){this.code=code;},end(data){this.data=data;}};}
const env={VK_COMMUNITY_TOKEN:'test',VK_PEER_ID:'123',VK_REVIEW_MODERATOR_IDS:'123',VK_CALLBACK_SECRET:'secret',VK_GROUP_ID:'42'};
test('submission stays pending and sends both moderation buttons',async()=>{
 const calls=[];const s={env,key:id=>'r:'+id,db:async(...args)=>{calls.push(args);return args[0]==='INCR'?1:'OK';},vk:async(method,p)=>{calls.push([method,p]);return 1;}};
 const res=response();await createReviewsHandler(s)({method:'POST',headers:{'content-type':'application/json',host:'local'},body:{name:'Анна',text:'Спасибо за помощь с покупкой квартиры!',consent:true}},res);
 assert.equal(res.code,200);const saved=JSON.parse(calls.find(c=>c[0]==='SET')[2]);assert.equal(saved.status,'pending');
 const keyboard=JSON.parse(calls.find(c=>c[0]==='messages.send')[1].keyboard);assert.equal(keyboard.buttons[0].length,2);assert.equal(calls.some(c=>c[0]==='ZADD'),false);
});
test('public endpoint excludes pending and rejected reviews',async()=>{
 const s={key:x=>x,db:async(c)=>c==='ZRANGE'?['a','b','c']:['published','pending','rejected'].map(status=>JSON.stringify({id:status,status,name:'Имя',text:'Текст'}))};const res=response();await createReviewsHandler(s)({method:'GET'},res);assert.deepEqual(JSON.parse(res.data).reviews.map(r=>r.id),['published']);
});
test('callback rejects forged secret and unauthorized moderator',async()=>{
 let touched=false;const handler=createCallbackHandler({env,db:async()=>{touched=true;}});
 for(const [secret,user] of [['wrong',123],['secret',999]]){const res=response();await handler({method:'POST',body:{secret,group_id:42,type:'message_event',object:{user_id:user}}},res);assert.equal(res.code,403);}assert.equal(touched,false);
});
test('authorized callback atomically publishes or rejects and acknowledges VK',async()=>{
 for(const decision of ['published','rejected']){const calls=[];const s={env,key:x=>x,db:async(...args)=>{calls.push(args);return '{}';},vk:async()=>1};const res=response();await createCallbackHandler(s)({method:'POST',body:{secret:'secret',group_id:42,type:'message_event',object:{user_id:123,peer_id:123,event_id:'event',payload:{review:'12345678-1234-1234-1234-123456789abc',decision}}}},res);assert.equal(res.code,200);assert.equal(calls.find(c=>c[0]==='EVAL').at(-1),decision);}
});
