import { Engine } from "./engine.js";
import { EXAMPLES } from "./examples.js";
import {
  createEditor,
  bindColor,
  bindRange,
  bindNumber,
  debounce,
} from "./ui.js";
import "./style.css";

const $ = (id) => document.getElementById(id);
const MIN_GRAINS = 10;
const MAX_GRAINS = 1000;
const GRAIN_STEP = 10;
const WORKLOAD_BUDGET = 120_000_000;

function clampGrains(requested, example, bufferW, bufferH) {
  const rounded = Math.max(
    MIN_GRAINS,
    Math.min(MAX_GRAINS, Math.round(requested / GRAIN_STEP) * GRAIN_STEP)
  );
  const area = Math.max(1, Math.floor(bufferW) * Math.floor(bufferH));
  const workload = example?.workload ?? 1;
  const budgetCap = Math.max(
    MIN_GRAINS,
    Math.floor((WORKLOAD_BUDGET / (area * workload)) / GRAIN_STEP) * GRAIN_STEP
  );
  return Math.min(rounded, budgetCap);
}

async function boot() {
  const canvas = $("viewer_canvas");
  const errBanner = $("error_banner");
  const engine = new Engine(canvas);

  try {
    await engine.init();
  } catch (e) {
    errBanner.style.display = "block";
    errBanner.textContent = e.message;
    return;
  }

  engine.onShaderError = (msg) => {
    if (msg) {
      errBanner.style.display = "block";
      errBanner.textContent = msg;
    } else {
      errBanner.style.display = "none";
      errBanner.textContent = "";
    }
  };

  let rafId = 0;
  let animating = false;
  let last = performance.now();
  const loop = (now) => {
    rafId = 0;
    const dt = animating ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    animating = engine.frame(dt);
    if (animating) scheduleFrame();
  };
  const scheduleFrame = () => {
    if (rafId) return;
    if (!animating) last = performance.now();
    rafId = requestAnimationFrame(loop);
  };
  engine.onNeedsFrame = scheduleFrame;
  new ResizeObserver(() => scheduleFrame()).observe(canvas);

  // populate examples select
  const select = $("examples_select");
  const amountInput = $("amount_input");
  const amountOutput = $("amount_output");
  const bufferWInput = $("buffer_w");
  const bufferHInput = $("buffer_h");
  let currentExample = EXAMPLES[0];

  const syncGrainControls = (value) => {
    amountInput.value = String(value);
    amountOutput.value = String(value);
  };
  const syncBufferControls = () => {
    bufferWInput.value = String(engine.bufferW);
    bufferHInput.value = String(engine.bufferH);
  };
  const applySandAmount = (requested) => {
    const next = clampGrains(requested, currentExample, engine.bufferW, engine.bufferH);
    engine.setState({ sandAmount: next });
    syncGrainControls(next);
    return next;
  };
  const applyBufferSize = (w, h) => {
    engine.setBufferSize(w, h);
    syncBufferControls();
    applySandAmount(engine.state.sandAmount);
  };
  const applyExampleDefaults = (example) => {
    currentExample = example;
    if (example.defaults?.bufferSize) {
      applyBufferSize(example.defaults.bufferSize, example.defaults.bufferSize);
    } else {
      syncBufferControls();
      applySandAmount(engine.state.sandAmount);
    }
    if (example.defaults?.sandAmount) {
      applySandAmount(example.defaults.sandAmount);
    }
  };

  for (const ex of EXAMPLES) {
    const opt = document.createElement("option");
    opt.value = ex.name;
    opt.textContent = ex.name;
    select.appendChild(opt);
  }

  // editor
  const editor = createEditor(
    $("editor_host"),
    EXAMPLES[0].code,
    debounce((code) => {
      engine.setUserShader(code);
    }, 200)
  );

  await engine.setUserShader(EXAMPLES[0].code);
  applyExampleDefaults(currentExample);

  select.addEventListener("change", () => {
    const ex = EXAMPLES.find((e) => e.name === select.value);
    if (!ex) return;
    applyExampleDefaults(ex);
    editor.setValue(ex.code);
  });

  // controls
  bindColor($("bg_input"), $("bg_output"),
    () => engine.state.bgCol, (v) => engine.setState({ bgCol: v }));
  bindColor($("sand_input"), $("sand_output"),
    () => engine.state.sandCol, (v) => engine.setState({ sandCol: v }));
  bindRange($("size_input"), $("size_output"),
    () => engine.state.sandRadius, (v) => engine.setState({ sandRadius: v }));
  bindRange($("opacity_input"), $("opacity_output"),
    () => engine.state.sandOpacity, (v) => engine.setState({ sandOpacity: v }));
  bindRange(amountInput, amountOutput,
    () => engine.state.sandAmount, (v) => applySandAmount(v),
    (v) => Math.round(v).toString());

  bindNumber(bufferWInput,
    () => engine.bufferW, (v) => {
      applyBufferSize(v, engine.bufferH);
      return engine.bufferW;
    });
  bindNumber(bufferHInput,
    () => engine.bufferH, (v) => {
      applyBufferSize(engine.bufferW, v);
      return engine.bufferH;
    });

  // buttons
  $("btn_toggle").addEventListener("click", () => {
    engine.setState({ rendererActive: !engine.state.rendererActive });
    $("btn_toggle").textContent = engine.state.rendererActive
      ? "Pause"
      : "Resume";
  });
  $("btn_reset").addEventListener("click", () => engine.reset());
  $("btn_export").addEventListener("click", async () => {
    const blob = await engine.exportPNG();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sand-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  });

  // mouse interaction (canvas-relative)
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    engine.setState({
      mouseX: (e.clientX - r.left) / r.width,
      mouseY: (e.clientY - r.top) / r.height,
    });
    if (dragging) {
      const dx = (e.clientX - lastX) / r.width;
      const dy = (e.clientY - lastY) / r.height;
      engine.setState({
        viewTx: engine.state.viewTx + dx,
        viewTy: engine.state.viewTy + dy,
      });
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.001);
      const newScale = Math.max(0.1, Math.min(10, engine.state.viewScale * factor));
      engine.setState({ viewScale: newScale });
    },
    { passive: false }
  );
  $("btn_view_reset").addEventListener("click", () => {
    engine.setState({ viewTx: 0, viewTy: 0, viewScale: 1 });
  });

  scheduleFrame();
}

boot();
