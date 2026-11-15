const photos = [
  { src: 'images/P1045650.jpg', alt: 'Fotografie von noan attila 01' },
  { src: 'images/P1045701.jpg', alt: 'Fotografie von noan attila 02' },
  { src: 'images/P1045704.jpg', alt: 'Fotografie von noan attila 03' },
  { src: 'images/P1045727.jpg', alt: 'Fotografie von noan attila 04' },
  { src: 'images/P1045761.jpg', alt: 'Fotografie von noan attila 05' },
  { src: 'images/P1045769.jpg', alt: 'Fotografie von noan attila 06' },
  { src: 'images/P1045834.jpg', alt: 'Fotografie von noan attila 07' },
];

const yearElements = document.querySelectorAll('.js-year');
yearElements.forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const gallery = document.getElementById('gallery');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const closeBtn = document.getElementById('lightboxClose');
const prevBtn = document.getElementById('lightboxPrev');
const nextBtn = document.getElementById('lightboxNext');

let currentIndex = 0;
let lastFocusedElement = null;

function showImage(index) {
  const photo = photos[index];
  if (!photo || !lightboxImg) return;

  lightboxImg.style.opacity = '0';
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.alt;

  if (lightboxImg.complete) {
    lightboxImg.style.opacity = '1';
  } else {
    lightboxImg.onload = () => {
      lightboxImg.style.opacity = '1';
    };
  }
}

function openLightbox(index) {
  if (!lightbox) return;

  currentIndex = index;
  lastFocusedElement = document.activeElement;
  showImage(currentIndex);
  lightbox.removeAttribute('hidden');
  document.body.classList.add('is-lightbox-open');

  requestAnimationFrame(() => {
    lightbox.classList.add('is-active');
    closeBtn?.focus();
  });
}

function closeLightbox() {
  if (!lightbox) return;

  lightbox.classList.remove('is-active');
  document.body.classList.remove('is-lightbox-open');

  let closed = false;
  const finishClose = () => {
    if (closed) return;
    closed = true;
    lightbox.setAttribute('hidden', '');
    if (lightboxImg) {
      lightboxImg.removeAttribute('src');
      lightboxImg.alt = '';
    }
    lastFocusedElement?.focus();
  };

  lightbox.addEventListener('transitionend', finishClose, { once: true });
  window.setTimeout(finishClose, 350);
}

function showPrev() {
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  showImage(currentIndex);
}

function showNext() {
  currentIndex = (currentIndex + 1) % photos.length;
  showImage(currentIndex);
}

if (gallery && lightbox && lightboxImg) {
  photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.className = 'gallery-item';
    button.type = 'button';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Bild ${index + 1} vergroessert anzeigen`);

    const image = document.createElement('img');
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = index < 3 ? 'eager' : 'lazy';
    image.decoding = 'async';

    button.appendChild(image);
    button.addEventListener('click', () => openLightbox(index));
    gallery.appendChild(button);
  });

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', showPrev);
  nextBtn?.addEventListener('click', showNext);

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.hasAttribute('hidden')) return;

    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showPrev();
    if (event.key === 'ArrowRight') showNext();
  });

  let touchStartX = 0;

  lightbox.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (event) => {
    const diff = touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    diff > 0 ? showNext() : showPrev();
  }, { passive: true });
}
