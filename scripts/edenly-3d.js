/* Edenly 3D preview. A photographic PBR GLB is required: no substitute cartoon geometry. */
(() => {
  const stage=document.getElementById('gelato-stage');
  const canvas=document.getElementById('gelato-canvas');
  const toggle=document.getElementById('mode-toggle');
  const hint=document.getElementById('art-hint');
  const nav=document.querySelector('.nav');
  const menuToggle=document.querySelector('.mobile-toggle');
  const languageButtons=document.querySelectorAll('[data-language]');
  const translated=document.querySelectorAll('[data-zh][data-en], [data-zh-html][data-en-html]');
  let language='en', view='photo', ready=false, activate3d=()=>{}, changeView=()=>{};
  function translate(lang){
    language=lang;
    document.documentElement.lang=lang==='zh'?'zh-Hant':'en';
    translated.forEach(el=>{
      if(el.hasAttribute('data-zh-html')) el.innerHTML=el.dataset[lang+'Html'];
      else el.textContent=el.dataset[lang];
    });
    languageButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===lang)));
    try{localStorage.setItem('edenly-language',lang)}catch(_){}
  }
  languageButtons.forEach(b=>b.addEventListener('click',()=>translate(b.dataset.language)));
  let remembered='en';try{remembered=localStorage.getItem('edenly-language')||'en'}catch(_){}
  translate(remembered==='zh'?'zh':'en');
  if(menu&&menuToggle){
    menuToggle.addEventListener('click',()=>{
      const expanded=menu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded',String(expanded));
      menuToggle.setAttribute('aria-label',expanded?'Close navigation':'Open navigation');
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('is-open');menuToggle.setAttribute('aria-expanded','false');
    }));
  }
  const yr=document.getElementById('year');if(yr)yr.textContent=String(new Date().getFullYear());
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
    }),{threshold:.12});
    document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));
  }else document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'));

  // Flavour cards now work as a menu selection; they do not recolour the product model inaccurately.
  const cards=document.querySelectorAll('[data-flavour]');
  cards.forEach(b=>b.addEventListener('click',()=>{
    cards.forEach(other=>other.setAttribute('aria-pressed',String(other.dataset.flavour===b.dataset.flavour)));
  }));
  if(!stage||!canvas||!toggle)return;
  toggle.hidden=true; // Only offer 3D once the actual photorealistic GLB exists and loads successfully.
  const modelUrl='assets/edenly-cup-photoreal.glb';
  fetch(modelUrl,{method:'HEAD'}).then(r=>{
    if(!r.ok||!(/model|octet-stream|binary|gltf/i).test(r.headers.get('content-type')||'application/octet-stream')) throw Error('Model not published');
    return Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js')]);
  }).then(([THREE,{GLTFLoader}])=>{
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff,0xd0d6be,2.5));
    const key=new THREE.DirectionalLight(0xffeedc,3.1);key.position.set(-3,5,5);scene.add(key);
    const fill=new THREE.DirectionalLight(0xf4fff3,1.7);fill.position.set(4,3,-3);scene.add(fill);
    const camera=new THREE.PerspectiveCamera(33,1,.01,100);
    const group=new THREE.Group();scene.add(group);
    const loader=new GLTFLoader();
    return new Promise((resolve,reject)=>loader.load(modelUrl,glb=>{
      const model=glb.scene;
      const bounds=new THREE.Box3().setFromObject(model);
      if(bounds.isEmpty())return reject(Error('Empty 3D model'));
      const size=bounds.getSize(new THREE.Vector3());
      const center=bounds.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const scale=2.7/Math.max(size.x,size.y,size.z);
      model.scale.setScalar(scale);
      model.traverse(o=>{
        if(o.isMesh&&o.material){
          const materials=Array.isArray(o.material)?o.material:[o.material];
          materials.forEach(m=>{if('envMapIntensity'in m)m.envMapIntensity=1});
        }
      });
      group.add(model);
      const resize=()=>{
        const w=Math.max(stage.clientWidth,1),h=Math.max(stage.clientHeight,1);
        camera.aspect=w/h;
        camera.position.set(0,.1,w<460?6.6:6);
        camera.lookAt(0,0,0);camera.updateProjectionMatrix();
        renderer.setSize(w,h,false);
      };
      resize();new ResizeObserver(resize).observe(stage);
      let drag=false,px=0,py=0,dy=-.13,dx=0,rotY=dy,rotX=0;
      stage.addEventListener('pointerdown',e=>{
        if(view!=='3d')return;
        drag=true;px=e.clientX;py=e.clientY;
        stage.setPointerCapture?.(e.pointerId);
      });
      stage.addEventListener('pointermove',e=>{
        if(view!=='3d')return;
        if(drag){dy+=(e.clientX-px)*.008;dx=Math.max(-.42,Math.min(.42,dx+(e.clientY-py)*.004));px=e.clientX;py=e.clientY}
        else if(e.pointerType==='mouse'){const r=stage.getBoundingClientRect();dy=-.13+((e.clientX-r.left)/r.width-.5)*.35}
      });
      stage.addEventListener('pointerup',()=>{drag=false});
      stage.addEventListener('pointercancel',()=>{drag=false});
      stage.addEventListener('pointerleave',()=>{if(!drag)dy=-.13});
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      function draw(){
        requestAnimationFrame(draw);
        if(view!=='3d'||document.hidden)return;
        rotY+=(dy-rotY)*.09;rotX+=(dx-rotX)*.09;
        group.rotation.set(rotX,rotY,0);
        renderer.render(scene,camera);
      }
      draw();
      changeView=next=>{
        view=next;
        const on=next==='3d';
        stage.classList.toggle('mode-3d',on);
        stage.classList.toggle('webgl-ready',ready);
        stage.closest('.hero-art')?.classList.toggle('mode-3d-active',on);
        toggle.setAttribute('aria-pressed',String(on));
        toggle.dataset.en=on?'SHOW PHOTO ↶':'EXPLORE REAL 3D ↗';
        toggle.dataset.zh=on?'返回照片 ↶':'探索寫實 3D ↗';
        hint.dataset.en=on?'↔ DRAG TO ROTATE':'REALISTIC GELATO PHOTOGRAPH';
        hint.dataset.zh=on?'↔ 拖動旋轉':'寫實 GELATO 攝影風格';
        translate(language);
        if(on)renderer.render(scene,camera);
      };
      ready=true;
      stage.classList.add('webgl-ready');
      toggle.hidden=false;
      toggle.addEventListener('click',()=>changeView(view==='photo'?'3d':'photo'));
      resolve();
    },undefined,reject));
  }).catch(err=>{
    console.info('Photorealistic GLB not yet available; cartoon 3D model intentionally disabled.',err.message);
    if(toggle)toggle.hidden=true;
  });
})();