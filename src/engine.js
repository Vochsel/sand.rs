import { VIEWER_SHADER, buildSandShader } from "./shaders.js";

const UNIFORM_BYTES = 96;

function packUniforms(state) {
  const buf = new ArrayBuffer(UNIFORM_BYTES);
  const f = new Float32Array(buf);
  const u32 = new Uint32Array(buf);

  f[0] = state.canvasW;
  f[1] = state.canvasH;
  f[2] = state.bufferW;
  f[3] = state.bufferH;

  f[4] = state.bgCol[0];
  f[5] = state.bgCol[1];
  f[6] = state.bgCol[2];
  f[7] = state.sandRadius;

  f[8]  = state.sandCol[0];
  f[9]  = state.sandCol[1];
  f[10] = state.sandCol[2];
  f[11] = state.sandOpacity;

  f[12] = state.time;
  f[13] = state.rendererActive ? 1.0 : 0.0;
  f[14] = state.viewTx;
  f[15] = state.viewTy;

  f[16] = state.viewScale;
  u32[17] = state.sandAmount;
  f[18] = state.mouseX;
  f[19] = state.mouseY;

  return new Uint8Array(buf);
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = null;
    this.ctx = null;
    this.format = null;
    this.uniformBuffer = null;
    this.sampler = null;
    this.targets = null;
    this.active = 0;
    this.sandPipeline = null;
    this.viewPipeline = null;
    this.viewBindGroups = [null, null];
    this.sandBindGroups = [null, null];
    this.bufferW = 1024;
    this.bufferH = 1024;
    this.elapsed = 0;
    this.lastTime = 0;
    this.shaderError = null;
    this.onShaderError = null;
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
      sandAmount: 1000,
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

    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    this.createTargets(this.bufferW, this.bufferH);
    this.buildViewPipeline();
  }

  createTargets(w, h) {
    if (this.targets) {
      this.targets[0].destroy();
      this.targets[1].destroy();
    }
    this.bufferW = Math.max(2, Math.floor(w));
    this.bufferH = Math.max(2, Math.floor(h));
    const usage =
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.COPY_SRC;
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
    this.active = 0;
    this.elapsed = 0;
    this.rebuildBindGroups();
  }

  rebuildBindGroups() {
    if (!this.viewPipeline || !this.sandPipeline) return;
    for (let i = 0; i < 2; i++) {
      const prev = this.targets[1 - i];
      this.sandBindGroups[i] = this.device.createBindGroup({
        layout: this.sandPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: prev.createView() },
          { binding: 2, resource: this.sampler },
        ],
      });
      this.viewBindGroups[i] = this.device.createBindGroup({
        layout: this.viewPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: this.targets[i].createView() },
          { binding: 2, resource: this.sampler },
        ],
      });
    }
  }

  buildViewPipeline() {
    const module = this.device.createShaderModule({ code: VIEWER_SHADER });
    this.viewPipeline = this.device.createRenderPipeline({
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
    const code = buildSandShader(formulaWGSL);
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
      pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs_main" },
        fragment: {
          module,
          entryPoint: "fs_sand",
          targets: [{ format: "rgba8unorm" }],
        },
        primitive: { topology: "triangle-list" },
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

    this.sandPipeline = pipeline;
    this.shaderError = null;
    this.onShaderError?.(null);
    this.rebuildBindGroups();
    this.elapsed = 0;
    return true;
  }

  resizeCanvasToDisplay() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.state.canvasW = this.canvas.width;
    this.state.canvasH = this.canvas.height;
  }

  reset() {
    this.elapsed = 0;
  }

  setState(patch) {
    Object.assign(this.state, patch);
  }

  setBufferSize(w, h) {
    if (Math.floor(w) === this.bufferW && Math.floor(h) === this.bufferH) return;
    this.createTargets(w, h);
    this.state.bufferW = this.bufferW;
    this.state.bufferH = this.bufferH;
  }

  frame(dtSeconds) {
    if (!this.sandPipeline) return;
    this.resizeCanvasToDisplay();
    this.elapsed += dtSeconds;
    this.state.time = this.elapsed;
    this.state.bufferW = this.bufferW;
    this.state.bufferH = this.bufferH;

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      packUniforms(this.state)
    );

    const encoder = this.device.createCommandEncoder();
    const writeIdx = this.active;
    const readIdx = 1 - writeIdx;

    // sand pass into write target, sampling read target
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.targets[writeIdx].createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(this.sandPipeline);
      pass.setBindGroup(0, this.sandBindGroups[writeIdx]);
      pass.draw(3);
      pass.end();
    }

    // viewer pass to canvas
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(this.viewPipeline);
      pass.setBindGroup(0, this.viewBindGroups[writeIdx]);
      pass.draw(3);
      pass.end();
    }

    this.device.queue.submit([encoder.finish()]);
    this.active = readIdx;
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
    const src = this.targets[1 - this.active]; // last fully-rendered
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
    // tightly pack rows (drop bytesPerRow padding); rows already top-down
    for (let y = 0; y < h; y++) {
      const srcRow = y * bytesPerRow;
      const dstRow = y * w * 4;
      for (let x = 0; x < w; x++) {
        const sIdx = srcRow + x * 4;
        const dIdx = dstRow + x * 4;
        img.data[dIdx]     = data[sIdx];
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
