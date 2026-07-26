/* Daycare Case File app
   Data model lives entirely in one JSON object (window.STATE), loaded from
   data.json (or a file the user opens) and optionally saved back to disk. */

let STATE = null;
let fileHandle = null; // File System Access API handle, when available

const els = {
  weightsPanel: document.getElementById('weights-panel'),
  cardList: document.getElementById('card-list'),
  cardTemplate: document.getElementById('card-template'),
  resultsCount: document.getElementById('results-count'),
  fileStatus: document.getElementById('file-status'),
  btnOpen: document.getElementById('btn-open'),
  btnSave: document.getElementById('btn-save'),
  btnDownload: document.getElementById('btn-download'),
  btnAdd: document.getElementById('btn-add'),
  fileInput: document.getElementById('file-input'),
};

const SUPPORTS_FS_ACCESS = 'showOpenFilePicker' in window;

init();

async function init() {
  attachGlobalHandlers();
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    STATE = await res.json();
    els.fileStatus.textContent = 'Showing bundled data.json (open your own to edit & save in place)';
  } catch (err) {
    els.fileStatus.textContent = 'Could not load data.json automatically - use "Open data file..."';
    STATE = emptyState();
  }
  render();
}

function emptyState() {
  return {
    meta: { title: 'Daycare Ranking', lastUpdated: '', home: '', work: '' },
    weights: { commute: 5, reviews: 5, inspection: 4, mccyn: 3, price: 3, hours: 2, avail: 3 },
    factorLabels: {
      commute: 'Commute ease', reviews: 'Parent reviews', inspection: 'Inspection history',
      mccyn: 'MCCYN / quality tier', price: 'Price fit', hours: 'Hours fit', avail: 'Infant availability',
    },
    daycares: [],
  };
}

/* ---------------- File handling ---------------- */

function attachGlobalHandlers() {
  els.btnOpen.addEventListener('click', openDataFile);
  els.btnSave.addEventListener('click', saveDataFile);
  els.btnDownload.addEventListener('click', downloadDataFile);
  els.btnAdd.addEventListener('click', addDaycare);
  els.fileInput.addEventListener('change', handleFileInputFallback);
}

async function openDataFile() {
  if (SUPPORTS_FS_ACCESS) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON data file', accept: { 'application/json': ['.json'] } }],
      });
      fileHandle = handle;
      const file = await handle.getFile();
      STATE = JSON.parse(await file.text());
      els.fileStatus.textContent = `Editing: ${file.name} (saves write directly to this file)`;
      els.btnSave.disabled = false;
      render();
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  } else {
    els.fileInput.click();
  }
}

function handleFileInputFallback(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    STATE = JSON.parse(reader.result);
    els.fileStatus.textContent = `Editing: ${file.name} (this browser can't save in place - use "Download updated file")`;
    render();
  };
  reader.readAsText(file);
}

async function saveDataFile() {
  if (!fileHandle) return;
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(STATE, null, 2));
    await writable.close();
    flashStatus('Saved.');
  } catch (err) {
    console.error(err);
    flashStatus('Could not save - try "Download updated file" instead.');
  }
}

function downloadDataFile() {
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
  flashStatus('Downloaded - replace data.json in your project folder and commit.');
}

function flashStatus(msg) {
  const prev = els.fileStatus.textContent;
  els.fileStatus.textContent = msg;
  setTimeout(() => { els.fileStatus.textContent = prev; }, 2500);
}

/* ---------------- Weighted score ---------------- */

function computeTotal(daycare) {
  const factors = Object.keys(STATE.weights);
  let wsum = 0, ssum = 0;
  factors.forEach((f) => {
    const w = Number(STATE.weights[f]) || 0;
    const s = daycare.scores[f];
    if (s !== null && s !== undefined && s !== '') {
      wsum += w;
      ssum += w * Number(s);
    }
  });
  return wsum === 0 ? null : ssum / wsum;
}

/* ---------------- Rendering ---------------- */

function render() {
  renderWeights();
  renderCards();
}

function renderWeights() {
  els.weightsPanel.innerHTML = '';
  Object.keys(STATE.weights).forEach((key) => {
    const row = document.createElement('div');
    row.className = 'weight-row';
    row.innerHTML = `
      <div class="weight-row-label">
        <span>${STATE.factorLabels[key] || key}</span>
        <span data-out="${key}">${STATE.weights[key]}</span>
      </div>
      <input type="range" min="0" max="5" step="1" value="${STATE.weights[key]}" data-key="${key}">
    `;
    els.weightsPanel.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => {
      STATE.weights[key] = Number(e.target.value);
      row.querySelector(`[data-out="${key}"]`).textContent = e.target.value;
      renderCards();
    });
  });
}

function renderCards() {
  const ranked = STATE.daycares
    .map((d) => ({ d, total: computeTotal(d) }))
    .sort((a, b) => {
      if (a.total === null) return 1;
      if (b.total === null) return -1;
      return b.total - a.total;
    });

  els.resultsCount.textContent = `${STATE.daycares.length} candidate${STATE.daycares.length === 1 ? '' : 's'}`;
  els.cardList.innerHTML = '';

  ranked.forEach(({ d, total }, i) => {
    const node = els.cardTemplate.content.cloneNode(true);
    const card = node.querySelector('.card');
    card.dataset.id = d.id;
    if (i === 0 && total !== null) card.classList.add('is-top');

    node.querySelector('.rank-num').textContent = i + 1;
    node.querySelector('.card-name').textContent = d.name;
    node.querySelector('.card-address').textContent = d.address;
    node.querySelector('.chip-trip').textContent = d.tripTime || 'trip time unknown';
    node.querySelector('.chip-total').textContent = total === null ? 'unscored' : `${total.toFixed(1)} / 5`;

    const tagPreview = node.querySelector('.card-tags-preview');
    (d.tags || []).slice(0, 3).forEach((t) => {
      const span = document.createElement('span');
      span.className = 'tag-pill';
      span.textContent = t;
      tagPreview.appendChild(span);
    });

    // Toggle open/close
    node.querySelector('.card-summary').addEventListener('click', (e) => {
      card.classList.toggle('is-open');
    });

    // Maps link
    const mapsLink = node.querySelector('.maps-link');
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + ' ' + d.address)}`;
    node.querySelector('.detail-address').textContent = d.address;
    node.querySelector('.detail-phone').textContent = d.phone ? `Phone: ${d.phone}` : '';

    // Trip time input
    const tripInput = node.querySelector('.trip-input');
    tripInput.value = d.tripTime || '';
    tripInput.addEventListener('input', (e) => { d.tripTime = e.target.value; renderCards(); });

    // Scores
    const scoresGrid = node.querySelector('.scores-grid');
    Object.keys(STATE.weights).forEach((key) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      const label = STATE.factorLabels[key] || key;
      const val = d.scores[key];
      row.innerHTML = `
        <label>${label}</label>
        <select data-key="${key}">
          <option value="">–</option>
          ${[1,2,3,4,5].map(v => `<option value="${v}" ${String(val)===String(v)?'selected':''}>${v}</option>`).join('')}
        </select>
      `;
      row.querySelector('select').addEventListener('change', (e) => {
        d.scores[key] = e.target.value === '' ? null : Number(e.target.value);
        renderCards();
      });
      scoresGrid.appendChild(row);
    });
    node.querySelector('.detail-total-inline').textContent = total === null ? '' : `= ${total.toFixed(2)} weighted`;

    // Reviews
    const reviewsList = node.querySelector('.reviews-list');
    (d.reviews || []).forEach((r) => {
      const li = document.createElement('li');
      const linkHtml = r.url
        ? `<a href="${r.url}" target="_blank" rel="noopener">${r.source} &rarr;</a><br>`
        : `<strong>${r.source}</strong><br>`;
      li.innerHTML = `${linkHtml}${r.note || ''}`;
      reviewsList.appendChild(li);
    });
    node.querySelector('.inspection-note').textContent = d.inspectionNote || '';

    // Tags editor
    const tagChips = node.querySelector('.tag-chips');
    function renderTagChips() {
      tagChips.innerHTML = '';
      (d.tags || []).forEach((t, idx) => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill-editable';
        pill.innerHTML = `${t} <button aria-label="Remove tag">&times;</button>`;
        pill.querySelector('button').addEventListener('click', () => {
          d.tags.splice(idx, 1);
          renderTagChips();
          renderCards();
        });
        tagChips.appendChild(pill);
      });
    }
    renderTagChips();
    const tagInput = node.querySelector('.tag-input');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        d.tags = d.tags || [];
        d.tags.push(tagInput.value.trim());
        tagInput.value = '';
        renderTagChips();
      }
    });

    // Notes
    const notesArea = node.querySelector('.notes-textarea');
    notesArea.value = d.notes || '';
    notesArea.addEventListener('input', (e) => { d.notes = e.target.value; });

    // Remove
    node.querySelector('.btn-remove').addEventListener('click', () => {
      if (confirm(`Remove ${d.name} from your list?`)) {
        STATE.daycares = STATE.daycares.filter((x) => x.id !== d.id);
        renderCards();
      }
    });

    els.cardList.appendChild(node);
  });
}

function addDaycare() {
  const name = prompt('Daycare name?');
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  STATE.daycares.push({
    id, name,
    address: '', phone: '', tripTime: '',
    scores: Object.fromEntries(Object.keys(STATE.weights).map((k) => [k, null])),
    reviews: [], inspectionNote: '', tags: [], notes: '',
  });
  renderCards();
}
