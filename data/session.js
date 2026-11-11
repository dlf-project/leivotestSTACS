/* ============================================================================
 * STACS SESSION GUARD — signs a member out after 30 minutes of inactivity.
 *
 * Shared devices are common. Leaving a dashboard open means the next person
 * sees someone's documents and payout details. This warns first, then signs
 * out and returns to the STACS home page.
 * ========================================================================== */
window.STACSSession = (function(){
  var IDLE_MS = 30*60*1000;      // 30 minutes
  var WARN_MS = 60*1000;         // warn for the final minute
  var t=null, wt=null, box=null;

  function css(){
    if(document.getElementById('stacs-idle-css')) return;
    var st=document.createElement('style'); st.id='stacs-idle-css';
    st.textContent='.idle-box{position:fixed;inset:0;background:rgba(4,18,9,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,sans-serif}'
      +'.idle-card{background:var(--card,#12502A);border:1px solid var(--gold,#C8920A);border-radius:16px;padding:26px;max-width:420px;width:100%;text-align:center;color:var(--tx,#F0F0EC)}'
      +'.idle-card h3{font-size:19px;margin:0 0 8px}.idle-card p{font-size:13.5px;color:var(--tx2,rgba(240,240,236,.7));margin:0 0 18px;line-height:1.6}'
      +'.idle-card button{background:var(--gold,#C8920A);color:#231a02;border:none;border-radius:10px;padding:13px 24px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit}'
      +'.idle-count{font-weight:800;color:var(--gold2,#E2A53A)}';
    document.head.appendChild(st);
  }
  function signOut(){
    try{ localStorage.removeItem('stacs_session'); }catch(e){}
    location.href='index.html?signedout=idle';
  }
  function warn(){
    css();
    var left=Math.round(WARN_MS/1000);
    box=document.createElement('div'); box.className='idle-box';
    box.innerHTML='<div class="idle-card"><h3>Still there?</h3>'
      +'<p>For your security we sign you out after 30 minutes without activity. '
      +'You will be signed out in <span class="idle-count" id="idleLeft">'+left+'</span> seconds.</p>'
      +'<button id="idleStay">I am still here</button></div>';
    document.body.appendChild(box);
    document.getElementById('idleStay').addEventListener('click', function(){ clear(); reset(); });
    var iv=setInterval(function(){
      left--; var el=document.getElementById('idleLeft');
      if(el) el.textContent=left;
      if(left<=0){ clearInterval(iv); signOut(); }
    },1000);
    box._iv=iv;
  }
  function clear(){ if(box){ clearInterval(box._iv); box.remove(); box=null; } }
  function reset(){
    clearTimeout(t); clearTimeout(wt);
    wt=setTimeout(warn, IDLE_MS - WARN_MS);
    t =setTimeout(signOut, IDLE_MS);
  }
  function init(){
    var sess=null; try{ sess=JSON.parse(localStorage.getItem('stacs_session')); }catch(e){}
    if(!sess) return;                                  // only guards signed-in pages
    ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function(ev){
      window.addEventListener(ev, function(){ if(!box) reset(); }, {passive:true});
    });
    reset();
  }
  return { init:init };
})();
