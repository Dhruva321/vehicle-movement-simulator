
// Haversine meters
export const haversine = (a,b)=>{
  const R=6371000, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const lat1=toRad(a.lat), lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};

export const fmtTime = (ms) => {
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  return [h,m,ss].map((v,i)=>String(v).padStart(i?2:1,'0')).join(':');
};
export const fmtLatLng = (n)=> Number(n).toFixed(6);
export const fmtSpeed = (mps)=> (mps*3.6).toFixed(1)+' km/h';
export const fmtDist = (m)=> m<1000 ? `${m.toFixed(0)} m` : `${(m/1000).toFixed(2)} km`;

const toRad = d => (d*Math.PI)/180, toDeg = r => (r*180)/Math.PI;
export const bearing = (A,B)=>{
  if(!A||!B) return 0;
  const f1=toRad(A.lat), f2=toRad(B.lat), l1=toRad(A.lng), l2=toRad(B.lng);
  const y = Math.sin(l2-l1)*Math.cos(f2);
  const x = Math.cos(f1)*Math.sin(f2) - Math.sin(f1)*Math.cos(f2)*Math.cos(l2-l1);
  return (toDeg(Math.atan2(y,x)) + 360)%360;
};
