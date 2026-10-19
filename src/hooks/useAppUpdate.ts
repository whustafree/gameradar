import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { parseVersion, isNewer, formatVersion } from '../utils/version';

const RELEASES_API = 'https://api.github.com/repos/whustafree/gameradar/releases/latest';
const CHECK_KEY = 'grd_update_check_v1';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // no golpear la API de GitHub más de 6h

export interface AppUpdate {
  currentVersion: string;
  latestVersion: string;
  apkUrl: string;
  notes: string;
}



interface CachedCheck {
  at: number;
  latestVersion: string;
  apkUrl: string;
  notes: string;
}

function readCache(): CachedCheck | null {
  try {
    const raw = localStorage.getItem(CHECK_KEY);
    return raw ? (JSON.parse(raw) as CachedCheck) : null;
  } catch {
    return null;
  }
}

function writeCache(data: CachedCheck) {
  try {
    localStorage.setItem(CHECK_KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento disponible */
  }
}

/**
 * Comprueba si hay una versión nueva del APK en GitHub Releases.
 *
 * El APK se distribuye fuera de Play Store, así que no hay actualización
 * automática del sistema: se avisa al usuario y se abre la descarga en el
 * navegador (instalar sigue requiriendo su confirmación).
 */
export function useAppUpdate() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);

  const check = useCallback(async (force = false) => {
    if (!Capacitor.isNativePlatform()) return; // en web lo gestiona el service worker
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);

    try {
      const info = await CapacitorApp.getInfo();
      const currentVersion = info.version;
      const current = parseVersion(currentVersion);

      const cached = readCache();
      const cacheFresh = cached && Date.now() - cached.at < CHECK_INTERVAL;

      let data: { latestVersion: string; apkUrl: string; notes: string };

      if (cached && cacheFresh && !force) {
        data = cached;
      } else {
        const res = await fetch(RELEASES_API, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) throw new Error(`GitHub ${res.status}`);

        const release = await res.json();
        const latestVersion = String(release.tag_name || '').replace(/^v/, '');

        // Asset del APK firmado (no el debug ni el .aab)
        const assets: { name: string; browser_download_url: string }[] = release.assets || [];
        const apkAsset =
          assets.find(a => /-release\.apk$/i.test(a.name)) ||
          assets.find(a => /\.apk$/i.test(a.name));

        if (!apkAsset) throw new Error('El release no tiene APK');

        data = {
          latestVersion,
          apkUrl: apkAsset.browser_download_url,
          notes: String(release.body || '').slice(0, 400),
        };

        writeCache({ at: Date.now(), ...data });
      }

      if (isNewer(parseVersion(data.latestVersion), current)) {
        setUpdate({
          currentVersion,
          latestVersion: formatVersion(parseVersion(data.latestVersion)) || data.latestVersion,
          apkUrl: data.apkUrl,
          notes: data.notes,
        });
        setDismissed(false);
      } else {
        setUpdate(null);
      }
    } catch (err) {
      // Sin red o API limitada: no molestamos al usuario
      console.warn('[update] no se pudo comprobar la versión:', err);
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  }, []);

  // Comprobar al arrancar y al volver del segundo plano
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    check();

    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) check();
    });

    return () => { listener.then(l => l.remove()).catch(() => {}); };
  }, [check]);

  const openDownload = useCallback(async () => {
    if (!update) return;
    try {
      await Browser.open({ url: update.apkUrl });
    } catch {
      window.open(update.apkUrl, '_blank', 'noopener,noreferrer');
    }
  }, [update]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { update, dismissed, dismiss, checking, check, openDownload };
}
