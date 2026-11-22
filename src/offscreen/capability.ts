// Detecção de capacidade do ambiente: qual backend o OCR vai usar (WebGPU/WASM) e
// se o WASM multithread está liberado. Reporta o backend efetivo para diagnóstico.

export interface Capability {
  webgpu: boolean;
  crossOriginIsolated: boolean;
  adapter?: string;
  preferred: 'webgpu' | 'wasm';
}

// Tipos mínimos da WebGPU (o lib.dom do TypeScript não os inclui sem @webgpu/types).
interface AdaptadorGpu {
  requestAdapterInfo?: () => Promise<{ description?: string; vendor?: string }>;
}
interface Gpu {
  requestAdapter(): Promise<AdaptadorGpu | null>;
}

export async function detectCapability(): Promise<Capability> {
  const coi =
    typeof globalThis.crossOriginIsolated === 'boolean' ? globalThis.crossOriginIsolated : false;

  let webgpu = false;
  let adapter: string | undefined;

  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  if (gpu) {
    try {
      const adp = await gpu.requestAdapter();
      if (adp) {
        webgpu = true;
        const info = await adp.requestAdapterInfo?.();
        adapter = info?.description || info?.vendor;
      }
    } catch {
      webgpu = false;
    }
  }

  return { webgpu, crossOriginIsolated: coi, adapter, preferred: webgpu ? 'webgpu' : 'wasm' };
}
