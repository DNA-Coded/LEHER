declare module 'cesium' {
  const Cesium: any;
  export = Cesium;
}

declare module 'chart.js' {
  export const Chart: any;
  export const registerables: any;
  export const CategoryScale: any;
  export const LinearScale: any;
  export const PointElement: any;
  export const LineElement: any;
  export const Title: any;
  export const Tooltip: any;
  export const Legend: any;
  export default Chart;
}

declare module 'react-chartjs-2' {
  export const Line: any;
  export const Bar: any;
  export const Scatter: any;
}

declare namespace GeoJSON {
  export interface FeatureCollection<G = any, P = any> {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
    bbox?: number[];
  }
  export interface Feature<G = any, P = any> {
    type: "Feature";
    geometry: G;
    id?: string | number;
    properties: P;
    bbox?: number[];
  }
}
