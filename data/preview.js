/* ============================================================================
 * STACS PREVIEW — a review step before the declarations and final submit.
 *
 * WHY: people submit forms they have not re-read. One typo in an email or a
 * date of birth costs an approval cycle. This shows them everything they typed,
 * in plain language, and makes them confirm it before anything is sent.
 *
 * FLOW
 *   [ fill the form ]  ->  "Review my details"  ->  [ read-only summary ]
 *        ^                                              |            |
 *        |______________ "Go back and edit" ____________|            v
 *                                                        "This is correct"
 *                                                                    |
 *                                                        [ declarations + submit ]
 *
 * USAGE
 *   STACSPreview.init({
 *     skip:        ['pw','pw2'],           // field ids to leave out
 *     declarations:'declCard',             // id of the declarations card (hidden until confirmed)
 *     validate:    function(){ return null; }   // return an error string to block, or null
 *   });
 * ========================================================================== */
window.STACSPreview = (function(){

  var CSS = ''
   + '.pv-btn{width:100%;background:var(--gold,#C8920A);color:#231a02;border:none;border-radius:11px;padding:15px;font-weight:800;font-size:15px;cursor:pointer;margin-top:6px;font-family:inherit}'
   + '.pv-btn:hover{background:var(--gold2,#E2A53A)}'
   + '.pv-wrap{background:var(--card,#12502A);border:1px solid var(--gold,#C8920A);border-radius:16px;padding:22px;margin-bottom:16px}'
   + '.pv-head{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:800;letter-spacing:.14em;color:var(--gold2,#E2A53A);text-transform:uppercase;margin-bottom:6px}'
   + '.pv-head b{width:22px;height:22px;border-radius:50%;background:var(--gold,#C8920A);color:#231a02;display:flex;align-items:center;justify-content:center;font-size:12px}'
   + '.pv-lede{font-size:13.5px;color:var(--tx2,rgba(240,240,236,.68));margin-bottom:16px}'
   + '.pv-sec{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold2,#E2A53A);font-weight:700;margin:16px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--bdr,rgba(255,255,255,.12))}'
   + '.pv-row{display:grid;grid-template-columns:minmax(140px,38%) 1fr;gap:10px;padding:7px 0;font-size:13.5px;align-items:start}'
   + '.pv-k{color:var(--tx3,rgba(240,240,236,.44))}'
   + '.pv-v{color:var(--tx,#F0F0EC);font-weight:600;word-break:break-word}'
   + '.pv-v.empty{color:var(--tx3,rgba(240,240,236,.44));font-weight:400;font-style:italic}'
   + '.pv-acts{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}'
   + '.pv-acts button{flex:1;min-width:190px;border-radius:11px;padding:14px;font-weight:800;font-size:14.5px;cursor:pointer;font-family:inherit}'
   + '.pv-back{background:transparent;color:var(--tx,#F0F0EC);border:1px solid var(--bdr2,rgba(255,255,255,.24))}'
   + '.pv-ok{background:var(--gold,#C8920A);color:#231a02;border:none}'
   + '.pv-warn{font-size:12.5px;color:var(--gold2,#E2A53A);background:rgba(200,146,10,.1);border:1px solid rgba(200,146,10,.3);border-radius:9px;padding:11px 13px;margin-top:14px}'
   + '.pv-err{font-size:13px;color:#E86A6A;background:rgba(232,106,106,.12);border-radius:9px;padding:11px 13px;margin-top:12px}';

  function injectCSS(){
    if(document.getElementById('stacs-preview-css')) return;
    var st=document.createElement('style'); st.id='stacs-preview-css'; st.textContent=CSS;
    document.head.appendChild(st);
  }

  /* pretty value for one field */
  function readValue(el){
    if(!el) return '';
    var t=(el.type||'').toLowerCase();
    if(t==='password') return el.value ? '\u2022'.repeat(Math.min(el.value.length,12)) : '';
    if(t==='file'){
      if(el.files && el.files.length) return el.files[0].name + ' (' + Math.round(el.files[0].size/1024) + ' KB)';
      return '';
    }
    if(t==='checkbox') return el.checked ? 'Yes' : 'No';
    if(el.tagName==='SELECT'){
      var o=el.options[el.selectedIndex];
      var v=o? o.textContent.trim() : '';
      return (/^select/i.test(v) || v==='\u2014') ? '' : v;
    }
    var raw=(el.value||'').trim();
    if(!raw) return '';
    /* picker hidden fields hold JSON */
    if(raw.charAt(0)==='[' || raw.charAt(0)==='{'){
      try{
        var j=JSON.parse(raw);
        if(Array.isArray(j)) return j.map(function(x){ return x.name || x; }).join(', ');
      }catch(e){}
    }
    return raw;
  }

  /* the human label sitting next to a field */
  function labelFor(el){
    var id=el.id;
    if(id){
      var lab=document.querySelector('label[for="'+id+'"]');
      if(lab) return clean(lab);
    }
    /* climb to the field wrapper and take its label */
    var p=el.parentElement, hops=0;
    while(p && hops<4){
      var l=p.querySelector(':scope > label') || p.querySelector('label');
      if(l) return clean(l);
      p=p.parentElement; hops++;
    }
    return id || 'Field';
  }
  function clean(labelEl){
    var t=(labelEl.textContent||'').replace(/\*/g,'').replace(/\s+/g,' ').trim();
    return t.replace(/\s*\(optional\)\s*$/i,'').replace(/:$/,'');
  }

  /* section heading a field belongs to */
  function sectionFor(el){
    var card=el.closest('.card, .sec-card, section');
    if(!card) return 'Your details';
    var h=card.querySelector('.sec, h2, h3');
    if(!h) return 'Your details';
    return (h.textContent||'').replace(/\s+/g,' ').replace(/^\s*\d+\s*/,'').trim() || 'Your details';
  }

  function collect(skip){
    var out=[], seen={};
    var els=document.querySelectorAll('input, select, textarea');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(!el.id) continue;
      if(skip.indexOf(el.id)>=0) continue;
      if(el.type==='radio' && !el.checked) continue;
      if(el.closest('.pv-wrap')) continue;               // never re-read the preview itself
      if(el.closest('#'+SKIP_DECL)) continue;            // declarations shown separately
      if(el.closest('[data-stage="2"]')) continue;        // completed after sign-in, not now
      if(el.type!=='hidden' && !el.offsetParent) continue; // anything hidden is not part of this step
      /* the visible search box of a picker is not data */
      if(el.classList.contains('sp-search') || el.classList.contains('tx-search')) continue;
      var val=readValue(el);
      var key=labelFor(el);
      if(seen[key+'|'+val]) continue;
      seen[key+'|'+val]=1;
      out.push({ section: sectionFor(el), key: key, val: val, required: isRequired(el) });
    }
    return out;
  }
  function isRequired(el){
    var p=el.closest('.f, .field, div');
    if(!p) return false;
    var l=p.querySelector('label');
    return !!(l && (l.querySelector('.req') || /\*/.test(l.textContent)));
  }

  var SKIP_DECL='declCard';

  function init(opts){
    opts=opts||{};
    injectCSS();
    SKIP_DECL = opts.declarations || 'declCard';
    var decl=document.getElementById(SKIP_DECL);
    if(!decl){ return; }                      // nothing to gate; leave the form as-is

    /* hide declarations until the summary is confirmed */
    decl.style.display='none';

    /* the submit button (and anything after the declarations) must hide too,
       otherwise a user can submit without ever reading the summary */
    var tail=[], node=decl.nextElementSibling;
    while(node){
      if(node.id!=='pvPanel' && !node.classList.contains('pv-wrap')){
        tail.push({el:node, prev:node.style.display});
        node.style.display='none';
      }
      node=node.nextElementSibling;
    }
    function showTail(){ tail.forEach(function(t){ t.el.style.display = t.prev || ''; }); }
    function hideTail(){ tail.forEach(function(t){ t.el.style.display='none'; }); }

    /* the review trigger sits where the declarations used to be */
    var trigger=document.createElement('button');
    trigger.type='button'; trigger.className='pv-btn'; trigger.id='pvTrigger';
    trigger.textContent='Review my details \u2192';
    var triggerWrap=document.createElement('div');
    triggerWrap.style.cssText='background:var(--card,#12502A);border:1px solid var(--bdr,rgba(255,255,255,.12));border-radius:16px;padding:22px;margin-bottom:16px';
    triggerWrap.innerHTML='<div class="pv-head"><b>\u2713</b> Almost done</div>'
      + '<div class="pv-lede">Check everything before you send it. You will see a summary of your answers, and you can go back and change anything.</div>';
    triggerWrap.appendChild(trigger);
    decl.parentNode.insertBefore(triggerWrap, decl);

    /* the summary panel */
    var panel=document.createElement('div');
    panel.className='pv-wrap'; panel.id='pvPanel'; panel.style.display='none';
    decl.parentNode.insertBefore(panel, decl);

    trigger.addEventListener('click', function(){
      var err = opts.validate ? opts.validate() : null;
      if(err){
        var box=document.getElementById('pvTriggerErr');
        if(!box){ box=document.createElement('div'); box.id='pvTriggerErr'; box.className='pv-err'; triggerWrap.appendChild(box); }
        box.textContent=err;
        box.scrollIntoView({behavior:'smooth', block:'center'});
        return;
      }
      var e=document.getElementById('pvTriggerErr'); if(e) e.remove();

      var rows=collect(opts.skip||[]);
      var bySec={}, order=[];
      rows.forEach(function(r){ if(!bySec[r.section]){ bySec[r.section]=[]; order.push(r.section); } bySec[r.section].push(r); });

      var missing=rows.filter(function(r){ return r.required && !r.val; });
      var html='<div class="pv-head"><b>\u2713</b> Review your details</div>'
        + '<div class="pv-lede">This is exactly what we will receive. Read it once \u2014 a wrong email or date of birth is the most common reason an application is delayed.</div>';
      order.forEach(function(sec){
        html+='<div class="pv-sec">'+sec+'</div>';
        bySec[sec].forEach(function(r){
          html+='<div class="pv-row"><div class="pv-k">'+r.key+'</div>'
              + '<div class="pv-v'+(r.val?'':' empty')+'">'+(r.val? escapeHtml(r.val) : (r.required?'Not provided \u2014 please go back':'Not provided'))+'</div></div>';
        });
      });
      if(missing.length){
        html+='<div class="pv-err"><b>'+missing.length+' required field'+(missing.length>1?'s are':' is')+' still empty:</b> '
            + missing.map(function(m){ return m.key; }).join(', ') + '. Please go back and complete '+(missing.length>1?'them':'it')+'.</div>';
      } else {
        html+='<div class="pv-warn">Everything required is filled in. If this all looks correct, continue to the declarations \u2014 that is the last step before submitting.</div>';
      }
      html+='<div class="pv-acts">'
          + '<button type="button" class="pv-back" id="pvBack">\u2190 Go back and edit</button>'
          + '<button type="button" class="pv-ok" id="pvOk"'+(missing.length?' disabled style="opacity:.5;cursor:not-allowed"':'')+'>This is correct \u2014 continue</button>'
          + '</div>';
      panel.innerHTML=html;
      triggerWrap.style.display='none';
      panel.style.display='block';
      panel.scrollIntoView({behavior:'smooth', block:'start'});

      document.getElementById('pvBack').addEventListener('click', function(){
        panel.style.display='none';
        triggerWrap.style.display='block';
        decl.style.display='none';
        hideTail();
        window.scrollTo({top:0, behavior:'smooth'});
      });
      var okBtn=document.getElementById('pvOk');
      if(okBtn && !okBtn.disabled){
        okBtn.addEventListener('click', function(){
          decl.style.display='block';
          showTail();
          decl.scrollIntoView({behavior:'smooth', block:'start'});
          okBtn.disabled=true; okBtn.textContent='\u2713 Confirmed';
          okBtn.style.opacity='.6'; okBtn.style.cursor='default';
        });
      }
    });
  }
  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init:init };
})();
