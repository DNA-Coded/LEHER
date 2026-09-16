import React from 'react';
import { useOceanStore } from '../../store/useOceanStore';
import { useArgoProfile } from '../../services/useOceanQueries';
import { ArgoProfileChart } from '../Charts/ArgoProfileChart';
import { X, Radio, MapPin, Calendar, Activity } from 'lucide-react';

export const ArgoFloatModal: React.FC = () => {
  const { activeArgoFloatId, setActiveArgoFloatId } = useOceanStore();
  const { data: profile, isLoading } = useArgoProfile(activeArgoFloatId);

  if (!activeArgoFloatId) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '80px',
        right: '28px',
        width: '420px',
        background: 'rgba(5, 15, 30, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        borderRadius: '16px',
        padding: '20px',
        color: '#e2f1ff',
        zIndex: 25,
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 20px rgba(255, 215, 0, 0.15)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Radio size={13} />
            <span>Autonomous Profiling Float</span>
          </div>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
            {profile ? `WMO #${profile.wmoNumber}` : 'Loading Argo Telemetry...'}
          </h3>
          <div style={{ fontSize: '12px', color: '#90b4d4' }}>
            {profile?.platformType} — {profile?.country}
          </div>
        </div>

        <button
          onClick={() => setActiveArgoFloatId(null)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {isLoading || !profile ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#88a8cc' }}>
          Retrieving real-time CTD sensor packet...
        </div>
      ) : (
        <>
          {/* Metadata Row */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '8px 12px',
              background: 'rgba(0, 30, 60, 0.4)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#8cb4d6',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} style={{ color: '#00f2fe' }} />
              <span>{profile.lon.toFixed(2)}°E, {profile.lat.toFixed(2)}°N</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} style={{ color: '#00f5a0' }} />
              <span>Cycle #{profile.cycleNumber}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={11} style={{ color: '#ffd700' }} />
              <span>{new Date(profile.date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Chart Header */}
          <div style={{ fontSize: '11px', color: '#7bb0dc', marginBottom: '6px', fontWeight: 600 }}>
            Vertical Sounding Profile (CTD: 0 - {profile.maxDepth}m):
          </div>

          {/* Chart.js CTD Profile Component */}
          <ArgoProfileChart profile={profile} />
        </>
      )}
    </div>
  );
};
