(() => {
  'use strict';
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '展开导航');
    }));
  }
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const cards = [...document.querySelectorAll('.project-card')];
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      const chosen = button.dataset.filter;
      let count = 0;
      cards.forEach(card => {
        card.hidden = chosen !== 'all' && card.dataset.category !== chosen;
        if (!card.hidden) count++;
      });
      const status = document.getElementById('filterStatus');
      if (status) status.textContent = `显示${count}组作品`;
    });
  });
  const dialog = document.getElementById('lightbox');
  if (dialog) {
    const image = document.getElementById('lightboxImage');
    const caption = document.getElementById('lightboxCaption');
    document.querySelectorAll('.zoom-image').forEach(button => {
      button.addEventListener('click', () => {
        image.src = button.dataset.image;
        image.alt = button.dataset.caption;
        caption.textContent = button.dataset.caption;
        dialog.showModal();
        dialog.scrollTop = 0;
        document.body.classList.add('modal-open');
      });
    });
    document.getElementById('closeLightbox').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  }
})();
