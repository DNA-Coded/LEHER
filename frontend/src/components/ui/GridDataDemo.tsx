import { useState, useEffect } from 'react';
import { oceanDataService } from '@/lib/api/oceanDataService';
import type { GridResponse } from '@/lib/api/types';

export default function GridDataDemo() {
  const [data, setData] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ min: number; max: number; mean: number } | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setStats(null);
    setElapsedMs(null);

    const startTime = performance.now();

    try {
      // Step 4: Use test request
      // lat_min=-10, lat_max=10, lon_min=60, lon_max=80, depth=100, time=2023-01-01
      const result = await oceanDataService.getGridData(
        "temperature",
        -10, 10, 60, 80,
        100,
        "2023-01-01T00:00:00Z"
      );
      
      const endTime = performance.now();
      setElapsedMs(endTime - startTime);

      // Calculate stats safely (ignoring nulls)
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let count = 0;

      // Recursive function to process potentially nested arrays
      const processValues = (arr: any[]) => {
        for (const val of arr) {
          if (Array.isArray(val)) {
            processValues(val);
          } else if (val !== null && typeof val === 'number') {
            if (val < min) min = val;
            if (val > max) max = val;
            sum += val;
            count++;
          }
        }
      };

      if (result.values && Array.isArray(result.values)) {
        processValues(result.values);
      }

      if (count > 0) {
        setStats({ min, max, mean: sum / count });
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch grid data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans bg-slate-50 text-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">FastAPI Frontend Integration Test</h1>
      
      <div className="mb-6 flex gap-4">
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading Ocean Data..." : "Reload Test Grid"}
        </button>
        
        <button 
          onClick={() => {
            // Test large request error
            setLoading(true);
            setError(null);
            setData(null);
            setStats(null);
            oceanDataService.getGridData("temperature", -90, 90, -180, 180)
              .then(res => setData(res))
              .catch(err => setError(err.message))
              .finally(() => setLoading(false));
          }}
          disabled={loading}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded shadow disabled:opacity-50 transition-colors"
        >
          Test Large Grid (Force Error)
        </button>
      </div>

      {loading && (
        <div className="p-8 border rounded-lg bg-white shadow-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-lg text-slate-600">Loading ocean data from backend... This will not freeze the UI.</p>
        </div>
      )}

      {error && (
        <div className="p-6 border-l-4 border-red-500 rounded-r-lg bg-red-50 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="bg-slate-800 text-white px-6 py-4">
            <h2 className="text-xl font-semibold capitalize">{data.dataset} Grid Data</h2>
            <p className="text-slate-300 text-sm">Variable: {data.variable}</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-700 mb-3 border-b pb-2">Coordinates</h3>
              <ul className="space-y-2 text-sm">
                <li><span className="font-medium text-slate-500">Selected Depth:</span> {data.depth !== undefined ? `${data.depth} meters` : 'N/A'}</li>
                <li><span className="font-medium text-slate-500">Selected Time:</span> {data.time || 'N/A'}</li>
                <li><span className="font-medium text-slate-500">Latitude Count:</span> {data.coordinates.latitude?.length || 0} points</li>
                <li><span className="font-medium text-slate-500">Longitude Count:</span> {data.coordinates.longitude?.length || 0} points</li>
                <li><span className="font-medium text-slate-500">Grid Shape:</span> [{data.shape.join(', ')}]</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-700 mb-3 border-b pb-2">Data Statistics</h3>
              {stats ? (
                <ul className="space-y-2 text-sm">
                  <li><span className="font-medium text-slate-500">Minimum:</span> {stats.min.toFixed(4)}</li>
                  <li><span className="font-medium text-slate-500">Maximum:</span> {stats.max.toFixed(4)}</li>
                  <li><span className="font-medium text-slate-500">Mean:</span> {stats.mean.toFixed(4)}</li>
                  {elapsedMs && (
                    <li className="mt-4 pt-2 border-t"><span className="font-medium text-slate-500">Request Time:</span> {elapsedMs.toFixed(0)} ms</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">No valid data points found in this region.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
