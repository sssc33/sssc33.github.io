/* ============================================================
   main.js — 个人主页交互脚本
   ============================================================
   功能模块：
     1.  移动端汉堡菜单切换
     2.  点击导航链接后自动收起菜单
     3.  滚动监听：自动高亮当前可视区块对应的导航项
     4.  页脚年份自动更新

   扩展提示：
     - 新增交互逻辑时，按模块编号续写即可。
     - 所有 DOM 操作在 DOMContentLoaded 后执行（配合 script defer 更保险）。
============================================================ */

(function () {
  'use strict';

  /* ========================================================
     0. 工具函数：DOM 选择器简写
  ======================================================== */
  const $  = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  /* ========================================================
     1. 移动端汉堡菜单切换
     --------------------------------------------------------
     点击汉堡按钮 → 切换 .nav-menu 的 .open 类（显示/隐藏）。
     同时更新 aria-expanded 属性，保证无障碍可访问性。
  ======================================================== */
  function initNavToggle() {
    const toggle = $('#navToggle');
    const menu   = $('#navMenu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ========================================================
     2. 点击导航链接后收起菜单
     --------------------------------------------------------
     移动端点击链接跳转到锚点后，自动收起下拉菜单，
     避免菜单遮盖内容。
  ======================================================== */
  function initNavLinkClose() {
    const menu  = $('#navMenu');
    const links = $$('.nav-link');

    if (!menu || !links.length) return;

    links.forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('open');
        const toggle = $('#navToggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ========================================================
     3. 滚动监听：自动高亮当前区块的导航项
     --------------------------------------------------------
     原理：使用 IntersectionObserver 监听各 <section> 是否
     进入视口。当某个 section 可见时，把对应的导航链接标记
     为 .active，移除其他链接的 .active。
     注：外部页面链接（如 timeline.html）不参与滚动高亮。
  ======================================================== */
  function initScrollSpy() {
    const sections = $$('main section[id]');
    const navLinks = $$('.nav-link');

    if (!sections.length || !navLinks.length) return;

    // 配置：区块进入视口中段时触发
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const currentId = entry.target.id;

            // 移除所有导航项的 active 类（仅移除锚点链接）
            navLinks.forEach(function (link) {
              if (link.getAttribute('href').startsWith('#')) {
                link.classList.remove('active');
              }
            });

            // 给当前区块对应的导航链接添加 active 类
            const activeLink = $(`.nav-link[href="#${currentId}"]`);
            if (activeLink) activeLink.classList.add('active');
          }
        });
      },
      {
        // 触发阈值：区块有 50% 可见时触发
        threshold: 0.5,
        rootMargin: '-64px 0px 0px 0px' // 顶部偏移：补偿导航栏高度
      }
    );

    // 对每个 section 注册观察
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ========================================================
     4. 页脚年份自动更新
     --------------------------------------------------------
     将页脚中的年份占位元素设为当前年份。
  ======================================================== */
  function initYearUpdate() {
    const yearEl = $('#year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  /* ========================================================
     入口：DOM 就绪后初始化所有模块
  ======================================================== */
  function init() {
    initNavToggle();
    initNavLinkClose();
    initScrollSpy();
    initYearUpdate();
  }

  // 配合 <script defer>，DOM 已解析完毕；再加一层保险
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
