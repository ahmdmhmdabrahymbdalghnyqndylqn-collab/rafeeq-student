import {createClient} from 'npm:@supabase/supabase-js@2.116.0'
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers})
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return reply(200,{ok:true})
 if(req.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'})
 const authorization=req.headers.get('authorization')||''
 if(!authorization.startsWith('Bearer '))return reply(401,{error:'AUTH_REQUIRED'})
 try{
  const url=Deno.env.get('SUPABASE_URL')!
  const publicKey=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY')!
  const client=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
  const user=await client.auth.getUser(authorization.slice(7))
  if(user.error||!user.data.user)return reply(401,{error:'INVALID_SESSION'})
  const access=await client.rpc('rafiq_access')
  if(access.error||!access.data?.admin||!access.data?.active)return reply(403,{error:'ADMIN_REQUIRED'})
  const body=await req.json()
  if(!['invite','delete'].includes(body.action))return reply(400,{error:'INVALID_ACTION'})
  const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  if(body.action==='invite'){
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))return reply(400,{error:'INVALID_EMAIL'})
   const redirectTo=typeof body.redirectTo==='string'&&body.redirectTo.startsWith('https://')?body.redirectTo:undefined
   const result=await admin.auth.admin.inviteUserByEmail(body.email.trim(),{redirectTo})
   if(result.error)return reply(400,{error:'INVITE_FAILED'})
   return reply(200,{ok:true})
  }
  if(typeof body.userId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.userId)||body.userId===user.data.user.id)return reply(400,{error:'INVALID_TARGET'})
  const paused=await client.rpc('rafiq_suspend',{target:body.userId,paused:true})
  if(paused.error)return reply(403,{error:'TARGET_NOT_ALLOWED'})
  const removed=await admin.auth.admin.deleteUser(body.userId)
  if(removed.error)return reply(400,{error:'DELETE_FAILED_ACCOUNT_SUSPENDED'})
  return reply(200,{ok:true})
 }catch{return reply(500,{error:'REQUEST_FAILED'})}
})
