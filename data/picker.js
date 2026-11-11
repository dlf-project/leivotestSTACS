/* ============================================================================
 * STACS PICKER — one search-and-stick component for every hub.
 *
 * WHY: both ends of a match must describe the same thing with the same words.
 * A worker who picks "Industrial Electrician" and an employer who types
 * "Electrical Technician" will never be paired. Pick, don't type.
 *
 * USAGE
 *   <div id="myPicker"></div>
 *   <input type="hidden" id="myPickerValue">
 *
 *   STACSPicker.mount({
 *     el:        'myPicker',            // container id
 *     hidden:    'myPickerValue',       // hidden input that receives JSON
 *     source:    'professions',         // 'professions' | 'documents'
 *     max:       9,                     // how many may be selected
 *     primary:   true,                  // star the first pick (slot 1)
 *     placeholder:'Search: electrician, nurse, welder…',
 *     onChange:  function(selected){}   // optional
 *   });
 *
 * Requires data/taxonomy.js (professions). Document types are built in below
 * and mirror the Global Document Registry.
 * ========================================================================== */
window.STACSPicker = (function(){

  /* ---- document registry (categories -> types), mirrors the tier manual ---- */
  var DOCUMENTS = [
    ['Identity & civil','Passport (bio-data page)','National ID card','Birth certificate','Marriage certificate','Divorce decree','Death certificate','Change-of-name deed','Residence permit','Driving licence','Voter\'s card','Proof of address'],
    ['Education & academic','PhD / doctoral certificate','Master\'s degree','Bachelor\'s degree','Higher National Diploma (HND)','National Diploma (ND/OND)','Academic transcript','Secondary school certificate','Postgraduate diploma','Student status letter','Credential evaluation report','National service certificate'],
    ['Professional licences','Engineering licence','Architect registration','Accountancy membership','Legal practising certificate','Teaching registration','Surveyor / valuer licence','IT vendor certification','Project management certification','Professional body membership'],
    ['Trade & vocational','Trade test certificate','City & Guilds / NVTI certificate','Apprenticeship completion certificate','Welding certification','Electrical competence certificate','Plant / heavy equipment licence','Forklift / crane certification','Vocational training certificate','Workshop / short course certificate','Portfolio of work'],
    ['Employment & experience','Employment reference letter','Certificate of service','Employment contract','Payslips / salary evidence','Promotion / appointment letter','Attendance / conduct record','Redundancy / release letter','Self-employment evidence','Client invoices / receipts'],
    ['Language & testing','IELTS','TOEFL','PTE Academic','OET','Goethe / TestDaF','DELF / TCF','TEF Canada','CELPIP'],
    ['Health & medical','Medical practising licence','Nursing registration','Pharmacy registration','Dental registration','Allied-health registration','Hospital privileges letter','Clinical experience logbook','BLS / ACLS certification','Medical fitness certificate','Vaccination / yellow-fever card','Occupational health clearance'],
    ['Criminal & security','Police clearance certificate','International clearance','Court judgement','Affidavit / sworn declaration','Power of attorney','Security clearance certificate','Guarantor attestation'],
    ['Immigration & travel','Visa','Work permit','Residence permit (immigration)','Travel history record','Consular legalisation','Apostille','Sponsorship / invitation letter','Certificate of sponsorship'],
    ['Financial','Bank statement','Bank reference letter','Tax clearance certificate','Proof of funds','Pension / social security record'],
    ['Business & corporate','Certificate of incorporation','Business / trade licence','Recruitment licence','IATA / travel agency licence','Training accreditation certificate','Tax identification / VAT registration','Authorisation-to-recruit letter','Audited accounts'],
    ['Sector-specific','Pilot licence (ATPL/CPL)','Aircraft maintenance licence','Cabin crew certification','Seafarer certificate (STCW)','Seaman\'s book','Coaching licence','Player registration / ITC','Anti-doping clearance','Copyright / IP registration','Portfolio authenticity attestation']
  ];

  function docList(){
    var out=[];
    for(var i=0;i<DOCUMENTS.length;i++){
      var cat=DOCUMENTS[i][0];
      for(var j=1;j<DOCUMENTS[i].length;j++){
        out.push({ id:'doc-'+i+'-'+j, name:DOCUMENTS[i][j], sector:cat, sub:cat, aliases:[DOCUMENTS[i][j].toLowerCase()] });
      }
    }
    return out;
  }
  function profList(){
    return (window.STACS_TAXONOMY && window.STACS_TAXONOMY.professions) || [];
  }


  /* ---- geo sources: countries, nationalities, states, continents ---- */
  function geo(){ return window.STACS_GEO || {countries:[],states:{},continents:[]}; }
  function countryList(){
    return geo().countries.map(function(c){
      return { id:'c-'+c.iso, name:c.name, sector:c.cont, sub:'', aliases:[c.name.toLowerCase(), c.iso.toLowerCase(), (c.nat||'').toLowerCase()] };
    });
  }
  function nationalityList(){
    return geo().countries.map(function(c){
      return { id:'n-'+c.iso, name:c.nat, sector:c.name, sub:'', aliases:[(c.nat||'').toLowerCase(), c.name.toLowerCase(), c.iso.toLowerCase()] };
    });
  }
  /* destinations = continents first, then every country */
  function destinationList(){
    var out = geo().continents.map(function(k,i){
      return { id:'k-'+i, name:k, sector:'Whole region', sub:'', aliases:[k.toLowerCase()] };
    });
    return out.concat(countryList());
  }
  /* states depend on the chosen country; falls back to free choice when unknown */
  function stateList(country){
    var st = (geo().states||{})[country] || [];
    return st.map(function(n,i){ return { id:'s-'+i+'-'+n, name:n, sector:country||'', sub:'', aliases:[n.toLowerCase()] }; });
  }

  function sectorList(){
    var t=(window.STACS_TAXONOMY&&window.STACS_TAXONOMY.sectors)||[];
    return t.map(function(n,i){ return {id:'sec-'+i, name:n, sector:'Master sector', sub:'', aliases:[n.toLowerCase()]}; });
  }

  var CSS = '.sp-wrap{position:relative;background:var(--card2,#0F4423);border:1px solid var(--bdr,rgba(255,255,255,.12));border-radius:9px;padding:6px 6px 2px}'
    +'.sp-chips{display:flex;flex-wrap:wrap;gap:6px}'
    +'.sp-chip{display:inline-flex;align-items:center;gap:7px;background:var(--gold,#C8920A);color:#231a02;border-radius:100px;padding:5px 9px 5px 12px;font-size:12.5px;font-weight:700;margin-bottom:4px}'
    +'.sp-chip small{font-weight:500;opacity:.75;font-size:10.5px}'
    +'.sp-chip.primary{box-shadow:0 0 0 2px rgba(255,255,255,.35)}'
    +'.sp-chip button{background:rgba(0,0,0,.22);color:#231a02;border:none;border-radius:50%;width:17px;height:17px;cursor:pointer;font-size:12px;line-height:1;padding:0}'
    +'.sp-search{width:100%;background:transparent;border:none;color:var(--tx,#F0F0EC);font-size:14px;padding:7px 6px;outline:none;font-family:inherit}'
    +'.sp-results{position:absolute;left:0;right:0;top:100%;margin-top:5px;background:var(--bg2,#0b3b21);border:1px solid var(--bdr2,rgba(255,255,255,.2));border-radius:10px;max-height:290px;overflow-y:auto;z-index:60;display:none;box-shadow:0 14px 34px rgba(0,0,0,.45)}'
    +'.sp-results.show{display:block}'
    +'.sp-opt{padding:9px 13px;cursor:pointer;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}'
    +'.sp-opt:hover,.sp-opt.active{background:rgba(200,146,10,.16)}'
    +'.sp-opt .nm{font-size:13.5px;font-weight:600;color:var(--tx,#F0F0EC)}'
    +'.sp-opt .ctx{font-size:11px;color:var(--tx3,rgba(240,240,236,.4))}';

  function injectCSS(){
    if(document.getElementById('stacs-picker-css')) return;
    var st=document.createElement('style'); st.id='stacs-picker-css'; st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount(o){
    injectCSS();
    var host=document.getElementById(o.el); if(!host) return null;
    var hidden=o.hidden?document.getElementById(o.hidden):null;
    var DATA = o.data ? o.data
             : (o.source==='documents')     ? docList()
             : (o.source==='countries')      ? countryList()
             : (o.source==='nationalities')  ? nationalityList()
             : (o.source==='destinations')   ? destinationList()
             : (o.source==='states')         ? stateList(o.country)
             : (o.source==='sectors')        ? sectorList()
             : profList();
    var MAX = o.max||9, selected=[], matches=[], active=-1;

    host.innerHTML='<div class="sp-wrap"><div class="sp-chips"></div>'
      +'<input class="sp-search" type="text" autocomplete="off" placeholder="'+(o.placeholder||'Search…')+'">'
      +'<div class="sp-results"></div></div>';
    var chips=host.querySelector('.sp-chips'), search=host.querySelector('.sp-search'), results=host.querySelector('.sp-results');

    function n(x){ return (x||'').toLowerCase(); }
    function doSearch(q){
      q=n(q).trim(); if(!q){ results.classList.remove('show'); return; }
      var taken={}; selected.forEach(function(x){ taken[x.id]=1; });
      matches=DATA.filter(function(p){
        if(taken[p.id]) return false;
        var hay=n(p.name)+' '+n(p.sub)+' '+n(p.sector)+' '+((p.aliases||[]).join(' '));
        return hay.indexOf(q)>=0;
      });
      /* rank: exact name > name starts with > word starts with > alias > anything else,
         so typing "ghan" surfaces Ghana above Afghanistan */
      matches.sort(function(a,b){ return score(a)-score(b) || a.name.length-b.name.length; });
      function score(p){
        var nm=n(p.name);
        if(nm===q) return 0;
        if(nm.indexOf(q)===0) return 1;
        if((' '+nm).indexOf(' '+q)>=0) return 2;
        if((p.aliases||[]).some(function(al){ return n(al).indexOf(q)===0; })) return 3;
        if(nm.indexOf(q)>=0) return 4;
        return 5;
      }
      matches=matches.slice(0,40);
      active=-1; render();
    }
    function render(){
      if(!matches.length){
        var typed=(search.value||'').trim();
        results.innerHTML = (o.allowFree && typed.length>1)
          ? '<div class="sp-opt" data-free="1"><div class="nm">Use what I typed: \u201c'+typed+'\u201d</div><div class="ctx">No list available \u2014 your own entry will be saved</div></div>'
          : '<div class="sp-opt"><div class="ctx">No match \u2014 try another word</div></div>';
        results.classList.add('show');
        var fe=results.querySelector('.sp-opt[data-free]');
        if(fe) fe.addEventListener('mousedown', function(e){ e.preventDefault(); pick({id:'free-'+typed, name:typed, sector:'Typed manually', sub:''}); });
        return; }
      results.innerHTML=matches.map(function(p,i){
        return '<div class="sp-opt'+(i===active?' active':'')+'" data-i="'+i+'"><div class="nm">'+p.name+'</div><div class="ctx">'+p.sector+(p.sub&&p.sub!==p.sector?' · '+p.sub:'')+'</div></div>';
      }).join('');
      results.classList.add('show');
      Array.prototype.forEach.call(results.querySelectorAll('.sp-opt[data-i]'), function(el){
        el.addEventListener('mousedown', function(e){ e.preventDefault(); pick(matches[+el.getAttribute('data-i')]); });
      });
    }
    function pick(p){
      if(!p) return;
      if(MAX===1){ selected=[p]; }                       // single-select: replace, never pile up
      else { if(selected.length>=MAX) return; selected.push(p); }
      search.value=''; results.classList.remove('show'); paint(); sync();
      if(MAX!==1) search.focus();
    }
    function remove(id){ selected=selected.filter(function(x){ return x.id!==id; }); paint(); sync(); }
    function paint(){
      if(MAX===1){
        search.placeholder = selected.length ? 'Tap \u00d7 to choose a different one' : (o.placeholder||'Search\u2026');
        search.style.display = selected.length ? 'none' : 'block';
      }
      chips.innerHTML=selected.map(function(p,i){
        var star=(o.primary && i===0)?'\u2605 ':'';
        return '<span class="sp-chip'+((o.primary&&i===0)?' primary':'')+'">'+star+p.name+' <small>'+p.sector+'</small> <button type="button" data-id="'+p.id+'">\u00d7</button></span>';
      }).join('');
      Array.prototype.forEach.call(chips.querySelectorAll('button'), function(b){
        b.addEventListener('click', function(){ remove(b.getAttribute('data-id')); });
      });
    }
    function sync(){
      if(hidden) hidden.value=JSON.stringify(selected.map(function(p){ return {id:p.id,name:p.name,sector:p.sector,sub:p.sub}; }));
      if(o.onChange) o.onChange(selected.slice());
    }
    search.addEventListener('input', function(){ doSearch(search.value); });
    search.addEventListener('keydown', function(e){
      if(!results.classList.contains('show')) return;
      if(e.key==='ArrowDown'){ active=Math.min(active+1,matches.length-1); render(); e.preventDefault(); }
      else if(e.key==='ArrowUp'){ active=Math.max(active-1,0); render(); e.preventDefault(); }
      else if(e.key==='Enter'){ if(active>=0){ pick(matches[active]); e.preventDefault(); } }
      else if(e.key==='Escape'){ results.classList.remove('show'); }
    });
    document.addEventListener('click', function(e){ if(!host.contains(e.target)) results.classList.remove('show'); });

    var api = {
      reload:function(){
        if(!hidden || !hidden.value) return;
        try{
          var arr=JSON.parse(hidden.value);
          if(Array.isArray(arr) && arr.length){ selected=arr.slice(0,MAX); paint(); }
        }catch(e){}
      },
      setCountry:function(c){ o.country=c; DATA=stateList(c); selected=[]; paint(); sync();
        search.placeholder = DATA.length? ('Search states/provinces in '+c) : ('Type your state or city in '+(c||'your country'));
        search.style.display='block'; },
      free:function(){ return DATA.length===0; },
      get:function(){ return selected.slice(); },
      names:function(){ return selected.map(function(p){ return p.name; }); },
      clear:function(){ selected=[]; paint(); sync(); },
      add:function(p){ pick(p); }
    };
    MOUNTED.push(api);
    return api;
  }

  var MOUNTED=[];
  function mountCustom(o){ return mount(o); }
  function rehydrate(){
    MOUNTED.forEach(function(m){ try{ m.reload(); }catch(e){} });
  }
  return { mount:mount, mountCustom:mountCustom, rehydrate:rehydrate, documents:docList, professions:profList, sectors:sectorList, countries:countryList, nationalities:nationalityList, destinations:destinationList, states:stateList };
})();
