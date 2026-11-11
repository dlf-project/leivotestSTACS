/* ============================================================================
 * STACS LANGUAGE PAIRS — build "English → French" pairs by tapping, never typing.
 *
 * Free-typed pairs cannot be matched to jobs. This produces clean, structured
 * pairs: source language, target language, and direction.
 *
 * USAGE
 *   <div id="pairsBox"></div><input type="hidden" id="pairs">
 *   STACSPairs.mount({ el:'pairsBox', hidden:'pairs', max:12 });
 *
 * Stores JSON: [{from:'English', to:'French', dir:'both', label:'English ↔ French'}]
 * ========================================================================== */
window.STACSPairs = (function(){

  var CSS = ''
   + '.lp-wrap{background:var(--card2,#0F4423);border:1px solid var(--bdr,rgba(255,255,255,.12));border-radius:9px;padding:12px}'
   + '.lp-list{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}'
   + '.lp-pair{display:inline-flex;align-items:center;gap:8px;background:var(--gold,#C8920A);color:#231a02;border-radius:100px;padding:6px 10px 6px 13px;font-size:13px;font-weight:700}'
   + '.lp-pair small{font-weight:500;opacity:.75;font-size:10.5px}'
   + '.lp-pair button{background:rgba(0,0,0,.22);color:#231a02;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:1;padding:0}'
   + '.lp-step{font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:var(--tx3,rgba(240,240,236,.44));margin:0 0 6px}'
   + '.lp-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
   + '@media(max-width:560px){.lp-row{grid-template-columns:1fr}}'
   + '.lp-dir{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'
   + '.lp-dir button{background:var(--card,#12502A);border:1px solid var(--bdr2,rgba(255,255,255,.22));color:var(--tx,#F0F0EC);border-radius:100px;padding:8px 14px;font-size:12.5px;cursor:pointer;font-family:inherit}'
   + '.lp-dir button.on{background:var(--gold,#C8920A);color:#231a02;border-color:var(--gold,#C8920A);font-weight:700}'
   + '.lp-add{margin-top:12px;background:var(--gold,#C8920A);color:#231a02;border:none;border-radius:9px;padding:11px 18px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}'
   + '.lp-add:disabled{opacity:.45;cursor:not-allowed}'
   + '.lp-note{font-size:11.5px;color:var(--tx3,rgba(240,240,236,.44));margin-top:8px}';

  function injectCSS(){
    if(document.getElementById('stacs-pairs-css')) return;
    var st=document.createElement('style'); st.id='stacs-pairs-css'; st.textContent=CSS;
    document.head.appendChild(st);
  }
  function langs(){
    var L=(window.STACS_LANGS && window.STACS_LANGS.languages) || [];
    return L.map(function(l){
      return { id:'lang-'+l.code, name:l.name, sector:l.native, sub:'', aliases:l.aliases };
    });
  }

  function mount(o){
    injectCSS();
    var host=document.getElementById(o.el); if(!host) return null;
    var hidden=o.hidden? document.getElementById(o.hidden) : null;
    var MAX=o.max||12, pairs=[], dir='both', fromApi=null, toApi=null;

    host.innerHTML=''
      + '<div class="lp-wrap">'
      +   '<div class="lp-list" id="'+o.el+'_list"></div>'
      +   '<div class="lp-step">Step 1 &mdash; translate from</div>'
      +   '<div class="lp-row"><div id="'+o.el+'_from"></div><div id="'+o.el+'_to"></div></div>'
      +   '<div class="lp-step" style="margin-top:12px">Step 2 &mdash; which direction can you work in?</div>'
      +   '<div class="lp-dir" id="'+o.el+'_dir">'
      +     '<button type="button" data-d="both" class="on">&#8596; Both directions</button>'
      +     '<button type="button" data-d="fwd">&#8594; One way only</button>'
      +     '<button type="button" data-d="rev">&#8592; The other way only</button>'
      +   '</div>'
      +   '<button type="button" class="lp-add" id="'+o.el+'_add" disabled>Add this language pair</button>'
      +   '<div class="lp-note">Add every pair you are qualified to translate. Most translators have one or two.</div>'
      + '</div>';

    var listEl=document.getElementById(o.el+'_list');
    var addBtn=document.getElementById(o.el+'_add');

    function refreshAdd(){
      var f=fromApi&&fromApi.get()[0], t=toApi&&toApi.get()[0];
      addBtn.disabled = !(f && t && f.name!==t.name);
      addBtn.textContent = (f&&t&&f.name===t.name) ? 'Choose two different languages' : 'Add this language pair';
    }
    fromApi = window.STACSPicker.mountCustom({ el:o.el+'_from', data:langs(), max:1,
      placeholder:'Search: English, Français, العربية\u2026', onChange:refreshAdd });
    toApi   = window.STACSPicker.mountCustom({ el:o.el+'_to', data:langs(), max:1,
      placeholder:'\u2026into which language?', onChange:refreshAdd });

    var dirWrap=document.getElementById(o.el+'_dir');
    dirWrap.addEventListener('click', function(e){
      var b=e.target.closest('button[data-d]'); if(!b) return;
      dir=b.getAttribute('data-d');
      Array.prototype.forEach.call(dirWrap.querySelectorAll('button'), function(x){ x.classList.toggle('on', x===b); });
    });

    function label(f,t,d){
      if(d==='both') return f+' \u2194 '+t;
      if(d==='rev')  return t+' \u2192 '+f;
      return f+' \u2192 '+t;
    }
    function paint(){
      listEl.innerHTML=pairs.map(function(p,i){
        return '<span class="lp-pair">'+p.label+' <button type="button" data-i="'+i+'">\u00d7</button></span>';
      }).join('');
      Array.prototype.forEach.call(listEl.querySelectorAll('button'), function(b){
        b.addEventListener('click', function(){ pairs.splice(+b.getAttribute('data-i'),1); paint(); sync(); });
      });
    }
    function sync(){
      if(hidden) hidden.value = pairs.length ? JSON.stringify(pairs) : '';
      if(o.onChange) o.onChange(pairs.slice());
    }
    addBtn.addEventListener('click', function(){
      var f=fromApi.get()[0], t=toApi.get()[0];
      if(!f||!t||f.name===t.name) return;
      if(pairs.length>=MAX) return;
      var lab=label(f.name,t.name,dir);
      if(pairs.some(function(p){ return p.label===lab; })) return;
      pairs.push({ from:f.name, to:t.name, dir:dir, label:lab });
      fromApi.clear(); toApi.clear(); paint(); sync(); refreshAdd();
    });

    return { get:function(){ return pairs.slice(); }, clear:function(){ pairs=[]; paint(); sync(); } };
  }
  return { mount:mount };
})();
