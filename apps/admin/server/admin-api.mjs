import '../../../packages/common/server/env.mjs';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const uuid = z.string().uuid();
const profileSchema = z.object({
  email: z.string().trim().email().max(254),
  display_name: z.string().trim().min(1).max(100),
  user_type: z.enum(['user', 'artist', 'admin']),
  password: z.string().min(8).max(128).optional(),
}).strict();
const artistSchema = z.object({
  user_id: uuid,
  artist_name: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(5000),
  genre: z.string().trim().min(1).max(100),
  location: z.string().trim().max(200),
  website_url: z.union([z.literal(''), z.string().url().regex(/^https?:\/\//)]),
  social_url: z.union([z.literal(''), z.string().url().regex(/^https?:\/\//)]),
}).strict();
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const check = (result) => {
  if (result.error) {
    if (['PGRST204', 'PGRST205', '42703', '42883'].includes(result.error.code))
      throw new HttpError(503, 'The admin database migration is required. Apply 20260909120000_admin_console.sql.');
    throw new HttpError(400, result.error.message);
  }
  return result;
};
const fields = 'id,email,display_name,user_type,account_status,created_at,last_login';
const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().max(100).default(''), status: z.string().max(20).default('all') });
const searchTerm = (s) => s.replace(/[%_*(),\\]/g, ' ').trim();
const banned = (status) => status === 'active' ? 'none' : '876000h';

export function createAdminService(service) {
  async function authorize(token) {
    if (!token) throw new HttpError(401, 'Sign in to continue.');
    const { data, error } = await service.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
    const { data: account } = check(await service.from('users').select('user_type,account_status').eq('id', data.user.id).single());
    if (account.user_type !== 'admin' || account.account_status !== 'active') throw new HttpError(403, 'Administrator access is required.');
    return data.user;
  }
  async function userRow(id) {
    const { data } = check(await service.from('users').select(fields).eq('id', uuid.parse(id)).maybeSingle());
    if (!data) throw new HttpError(404, 'Account not found.');
    return data;
  }
  async function audit(actor, action, target) {
    const result = await service.from('admin_audit_log').insert({actor_id:actor.id, action, target_id:target});
    if (result.error) throw new HttpError(500, 'The change was saved, but its audit entry failed. Refresh before retrying.');
  }
  async function handle(actor, method, path, query, body) {
    const [resource, id, action] = path;
    if (resource === 'overview' && method === 'GET') {
      const requests = [
        service.from('users').select('id', {count:'exact',head:true}).neq('account_status','deleted'),
        service.from('artist_profiles').select('id', {count:'exact',head:true}),
        service.from('songs').select('id', {count:'exact',head:true}).eq('approval_status','pending'),
        service.from('users').select('id', {count:'exact',head:true}).eq('account_status','paused'),
        service.from('artist_profiles').select('id', {count:'exact',head:true}).eq('approval_status','pending'),
        service.from('songs').select('id', {count:'exact',head:true}).eq('approval_status','approved'),
        service.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(8),
      ];
      const r=(await Promise.all(requests)).map(check);
      return {users:r[0].count,artists:r[1].count,pendingSongs:r[2].count,paused:r[3].count,pendingArtists:r[4].count,published:r[5].count,recent:r[6].data};
    }
    if (resource === 'users' && method === 'GET' && id) {
      const account = await userRow(id);
      const [auth, artists, songs, activity] = await Promise.all([
        service.auth.admin.getUserById(id), service.from('artist_profiles').select('*').eq('user_id',id).maybeSingle(),
        service.from('songs').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(50),
        service.from('user_activity').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(20),
      ]);
      [auth,artists,songs,activity].forEach(check);
      return { ...account, email_confirmed_at:auth.data.user.email_confirmed_at, last_sign_in_at:auth.data.user.last_sign_in_at, artist:artists.data, songs:songs.data, activity:activity.data };
    }
    if (['users','artists','songs','activity'].includes(resource) && method === 'GET' && !id) {
      const {page,search,status}=pageQuery.parse(query), size=20;
      const table={users:'users',artists:'artist_profiles',songs:'songs',activity:'admin_audit_log'}[resource];
      let q=service.from(table).select(resource==='users'?fields:'*',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false});
      const term=searchTerm(search);
      if(term) {
        const columns={users:['display_name','email'],artists:['artist_name','genre'],songs:['title','artist'],activity:['action']}[resource];
        q=q.or(columns.map(c=>`${c}.ilike.%${term}%`).join(','));
      }
      if (status!=='all') {
        const allowed=resource==='users'?['active','paused','deleted']:['pending','approved','rejected'];
        if(!allowed.includes(status)||resource==='activity') throw new HttpError(400,'Invalid status filter.');
        q=q.eq(resource==='users'?'account_status':'approval_status',status);
      } else if(resource==='users') q=q.neq('account_status','deleted');
      const result=check(await q.range((page-1)*size,page*size-1));
      let items=result.data;
      if(resource==='artists' && items.length) {
        const accounts=check(await service.from('users').select(fields).in('id',items.map(a=>a.user_id))).data;
        items=items.map(a=>({...a,account:accounts.find(u=>u.id===a.user_id)}));
      }
      return {items,total:result.count,page,pageSize:size};
    }
    if(resource==='users' && method==='POST' && !id) {
      const input=profileSchema.parse(body);
      if(!input.password) throw new HttpError(400,'An initial password is required.');
      if(input.user_type==='admin') throw new HttpError(400,'Create administrators using the protected seed workflow.');
      const auth=check(await service.auth.admin.createUser({email:input.email,password:input.password,email_confirm:true,user_metadata:{display_name:input.display_name}}));
      const result=await service.from('users').upsert({id:auth.data.user.id,email:input.email,display_name:input.display_name,user_type:input.user_type,account_status:'active'});
      if(result.error) {
        const rollback=await service.auth.admin.deleteUser(auth.data.user.id);
        if(rollback.error) throw new HttpError(500,'Account setup was incomplete. Review the Auth account before retrying.');
        check(result);
      }
      await audit(actor,'account.created',auth.data.user.id);
      return {id:auth.data.user.id};
    }
    if(resource==='users' && method==='PATCH' && id && !action) {
      const old=await userRow(id), input=profileSchema.omit({password:true}).parse(body);
      if(old.account_status==='deleted') throw new HttpError(409,'Restore this account before editing it.');
      if((old.user_type==='admin'||input.user_type==='admin')&&input.user_type!==old.user_type) throw new HttpError(403,'Administrator roles are protected.');
      const auth=check(await service.auth.admin.getUserById(id)).data.user;
      check(await service.auth.admin.updateUserById(id,{email:input.email,user_metadata:{...auth.user_metadata,display_name:input.display_name}}));
      const result=await service.from('users').update(input).eq('id',id);
      if(result.error) {
        const rollback=await service.auth.admin.updateUserById(id,{email:auth.email,user_metadata:auth.user_metadata});
        if(rollback.error) throw new HttpError(500,'The Auth account changed but the profile update failed. Review the account before retrying.');
        check(result);
      }
      await audit(actor,'account.updated',id); return {id};
    }
    if(resource==='users' && id && action==='status' && method==='POST') {
      const {status}=z.object({status:z.enum(['active','paused','deleted'])}).strict().parse(body);
      const old=await userRow(id);
      if(old.user_type==='admin'||id===actor.id) throw new HttpError(403,'Administrator accounts cannot be paused or deleted.');
      // Block existing JWTs through RLS before changing Supabase Auth access.
      check(await service.from('users').update({account_status:status}).eq('id',id));
      const result=await service.auth.admin.updateUserById(id,{ban_duration:banned(status)});
      if(result.error) {
        const rollback=await service.from('users').update({account_status:old.account_status}).eq('id',id);
        if(rollback.error) throw new HttpError(500,'Account access changed but Auth synchronization failed. Review the account before retrying.');
        check(result);
      }
      await audit(actor,`account.${status}`,id); return {id,status};
    }
    if(resource==='artists' && (method==='POST'||method==='PATCH') && !action) {
      const input=artistSchema.parse(body); const account=await userRow(input.user_id);
      if(account.account_status!=='active') throw new HttpError(409,'Restore or resume the account before editing its artist profile.');
      let result;
      if(id) result=await service.from('artist_profiles').update({...input,updated_at:new Date().toISOString()}).eq('id',uuid.parse(id)).eq('user_id',input.user_id).select('id').single();
      else result=await service.from('artist_profiles').insert({...input,approval_status:'pending'}).select('id').single();
      check(result); await audit(actor,id?'artist.updated':'artist.created',result.data.id); return result.data;
    }
    if(resource==='artists' && method==='DELETE' && id) {
      const old=check(await service.from('artist_profiles').select('user_id').eq('id',uuid.parse(id)).single()).data;
      // Deleting the profile revokes upload eligibility even if account role is artist.
      check(await service.from('artist_profiles').delete().eq('id',id));
      await audit(actor,'artist.deleted',id); return {id,user_id:old.user_id};
    }
    if(resource==='songs' && method==='DELETE' && id) {
      const songId=uuid.parse(id);
      const asset=check(await service.from('song_assets').select('full_object_path,preview_object_path').eq('song_id',songId).maybeSingle());
      check(await service.from('songs').delete().eq('id',songId));
      if(asset.data?.full_object_path) check(await service.storage.from('song-audio').remove([asset.data.full_object_path]));
      if(asset.data?.preview_object_path) check(await service.storage.from('song-previews').remove([asset.data.preview_object_path]));
      await audit(actor,'song.deleted',songId); return {id:songId};
    }
    throw new HttpError(404,'Admin endpoint not found.');
  }
  return {authorize,handle};
}

let api;
export default async function adminHandler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  try {
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname.replace(/^\/api\/admin\/?/,'').split('/').filter(Boolean);
    if(!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) throw new HttpError(503,'Admin server credentials are not configured.');
    api ??= createAdminService(createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
    const actor=await api.authorize(req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]);
    let body=req.body;
    if(!body && !['GET','HEAD'].includes(req.method)) {
      let raw='';
      for await(const chunk of req) {raw+=chunk; if(Buffer.byteLength(raw)>16384) throw new HttpError(413,'Request is too large.');}
      try{body=raw?JSON.parse(raw):{};}catch{throw new HttpError(400,'Invalid JSON request.');}
    }
    const result=await api.handle(actor,req.method,path,Object.fromEntries(url.searchParams),body||{});
    res.statusCode=200; res.end(JSON.stringify(result));
  } catch(error) {
    res.statusCode=error instanceof z.ZodError?400:error.status||500;
    res.end(JSON.stringify({error:error instanceof z.ZodError?error.issues.map(i=>i.message).join(' '):error.status?error.message:'An unexpected admin server error occurred.'}));
  }
}
