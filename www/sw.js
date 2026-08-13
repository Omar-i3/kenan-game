/**
 * Service Worker for الوحش كنان (Monster Kenan) PWA
 * Cache-First strategy for offline gameplay support
 */

const CACHE_NAME = 'monster-kenan-v1';

// All files to cache for offline play
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',

  // JavaScript
  './js/audio.js',
  './js/audio_effects.js',
  './js/haptics.js',
  './js/joystick.js',
  './js/entities.js',
  './js/game.js',

  // Images
  './icon.png',
  './kenan.png',
  './assets/player.png',
  './assets/item_candy.png',
  './assets/item_juice.png',
  './assets/item_key.png',
  './assets/item_slipper.png',
  './assets/item_sprinkler.png',
  './assets/item_switch.png',
  './assets/item_wire.png',
  './assets/obstacle_crate.png',
  './assets/obstacle_crystal.png',
  './assets/obstacle_door.png',
  './assets/speed_pad.png',

  // Level Backgrounds
  './Level/bg_stage1.png',
  './Level/bg_stage2.png',
  './Level/bg_stage3.png',
  './Level/bg_stage4.png',
  './Level/bg_stage5.png',
  './Level/bg_stage6.png',
  './Level/bg_stage7.png',
  './Level/bg_stage8.png',
  './Level/bg_stage9.png',
  './Level/bg_stage10.png',

  // Audio — Root files
  './3ooo.mp3',
  './w7sh.mp3',
  './kenan_hit.mp3',
  './kenan_dead.mp3',
  './voice_warak.mp3',
  './voice_ray7.mp3',
  './voice_jwal.mp3',
  './voice_mafer.mp3',
  './voice_jayak.mp3',
  './voice_wagaf.mp3',
  './voice_assabt.mp3',
  './voice_sadtak.mp3',
  './voice_akaltak.mp3',

  // PWA Icons
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',

  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@500;800;900&display=swap'
];

// Install: Cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each file individually to avoid one failure breaking everything
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache: ${url}`, err.message);
          })
        )
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-First, then Network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses for future use
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, return offline fallback for HTML
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
