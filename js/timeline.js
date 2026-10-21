/* ============================================================
   timeline.js — 人类文明 3D 时间线场景逻辑
   ============================================================
   功能模块：
     0.  工具函数
     1.  场景初始化（Scene, Camera, Renderer）
     2.  轨道控制器（简化版 OrbitControls）
     3.  五个时代的 3D 场景构建
     4.  环境光效系统
     5.  相机动画与场景过渡
     6.  时间轴 UI 交互
     7.  滚动 / 拖拽 / 滑动导航
     8.  动画循环
     9.  窗口resize处理
     10. 入口初始化

   时代数据：
     0: 史前时代 — 洞穴、篝火、石器
     1: 古代文明 — 金字塔、方尖碑、神殿
     2: 中世纪 — 城堡、塔楼、吊桥
     3: 工业革命 — 蒸汽机、齿轮、烟囱
     4: 现代 — 摩天大楼、网格城市、发光建筑
============================================================ */

(function () {
  'use strict';

  /* ========================================================
     0. 工具函数
  ======================================================== */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // 线性插值
  function lerp(a, b, t) { return a + (b - a) * t; }

  // 三维向量插值
  function lerpVec3(v1, v2, t) {
    return new THREE.Vector3(
      lerp(v1.x, v2.x, t),
      lerp(v1.y, v2.y, t),
      lerp(v1.z, v2.z, t)
    );
  }

  // 缓动函数：easeInOutCubic
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ========================================================
     时代数据配置
  ======================================================== */
  const ERAS = [
    {
      id: 0,
      title: '史前时代',
      desc: '人类文明的黎明，洞穴壁画与石器工具标志着智慧的开端。',
      year: '约公元前 300 万年',
      cameraPos: new THREE.Vector3(12, 8, 12),
      cameraTarget: new THREE.Vector3(0, 1, 0),
      bgColor: 0x1a1510,
      fogColor: 0x1a1510,
      ambientIntensity: 0.3,
      lightColor: 0xffaa44
    },
    {
      id: 1,
      title: '古代文明',
      desc: '金字塔与神殿拔地而起，文字与数学开启了文明的新篇章。',
      year: '约公元前 3000 年',
      cameraPos: new THREE.Vector3(18, 10, 18),
      cameraTarget: new THREE.Vector3(0, 3, 0),
      bgColor: 0x1e2a3a,
      fogColor: 0x1e2a3a,
      ambientIntensity: 0.4,
      lightColor: 0xffdd88
    },
    {
      id: 2,
      title: '中世纪',
      desc: '城堡与骑士的时代，石砌建筑见证了封建社会的辉煌与纷争。',
      year: '公元 5 — 15 世纪',
      cameraPos: new THREE.Vector3(14, 9, 14),
      cameraTarget: new THREE.Vector3(0, 2.5, 0),
      bgColor: 0x1a1e2e,
      fogColor: 0x1a1e2e,
      ambientIntensity: 0.35,
      lightColor: 0xaaccff
    },
    {
      id: 3,
      title: '工业革命',
      desc: '蒸汽与齿轮驱动世界，机器轰鸣中人类迈入工业化时代。',
      year: '18 — 19 世纪',
      cameraPos: new THREE.Vector3(16, 8, 16),
      cameraTarget: new THREE.Vector3(0, 2, 0),
      bgColor: 0x1a1a1a,
      fogColor: 0x1a1a1a,
      ambientIntensity: 0.25,
      lightColor: 0xff8844
    },
    {
      id: 4,
      title: '现代',
      desc: '摩天大楼直插云霄，数字与网络连接着世界的每一个角落。',
      year: '20 世纪 — 至今',
      cameraPos: new THREE.Vector3(20, 12, 20),
      cameraTarget: new THREE.Vector3(0, 4, 0),
      bgColor: 0x0d1117,
      fogColor: 0x0d1117,
      ambientIntensity: 0.3,
      lightColor: 0x66aaff
    }
  ];

  /* ========================================================
     1. 场景初始化
  ======================================================== */
  let scene, camera, renderer;
  let currentEra = 0;
  let isTransitioning = false;
  let eraGroups = []; // 每个时代的 3D 对象组

  function initScene() {
    const container = $('#canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(ERAS[0].bgColor);
    scene.fog = new THREE.Fog(ERAS[0].fogColor, 20, 80);

    // 相机
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.copy(ERAS[0].cameraPos);
    camera.lookAt(ERAS[0].cameraTarget);

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
  }

  /* ========================================================
     2. 简化版轨道控制器
     --------------------------------------------------------
     支持：左键旋转、右键平移、滚轮缩放、触摸单指旋转、双指缩放
  ======================================================== */
  let orbitControls = {
    enabled: true,
    minDistance: 5,
    maxDistance: 50,
    rotateSpeed: 0.005,
    zoomSpeed: 0.1,
    panSpeed: 0.01,

    // 内部状态
    spherical: new THREE.Spherical(),
    sphericalDelta: new THREE.Spherical(),
    panOffset: new THREE.Vector3(),
    target: new THREE.Vector3(),
    isRotating: false,
    isPanning: false,
    lastPointer: { x: 0, y: 0 },
    pointers: [],
    lastDist: 0
  };

  function initOrbitControls() {
    const canvas = renderer.domElement;
    const ctrl = orbitControls;
    ctrl.target.copy(ERAS[0].cameraTarget);

    // 更新相机位置（从球坐标）
    function updateCamera() {
      const offset = new THREE.Vector3();
      offset.setFromSpherical(ctrl.spherical);
      camera.position.copy(ctrl.target).add(offset);
      camera.lookAt(ctrl.target);
    }

    // 初始化球坐标
    function initSpherical() {
      const offset = new THREE.Vector3().subVectors(camera.position, ctrl.target);
      ctrl.spherical.setFromVector3(offset);
    }
    initSpherical();

    // 鼠标按下
    canvas.addEventListener('pointerdown', function (e) {
      if (!ctrl.enabled || isTransitioning) return;
      ctrl.pointers.push(e);

      if (ctrl.pointers.length === 1) {
        ctrl.isRotating = e.button === 0;
        ctrl.isPanning = e.button === 2;
        ctrl.lastPointer.x = e.clientX;
        ctrl.lastPointer.y = e.clientY;
      } else if (ctrl.pointers.length === 2) {
        // 双指：准备缩放
        ctrl.isRotating = false;
        ctrl.isPanning = false;
        const dx = ctrl.pointers[0].clientX - ctrl.pointers[1].clientX;
        const dy = ctrl.pointers[0].clientY - ctrl.pointers[1].clientY;
        ctrl.lastDist = Math.sqrt(dx * dx + dy * dy);
      }
    });

    // 鼠标移动
    canvas.addEventListener('pointermove', function (e) {
      if (!ctrl.enabled || isTransitioning) return;

      // 更新指针位置
      const idx = ctrl.pointers.findIndex((p) => p.pointerId === e.pointerId);
      if (idx >= 0) ctrl.pointers[idx] = e;

      if (ctrl.pointers.length === 1 && (ctrl.isRotating || ctrl.isPanning)) {
        const dx = e.clientX - ctrl.lastPointer.x;
        const dy = e.clientY - ctrl.lastPointer.y;

        if (ctrl.isRotating) {
          ctrl.sphericalDelta.theta -= dx * ctrl.rotateSpeed;
          ctrl.sphericalDelta.phi -= dy * ctrl.rotateSpeed;
          // 限制 phi 范围，避免翻转
          ctrl.sphericalDelta.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, ctrl.sphericalDelta.phi));
        } else if (ctrl.isPanning) {
          const pan = new THREE.Vector3(-dx * ctrl.panSpeed, dy * ctrl.panSpeed, 0);
          pan.applyQuaternion(camera.quaternion);
          ctrl.panOffset.add(pan);
        }

        ctrl.lastPointer.x = e.clientX;
        ctrl.lastPointer.y = e.clientY;
      } else if (ctrl.pointers.length === 2) {
        // 双指缩放
        const dx = ctrl.pointers[0].clientX - ctrl.pointers[1].clientX;
        const dy = ctrl.pointers[0].clientY - ctrl.pointers[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = ctrl.lastDist / dist;
        ctrl.spherical.radius *= scale;
        ctrl.lastDist = dist;
      }
    });

    // 鼠标释放
    function onPointerUp(e) {
      const idx = ctrl.pointers.findIndex((p) => p.pointerId === e.pointerId);
      if (idx >= 0) ctrl.pointers.splice(idx, 1);
      if (ctrl.pointers.length === 0) {
        ctrl.isRotating = false;
        ctrl.isPanning = false;
      }
    }
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // 滚轮缩放
    canvas.addEventListener('wheel', function (e) {
      if (!ctrl.enabled || isTransitioning) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 + ctrl.zoomSpeed : 1 - ctrl.zoomSpeed;
      ctrl.spherical.radius *= delta;
      ctrl.spherical.radius = Math.max(ctrl.minDistance, Math.min(ctrl.maxDistance, ctrl.spherical.radius));
    }, { passive: false });

    // 禁用右键菜单
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // 每帧更新
    ctrl.update = function () {
      // 应用旋转增量
      ctrl.spherical.theta += ctrl.sphericalDelta.theta;
      ctrl.spherical.phi += ctrl.sphericalDelta.phi;
      ctrl.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, ctrl.spherical.phi));
      ctrl.sphericalDelta.set(0, 0, 0);

      // 应用平移
      ctrl.target.add(ctrl.panOffset);
      ctrl.panOffset.set(0, 0, 0);

      // 限制半径
      ctrl.spherical.radius = Math.max(ctrl.minDistance, Math.min(ctrl.maxDistance, ctrl.spherical.radius));

      updateCamera();
    };
  }

  /* ========================================================
     3. 五个时代的 3D 场景构建
     --------------------------------------------------------
     每个时代返回一个 THREE.Group，包含该时代的所有 3D 对象。
     使用基本几何体（Box, Cylinder, Sphere, Cone, Torus 等）
     程序化构建代表性场景。
  ======================================================== */

  // ---- 辅助材质函数 ----
  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.8, metalness: 0.1 }, opts));
  }

  function emissiveMat(color, intensity) {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.4,
      metalness: 0.3
    });
  }

  // ---- 时代 0: 史前时代 ----
  function buildPrehistoric() {
    const group = new THREE.Group();

    // 地面
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.5, 32),
      mat(0x5a4a3a)
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    group.add(ground);

    // 洞穴（半球体）
    const cave = new THREE.Mesh(
      new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0x6b5a4a, { side: THREE.DoubleSide })
    );
    cave.position.set(-3, 0, -2);
    cave.rotation.x = Math.PI;
    cave.castShadow = true;
    group.add(cave);

    // 洞穴入口光
    const caveLight = new THREE.PointLight(0xff8844, 2, 15);
    caveLight.position.set(-3, 1, -1);
    group.add(caveLight);

    // 篝火
    const fireBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 0.3, 8),
      mat(0x4a3a2a)
    );
    fireBase.position.set(2, 0.15, 2);
    group.add(fireBase);

    // 火焰（发光球体）
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      emissiveMat(0xff6600, 2)
    );
    flame.position.set(2, 0.6, 2);
    group.add(flame);

    const fireLight = new THREE.PointLight(0xff6600, 3, 12);
    fireLight.position.set(2, 1, 2);
    fireLight.castShadow = true;
    group.add(fireLight);

    // 石头（散布）
    const stoneColors = [0x7a7a7a, 0x8a8a7a, 0x6a6a6a];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3, 0),
        mat(stoneColors[i % 3])
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 8;
      s.position.set(Math.cos(angle) * dist, 0.15, Math.sin(angle) * dist);
      s.rotation.set(Math.random(), Math.random(), Math.random());
      s.castShadow = true;
      group.add(s);
    }

    // 树木（简化：圆柱+圆锥）
    for (let i = 0; i < 6; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2, 6),
        mat(0x4a3a2a)
      );
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1, 2.5, 6),
        mat(0x2a5a2a)
      );
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 8 + Math.random() * 5;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      trunk.position.set(x, 1, z);
      leaves.position.set(x, 2.5, z);
      trunk.castShadow = true;
      leaves.castShadow = true;
      group.add(trunk);
      group.add(leaves);
    }

    // 动画数据
    group.userData = {
      flame: flame,
      fireLight: fireLight,
      animate: function (time) {
        // 火焰跳动
        const scale = 1 + Math.sin(time * 8) * 0.15 + Math.sin(time * 13) * 0.1;
        flame.scale.set(scale, scale * 1.2, scale);
        fireLight.intensity = 2.5 + Math.sin(time * 6) * 0.8;
      }
    };

    return group;
  }

  // ---- 时代 1: 古代文明 ----
  function buildAncient() {
    const group = new THREE.Group();

    // 沙地
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 0.5, 32),
      mat(0xc4a86b)
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    group.add(ground);

    // 金字塔（四面体）
    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(5, 6, 4),
      mat(0xd4b87a)
    );
    pyramid.position.set(0, 3, -3);
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    group.add(pyramid);

    // 小金字塔
    const smallPyramid = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 3, 4),
      mat(0xc4a86b)
    );
    smallPyramid.position.set(6, 1.5, 2);
    smallPyramid.rotation.y = Math.PI / 4;
    smallPyramid.castShadow = true;
    group.add(smallPyramid);

    // 方尖碑
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.5, 6, 4),
      mat(0xb8a070)
    );
    obelisk.position.set(-5, 3, 4);
    obelisk.castShadow = true;
    group.add(obelisk);

    const obelisk2 = obelisk.clone();
    obelisk2.position.set(-7, 3, 3);
    group.add(obelisk2);

    // 神殿柱廊
    for (let i = 0; i < 6; i++) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 4, 8),
        mat(0xd0c090)
      );
      col.position.set(-4 + i * 1.2, 2, 6);
      col.castShadow = true;
      group.add(col);

      // 柱头
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.2, 0.8),
        mat(0xd0c090)
      );
      cap.position.set(-4 + i * 1.2, 4.1, 6);
      group.add(cap);
    }

    // 神殿横梁
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.3, 0.8),
      mat(0xd0c090)
    );
    beam.position.set(1, 4.3, 6);
    group.add(beam);

    // 斯芬克斯（简化：长方体+球体）
    const sphinxBody = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.2, 3),
      mat(0xc4a86b)
    );
    sphinxBody.position.set(5, 0.6, -3);
    group.add(sphinxBody);

    const sphinxHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      mat(0xc4a86b)
    );
    sphinxHead.position.set(5, 1.5, -2.2);
    group.add(sphinxHead);

    // 动画
    group.userData = {
      animate: function (time) {
        // 轻微浮动效果（神殿神秘感）
        group.children.forEach(function (child, i) {
          if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.z === 6) {
            child.position.y = 2 + Math.sin(time * 2 + i) * 0.02;
          }
        });
      }
    };

    return group;
  }

  // ---- 时代 2: 中世纪 ----
  function buildMedieval() {
    const group = new THREE.Group();

    // 草地
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.5, 32),
      mat(0x3a6a3a)
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    group.add(ground);

    // 城堡主楼
    const keep = new THREE.Mesh(
      new THREE.BoxGeometry(4, 8, 4),
      mat(0x7a7a7a)
    );
    keep.position.set(0, 4, 0);
    keep.castShadow = true;
    group.add(keep);

    // 城堡顶
    const keepRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 3, 4),
      mat(0x5a4a3a)
    );
    keepRoof.position.set(0, 9.5, 0);
    keepRoof.rotation.y = Math.PI / 4;
    group.add(keepRoof);

    // 角塔
    const towerPositions = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
    towerPositions.forEach(function (pos) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1, 6, 8),
        mat(0x7a7a7a)
      );
      tower.position.set(pos[0], 3, pos[1]);
      tower.castShadow = true;
      group.add(tower);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 2, 8),
        mat(0x5a4a3a)
      );
      roof.position.set(pos[0], 7, pos[1]);
      group.add(roof);
    });

    // 城墙
    const wallThickness = 0.5;
    const wallHeight = 4;
    const wallLength = 8;
    [[0, -4], [0, 4], [-4, 0], [4, 0]].forEach(function (pos, i) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(
          i < 2 ? wallLength : wallThickness,
          wallHeight,
          i < 2 ? wallThickness : wallLength
        ),
        mat(0x8a8a8a)
      );
      wall.position.set(pos[0], wallHeight / 2, pos[1]);
      wall.castShadow = true;
      group.add(wall);
    });

    // 吊桥
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.2, 4),
      mat(0x5a4a3a)
    );
    bridge.position.set(0, 0.1, 6);
    group.add(bridge);

    // 护城河（蓝色圆环）
    const moat = new THREE.Mesh(
      new THREE.RingGeometry(10, 13, 32),
      mat(0x2a6a9a, { transparent: true, opacity: 0.7 })
    );
    moat.rotation.x = -Math.PI / 2;
    moat.position.y = 0.05;
    group.add(moat);

    // 旗帜
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3, 4),
      mat(0x5a4a3a)
    );
    flagPole.position.set(0, 10.5, 0);
    group.add(flagPole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 0.05),
      mat(0xaa3333)
    );
    flag.position.set(0.8, 11.5, 0);
    group.add(flag);

    // 动画
    group.userData = {
      flag: flag,
      animate: function (time) {
        // 旗帜飘动
        flag.rotation.y = Math.sin(time * 3) * 0.15;
        flag.scale.x = 1 + Math.sin(time * 5) * 0.05;
      }
    };

    return group;
  }

  // ---- 时代 3: 工业革命 ----
  function buildIndustrial() {
    const group = new THREE.Group();

    // 工厂地面
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.5, 32),
      mat(0x3a3a3a)
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    group.add(ground);

    // 工厂建筑
    const factory = new THREE.Mesh(
      new THREE.BoxGeometry(8, 6, 5),
      mat(0x5a5a5a)
    );
    factory.position.set(0, 3, 0);
    factory.castShadow = true;
    group.add(factory);

    // 烟囱
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 10, 8),
      mat(0x4a4a4a)
    );
    chimney.position.set(3, 5, -1);
    chimney.castShadow = true;
    group.add(chimney);

    const chimney2 = chimney.clone();
    chimney2.position.set(-2, 5, -1);
    chimney2.scale.set(0.8, 0.9, 0.8);
    group.add(chimney2);

    // 烟雾粒子（简化：半透明球体）
    const smokes = [];
    for (let i = 0; i < 8; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + i * 0.15, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.4 - i * 0.04,
          roughness: 1
        })
      );
      smoke.position.set(3, 10 + i * 1.2, -1);
      group.add(smoke);
      smokes.push(smoke);
    }

    // 齿轮（Torus）
    function createGear(x, y, z, radius, color) {
      const gear = new THREE.Mesh(
        new THREE.TorusGeometry(radius, radius * 0.15, 8, 16),
        mat(color, { metalness: 0.6, roughness: 0.3 })
      );
      gear.position.set(x, y, z);
      gear.castShadow = true;
      return gear;
    }

    const gear1 = createGear(-5, 2, 3, 1.2, 0x8a8a6a);
    const gear2 = createGear(-3.2, 2, 3, 0.8, 0x7a7a5a);
    const gear3 = createGear(-5, 2, 4.5, 0.6, 0x9a9a7a);
    group.add(gear1);
    group.add(gear2);
    group.add(gear3);

    // 蒸汽机（简化）
    const engine = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 2),
      mat(0x6a5a4a, { metalness: 0.5, roughness: 0.4 })
    );
    engine.position.set(4, 1, 3);
    engine.castShadow = true;
    group.add(engine);

    // 活塞
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2, 8),
      mat(0x8a8a7a, { metalness: 0.7 })
    );
    piston.position.set(4, 2.5, 3);
    group.add(piston);

    // 铁轨
    for (let i = 0; i < 5; i++) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.1, 8),
        mat(0x5a5a4a, { metalness: 0.6 })
      );
      rail.position.set(-6 + i * 0.5, 0.05, 0);
      group.add(rail);
    }

    // 矿车
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 1),
      mat(0x6a4a2a)
    );
    cart.position.set(-5, 0.5, 0);
    group.add(cart);

    // 动画
    group.userData = {
      smokes: smokes,
      gear1: gear1,
      gear2: gear2,
      gear3: gear3,
      piston: piston,
      animate: function (time) {
        // 烟雾上升
        smokes.forEach(function (s, i) {
          s.position.y = 10 + i * 1.2 + (time * 0.5 + i * 0.3) % 3;
          s.scale.setScalar(1 + ((time * 0.5 + i * 0.3) % 3) * 0.3);
        });
        // 齿轮转动
        gear1.rotation.z = time * 0.8;
        gear2.rotation.z = -time * 1.2;
        gear3.rotation.z = time * 1.5;
        // 活塞运动
        piston.position.y = 2.5 + Math.sin(time * 4) * 0.3;
      }
    };

    return group;
  }

  // ---- 时代 4: 现代 ----
  function buildModern() {
    const group = new THREE.Group();

    // 城市地面
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 25, 0.5, 32),
      mat(0x2a2a2a)
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    group.add(ground);

    // 网格道路
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (let i = -2; i <= 2; i++) {
      const roadX = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 20), roadMat);
      roadX.position.set(i * 4, 0.02, 0);
      group.add(roadX);

      const roadZ = new THREE.Mesh(new THREE.BoxGeometry(20, 0.05, 0.8), roadMat);
      roadZ.position.set(0, 0.02, i * 4);
      group.add(roadZ);
    }

    // 摩天大楼
    const buildingColors = [0x4a6a8a, 0x5a7a9a, 0x3a5a7a, 0x6a8aaa, 0x4a5a6a];
    const buildings = [];

    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (x === 0 && z === 0) continue; // 中心留空
        const height = 3 + Math.random() * 10;
        const width = 1 + Math.random() * 1.5;
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, width),
          mat(buildingColors[Math.floor(Math.random() * buildingColors.length)])
        );
        building.position.set(x * 4, height / 2, z * 4);
        building.castShadow = true;
        group.add(building);
        buildings.push({ mesh: building, height: height });

        // 窗户发光
        const windowRows = Math.floor(height / 1.5);
        for (let r = 1; r < windowRows; r++) {
          if (Math.random() > 0.6) {
            const win = new THREE.Mesh(
              new THREE.BoxGeometry(width * 0.6, 0.3, width + 0.05),
              emissiveMat(0xffdd88, 0.5 + Math.random() * 1)
            );
            win.position.set(x * 4, r * 1.5, z * 4);
            group.add(win);
          }
        }
      }
    }

    // 中心高塔
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(2, 18, 2),
      mat(0x3a5a8a, { metalness: 0.4, roughness: 0.2 })
    );
    tower.position.set(0, 9, 0);
    tower.castShadow = true;
    group.add(tower);

    // 塔顶天线
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.1, 4, 4),
      mat(0xaaaaaa, { metalness: 0.8 })
    );
    antenna.position.set(0, 20, 0);
    group.add(antenna);

    // 塔顶发光
    const towerLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      emissiveMat(0xff3333, 3)
    );
    towerLight.position.set(0, 22, 0);
    group.add(towerLight);

    // 数据流（发光线条）
    const dataLines = [];
    for (let i = 0; i < 12; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 3 + Math.random() * 5),
        emissiveMat(0x00aaff, 1.5)
      );
      const angle = (i / 12) * Math.PI * 2;
      const dist = 8 + Math.random() * 8;
      line.position.set(Math.cos(angle) * dist, 1 + Math.random() * 3, Math.sin(angle) * dist);
      line.rotation.y = angle + Math.PI / 2;
      group.add(line);
      dataLines.push(line);
    }

    // 动画
    group.userData = {
      towerLight: towerLight,
      dataLines: dataLines,
      animate: function (time) {
        // 塔顶闪烁
        towerLight.material.emissiveIntensity = 2 + Math.sin(time * 4) * 1.5;
        // 数据流流动
        dataLines.forEach(function (line, i) {
          line.material.emissiveIntensity = 0.5 + Math.sin(time * 3 + i) * 0.8;
          line.position.y = 1 + Math.sin(time * 2 + i * 0.5) * 0.5;
        });
      }
    };

    return group;
  }

  /* ========================================================
     构建所有时代场景
  ======================================================== */
  function buildAllEras() {
    const builders = [buildPrehistoric, buildAncient, buildMedieval, buildIndustrial, buildModern];

    builders.forEach(function (builder, index) {
      const group = builder();
      // 将每个时代沿 X 轴分散放置，便于相机飞行过渡
      group.position.x = index * 60;
      scene.add(group);
      eraGroups.push(group);
    });
  }

  /* ========================================================
     4. 环境光效系统
  ======================================================== */
  let ambientLight, mainLight, fillLight;

  function initLighting() {
    // 环境光
    ambientLight = new THREE.AmbientLight(ERAS[0].lightColor, ERAS[0].ambientIntensity);
    scene.add(ambientLight);

    // 主光源（方向光，产生阴影）
    mainLight = new THREE.DirectionalLight(ERAS[0].lightColor, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);

    // 补光
    fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
  }

  /* ========================================================
     5. 相机动画与场景过渡
     --------------------------------------------------------
     使用平滑插值实现相机位置、目标点、背景色的过渡。
  ======================================================== */
  let transitionStartTime = 0;
  let transitionDuration = 2000; // 毫秒
  let fromCameraPos = new THREE.Vector3();
  let toCameraPos = new THREE.Vector3();
  let fromCameraTarget = new THREE.Vector3();
  let toCameraTarget = new THREE.Vector3();
  let fromBgColor = new THREE.Color();
  let toBgColor = new THREE.Color();
  let fromFogColor = new THREE.Color();
  let toFogColor = new THREE.Color();

  function switchToEra(eraIndex) {
    if (isTransitioning || eraIndex === currentEra || eraIndex < 0 || eraIndex >= ERAS.length) return;

    isTransitioning = true;
    const fromEra = ERAS[currentEra];
    const toEra = ERAS[eraIndex];
    currentEra = eraIndex;
    transitionStartTime = performance.now();

    // 记录起始状态
    fromCameraPos.copy(camera.position);
    toCameraPos.copy(toEra.cameraPos);
    toCameraPos.x += eraIndex * 60; // 偏移到对应时代位置
    fromCameraTarget.copy(orbitControls.target);
    toCameraTarget.copy(toEra.cameraTarget);
    toCameraTarget.x += eraIndex * 60;

    fromBgColor.copy(scene.background);
    toBgColor.setHex(toEra.bgColor);
    fromFogColor.copy(scene.fog.color);
    toFogColor.setHex(toEra.fogColor);

    // 更新 UI
    updateEraUI(eraIndex);
    updateTimelineUI(eraIndex);

    // 更新光照
    mainLight.color.setHex(toEra.lightColor);
    ambientLight.color.setHex(toEra.lightColor);

    // 过渡结束后重新初始化轨道控制器的球坐标
    setTimeout(function () {
      orbitControls.target.copy(toCameraTarget);
      const offset = new THREE.Vector3().subVectors(toCameraPos, toCameraTarget);
      orbitControls.spherical.setFromVector3(offset);
      isTransitioning = false;
    }, transitionDuration);
  }

  function updateTransition(now) {
    if (!isTransitioning) return;

    const elapsed = now - transitionStartTime;
    const t = Math.min(elapsed / transitionDuration, 1);
    const eased = easeInOutCubic(t);

    // 插值相机位置
    camera.position.lerpVectors(fromCameraPos, toCameraPos, eased);

    // 插值目标点
    orbitControls.target.lerpVectors(fromCameraTarget, toCameraTarget, eased);
    camera.lookAt(orbitControls.target);

    // 插值背景色
    scene.background.lerpColors(fromBgColor, toBgColor, eased);
    scene.fog.color.lerpColors(fromFogColor, toFogColor, eased);

    // 插值环境光强度
    ambientLight.intensity = lerp(ERAS[currentEra - (t < 1 ? 1 : 0)].ambientIntensity, ERAS[currentEra].ambientIntensity, eased);
  }

  /* ========================================================
     6. 时间轴 UI 交互
  ======================================================== */
  function updateEraUI(index) {
    const info = $('#eraInfo');
    const era = ERAS[index];

    // 淡出
    info.classList.add('transitioning');

    setTimeout(function () {
      $('#eraBadge').textContent = String(index + 1).padStart(2, '0');
      $('#eraTitle').textContent = era.title;
      $('#eraDesc').textContent = era.desc;
      $('#eraYear').textContent = era.year;

      // 淡入
      info.classList.remove('transitioning');
    }, 300);
  }

  function updateTimelineUI(index) {
    const nodes = $$('.timeline-node');
    const progress = $('#timelineProgress');

    nodes.forEach(function (node, i) {
      node.classList.toggle('active', i === index);
    });

    // 进度条宽度：0%, 25%, 50%, 75%, 100%
    progress.style.width = (index / (ERAS.length - 1) * 100) + '%';
  }

  function initTimelineControls() {
    const nodes = $$('.timeline-node');
    nodes.forEach(function (node) {
      node.addEventListener('click', function () {
        const eraIndex = parseInt(node.dataset.era, 10);
        switchToEra(eraIndex);
      });
    });
  }

  /* ========================================================
     7. 滚动 / 拖拽 / 滑动导航
     --------------------------------------------------------
     - 桌面：鼠标滚轮切换时代
     - 移动端：左右滑动手势切换时代
     - 同时支持键盘方向键
  ======================================================== */
  function initNavigation() {
    let scrollAccumulated = 0;
    const scrollThreshold = 80;
    let scrollTimeout = null;

    // 滚轮导航
    window.addEventListener('wheel', function (e) {
      if (isTransitioning) return;
      scrollAccumulated += e.deltaY;

      if (Math.abs(scrollAccumulated) > scrollThreshold) {
        if (scrollAccumulated > 0) {
          switchToEra(Math.min(currentEra + 1, ERAS.length - 1));
        } else {
          switchToEra(Math.max(currentEra - 1, 0));
        }
        scrollAccumulated = 0;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () {
        scrollAccumulated = 0;
      }, 300);
    }, { passive: true });

    // 触摸滑动导航
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      if (isTransitioning) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const dt = Date.now() - touchStartTime;

      // 水平滑动，且滑动距离足够，且时间较短（快速滑动）
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60 && dt < 500) {
        if (dx < 0) {
          switchToEra(Math.min(currentEra + 1, ERAS.length - 1));
        } else {
          switchToEra(Math.max(currentEra - 1, 0));
        }

        // 显示滑动提示
        showSwipeHint(dx < 0 ? '👈' : '👉');
      }
    }, { passive: true });

    // 键盘导航
    window.addEventListener('keydown', function (e) {
      if (isTransitioning) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        switchToEra(Math.min(currentEra + 1, ERAS.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        switchToEra(Math.max(currentEra - 1, 0));
      }
    });
  }

  // 滑动提示
  function showSwipeHint(icon) {
    const hint = $('#swipeHint');
    hint.innerHTML = '<span>' + icon + '</span>';
    hint.classList.add('show');
    setTimeout(function () {
      hint.classList.remove('show');
    }, 600);
  }

  /* ========================================================
     8. 动画循环
  ======================================================== */
  function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // 更新过渡动画
    updateTransition(performance.now());

    // 更新轨道控制器
    if (!isTransitioning) {
      orbitControls.update();
    }

    // 更新当前时代的动画
    const currentGroup = eraGroups[currentEra];
    if (currentGroup && currentGroup.userData.animate) {
      currentGroup.userData.animate(time);
    }

    // 渲染
    renderer.render(scene, camera);
  }

  /* ========================================================
     9. 窗口 resize 处理
  ======================================================== */
  function initResizeHandler() {
    window.addEventListener('resize', function () {
      const container = $('#canvas-container');
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
  }

  /* ========================================================
     10. 加载完成后隐藏加载层
  ======================================================== */
  function hideLoading() {
    setTimeout(function () {
      const loading = $('#loading');
      if (loading) loading.classList.add('hidden');

      // 3 秒后淡出操作提示
      setTimeout(function () {
        const hint = $('#controlsHint');
        if (hint) hint.classList.add('fade-out');
      }, 3000);
    }, 800);
  }

  /* ========================================================
     入口：初始化所有模块
  ======================================================== */
  function init() {
    initScene();
    initLighting();
    buildAllEras();
    initOrbitControls();
    initTimelineControls();
    initNavigation();
    initResizeHandler();

    // 初始化 UI
    updateEraUI(0);
    updateTimelineUI(0);

    // 启动动画循环
    animate();

    // 隐藏加载层
    hideLoading();
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
