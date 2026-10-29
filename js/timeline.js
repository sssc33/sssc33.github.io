/* Consumption Only / reference-led reconstruction. Three.js r160, entirely local.
 * Virtual units are relative proportions, not measured real-world dimensions.
 * True meshes, procedural UV maps, batched ornaments, demand-driven rendering.
 */
(() => {
  'use strict';
  const host = document.getElementById('canvas-container');
  const loading = document.getElementById('loading');
  const $ = id => document.getElementById(id);
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  $('referenceButton').onclick = () => $('referenceDialog').showModal();
  $('analysisButton').onclick = () => $('analysisDialog').showModal();
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }));
  function fallback(e) {
    loading.hidden = true;
    host.innerHTML = '<div class="error-text">此浏览器暂时无法初始化三维显示。请开启硬件加速，或换用支持 WebGL 的浏览器。<br><a href="assets/consumption/reference.svg">查看原作照片</a></div>';
    console.error('3D scene:', e);
  }
  if (!window.THREE) { fallback('Local Three.js library unavailable'); return; }
  try { init(); } catch (e) { fallback(e); }
  function init() {
    const T = THREE;
    const mobile = matchMedia('(max-width:700px)').matches;
    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let seed = 145093;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const range = (a,b) => a + (b-a)*rnd();
    const V = (x,y,z) => new T.Vector3(x,y,z);
    const renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.6));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    renderer.info.autoReset = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','仅限消耗三维模型，拖拽旋转，滚轮缩放，也可用方向键旋转与加减键缩放');
    renderer.domElement.tabIndex = 0;
    const scene = new T.Scene();
    scene.background = new T.Color('#77726d');
    scene.fog = new T.Fog('#77726d', 17, 32);
    const camera = new T.PerspectiveCamera(38, 1, .08, 55);
    scene.add(new T.HemisphereLight('#f9eee4','#504b43',.55));
    const key = new T.DirectionalLight('#fff4e8',2.65);
    key.position.set(-3.6,7.2,3.3);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048,mobile ? 1024 : 2048);
    Object.assign(key.shadow.camera,{left:-5.5,right:5.5,top:5,bottom:-5,near:.5,far:20});
    key.shadow.bias = -.0005;
    key.shadow.normalBias = .017;
    key.shadow.radius = 2;
    scene.add(key);
    const fill = new T.DirectionalLight('#dfebff',.38); fill.position.set(4,3,-1);scene.add(fill);
    const rim = new T.DirectionalLight('#fff4e1',.8); rim.position.set(-2,3,-5);scene.add(rim);
    // Procedural studio for physically meaningful metal reflections (no downloaded HDR).
    const env = new T.Scene();env.background = new T.Color('#555047');
    const room = new T.Mesh(new T.BoxGeometry(16,10,16),new T.MeshBasicMaterial({color:'#686159',side:T.BackSide})); env.add(room);
    function softbox(x,y,z,w,h,rx,ry,color) {
      const box = new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(3.2),side:T.DoubleSide}));
      box.position.set(x,y,z);box.rotation.set(rx,ry,0);env.add(box);
    }
    softbox(-4,4,1,5,3,-.4,Math.PI/2,'#ffffff');
    softbox(4,2,-1,2,5,0,-Math.PI/2,'#bdb8b4');
    softbox(0,4,-4,5,2,0,0,'#faf3e6');
    softbox(0,4.6,0,7,4,Math.PI/2,0,'#f1e4ce');
    const pmrem = new T.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(env,.08);scene.environment=envRT.texture;
    env.traverse(n => { if(n.isMesh){n.geometry.dispose();n.material.dispose();} });pmrem.dispose();
    renderer.shadowMap.autoUpdate=false;
    renderer.shadowMap.needsUpdate=true;
    function canvasTexture(n,paint,color=true) {
      const c=document.createElement('canvas');c.width=c.height=n;paint(c.getContext('2d'),n);
      const tex=new T.CanvasTexture(c);tex.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
      tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return tex;
    }
    const metalMap=canvasTexture(256,(c,n)=>{
      c.fillStyle='#b2a18e';c.fillRect(0,0,n,n);
      for(let i=0;i<2200;i++){const k=Math.floor(range(70,200));c.strokeStyle=`rgba(${k},${k-8},${k-15},0.16)`;c.beginPath();const y=range(0,n);c.moveTo(0,y);c.lineTo(n,y+range(-1,1));c.stroke();}
      for(let i=0;i<70;i++){c.fillStyle='rgba(47,37,21,.07)';c.beginPath();c.ellipse(range(0,n),range(0,n),range(2,8),range(1,3),0,0,Math.PI*2);c.fill();}
    });
    metalMap.wrapS=metalMap.wrapT=T.RepeatWrapping;
    const waxBump=canvasTexture(128,(c,n)=>{
      c.fillStyle='#888';c.fillRect(0,0,n,n);
      for(let i=0;i<1200;i++){c.fillStyle=`rgba(${Math.floor(range(20,230))},${Math.floor(range(20,230))},100,0.16)`;c.beginPath();c.arc(range(0,n),range(0,n),range(.3,2),0,7);c.fill();}
    },false);
    const brass=new T.MeshStandardMaterial({color:'#d5a578',metalness:.93,roughness:.26,map:metalMap,envMapIntensity:1.5});
    const darkBrass=new T.MeshStandardMaterial({color:'#704118',metalness:.91,roughness:.3,map:metalMap});
    const gold=new T.MeshStandardMaterial({color:'#af9341',metalness:.61,roughness:.39,bumpMap:waxBump,bumpScale:.009});
    const paleGold=new T.MeshStandardMaterial({color:'#ab9e6d',metalness:.45,roughness:.47,bumpMap:waxBump,bumpScale:.012});
    const silver=new T.MeshStandardMaterial({color:'#bdb5a2',metalness:.94,roughness:.22});
    const pearl=new T.MeshPhysicalMaterial({color:'#b9956b',metalness:.25,roughness:.28,clearcoat:.48,clearcoatRoughness:.25});
    const amber=new T.MeshPhysicalMaterial({color:'#cb720d',metalness:.08,roughness:.2,clearcoat:1,clearcoatRoughness:.12,bumpMap:waxBump,bumpScale:.006});
    const deepAmber=new T.MeshPhysicalMaterial({color:'#9a4e0b',metalness:.12,roughness:.23,clearcoat:1,clearcoatRoughness:.14});
    const cableMat=new T.MeshStandardMaterial({color:'#6f6049',roughness:.7});
    const blackMat=new T.MeshStandardMaterial({color:'#221c15',metalness:.25,roughness:.38});
    // Merge by material + anatomical label. Thousands of beads/links become tens of draws.
    const batches=new Map();
    const m4=new T.Matrix4(),q=new T.Quaternion(),one=V(1,1,1);
    function part(geo,mat,pos=V(0,0,0),scale=one,rot=new T.Euler(),label='铜金灯架 / 拉丝金属') {
      const key=mat.uuid+'|'+label;
      if(!batches.has(key))batches.set(key,{mat,label,geos:[]});
      let g=geo.index?geo.toNonIndexed():geo.clone();
      q.setFromEuler(rot);m4.compose(pos,q,scale);g.applyMatrix4(m4);
      batches.get(key).geos.push(g);
    }
    const sphere=new T.SphereGeometry(1,10,7);
    const cylinder=new T.CylinderGeometry(1,1,1,12);
    const chainGeo=new T.TorusGeometry(.023,.004,4,9);
    function ball(pos,r,mat=pearl,label='珠串 / 柔和高光') {part(sphere,mat,pos,V(r,r,r),new T.Euler(),label);}
    function rod(a,b,r,mat=brass,label='铜金灯架 / 拉丝金属') {
      const d=b.clone().sub(a);const qq=new T.Quaternion().setFromUnitVectors(V(0,1,0),d.clone().normalize());
      part(cylinder,mat,a.clone().add(b).multiplyScalar(.5),V(r,d.length(),r),new T.Euler().setFromQuaternion(qq),label);
    }
    function tube(points,r,mat,label='细链与线缆') {
      const curve=new T.CatmullRomCurve3(points);const geo=new T.TubeGeometry(curve,Math.max(18,points.length*3),r,5,false);
      part(geo,mat,V(0,0,0),one,new T.Euler(),label);geo.dispose();
    }
    const tilt = p => {const z=-.075;const x=.035;return p.clone().applyEuler(new T.Euler(x,0,z));};
    function band(rx,rz,y) {
      const n=112;const arr=[];const uv=[];
      for(let i=0;i<n;i++){
        const t=i/n*Math.PI*2, t2=(i+1)/n*Math.PI*2;
        const corners=[[-.012,-.026], [.012,-.026],[.012,.026],[-.012,.026]];
        for(let face=0;face<4;face++){
          const j=(face+1)%4;const list=[[t,face],[t2,j],[t2,face],[t,face],[t,j],[t2,j]];
          list.forEach(([a,k],idx)=>{const c=corners[k];const p=tilt(V((rx+c[0])*Math.cos(a),y+c[1],(rz+c[0])*Math.sin(a)));arr.push(p.x,p.y,p.z);uv.push(a/(2*Math.PI)*5,(idx===2||idx===4||idx===5)?1:0);});
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(arr,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();part(g,brass);g.dispose();
    }
    const rings=[{rx:2.35,rz:1.75,y:.95,count:37},{rx:1.83,rz:1.32,y:1.34,count:28},{rx:1.14,rz:.74,y:1.77,count:17}];
    rings.forEach(r=>band(r.rx,r.rz,r.y));
    // Peripheral ribs and center riser. Deliberately sparse to keep the photograph's open frame.
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+.28;
      rings.slice(0,-1).forEach((r,j)=>{const r2=rings[j+1];rod(tilt(V(r.rx*Math.cos(a),r.y,r.rz*Math.sin(a))),tilt(V(r2.rx*Math.cos(a),r2.y,r2.rz*Math.sin(a))),.014,darkBrass);});
    }
    rod(tilt(V(-.38,1.68,0)),tilt(V(.38,1.68,0)),.027);
    const bulbPoints=[[.03,0],[.14,.035],[.25,.13],[.37,.3],[.39,.42],[.30,.56],[.19,.72],[.15,.79]].map(p=>new T.Vector2(p[0],p[1]));
    const bulbGeo=new T.LatheGeometry(bulbPoints,40);
    part(bulbGeo,new T.MeshStandardMaterial({color:'#dcc3a5',metalness:1,roughness:.19,envMapIntensity:1.65}),V(0,.17,0),one,new T.Euler(),'中心灯泡 / 镜面反射，默认不发光');bulbGeo.dispose();
    part(cylinder,blackMat,V(0,.98,0),V(.18,.15,.18),new T.Euler(),'中心灯泡 / 灯座');
    part(cylinder,darkBrass,V(0,1.16,0),V(.17,.26,.17),new T.Euler(),'中心灯泡 / 螺纹灯座');
    for(let i=0;i<11;i++){const tor=new T.TorusGeometry(.178,.008,5,25);part(tor,brass,V(0,1.04+i*.022,0),one,new T.Euler(Math.PI/2,0,0),'中心灯泡 / 螺纹灯座');tor.dispose();}
    part(cylinder,brass,V(0,1.40,0),V(.22,.19,.22),new T.Euler(),'中心灯泡 / 铜金灯座');
    rod(V(0,1.5,0),V(0,1.94,0),.029);
    // Wax earrings have open holes, thick uneven rim and drooping elongated silhouettes.
    function waxLoop(pos,w,h,mat,angle=0,label='蜡制镂空耳饰 / 不规则软化边缘') {
      const pts=[],n=24;for(let i=0;i<=n;i++){const a=i/n*2*Math.PI;const k=1+range(-.12,.12);pts.push(V(w*Math.cos(a)*k,h*Math.sin(a)*k,range(-.012,.012)));}
      const curve=new T.CatmullRomCurve3(pts,true);const geo=new T.TubeGeometry(curve,42,.027,6,true);
      part(geo,mat,pos,one,new T.Euler(.1,angle,range(-.16,.16)),label);geo.dispose();
    }
    function plaque(pos,size,mat=gold,label='蜡制金色饰片 / 凹凸与磨损') {
      const g=new T.IcosahedronGeometry(1,1);const a=g.attributes.position;
      for(let i=0;i<a.count;i++){const k=range(.83,1.16);a.setXYZ(i,a.getX(i)*k,a.getY(i)*k,a.getZ(i)*k);}g.computeVertexNormals();
      part(g,mat,pos,V(size,size*range(1,1.45),size*.26),new T.Euler(range(-.3,.3),range(-.7,.7),range(-.5,.5)),label);g.dispose();
    }
    function chain(start,end) {
      const len=start.distanceTo(end);const n=Math.floor(len/.037);const d=end.clone().sub(start);
      for(let j=0;j<=n;j++){const p=start.clone().addScaledVector(d,j/n);part(chainGeo,silver,p,V(.63,.85,.63),new T.Euler(0,j%2?Math.PI/2:0,0),'细链 / 金属链环');}
    }
    rings.forEach((r,ri)=>{
      for(let i=0;i<r.count;i++){
        const a=i/r.count*Math.PI*2+range(-.035,.035);
        const top=tilt(V(r.rx*Math.cos(a),r.y-.032,r.rz*Math.sin(a)));
        const len=range(.1,ri===0?.39:.48);
        const end=top.clone().add(V(range(-.015,.015),-len,range(-.01,.01)));
        chain(top,end);
        const type=i%5;
        if(type===0 || (ri===0 && i%7===0)){
          const h=range(.13,.25);waxLoop(end.clone().add(V(0,-h,0)),range(.07,.105),h,i%2?paleGold:gold,a+.6);
        }else if(type===1){plaque(end.clone().add(V(0,-.08,0)),range(.048,.09),i%2?gold:amber);}
        else if(type===2){
          const n=7+Math.floor(rnd()*6);for(let j=0;j<n;j++){const p=end.clone().add(V(Math.sin(j*.45)*.026,-j*.04,0));ball(p,range(.025,.038));}
          plaque(end.clone().add(V(0,-n*.04,0)),.05,gold);
        }else if(type===3){
          // Slack pearl strand draped between neighboring points rather than solid rods.
          const span=range(.20,.40);const pts=[];for(let j=0;j<12;j++){const s=j/11;const p=end.clone().add(V(s*span,-Math.sin(s*Math.PI)*.19,Math.sin(a)*s*.07));ball(p,.026,pearl);pts.push(p);}tube(pts,.0035,cableMat,'珠串细线');
        }else{ball(end,.054,gold,'蜡制珠饰 / 金色软化形态');plaque(end.clone().add(V(0,-.08,0)),.04,paleGold);}
        if(i%8===0){
          const drop=end.clone().add(V(0,-.22,0));tube([end,end.clone().add(V(.005,-.15,0)),drop],.008,amber,'滴落蜡痕 / 琥珀色蜡');ball(drop,.027,amber,'滴落蜡痕 / 琥珀色蜡');
        }
      }
    });
    // Left detached canopy and arc of braided hanging chain.
    part(cylinder,brass,V(-3.15,.17,.55),V(.37,.09,.37),new T.Euler(.13,0,-.12),'左侧连接件 / 铜金吊灯顶盖');
    part(cylinder,blackMat,V(-3.15,.215,.55),V(.30,.025,.30),new T.Euler(.13,0,-.12),'左侧连接件 / 铜金吊灯顶盖');
    const cablePts=[V(-4.1,.03,.86),V(-3.74,.025,.90),V(-3.3,.15,.57),V(-2.58,.40,.36),V(-1.86,.84,.18),V(-1.02,1.6,.10),V(-.43,2.02,.05),V(-.05,2.09,0),V(.03,1.87,0)];
    tube(cablePts,.026,cableMat,'线缆 / 弯曲绝缘线');
    const ccurve=new T.CatmullRomCurve3(cablePts.slice(2));
    for(let i=0;i<31;i++){const p=ccurve.getPoint(i/30).add(V(0,.07,0));const g=new T.TorusGeometry(.064,.009,5,12);part(g,brass,p,V(1.45,.7,1),new T.Euler(.2,0,-.65),'左侧链条 / 铜金环链');g.dispose();}
    // Ground debris, distributed strongly toward front-right as in the reference.
    for(let i=0;i<116;i++){
      let x,z;
      if(i<75){x=range(.6,3.4);z=range(.1,2.35);}else{x=range(-2.5,2.8);z=range(-1.5,2.2);}
      const g=new T.IcosahedronGeometry(1,i%3===0?1:0),a=g.attributes.position;
      for(let j=0;j<a.count;j++){const k=range(.65,1.3);a.setXYZ(j,a.getX(j)*k,a.getY(j)*k,a.getZ(j)*k);}g.computeVertexNormals();
      part(g,i%6===0?gold:i%3===0?deepAmber:amber,V(x,.038,z),V(range(.035,.13),range(.018,.055),range(.035,.14)),new T.Euler(range(-.3,.3),range(0,6.28),0),'散落蜡片 / 琥珀色与金色残留');g.dispose();
    }
    for(let i=0;i<8;i++){
      const x=range(.25,3),z=range(.2,2.4);waxLoop(V(x,.048,z),range(.09,.16),range(.1,.17),i%2?gold:paleGold,range(0,6.28),'落地耳饰 / 蜡质镂空环');
      // Same geometry laid flat using a horizontal transform in its own batch.
      const b=batches.get((i%2?gold:paleGold).uuid+'|落地耳饰 / 蜡质镂空环');const g=b.geos[b.geos.length-1];
      g.translate(-x,-.048,-z);g.rotateX(Math.PI/2);g.translate(x,.055,z);
    }
    [[-1.9,.7],[2.2,1.8],[1.15,1.25],[2.85,1.12]].forEach(([x,z],i)=>{
      const pts=[];for(let j=0;j<28;j++){const a=j*.22;const p=V(x+Math.cos(a)*(.19+j*.01),.04,z+Math.sin(a)*.16);ball(p,range(.027,.04),pearl);pts.push(p);}tube(pts,.004,cableMat,'地面珠串 / 细线');
    });
    for(let i=0;i<10;i++){const x=range(-2.6,3.2),z=range(-1,2.2);tube([V(x,.018,z),V(x+.12,.02,z+.15),V(x+.4,.018,z+.21),V(x+.55,.015,z+.14)],.0028,silver,'地面细链 / 散落金属线');}
    const pickables=[];
    batches.forEach(({mat,label,geos})=>{
      const pos=[],normal=[],uv=[];
      geos.forEach(g=>{pos.push(g.attributes.position.array);normal.push(g.attributes.normal.array);uv.push(g.attributes.uv?g.attributes.uv.array:new Float32Array(g.attributes.position.count*2));});
      const join=arrays=>{const result=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let off=0;arrays.forEach(a=>{result.set(a,off);off+=a.length;});return result;};
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(join(pos),3));geo.setAttribute('normal',new T.BufferAttribute(join(normal),3));geo.setAttribute('uv',new T.BufferAttribute(join(uv),2));geo.computeBoundingSphere();
      const mesh=new T.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.label=label;scene.add(mesh);pickables.push(mesh);geos.forEach(g=>g.dispose());
    });
    sphere.dispose();cylinder.dispose();chainGeo.dispose();batches.clear();
    // Fine cotton weave is generated at real UV scale; macro stains are a separate alpha decal.
    const weave=canvasTexture(512,(c,n)=>{
      c.fillStyle='#d5d0c8';c.fillRect(0,0,n,n);
      for(let i=0;i<n;i+=3){c.fillStyle=i%6===0?'rgba(255,255,255,.3)':'rgba(80,75,69,.10)';c.fillRect(i,0,1,n);c.fillRect(0,i,n,1);}
      for(let i=0;i<8000;i++){const v=rnd()>.5?'rgba(255,255,255,.12)':'rgba(80,70,60,.06)';c.fillStyle=v;c.fillRect(range(0,n),range(0,n),1,1);}
    });weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(115,115);
    const floorGeo=new T.PlaneGeometry(80,80,64,64);floorGeo.rotateX(-Math.PI/2);
    const fp=floorGeo.attributes.position;for(let i=0;i<fp.count;i++){const x=fp.getX(i),z=fp.getZ(i);fp.setY(i,-.027+Math.sin(x*1.3+z*.6)*.005+Math.sin(z*2.8)*.003);}floorGeo.computeVertexNormals();
    const floor=new T.Mesh(floorGeo,new T.MeshStandardMaterial({color:'#f4f2ee',roughness:.98,envMapIntensity:.18,map:weave,bumpMap:weave,bumpScale:.018}));floor.receiveShadow=true;scene.add(floor);
    const backdropMap=canvasTexture(256,(c,n)=>{const g=c.createLinearGradient(0,0,0,n);g.addColorStop(0,'#11100f');g.addColorStop(.6,'#24211f');g.addColorStop(1,'#aaa49c');c.fillStyle=g;c.fillRect(0,0,n,n);});
    const backdrop=new T.Mesh(new T.PlaneGeometry(40,9),new T.MeshBasicMaterial({map:backdropMap}));backdrop.position.set(0,4.4,-7);scene.add(backdrop);
    const contactMap=canvasTexture(256,(c,n)=>{const g=c.createRadialGradient(n/2,n/2,5,n/2,n/2,n/2);g.addColorStop(0,'rgba(39,31,22,.15)');g.addColorStop(.5,'rgba(39,31,22,.09)');g.addColorStop(1,'rgba(39,31,22,0)');c.fillStyle=g;c.fillRect(0,0,n,n);});
    const contact=new T.Mesh(new T.PlaneGeometry(6.7,4.5),new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.012;scene.add(contact);
    const stains=canvasTexture(1024,(c,n)=>{
      c.clearRect(0,0,n,n);
      for(let i=0;i<260;i++){
        const x=range(n*.48,n*.88),y=range(n*.31,n*.77),r=range(2,19);
        const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,`rgba(133,71,13,${range(.03,.17)})`);grad.addColorStop(1,'rgba(180,108,25,0)');c.fillStyle=grad;c.fillRect(x-r,y-r,r*2,r*2);
      }
      for(let i=0;i<30;i++){c.strokeStyle='rgba(158,91,26,.14)';c.lineWidth=range(.5,2);c.beginPath();c.moveTo(range(500,850),range(350,750));c.bezierCurveTo(range(530,830),range(320,790),range(530,830),range(320,790),range(530,830),range(320,790));c.stroke();}
    });
    const decal=new T.Mesh(new T.PlaneGeometry(9,7),new T.MeshBasicMaterial({map:stains,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));decal.rotation.x=-Math.PI/2;decal.position.y=-.008;scene.add(decal);
    // One lightweight post pass: slight warmth, restrained film grain and vignette. No invented glow.
    const rt=new T.WebGLRenderTarget(1,1,{depthBuffer:true,type:T.HalfFloatType,samples:renderer.capabilities.isWebGL2?2:0});rt.texture.colorSpace=T.NoColorSpace;
    const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:rt.texture},film:{value:1}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`uniform sampler2D image;uniform float film;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 col=texture2D(image,vUv).rgb;
      float d=length((vUv-0.5)*vec2(1.02,0.93));float vig=1.0-0.20*smoothstep(0.22,0.72,d);
      float grain=(hash(gl_FragCoord.xy)-0.5)*0.016;
      col=mix(col,max(col*vec3(1.018,1.004,0.977)*vig+grain,vec3(0.0)),film);gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
    const zoomMax=mobile?18:14;
    $('zoomRange').max=String(zoomMax);
    const defaultView={theta:.31,phi:1.13,radius:10.2,target:V(.10,.67,.05)};
    const state={theta:defaultView.theta,phi:defaultView.phi,radius:defaultView.radius,target:defaultView.target.clone()};
    const desired={...state,target:state.target.clone()};
    if(mobile){state.radius=desired.radius=16.5;defaultView.radius=16.5;}
    let auto=false,scheduled=0,dirty=true,last=0,frames=0,fpsStart=performance.now(),fps=0;
    function invalidate(){dirty=true;if(!scheduled&&!document.hidden)scheduled=requestAnimationFrame(frame);}
    function cameraUpdate(){camera.position.set(state.target.x+state.radius*Math.sin(state.phi)*Math.sin(state.theta),state.target.y+state.radius*Math.cos(state.phi),state.target.z+state.radius*Math.sin(state.phi)*Math.cos(state.theta));camera.lookAt(state.target);}
    function draw(){renderer.info.reset();cameraUpdate();renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
    function frame(now){
      scheduled=0;if(document.hidden)return;
      const dt=Math.min(.05,(now-last)/1000||.016);last=now;
      if(auto)desired.theta+=dt*.13;
      const k=reduced?1:1-Math.exp(-dt*12);
      let moving=false;
      ['theta','phi','radius'].forEach(p=>{const diff=desired[p]-state[p];if(Math.abs(diff)>.00015){state[p]+=diff*k;moving=true;}else state[p]=desired[p];});
      if(state.target.distanceTo(desired.target)>.0001){state.target.lerp(desired.target,k);moving=true;}else state.target.copy(desired.target);
      draw();dirty=false;frames++;
      if(now-fpsStart>900){fps=Math.round(frames*1000/(now-fpsStart));fpsStart=now;frames=0;}
      if(auto||moving)scheduled=requestAnimationFrame(frame);
    }
    function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const sz=renderer.getDrawingBufferSize(new T.Vector2());rt.setSize(sz.x,sz.y);invalidate();}
    new ResizeObserver(resize).observe(host);resize();
    const canvas=renderer.domElement,pointers=new Map();let pointerTravel=0,lastPinch=0;
    function stopAuto(){auto=false;$('autoRotate').setAttribute('aria-pressed','false');}
    function syncZoom(){ $('zoomRange').value=desired.radius; $('zoomValue').textContent=desired.radius<7?'特写':desired.radius>11?'远景':'全景';}
    canvas.addEventListener('pointerdown',e=>{stopAuto();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pointerTravel=0;lastPinch=0;});
    canvas.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;
      const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointerTravel+=Math.abs(dx)+Math.abs(dy);
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===1){desired.theta-=dx*.007;desired.phi=T.MathUtils.clamp(desired.phi-dy*.005,.17,1.48);}
      else{const p=[...pointers.values()];const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastPinch>0)desired.radius=T.MathUtils.clamp(desired.radius*lastPinch/dist,5,zoomMax);lastPinch=dist;syncZoom();}
      invalidate();
    });
    const raycaster=new T.Raycaster();
    canvas.addEventListener('pointerup',e=>{
      if(pointerTravel<7 && pointers.size===1){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObjects(pickables);if(hits.length)$('sceneStatus').textContent=hits[0].object.userData.label;}
      pointers.delete(e.pointerId);lastPinch=0;
    });
    canvas.addEventListener('pointercancel',e=>pointers.delete(e.pointerId));
    canvas.addEventListener('wheel',e=>{e.preventDefault();stopAuto();desired.radius=T.MathUtils.clamp(desired.radius*Math.exp(T.MathUtils.clamp(e.deltaY,-200,200)*.001),5,zoomMax);syncZoom();invalidate();},{passive:false});
    canvas.addEventListener('keydown',e=>{
      let used=true;switch(e.key){case 'ArrowLeft':desired.theta-=.12;break;case 'ArrowRight':desired.theta+=.12;break;case 'ArrowUp':desired.phi=Math.max(.17,desired.phi-.1);break;case 'ArrowDown':desired.phi=Math.min(1.48,desired.phi+.1);break;case '+':case '=':desired.radius=Math.max(5,desired.radius-.5);break;case '-':desired.radius=Math.min(zoomMax,desired.radius+.5);break;default:used=false;}
      if(used){e.preventDefault();stopAuto();syncZoom();invalidate();}
    });
    function view(which){stopAuto();document.querySelectorAll('.button-grid button').forEach(b=>b.classList.remove('selected'));$(which).classList.add('selected');
      if(which==='resetView'){Object.assign(desired,{theta:defaultView.theta,phi:defaultView.phi,radius:defaultView.radius});desired.target.copy(defaultView.target);}
      if(which==='topView'){Object.assign(desired,{theta:.18,phi:.24,radius:mobile?15.5:8.7});desired.target.set(0,.3,0);}
      if(which==='detailView'){Object.assign(desired,{theta:.12,phi:1.30,radius:5.5});desired.target.set(-.4,.66,1.05);}
      syncZoom();invalidate();
    }
    ['resetView','topView','detailView'].forEach(id=>$(id).onclick=()=>view(id));
    $('autoRotate').onclick=()=>{auto=!auto;$('autoRotate').setAttribute('aria-pressed',String(auto));fpsStart=performance.now();frames=0;invalidate();};
    $('zoomRange').oninput=e=>{stopAuto();desired.radius=Number(e.target.value);syncZoom();invalidate();};
    $('filterToggle').onclick=()=>{const enabled=$('filterToggle').getAttribute('aria-pressed')!=='true';$('filterToggle').setAttribute('aria-pressed',String(enabled));postMat.uniforms.film.value=enabled?1:0;invalidate();};
    function quality(high){renderer.shadowMap.needsUpdate=true;key.shadow.mapSize.set(high&&!mobile?2048:1024,high&&!mobile?2048:1024);if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null;}renderer.setPixelRatio(high?Math.min(devicePixelRatio,mobile?1.35:1.6):1);$('qualityStatus').textContent=high?'WebGL · 高清阴影':'WebGL · 轻量模式';resize();}
    $('qualityToggle').onclick=()=>{const high=$('qualityToggle').getAttribute('aria-pressed')!=='true';$('qualityToggle').setAttribute('aria-pressed',String(high));quality(high);};
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;}else{last=performance.now();invalidate();}});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('sceneStatus').textContent='图形上下文已暂停，等待恢复';if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;});
    canvas.addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;last=performance.now();$('sceneStatus').textContent='三维显示已恢复 · 拖拽旋转';invalidate();});
    window.consumptionScene={
      getStats:()=>({three:T.REVISION,meshes:pickables.length,triangles:pickables.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),drawCalls:renderer.info.render.calls,fps,autoRotate:auto,viewport:[host.clientWidth,host.clientHeight],pixelRatio:renderer.getPixelRatio(),camera:camera.position.toArray(),filter:postMat.uniforms.film.value}),
      setView:view,
      render:()=>{invalidate();},
      // Deterministic benchmark of complete scene + post pass (CPU submission, not claimed GPU FPS).
      benchmark:(n=40)=>{const start=performance.now();for(let i=0;i<n;i++)draw();return{frames:n,submissionMs:(performance.now()-start)/n};}
    };
    loading.hidden=true;syncZoom();invalidate();
  }
})();
