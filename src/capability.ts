// Detecção de capacidade do ambiente. Determina qual backend o OCR vai usar e
// se o WASM multithread está liberado. É o "termômetro" do risco nº 1 e nº 2 do
// HANDOFF: rode isto na máquina-alvo real (servidor/gabinete) para saber o que
// esperar de performance ANTES de decidir migrar o pAIdegua.

export interface Capability {
  /** navigator.gpu existe E um adapter foi obtido. */
  webgpu: boolean;
  /** SharedArrayBuffer disponível (habilita WASM multithread). */
  crossOriginIsolated: boolean;
  /** Rótulo do adapter WebGPU, quando disponível (ajuda a identificar GPU/driver). */
  adapter?: string;
  /** Backend efetivo que o OCR deve preferir. */
  preferred: 'webgpu' | 'wasm';
}

export async function detectCapability(): Promise<Capability> {
  const coi =
    typeof globalThis.crossOriginIsolated === 'boolean'
      ? globalThis.crossOriginIsolated
      : false;

  let webgpu = false;
  let adapter: string | undefined;

  // navigator.gpu pode não existir em máquina sem GPU/driver compatível — este
  // é exatamente o cenário a medir na JFCE.
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (gpu) {
    try {
      const adp = await gpu.requestAdapter();
      if (adp) {
        webgpu = true;
        // info() é assíncrono em specs recentes; caímos para undefined se não houver.
        const info = await (adp as GPUAdapter & {
          requestAdapterInfo?: () => Promise<{ description?: string; vendor?: string }>;
        }).requestAdapterInfo?.();
        adapter = info?.description || info?.vendor;
      }
    } catch {
      webgpu = false;
    }
  }

  return {
    webgpu,
    crossOriginIsolated: coi,
    adapter,
    preferred: webgpu ? 'webgpu' : 'wasm'
  };
}
