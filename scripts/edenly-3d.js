
/* Edenly Gelato 3D concept: progressive enhancement over a photographic fallback. */
(() => {
  const flavours = {
    matcha: { colour:0x78a047, accent:'#88a75f' },
    pistachio: { colour:0xb7ba73, accent:'#b5bd76' },
    vanilla: { colour:0xf1d9a9, accent:'#dfcfa9' },
    oreo: { colour:0x827e81, accent:'#a7a4a5' },
    yogurt: { colour:0xf8f2e9, accent:'#ddd7e1' },
    biscoff: { colour:0xb97c4e, accent:'#c68b53' },
    tofu: { colour:0xe4d7ba, accent:'#cfc3a5' },
    seasonal: { colour:0xe59aa4, accent:'#d994a0' }
  };
  const stage = document.getElementById('gelato-stage');
  const buttons = Array.from(document.querySelectorAll('[data-flavour]'));
  let activeFlavour = 'matcha';
  let onFlavourChange = () => {};

  function selectFlavour(key, fromClick = false) {
    if (!flavours[key]) return;
    activeFlavour = key;
    document.documentElement.style.setProperty('--flavour', flavours[key].accent);
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.flavour === key)));
    onFlavourChange(key);
    if (fromClick && stage?.classList.contains('mode-3d') && window.matchMedia('(max-width: 850px)').matches) {
      stage.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
    }
  }
  buttons.forEach(btn => btn.addEventListener('click', () => selectFlavour(btn.dataset.flavour, btn.classList.contains('flavour-card'))));

  const langButtons = document.querySelectorAll('[data-language]');
  const i18nNodes = document.querySelectorAll('[data-zh][data-en], [data-zh-html][data-en-html]');
  let currentLanguage = 'en';
  function setLanguage(lang) {
    currentLanguage = lang;
    const english = lang === 'en';
    document.documentElement.lang = english ? 'en' : 'zh-Hant';
    i18nNodes.forEach(node => {
      if (node.hasAttribute('data-zh-html')) {
        node.innerHTML = english ? node.dataset.enHtml : node.dataset.zhHtml;
      } else {
        node.textContent = english ? node.dataset.en : node.dataset.zh;
      }
    });
    langButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.language === lang)));
    try { localStorage.setItem('edenly-language', lang); } catch (_) {}
  }
  langButtons.forEach(b => b.addEventListener('click', () => setLanguage(b.dataset.language)));
  let storedLang = 'en';
  try { storedLang = localStorage.getItem('edenly-language') || 'en'; } catch (_) {}
  setLanguage(storedLang === 'zh' ? 'zh' : 'en');

  // The approved product photograph is the default homepage cover.
  // Render the interactive 3D cup only if visitors explicitly opt in.
  const modeToggle = document.getElementById('mode-toggle');
  const heroHint = document.getElementById('art-hint');
  let wants3d = false;
  function syncMode() {
    const ready = !!stage?.classList.contains('webgl-ready');
    stage?.classList.toggle('mode-3d', wants3d && ready);
    if (modeToggle) {
      modeToggle.setAttribute('aria-pressed', String(wants3d && ready));
      modeToggle.dataset.en = wants3d ? (ready ? 'SHOW PHOTO ↶' : 'LOADING 3D…') : 'EXPLORE IN 3D ↗';
      modeToggle.dataset.zh = wants3d ? (ready ? '返回實拍風格照片 ↶' : '正在載入 3D…') : '探索 3D 模型 ↗';
    }
    if (heroHint) {
      heroHint.dataset.en = wants3d && ready ? '↔ DRAG TO ROTATE THE CUP' : 'REALISTIC GELATO PHOTOGRAPH';
      heroHint.dataset.zh = wants3d && ready ? '↔ 拖動旋轉雪糕杯' : '寫實 GELATO 攝影風格';
    }
    setLanguage(currentLanguage);
  }
  if (modeToggle) modeToggle.addEventListener('click', () => {
    wants3d = !wants3d;
    syncMode();
  });

  const menu = document.querySelector('.nav');
  const menuToggle = document.querySelector('.mobile-toggle');
  if (menu && menuToggle) {
    menuToggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    reveals.forEach(node => observer.observe(node));
  } else {
    reveals.forEach(node => node.classList.add('is-visible'));
  }

  if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (modeToggle) modeToggle.hidden = true;
    return;
  }
  const canvas = document.getElementById('gelato-canvas');
  if (!canvas) return;
  // The visual and flavour controls still work when WebGL or a CDN is unavailable.
  import('three').then(THREE => {
    const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.48;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
    camera.position.set(0, .42, 7.3);
    camera.lookAt(0, .25, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d3b4, 2.9));
    const key = new THREE.DirectionalLight(0xfff5df, 3.6);
    key.position.set(-3,5,5); scene.add(key);
    const rimLight = new THREE.DirectionalLight(0xc9eac8, 2.5);
    rimLight.position.set(3,2,-4); scene.add(rimLight);

    const model = new THREE.Group(); scene.add(model);
    const cup = new THREE.Group(); model.add(cup);
    const side = new THREE.Mesh(
      new THREE.CylinderGeometry(1.07,.78,1.65,96,1,true),
      new THREE.MeshPhysicalMaterial({color:0x08311f,roughness:.68,metalness:0.025,side:THREE.DoubleSide})
    );
    cup.add(side);
    const bottom = new THREE.Mesh(
      new THREE.CylinderGeometry(.78,.78,.055,80),
      new THREE.MeshStandardMaterial({color:0x092c1d,roughness:.76})
    );
    bottom.position.y = -.84; cup.add(bottom);
    const innerTop = new THREE.Mesh(
      new THREE.CircleGeometry(1.02,80),
      new THREE.MeshStandardMaterial({color:0xf7efe2,roughness:1,side:THREE.DoubleSide})
    );
    innerTop.rotation.x = -Math.PI/2; innerTop.position.y = .792; cup.add(innerTop);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.061,.070,12,100),
      new THREE.MeshPhysicalMaterial({color:0xfff7e8,roughness:.43})
    );
    rim.rotation.x = Math.PI/2; rim.position.y = .833; cup.add(rim);

    const outerFront = new THREE.Mesh(
      new THREE.CylinderGeometry(1.078,.790,1.65,70,1,true,-.68,1.36),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})
    );
    cup.add(outerFront);
    // Reuse the exact Edenly logo from the repository and remove only its solid SVG background.
    fetch('assets/edenly-logo.svg').then(resp => resp.text()).then(svg => {
      const withoutBg = svg.replace(/<rect\b[^>]*\/?>/, '');
      const blobUrl = URL.createObjectURL(new Blob([withoutBg],{type:'image/svg+xml'}));
      const img = new Image();
      img.onload = () => {
        const sheet = document.createElement('canvas'); sheet.width=1024; sheet.height=1024;
        const ctx=sheet.getContext('2d');
        ctx.clearRect(0,0,1024,1024);
        ctx.drawImage(img,160,95,704,704);
        const texture = new THREE.CanvasTexture(sheet);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
        outerFront.material.dispose();
        outerFront.material = new THREE.MeshBasicMaterial({
          map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2
        });
        URL.revokeObjectURL(blobUrl);
      };
      img.onerror = () => URL.revokeObjectURL(blobUrl);
      img.src=blobUrl;
    }).catch(() => {});

    function makeScoop(radius,colour,seed,x,y,z) {
      const geo = new THREE.SphereGeometry(radius,64,46);
      const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
        const f=1+.023*Math.sin(px*18+seed+py*11)*Math.sin(pz*12+py*9)+.018*Math.cos(py*23+pz*13+seed);
        pos.setXYZ(i,px*f,py*f,pz*f);
      }
      geo.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({color:colour,roughness:.91,metalness:0});
      const mesh=new THREE.Mesh(geo,material);
      mesh.position.set(x,y,z);
      mesh.rotation.z= x>0?-.28:.19;
      cup.add(mesh);
      return mesh;
    }
    const scoop1=makeScoop(.735,flavours.matcha.colour,1,-.39,1.15,.02);
    const scoop2=makeScoop(.69,0xf3deb9,5,.44,1.12,.18);
    // Small sculpted gelato folds, instead of an unrealistically smooth sphere.
    function addFold(scoop,points,colour,opacity=.38) {
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve,32,.018,7,false),
        new THREE.MeshStandardMaterial({color:colour,transparent:true,opacity,roughness:1}));
      scoop.add(tube);
    }
    addFold(scoop1,[[-.35,.32,.59],[-.11,.42,.64],[.18,.37,.57],[.32,.24,.57]],0xbdd486,.50);
    addFold(scoop1,[[-.49,.03,.47],[-.21,.13,.66],[.10,.02,.68],[.30,-.08,.60]],0x507a28,.34);
    addFold(scoop2,[[-.36,.20,.55],[-.12,.33,.61],[.14,.25,.64],[.28,.08,.57]],0xffffff,.55);
    addFold(scoop2,[[-.31,-.10,.52],[-.06,.02,.68],[.23,-.08,.61]],0xd5b889,.38);

    let targetY=-.18, targetX=.02, currentY=-.18, currentX=.02;
    let pointerDown=false, downX=0,downY=0;
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      pointerDown=true;downX=e.clientX;downY=e.clientY;
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener('pointermove',e=>{
      if(pointerDown){
        targetY+=(e.clientX-downX)*.008;
        targetX=Math.max(-.36,Math.min(.35,targetX+(e.clientY-downY)*.004));
        downX=e.clientX;downY=e.clientY;
      } else if(e.pointerType==='mouse'){
        const r=stage.getBoundingClientRect();
        targetY= -.18+((e.clientX-r.left)/r.width-.5)*.46;
        targetX= ((e.clientY-r.top)/r.height-.5)*.19;
      }
    });
    stage.addEventListener('pointerup',()=>{pointerDown=false});
    stage.addEventListener('pointercancel',()=>{pointerDown=false});
    stage.addEventListener('pointerleave',()=>{if(!pointerDown){targetY=-.18;targetX=.02}});
    onFlavourChange = key => {
      const palette=flavours[key];
      if(!palette)return;
      const goal = new THREE.Color(palette.colour);
      const from=scoop1.material.color.clone();
      const start=performance.now();
      const t=()=> {
        const alpha=Math.min((performance.now()-start)/480,1);
        const eased=1-Math.pow(1-alpha,3);
        scoop1.material.color.copy(from).lerp(goal,eased);
        if(alpha<1)requestAnimationFrame(t);
      };t();
    };
    if (activeFlavour !== 'matcha') onFlavourChange(activeFlavour);

    let visible=true;
    const visObserver=new IntersectionObserver(entries => {visible=entries[0].isIntersecting;},{threshold:0});
    visObserver.observe(stage);
    const resize = () => {
      const w=Math.max(stage.clientWidth,1),h=Math.max(stage.clientHeight,1);
      camera.aspect=w/h;
      camera.fov=w<460?39:33;
      camera.position.z=w<460?7.7:7.3;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    };
    resize();
    const ro= new ResizeObserver(resize);ro.observe(stage);
    const clock = new THREE.Clock();
    let hasRendered=false;
    function animate() {
      requestAnimationFrame(animate);
      if(!visible||document.hidden) return;
      const elapsed=clock.getElapsedTime();
      currentY+=(targetY-currentY)*.07;
      currentX+=(targetX-currentX)*.07;
      model.rotation.y=currentY;
      model.rotation.x=currentX;
      model.rotation.z=Math.sin(elapsed*.55)*.025;
      model.position.y=-.24+Math.sin(elapsed*.8)*.075;
      renderer.render(scene,camera);
      if(!hasRendered){hasRendered=true;stage.classList.add('webgl-ready');syncMode();}
    }
    animate();
  }).catch(err => {
    console.warn('3D preview unavailable; keeping photograph fallback.',err);
    canvas.style.display='none';
    wants3d=false;
    syncMode();
    if(modeToggle){modeToggle.disabled=true;modeToggle.dataset.en='3D NOT AVAILABLE';modeToggle.dataset.zh='目前無法使用 3D';setLanguage(currentLanguage);}
  });
})();
