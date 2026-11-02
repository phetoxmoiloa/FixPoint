// FixPoint: navigation, validation, forms (AJAX), accordion, catalogue, reveal animations.
const CONTACT_RECIPIENT = 'hello@fixpoint.example'; // change to a real inbox to test the email feature

const CATALOGUE = [ // dynamic content source (illustrative prices in rand)
  {name:'Screen assessment', device:'Phone', price:150, desc:'Inspect cracked or unresponsive displays and quote a replacement.'},
  {name:'Battery health check', device:'Phone', price:100, desc:'Test battery capacity and charging behaviour.'},
  {name:'Charging port inspection', device:'Phone', price:120, desc:'Diagnose loose, dirty or damaged charging ports.'},
  {name:'Laptop diagnostics', device:'Laptop', price:250, desc:'Startup, performance and hardware symptom review.'},
  {name:'Storage upgrade advice', device:'Laptop', price:180, desc:'Recommend and plan an SSD or storage upgrade.'},
  {name:'Overheating check', device:'Laptop', price:200, desc:'Check fans, vents and thermal performance.'},
  {name:'Tablet display assessment', device:'Tablet', price:150, desc:'Assess display damage and touch faults.'},
  {name:'Device setup help', device:'Tablet', price:180, desc:'Guided setup, settings and device care advice.'}
];

document.addEventListener('DOMContentLoaded', () => {
  // Mobile navigation
  const menuButton = document.querySelector('.menu-toggle'), navigation = document.querySelector('.main-nav');
  if (menuButton && navigation) menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuButton.textContent = open ? '×' : '☰';
  });

  // Scroll reveal animation
  const targets = document.querySelectorAll('.feature-card,.price-card,.service-row,.contact-info article');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.15}) : null;
  targets.forEach(t => { if (io) { t.classList.add('reveal'); io.observe(t); } });

  // Accordion
  document.querySelectorAll('.acc-btn').forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true', panel = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', String(!open)); panel.hidden = open; btn.lastElementChild.textContent = open ? '+' : '−';
  }));

  // Catalogue: dynamic render + search + filter + sort
  const list = document.querySelector('#cat-list');
  if (list) {
    const q = document.querySelector('#cat-search'), d = document.querySelector('#cat-device'), s = document.querySelector('#cat-sort'), count = document.querySelector('#cat-count');
    const render = () => {
      const term = q.value.trim().toLowerCase();
      let items = CATALOGUE.filter(i => (d.value === 'all' || i.device === d.value) && (i.name + i.desc).toLowerCase().includes(term));
      items.sort((a, b) => s.value === 'low' ? a.price - b.price : s.value === 'high' ? b.price - a.price : a.name.localeCompare(b.name));
      list.replaceChildren(...items.map(i => {
        const el = document.createElement('article'); el.className = 'price-card';
        el.innerHTML = `<p class="eyebrow">${i.device.toUpperCase()}</p><h3>${i.name}</h3><p class="price">R${i.price} <small>/ illustrative</small></p><p>${i.desc}</p><a class="button button-outline" href="enquiry.html?service=${encodeURIComponent(i.name)}">Enquire</a>`;
        return el;
      }));
      count.textContent = items.length ? `${items.length} repair${items.length > 1 ? 's' : ''} found` : 'No repairs match your search.';
    };
    [q, d, s].forEach(c => c.addEventListener('input', render)); render();
  }

  // Validation helpers
  const showError = (f, msg) => {
    let e = f.parentElement.querySelector('.field-error');
    if (!e) { e = document.createElement('span'); e.className = 'field-error'; e.id = f.id + '-err'; f.parentElement.appendChild(e); }
    e.textContent = msg; f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', e.id);
  };
  const clearError = f => { f.removeAttribute('aria-invalid'); const e = f.parentElement.querySelector('.field-error'); if (e) e.remove(); };
  const validate = form => {
    let ok = true, first = null;
    form.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(f => {
      clearError(f); const v = f.value.trim(); let m = '';
      if (f.type === 'checkbox') { if (f.required && !f.checked) m = 'Please tick this box to continue.'; }
      else if (f.required && !v) m = 'This field is required.';
      else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = 'Enter a valid email address.';
      else if (v && f.type === 'tel' && !/^(\+27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(v)) m = 'Enter a valid South African number, e.g. 071 234 5678.';
      else if (v && f.minLength > 0 && v.length < f.minLength) m = `Please enter at least ${f.minLength} characters.`;
      if (m) { showError(f, m); ok = false; first = first || f; }
    });
    if (first) first.focus(); return ok;
  };
  document.querySelectorAll('form').forEach(f => f.addEventListener('input', e => clearError(e.target)));

  // AJAX submission (works with Netlify Forms once deployed; fails gracefully elsewhere)
  const ajax = async form => {
    try {
      const r = await fetch('/', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(new FormData(form)).toString()});
      return r.ok;
    } catch { return false; }
  };

  // Enquiry form: validate, submit via AJAX, show estimate
  const enquiry = document.querySelector('#booking-form');
  if (enquiry) {
    const pre = new URLSearchParams(location.search).get('service'), note = document.querySelector('#details');
    if (pre && note) note.value = `I would like to enquire about: ${pre}. `;
    enquiry.addEventListener('submit', async e => {
      e.preventDefault(); if (!validate(enquiry)) return;
      const base = {'Screen or display issue':600,'Battery or charging issue':350,'Software or performance issue':180,'Diagnostics / not sure':150,'Other':150}[enquiry.service.value];
      const mult = {Smartphone:1, Tablet:1.2, Laptop:1.5, Other:1.3}[enquiry.device.value];
      const low = Math.round(base * mult / 10) * 10, high = Math.round(low * 1.6 / 10) * 10;
      const slot = new Date(); let add = 1; slot.setDate(slot.getDate() + 1);
      while (slot.getDay() === 0 || slot.getDay() === 6) slot.setDate(slot.getDate() + 1);
      const sent = await ajax(enquiry);
      const box = document.querySelector('#enquiry-result');
      box.innerHTML = `<h3>Thanks, ${enquiry.name.value.trim().split(' ')[0]}.</h3><p>Estimated cost for your ${enquiry.device.value.toLowerCase()}: <b>R${low} – R${high}</b> (illustrative; final price follows assessment).</p><p>Earliest assessment slot: <b>${slot.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}</b>.</p><p><small>${sent ? 'Your enquiry was submitted.' : 'Demonstration mode: the enquiry was validated but not transmitted.'}</small></p>`;
      box.hidden = false; enquiry.reset();
    });
  }

  // Contact form: validate, compile an email the visitor can send
  const contact = document.querySelector('#contact-form');
  if (contact) contact.addEventListener('submit', e => {
    e.preventDefault(); if (!validate(contact)) return;
    const body = `Name: ${contact.name.value}\nEmail: ${contact.email.value}\nTopic: ${contact.subject.value}\n\n${contact.message.value}`;
    const href = `mailto:${CONTACT_RECIPIENT}?subject=${encodeURIComponent('FixPoint enquiry: ' + contact.subject.value)}&body=${encodeURIComponent(body)}`;
    const box = document.querySelector('#contact-result');
    box.innerHTML = `<h3>Your email is ready.</h3><p>Review it, then send it from your email app.</p><pre></pre><a class="button button-primary" href="${href}">Send email to ${CONTACT_RECIPIENT}</a>`;
    box.querySelector('pre').textContent = body; box.hidden = false;
  });
});

// Lightbox gallery and Leaflet map
document.addEventListener('DOMContentLoaded', () => {
  const items = [...document.querySelectorAll('.gallery-item')], box = document.querySelector('#lightbox');
  if (items.length && box) {
    let i = 0; const img = box.querySelector('#lb-img'), cap = box.querySelector('#lb-cap');
    const show = n => { i = (n + items.length) % items.length; img.src = items[i].dataset.full; img.alt = items[i].querySelector('img').alt; cap.textContent = items[i].dataset.caption; };
    items.forEach((it, n) => it.addEventListener('click', () => { show(n); box.showModal(); }));
    box.querySelector('#lb-close').addEventListener('click', () => box.close());
    box.querySelector('#lb-prev').addEventListener('click', () => show(i - 1));
    box.querySelector('#lb-next').addEventListener('click', () => show(i + 1));
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  }
  const mapEl = document.querySelector('#map');
  if (mapEl && window.L) {
    const branches = [['FixPoint Hatfield, Pretoria', -25.7487, 28.2380], ['FixPoint Centurion', -25.8603, 28.1894], ['FixPoint Rosebank, Johannesburg', -26.1467, 28.0436]];
    const map = L.map(mapEl).setView([-25.95, 28.15], 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '© OpenStreetMap contributors'}).addTo(map);
    const pts = branches.map(([n, la, lo]) => { L.marker([la, lo]).addTo(map).bindPopup(n); return [la, lo]; });
    map.fitBounds(pts, {padding: [40, 40]});
  } else if (mapEl) mapEl.textContent = 'The map could not load. Please use the branch list below.';
});
