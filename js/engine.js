// ============================================
// SOVMESTIMOST — Core Calculation Engine
// ============================================

function reduceToDigit(n) {
  while (n > 9) { n = String(n).split('').reduce((s,d) => s + +d, 0); }
  return n;
}

function calcConsciousness(day) {
  return reduceToDigit(day);
}

function calcMission(day, month, year) {
  const sum = String(day).split('').concat(String(month).split(''), String(year).split('')).reduce((s,d) => s + +d, 0);
  return reduceToDigit(sum);
}

// Chinese New Year dates (month, day) for each year
const CNY_DATES = {
  1940:[2,8],1941:[1,27],1942:[2,15],1943:[2,5],1944:[1,25],1945:[2,13],1946:[2,2],1947:[1,22],1948:[2,10],1949:[1,29],
  1950:[2,17],1951:[2,6],1952:[1,27],1953:[2,14],1954:[2,3],1955:[1,24],1956:[2,12],1957:[1,31],1958:[2,18],1959:[2,8],
  1960:[1,28],1961:[2,15],1962:[2,5],1963:[1,25],1964:[2,13],1965:[2,2],1966:[1,21],1967:[2,9],1968:[1,30],1969:[2,17],
  1970:[2,6],1971:[1,27],1972:[2,15],1973:[2,3],1974:[1,23],1975:[2,11],1976:[1,31],1977:[2,18],1978:[2,7],1979:[1,28],
  1980:[2,16],1981:[2,5],1982:[1,25],1983:[2,13],1984:[2,2],1985:[2,20],1986:[2,9],1987:[1,29],1988:[2,17],1989:[2,6],
  1990:[1,27],1991:[2,15],1992:[2,4],1993:[1,23],1994:[2,10],1995:[1,31],1996:[2,19],1997:[2,7],1998:[1,28],1999:[2,16],
  2000:[2,5],2001:[1,24],2002:[2,12],2003:[2,1],2004:[1,22],2005:[2,9],2006:[1,29],2007:[2,18],2008:[2,7],2009:[1,26],
  2010:[2,14],2011:[2,3],2012:[1,23],2013:[2,10],2014:[1,31],2015:[2,19],2016:[2,8],2017:[1,28],2018:[2,16],2019:[2,5],
  2020:[1,25],2021:[2,12],2022:[2,1],2023:[1,22],2024:[2,10],2025:[1,29],2026:[2,17],2027:[2,6],2028:[1,26],2029:[2,13],2030:[2,3],
};

function getEasternSignIndex(year, month, day) {
  // Check if born before Chinese New Year → use previous year's sign
  let effectiveYear = year;
  const cny = CNY_DATES[year];
  if (cny) {
    if (month < cny[0] || (month === cny[0] && day < cny[1])) {
      effectiveYear = year - 1;
    }
  }
  return ((effectiveYear - 4) % 12 + 12) % 12;
}

function getEasternSign(year, month, day) {
  const idx = getEasternSignIndex(year, month, day);
  return { index: idx, name: EASTERN_ANIMALS[idx], emoji: EASTERN_EMOJI[idx] };
}

function getWesternSign(day, month) {
  for (const sign of ZODIAC_SIGNS) {
    if (sign.sm === sign.em || sign.sm < sign.em) {
      // Normal range (same year)
      if ((month === sign.sm && day >= sign.sd) || (month === sign.em && day <= sign.ed) ||
          (month > sign.sm && month < sign.em)) {
        return sign;
      }
    } else {
      // Wraps around year (Козерог: Dec 22 - Jan 19)
      if ((month === sign.sm && day >= sign.sd) || (month === sign.em && day <= sign.ed) ||
          month > sign.sm || month < sign.em) {
        return sign;
      }
    }
  }
  return ZODIAC_SIGNS[0]; // fallback
}

function getPersonProfile(dateStr, name, gender, birthHour) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cs = calcConsciousness(day);
  const mission = calcMission(day, month, year);
  const eastern = getEasternSign(year, month, day);
  const western = getWesternSign(day, month);
  gender = gender || 'm';
  birthHour = (birthHour !== undefined && birthHour !== null) ? birthHour : 12;
  var nn = name ? calcNameNumber(name) : 0;
  return {
    date: dateStr, day, month, year,
    cs, mission,
    eastern, western,
    element: western.element,
    code: `${cs}/${mission}`,
    label: `${ARCHETYPES[cs].name} ${eastern.emoji}${western.emoji}`,
    gender: gender,
    birthHour: birthHour,
    ascendant: getAscendant(birthHour),
    nameNumber: nn,
    nameNumDesc: nn ? (NAME_NUM_DESCRIPTIONS[nn] || '') : '',
  };
}

function calcLayer1(csA, csB) {
  return L1_MATRIX[csA][csB];
}

function calcLayer2(eastIdxA, eastIdxB) {
  return L2_MATRIX[eastIdxA][eastIdxB];
}

function calcLayer3(missionA, missionB) {
  return L3_MATRIX[missionA][missionB];
}

function calcLayer4(elemA, elemB) {
  return L4_MATRIX[elemA][elemB];
}

function calcMultiplier(csA, csB, missionA, missionB, l2score) {
  let m = 1.0;
  let golden = false, redFlag = false;
  // Golden Bonus: partner B has 6 in CS or Mission
  if (csB === 6 || missionB === 6) { m *= 1.1; golden = true; }
  // Red Flag: 1-7 pair in CS or Mission, OR yearly clash (L2=1)
  const csSet = new Set([csA, csB]);
  const missionSet = new Set([missionA, missionB]);
  if ((csSet.has(1) && csSet.has(7)) || (missionSet.has(1) && missionSet.has(7)) || l2score === 1) {
    m *= 0.8; redFlag = true;
  }
  return { m: Math.round(m * 100) / 100, golden, redFlag };
}

function calcSynergy(profileA, profileB, category = 'love') {
  const l1 = calcLayer1(profileA.cs, profileB.cs);
  const l2 = calcLayer2(profileA.eastern.index, profileB.eastern.index);
  const l3 = calcLayer3(profileA.mission, profileB.mission);
  const l4 = calcLayer4(profileA.element, profileB.element);
  
  const weights = CATEGORY_WEIGHTS[category];
  const raw = (l1 * weights[0]) + (l2 * weights[1]) + (l3 * weights[2]) + (l4 * weights[3]);
  const maxRaw = 10 * (weights[0] + weights[1] + weights[2] + weights[3]);
  
  const mult = calcMultiplier(profileA.cs, profileB.cs, profileA.mission, profileB.mission, l2);
  let rawPct = (raw / maxRaw) * 100;
  
  // === Category-specific modifiers ===
  const csA = profileA.cs, csB = profileB.cs;
  const wA = profileA.western, wB = profileB.western;
  const wSignA = wA ? wA.sign : '', wSignB = wB ? wB.sign : '';
  
  if (category === 'love') {
    // Любовь: бонус за Венеру (6) или эмоциональные знаки
    if (csA === 6 || csB === 6) rawPct += 8; // Гармонизатор = идеален для любви
    if (csA === 2 || csB === 2) rawPct += 5; // Дипломат — чуткость
    if (csA === 1 && csB === 1) rawPct -= 10; // Два лидера — борьба за власть
    // Водные/огненные знаки = страсть
    const passionSigns = ['scorpio','pisces','cancer','aries','leo'];
    if (passionSigns.includes(wSignA) || passionSigns.includes(wSignB)) rawPct += 4;
    // Штраф за "холодные" пары
    const coldSigns = ['capricorn','aquarius','virgo'];
    if (coldSigns.includes(wSignA) && coldSigns.includes(wSignB)) rawPct -= 6;
    
  } else if (category === 'business') {
    // Бизнес: бонус за Строителя, Лидера, Коммуникатора
    if (csA === 8 || csB === 8) rawPct += 8; // Строитель = деловая хватка
    if (csA === 1 || csB === 1) rawPct += 6; // Лидер = инициатива
    if (csA === 5 || csB === 5) rawPct += 5; // Коммуникатор = переговоры
    // Штраф за мечтателей
    if (csA === 7 || csB === 7) rawPct -= 6; // Мистик = нестабильность
    if (csA === 2 && csB === 2) rawPct -= 8; // Два дипломата — нерешительность
    // Земные знаки = стабильность в бизнесе
    const earthSigns = ['taurus','virgo','capricorn'];
    if (earthSigns.includes(wSignA) || earthSigns.includes(wSignB)) rawPct += 5;
    // Штраф за непредсказуемость
    const chaosInBiz = ['pisces','sagittarius'];
    if (chaosInBiz.includes(wSignA) && chaosInBiz.includes(wSignB)) rawPct -= 7;
    
  } else if (category === 'friends') {
    // Дружба: бонус за весёлых и открытых
    if (csA === 5 || csB === 5) rawPct += 6; // Коммуникатор = лёгкость
    if (csA === 9 || csB === 9) rawPct += 5; // Воин = надёжность
    if (csA === 3 || csB === 3) rawPct += 4; // Наставник = мудрость
    // Штраф за замкнутых
    if (csA === 7 && csB === 7) rawPct -= 8; // Два мистика — каждый в себе
    // Огненные/воздушные = весело
    const funSigns = ['aries','leo','sagittarius','gemini','libra','aquarius'];
    if (funSigns.includes(wSignA) && funSigns.includes(wSignB)) rawPct += 6;
    
  } else if (category === 'children') {
    // Дети: бонус за заботливых
    if (csA === 6 || csB === 6) rawPct += 7; // Гармонизатор = забота
    if (csA === 3 || csB === 3) rawPct += 6; // Наставник = мудрость
    if (csA === 2 || csB === 2) rawPct += 5; // Дипломат = терпение
    // Штраф за авторитарных
    if (csA === 1 && csB === 8) rawPct -= 6; // Лидер + Строитель = давление
    if (csA === 8 && csB === 1) rawPct -= 6;
    if (csA === 9 || csB === 9) rawPct -= 4; // Воин = импульсивность с детьми
    // Водные знаки = эмпатия с детьми
    const nurtureSigns = ['cancer','pisces','taurus','virgo'];
    if (nurtureSigns.includes(wSignA) || nurtureSigns.includes(wSignB)) rawPct += 5;
  }
  
  // Astro-Synergy Bonus/Penalty
  const astro = typeof calcZodiacConflict === 'function' ? calcZodiacConflict(profileA.western, profileB.western) : { diff: 0 };
  let astroBonus = 0;
  if (category === 'love') {
    if (astro.diff === 4) astroBonus = 5;
    else if (astro.diff === 6) astroBonus = 3; // spark
    else if (astro.diff === 2) astroBonus = 2;
    else if (astro.diff === 3) astroBonus = -3;
    else if (astro.diff === 5) astroBonus = -4;
  } else if (category === 'business') {
    if (astro.diff === 4) astroBonus = 3;
    else if (astro.diff === 6) astroBonus = -5; // hard to agree
    else if (astro.diff === 2) astroBonus = 4;
    else if (astro.diff === 3) astroBonus = 2; // dynamic growth
    else if (astro.diff === 5) astroBonus = -2;
  } else {
    // friends & children
    if (astro.diff === 4) astroBonus = 4;
    else if (astro.diff === 2) astroBonus = 3;
    else if (astro.diff === 3) astroBonus = -2;
    else if (astro.diff === 5) astroBonus = -3;
    else if (astro.diff === 6) astroBonus = -2;
  }
  rawPct += astroBonus;
  
  const finalPct = Math.max(1, Math.min(100, Math.round(rawPct * mult.m)));
  
  const tier = RESULT_TIERS.find(t => finalPct >= t.min);
  
  return {
    l1, l2, l3, l4,
    l1type: L1_TYPES[l1] || 'Нейтраль',
    l2type: L2_TYPES[l2] || 'Нейтраль',
    l3type: L3_TYPES[l3] || 'Хаос',
    l4type: L4_TYPES[l4] || 'Инертность',
    weights, raw, maxRaw, rawPct,
    multiplier: mult,
    astroBonus: astroBonus,
    percent: finalPct,
    tier,
    category,
  };
}

// --- Detailed Layer Descriptions ---
// New generateLayerDescriptions — simple language, category-specific
function generateLayerDescriptions(profileA, profileB, synergy, category) {
  category = category || 'love';
  var archA = ARCHETYPES[profileA.cs];
  var archB = ARCHETYPES[profileB.cs];
  var nameA = profileA.name || 'Персона A';
  var nameB = profileB.name || 'Персона B';
  var archNameA = profileA.cs + '-' + archA.name;
  var archNameB = profileB.cs + '-' + archB.name;
  var codeA = profileA.code || '';
  var codeB = profileB.code || '';
  var descs = {};

  // L1 — Психология (характер)
  var l1s = synergy.l1;
  var L1 = {
    love: {
      10: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — как два пазла, идеально подходящих друг другу. '+nameA+' нуждается в «'+archA.need+'», и '+nameB+' даёт это естественно, без усилий. Такие пары понимают друг друга с полуслова. Вам повезло — это редкость.',
      8: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') быстро находят общий язык. Как старые друзья, которые давно не виделись, но сразу на одной волне. В любви это значит: мало ссор, много тепла. Главное — не принимать это за данность.',
      6: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — как соседи: ни плохо, ни хорошо. Искра не загорится сама — нужно стараться. Если оба готовы вкладываться, отношения могут стать крепкими. Если нет — останетесь просто знакомыми.',
      4: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — как кошка и собака. '+nameB+' своей «'+archB.shadow+'» задевает то, что для '+nameA+' важнее всего — «'+archA.need+'». Будут споры о мелочах, которые на самом деле о главном.\n💡 Совет: Не пытайтесь переделать друг друга. Примите: вы разные. Договоритесь о правилах и уважайте границы.',
      2: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — как два магнита одной стороной: отталкиваются. «'+archB.shadow+'» партнёра блокирует потребность '+nameA+' в «'+archA.need+'». Вместе тяжело, хочется сбежать.\n💡 Совет: Если вы всё же вместе — нужен «переводчик»: психолог, мудрый друг. Без посредника будет война.'
    },
    business: {
      10: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — идеальные бизнес-партнёры. Как Стив Джобс и Стив Возняк — один видит картину, другой делает. '+nameA+' получает «'+archA.need+'», а '+nameB+' — «'+archB.need+'». Вместе вы сильнее, чем по одиночке.',
      8: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') быстро договариваются. Как опытные коллеги: каждый знает свою роль, нет лишних конфликтов. Деньги и проекты идут ровно. Главное — чётко делить обязанности.',
      6: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') могут работать вместе, но без огонька. Как два отдела в компании: каждый делает своё, но синергии мало. Нужен чёткий план и KPI, иначе проект застрянет.',
      4: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') в бизнесе — рискованно. «'+archB.shadow+'» партнёра мешает рабочему процессу. Один хочет «'+archA.need+'», другой тянет в свою сторону. Споры о деньгах и решениях.\n💡 Совет: Только с чётким договором на бумаге. Пропишите кто за что отвечает, как делите прибыль и как выходите из партнёрства.',
      2: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') вместе в бизнесе = риск потерять и деньги, и отношения. Подходы к работе противоположны. Один строит — другой ломает.\n💡 Совет: Лучше не рискуйте. Если всё же надо — наймите управляющего, который будет буфером между вами.'
    },
    friends: {
      10: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — друзья от бога. Как в детстве: легко, весело, без напряга. Дополняют друг друга. Такая дружба — на всю жизнь.',
      8: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — отличная компания. Всегда есть о чём поговорить, вместе не скучно. Такие друзья выручают в трудную минуту и радуются вашим успехам.',
      6: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — приятели. Можно посидеть в кафе, но в 3 ночи с проблемой не позвонишь. Дружба будет, если оба вкладываются. Иначе — потеряетесь со временем.',
      4: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — непростая дружба. «'+archB.shadow+'» у '+nameB+' раздражает '+nameA+'. После встреч иногда чувствуешь усталость, а не подъём.\n💡 Совет: Дружите дозированно. Встречайтесь в компании, не один на один. Так легче.',
      2: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — тяжело быть друзьями. Разные ценности, разный ритм. После общения — осадок.\n💡 Совет: Это не значит, что человек плохой — просто вы не совпадаете. Держите тёплую дистанцию.'
    },
    children: {
      10: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — гармония. Родитель интуитивно понимает, что нужно ребёнку. Ребёнок чувствует себя в безопасности и раскрывается. Идеальная почва для роста.',
      8: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — хорошая связь. Родитель умеет слушать, ребёнок доверяет. Конфликты бывают, но решаются быстро. Главное — не забывать хвалить.',
      6: nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — нормальная связь, но нужно стараться. Ребёнку нужно «'+archB.need+'», а родитель не всегда это даёт автоматически. Нужно учиться слышать.',
      4: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — непросто. «На разных волнах». «'+archA.shadow+'» родителя давит на ребёнка.\n💡 Совет: Больше слушайте, меньше контролируйте. Ребёнку нужно «'+archB.need+'» — давайте это.',
      2: '⚠️ '+nameA+' ('+archNameA+') и '+nameB+' ('+archNameB+') — сложная связь. Родитель не понимает, чего хочет ребёнок. Ребёнок закрывается.\n💡 Совет: Не давите. Найдите общее дело — хобби, спорт, игры. Через действия легче, чем через слова.'
    }
  };
  var l1key = l1s >= 10 ? 10 : l1s >= 8 ? 8 : l1s >= 6 ? 6 : l1s >= 4 ? 4 : 2;
  descs.l1 = L1[category][l1key];

  // L2 — Инстинкты (восточный гороскоп)
  var l2s = synergy.l2;
  var eA = profileA.eastern, eB = profileB.eastern;
  var eInfo = eA.emoji+' '+eA.name+' и '+eB.emoji+' '+eB.name;
  var L2 = {
    love: {
      hi: eInfo+' — мощное притяжение на уровне «нутра». Вы чувствуете друг друга без слов — как будто знакомы сто лет. В любви это даёт глубокую связь, которую трудно разорвать.',
      med: eInfo+' — спокойная связь. Нет бурной страсти, но есть уважение. Как тёплый плед — не обжигает, но согревает.',
      lo: '⚠️ '+eInfo+' — на уровне инстинктов не совпадаете. Тело «не верит» партнёру, даже если голова говорит «всё ок». Будет подсознательное напряжение.\n💡 Совет: Больше тактильного контакта — объятия, прикосновения. Тело нужно «приучить» доверять.'
    },
    business: {
      hi: eInfo+' — деловое чутьё совпадает. Оба чувствуют, когда рисковать, а когда ждать. Партнёр не подведёт — это в крови.',
      med: eInfo+' — рабочий уровень доверия. Не будете лезть в карман друг другу, но и сверхдоверия нет. Всё через договор — и это нормально.',
      lo: '⚠️ '+eInfo+' — подсознательно не доверяете друг другу. В бизнесе это опасно: будете перепроверять каждый шаг.\n💡 Совет: Всё фиксируйте на бумаге. Прозрачная отчётность — ваш лучший друг.'
    },
    friends: {
      hi: eInfo+' — вместе кайфово. Как в хорошей компании: смех, истории, общие приключения. Такие друзья — на вес золота.',
      med: eInfo+' — нормальная энергия. Можно зависнуть вместе, но «химии» особой нет. Дружба по интересам, не по зову сердца.',
      lo: '⚠️ '+eInfo+' — после встреч чувствуете усталость. Энергии не совпадают.\n💡 Совет: Встречайтесь реже, но качественнее. Лучше раз в месяц классно, чем каждый день через силу.'
    },
    children: {
      hi: eInfo+' — ребёнок инстинктивно тянется к родителю. Чувствует защиту и тепло. Родитель «считывает» настроение ребёнка без слов.',
      med: eInfo+' — нормальная связь. Ребёнок слушается, но не всегда открывается. Нужно создавать моменты близости — вместе гулять, играть.',
      lo: '⚠️ '+eInfo+' — ребёнок может замыкаться или капризничать «без причины». На самом деле — энергии не совпадают.\n💡 Совет: Не кричите. Обнимите. Ребёнку нужно физическое тепло, чтобы почувствовать безопасность.'
    }
  };
  var l2key = l2s >= 8 ? 'hi' : l2s >= 5 ? 'med' : 'lo';
  descs.l2 = L2[category][l2key];

  // L3 — Миссия (жизненные цели)
  var l3s = synergy.l3;
  var mA = profileA.mission, mB = profileB.mission;
  var mArchA = ARCHETYPES[mA], mArchB = ARCHETYPES[mB];
  var marchNameA = mA + '-' + mArchA.name;
  var marchNameB = mB + '-' + mArchB.name;
  var mInfo = 'Миссия '+nameA+' — '+marchNameA+' ('+mArchA.need+'), миссия '+nameB+' — '+marchNameB+' ('+mArchB.need+')';
  var L3 = {
    love: {
      hi: mInfo+'. Ваши жизненные цели дополняют друг друга. Как два весла одной лодки — гребёте в одну сторону. Вместе вы быстрее придёте к мечте.',
      med: mInfo+'. Цели не мешают друг другу, но и не помогают. Каждый идёт своей дорогой. Это нормально, если даёте друг другу свободу.',
      lo: '⚠️ '+mInfo+'. Ваши цели тянут в разные стороны. Один хочет на море, другой — в горы. Постоянный выбор: «я или мы?»\n💡 Совет: Найдите одну общую цель — дом, путешествие, проект. Пусть это будет «наше», а остальное — «моё» и «твоё».'
    },
    business: {
      hi: mInfo+'. Бизнес-мечта совпадает. Один генерирует идеи, другой воплощает. Как CEO и CTO — вместе непобедимы.',
      med: mInfo+'. Работать можно, но нет общего драйва. Каждый тянет одеяло на себя. Нужен чёткий бизнес-план с ролями.',
      lo: '⚠️ '+mInfo+'. Разные видения бизнеса. Один хочет рисковать, другой — стабильность. Компромисс будет стоить дорого.\n💡 Совет: Не начинайте 50/50. Пусть один будет главным, другой — советником. Или работайте в разных отделах.'
    },
    friends: {
      hi: mInfo+'. Вы вдохновляете друг друга. После встреч хочется свернуть горы. Такие друзья помогают расти.',
      med: mInfo+'. Общие темы для разговоров есть, но глубокого резонанса нет. Хорошие приятели, но не «братья по духу».',
      lo: '⚠️ '+mInfo+'. Разные жизненные приоритеты. Один про карьеру, другой про свободу. Со временем может стать скучно.\n💡 Совет: Находите общие интересы — спорт, хобби, путешествия. Дружба живёт через совместные дела.'
    },
    children: {
      hi: mInfo+'. Родитель понимает, к чему стремится ребёнок, и помогает. Ребёнок чувствует поддержку и растёт уверенным.',
      med: mInfo+'. Родитель не всегда понимает мечты ребёнка, но не мешает. Важно спрашивать: «А ты чего хочешь?»',
      lo: '⚠️ '+mInfo+'. Родитель навязывает свой путь. «Будь врачом!» — а ребёнок хочет рисовать. Давление убивает мотивацию.\n💡 Совет: Не проживайте свою мечту через ребёнка. Спросите, что ЕМУ интересно. Поддержите, даже если не понимаете.'
    }
  };
  var l3key = l3s >= 8 ? 'hi' : l3s >= 4 ? 'med' : 'lo';
  descs.l3 = L3[category][l3key];

  // L4 — Стихия + Зодиак
  var l4s = synergy.l4;
  var elA = ELEMENTS[profileA.element], elB = ELEMENTS[profileB.element];
  var elEA = ELEMENTS_EMOJI[profileA.element], elEB = ELEMENTS_EMOJI[profileB.element];
  var zA = profileA.western, zB = profileB.western;
  var zNA = zA ? zA.emoji+' '+zA.name : '', zNB = zB ? zB.emoji+' '+zB.name : '';
  var zTA = zA ? zA.trait : '', zTB = zB ? zB.trait : '';
  var zSA = zA ? zA.shadow : '', zSB = zB ? zB.shadow : '';
  var elInfo = elEA+' '+elA+' + '+elEB+' '+elB;
  var L4 = {
    love: {
      hi: elInfo+' — ваши энергии как тёплый костёр: греют, но не обжигают. '+zNA+' ('+zTA+') и '+zNB+' ('+zTB+') — вместе комфортно. Быт не убьёт чувства, а наоборот укрепит.',
      med: elInfo+' — ровная энергия. '+zNA+' и '+zNB+' не конфликтуют, но и искр нет. Быт может стать рутиной.\n💡 Совет: Устраивайте «свидания» даже через 10 лет. Ужин при свечах, поездка на выходные — не давайте огню погаснуть.',
      lo: '⚠️ '+elInfo+' — энергии сталкиваются. '+zNA+' хочет «'+zTA+'», а '+zNB+' — «'+zTB+'». Как горячее и холодное: вместе — дискомфорт. «'+zSA+'» и «'+zSB+'» усиливают трение.\n💡 Совет: Каждому нужно своё пространство. Отдельные хобби, иногда — отдых порознь. Это не предательство, а спасение.'
    },
    business: {
      hi: elInfo+' — рабочий ритм совпадает. '+zNA+' ('+zTA+') и '+zNB+' ('+zTB+') — как шестерёнки одного механизма. Дедлайны, планёрки, мозговые штурмы — всё идёт гладко.',
      med: elInfo+' — работать можно, но темп разный. Один быстрый, другой основательный.\n💡 Совет: Разделите задачи по темпу. Быстрые решения — одному, стратегия — другому.',
      lo: '⚠️ '+elInfo+' — рабочие стили противоположны. '+zNA+' стремится к «'+zTA+'», а '+zNB+' к «'+zTB+'». Постоянные разногласия по процессам.\n💡 Совет: Чёткие зоны ответственности. Не лезьте в территорию друг друга. Встречи — только по результатам.'
    },
    friends: {
      hi: elInfo+' — вместе легко и весело. '+zNA+' ('+zTA+') и '+zNB+' ('+zTB+') — отличная компания для путешествий, вечеринок и душевных разговоров.',
      med: elInfo+' — спокойная дружба. Не будете звонить каждый день, но раз в месяц — с удовольствием.\n💡 Совет: Найдите общее хобби — это склеит дружбу крепче.',
      lo: '⚠️ '+elInfo+' — разный ритм жизни. Один — тусовщик, другой — домосед. Сложно найти общее время и занятие.\n💡 Совет: Не навязывайте свой стиль. Принимайте как есть — и дружба выживет.'
    },
    children: {
      hi: elInfo+' — ребёнок и родитель «на одной частоте». '+zNA+' ('+zTA+') и '+zNB+' ('+zTB+') — дома тепло и спокойно. Ребёнок растёт уверенным.',
      med: elInfo+' — домашняя атмосфера нормальная, но бывают «пасмурные дни». Ребёнку иногда непонятно настроение родителя.\n💡 Совет: Объясняйте свои эмоции словами. «Я устал, это не из-за тебя» — ребёнку важно это слышать.',
      lo: '⚠️ '+elInfo+' — дома бывает напряжённо. Родитель ('+zNA+', «'+zSA+'») и ребёнок ('+zNB+', «'+zSB+'») — разные ритмы создают трение.\n💡 Совет: Создайте ребёнку «безопасный угол» — его комнату, его правила. Там он восстанавливается от вашей энергии.'
    }
  };
  var l4key = l4s >= 8 ? 'hi' : l4s >= 4 ? 'med' : 'lo';
  descs.l4 = L4[category][l4key];

  // L5 — Name Numerology
  var nnA = profileA.nameNumber || 0;
  var nnB = profileB.nameNumber || 0;
  var l5s = synergy.l5 || 5;
  if (nnA > 0 && nnB > 0) {
    var ndA = NAME_NUM_DESCRIPTIONS[nnA] || '';
    var ndB = NAME_NUM_DESCRIPTIONS[nnB] || '';
    if (l5s >= 8) {
      descs.l5 = '✨ Число имени '+nameA+' = '+nnA+' ('+ndA+'), число имени '+nameB+' = '+nnB+' ('+ndB+'). Ваши имена резонируют — как два инструмента, играющих в одной тональности. Это усиливает все остальные связи.';
    } else if (l5s >= 5) {
      descs.l5 = 'Число имени '+nameA+' = '+nnA+' ('+ndA+'), число имени '+nameB+' = '+nnB+' ('+ndB+'). Имена нейтральны друг к другу — не мешают и не помогают. Всё зависит от ваших действий.';
    } else {
      descs.l5 = '⚠️ Число имени '+nameA+' = '+nnA+' ('+ndA+'), число имени '+nameB+' = '+nnB+' ('+ndB+'). Вибрации имён создают лёгкое трение. Не критично, но стоит учитывать.';
    }
  } else {
    descs.l5 = 'Введите имена для расчёта нумерологии имени.';
  }

  // L6 — Ascendant
  var ascA = profileA.ascendant;
  var ascB = profileB.ascendant;
  var l6s = synergy.l6 || 5;
  if (ascA && ascB) {
    var ascInfo = ascA.emoji+' '+ascA.name+' ('+ascA.trait+') и '+ascB.emoji+' '+ascB.name+' ('+ascB.trait+')';
    if (l6s >= 8) {
      descs.l6 = '🌅 Асцендент '+nameA+': '+ascA.emoji+' '+ascA.name+', асцендент '+nameB+': '+ascB.emoji+' '+ascB.name+'. '+ascInfo+' — ваша «социальная маска» совпадает. При первой встрече сразу чувствуете «свой человек». Легко произвести впечатление друг на друга.';
    } else if (l6s >= 5) {
      descs.l6 = 'Асцендент '+nameA+': '+ascA.emoji+' '+ascA.name+' ('+ascA.trait+'), асцендент '+nameB+': '+ascB.emoji+' '+ascB.name+' ('+ascB.trait+'). Первое впечатление нейтральное — ни притяжения, ни отталкивания. Нужно время, чтобы раскрыться.';
    } else {
      descs.l6 = '⚠️ Асцендент '+nameA+': '+ascA.emoji+' '+ascA.name+' ('+ascA.shadow+'), асцендент '+nameB+': '+ascB.emoji+' '+ascB.name+' ('+ascB.shadow+'). Первое впечатление может быть обманчивым. «'+ascA.shadow+'» и «'+ascB.shadow+'» проявляются при знакомстве.\n💡 Совет: Не судите по первому впечатлению. Дайте время узнать друг друга глубже.';
    }
  } else {
    descs.l6 = 'Укажите время рождения для расчёта асцендента.';
  }

  return descs;
}


function calcFullReport(profileA, profileB, category = 'love') {
  const forward = calcSynergy(profileA, profileB, category);
  const reverse = calcSynergy(profileB, profileA, category);
  
  const archA = ARCHETYPES[profileA.cs];
  const archB = ARCHETYPES[profileB.cs];
  
  // Generate layer descriptions for both directions
  const layerDescsFwd = generateLayerDescriptions(profileA, profileB, forward, category);
  const layerDescsRev = generateLayerDescriptions(profileB, profileA, reverse, category);
  forward.layerDescs = layerDescsFwd;
  reverse.layerDescs = layerDescsRev;
  
  // Generate pros/cons text
  const pros = [];
  const cons = [];
  
  // L1 interpretation
  if (forward.l1 >= 8) pros.push(`${profileB.cs}-${archB.name} (${archB.planet}) дополняет твою энергию ${archA.planet}. ${forward.l1 === 10 ? 'Понимание без слов.' : 'Высокая скорость общения.'}`);
  else if (forward.l1 <= 4) cons.push(`${archB.shadow} вступает в конфликт с твоей потребностью в «${archA.need}». ${forward.l1 === 2 ? 'Фундаментальный разрыв.' : 'Конкуренция за лидерство.'}`);
  
  // L2 interpretation
  const eA = profileA.eastern.name, eB = profileB.eastern.name;
  if (forward.l2 >= 8) pros.push(`${eA} и ${eB}: ${forward.l2type}. ${forward.l2 === 10 ? 'Максимальное доверие «своих».' : forward.l2 === 9 ? 'Полное узнавание себя.' : 'Неявная помощь и тыл.'}`);
  else if (forward.l2 <= 3) cons.push(`${eA} и ${eB}: ${forward.l2type}. ${forward.l2 === 1 ? 'Прямое раздражение на уровне инстинктов.' : 'Подсознательное ожидание подвоха.'}`);
  
  // L3 interpretation
  if (forward.l3 >= 8) pros.push(`Миссии ${profileA.mission} и ${profileB.mission}: ${forward.l3type}. ${forward.l3 === 10 ? 'Рост ресурсов и ускорение.' : 'Стабильное движение к целям.'}`);
  else if (forward.l3 <= 3) cons.push(`Миссии ${profileA.mission} и ${profileB.mission}: ${forward.l3type}. ${forward.l3 === 1 ? 'Борьба за штурвал.' : 'Один гасит инициативу другого.'}`);
  
  // L4 interpretation
  if (forward.l4 >= 8) pros.push(`Стихии ${ELEMENTS[profileA.element]} + ${ELEMENTS[profileB.element]}: ${forward.l4type}. Бытовой комфорт.`);
  else if (forward.l4 <= 2) cons.push(`Стихии ${ELEMENTS[profileA.element]} + ${ELEMENTS[profileB.element]}: ${forward.l4type}. Нужна серьёзная притирка.`);
  
  // Multiplier notes
  if (forward.multiplier.golden) pros.push('✨ Венера (6) в числах партнёра смягчает углы.');
  if (forward.multiplier.redFlag) cons.push('🚩 Налог на стресс: 20% энергии уходит на кризисы.');
  
  // Neutral fillers
  if (pros.length === 0) pros.push('Ровный контакт без глубоких конфликтов.');
  if (cons.length === 0) cons.push('Явных критических рисков не обнаружено.');
  
  return {
    profileA, profileB,
    forward, reverse,
    pros, cons,
    category,
    uid: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    timestamp: new Date().toISOString(),
  };
}

// --- Zodiac Conflict Resolution ---
function calcZodiacConflict(signA, signB) {
  let idxA = ZODIAC_SIGNS.findIndex(s => s.name === signA.name);
  let idxB = ZODIAC_SIGNS.findIndex(s => s.name === signB.name);
  if (idxA === -1) idxA = 0;
  if (idxB === -1) idxB = 0;
  
  let diff = Math.abs(idxA - idxB);
  if (diff > 6) diff = 12 - diff; // shortest distance on the wheel
  
  const aspect = ZODIAC_ASPECTS[diff] || ZODIAC_ASPECTS[0];
  return { ...aspect, diff: diff };
}

// --- Timeline Calculation ---
function calcTimeline(personA, personB, category = 'love') {
  const currentYear = new Date().getFullYear();
  const timeline = [];
  
  // Create a 28-year projection starting from 10 years ago
  const startYear = currentYear - 10;
  const endYear = currentYear + 18;
  
  // Helper to calculate full synergy treating a person as purely CS or purely Mission
  const pA_cs = { ...personA, mission: personA.cs };
  const pB_cs = { ...personB, mission: personB.cs };
  const pA_miss = { ...personA, cs: personA.mission };
  const pB_miss = { ...personB, cs: personB.mission };
  
  // The magic of reusing calcSynergy to get the FULL 0-100% score including all layers!
  // To get the "overall" compatibility we average A->B and B->A for the graph
  function getAvgSyn(p1, p2) {
    const fwd = calcSynergy(p1, p2, category).percent;
    const rev = calcSynergy(p2, p1, category).percent;
    return (fwd + rev) / 2;
  }
  
  const score_CS_CS = getAvgSyn(pA_cs, pB_cs);
  const score_Miss_CS = getAvgSyn(pA_miss, pB_cs);
  const score_CS_Miss = getAvgSyn(pA_cs, pB_miss);
  const score_Miss_Miss = getAvgSyn(pA_miss, pB_miss);

  for (let year = startYear; year <= endYear; year++) {
    const ageA = year - personA.year;
    const ageB = year - personB.year;
    
    let score = 0;
    
    if (ageA < 0 || ageB < 0) {
      score = score_CS_CS;
    } else if (ageA < 30 && ageB < 30) {
      score = score_CS_CS;
    } else if (ageA >= 33 && ageB >= 33) {
      score = score_Miss_Miss;
    } else {
      let weightA = 0; 
      if (ageA >= 33) weightA = 1;
      else if (ageA >= 30) weightA = (ageA - 30) / 3;
      
      let weightB = 0;
      if (ageB >= 33) weightB = 1;
      else if (ageB >= 30) weightB = (ageB - 30) / 3;
      
      const wCS = (1 - weightA) * (1 - weightB);
      const wMixA = weightA * (1 - weightB);
      const wMixB = (1 - weightA) * weightB;
      const wMiss = weightA * weightB;
      
      score = (score_CS_CS * wCS) + (score_Miss_CS * wMixA) + (score_CS_Miss * wMixB) + (score_Miss_Miss * wMiss);
    }
    
    timeline.push({
      year: year,
      ageA: ageA,
      ageB: ageB,
      score: Math.round(score),
      transitionAStart: ageA === 30 ? (personA.name || 'Партнёр 1') : null,
      transitionAEnd: ageA === 33 ? (personA.name || 'Партнёр 1') : null,
      transitionBStart: ageB === 30 ? (personB.name || 'Партнёр 2') : null,
      transitionBEnd: ageB === 33 ? (personB.name || 'Партнёр 2') : null
    });
  }
  
  const reasons = [];
  const startScore = Math.round(score_CS_CS);
  const endScore = Math.round(score_Miss_Miss);
  const nameA = personA.name || 'Партнёр 1';
  const nameB = personB.name || 'Партнёр 2';
  
  reasons.push(`🔹 **Молодость (До 30 лет):** Базовая совместимость пары (${startScore}%). Вы взаимодействуете через базовое Сознание (${personA.cs} и ${personB.cs}).`);
  
  if (startScore !== endScore) {
    const direction = endScore > startScore ? 'растёт' : 'падает';
    const attraction = endScore > startScore ? 'притяжение усиливается' : 'начинается отдаление';
    reasons.push(`🔹 **Переходный возраст (30-33 года):** У ${nameA} и ${nameB} поочередно включается энергия Миссии. Динамика меняется.`);
    reasons.push(`🔹 **Зрелость (После 33 лет):** Общая совместимость ${direction} до ${endScore}%. ${endScore > startScore ? nameA + ' и ' + nameB + ' открывают друг в друге новые грани, ' + attraction + '.' : 'Цели ' + nameA + ' и ' + nameB + ' начинают расходиться, возникает ' + attraction + '.'} Важно учитывать это при долгосрочном планировании.`);
  } else {
    reasons.push(`🔹 **Зрелость (После 33 лет):** Совместимость ${nameA} и ${nameB} невероятно стабильна! Включение Миссий (${personA.mission} и ${personB.mission}) не меняет общий уровень притяжения (${endScore}%).`);
  }
  
  reasons.push(`⚠️ **Общая совместимость:** График показывает усреднённую температуру в отношениях, включая астрологию, стихии и психологию.`);
  
  return {
    data: timeline,
    reasons: reasons
  };
}
