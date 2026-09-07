/* ============================================================
   ФИТНЕС 100 — интерактив лендинга
   Данные клуба вынесены в CLUB — правьте только этот блок.
   ============================================================ */

const CLUB = {
  phone: '+7 (700) 000-00-00',
  whatsapp: '77000000000', // номер для wa.me, только цифры

  schedule: {
    'Пн': [
      { time: '07:30', name: 'Утренний функционал', desc: 'Круговая, 45 мин', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '10:00', name: 'Йога-флоу', desc: 'Мягкая практика', coach: 'Мадина С.', zone: 'Студия' },
      { time: '12:30', name: 'Сайкл 45', desc: 'Интервалы на выносливость', coach: 'Ержан Т.', zone: 'Сайкл-зал' },
      { time: '18:00', name: 'HIIT 100', desc: 'Высокая интенсивность', coach: 'Данияр А.', zone: 'Зал 2' },
      { time: '19:00', name: 'Бокс: база', desc: 'Техника для новичков', coach: 'Руслан М.', zone: 'Ринг' },
      { time: '20:15', name: 'Стретчинг', desc: 'Растяжка и мобильность', coach: 'Мадина С.', zone: 'Студия' }
    ],
    'Вт': [
      { time: '08:00', name: 'Сила: низ тела', desc: 'Присед и тяга', coach: 'Данияр А.', zone: 'Силовая' },
      { time: '11:00', name: 'Пилатес', desc: 'Кор и осанка', coach: 'Мадина С.', zone: 'Студия' },
      { time: '17:30', name: 'Функционал 45', desc: 'Гири, канаты, сани', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '19:00', name: 'Сайкл 45', desc: 'Холмы и спринты', coach: 'Ержан Т.', zone: 'Сайкл-зал' },
      { time: '20:00', name: 'Бокс: спарринг', desc: 'Для опытных', coach: 'Руслан М.', zone: 'Ринг' }
    ],
    'Ср': [
      { time: '07:30', name: 'Утренний функционал', desc: 'Круговая, 45 мин', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '10:00', name: 'Здоровая спина', desc: 'Работа с осанкой', coach: 'Мадина С.', zone: 'Студия' },
      { time: '13:00', name: 'Кардио-микс', desc: 'Низкая ударная нагрузка', coach: 'Ержан Т.', zone: 'Кардио' },
      { time: '18:00', name: 'Сила: верх тела', desc: 'Жимы и тяги', coach: 'Данияр А.', zone: 'Силовая' },
      { time: '19:30', name: 'HIIT 100', desc: 'Высокая интенсивность', coach: 'Алина К.', zone: 'Зал 2' }
    ],
    'Чт': [
      { time: '08:00', name: 'Йога-флоу', desc: 'Дыхание и баланс', coach: 'Мадина С.', zone: 'Студия' },
      { time: '12:30', name: 'Сайкл 45', desc: 'Интервалы', coach: 'Ержан Т.', zone: 'Сайкл-зал' },
      { time: '17:30', name: 'Бокс: база', desc: 'Техника для новичков', coach: 'Руслан М.', zone: 'Ринг' },
      { time: '19:00', name: 'Функционал 45', desc: 'Петли и собственный вес', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '20:15', name: 'Стретчинг', desc: 'Восстановление', coach: 'Мадина С.', zone: 'Студия' }
    ],
    'Пт': [
      { time: '07:30', name: 'Утренний функционал', desc: 'Круговая, 45 мин', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '11:00', name: 'Пилатес', desc: 'Кор и осанка', coach: 'Мадина С.', zone: 'Студия' },
      { time: '18:00', name: 'Сила: всё тело', desc: 'Базовые движения', coach: 'Данияр А.', zone: 'Силовая' },
      { time: '19:00', name: 'Танцевальный класс', desc: 'Кардио под музыку', coach: 'Динара К.', zone: 'Студия' },
      { time: '20:00', name: 'Сайкл 45', desc: 'Финиш недели', coach: 'Ержан Т.', zone: 'Сайкл-зал' }
    ],
    'Сб': [
      { time: '10:00', name: 'Функционал 60', desc: 'Длинный круг выходного', coach: 'Алина К.', zone: 'Зал 2' },
      { time: '11:30', name: 'Бокс: дети 8+', desc: 'Группа для детей', coach: 'Руслан М.', zone: 'Ринг' },
      { time: '13:00', name: 'Йога-флоу', desc: 'Спокойная практика', coach: 'Мадина С.', zone: 'Студия' },
      { time: '16:00', name: 'Сайкл 45', desc: 'Интервалы', coach: 'Ержан Т.', zone: 'Сайкл-зал' }
    ],
    'Вс': [
      { time: '11:00', name: 'Стретчинг 60', desc: 'Глубокая растяжка', coach: 'Мадина С.', zone: 'Студия' },
      { time: '12:30', name: 'Кардио-микс', desc: 'Лёгкая нагрузка', coach: 'Ержан Т.', zone: 'Кардио' },
      { time: '17:00', name: 'Функционал 45', desc: 'Подготовка к неделе', coach: 'Алина К.', zone: 'Зал 2' }
    ]
  },

  plans: [
    {
      name: 'Старт',
      desc: 'Тренажёрный зал в будни до 17:00 — для тех, у кого свободное утро.',
      prices: { 1: 14900, 6: 12900, 12: 10900 },
      features: [
        'Тренажёрный зал и кардиозона',
        'Вводный инструктаж по технике',
        'Раздевалка, душ, шкафчик',
        'Будни с 07:00 до 17:00'
      ],
      featured: false
    },
    {
      name: 'Оптимум',
      desc: 'Безлимит по клубу и все групповые занятия. Самый частый выбор.',
      prices: { 1: 22900, 6: 19900, 12: 16900 },
      features: [
        'Безлимитное посещение 07:00–23:00',
        'Все групповые программы',
        'Диагностика тела раз в 6 недель',
        'Сауна и зона восстановления',
        'Заморозка абонемента'
      ],
      featured: true
    },
    {
      name: 'Премиум',
      desc: 'Всё из «Оптимума» плюс личный тренер и сопровождение по питанию.',
      prices: { 1: 39900, 6: 34900, 12: 29900 },
      features: [
        'Всё из тарифа «Оптимум»',
        '4 персональные тренировки в месяц',
        'Индивидуальный план на 12 недель',
        'Рекомендации по питанию',
        '2 гостевых визита в месяц'
      ],
      featured: false
    }
  ],

  faq: [
    {
      q: 'Можно правда прийти бесплатно?',
      a: 'Да. Первый визит включает экскурсию по клубу, диагностику состава тела и одну полноценную тренировку с тренером. Карта и предоплата не нужны, достаточно записаться заранее — так мы держим для вас время тренера.'
    },
    {
      q: 'Я новичок и никогда не занимался. С чего начать?',
      a: 'С бесплатной диагностики: тренер посмотрит подвижность и осанку, спросит про травмы и режим, а потом соберёт план на первые недели. Первые 2–3 тренировки обычно проходят с сопровождением, чтобы поставить технику.'
    },
    {
      q: 'Нужна ли справка от врача?',
      a: 'Справка не обязательна, но если есть хронические заболевания, недавние операции или травмы — обязательно скажите об этом тренеру. При необходимости подберём щадящий вариант нагрузки или порекомендуем сначала сходить к врачу.'
    },
    {
      q: 'Можно ли заморозить абонемент?',
      a: 'Да: до 14 дней на полугодовом абонементе и до 30 дней на годовом. Заморозка оформляется на ресепшн или через приложение, дни переносятся на конец срока.'
    },
    {
      q: 'Что взять с собой на первое занятие?',
      a: 'Сменную обувь, форму, полотенце и воду. Замок для шкафчика и коврик для групповых есть в клубе, брать своё не нужно.'
    },
    {
      q: 'Есть ли парковка?',
      a: 'Да, бесплатный паркинг на 120 мест для гостей клуба. В часы пик советуем приезжать за 10 минут до занятия.'
    }
  ]
};

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- Шапка: прилипание, бургер, активный пункт ---------- */

const header = $('#header');
const burger = $('#burger');
const mobileNav = $('#mobileNav');

const onScroll = () => {
  header.classList.toggle('is-stuck', window.scrollY > 24);
  const fab = $('#fab');
  if (fab) fab.classList.toggle('is-visible', window.scrollY > 600);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const closeMenu = () => {
  burger.setAttribute('aria-expanded', 'false');
  mobileNav.classList.remove('is-open');
  document.body.classList.remove('is-locked');
};

burger.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') === 'true';
  burger.setAttribute('aria-expanded', String(!open));
  mobileNav.classList.toggle('is-open', !open);
  document.body.classList.toggle('is-locked', !open);
});

$$('#mobileNav a').forEach((a) => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Подсветка активного раздела ---------- */

const navLinks = $$('.nav a');
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) =>
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id)
        );
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => spy.observe(s));
}

/* ---------- Появление блоков при скролле ---------- */

const revealables = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), i * 70);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-in'));
}

/* ---------- Счётчики в полосе цифр ---------- */

const animateCount = (el) => {
  const target = Number(el.dataset.count || 0);
  const suffix = el.dataset.suffix || '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.textContent = target.toLocaleString('ru-RU') + suffix;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const counters = $$('.stat__value');
if ('IntersectionObserver' in window) {
  const co = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => co.observe(el));
} else {
  counters.forEach(animateCount);
}

/* ---------- Расписание ---------- */

const tabsBox = $('#scheduleTabs');
const scheduleBox = $('#scheduleBody');

const renderSchedule = (day) => {
  const items = CLUB.schedule[day] || [];
  if (!items.length) {
    scheduleBox.innerHTML = '<div class="schedule__empty">В этот день групповых занятий нет — зал работает в обычном режиме.</div>';
    return;
  }
  scheduleBox.innerHTML =
    '<div class="schedule__row schedule__row--head"><div>Время</div><div>Занятие</div><div>Тренер</div><div>Зона</div></div>' +
    items
      .map(
        (it) => `
      <div class="schedule__row">
        <div class="schedule__time">${it.time}</div>
        <div>
          <div class="schedule__name">${it.name}</div>
          <div class="schedule__desc">${it.desc}</div>
        </div>
        <div class="schedule__coach">${it.coach}</div>
        <div class="schedule__zone">${it.zone}</div>
      </div>`
      )
      .join('');
};

const todayIndex = (new Date().getDay() + 6) % 7; // Пн = 0

DAYS.forEach((day, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tab';
  btn.textContent = day + (i === todayIndex ? ' · сегодня' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', String(i === todayIndex));
  btn.addEventListener('click', () => {
    $$('.tab', tabsBox).forEach((b) => b.setAttribute('aria-selected', 'false'));
    btn.setAttribute('aria-selected', 'true');
    renderSchedule(day);
  });
  tabsBox.appendChild(btn);
});
renderSchedule(DAYS[todayIndex]);

/* ---------- Ближайшие занятия в hero ---------- */

const heroToday = $('#heroToday');
const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const todayItems = CLUB.schedule[DAYS[todayIndex]] || [];
const upcoming = todayItems.filter((it) => toMinutes(it.time) >= nowMinutes);
const heroItems = (upcoming.length >= 3 ? upcoming : todayItems).slice(0, 3);

heroToday.innerHTML = heroItems
  .map(
    (it, i) => `
  <div class="hero__row">
    <div class="hero__row-time">${it.time}</div>
    <div class="hero__row-body">
      <div class="hero__row-name">${it.name}</div>
      <div class="hero__row-meta">${it.coach} · ${it.zone}</div>
    </div>
    <div class="hero__row-slots">${[4, 7, 2][i % 3]} места</div>
  </div>`
  )
  .join('');

/* ---------- Абонементы ---------- */

const plansBox = $('#plansGrid');
const money = (v) => v.toLocaleString('ru-RU') + ' ₸';

const renderPlans = (term) => {
  plansBox.innerHTML = CLUB.plans
    .map((plan) => {
      const monthly = plan.prices[term];
      const total = monthly * term;
      const check =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      return `
      <article class="plan ${plan.featured ? 'plan--featured' : ''}">
        ${plan.featured ? '<span class="plan__flag">Выбирают чаще всего</span>' : ''}
        <div>
          <div class="plan__name">${plan.name}</div>
          <p class="plan__desc">${plan.desc}</p>
        </div>
        <div>
          <div class="plan__price">
            <span class="plan__amount">${money(monthly)}</span>
            <span class="plan__period">/ месяц</span>
          </div>
          <div class="plan__total">${term === 1 ? 'при оплате за месяц' : `${money(total)} за ${term} мес. — выгода ${money((plan.prices[1] - monthly) * term)}`}</div>
        </div>
        <ul class="plan__list">
          ${plan.features.map((f) => `<li>${check}<span>${f}</span></li>`).join('')}
        </ul>
        <a class="btn ${plan.featured ? 'btn--primary' : 'btn--ghost'} btn--block" href="#signup">Выбрать «${plan.name}»</a>
      </article>`;
    })
    .join('');
};

$$('.toggle button').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.toggle button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    renderPlans(Number(btn.dataset.term));
  });
});
renderPlans(1);

/* ---------- FAQ ---------- */

const faqBox = $('#faqList');
faqBox.innerHTML = CLUB.faq
  .map(
    (item, i) => `
  <div class="faq__item">
    <button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-a-${i}">
      <span>${item.q}</span>
      <span class="faq__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </span>
    </button>
    <div class="faq__a" id="faq-a-${i}"><div><p>${item.a}</p></div></div>
  </div>`
  )
  .join('');

$$('.faq__q', faqBox).forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq__item');
    const open = btn.getAttribute('aria-expanded') === 'true';
    $$('.faq__item', faqBox).forEach((el) => {
      el.classList.remove('is-open');
      $('.faq__q', el).setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ---------- Форма заявки ----------
   Бэкенда нет: заявка собирается в сообщение и открывается в WhatsApp.
   Чтобы отправлять на почту или в CRM — замените обработчик на fetch к своему API. */

const form = $('#signupForm');
const status = $('#formStatus');

const setError = (field, message) => {
  const wrap = field.closest('.field') || field.closest('.form-consent')?.parentElement;
  const box = $(`[data-error-for="${field.name}"]`, form);
  if (wrap && wrap.classList) wrap.classList.toggle('has-error', Boolean(message));
  if (box) box.textContent = message || '';
};

const digits = (s) => s.replace(/\D/g, '');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = $('#name');
  const phone = $('#phone');
  const consent = $('#consent');
  let ok = true;

  if (name.value.trim().length < 2) {
    setError(name, 'Напишите, как к вам обращаться');
    ok = false;
  } else setError(name, '');

  if (digits(phone.value).length < 10) {
    setError(phone, 'Укажите номер телефона полностью');
    ok = false;
  } else setError(phone, '');

  if (!consent.checked) {
    setError(consent, 'Без согласия мы не сможем перезвонить');
    ok = false;
  } else setError(consent, '');

  if (!ok) {
    status.classList.remove('is-visible');
    return;
  }

  const text = [
    'Заявка на пробную тренировку — Фитнес 100',
    `Имя: ${name.value.trim()}`,
    `Телефон: ${phone.value.trim()}`,
    `Направление: ${$('#direction').value}`,
    `Удобное время: ${$('#time').value}`,
    $('#comment').value.trim() ? `Комментарий: ${$('#comment').value.trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const link = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent(text)}`;
  window.open(link, '_blank', 'noopener');

  status.innerHTML = `Заявка готова — мы открыли WhatsApp, останется нажать «Отправить». Если окно не открылось, <a href="${link}" target="_blank" rel="noopener">нажмите сюда</a> или позвоните <a href="tel:+77000000000">${CLUB.phone}</a>.`;
  status.classList.add('is-visible');
  form.reset();
});

/* ---------- Мелочи ---------- */

$('#year').textContent = new Date().getFullYear();
