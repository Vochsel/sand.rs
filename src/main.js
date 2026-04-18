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

  // populate examples select
  const select = $("examples_select");
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
      engine.setUserShader(code).then((ok) => {
        if (ok) engine.reset();
      });
    }, 200)
  );

  await engine.setUserShader(EXAMPLES[0].code);

  select.addEventListener("change", () => {
    const ex = EXAMPLES.find((e) => e.name === select.value);
    if (!ex) return;
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
  bindRange($("amount_input"), $("amount_output"),
    () => engine.state.sandAmount, (v) => engine.setState({ sandAmount: Math.round(v) }),
    (v) => Math.round(v).toString());

  bindNumber($("buffer_w"),
    () => engine.bufferW, (v) => engine.setBufferSize(v, engine.bufferH));
  bindNumber($("buffer_h"),
    () => engine.bufferH, (v) => engine.setBufferSize(engine.bufferW, v));

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

  // render loop
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    engine.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
