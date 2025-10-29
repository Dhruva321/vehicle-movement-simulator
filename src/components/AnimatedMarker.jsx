
import React,{useEffect,useRef}from'react'
import { Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

export default function AnimatedMarker({position, icon, duration=500, follow=true}){
  const ref=useRef(null)
  const map=useMap()
  useEffect(()=>{
    const marker=ref.current; if(!marker||!position) return;
    const start=marker.getLatLng(); const end=L.latLng(position);
    const t0=performance.now();
    const step=(now)=>{
      const a=Math.min(1,(now-t0)/duration);
      const lat=start.lat + (end.lat-start.lat)*a;
      const lng=start.lng + (end.lng-start.lng)*a;
      marker.setLatLng([lat,lng]);
      if(a<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    if(follow) map.panTo(end,{animate:true});
  },[position,duration,map,follow]);
  return <Marker ref={ref} position={position} icon={icon}/>
}
