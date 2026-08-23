/** Tiny DOM helper: el('button.btn.primary', { onclick }, 'Label') */
export function el(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node && k !== 'style') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function select(options, value, onchange) {
  const s = el('select', { onchange: (e) => onchange(e.target.value) });
  for (const [val, label] of Object.entries(options)) {
    s.append(el('option', { value: val, textContent: label, selected: val === value }));
  }
  return s;
}

export function slider(label, { min, max, value, step = 1 }, oninput) {
  const out = el('output', { textContent: value });
  const input = el('input', {
    type: 'range',
    min,
    max,
    step,
    value,
    oninput: (e) => {
      out.textContent = e.target.value;
      oninput(Number(e.target.value));
    },
  });
  return el('div.control', {}, el('label', { textContent: label }), input, out);
}

export function stat(label) {
  const value = el('strong', { textContent: '0' });
  const node = el('span.stat', {}, `${label}: `, value);
  node.set = (v) => (value.textContent = v);
  return node;
}
