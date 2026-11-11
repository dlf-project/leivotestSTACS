/* ============================================================================
 * STACS STAGE 1 — short public sign-up.
 *
 * Registration is split in two:
 *   Stage 1 (this page)  : who you are + email + password. Two minutes.
 *   Stage 2 (after login): the full profile, saved as you go, then submitted.
 *
 * WHY: a long form asked of a stranger is abandoned. A short one earns the
 * account; the rest is completed by someone who has already committed and can
 * come back to it. It also means we hold a verified email before anyone
 * uploads passports or certificates.
 *
 * Cards marked  data-stage="2"  are hidden here and completed after login.
 * ========================================================================== */
window.STACSStage1 = (function(){

  var CSS = ''
   + '.s1-bar{background:rgba(46,204,113,.1);border:1px solid rgba(46,204,113,.32);border-radius:14px;padding:16px 18px;margin-bottom:18px;font-family:system-ui,sans-serif}'
   + '.s1-bar .t{font-size:15px;font-weight:800;color:var(--grn,#2ECC71);margin-bottom:4px}'
   + '.s1-bar .d{font-size:13.2px;color:var(--tx2,rgba(240,240,236,.7));line-height:1.6}'
   + '.s1-steps{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}'
   + '.s1-step{display:flex;align-items:center;gap:7px;background:var(--card2,#0F4423);border:1px solid var(--bdr,rgba(255,255,255,.12));'
   +   'border-radius:100px;padding:6px 12px;font-size:12px;color:var(--tx2,rgba(240,240,236,.7))}'
   + '.s1-step b{width:19px;height:19px;border-radius:50%;background:var(--bdr2,rgba(255,255,255,.2));color:var(--tx,#F0F0EC);'
   +   'display:flex;align-items:center;justify-content:center;font-size:11px}'
   + '.s1-step.now{border-color:var(--gold,#C8920A);color:var(--tx,#F0F0EC)}'
   + '.s1-step.now b{background:var(--gold,#C8920A);color:#231a02}';

  function injectCSS(){
    if(document.getElementById('stacs-stage1-css')) return;
    var st=document.createElement('style'); st.id='stacs-stage1-css'; st.textContent=CSS;
    document.head.appendChild(st);
  }

  function init(o){
    o=o||{}; injectCSS();

    /* hide everything that belongs to stage 2 */
    var later=document.querySelectorAll('[data-stage="2"]');
    for(var i=0;i<later.length;i++) later[i].style.display='none';

    /* tell the person what is happening and what is left */
    var bar=document.createElement('div'); bar.className='s1-bar';
    bar.innerHTML='<div class="t">Step 1 of 2 &mdash; open your account</div>'
      + '<div class="d">We only need your details and a password to get started. '
      + 'Once you verify your email and sign in, you can complete the rest of your profile '
      + '<b>at your own pace</b> &mdash; your progress is saved as you go, and nothing is submitted for approval until you are ready.</div>'
      + '<div class="s1-steps">'
      +   '<span class="s1-step now"><b>1</b> Open your account</span>'
      +   '<span class="s1-step"><b>2</b> Verify your email</span>'
      +   '<span class="s1-step"><b>3</b> Sign in</span>'
      +   '<span class="s1-step"><b>4</b> Complete your profile</span>'
      +   '<span class="s1-step"><b>5</b> Submit for approval</span>'
      + '</div>';
    var host=document.querySelector('.wrap') || document.body;
    var afterNote = host.querySelector('.note');
    if(afterNote && afterNote.parentNode===host) host.insertBefore(bar, afterNote.nextSibling);
    else host.insertBefore(bar, host.firstChild);

    /* the button should say what it does */
    var btn=document.getElementById('regBtn');
    if(btn) btn.textContent = o.buttonText || 'Create New Account';

    return { hidden: later.length };
  }
  return { init:init };
})();
