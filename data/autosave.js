/* ============================================================================
 * STACS AUTOSAVE — never lose a half-finished application.
 *
 * Saves every 30 seconds and on each change, shows "✓ Saved 20:41", and offers
 * to resume if the browser is closed. Cleared automatically on submit.
 *
 * NEVER SAVED: passwords, and file uploads (browsers cannot restore a chosen
 * file, and storing document contents in the browser would be unsafe).
 *
 * USAGE:  STACSAutosave.init({ key:'skilled' });
 * ========================================================================== */
window.STACSAutosave = (function(){

  var CSS = ''
   + '.as-chip{position:fixed;right:20px;bottom:86px;z-index:9997;background:var(--card,#12502A);border:1px solid var(--bdr2,rgba(255,255,255,.22));'
   +   'color:var(--tx2,rgba(240,240,236,.7));border-radius:100px;padding:7px 14px;font-size:12px;font-family:system-ui,sans-serif;'
   +   'box-shadow:0 4px 14px rgba(0,0,0,.22);opacity:0;transition:opacity .25s;pointer-events:none}'
   + '.as-chip.show{opacity:1}'
   + '.as-chip b{color:#2ECC71}'
   + '.as-bar{background:rgba(200,146,10,.12);border:1px solid rgba(200,146,10,.34);border-radius:12px;padding:14px 16px;margin-bottom:16px;font-family:system-ui,sans-serif}'
   + '.as-bar .t{font-size:14px;font-weight:700;color:var(--gold2,#E2A53A);margin-bottom:3px}'
   + '.as-bar .d{font-size:12.8px;color:var(--tx2,rgba(240,240,236,.7));margin-bottom:11px}'
   + '.as-bar button{border:none;border-radius:9px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;margin-right:8px;font-family:inherit}'
   + '.as-resume{background:var(--gold,#C8920A);color:#231a02}'
   + '.as-fresh{background:transparent;color:var(--tx2,rgba(240,240,236,.7));border:1px solid var(--bdr2,rgba(255,255,255,.22))!important}';

  function injectCSS(){
    if(document.getElementById('stacs-autosave-css')) return;
    var st=document.createElement('style'); st.id='stacs-autosave-css'; st.textContent=CSS;
    document.head.appendChild(st);
  }

  function fields(){
    var out=[], els=document.querySelectorAll('input, select, textarea');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(!el.id) continue;
      if(el.type==='password' || el.type==='file') continue;     // never stored
      if(el.classList.contains('sp-search')) continue;           // picker search boxes are not data
      if(el.id.indexOf('po_')===0) continue;                     // payout fields are never cached
      out.push(el);
    }
    return out;
  }

  function snapshot(){
    var d={};
    fields().forEach(function(el){
      if(el.type==='checkbox' || el.type==='radio'){ if(el.checked) d[el.id+'::'+el.value]=1; }
      else if(el.value) d[el.id]=el.value;
    });
    return d;
  }

  function restore(d){
    fields().forEach(function(el){
      if(el.type==='checkbox' || el.type==='radio'){
        if(d[el.id+'::'+el.value]){ el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); }
      } else if(d[el.id]!==undefined){
        el.value=d[el.id];
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    /* pickers keep their value in a hidden field; re-render their chips */
    if(window.STACSPicker && typeof window.STACSPicker.rehydrate==='function'){
      try{ window.STACSPicker.rehydrate(); }catch(e){}
    }
  }

  function init(o){
    o=o||{}; injectCSS();
    var KEY='stacs_draft_'+(o.key||location.pathname.split('/').pop());
    var chip=document.createElement('div'); chip.className='as-chip'; document.body.appendChild(chip);
    var timer=null;

    function show(txt){
      chip.innerHTML=txt; chip.classList.add('show');
      clearTimeout(timer); timer=setTimeout(function(){ chip.classList.remove('show'); }, 2600);
    }
    function save(){
      try{
        var d=snapshot();
        if(Object.keys(d).length<2) return;                      // nothing worth saving yet
        localStorage.setItem(KEY, JSON.stringify({ at:Date.now(), data:d }));
        var t=new Date();
        show('<b>&#10003; Saved</b> &nbsp;'+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'));
      }catch(e){}
    }
    function clear(){ try{ localStorage.removeItem(KEY); }catch(e){} }

    /* offer to resume a previous draft */
    var raw=null;
    try{ raw=localStorage.getItem(KEY); }catch(e){}
    if(raw){
      try{
        var saved=JSON.parse(raw);
        var days=Math.floor((Date.now()-saved.at)/86400000);
        if(days>14){ clear(); }                                   // drafts expire after 14 days
        else {
          var when=new Date(saved.at);
          var bar=document.createElement('div'); bar.className='as-bar';
          bar.innerHTML='<div class="t">Continue where you stopped?</div>'
            + '<div class="d">We saved your answers on '+when.toLocaleDateString()+' at '
            + String(when.getHours()).padStart(2,'0')+':'+String(when.getMinutes()).padStart(2,'0')
            + '. Passwords and uploaded files are never saved, so you will need to add those again.</div>'
            + '<button type="button" class="as-resume">Resume my application</button>'
            + '<button type="button" class="as-fresh">Start fresh</button>';
          var host=document.querySelector('.wrap') || document.body;
          host.insertBefore(bar, host.firstChild);
          bar.querySelector('.as-resume').addEventListener('click', function(){
            restore(saved.data); bar.remove(); show('<b>&#10003; Restored</b>');
          });
          bar.querySelector('.as-fresh').addEventListener('click', function(){ clear(); bar.remove(); });
        }
      }catch(e){ clear(); }
    }

    /* save on change (debounced) and every 30 seconds */
    var deb=null;
    document.addEventListener('input', function(){ clearTimeout(deb); deb=setTimeout(save, 1200); }, true);
    document.addEventListener('change', function(){ clearTimeout(deb); deb=setTimeout(save, 800); }, true);
    setInterval(save, 30000);
    window.addEventListener('beforeunload', save);

    /* clear the draft once the form is actually submitted */
    document.addEventListener('click', function(e){
      var b=e.target.closest('button');
      if(b && /create my|register|submit/i.test(b.textContent||'')) setTimeout(clear, 2500);
    }, true);

    return { save:save, clear:clear };
  }
  return { init:init };
})();
