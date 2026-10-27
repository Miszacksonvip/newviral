const STORAGE_KEY = 'galeri-iklan-saya-v1';
const starterAds = [
  { id: 'sample-1', title: 'Ide kreatif untuk promosi produk', views: '6.831', palette: 1 },
  { id: 'sample-2', title: 'Cerita singkat di balik brand lokal', views: '1.874', palette: 2 },
  { id: 'sample-3', title: 'Kenali produk favorit minggu ini', views: '1.276', palette: 3 },
  { id: 'sample-4', title: 'Tips membuat konten yang menarik', views: '1.153', palette: 4 },
  { id: 'sample-5', title: 'Inspirasi untuk usaha kreatif', views: '916', palette: 5 },
  { id: 'sample-6', title: 'Promo spesial untuk pelanggan', views: '927', palette: 2 },
  { id: 'sample-7', title: 'Kisah pelanggan dan produk pilihan', views: '825', palette: 3 },
  { id: 'sample-8', title: 'Iklan terbaru untuk bisnis Anda', views: '685', palette: 1 },
  { id: 'sample-9', title: 'Koleksi dan penawaran terbaru', views: '663', palette: 4 }
];

const grid = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');
const dialog = document.getElementById('adDialog');
const form = document.getElementById('adForm');
const mainVideo = document.getElementById('mainVideo');
const playerArt = document.getElementById('playerArt');
const playerOverlay = document.getElementById('playerOverlay');
const featuredTitle = document.getElementById('featuredTitle');
const featuredViews = document.getElementById('featuredViews');
const videoControls = document.getElementById('videoControls');
const videoTimeline = document.getElementById('videoTimeline');
const currentTimeLabel = document.getElementById('currentTime');
const videoDurationLabel = document.getElementById('videoDuration');
const controlPlay = document.getElementById('controlPlay');
const controlMute = document.getElementById('controlMute');
const toast = document.getElementById('toast');
let savedAds = loadAds();
let currentAd = null;
let destinationOpened = false;
let currentFilter = 'all';
let toastTimer;

function loadAds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(ad => ad && typeof ad.title === 'string' && typeof ad.url === 'string') : [];
  } catch {
    return [];
  }
}

function persistAds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAds.filter(ad => !ad.localOnly)));
    return true;
  } catch {
    showToast('Penyimpanan browser penuh atau tidak tersedia.');
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function updateVideoControls() {
  const duration = mainVideo.duration;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  videoTimeline.disabled = !hasDuration;
  videoTimeline.value = hasDuration ? String(Math.round((mainVideo.currentTime / duration) * 1000)) : '0';
  currentTimeLabel.textContent = formatTime(mainVideo.currentTime);
  videoDurationLabel.textContent = formatTime(duration);
  controlPlay.textContent = mainVideo.paused ? '▶' : 'Ⅱ';
  controlPlay.setAttribute('aria-label', mainVideo.paused ? 'Putar video' : 'Jeda video');
  controlMute.textContent = mainVideo.muted ? '×' : '♫';
  controlMute.setAttribute('aria-label', mainVideo.muted ? 'Nyalakan suara' : 'Matikan suara');
}

function getAdUrls(ad) {
  const destinationUrl = ad.adsterraUrl || ad.shopeeUrl || ad.destinationUrl;
  return destinationUrl ? [destinationUrl] : [];
}

function openAdUrls(urls) {
  urls.forEach(url => window.open(url, '_blank', 'noopener,noreferrer'));
}

function makeThumbnail(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      image.onload = () => {
        const scale = Math.min(1, 800 / image.width, 450 / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderCards() {
  const ads = currentFilter === 'saved' ? savedAds : [...savedAds, ...starterAds];
  grid.replaceChildren();
  emptyState.hidden = ads.length > 0;

  ads.forEach((ad, index) => {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Putar ${ad.title}`);

    const art = document.createElement('div');
    art.className = `card-art palette-${ad.palette || ((index % 5) + 1)}`;
    art.setAttribute('aria-hidden', 'true');
    if (ad.thumbnail) {
      const thumbnail = document.createElement('img');
      thumbnail.className = 'card-thumbnail';
      thumbnail.src = ad.thumbnail;
      thumbnail.alt = '';
      art.append(thumbnail);
    }
    const play = document.createElement('span');
    play.className = 'card-play';
    play.textContent = '▶';
    art.append(play);

    const views = document.createElement('span');
    views.className = 'card-views';
    views.textContent = `◉ ${ad.views || '0'}`;
    art.append(views);

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = ad.title;
    card.append(art, title);

    if (ad.url) {
      card.addEventListener('click', () => selectAd(ad));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAd(ad);
        }
      });
      const remove = document.createElement('button');
      remove.className = 'card-delete';
      remove.type = 'button';
      remove.textContent = 'Hapus iklan';
      remove.setAttribute('aria-label', `Hapus ${ad.title}`);
      remove.addEventListener('click', event => {
        event.stopPropagation();
        savedAds = savedAds.filter(item => item.id !== ad.id);
        if (currentAd && currentAd.id === ad.id) resetFeatured();
        if (persistAds()) {
          renderCards();
          showToast('Iklan dihapus dari browser ini.');
        }
      });
      card.append(remove);
    }
    grid.append(card);
  });
}

function selectAd(ad) {
  currentAd = ad;
  destinationOpened = false;
  seekAdOpened = false;
  document.getElementById('player').classList.remove('is-portrait');
  featuredTitle.textContent = ad.title;
  featuredViews.textContent = ad.views || '0';
  mainVideo.src = ad.url;
  mainVideo.hidden = false;
  videoControls.hidden = false;
  playerArt.hidden = true;
  playerOverlay.hidden = false;
  updateVideoControls();
  document.getElementById('playFeatured').textContent = '▶';
  document.getElementById('playFeatured').setAttribute('aria-label', 'Putar video');
  mainVideo.load();
  document.querySelector('.featured').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFeatured() {
  currentAd = null;
  destinationOpened = false;
  document.getElementById('player').classList.remove('is-portrait');
  featuredTitle.textContent = 'Tempat iklan pilihan Anda';
  featuredViews.textContent = '0';
  mainVideo.pause();
  mainVideo.removeAttribute('src');
  mainVideo.load();
  mainVideo.hidden = true;
  videoControls.hidden = true;
  videoTimeline.disabled = true;
  playerArt.hidden = false;
  playerOverlay.hidden = false;
}

document.getElementById('openForm').addEventListener('click', () => dialog.showModal());
document.getElementById('closeForm').addEventListener('click', () => dialog.close());
document.getElementById('cancelForm').addEventListener('click', () => dialog.close());
const playFeatured = document.getElementById('playFeatured');
playFeatured.addEventListener('click', () => {
  if (!currentAd) {
    showToast('Tambahkan iklan dengan URL video untuk mulai memutar.');
  } else if (mainVideo.paused) {
    const adUrls = getAdUrls(currentAd);
    if (adUrls.length && !destinationOpened) {
      destinationOpened = true;
      const selectedAd = currentAd;
      window.addEventListener('focus', () => {
        if (currentAd === selectedAd && mainVideo.paused) {
          mainVideo.play().catch(() => showToast('Video tidak dapat diputar. Periksa URL video Anda.'));
        }
      }, { once: true });
      openAdUrls(adUrls);
      showToast('Tautan iklan dibuka di tab baru. Kembali ke tab ini untuk menonton video.');
      return;
    }
    mainVideo.play().catch(() => showToast('Video tidak dapat diputar. Periksa URL video Anda.'));
  } else {
    mainVideo.pause();
  }
});

mainVideo.addEventListener('play', () => {
  playFeatured.textContent = 'Ⅱ';
  playFeatured.setAttribute('aria-label', 'Jeda video');
  playerOverlay.hidden = true;
  updateVideoControls();
});
mainVideo.addEventListener('pause', () => {
  playFeatured.textContent = '▶';
  playFeatured.setAttribute('aria-label', 'Putar video');
  if (currentAd) playerOverlay.hidden = false;
  updateVideoControls();
});
mainVideo.addEventListener('timeupdate', updateVideoControls);
mainVideo.addEventListener('loadedmetadata', () => {
  document.getElementById('player').classList.toggle('is-portrait', mainVideo.videoHeight > mainVideo.videoWidth);
  updateVideoControls();
});
mainVideo.addEventListener('durationchange', updateVideoControls);
mainVideo.addEventListener('volumechange', updateVideoControls);
mainVideo.addEventListener('ended', updateVideoControls);

controlPlay.addEventListener('click', () => playFeatured.click());
controlMute.addEventListener('click', () => {
  mainVideo.muted = !mainVideo.muted;
});
videoTimeline.addEventListener('change', () => {
  if (Number.isFinite(mainVideo.duration)) {
    mainVideo.currentTime = (Number(videoTimeline.value) / 1000) * mainVideo.duration;
  }
});
document.getElementById('controlFullscreen').addEventListener('click', () => {
  const player = document.getElementById('player');
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (player.requestFullscreen) {
    player.requestFullscreen();
  }
});

let seekAdOpened = false;
mainVideo.addEventListener('seeking', () => {
  if (!currentAd || !getAdUrls(currentAd).length || seekAdOpened) return;
  seekAdOpened = true;

  const selectedAd = currentAd;
  const resumeVideo = !mainVideo.paused;
  if (resumeVideo) mainVideo.pause();
  window.addEventListener('focus', () => {
    if (currentAd === selectedAd && resumeVideo && mainVideo.paused) {
      mainVideo.play().catch(() => showToast('Video tidak dapat diputar. Tekan tombol Play untuk melanjutkan.'));
    }
  }, { once: true });
  openAdUrls(getAdUrls(selectedAd));
  showToast('Tautan iklan dibuka di tab baru. Kembali ke tab ini untuk melanjutkan video.');
});
mainVideo.addEventListener('seeked', () => {
  seekAdOpened = false;
});

document.getElementById('saveFeatured').addEventListener('click', () => {
  if (!currentAd) {
    dialog.showModal();
    return;
  }
  if (savedAds.some(ad => ad.id === currentAd.id)) {
    showToast('Iklan ini sudah tersimpan di Iklan saya.');
    return;
  }
  savedAds.unshift(currentAd);
  if (persistAds()) {
    renderCards();
    showToast('Iklan berhasil disimpan di browser ini.');
  }
});

document.querySelectorAll('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
    renderCards();
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const error = document.getElementById('formError');
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const url = String(data.get('url') || '').trim();
  const videoFile = data.get('videoFile');
  const hasVideoFile = videoFile instanceof File && videoFile.size > 0;
  const thumbnailFile = data.get('thumbnailFile');
  const hasThumbnailFile = thumbnailFile instanceof File && thumbnailFile.size > 0;
  const adsterraUrl = String(data.get('adsterraUrl') || '').trim();
  const shopeeUrl = String(data.get('shopeeUrl') || '').trim();
  const description = String(data.get('description') || '').trim();
  error.hidden = true;

  for (const [label, adUrl] of [['Adsterra', adsterraUrl], ['Shopee', shopeeUrl]]) {
    if (!adUrl) continue;
    try {
      const parsedAdUrl = new URL(adUrl);
      if (!['http:', 'https:'].includes(parsedAdUrl.protocol)) throw new Error('protocol');
    } catch {
      error.textContent = `Masukkan URL ${label} yang valid dengan awalan http:// atau https://.`;
      error.hidden = false;
      return;
    }
  }

  if (!hasVideoFile) {
    try {
      if (!url) throw new Error('missing');
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('protocol');
    } catch {
      error.textContent = 'Masukkan URL video yang valid atau pilih file video dari komputer.';
      error.hidden = false;
      return;
    }
  }

  let thumbnail = '';
  if (hasThumbnailFile) {
    try {
      if (!thumbnailFile.type.startsWith('image/')) throw new Error('format');
      thumbnail = await makeThumbnail(thumbnailFile);
    } catch {
      error.textContent = 'Gambar thumbnail tidak dapat dibaca. Pilih file gambar yang valid.';
      error.hidden = false;
      return;
    }
  }

  const ad = {
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    url: hasVideoFile ? URL.createObjectURL(videoFile) : url,
    adsterraUrl,
    shopeeUrl,
    description,
    thumbnail,
    views: '0',
    palette: (savedAds.length % 5) + 1,
    ...(hasVideoFile ? { localOnly: true } : {})
  };
  savedAds.unshift(ad);
  if (!hasVideoFile && !persistAds()) {
    savedAds.shift();
    return;
  }

  form.reset();
  dialog.close();
  currentFilter = 'saved';
  document.querySelectorAll('.filter-button').forEach(button => button.classList.toggle('active', button.dataset.filter === 'saved'));
  renderCards();
  selectAd(ad);
  showToast(hasVideoFile
    ? 'Video lokal ditambahkan. Video hanya tersedia selama halaman ini terbuka.'
    : 'Iklan berhasil disimpan di browser ini.');
});

renderCards();
