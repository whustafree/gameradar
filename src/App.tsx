import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Mode, SortMode, Genre, TypeFilter, StoreFilter, ViewMode, Language, Game, LicenseFilter, Theme, AccentColor } from './types';
import { t } from './i18n';
import { parsePrice, vibrate, getSeasonalTheme, playSound } from './utils/format';
import { loadViewMode, saveViewMode, loadLanguage, saveLanguage, loadLastVisit, saveLastVisit, loadNewGameIds, saveNewGameIds, loadTheme, saveTheme, loadAccentColor, saveAccentColor, loadFilterPresets, saveFilterPresets, FilterPreset, addFilterPreset, removeFilterPreset } from './utils/storage';

import { useGames } from './hooks/useGames';
import { useFilters } from './hooks/useFilters';
import Header from './components/Header';

import GameGrid from './components/GameGrid';
import SkeletonGrid from './components/SkeletonGrid';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import ToastContainer, { showToast } from './components/Toast';
import BottomNav from './components/BottomNav';
import GameCard from './components/GameCard';
import GameDetail from './components/GameDetail';
import Onboarding from './components/Onboarding';
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
import TrendingSection from './components/TrendingSection';
import FilterPanel from './components/FilterPanel';
import ActiveFiltersBar from './components/ActiveFiltersBar';
import SplashScreen from './components/SplashScreen';

const ITEMS_PER_PAGE = 20;

// Confetti characters
function createConfetti() {
  const emojis = ['🎉', '🎊', '✨', '⭐', '💫', '🏆', '🎮', '🔥', '🎁', '💎'];
  const container = document.createElement('div');
  container.className = 'confetti-overlay';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';

  for (let i = 0; i < 30; i++) {
    const el = document.createElement('span');
    el.textContent = emojis[i % emojis.length];
    el.style.position = 'absolute';
    el.style.left = Math.random() * 100 + '%';
    el.style.top = '-5%';
    el.style.fontSize = (12 + Math.random() * 20) + 'px';
    el.style.animation = `confettiFall ${1.5 + Math.random() * 2}s ease-in forwards`;
    el.style.animationDelay = Math.random() * 0.5 + 's';
    el.style.opacity = '0.8 + ' + (Math.random() * 0.2);
    container.appendChild(el);
  }

  // Inject keyframes
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

export default function App() {
  const {
    games, viewedGames,
    votes, reactions, wishlist, userStats,
    collections, activityLog, achievements, onboardingStep,
    lastUpdated, isLoading, error,
    visibleGamesCount, savings, deepLinkedGame, clearDeepLinked,
    loadGames, markAsViewed,
    handleVote, handleReaction,
    handleToggleWishlist, handleMarkClaimed,
    createCollection, deleteCollection, addToCollection, removeFromCollection,
    completeOnboarding, skipOnboarding,
  } = useGames();

  // --- State ---
  const [currentMode, setCurrentMode] = useState<Mode>('pc');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeGenre, setActiveGenre] = useState<Genre>('all');
  const [activeStore, setActiveStore] = useState<StoreFilter>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [activeLicense, setActiveLicense] = useState<LicenseFilter>('all');
  const [activeYear, setActiveYear] = useState('all');
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => loadFilterPresets());
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [newGameIds, setNewGameIds] = useState<string[]>(() => loadNewGameIds());
  const [lastVisit, setLastVisit] = useState<string | null>(() => loadLastVisit());

  // PWA update notification (after language declaration)
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then(reg => {
      if (cancelled) return;
      setSwRegistration(reg);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (cancelled) return;
              setSwUpdateAvailable(true);
              const msg = languageRef.current === 'es' ? '🔄 Nueva versión disponible' : '🔄 New version available';
              showToast(msg, 'info');
            }
          });
        }
      });
    });
    return () => { cancelled = true; };
  }, []); // Only register once

  const handleSWUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [swRegistration]);

  // Filter presets handlers (after language declaration)
  const handleSavePreset = useCallback(() => {
    const presets = loadFilterPresets();
    const name = language === 'es' ? `Filtro ${presets.length + 1}` : `Preset ${presets.length + 1}`;
    const icons = ['🎯', '🔥', '💎', '⭐', '🎮', '🕹️', '👾', '🎲', '🏆', '💿'];
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      icon: icons[presets.length % icons.length],
      sortMode, activeGenre, activeStore, activeType, activeLicense,
      showFavoritesOnly: false, searchTerm,
    };
    setFilterPresets(addFilterPreset(newPreset));
    showToast(language === 'es' ? '💾 Preset guardado' : '💾 Preset saved', 'success');
    vibrate(10);
  }, [language, sortMode, activeGenre, activeStore, activeType, activeLicense, searchTerm]);

  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    setSortMode(preset.sortMode as SortMode);
    setActiveGenre(preset.activeGenre as Genre);
    setActiveStore(preset.activeStore as StoreFilter);
    setActiveType(preset.activeType as TypeFilter);
    setActiveLicense(preset.activeLicense as LicenseFilter);
    // showFavoritesOnly removed from UI
    setSearchTerm(preset.searchTerm);
    showToast(`📋 ${preset.name} ${language === 'es' ? 'cargado' : 'loaded'}`, 'info');
    vibrate(8);
  }, [language]);

  const handleDeletePreset = useCallback((id: string) => {
    setFilterPresets(removeFilterPreset(id));
    showToast(language === 'es' ? '🗑️ Preset eliminado' : '🗑️ Preset deleted', 'info');
  }, [language]);

  // Theme & Accent Color
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = loadTheme();
    if (saved === 'dark' || saved === 'light' || saved === 'amoled') return saved;
    // Si no hay tema guardado, auto-detectar
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [accentColor, setAccentColor] = useState<AccentColor>(() => loadAccentColor());
  const [autoTheme, setAutoTheme] = useState(false);

  // Auto theme: escuchar prefers-color-scheme
  useEffect(() => {
    if (!autoTheme) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const theme: Theme = e.matches ? 'dark' : 'light';
      setCurrentTheme(theme);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [autoTheme]);

  const handleToggleAutoTheme = useCallback(() => {
    setAutoTheme(p => {
      if (!p) {
        // Activar auto: detectar y aplicar
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(prefersDark ? 'dark' : 'light');
        showToast(language === 'es' ? '🌗 Tema automático activado' : '🌗 Auto theme enabled', 'success');
      } else {
        showToast(language === 'es' ? 'Tema manual' : 'Manual theme', 'info');
      }
      return !p;
    });
    vibrate(6);
  }, [language]);

  // Apply theme, accent & seasonal theme to HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.setAttribute('data-accent', accentColor);
    const seasonal = getSeasonalTheme();
    if (seasonal) document.documentElement.setAttribute('data-seasonal', seasonal);
    else document.documentElement.removeAttribute('data-seasonal');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      if (currentTheme === 'amoled') metaTheme.setAttribute('content', '#000000');
      else if (currentTheme === 'light') metaTheme.setAttribute('content', '#f5f5f7');
      else metaTheme.setAttribute('content', '#0a0a0a');
    }
  }, [currentTheme, accentColor]);

  // Persist theme
  useEffect(() => { saveTheme(currentTheme); }, [currentTheme]);
  useEffect(() => { saveAccentColor(accentColor); }, [accentColor]);

  // Compact mode
  const [compactMode, setCompactMode] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('compact-mode', compactMode);
  }, [compactMode]);

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPWAInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = useCallback(() => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowPWAInstall(false);
    });
  }, [deferredPrompt]);

  const handleDismissPWA = useCallback(() => {
    setShowPWAInstall(false);
  }, []);

  // Modals
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Offline detection
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const goOnline = () => { setIsOffline(false); if (error) loadGames(); };
    const goOffline = () => { setIsOffline(true); showToast(t('offline', language), 'info'); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [language, error, loadGames]);

  // Filter panel toggle
  const handleToggleFilter = useCallback(() => {
    setIsFilterOpen(p => !p);
    vibrate(8);
    playSound('click');
  }, []);

  // Surprise me
  const [surpriseResult, setSurpriseResult] = useState<{ game: Game; reason: string } | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);

  // Multi-select
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  // Auto-hide nav on scroll
  const [navVisible, setNavVisible] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimer = useRef<number | null>(null);

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const [ptrState, setPtrState] = useState<'idle' | 'pulling' | 'loading'>('idle');
  const ptrStartY = useRef(0);
  const ptrCurrentY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  // Achievement toast
  const prevAchievementsRef = useRef(achievements);
  useEffect(() => {
    const prev = prevAchievementsRef.current;
    const newlyUnlocked = achievements.filter(a => a.unlockedAt && !prev.find(p => p.id === a.id)?.unlockedAt);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(a => {
        showToast(`🏆 ${t(a.id as any, language)}`, 'success');
        createConfetti();
      });
    }
    prevAchievementsRef.current = achievements;
  }, [achievements, language]);

  // Deep link
  useEffect(() => {
    if (deepLinkedGame) {
      setSelectedGame(deepLinkedGame);
      clearDeepLinked();
    }
  }, [deepLinkedGame, clearDeepLinked]);

  // --- New game detection ---
  useEffect(() => {
    if (!isLoading && !error && games.length > 0) {
      const now = new Date().toISOString();
      if (lastVisit) {
        const knownIds = loadNewGameIds();
        const currentIds = games.map(g => g.id);
        const trulyNew = currentIds.filter(id => !knownIds.includes(id));
        if (trulyNew.length > 0) {
          setNewGameIds(prev => [...new Set([...prev, ...trulyNew])]);
          saveNewGameIds([...new Set([...knownIds, ...trulyNew])]);
        }
      } else {
        const ids = games.map(g => g.id);
        setNewGameIds([]);
        saveNewGameIds(ids);
      }
      saveLastVisit(now);
      setLastVisit(now);
    }
  }, [isLoading, error, games, lastVisit]);

  // --- Persist ---
  useEffect(() => { saveViewMode(viewMode); }, [viewMode]);
  useEffect(() => { saveLanguage(language); }, [language]);

  // --- Debounce search ---
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // --- Filtered games ---
  const filteredGames = useFilters({
    games,
    currentMode, searchTerm: debouncedSearch, sortMode,
    activeGenre, activeStore, activeType, activeLicense, activeYear
  });

  // Sort by popularity (votes)
  let sortedFiltered = filteredGames;
  if (sortMode === 'popular') {
    sortedFiltered = [...filteredGames].sort((a, b) => {
      const aVotes = votes[a.id];
      const bVotes = votes[b.id];
      const aScore = aVotes ? aVotes.up - aVotes.down : 0;
      const bScore = bVotes ? bVotes.up - bVotes.down : 0;
      return bScore - aScore;
    });
  }



  // --- Game of the day ---
  const gameOfDay = useMemo(() => {
    if (sortedFiltered.length === 0) return null;
    const today = new Date();
    const daySeed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const idx = Math.abs(daySeed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % sortedFiltered.length;
    return sortedFiltered[idx];
  }, [sortedFiltered]);

  // --- Trending (most voted this session) ---
  const trendingGames = useMemo(() => {
    const withVotes = sortedFiltered
      .filter(g => {
        const v = votes[g.id];
        return v && (v.up + v.down) > 0;
      })
      .sort((a, b) => {
        const aVotes = votes[a.id];
        const bVotes = votes[b.id];
        const aScore = aVotes ? aVotes.up * 2 - aVotes.down : 0;
        const bScore = bVotes ? bVotes.up * 2 - bVotes.down : 0;
        return bScore - aScore;
      })
      .slice(0, 6);
    return withVotes;
  }, [sortedFiltered, votes]);



  // --- Ending soon (timeline) ---
  const endingSoonGames = useMemo(() => {
    return sortedFiltered
      .filter(g => g.endDate && new Date(g.endDate).getTime() > Date.now())
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
      .slice(0, 8);
  }, [sortedFiltered]);

  // --- Surprise me ---
  const handleSurpriseMe = useCallback(() => {
    const visible = sortedFiltered.filter(g => !viewedGames.includes(g.id));
    if (visible.length === 0) {
      showToast(t('surpriseEmpty', language), 'info');
      return;
    }
    const idx = Math.floor(Math.random() * visible.length);
    const game = visible[idx];
    const reasons = [
      `${t('surpriseReason', language)} su precio original es $${parsePrice(game.worth).toFixed(0)}`,
      `${t('surpriseReason', language)} está en ${game.platformName || game.platform}`,
      `${t('surpriseReason', language)} te encantará este género`,
      `${t('surpriseReason', language)} la comunidad lo recomienda`,
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    setSurpriseResult({ game, reason });
    setShowSurprise(true);
    setTimeout(() => {
      document.querySelector('.surprise-result-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [sortedFiltered, viewedGames, language]);

  // Infinite scroll
  const displayedGames = sortedFiltered.slice(0, displayCount);
  const hasMore = displayCount < sortedFiltered.length;

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedFiltered.length));
        }
      },
      { rootMargin: '200px' }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, [hasMore, sortedFiltered.length]);

  // --- Pull to refresh (mejorado, menos sensible) ---
  const ptrLockRef = useRef(false);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Solo activar si estamos exactamente en el top y no hay scroll
    if (mainRef.current && mainRef.current.scrollTop <= 0 && !ptrLockRef.current) {
      ptrStartY.current = e.touches[0].clientY;
      ptrCurrentY.current = e.touches[0].clientY;
      setPtrState('pulling');
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (ptrState === 'pulling') {
      ptrCurrentY.current = e.touches[0].clientY;
      // Resistencia: el indicador se mueve más lento que el dedo
      const diff = ptrCurrentY.current - ptrStartY.current;
      if (diff < 0) {
        // Scroll hacia arriba normal - cancelar PTR
        setPtrState('idle');
      }
    }
  }, [ptrState]);

  const handleTouchEnd = useCallback(() => {
    if (ptrState === 'pulling') {
      const diff = ptrCurrentY.current - ptrStartY.current;
      // Umbral más alto (120px) y Timeout para evitar refrescos accidentales
      if (diff > 120 && !ptrLockRef.current) {
        ptrLockRef.current = true;
        setPtrState('loading');
        loadGames().then(() => {
          setPtrState('idle');
          setDisplayCount(ITEMS_PER_PAGE);
          if (navigator.vibrate) navigator.vibrate(15);
          setTimeout(() => { ptrLockRef.current = false; }, 2000);
        });
      } else {
        setPtrState('idle');
      }
    }
  }, [ptrState, loadGames]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.addEventListener('touchstart', handleTouchStart, { passive: true });
    main.addEventListener('touchmove', handleTouchMove, { passive: true });
    main.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      main.removeEventListener('touchstart', handleTouchStart);
      main.removeEventListener('touchmove', handleTouchMove);
      main.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // --- Handlers ---
  const handleClearSearch = useCallback(() => setSearchTerm(''), []);

  // Refs for back gesture handler (avoid re-registering listener)
  const selectedGameRef = useRef(selectedGame);
  const showSettingsRef = useRef(showSettings);
  const multiSelectActiveRef = useRef(multiSelectActive);

  // Sync refs on every render for the back gesture handler
  selectedGameRef.current = selectedGame;
  showSettingsRef.current = showSettings;
  multiSelectActiveRef.current = multiSelectActive;

  const handleModeChange = useCallback((mode: Mode) => {
    setCurrentMode(mode);
    setActiveType('all');
    setActiveStore('all');
    setShowRecentOnly(false);
  }, []);

  const handleToggleRecent = useCallback(() => {
    setShowRecentOnly(p => {
      showToast(p ? (language === 'es' ? 'Mostrando todos' : 'Showing all') : (language === 'es' ? '🆕 Novedades activadas' : '🆕 Newest activated'), 'info');
      return !p;
    });
    vibrate(6);
  }, [language]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSortMode('default');
    setActiveGenre('all');
    setActiveStore('all');
    setActiveType('all');
    setActiveLicense('all');
    setShowRecentOnly(false);
    setActiveCollectionFilter(null);
    showToast(t('filtersReset', language), 'info');
  }, [language]);

  const handleMarkAsViewed = useCallback((id: string) => markAsViewed(id), [markAsViewed]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(p => p === 'grid' ? 'list' : 'grid');
  }, []);

  const handleToggleLang = useCallback(() => {
    setLanguage(p => p === 'es' ? 'en' : 'es');
  }, []);

  // Game detail
  const handleOpenDetail = useCallback((game: Game) => {
    setSelectedGame(game);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedGame(null);
  }, []);

  // Multi-select
  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectActive(p => {
      if (p) {
        setMultiSelectedIds([]);
        showToast(t('multiSelectOff', language), 'info');
      } else {
        showToast(t('multiSelectOn', language), 'info');
      }
      return !p;
    });
  }, [language]);

  const handleToggleMultiSelectGame = useCallback((id: string) => {
    setMultiSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  // Long press to trigger multi-select
  const mainLongPressTimer = useRef<number | null>(null);

  // Open specific collection in stats
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<string | null>(null);

  const handleOpenCollectionGames = useCallback((collection: import('./types').UserCollection) => {
    setShowSettings(false);
    setSearchTerm('');
    setActiveCollectionFilter(collection.id);
    // Can't directly filter by collection in the grid, but we'll use search to hint
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // --- Back gesture handler (Android native) - register once with refs ---
  useEffect(() => {
    let listenerHandle: any;
    const setup = async () => {
      listenerHandle = await CapacitorApp.addListener('backButton', () => {
        // Close modals in order of priority (using refs for fresh state)
        if (selectedGameRef.current) {
          handleCloseDetail();
        } else if (showSettingsRef.current) {
          handleCloseSettings();
        } else if (multiSelectActiveRef.current) {
          setMultiSelectActive(false);
          setMultiSelectedIds([]);
        } else {
          CapacitorApp.minimizeApp();
        }
      });
    };
    setup();
    return () => {
      // Clean up listener on unmount only
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, []); // Empty deps = register once, never re-register

  // --- Auto-hide nav & header on scroll (mobile native feel) ---
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    
    const handleScroll = () => {
      const currentY = main.scrollTop;
      if (currentY > 50 && currentY > lastScrollY.current) {
        // Scrolling down -> hide nav & header
        setNavVisible(false);
        setHeaderVisible(false);
      } else if (currentY < lastScrollY.current - 10 || currentY < 50) {
        // Scrolling up or at top -> show nav & header
        setNavVisible(true);
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
      
      // Show nav when scrolling up or at top
      if (currentY < 50) {
        setNavVisible(true);
        setHeaderVisible(true);
      }
    };
    
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // --- New games notification ---
  const [showNewGamesBanner, setShowNewGamesBanner] = useState(false);
  
  useEffect(() => {
    if (!isLoading && newGameIds.length > 0 && games.length > 0) {
      // Only show if there are genuinely new games since last visit
      if (lastVisit && newGameIds.length > 0) {
        setShowNewGamesBanner(true);
      }
    }
  }, [isLoading, newGameIds.length, games.length, lastVisit]);

  // --- Jump to top ---
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const handleScroll = () => {
      setShowJumpToTop(main.scrollTop > 600);
    };
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJumpToTop = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    vibrate(6);
  }, []);

  // --- Compact mode toggle button in sidebar ---
  const handleToggleCompact = useCallback(() => {
    setCompactMode(p => {
      showToast(p ? (language === 'es' ? 'Modo normal' : 'Normal mode') : (language === 'es' ? '📦 Modo compacto' : '📦 Compact mode'), 'info');
      return !p;
    });
    vibrate(6);
  }, [language]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const input = document.querySelector('.header-search input') as HTMLInputElement;
        if (input && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      }
      if (e.key === 'Escape') {
        setSelectedGame(null);
        setShowSettings(false);
        if (multiSelectActive) {
          setMultiSelectActive(false);
          setMultiSelectedIds([]);
        }
      }
      if (e.key === 'g' && e.ctrlKey) { e.preventDefault(); handleToggleViewMode(); }
      if (e.key === 'm' && e.ctrlKey) { e.preventDefault(); handleToggleMultiSelect(); }
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setIsFilterOpen(p => !p); }
      if (e.key === 's' && e.ctrlKey) { e.preventDefault(); setShowSurprise(p => !p); handleSurpriseMe(); }
      // Alt+1..0 to load filter presets
      if (e.altKey && /^[0-9]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        const presets = loadFilterPresets();
        if (presets[idx]) {
          e.preventDefault();
          handleLoadPreset(presets[idx]);
        }
      }
      // Alt+T to toggle auto theme
      if (e.altKey && e.key === 't') { e.preventDefault(); handleToggleAutoTheme(); }
      // Alt+C to toggle compact mode
      if (e.altKey && e.key === 'c') { e.preventDefault(); handleToggleCompact(); }
      // Arrow keys to navigate cards
      const cards = document.querySelectorAll<HTMLElement>('.game-card[data-id]');
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && cards.length > 0 && !selectedGame) {
        const focused = document.activeElement as HTMLElement;
        const currentIdx = Array.from(cards).indexOf(focused.closest('.game-card') as HTMLElement);
        let nextIdx = e.key === 'ArrowRight' ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0) nextIdx = cards.length - 1;
        if (nextIdx >= cards.length) nextIdx = 0;
        (cards[nextIdx] as HTMLElement)?.focus();
        cards[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleToggleViewMode, handleToggleMultiSelect, handleSurpriseMe, handleLoadPreset, handleToggleAutoTheme, handleToggleCompact, multiSelectActive, selectedGame]);

  // --- Derived ---
  const isLoaded = !isLoading && !error;
  const ptrPullDist = Math.max(0, ptrCurrentY.current - ptrStartY.current);
  const isPtrPulled = ptrPullDist > 80;

  // Count of recent games (≤7 days based on startDate) for the badge
  const recentCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return sortedFiltered.filter(g => {
      const dateStr = g.startDate || g.endDate;
      if (!dateStr) return false;
      return new Date(dateStr).getTime() >= sevenDaysAgo;
    }).length;
  }, [sortedFiltered]);

  // Filter: only show recent games (≤7 days old based on startDate)
  const recentFilteredGames = useMemo(() => {
    if (!showRecentOnly) return displayedGames;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return displayedGames.filter(g => {
      const dateStr = g.startDate || g.endDate;
      if (!dateStr) return false;
      return new Date(dateStr).getTime() >= sevenDaysAgo;
    });
  }, [showRecentOnly, displayedGames]);

  // Game ID set for collection filter
  const collectionFilteredGames = useMemo(() => {
    if (!activeCollectionFilter) return recentFilteredGames;
    const col = collections.find(c => c.id === activeCollectionFilter);
    if (!col) return recentFilteredGames;
    return recentFilteredGames.filter(g => col.gameIds.includes(g.id));
  }, [activeCollectionFilter, collections, recentFilteredGames]);

  return (
    <>
      <SplashScreen />
      <div className="bg-glow" />        <Header
        searchTerm={searchTerm}
        language={language}
        visible={headerVisible}
        currentTheme={currentTheme}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
        onToggleLang={handleToggleLang}
        onToggleTheme={() => setCurrentTheme(p => p === 'dark' ? 'amoled' : p === 'amoled' ? 'light' : 'dark')}
        onOpenDetail={handleOpenDetail}
        games={games}
        totalGames={games.length}
        totalSavings={games.reduce((sum, g) => sum + parsePrice(g.worth), 0)}
      />

      {/* Multi-select bar */}
      {multiSelectActive && multiSelectedIds.length > 0 && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 0.75rem 0' }}>
          <div className="multi-select-bar">
            <span className="multi-select-count">
              {t('multiSelectCount', language).replace('{n}', String(multiSelectedIds.length))}
            </span>
            <button className="multi-select-btn clear" onClick={() => setMultiSelectedIds([])}>
              {t('multiSelectClear', language)}
            </button>
          </div>
        </div>
      )}

      <main ref={mainRef}>
        {/* Pull to refresh indicator */}
        <div className={`ptr-indicator ${ptrState !== 'idle' ? 'visible' : ''}`}>
          {ptrState === 'loading' ? (
            <><div className="ptr-spinner" /> {t('loading', language)}</>
          ) : (
            <><span className={`ptr-arrow ${isPtrPulled ? 'pulled' : ''}`}>↓</span> {isPtrPulled ? (language === 'es' ? 'Suelta para recargar' : 'Release to refresh') : (language === 'es' ? 'Tira para recargar' : 'Pull to refresh')}</>
          )}
        </div>

        {isLoading && (
          <>
            <div className="loading-state">
              <div className="spinner" />
              <p>{t('loading', language)}</p>
            </div>
            <SkeletonGrid />
          </>
        )}

        {error && (
          <div className="empty-state">
            <div className="empty-icon">😕</div>
            <h3>{t('errorTitle', language)}</h3>
            <p>{error}. {t('errorDesc', language)}</p>
            <button className="btn-primary" onClick={loadGames}>🔄 {t('retry', language)}</button>
          </div>
        )}

        {isOffline && (
          <div className="offline-banner">
            📡 {t('offline', language)}
          </div>
        )}

        {/* Active filters bar */}
        {isLoaded && !multiSelectActive && (
          <ActiveFiltersBar
            searchTerm={searchTerm}
            activeGenre={activeGenre}
            activeStore={activeStore}
            activeType={activeType}
            activeLicense={activeLicense}
            sortMode={sortMode}
            language={language}
            onClearSearch={() => setSearchTerm('')}
            onResetAll={handleResetFilters}
            onRemoveGenre={() => setActiveGenre('all')}
            onRemoveStore={() => setActiveStore('all')}
            onRemoveType={() => setActiveType('all')}
            onRemoveLicense={() => setActiveLicense('all')}
          />
        )}

        <AnimatePresence mode="wait">
        {isLoaded && (
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* 🆕 Widget de juegos nuevos - Banner mejorado */}
            {showNewGamesBanner && newGameIds.length > 0 && (
              <motion.div 
                className="notification-banner" 
                onClick={() => { setShowNewGamesBanner(false); }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ 
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                  boxShadow: '0 4px 16px var(--accent-glow)',
                }}
              >
                <span style={{ fontSize: '1.2rem', animation: 'pulse 1.5s infinite' }}>🆕</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {newGameIds.length} {language === 'es' ? 'nuevos juegos' : 'new games'}!
                  </div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.85 }}>
                    {language === 'es' ? 'Toca para verlos' : 'Tap to view them'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}>
                  {newGameIds.length}
                </div>
                <button className="notification-banner-close" onClick={e => { e.stopPropagation(); setShowNewGamesBanner(false); }} style={{ background: 'rgba(255,255,255,0.15)' }}>✕</button>
              </motion.div>
            )}

            {/* Surprise Me Button */}
            {!multiSelectActive && (
              <button className="surprise-btn" onClick={handleSurpriseMe}>
                🎲 {t('surpriseMe', language)}
              </button>
            )}

            {/* Surprise Result */}
            {showSurprise && surpriseResult && (
              <div className="surprise-result-card" onClick={() => handleOpenDetail(surpriseResult.game)}>
                <img src={surpriseResult.game.image} alt={surpriseResult.game.title} className="surprise-result-img"
                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x140/11111b/ef4444?text=${encodeURIComponent(surpriseResult.game.title.slice(0, 20))}`; }}
                />
                <div className="surprise-result-body">
                  <h3 className="surprise-result-title">{surpriseResult.game.title}</h3>
                  <p className="surprise-result-reason">{surpriseResult.reason}</p>
                  <div className="surprise-result-actions">
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); handleOpenDetail(surpriseResult.game); }}>
                      👁️ {t('viewDetail', language)}
                    </button>
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); handleSurpriseMe(); }}>
                      🎲 {t('surpriseAgain', language)}
                    </button>
                    <button className="surprise-result-btn" onClick={e => { e.stopPropagation(); setShowSurprise(false); }}>
                      ✕ {t('close', language)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game of the Day */}
            {gameOfDay && !multiSelectActive && (
              <div className="game-of-day" onClick={() => handleOpenDetail(gameOfDay)}>
                <img src={gameOfDay.image} alt="" className="game-of-day-bg" loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="game-of-day-content">
                  <span className="game-of-day-label">{t('gameOfDay', language)}</span>
                  <h2 className="game-of-day-title">{gameOfDay.title}</h2>
                  <div className="game-of-day-meta">
                    <span>{gameOfDay.platformIcon || '🎮'} {gameOfDay.platformName || gameOfDay.platform}</span>
                    {gameOfDay.worth && gameOfDay.worth !== 'N/A' && (
                      <span>💰 ${gameOfDay.worth}</span>
                    )}
                  </div>
                  <button className="game-of-day-btn" onClick={e => { e.stopPropagation(); handleOpenDetail(gameOfDay); }}>
                    {t('gameDetail', language)}
                  </button>
                </div>
              </div>
            )}

            {/* Ending Soon Timeline */}
            {endingSoonGames.length > 0 && !multiSelectActive && (
              <section className="timeline-section">
                <div className="timeline-header">
                  <div className="recommended-icon">⏳</div>
                  <h2 className="timeline-title">{t('endingTimeline', language)}</h2>
                </div>
                <div className="timeline-scroll">
                  {endingSoonGames.map(g => (
                    <div key={g.id} className="timeline-item" onClick={() => handleOpenDetail(g)}>
                      <img src={g.image} alt={g.title} className="timeline-item-img" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/200x100/11111b/ef4444?text=${encodeURIComponent(g.title.slice(0, 15))}`; }}
                      />
                      <div className="timeline-item-body">
                        <div className="timeline-item-title">{g.title}</div>
                        <div className="timeline-item-time">
                          {g.endDate ? (() => {
                            const diff = new Date(g.endDate).getTime() - Date.now();
                            const days = Math.floor(diff / 86400000);
                            const hours = Math.floor((diff % 86400000) / 3600000);
                            return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                          })() : ''}
                        </div>
                        <div className="timeline-item-bar" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trending Section */}
            <TrendingSection
              trendingGames={trendingGames}
              viewedGames={viewedGames}
              newGameIds={newGameIds}
              viewMode={viewMode}
              language={language}
              multiSelectActive={multiSelectActive}
              handleMarkAsViewed={handleMarkAsViewed}
              handleOpenDetail={handleOpenDetail}
            />



            {/* Desktop Sidebar + Main Grid */}
            <div className="desktop-layout">
              {/* Desktop sidebar filters - hidden on mobile via CSS */}
              <div className="desktop-sidebar">
                <div className="sidebar-title">🔍 {t('filters', language)}</div>

                {/* Filter Presets */}
                {filterPresets.length > 0 && (
                  <div className="filter-group" style={{ marginBottom: '0.5rem' }}>
                    <span className="filter-label">📋 {language === 'es' ? 'Presets' : 'Presets'}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                      {filterPresets.map(p => (
                        <div key={p.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          <button
                            className="filter-chip"
                            onClick={() => handleLoadPreset(p)}
                            style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', paddingRight: '1.2rem' }}
                          >
                            {p.icon} {p.name}
                          </button>
                          <button
                            onClick={() => handleDeletePreset(p.id)}
                            style={{
                              position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                              fontSize: '0.45rem', padding: '2px', lineHeight: 1,
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="filter-btn secondary"
                  onClick={handleSavePreset}
                  style={{ width: '100%', marginBottom: '0.3rem', fontSize: '0.62rem', padding: '0.3rem' }}
                >
                  💾 {language === 'es' ? 'Guardar filtros' : 'Save filters'}
                  <span style={{ fontSize: '0.45rem', opacity: 0.5, marginLeft: '0.2rem' }}>Alt+1</span>
                </button>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <button
                    className={`filter-btn ${compactMode ? 'primary' : 'secondary'}`}
                    onClick={handleToggleCompact}
                    style={{ flex: 1, fontSize: '0.55rem', padding: '0.2rem' }}
                  >
                    📦 {language === 'es' ? 'Compacto' : 'Compact'}
                  </button>
                  <button
                    className={`filter-btn ${autoTheme ? 'primary' : 'secondary'}`}
                    onClick={handleToggleAutoTheme}
                    style={{ flex: 1, fontSize: '0.55rem', padding: '0.2rem' }}
                  >
                    🌗 Auto
                  </button>
                </div>
                <div className="filter-group">
                  <span className="filter-label">{t('sortBy', language)}</span>
                  <div className="filter-chips">
                    {[['default', '📅', 'sortRecent'], ['recent', '🆕', 'sortNewest'], ['price-desc', '💰', 'sortPrice'], ['ending-soon', '⏰', 'sortEnding'], ['title', '🔤', 'sortAZ'], ['popular', '🔥', 'sortPopular']].map(([v, icon, k]) => (
                      <button key={v} className={`filter-chip ${sortMode === v ? 'active' : ''}`} onClick={() => setSortMode(v as SortMode)}>
                        {icon} {t(k as any, language)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">{t('genre', language)}</span>
                  <div className="filter-chips">
                    {[['all', '🎮'], ['action', '⚔️'], ['rpg', '🗡️'], ['shooter', '🔫'], ['strategy', '🧠'], ['puzzle', '🧩'], ['racing', '🏎️'], ['sports', '⚽'], ['indie', '🎨']].map(([v, icon]) => (
                      <button key={v} className={`filter-chip ${activeGenre === v ? 'active' : ''}`} onClick={() => setActiveGenre(v as Genre)}>
                        {icon} {v === 'all' ? t('all', language) : v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">{t('type', language)}</span>
                  <div className="filter-chips">
                    {[['all', '📋', 'all'], ['game', '🎮', 'games'], ['app', '📱', 'apps']].map(([v, icon, k]) => (
                      <button key={v} className={`filter-chip ${activeType === v ? 'active' : ''}`} onClick={() => setActiveType(v as TypeFilter)}>
                        {icon} {t(k as any, language)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">{t('licenseFilter', language)}</span>
                  <div className="filter-chips">
                    {[['all', '📋', 'all'], ['open-source', '🔓', 'openSource'], ['proprietary', '🔒', 'proprietary']].map(([v, icon, k]) => (
                      <button key={v} className={`filter-chip ${activeLicense === v ? 'active' : ''}`} onClick={() => setActiveLicense(v as LicenseFilter)}>
                        {icon} {t(k as any, language)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Favorites filter removed */}
                <button className="filter-btn secondary" onClick={handleResetFilters} style={{ width: '100%', marginTop: '0.35rem' }}>
                  🔄 {t('reset', language)}
                </button>
              </div>
              {/* Main Grid column */}
              <div>
                <GameGrid
                  games={collectionFilteredGames}
                  viewedGames={viewedGames}
                  newGameIds={newGameIds}
                  viewMode={viewMode}
                  language={language}
                  multiSelectActive={multiSelectActive}
                  multiSelectedIds={multiSelectedIds}
                  onMarkAsViewed={handleMarkAsViewed}
                  onOpenDetail={handleOpenDetail}
                  onToggleMultiSelectGame={handleToggleMultiSelectGame}
                />
                {/* Empty state when collection has no games */}
                {activeCollectionFilter && collectionFilteredGames.length === 0 && displayedGames.length > 0 && (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <div className="empty-icon">📁</div>
                    <h3>{t('noGames', language)}</h3>
                    <button className="btn-primary" onClick={() => setActiveCollectionFilter(null)}>
                      {t('clearFilters', language)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="infinite-sentinel" />}

        {/* Load more button (fallback) */}
        {hasMore && (
          <button
            className="load-more-btn"
            onClick={() => setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedFiltered.length))}
          >
            {language === 'es' ? 'Cargar más' : 'Load more'} ({sortedFiltered.length - displayCount} {language === 'es' ? 'restantes' : 'remaining'})
          </button>
        )}

        {isLoaded && collectionFilteredGames.length === 0 && !activeCollectionFilter && (
          <EmptyState language={language} onReset={handleResetFilters} />
        )}

        {/* Jump to top button */}
        {showJumpToTop && (
          <button
            onClick={handleJumpToTop}
            style={{
              position: 'fixed', bottom: 'calc(var(--nav-h) + 1rem)', right: '1rem', zIndex: 300,
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--accent)', color: 'white', border: 'none',
              fontSize: '1.1rem', cursor: 'pointer',
              boxShadow: '0 2px 12px var(--accent-glow)',
              animation: 'scaleIn 0.25s var(--ease-spring)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s var(--ease)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ↑
          </button>
        )}
      </main>

      {/* PWA Update Banner */}
      {swUpdateAvailable && (
        <div className="pwa-install-banner" style={{ borderColor: 'var(--accent)' }}>
          <div className="pwa-install-icon" style={{ background: 'var(--accent)' }}>🔄</div>
          <div className="pwa-install-info">
            <div className="pwa-install-title">
              {language === 'es' ? 'Nueva versión disponible' : 'New version available'}
            </div>
            <div className="pwa-install-desc">
              {language === 'es' ? 'Actualiza para obtener las últimas mejoras' : 'Update for the latest improvements'}
            </div>
          </div>
          <button className="pwa-install-btn" onClick={handleSWUpdate}>
            🔄 {language === 'es' ? 'Actualizar' : 'Update'}
          </button>
        </div>
      )}

      {/* PWA Install Banner */}
      {showPWAInstall && (
        <div className="pwa-install-banner">
          <div className="pwa-install-icon">🎮</div>
          <div className="pwa-install-info">
            <div className="pwa-install-title">
              {language === 'es' ? 'Instala GameRadar' : 'Install GameRadar'}
            </div>
            <div className="pwa-install-desc">
              {language === 'es' ? 'Añade a tu pantalla de inicio' : 'Add to your home screen'}
            </div>
          </div>
          <button className="pwa-install-btn" onClick={handlePWAInstall}>
            📲 {language === 'es' ? 'Instalar' : 'Install'}
          </button>
          <button className="pwa-install-close" onClick={handleDismissPWA}>✕</button>
        </div>
      )}

      <Footer language={language} />
      <ToastContainer />

      <BottomNav
        currentMode={currentMode}
        viewMode={viewMode}
        showRecentOnly={showRecentOnly}
        recentCount={recentCount}
        language={language}
        visible={navVisible}
        activeStore={activeStore}
        onModeChange={handleModeChange}
        onStoreChange={setActiveStore}
        onToggleRecent={handleToggleRecent}
        onResetFilters={handleResetFilters}
        onToggleViewMode={handleToggleViewMode}
        onOpenSettings={handleOpenSettings}
        onToggleMultiSelect={handleToggleMultiSelect}
        onToggleFilter={handleToggleFilter}
        multiSelectActive={multiSelectActive}
      />

      {/* Game Detail Sheet */}
      {selectedGame && (
        <GameDetail
          game={selectedGame}
          games={games}
          votes={votes}
          reactions={reactions}
          wishlist={wishlist}
          language={language}
          isOpen={true}
          onClose={handleCloseDetail}
          onVote={handleVote}
          onReaction={handleReaction}
          onToggleWishlist={handleToggleWishlist}
          onMarkClaimed={handleMarkClaimed}
          onOpenGame={handleOpenDetail}
        />
      )}

      {/* Settings Panel (Theme, Collections, Activity, Achievements) — Code Splitting */}
      {showSettings && (
        <Suspense fallback={
          <div className="filter-overlay open" style={{ zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        }>
          <SettingsPanel
            language={language}
            collections={collections}
            activityLog={activityLog}
            achievements={achievements}
            userStats={userStats}
            games={games.reduce((acc, g) => ({ ...acc, [g.id]: g.title }), {} as Record<string, string>)}
            currentTheme={currentTheme}
            accentColor={accentColor}
            onClose={handleCloseSettings}
            onCreateCollection={createCollection}
            onDeleteCollection={deleteCollection}
            onOpenCollectionGames={handleOpenCollectionGames}
            onChangeTheme={setCurrentTheme}
            onChangeAccent={setAccentColor}
          />
        </Suspense>
      )}

      {/* Filter Panel */}
      <FilterPanel
        language={language}
        isOpen={isFilterOpen}
        searchTerm={searchTerm}
        activeGenre={activeGenre}
        activeStore={activeStore}
        activeType={activeType}
        activeLicense={activeLicense}
        activeYear={activeYear}
        sortMode={sortMode}
        onClose={() => setIsFilterOpen(false)}
        onSearchChange={setSearchTerm}
        onGenreChange={setActiveGenre}
        onStoreChange={setActiveStore}
        onTypeChange={setActiveType}
        onLicenseChange={setActiveLicense}
        onYearChange={setActiveYear}
        onSortChange={setSortMode}
        onReset={handleResetFilters}
      />

      {/* Onboarding */}
      {onboardingStep !== 'done' && (
        <Onboarding
          language={language}
          step={onboardingStep}
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </>
  );
}
