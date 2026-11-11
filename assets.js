// ===== STACS shared data + prototype auth/eligibility layer =====
// NOTE: this is a PROTOTYPE. Real security requires a backend + server-side auth.
const REGISTRIES=[
 {slug:"skilled",name:"Skilled Worker Pool",short:"Skilled Worker Pool",role:"WK",icon:"user-star",desc:"Verified skilled professionals ready for opportunities worldwide."},
 {slug:"employers",name:"Employer Hub",short:"Employer Hub",role:"EM",icon:"building",desc:"Verified organisations hiring skilled talent."},
 {slug:"agencies",name:"Recruitment Agency Hub",short:"Recruitment Agency Hub",role:"AG",icon:"briefcase-2",desc:"Licensed recruitment agencies."},
 {slug:"lawyers",name:"Immigration Lawyer Hub",short:"Immigration Lawyer Hub",role:"LW",icon:"scale",desc:"Regulated immigration professionals."},
 {slug:"training",name:"Training Provider Hub",short:"Training Provider Hub",role:"TP",icon:"school",desc:"Certified skills & training providers."},
 {slug:"verifiers",name:"Assessor & Verifier Hub",short:"Assessor & Verifier Hub",role:"VF",icon:"clipboard-check",desc:"STACS-authorised assessors."},
 {slug:"settlement",name:"Settlement Partner Hub",short:"Settlement Partner Hub",role:"SP",icon:"plane-departure",desc:"Arrival & settlement support partners."}
];
const ROLE_NAME={WK:"Skilled Worker",EM:"Employer",AG:"Recruitment Agency",LW:"Immigration Lawyer",TP:"Training Provider",VF:"Assessor / Verifier",SP:"Settlement Partner"};
// members keyed by unique STACS ID (shared foreign key across every registry)
const MEMBERS=[
 {id:"WK-4820193756-NG",role:"WK",name:"John Okafor",country:"Nigeria",headline:"Electrician · Solar Installer",status:"Active",visibility:"Public",detail:{Nationality:"Nigerian",Languages:"English, Yoruba",Experience:"8 years",Passport:"Valid international",Availability:"Immediately available"}},
 {id:"WK-7391025648-SN",role:"WK",name:"Fatou Diallo",country:"Senegal",headline:"Executive Chef",status:"Active",visibility:"Public",detail:{Nationality:"Senegalese",Languages:"French, English, Wolof",Experience:"10 years",Passport:"Valid international",Availability:"Immediately available"}},
 {id:"WK-2056184739-KE",role:"WK",name:"Kwame Mensah",country:"Kenya",headline:"Community Health Worker",status:"Pending",visibility:"Employer Only",detail:{Nationality:"Kenyan",Languages:"English, Swahili",Experience:"4 years",Passport:"In process",Availability:"3 months"}},
 {id:"EM-5012934876-AE",role:"EM",name:"Gulf Facilities LLC",country:"UAE",headline:"Facilities employer · Dubai",status:"Active",visibility:"Public",detail:{Sector:"Facilities management",Licence:"DED-772140",Roles:"Electrical, HVAC",Verified:"Yes"}},
 {id:"EM-6621458093-CA",role:"EM",name:"Maple Hospitality Group",country:"Canada",headline:"Hospitality employer · Toronto",status:"Approved",visibility:"Public",detail:{Sector:"Hospitality",Licence:"BC-9910233",Roles:"Culinary",Verified:"Yes"}},
 {id:"LW-3390218475-GB",role:"LW",name:"A. Rahman (Immigration)",country:"United Kingdom",headline:"Regulated immigration adviser",status:"Active",visibility:"Public",detail:{Firm:"Rahman Legal",Regulator:"OISC F2020-8841",Focus:"Skilled Worker visas"}},
 {id:"AG-8847120396-NG",role:"AG",name:"SkillBridge Recruitment",country:"Nigeria",headline:"Licensed recruitment agency",status:"Pending",visibility:"Public",detail:{Licence:"FML-REC-4471",Focus:"Trades & technical"}},
 {id:"TP-1902847563-GH",role:"TP",name:"Accra Trade Academy",country:"Ghana",headline:"Training provider",status:"Approved",visibility:"Public",detail:{Accreditation:"COTVET-2210",Programmes:"Electrical, plumbing"}},
 {id:"VF-4471908352-NG",role:"VF",name:"James Verify",country:"Nigeria",headline:"STACS-authorised assessor",status:"Active",visibility:"Public",detail:{Authorisation:"STACS-VF-014",Scope:"Trade assessments"}},
 {id:"SP-7238401956-CA",role:"SP",name:"Settle-In Canada",country:"Canada",headline:"Settlement partner",status:"Pending",visibility:"Public",detail:{Services:"Housing, banking, orientation"}}
];
const AC=['#1B6B2F','#C8920A','#185FA5','#693AB0','#0F6E56','#993C1D','#1557A5'];
function acol(n){let h=0;for(let c of(n||'X'))h=(h<<5)-h+c.charCodeAt(0);return AC[Math.abs(h)%AC.length]}
function initials(n){const p=(n||'X').trim().split(' ');return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():(n||'X').slice(0,2).toUpperCase()}
function memberById(id){return MEMBERS.find(m=>m.id===id)}
function membersByRole(r){return MEMBERS.filter(m=>m.role===r)}
function currentUser(){const id=localStorage.getItem('stacs_session');return id?memberById(id):null}
function login(id){localStorage.setItem('stacs_session',id);}
function logout(){localStorage.removeItem('stacs_session');}
// ELIGIBILITY: who may view a full profile
function canView(target){
 const u=currentUser();
 if(!u) return {ok:false,reason:"login"};                       // must be logged in
 if(u.status!=='Active'&&u.status!=='Approved') return {ok:false,reason:"pending"};
 if(u.id===target.id) return {ok:true};                         // own profile
 if(target.visibility==='Public') return {ok:true};             // public within platform
 if(target.visibility==='Employer Only') return (u.role==='EM'||u.role==='AG')?{ok:true}:{ok:false,reason:"perm"};
 if(target.visibility==='Private'||target.visibility==='Inactive') return {ok:false,reason:"perm"};
 return {ok:true};
}
const PROD_BASE="www.leivotest.com/stacs";
