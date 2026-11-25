/* デジタル墨流し：渦と細い等高線の流れに、1画面あたり5色を流す。章ごとに5色の組み合わせへなめらかに移り変わる */
(function(){
  /* 章ごとの5色と、文字のアクセント色 */
  var PAL={top:{c:[[0.804,0.918,0.965],[0.373,0.557,0.941],[0.373,0.839,0.941],[0.361,0.804,0.722],[0.561,0.910,0.565]],a:'#1a62b8'},gokui:{c:[[0.937,0.894,0.984],[0.604,0.471,0.910],[0.894,0.541,0.784],[0.478,0.627,0.941],[0.965,0.698,0.824]],a:'#6f45c0'},jiji:{c:[[0.957,0.953,0.925],[0.290,0.420,0.820],[0.180,0.690,0.760],[0.950,0.780,0.310],[0.560,0.740,0.930]],a:'#2a56b0'},gakubu:{c:[[0.875,0.961,0.918],[0.298,0.753,0.627],[0.478,0.878,0.847],[0.769,0.925,0.478],[0.416,0.604,0.878]],a:'#13805c'},note:{c:[[0.992,0.933,0.886],[0.941,0.502,0.369],[0.965,0.706,0.353],[0.973,0.878,0.478],[0.878,0.478,0.651]],a:'#c0502a'},profile:{c:[[0.902,0.925,0.992],[0.435,0.549,0.941],[0.682,0.588,0.933],[0.447,0.812,0.949],[0.949,0.675,0.816]],a:'#3a58c0'},tokuten:{c:[[0.992,0.894,0.878],[0.941,0.376,0.353],[0.965,0.627,0.322],[0.973,0.847,0.439],[0.878,0.478,0.690]],a:'#cc3a32'}};
  /* 章ごとの模様。m=(縦の流れ, 渦の強さ, 折り返しの深さ, 等高線の細かさ) n=(輪, 模様の大きさ, 櫛目, 色の帯の数) */
  var PM={top:{m:[0,1,1,48],n:[0,1,0,7.5]},          /* はじまり：渦を巻く細い流れ */
    gokui:{m:[1,.35,.8,70],n:[0,1,0,6]},             /* 極意：上から下へ流れ落ちる縦の筋 */
    jiji:{m:[0,.8,.9,96],n:[0,1.15,1,10]},            /* 時事：紙面のような細かい縞と、ゆるい渦 */
    gakubu:{m:[0,1.9,.6,40],n:[1,1,0,6]},            /* 学部：大きな渦と、水紋のような輪 */
    note:{m:[0,.55,1.35,22],n:[0,.55,0,4]},          /* note：ゆったり大きく折り返す色の島 */
    profile:{m:[0,.4,.7,60],n:[0,1,1,8]},            /* プロフィール：櫛でひいたような横の波 */
    tokuten:{m:[0,1.5,1.1,34],n:[.5,.75,0,5]}};      /* 特典：丸く巻き込む渦 */
  for(var key in PM){if(PAL[key]){PAL[key].m=PM[key].m;PAL[key].n=PM[key].n;}}
  var curM=PM.top.m.slice(),curN=PM.top.n.slice();
  var ids=['top','gokui','jiji','gakubu','note','profile','tokuten'];
  var els=ids.map(function(i){return document.getElementById(i);});
  var cur=JSON.parse(JSON.stringify(PAL.top.c));
  var root=document.documentElement,lastA='';
  function pick(){var best=0,bd=1e9,mid=innerHeight*0.45;for(var i=0;i<els.length;i++){if(!els[i])continue;var r=els[i].getBoundingClientRect();var d=(r.top<=mid&&r.bottom>=mid)?0:Math.min(Math.abs(r.top-mid),Math.abs(r.bottom-mid));if(d<bd){bd=d;best=i;}}return PAL[ids[best]];}
  function accent(p){if(p.a!==lastA){lastA=p.a;root.style.setProperty('--accent',p.a);}}

  /* 画面の面（パネル）も液体に浮かぶように：スクロールの勢いで少し傾いて遅れ、止まるとまっすぐに戻る */
  var floats=[].slice.call(document.querySelectorAll('main .sec > .wrap, .gift-sec > .wrap')),lastK='';
  function flow(v){var a=Math.abs(v)<.02?0:v;var k=a===0?'':'translate3d(0,'+(-a*9).toFixed(1)+'px,0) skewY('+(Math.max(-1.6,Math.min(1.6,a*.7))).toFixed(2)+'deg)';
    if(k!==lastK){lastK=k;for(var i=0;i<floats.length;i++)floats[i].style.transform=k;}}
  /* パネルは、液体の中から浮かび上がるように現れる */
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){
    var rv=[].slice.call(document.querySelectorAll('.sh,.gk,.f,.nt,.prof > div,.gift > div,.after,.facs-note'));
    root.classList.add('fl');
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px'});
    rv.forEach(function(el){var sib=el.parentNode?[].indexOf.call(el.parentNode.children,el):0;el.style.setProperty('--d',(Math.min(sib,5)*90)+'ms');el.classList.add('rv');io.observe(el);});
  }
  var c=document.getElementById('sumi');var gl=c&&c.getContext('webgl',{antialias:false});
  if(!gl){addEventListener('scroll',function(){accent(pick());},{passive:true});accent(pick());return;}
  var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs=[
  'precision mediump float;uniform vec2 r;uniform float t;uniform vec3 k[5];uniform float sy;uniform float sv;uniform vec4 m;uniform vec4 m2;',
  'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
  'float fb(vec2 p){float v=0.,a=.5;for(int j=0;j<5;j++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
  'vec2 sw(vec2 p,vec2 c,float s){vec2 d=p-c;float rr=dot(d,d);float a=s*exp(-rr*2.2);float cs=cos(a),sn=sin(a);return c+mat2(cs,-sn,sn,cs)*d;}',
  'vec3 pc(float x){x=fract(x);if(x<.2)return k[0];if(x<.4)return k[1];if(x<.6)return k[2];if(x<.8)return k[3];return k[4];}',
  'void main(){vec2 uv=gl_FragCoord.xy/r;float as=r.x/r.y;vec2 p=vec2(uv.x*as*2.4,uv.y*.95+sy*.42);',
  /* スクロールの勢いで液体が引きずられ、横にうねる */
  'p.x+=sv*.22*sin(p.y*2.3+t*.4);p.y+=sv*.12*sin(p.x*1.7-t*.3);',
  /* 章ごとの模様：m=(縦の流れ, 渦の強さ, 折り返しの深さ, 等高線の細かさ) m2=(輪, 模様の大きさ, 櫛目, 色の帯の数) */
  'float st=(1.+min(abs(sv),2.5)*.45)*m.y;',
  'vec2 c1=vec2(as*.75+.25*sin(t*.06),.55+sy*.42-sv*.1+.15*cos(t*.05));vec2 c2=vec2(as*1.85+.2*cos(t*.045),.25+sy*.42-sv*.14+.12*sin(t*.07));',
  'p=sw(p,c1,5.5*st);p=sw(p,c2,-4.5*st);',
  'float r1=length((p-c1)*vec2(.55,1.)),r2=length((p-c2)*vec2(.55,1.));',
  'p=vec2(p.x*mix(1.,1.8,m.x)*mix(1.,.45,m2.z),p.y*mix(1.,.28,m.x)*mix(1.,2.6,m2.z))*m2.y;',
  'p.y+=m2.z*.16*sin(p.x*7.+t*.2);p.x+=m.x*.05*sin(p.y*9.);',
  'vec2 q=vec2(fb(p+vec2(0.,t*.035)),fb(p+vec2(5.2,1.3)-t*.025));',
  'vec2 w=vec2(fb(p+4.2*m.z*q+vec2(1.7,9.2)+t*.02),fb(p+4.2*m.z*q+vec2(8.3,2.8)-t*.02));',
  'float f=fb(p+4.6*m.z*w);',
  'f+=m2.x*(.09*sin(r1*26.-t*.35+w.x*2.)+.06*sin(r2*30.+t*.3+w.y*2.));',
  'float bv=f*m2.w+w.x*2.6;float id=floor(bv);float fr=fract(bv);',
  'float s0=fract(sin(id*12.9898+3.1)*43758.5453);float s1=fract(sin((id+1.)*12.9898+3.1)*43758.5453);',
  'float o=w.y*1.3+q.y*.9;vec3 base=mix(pc(s0+o),pc(s1+o),smoothstep(.72,.98,fr));',
  'base=mix(base,pc(s0+.4),smoothstep(.55,.9,w.y)*smoothstep(.3,.6,q.x)*.6);',
  'float g=abs(fract(f*m.w+w.y*3.5)-.5);float ln=1.-smoothstep(.04,.16,g);',
  'vec3 col=mix(base,base*.72+vec3(0.),ln*.5);',
  'float g2=abs(fract(f*140.)-.5);col=mix(col,base*.85+vec3(0.),(1.-smoothstep(.02,.1,g2))*.1);',
  'vec2 gg=gl_FragCoord.xy/(26.*r.y/600.);vec2 gi=floor(gg);vec2 go=vec2(h(gi),h(gi+7.3));float gd=length(fract(gg)-go);',
  'float sp=step(.9,h(gi+3.1))*exp(-gd*gd*50.)*(.5+.5*sin(t*1.1+h(gi)*30.));col+=sp*vec3(1.,1.,1.)*.5;',
  'col*=(.98+.03*n(gl_FragCoord.xy*.9))*1.0;',
  'gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(tp,src){var s=gl.createShader(tp);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
  gl.useProgram(pr);
  var bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var lp=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
  var ur=gl.getUniformLocation(pr,'r'),ut=gl.getUniformLocation(pr,'t'),uk=gl.getUniformLocation(pr,'k'),usy=gl.getUniformLocation(pr,'sy'),usv=gl.getUniformLocation(pr,'sv'),um=gl.getUniformLocation(pr,'m'),un=gl.getUniformLocation(pr,'m2');
  var scale=Math.min(0.75,1.5/(window.devicePixelRatio||1)+0.25);
  var flat=new Float32Array(15);
  function size(){var w=Math.max(1,Math.round(innerWidth*scale)),hh=Math.max(1,Math.round(innerHeight*scale));if(c.width!==w||c.height!==hh){c.width=w;c.height=hh;gl.viewport(0,0,w,hh);}}
  var still=matchMedia('(prefers-reduced-motion: reduce)').matches;var t0=performance.now();
  /* スクロール位置は少し遅れて追いかけ（粘り）、速さは液体をかき混ぜる力になる */
  var lastY=scrollY,lastT=performance.now(),sy=scrollY/innerHeight,sv=0,tt=8;
  function frame(now){
    size();var p=pick();accent(p);var moving=false;
    var dt=Math.min(.05,Math.max(.001,(now-lastT)/1000));lastT=now;
    var y=scrollY,raw=(y-lastY)/innerHeight/dt;lastY=y;raw=Math.max(-4,Math.min(4,raw));
    sv+=(raw-sv)*Math.min(1,dt*5);sy+=(y/innerHeight-sy)*Math.min(1,dt*3.5);
    tt+=dt*(1+Math.min(Math.abs(sv),3)*1.6);
    if(!still)flow(sv);
    var km=Math.min(1,dt*1.6);for(var e=0;e<4;e++){var dm=p.m[e]-curM[e],dn=p.n[e]-curN[e];if(Math.abs(dm)+Math.abs(dn)>.002)moving=true;curM[e]+=dm*km;curN[e]+=dn*km;}
    for(var i=0;i<5;i++)for(var j=0;j<3;j++){var d=p.c[i][j]-cur[i][j];if(Math.abs(d)>.002)moving=true;cur[i][j]+=d*.05;flat[i*3+j]=cur[i][j];}
    gl.uniform2f(ur,c.width,c.height);gl.uniform1f(ut,still?8.:tt);gl.uniform1f(usy,still?0:sy);gl.uniform1f(usv,still?0:sv);gl.uniform4f(um,curM[0],curM[1],curM[2],curM[3]);gl.uniform4f(un,curN[0],curN[1],curN[2],curN[3]);gl.uniform3fv(uk,flat);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(!still||moving)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if(still){addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true});}
  addEventListener('resize',function(){size();if(still)requestAnimationFrame(frame);});
})();

/* スマホのハンバーガーメニュー */
(function(){var b=document.querySelector('.hb'),m=document.getElementById('menu');if(!b||!m)return;
function set(o){m.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'メニューを閉じる':'メニューを開く');}
b.addEventListener('click',function(e){e.stopPropagation();set(!m.classList.contains('open'));});
m.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
document.addEventListener('click',function(e){if(m.classList.contains('open')&&!m.contains(e.target))set(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});})();
