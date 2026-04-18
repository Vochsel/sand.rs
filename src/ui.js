import { EditorView, basicSetup } from "codemirror";
import { rust } from "@codemirror/lang-rust";
import { EditorState, Compartment } from "@codemirror/state";

export function hexToRgb01(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export function rgb01ToHex([r, g, b]) {
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function bindRange(input, valueOut, getter, setter, format) {
  const sync = (raw) => {
    const next = setter(raw);
    const v = Number.isFinite(next) ? next : raw;
    input.value = v;
    valueOut.value = format ? format(v) : v.toFixed(4);
  };
  input.value = getter();
  valueOut.value = format ? format(getter()) : getter().toFixed(4);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    sync(v);
  });
  valueOut.addEventListener("change", () => {
    const v = parseFloat(valueOut.value);
    if (!isFinite(v)) return;
    sync(v);
  });
}

export function bindColor(input, valueOut, getter, setter) {
  const sync = () => {
    setter(hexToRgb01(input.value));
    valueOut.value = input.value;
  };
  input.value = rgb01ToHex(getter());
  valueOut.value = input.value;
  input.addEventListener("input", sync);
  valueOut.addEventListener("change", () => {
    if (!/^#[0-9a-f]{6}$/i.test(valueOut.value.trim())) return;
    input.value = valueOut.value.trim();
    setter(hexToRgb01(input.value));
  });
}

export function bindNumber(input, getter, setter) {
  input.value = getter();
  input.addEventListener("change", () => {
    const v = parseFloat(input.value);
    if (!isFinite(v) || v <= 0) return;
    const next = setter(v);
    if (Number.isFinite(next)) input.value = next;
  });
}

export function createEditor(parent, initial, onChange) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initial,
      extensions: [
        basicSetup,
        rust(),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
        }),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) onChange(v.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    view,
    setValue(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    getValue() {
      return view.state.doc.toString();
    },
  };
}

export function debounce(fn, ms) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
