/* Resonance analytics engine. No network or third-party dependencies. */
(function(root){
'use strict';
const str=v=>typeof v==='string'?v:'';
const flag=v=>v===true||v==='true'?true:v===false||v==='false'?false:null;
function normalize(r){
 if(!r||typeof r!=='object'||Array.isArray(r))return null;
 let ts=str(r.ts); if(!/(Z|[+-]\d\d:\d\d)$/.test(ts))ts=ts.replace(' ','T')+'Z';
 const t=Date.parse(ts), ms=r.ms_played;
 if(!Number.isFinite(t)||typeof ms!=='number'||!Number.isFinite(ms)||ms<0||!str(r.ts))return null;
 const type=r.master_metadata_track_name?'music':r.episode_name?'podcast':r.audiobook_title||r.audiobook_chapter_title?'audiobook':'unknown';
 const title=str(r.master_metadata_track_name||r.episode_name||r.audiobook_chapter_title||r.audiobook_title)||'Unknown title';
 const artist=str(type==='music'?r.master_metadata_album_artist_name:type==='podcast'?r.episode_show_name:type==='audiobook'?r.audiobook_title:'')||'Unknown creator';
 const album=str(r.master_metadata_album_album_name);
 const uri=str(r.spotify_track_uri||r.spotify_episode_uri||r.audiobook_chapter_uri||r.audiobook_uri);
 return {t,ts:new Date(t).toISOString(),ms,type,title,artist,album,uri,key:uri||JSON.stringify([type,title,artist,album]),platform:str(r.platform)||'Unknown',country:str(r.conn_country)||'Unknown',skip:flag(r.skipped),shuffle:flag(r.shuffle),offline:flag(r.offline),private:flag(r.incognito_mode),start:str(r.reason_start)||'Unknown',end:str(r.reason_end)||'Unknown'};
}
function identity(r){return JSON.stringify([r.t,r.ms,r.key,r.platform,r.country,r.skip,r.shuffle,r.offline,r.private,r.start,r.end]);}
function importRows(raw,existing=[]){
 if(!Array.isArray(raw))throw Error('Expected a JSON array from Spotify Extended Streaming History.');
 const seen=new Set(existing.map(identity)),rows=[],stats={read:raw.length,added:0,duplicates:0,invalid:0};
 for(const item of raw){const r=normalize(item);if(!r){stats.invalid++;continue;}const id=identity(r);if(seen.has(id)){stats.duplicates++;continue;}seen.add(id);rows.push(r);stats.added++;}
 return {rows,stats};
}
function dateRows(rows,zone='UTC'){
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
 for(const r of rows){const p=Object.fromEntries(fmt.formatToParts(r.t).map(p=>[p.type,p.value]));r.day=`${p.year}-${p.month}-${p.day}`;r.year=p.year;r.month=r.day.slice(0,7);r.hour=+p.hour;r.weekday=(new Date(r.day+'T00:00:00Z').getUTCDay()+6)%7;}
 return rows;
}
function filter(rows,f={}){const q=(f.query||'').toLowerCase();return rows.filter(r=>(!f.from||r.day>=f.from)&&(!f.to||r.day<=f.to)&&(!f.year||r.year===f.year)&&(!f.type||r.type===f.type)&&(!f.artist||r.artist===f.artist)&&(!f.platform||r.platform===f.platform)&&r.ms>=(+f.min||0)*1000&&(!q||[r.title,r.artist,r.album].some(s=>s.toLowerCase().includes(q))));}
function group(rows,field){const m=new Map();for(const r of rows){const k=typeof field==='function'?field(r):r[field];if(!m.has(k))m.set(k,{key:k,name:k,n:0,ms:0,skips:0,known:0,first:r.t,last:r.t,example:r});const a=m.get(k);a.n++;a.ms+=r.ms;a.skips+=r.skip===true;a.known+=r.skip!==null;a.first=Math.min(a.first,r.t);a.last=Math.max(a.last,r.t);}return [...m.values()].sort((a,b)=>b.ms-a.ms||b.n-a.n||String(a.key).localeCompare(String(b.key)));}
function stats(rows){const ms=rows.reduce((s,r)=>s+r.ms,0),artists=group(rows.filter(r=>r.type==='music'&&r.artist!=='Unknown creator'),'artist'),musicMs=artists.reduce((s,a)=>s+a.ms,0);let entropy=0;for(const a of artists){const p=a.ms/musicMs;if(p>0)entropy-=p*Math.log(p);}const days=group(rows,'day').sort((a,b)=>a.key.localeCompare(b.key));let run=0,longest=0,prev=null;for(const d of days){if(d.ms<=0)continue;const t=Date.parse(d.key);run=prev!==null&&t-prev===86400000?run+1:1;longest=Math.max(longest,run);prev=t;}const known=rows.filter(r=>r.skip!==null).length;
 return {n:rows.length,ms,artists:artists.length,tracks:new Set(rows.filter(r=>r.type==='music').map(r=>r.key)).size,days:days.filter(d=>d.ms>0).length,skip:known?rows.filter(r=>r.skip===true).length/known:null,known,entropy,effective:musicMs?Math.exp(entropy):0,top10:musicMs?artists.slice(0,10).reduce((s,a)=>s+a.ms,0)/musicMs:0,longest};}
function sessions(rows,gap=30){const sorted=[...rows].sort((a,b)=>(a.t-a.ms)-(b.t-b.ms)),out=[];let s;for(const r of sorted){const start=r.t-r.ms;if(!s||start-s.end>gap*60000){s={start,end:r.t,ms:0,n:0};out.push(s);}s.end=Math.max(s.end,r.t);s.ms+=r.ms;s.n++;}return out.sort((a,b)=>b.ms-a.ms);}
function continuousMonths(rows){if(!rows.length)return [];let a=rows.reduce((a,r)=>r.month<a?r.month:a,rows[0].month),b=rows.reduce((a,r)=>r.month>a?r.month:a,rows[0].month),out=[];const d=new Date(a+'-01T00:00:00Z');while(d.toISOString().slice(0,7)<=b){out.push(d.toISOString().slice(0,7));d.setUTCMonth(d.getUTCMonth()+1);}return out;}
function csv(rows,columns){const safe=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\ufeff'+[columns.map(c=>safe(c.label)).join(','),...rows.map(r=>columns.map(c=>safe(typeof c.value==='function'?c.value(r):r[c.value])).join(','))].join('\r\n');}
const api={normalize,identity,importRows,dateRows,filter,group,stats,sessions,continuousMonths,csv};
if(typeof module!=='undefined')module.exports=api;root.Resonance=api;
})(typeof self!=='undefined'?self:globalThis);
