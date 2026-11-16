import {useEffect,useRef} from 'react';
let scriptPromise;
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  script.onload=()=>resolve(window.turnstile);
  script.onerror=()=>{scriptPromise=undefined;script.remove();reject(Error('Security check unavailable.'));};
  document.head.appendChild(script);
 });
 return scriptPromise;
}
export default function ContactSecurity({onToken,reset}){
 const container=useRef(null);
 const sitekey=import.meta.env.VITE_TURNSTILE_SITE_KEY;
 useEffect(()=>{
  if(!sitekey)return;
  let cancelled=false,widget;
  loadTurnstile().then(api=>{
   if(cancelled)return;
   widget=api.render(container.current,{sitekey,action:'contact',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken(''),size:'flexible'});
  }).catch(()=>onToken(''));
  return()=>{cancelled=true;if(widget!==undefined)window.turnstile?.remove(widget);};
 },[onToken,reset,sitekey]);
 return sitekey?<div className="contact-security" ref={container}/>:<p role="status">The contact form is being set up. Please use the email or phone shown here.</p>;
}
