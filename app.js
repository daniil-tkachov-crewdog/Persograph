const STORAGE_KEY = 'persograph_state_v1';
const COLORS = {
  family: '#3d7bff',
  friends: '#27b04b',
  work: '#f4cc2f',
  hobbies: '#8b48e6',
  enemies: '#dc3f3f'
};

const state = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  highlightedNodeId: null,
  highlightedPathNodeIds: [],
  panX: 0,
  panY: 0,
  scale: 1,
  showGrid: true,
  focusMode: false,
  degreeFilter: 0,
  theme: 'light',
  undoStack: [],
  redoStack: []
};

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('miniMap');
const miniCtx = mini.getContext('2d');
const tooltip = document.getElementById('tooltip');

let draggingNodeId = null;
let isPanning = false;
let lastX = 0;
let lastY = 0;

const serialize = () => JSON.stringify({
  nodes: state.nodes,
  edges: state.edges,
  theme: state.theme,
  showGrid: state.showGrid
});

function saveSnapshot() {
  state.undoStack.push(serialize());
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
}

function applySerialized(s) {
  const parsed = JSON.parse(s);
  state.nodes = parsed.nodes || [];
  state.edges = parsed.edges || [];
  state.theme = parsed.theme || 'light';
  state.showGrid = parsed.showGrid !== false;
  applyTheme();
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, serialize());
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applySerialized(saved);
  } else {
    const now = new Date().toISOString();
    state.nodes = [createNode('[000-000]', 0, 0, {
      name: 'Me',
      createdAt: now,
      updatedAt: now
    })];
  }
}

function createNode(number, x, y, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    number,
    x,
    y,
    vx: 0,
    vy: 0,
    fixed: number === '[000-000]',
    name: '',
    location: '',
    job: '',
    description: '',
    tags: '',
    priority: 'low',
    lastActivity: '',
    telegram: '',
    instagram: '',
    linkedIn: '',
    twitter: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function formatNumber(n) {
  return `[${String(Math.floor(n / 1000)).padStart(3, '0')}-${String(n % 1000).padStart(3, '0')}]`;
}

function renumberNodes() {
  const me = state.nodes.find(n => n.number === '[000-000]');
  const others = state.nodes.filter(n => n.number !== '[000-000]');
  others.sort((a, b) => a.number.localeCompare(b.number));
  others.forEach((n, i) => { n.number = formatNumber(i + 1); });
  state.nodes = me ? [me, ...others] : others;
}

function addHuman() {
  if (state.nodes.length > 999999) return alert('Node limit reached [999-999].');
  saveSnapshot();
  const idx = state.nodes.filter(n => n.number !== '[000-000]').length + 1;
  const n = createNode(formatNumber(idx), rand(-120, 120), rand(-90, 90), { name: `Human ${idx}` });
  state.nodes.push(n);
  state.selectedNodeId = n.id;
  persistLocal();
  openNodeModal(n.id);
}

function rand(a, b) { return a + Math.random() * (b - a); }

function edgeKey(a, b) { return [a, b].sort().join('::'); }

function upsertEdge(data) {
  if (data.nodeA === data.nodeB) return alert('Self-connections are not allowed.');
  const key = edgeKey(data.nodeA, data.nodeB);
  const existing = state.edges.find(e => e.key === key);
  if (existing) {
    existing.types = data.types;
    existing.direction = data.direction;
    existing.from = data.nodeA;
    existing.to = data.nodeB;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.edges.push({
      id: crypto.randomUUID(),
      key,
      from: data.nodeA,
      to: data.nodeB,
      direction: data.direction,
      types: data.types,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

function adjacency() {
  const map = new Map(state.nodes.map(n => [n.id, new Set()]));
  state.edges.forEach(e => {
    map.get(e.from)?.add(e.to);
    map.get(e.to)?.add(e.from);
  });
  return map;
}

function degreeInfo(nodeId) {
  const adj = adjacency();
  const levels = [new Set([nodeId])];
  for (let i = 0; i < 3; i++) {
    const next = new Set();
    for (const id of levels[i]) for (const nb of adj.get(id) || []) if (!levels.flatMap(s => [...s]).includes(nb)) next.add(nb);
    levels.push(next);
  }
  const names = set => [...set].map(id => state.nodes.find(n => n.id === id)?.name || 'Unknown').join(', ') || 'None';
  return {
    first: levels[1],
    second: levels[2],
    third: levels[3],
    text: `1st (${levels[1].size}): ${names(levels[1])}\n2nd (${levels[2].size}): ${names(levels[2])}\n3rd (${levels[3].size}): ${names(levels[3])}`
  };
}

function draw() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.showGrid) drawGrid();

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.scale, state.scale);

  const visibleNodes = filteredNodes();
  const visibleSet = new Set(visibleNodes.map(n => n.id));

  state.edges.forEach(e => {
    if (!visibleSet.has(e.from) || !visibleSet.has(e.to)) return;
    const a = nodeById(e.from), b = nodeById(e.to);
    drawEdge(a, b, e);
  });

  visibleNodes.forEach(n => drawNode(n));

  ctx.restore();
  drawMiniMap(visibleNodes);
}

function drawGrid() {
  const step = 40;
  ctx.strokeStyle = 'rgba(120,130,160,0.15)';
  ctx.lineWidth = 1;
  for (let x = (state.panX % step); x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = (state.panY % step); y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

function drawEdge(a, b, e) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const startX = a.x + ux * 18, startY = a.y + uy * 18;
  const endX = b.x - ux * 18, endY = b.y - uy * 18;

  if (e.direction === 'undirected') ctx.setLineDash([5, 5]);
  else ctx.setLineDash([]);

  if (e.types.length > 1) {
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    e.types.forEach((t, i) => {
      const p = i / e.types.length;
      grad.addColorStop(Math.max(0, p - 0.01), COLORS[t]);
      grad.addColorStop(Math.min(1, p + 0.01), COLORS[t]);
    });
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = COLORS[e.types[0] || 'friends'];
  }

  if (state.focusMode && state.selectedNodeId && e.from !== state.selectedNodeId && e.to !== state.selectedNodeId) ctx.globalAlpha = 0.2;
  else ctx.globalAlpha = 1;

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

  if (e.direction === 'directed') {
    drawArrow(endX, endY, ux, uy);
  } else if (e.direction === 'bidirectional') {
    drawArrow(endX, endY, ux, uy);
    drawArrow(startX, startY, -ux, -uy);
  }

  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

function drawArrow(x, y, ux, uy) {
  const size = 9;
  const px = -uy, py = ux;
  ctx.fillStyle = '#7f89a4';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size + px * size * 0.6, y - uy * size + py * size * 0.6);
  ctx.lineTo(x - ux * size - px * size * 0.6, y - uy * size - py * size * 0.6);
  ctx.closePath();
  ctx.fill();
}

function drawNode(n) {
  let alpha = 1;
  if (state.focusMode && state.selectedNodeId && n.id !== state.selectedNodeId) alpha = 0.25;
  if (state.highlightedPathNodeIds.length && !state.highlightedPathNodeIds.includes(n.id)) alpha = 0.2;
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.fillStyle = n.id === state.selectedNodeId ? '#ffb347' : n.id === state.highlightedNodeId ? '#8ad1ff' : '#ffffff';
  if (state.theme === 'dark') ctx.fillStyle = n.id === state.selectedNodeId ? '#ffb347' : n.id === state.highlightedNodeId ? '#68a8d7' : '#252d3b';
  ctx.strokeStyle = '#5e6f91';
  ctx.lineWidth = n.number === '[000-000]' ? 4 : 2;
  ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.theme === 'dark' ? '#edf2ff' : '#20273b';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(n.number, n.x, n.y + 33);
  ctx.fillText(n.name || 'Unnamed', n.x, n.y - 24);
  ctx.globalAlpha = 1;
}

function drawMiniMap(visibleNodes) {
  const show = state.nodes.length > 30 && state.scale < 0.7;
  mini.classList.toggle('hidden', !show);
  if (!show) return;

  mini.width = mini.clientWidth;
  mini.height = mini.clientHeight;
  miniCtx.clearRect(0, 0, mini.width, mini.height);

  const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
  const minX = Math.min(...xs, -100), maxX = Math.max(...xs, 100);
  const minY = Math.min(...ys, -100), maxY = Math.max(...ys, 100);
  const w = maxX - minX || 1, h = maxY - minY || 1;

  const mapX = x => ((x - minX) / w) * mini.width;
  const mapY = y => ((y - minY) / h) * mini.height;

  state.edges.forEach(e => {
    const a = nodeById(e.from), b = nodeById(e.to);
    miniCtx.strokeStyle = 'rgba(140,150,170,0.5)';
    miniCtx.beginPath(); miniCtx.moveTo(mapX(a.x), mapY(a.y)); miniCtx.lineTo(mapX(b.x), mapY(b.y)); miniCtx.stroke();
  });

  state.nodes.forEach(n => {
    miniCtx.fillStyle = visibleNodes.includes(n) ? '#4e6ef2' : '#888';
    miniCtx.beginPath(); miniCtx.arc(mapX(n.x), mapY(n.y), 2.7, 0, Math.PI * 2); miniCtx.fill();
  });
}

function filteredNodes() {
  let nodes = state.nodes;
  if (state.degreeFilter > 0 && state.selectedNodeId) {
    const allowed = nodesWithinDegree(state.selectedNodeId, state.degreeFilter);
    nodes = nodes.filter(n => allowed.has(n.id));
  }
  return nodes;
}

function nodesWithinDegree(startId, maxDepth) {
  const adj = adjacency();
  const seen = new Set([startId]);
  let frontier = new Set([startId]);
  for (let d = 0; d < maxDepth; d++) {
    const next = new Set();
    frontier.forEach(id => (adj.get(id) || new Set()).forEach(nb => { if (!seen.has(nb)) next.add(nb); }));
    next.forEach(id => seen.add(id));
    frontier = next;
  }
  return seen;
}

function tickPhysics() {
  const repulsion = 1200;
  const spring = 0.003;
  const springLen = 120;

  for (const n of state.nodes) {
    if (n.fixed) continue;
    n.vx *= 0.92; n.vy *= 0.92;
  }

  for (let i = 0; i < state.nodes.length; i++) {
    for (let j = i + 1; j < state.nodes.length; j++) {
      const a = state.nodes[i], b = state.nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx * dx + dy * dy + 0.01;
      let f = repulsion / d2;
      const d = Math.sqrt(d2);
      dx /= d; dy /= d;
      if (!a.fixed) { a.vx -= dx * f; a.vy -= dy * f; }
      if (!b.fixed) { b.vx += dx * f; b.vy += dy * f; }
    }
  }

  state.edges.forEach(e => {
    const a = nodeById(e.from), b = nodeById(e.to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const force = (d - springLen) * spring;
    const ux = dx / d, uy = dy / d;
    if (!a.fixed) { a.vx += ux * force; a.vy += uy * force; }
    if (!b.fixed) { b.vx -= ux * force; b.vy -= uy * force; }
  });

  for (const n of state.nodes) {
    if (n.fixed || n.id === draggingNodeId) continue;
    n.x += n.vx;
    n.y += n.vy;
  }
}

function loop() {
  tickPhysics();
  draw();
  requestAnimationFrame(loop);
}

function nodeById(id) { return state.nodes.find(n => n.id === id); }

function screenToWorld(x, y) {
  return { x: (x - state.panX) / state.scale, y: (y - state.panY) / state.scale };
}

function hitNode(x, y) {
  const p = screenToWorld(x, y);
  return [...state.nodes].reverse().find(n => Math.hypot(n.x - p.x, n.y - p.y) < 20);
}

function distToSegment(p, a, b) {
  const l2 = (b.x-a.x)**2 + (b.y-a.y)**2;
  if (l2 === 0) return Math.hypot(p.x-a.x,p.y-a.y);
  let t = ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;
  t = Math.max(0,Math.min(1,t));
  return Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y)));
}

function hitEdge(x, y) {
  const p = screenToWorld(x, y);
  return state.edges.find(e => distToSegment(p, nodeById(e.from), nodeById(e.to)) < 7 / state.scale);
}

canvas.addEventListener('mousedown', (ev) => {
  const n = hitNode(ev.offsetX, ev.offsetY);
  if (n) {
    state.selectedNodeId = n.id;
    if (!n.fixed) draggingNodeId = n.id;
  } else {
    const edge = hitEdge(ev.offsetX, ev.offsetY);
    if (edge) openEdgeModal(edge.id);
    isPanning = true;
  }
  lastX = ev.clientX; lastY = ev.clientY;
});

canvas.addEventListener('mousemove', (ev) => {
  const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
  lastX = ev.clientX; lastY = ev.clientY;

  if (draggingNodeId) {
    const n = nodeById(draggingNodeId);
    const p = screenToWorld(ev.offsetX, ev.offsetY);
    n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0;
  } else if (isPanning) {
    state.panX += dx; state.panY += dy;
  } else {
    const edge = hitEdge(ev.offsetX, ev.offsetY);
    if (edge) {
      const a = nodeById(edge.from), b = nodeById(edge.to);
      tooltip.classList.remove('hidden');
      tooltip.style.left = `${ev.offsetX + 14}px`;
      tooltip.style.top = `${ev.offsetY + 14}px`;
      tooltip.textContent = `${a.name || a.number} ↔ ${b.name || b.number} | ${edge.types.join(', ')} | ${edge.direction}`;
    } else {
      tooltip.classList.add('hidden');
    }
  }
});

window.addEventListener('mouseup', () => { draggingNodeId = null; isPanning = false; persistLocal(); });
canvas.addEventListener('dblclick', (ev) => {
  const n = hitNode(ev.offsetX, ev.offsetY);
  if (n) openNodeModal(n.id);
});
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const factor = ev.deltaY > 0 ? 0.92 : 1.08;
  state.scale = Math.max(0.2, Math.min(3, state.scale * factor));
}, { passive: false });

function resizeCanvas() {
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
}

function openNodeModal(id) {
  const n = nodeById(id);
  if (!n) return;
  const d = degreeInfo(id);
  document.getElementById('nodeId').value = n.id;
  document.getElementById('nodeNumber').value = n.number;
  document.getElementById('nodeName').value = n.name;
  document.getElementById('nodeLocation').value = n.location;
  document.getElementById('nodeJob').value = n.job;
  document.getElementById('nodeDescription').value = n.description;
  document.getElementById('nodeTags').value = n.tags;
  document.getElementById('nodePriority').value = n.priority;
  document.getElementById('nodeLastActivity').value = n.lastActivity;
  document.getElementById('nodeTelegram').value = n.telegram;
  document.getElementById('nodeInstagram').value = n.instagram;
  document.getElementById('nodeLinkedIn').value = n.linkedIn;
  document.getElementById('nodeTwitter').value = n.twitter;
  document.getElementById('degreeInfo').textContent = d.text;
  document.getElementById('timestamps').textContent = `Created: ${new Date(n.createdAt).toLocaleString()} | Updated: ${new Date(n.updatedAt).toLocaleString()}`;
  document.getElementById('nodeModal').showModal();
}

function populateNodeSelect(select, selectedId) {
  select.innerHTML = '';
  state.nodes.forEach(n => {
    const o = document.createElement('option');
    o.value = n.id;
    o.textContent = `${n.number} - ${n.name || 'Unnamed'}`;
    if (n.id === selectedId) o.selected = true;
    select.appendChild(o);
  });
}

function openEdgeModal(edgeId = null) {
  const modal = document.getElementById('edgeModal');
  const edge = state.edges.find(e => e.id === edgeId);
  document.getElementById('edgeId').value = edge?.id || '';
  populateNodeSelect(document.getElementById('edgeNodeA'), edge?.from || state.nodes[0]?.id);
  populateNodeSelect(document.getElementById('edgeNodeB'), edge?.to || state.nodes[1]?.id || state.nodes[0]?.id);
  const types = document.getElementById('edgeTypes');
  [...types.options].forEach(o => o.selected = edge ? edge.types.includes(o.value) : false);
  document.getElementById('edgeDirection').value = edge?.direction || 'undirected';
  document.getElementById('deleteEdgeBtn').style.visibility = edge ? 'visible' : 'hidden';
  modal.showModal();
}

function deleteSelectedNode() {
  if (!state.selectedNodeId) return alert('Select a node first.');
  const n = nodeById(state.selectedNodeId);
  if (!n) return;
  if (n.number === '[000-000]') return alert('You cannot delete [000-000].');
  if (!confirm(`Delete ${n.name || n.number}?`)) return;

  saveSnapshot();
  state.nodes = state.nodes.filter(x => x.id !== n.id);
  state.edges = state.edges.filter(e => e.from !== n.id && e.to !== n.id);
  renumberNodes();
  state.selectedNodeId = null;
  persistLocal();
}

function searchNode() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) return;
  const match = state.nodes.find(n => `${n.number} ${n.name} ${n.location} ${n.job} ${n.description} ${n.tags} ${n.lastActivity} ${n.telegram} ${n.instagram} ${n.linkedIn} ${n.twitter}`.toLowerCase().includes(q));
  if (!match) return alert('No matching human found.');
  state.highlightedNodeId = match.id;
  state.selectedNodeId = match.id;
  state.panX = canvas.width / 2 - match.x * state.scale;
  state.panY = canvas.height / 2 - match.y * state.scale;
}

function exportJSON() {
  const blob = new Blob([serialize()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `persograph-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      saveSnapshot();
      applySerialized(reader.result);
      persistLocal();
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

function applyTheme() {
  const root = document.getElementById('app');
  root.classList.toggle('theme-dark', state.theme === 'dark');
  root.classList.toggle('theme-light', state.theme !== 'dark');
}

function shortestPath(from, to) {
  const adj = adjacency();
  const q = [from];
  const prev = new Map([[from, null]]);
  while (q.length) {
    const v = q.shift();
    if (v === to) break;
    for (const nb of adj.get(v) || []) if (!prev.has(nb)) { prev.set(nb, v); q.push(nb); }
  }
  if (!prev.has(to)) return null;
  const path = [];
  for (let at = to; at; at = prev.get(at)) path.push(at);
  return path.reverse();
}

function openPathModal() {
  populateNodeSelect(document.getElementById('pathFrom'), state.selectedNodeId || state.nodes[0]?.id);
  populateNodeSelect(document.getElementById('pathTo'), state.nodes[state.nodes.length - 1]?.id);
  document.getElementById('pathResult').textContent = '';
  document.getElementById('pathModal').showModal();
}

document.getElementById('nodeForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  saveSnapshot();
  const n = nodeById(document.getElementById('nodeId').value);
  n.name = document.getElementById('nodeName').value.trim();
  if (!n.name) return alert('Name is required.');
  n.location = document.getElementById('nodeLocation').value.trim();
  n.job = document.getElementById('nodeJob').value.trim();
  n.description = document.getElementById('nodeDescription').value.trim();
  n.tags = document.getElementById('nodeTags').value.trim();
  n.priority = document.getElementById('nodePriority').value;
  n.lastActivity = document.getElementById('nodeLastActivity').value.trim();
  n.telegram = document.getElementById('nodeTelegram').value.trim();
  n.instagram = document.getElementById('nodeInstagram').value.trim();
  n.linkedIn = document.getElementById('nodeLinkedIn').value.trim();
  n.twitter = document.getElementById('nodeTwitter').value.trim();
  n.updatedAt = new Date().toISOString();
  persistLocal();
  document.getElementById('nodeModal').close();
});

document.getElementById('edgeForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nodeA = document.getElementById('edgeNodeA').value;
  const nodeB = document.getElementById('edgeNodeB').value;
  const types = [...document.getElementById('edgeTypes').selectedOptions].map(o => o.value);
  if (!types.length) return alert('Select at least one relation type.');
  saveSnapshot();
  upsertEdge({ nodeA, nodeB, direction: document.getElementById('edgeDirection').value, types });
  persistLocal();
  document.getElementById('edgeModal').close();
});

document.getElementById('pathForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const from = document.getElementById('pathFrom').value;
  const to = document.getElementById('pathTo').value;
  const path = shortestPath(from, to);
  const out = document.getElementById('pathResult');
  if (!path) {
    out.textContent = 'No path found.';
    state.highlightedPathNodeIds = [];
  } else {
    state.highlightedPathNodeIds = path;
    out.textContent = path.map(id => nodeById(id)?.name || nodeById(id)?.number).join(' → ');
  }
});

document.getElementById('closeNodeModal').onclick = () => document.getElementById('nodeModal').close();
document.getElementById('closeEdgeModal').onclick = () => document.getElementById('edgeModal').close();
document.getElementById('closePathModal').onclick = () => document.getElementById('pathModal').close();
document.getElementById('deleteEdgeBtn').onclick = () => {
  const id = document.getElementById('edgeId').value;
  if (!id) return;
  saveSnapshot();
  state.edges = state.edges.filter(e => e.id !== id);
  persistLocal();
  document.getElementById('edgeModal').close();
};

document.getElementById('addHumanBtn').onclick = addHuman;
document.getElementById('deleteHumanBtn').onclick = deleteSelectedNode;
document.getElementById('searchBtn').onclick = searchNode;
document.getElementById('addConnectionBtn').onclick = () => openEdgeModal();
document.getElementById('pathBtn').onclick = openPathModal;
document.getElementById('resetViewBtn').onclick = () => { state.panX = canvas.width / 2; state.panY = canvas.height / 2; state.scale = 1; };
document.getElementById('exportBtn').onclick = exportJSON;
document.getElementById('importInput').onchange = (ev) => ev.target.files[0] && importJSON(ev.target.files[0]);

document.getElementById('undoBtn').onclick = () => {
  if (!state.undoStack.length) return;
  state.redoStack.push(serialize());
  applySerialized(state.undoStack.pop());
  persistLocal();
};
document.getElementById('redoBtn').onclick = () => {
  if (!state.redoStack.length) return;
  state.undoStack.push(serialize());
  applySerialized(state.redoStack.pop());
  persistLocal();
};

document.getElementById('themeBtn').onclick = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  persistLocal();
};

document.getElementById('gridBtn').onclick = (ev) => {
  state.showGrid = !state.showGrid;
  ev.target.textContent = `Grid: ${state.showGrid ? 'On' : 'Off'}`;
  persistLocal();
};

document.getElementById('focusToggle').onchange = (ev) => { state.focusMode = ev.target.checked; };
document.getElementById('degreeFilter').oninput = (ev) => {
  state.degreeFilter = Number(ev.target.value);
  document.getElementById('degreeLabel').textContent = String(state.degreeFilter);
};

loadState();
applyTheme();
document.getElementById('gridBtn').textContent = `Grid: ${state.showGrid ? 'On' : 'Off'}`;
state.panX = window.innerWidth * 0.35;
state.panY = window.innerHeight * 0.5;
loop();
