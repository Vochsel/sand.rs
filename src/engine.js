import {
  PARTICLE_SHADER,
  VIEWER_SHADER,
  buildSampleComputeShader,
} from "./shaders.js";

const UNIFORM_BYTES = 96;
const SAMPLE_CAPACITY = 4096;
const SAMPLE_STRIDE = 32;
const SAMPLE_WORKGROUP_SIZE = 64;
const SAMPLE_CURSOR_WRAP = 1 << 24;
const PRESENT_ON_PAUSE_KEYS = new Set(["rendererActive", "viewTx", "viewTy", "viewScale"]);

function sameStateValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  return Object.is(a, b);
}

function writeUniforms(state, sampleCursor, frameSeed, f, u32) {
  f[0] = state.canvasW;
  f[1] = state.canvasH;
  f[2] = state.bufferW;
  f[3] = state.bufferH;

  f[4] = state.bgCol[0];
  f[5] = state.bgCol[1];
  f[6] = state.bgCol[2];
  f[7] = state.sandRadius;

  f[8] = state.sandCol[0];
  f[9] = state.sandCol[1];
  f[10] = state.sandCol[2];
  f[11] = state.sandOpacity;

  f[12] = state.time;
  f[13] = state.rendererActive ? 1.0 : 0.0;
  f[14] = state.viewTx;
  f[15] = state.viewTy;

  f[16] = state.viewScale;
  u32[17] = state.sampleCount;
  f[18] = state.mouseX;
  f[19] = state.mouseY;
  u32[20] = sampleCursor;
  u32[21] = frameSeed;
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = null;
    this.ctx = null;
    this.format = null;
    this.uniformBuffer = null;
    this.sampleBuffer = null;
    this.sampleCapacity = SAMPLE_CAPACITY;
    this.sampler = null;
    this.targets = null;
    this.targetViews = [null, null];
    this.active = 0;
    this.sampleComputePipeline = null;
    this.particlePipeline = null;
    this.viewPipeline = null;
    this.viewBindGroups = [null, null];
    this.sampleComputeBindGroup = null;
    this.particleBindGroup = null;
    const uniformData = new ArrayBuffer(UNIFORM_BYTES);
    this.uniformBytes = new Uint8Array(uniformData);
    this.uniformFloats = new Float32Array(uniformData);
    this.uniformU32 = new Uint32Array(uniformData);
    this.bufferW = 1024;
    this.bufferH = 1024;
    this.elapsed = 0;
    this.frameSeed = 0;
    this.sampleCursor = 0;
    this.shaderError = null;
    this.onShaderError = null;
    this.onNeedsFrame = null;
    this.needsSimulation = true;
    this.needsPresent = true;
    this.forceClear = true;
    this.state = {
      canvasW: 1,
      canvasH: 1,
      bufferW: 1024,
      bufferH: 1024,
      bgCol: [0.18, 0.18, 0.20],
      sandCol: [1.0, 0.91, 0.77],
      sandRadius: 0.02,
      sandOpacity: 0.5,
      time: 0,
      rendererActive: true,
      viewTx: 0,
      viewTy: 0,
      viewScale: 1,
      sampleCount: 256,
      mouseX: 0.5,
      mouseY: 0.5,
    };
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error("WebGPU is not available in this browser. Try Chrome, Edge, Safari 18+, or Firefox 121+.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter available.");
    this.device = await adapter.requestDevice();
    this.ctx = this.canvas.getContext("webgpu");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });

    this.uniformBuffer = this.device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampleBuffer = this.device.createBuffer({
      size: this.sampleCapacity * SAMPLE_STRIDE,
      usage: GPUBufferUsage.STORAGE,
    });

    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    this.createTargets(this.bufferW, this.bufferH);
    await this.buildParticlePipeline();
    await this.buildViewPipeline();
  }

  requestFrame() {
    this.onNeedsFrame?.();
  }

  createTargets(w, h) {
    if (this.targets) {
      this.targets[0].destroy();
      this.targets[1].destroy();
    }
    this.bufferW = Math.max(2, Math.floor(w));
    this.bufferH = Math.max(2, Math.floor(h));
    const usage =
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.RENDER_ATTACHMENT;
    this.targets = [
      this.device.createTexture({
        size: [this.bufferW, this.bufferH],
        format: "rgba8unorm",
        usage,
      }),
      this.device.createTexture({
        size: [this.bufferW, this.bufferH],
        format: "rgba8unorm",
        usage,
      }),
    ];
    this.targetViews = [
      this.targets[0].createView(),
      this.targets[1].createView(),
    ];
    this.active = 0;
    this.elapsed = 0;
    this.frameSeed = 0;
    this.sampleCursor = 0;
    this.state.time = 0;
    this.needsSimulation = true;
    this.needsPresent = true;
    this.forceClear = true;
    this.rebuildBindGroups();
    this.requestFrame();
  }

  rebuildBindGroups() {
    if (this.viewPipeline) {
      for (let i = 0; i < 2; i++) {
        this.viewBindGroups[i] = this.device.createBindGroup({
          layout: this.viewPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: this.targetViews[i] },
            { binding: 2, resource: this.sampler },
          ],
        });
      }
    }
    if (this.sampleComputePipeline) {
      this.sampleComputeBindGroup = this.device.createBindGroup({
        layout: this.sampleComputePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.sampleBuffer } },
        ],
      });
    }
    if (this.particlePipeline) {
      this.particleBindGroup = this.device.createBindGroup({
        layout: this.particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.sampleBuffer } },
        ],
      });
    }
  }

  async buildParticlePipeline() {
    const module = this.device.createShaderModule({ code: PARTICLE_SHADER });
    this.particlePipeline = await this.device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vs_particles" },
      fragment: {
        module,
        entryPoint: "fs_particles",
        targets: [
          {
            format: "rgba8unorm",
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  async buildViewPipeline() {
    const module = this.device.createShaderModule({ code: VIEWER_SHADER });
    this.viewPipeline = await this.device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: {
        module,
        entryPoint: "fs_view",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  async setUserShader(formulaWGSL) {
    const code = buildSampleComputeShader(formulaWGSL);
    this.device.pushErrorScope("validation");
    const module = this.device.createShaderModule({ code });

    const compileInfo = await module.getCompilationInfo();
    const fatal = compileInfo.messages.find((m) => m.type === "error");
    if (fatal) {
      const err = `Shader error (line ${fatal.lineNum}): ${fatal.message}`;
      this.shaderError = err;
      this.onShaderError?.(err);
      await this.device.popErrorScope();
      return false;
    }

    let pipeline;
    try {
      pipeline = await this.device.createComputePipelineAsync({
        layout: "auto",
        compute: { module, entryPoint: "cs_samples" },
      });
    } catch (e) {
      const err = `Pipeline error: ${e.message}`;
      this.shaderError = err;
      this.onShaderError?.(err);
      await this.device.popErrorScope();
      return false;
    }
    const validationError = await this.device.popErrorScope();
    if (validationError) {
      const err = `Pipeline validation: ${validationError.message}`;
      this.shaderError = err;
      this.onShaderError?.(err);
      return false;
    }

    this.sampleComputePipeline = pipeline;
    this.shaderError = null;
    this.onShaderError?.(null);
    this.rebuildBindGroups();
    this.reset();
    return true;
  }

  resizeCanvasToDisplay() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    const resized = this.canvas.width !== w || this.canvas.height !== h;
    if (resized) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.needsPresent = true;
    }
    this.state.canvasW = this.canvas.width;
    this.state.canvasH = this.canvas.height;
    return resized;
  }

  reset() {
    this.elapsed = 0;
    this.frameSeed = 0;
    this.sampleCursor = 0;
    this.state.time = 0;
    this.needsSimulation = true;
    this.needsPresent = true;
    this.forceClear = true;
    this.requestFrame();
  }

  setState(patch) {
    let changed = false;
    let needsPresent = false;

    for (const [key, rawValue] of Object.entries(patch)) {
      const value = Array.isArray(rawValue) ? [...rawValue] : rawValue;
      if (sameStateValue(this.state[key], value)) continue;
      this.state[key] = value;
      changed = true;
      if (PRESENT_ON_PAUSE_KEYS.has(key)) needsPresent = true;
    }

    if (!changed) return;
    if (needsPresent) this.needsPresent = true;
    if (this.state.rendererActive || needsPresent) {
      this.requestFrame();
    }
  }

  setBufferSize(w, h) {
    if (Math.floor(w) === this.bufferW && Math.floor(h) === this.bufferH) return;
    this.createTargets(w, h);
    this.state.bufferW = this.bufferW;
    this.state.bufferH = this.bufferH;
  }

  frame(dtSeconds) {
    if (!this.sampleComputePipeline || !this.particlePipeline) return false;
    const resized = this.resizeCanvasToDisplay();
    const shouldSimulate = this.state.rendererActive || this.needsSimulation;
    const shouldPresent = shouldSimulate || this.needsPresent || resized;
    if (!shouldPresent) return false;

    const sampleCount = Math.max(1, Math.min(this.sampleCapacity, Math.floor(this.state.sampleCount)));
    this.state.bufferW = this.bufferW;
    this.state.bufferH = this.bufferH;
    this.state.sampleCount = sampleCount;
    this.state.time = shouldSimulate
      ? (this.forceClear ? 0 : this.elapsed + dtSeconds)
      : this.elapsed;

    writeUniforms(
      this.state,
      this.sampleCursor >>> 0,
      this.frameSeed >>> 0,
      this.uniformFloats,
      this.uniformU32
    );
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformBytes);

    const encoder = this.device.createCommandEncoder();
    const writeIdx = this.active;
    const readIdx = 1 - writeIdx;
    let presentIdx = readIdx;

    if (shouldSimulate) {
      if (!this.forceClear) {
        encoder.copyTextureToTexture(
          { texture: this.targets[readIdx] },
          { texture: this.targets[writeIdx] },
          [this.bufferW, this.bufferH, 1]
        );
      }

      const computePass = encoder.beginComputePass();
      computePass.setPipeline(this.sampleComputePipeline);
      computePass.setBindGroup(0, this.sampleComputeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(sampleCount / SAMPLE_WORKGROUP_SIZE));
      computePass.end();

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.targetViews[writeIdx],
            loadOp: this.forceClear ? "clear" : "load",
            clearValue: {
              r: this.state.bgCol[0],
              g: this.state.bgCol[1],
              b: this.state.bgCol[2],
              a: 1,
            },
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(this.particlePipeline);
      pass.setBindGroup(0, this.particleBindGroup);
      pass.draw(6, sampleCount);
      pass.end();
      presentIdx = writeIdx;
    }

    const viewPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });
    viewPass.setPipeline(this.viewPipeline);
    viewPass.setBindGroup(0, this.viewBindGroups[presentIdx]);
    viewPass.draw(3);
    viewPass.end();

    this.device.queue.submit([encoder.finish()]);
    if (shouldSimulate) {
      this.active = readIdx;
      this.elapsed = this.state.time;
      this.frameSeed = (this.frameSeed + 1) >>> 0;
      this.sampleCursor = (this.sampleCursor + sampleCount) % SAMPLE_CURSOR_WRAP;
      this.needsSimulation = false;
      this.forceClear = false;
    }
    this.needsPresent = false;
    return this.state.rendererActive;
  }

  async exportPNG() {
    const w = this.bufferW;
    const h = this.bufferH;
    const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
    const stagingBuf = this.device.createBuffer({
      size: bytesPerRow * h,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const enc = this.device.createCommandEncoder();
    const src = this.targets[1 - this.active];
    enc.copyTextureToBuffer(
      { texture: src },
      { buffer: stagingBuf, bytesPerRow, rowsPerImage: h },
      [w, h, 1]
    );
    this.device.queue.submit([enc.finish()]);
    await stagingBuf.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(stagingBuf.getMappedRange());

    const can = document.createElement("canvas");
    can.width = w;
    can.height = h;
    const ctx = can.getContext("2d");
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const srcRow = y * bytesPerRow;
      const dstRow = y * w * 4;
      for (let x = 0; x < w; x++) {
        const sIdx = srcRow + x * 4;
        const dIdx = dstRow + x * 4;
        img.data[dIdx] = data[sIdx];
        img.data[dIdx + 1] = data[sIdx + 1];
        img.data[dIdx + 2] = data[sIdx + 2];
        img.data[dIdx + 3] = data[sIdx + 3];
      }
    }
    ctx.putImageData(img, 0, 0);
    stagingBuf.unmap();
    stagingBuf.destroy();

    return new Promise((resolve) => {
      can.toBlob((blob) => resolve(blob), "image/png");
    });
  }
}
