import BackButton from '@/components/BackButton';
import LockSettingsSlider from './LockSettingsSlider';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItem,
  ListItemText,
  Switch,
  Typography,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { deviceService } from '@/services/deviceService';
import { onNativeEvent } from '@/services/appBridge';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { mapTiles } from '@/constants/mapTiles';
import markerIcon from '@assets/sesame-map-marker.png';
import { lockSettingsInteraction } from './lockSettingsInteraction';

const ZOOM = 17;
// Shown until the stored point or the phone location arrives; the main market is Japan.
const FALLBACK_VIEW = [[36.2, 138.25], 5];
const hasPoint = (data) => !!data && !(data.latitude === 0 && data.longitude === 0);
const validLocation = (data) => !!data && Number.isFinite(data.latitude) && Number.isFinite(data.longitude);
// Slider over the map: filled side matches the red circle, unfilled side is dark grey; white halo keeps both readable.
const FILLED = '#d32f2f';
const UNFILLED = '#424242';
const halo = '0 0 2px #fff, 0 0 4px #fff';

// Geofence storage, permissions and the foreground service stay native; the map and flow live here.
export default function AppAutoUnlock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const deviceUUID = params.get('deviceUUID');
  const { setSnackbarValue } = useContext(GlobalStateContext);
  const container = useRef();
  const map = useRef();
  const layers = useRef({});
  const active = useRef(false);
  const latest = useRef(null);
  // Which permission step is waiting: 'locate' / 'enable' for the system dialog, 'settings' for app settings.
  const waiting = useRef(null);
  const [preferences, setPreferences] = useState({ radius: 150, autoUnlock: false });
  const [disclosure, setDisclosure] = useState(false);
  const error = () => {
    if (active.current)
      setSnackbarValue({
        logScope: 'components/AppAutoUnlock.error',
        logReason: 'lockSettings.failed',
        open: true,
        msg: t('lockSettings.failed'),
        severity: 'error',
      });
  };
  const apply = (data) => {
    latest.current = data;
    setPreferences(data);
  };
  const request = (operation, data = {}) =>
    deviceService.request('autoUnlock', { deviceUUID, operation, ...data }).then(({ data }) => {
      if (active.current) apply(data);
      return data;
    });
  const askLocationPermission = (step) => {
    waiting.current = step;
    return request('requestPermission');
  };
  // Like the original page: default the Sesame point to the first phone location, then keep the user's choice.
  const locate = async ({ recenter = false, ask = false } = {}) => {
    const { data } = await deviceService.request('currentLocation');
    if (!active.current || !latest.current) return;
    if (!validLocation(data)) {
      if (ask && latest.current.permission === 'none') await askLocationPermission(waiting.current || 'locate');
      return;
    }
    const point = [data.latitude, data.longitude];
    const { current: own } = layers;
    if (own.location) own.location.setLatLng(point);
    else if (map.current)
      own.location = L.circleMarker(point, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#4285f4',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map.current);
    if (!hasPoint(latest.current)) {
      await request('region', { latitude: data.latitude, longitude: data.longitude });
      recenter = true;
    }
    if (recenter) map.current?.setView(point, ZOOM);
  };
  const enable = async (value) => {
    const data = await request('enable', { value });
    if (!value || data.autoUnlock) return;
    if (data.permission === 'none') await askLocationPermission('enable');
    else setDisclosure(true);
  };

  useEffect(() => {
    active.current = true;
    const view = L.map(container.current, { zoomControl: false, attributionControl: false });
    L.control.attribution({ prefix: false }).addTo(view);
    L.tileLayer(mapTiles.url, { attribution: mapTiles.attribution, maxZoom: mapTiles.maxZoom }).addTo(view);
    view.setView(...FALLBACK_VIEW);
    view.on('click', ({ latlng }) => {
      const { lat, lng } = latlng.wrap();
      request('region', { latitude: lat, longitude: lng }).catch(error);
    });
    map.current = view;
    const observer = new ResizeObserver(() => view.invalidateSize());
    observer.observe(container.current);
    // Open the licence link in the app's web page view, like push links, instead of leaving the app.
    const openAttribution = (event) => {
      const link = event.target.closest?.('.leaflet-control-attribution a');
      if (!link) return;
      event.preventDefault();
      deviceService.request('openWebPage', { url: link.href }).catch(error);
    };
    container.current.addEventListener('click', openAttribution, true);
    request('get')
      .then((data) => {
        if (hasPoint(data)) view.setView([data.latitude, data.longitude], ZOOM);
        return locate({ ask: true });
      })
      .catch(error);
    const off = onNativeEvent(({ type }) => {
      if (type === 'locationPermission') {
        const step = waiting.current;
        waiting.current = null;
        const next = step === 'enable' ? request('enable', { value: true }) : Promise.resolve(null);
        next
          .then((data) => {
            if (data && !data.autoUnlock && data.permission === 'foreground') setDisclosure(true);
            return locate();
          })
          .catch(error);
      } else if (type === 'resume' && waiting.current === 'settings') {
        // Returning from app settings: enable only if "Allow all the time" was granted there.
        waiting.current = null;
        request('enable', { value: true }).catch(error);
      }
    });
    return () => {
      active.current = false;
      waiting.current = null;
      off();
      observer.disconnect();
      view.getContainer().removeEventListener('click', openAttribution, true);
      view.remove();
      map.current = null;
      layers.current = {};
    };
  }, [deviceUUID]);

  const { latitude, longitude, radius } = preferences;
  useEffect(() => {
    const view = map.current;
    const own = layers.current;
    if (!view) return;
    if (!hasPoint(preferences) || !Number.isFinite(latitude)) {
      own.marker?.remove();
      own.circle?.remove();
      own.marker = own.circle = null;
      return;
    }
    const point = [latitude, longitude];
    if (own.marker) {
      own.marker.setLatLng(point);
      own.circle.setLatLng(point).setRadius(radius);
      return;
    }
    // Same as the original map: app icon centred on the point and a borderless 0x30ff0000 fill.
    own.circle = L.circle(point, { radius, stroke: false, fillColor: '#ff0000', fillOpacity: 0x30 / 0xff }).addTo(view);
    own.marker = L.marker(point, {
      icon: L.icon({ iconUrl: markerIcon, iconSize: [48, 48], iconAnchor: [24, 24] }),
      interactive: false,
      keyboard: false,
    }).addTo(view);
  }, [latitude, longitude, radius]);

  return (
    <Box sx={{ ...lockSettingsInteraction, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 48, flexShrink: 0, bgcolor: 'background.paper' }}>
        <BackButton disableRipple onClick={() => navigate(-1)}></BackButton>
      </Box>
      <ListItem sx={{ bgcolor: 'background.paper', flexShrink: 0 }}>
        <ListItemText primary={t('lockExtras.autoUnlock')} />
        <Switch disableRipple checked={preferences.autoUnlock} onChange={(_, value) => enable(value).catch(error)} />
      </ListItem>
      <Typography
        sx={{
          px: 2,
          py: 1,
          color: 'text.secondary',
          fontSize: 14,
          whiteSpace: 'pre-line',
          maxHeight: '30vh',
          overflow: 'auto',
          flexShrink: 0,
        }}
      >
        {t('lockExtras.autoHint')}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          '& .leaflet-bottom': { bottom: 8 },
          '& .leaflet-control-attribution': { whiteSpace: 'nowrap' },
        }}
      >
        <Box ref={container} sx={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <IconButton
          aria-label="my location"
          onClick={() => locate({ recenter: true, ask: true }).catch(error)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            width: 40,
            height: 40,
            borderRadius: '2px',
            bgcolor: 'rgba(255,255,255,0.9)',
            color: '#666',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
          }}
        >
          <MyLocationIcon />
        </IconButton>
        {/* Floats over the map so the map shows through; only the slider itself takes touches. */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            px: 3,
            pt: 2,
            pb: 5,
            pointerEvents: 'none',
          }}
        >
          <LockSettingsSlider
            sx={{
              color: FILLED,
              pointerEvents: 'auto',
              '& .MuiSlider-track': { height: 6 },
              '& .MuiSlider-rail': { height: 6, backgroundColor: UNFILLED, opacity: 0.6 },
              '& .MuiSlider-thumb': { border: '3px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' },
            }}
            aria-label={t('lockExtras.radius', { value: preferences.radius })}
            min={20}
            max={500}
            step={0.1}
            value={preferences.radius}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => Number(value.toFixed(1))}
            onChange={(_, value) => setPreferences((old) => ({ ...old, radius: value }))}
            onChangeCommitted={(_, value) => request('region', { radius: value }).catch(error)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, textShadow: halo }}>
            <Typography sx={{ color: FILLED, fontWeight: 'inherit' }}>20 m</Typography>
            <Typography sx={{ color: UNFILLED, fontWeight: 'inherit' }}>500 m</Typography>
          </Box>
        </Box>
      </Box>
      <Dialog open={disclosure} onClose={() => setDisclosure(false)}>
        <DialogTitle sx={{ color: '#000', fontWeight: 'bold', fontSize: 20 }}>
          {t('lockExtras.locationTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography>{t('lockExtras.locationMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisclosure(false)}>{t('deviceMember.opt.cancel')}</Button>
          <Button
            onClick={() => {
              setDisclosure(false);
              waiting.current = 'settings';
              request('openSettings').catch(error);
            }}
          >
            {t('lockExtras.openSettings')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
