// Deterministic fictional records. Not derived from personal listening history.
module.exports=Array.from({length:96},(_,i)=>({
 ts:new Date(Date.UTC(2023+Math.floor(i/48),i%12,1+i%20,8+i%12)).toISOString(),
 ms_played:30000+(i%8)*30000,
 master_metadata_track_name:`Test Track ${i%12}`,
 master_metadata_album_artist_name:`Test Artist ${i%4}`,
 master_metadata_album_album_name:`Test Album ${i%6}`,
 spotify_track_uri:null,
 platform:'Test Device',conn_country:'XX',
 skipped:i%5===0?null:i%7===0,shuffle:i%2===0,offline:false,
 reason_start:'test',reason_end:'test'
}));
