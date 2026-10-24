/**
 * Baseball Play-by-Play English to Russian Translator
 * High-performance hybrid translator: instant rule-based baseball engine
 * + asynchronous online fallback (Google Translate & MyMemory).
 */

const BASEBALL_TERMS: Array<[RegExp, string]> = [
  // Multi-word substitution and announcement patterns
  [/Pitching Change:\s*([A-Za-z\s.'-]+?)\s+replaces\s+([A-Za-z\s.'-]+?)\./gi, 'Смена питчера: $1 выходит вместо $2.'],
  [/Offensive Substitution:\s*Pinch-hitter\s*([A-Za-z\s.'-]+?)\s+replaces\s+([A-Za-z\s.'-]+?)\./gi, 'Выход пинч-хиттера: $1 выходит на биту вместо $2.'],
  [/Defensive Substitution:\s*([A-Za-z\s.'-]+?)\s+replaces\s+([A-Za-z\s.'-]+?)\./gi, 'Замена в защите: $1 заменяет $2.'],
  [/Defensive switch from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)\s+for\s+([A-Za-z\s.'-]+?)\./gi, 'Смена позиции в защите: $3 переходит с $1 на $2.'],
  [/Status Change\s*-\s*/gi, 'Смена статуса: '],
  [/Game Advisory\s*-\s*/gi, 'Объявление игры: '],
  [/Injury Delay\./gi, 'Пауза из-за травмы.'],
  [/Mound Visit\./gi, 'Выход тренера на горку.'],

  // Specific baseball play patterns
  [/grand slam\s*\(([0-9]+)\)/gi, 'гранд-слэм ($1)'],
  [/grand slam/gi, 'гранд-слэм (хоум-ран при полных базах)'],
  [/homers\s*\(([0-9]+)\)/gi, 'выбивает хоум-ран ($1)'],
  [/homered\s*\(([0-9]+)\)/gi, 'выбил хоум-ран ($1)'],
  [/homers/gi, 'выбивает хоум-ран'],
  [/homered/gi, 'выбил хоум-ран'],
  [/strikes out swinging/gi, 'выбывает в страйкаут на свинге'],
  [/strikes out looking/gi, 'выбывает в страйкаут без свинга (глядя)'],
  [/struck out swinging/gi, 'выбыл в страйкаут на свинге'],
  [/struck out looking/gi, 'выбыл в страйкаут без свинга'],
  [/strikes out/gi, 'выбывает в страйкаут'],
  [/struck out/gi, 'выбыл в страйкаут'],

  // Hits
  [/singles/gi, 'выбивает сингл'],
  [/singled/gi, 'выбил сингл'],
  [/doubles/gi, 'выбивает дабл'],
  [/doubled/gi, 'выбил дабл'],
  [/triples/gi, 'выбивает трипл'],
  [/tripled/gi, 'выбил трипл'],

  // Walks & HBP
  [/intentionally walks/gi, 'получает преднамеренный уок'],
  [/intentionally walked/gi, 'получил преднамеренный уок'],
  [/walks/gi, 'получает уок (4 бола)'],
  [/walked/gi, 'получил уок (4 бола)'],
  [/hit by pitch/gi, 'получает попадание мячом (HBP)'],

  // Outs
  [/grounds into a double play/gi, 'попадает в дабл-плей на граундболе'],
  [/ground into a double play/gi, 'попадает в дабл-плей на граундболе'],
  [/grounds into a force out/gi, 'граундбол с форс-аутом'],
  [/grounds out/gi, 'выбывает на граундболе'],
  [/grounded out/gi, 'выбыл на граундболе'],
  [/ground bunts out/gi, 'выбывает на бант-граундболе'],
  [/bunt grounds out/gi, 'выбывает на бант-граундболе'],
  [/bunts out/gi, 'выбывает на банте'],
  [/bunted out/gi, 'выбыл на банте'],
  [/flies out/gi, 'выбывает на флайболе'],
  [/flied out/gi, 'выбыл на флайболе'],
  [/lines out/gi, 'выбывает на лайн-драйве'],
  [/lined out/gi, 'выбыл на лайн-драйве'],
  [/pops out/gi, 'выбывает на поп-ауте'],
  [/popped out/gi, 'выбыл на поп-ауте'],
  [/pop bunts out/gi, 'выбывает на поп-банте'],
  [/force out/gi, 'форс-аут'],
  [/forced out/gi, 'выбит на форс-ауте'],
  [/sacrifice fly/gi, 'жертвенный флайбол (сэк-флай)'],
  [/sacrifice bunt/gi, 'жертвенный бант'],
  [/fielder's choice/gi, 'выбор филдера'],
  [/fielders choice/gi, 'выбор филдера'],

  // Base running
  [/steals second base/gi, 'крадет 2-ю базу'],
  [/steals third base/gi, 'крадет 3-ю базу'],
  [/steals home/gi, 'крадет дом'],
  [/stole second base/gi, 'украл 2-ю базу'],
  [/stole third base/gi, 'украл 3-ю базу'],
  [/stole home/gi, 'украл дом'],
  [/steals/gi, 'крадет базу'],
  [/stolen base/gi, 'украденная база'],
  [/caught stealing/gi, 'пойман при попытке кражи'],
  [/picked off/gi, 'выбит на пикоффе'],
  [/pickoff/gi, 'пикофф'],
  [/wild pitch/gi, 'дикий бросок (вайлд-питч)'],
  [/passed ball/gi, 'упущенный мяч (пасс-бол)'],
  [/balk/gi, 'бок (ошибка питчера)'],

  // Scoring
  [/scores\./gi, 'забегает в дом.'],
  [/scores/gi, 'забегает в дом'],
  [/scored\./gi, 'забежал в дом.'],
  [/scored/gi, 'забежал в дом'],

  // Ball trajectory and contact
  [/on a sharp line drive/gi, 'на резком лайн-драйве'],
  [/on a soft line drive/gi, 'на мягком лайн-драйве'],
  [/on a line drive/gi, 'на лайн-драйве'],
  [/on a deep fly ball/gi, 'на глубоком флайболе'],
  [/on a high fly ball/gi, 'на высоком флайболе'],
  [/on a fly ball/gi, 'на флайболе'],
  [/on a sharp ground ball/gi, 'на резком граундболе'],
  [/on a soft ground ball/gi, 'на слабом граундболе'],
  [/on a ground ball/gi, 'на граундболе'],
  [/on a popup/gi, 'на поп-ауте'],
  [/on a bunt/gi, 'на банте'],

  // Directions
  [/to deep left-center field/gi, 'глубоко в левый центрфилд'],
  [/to deep right-center field/gi, 'глубоко в правый центрфилд'],
  [/to left-center field/gi, 'в левый центрфилд'],
  [/to right-center field/gi, 'в правый центрфилд'],
  [/to deep left field/gi, 'глубоко в левый аутфилд'],
  [/to deep right field/gi, 'глубоко в правый аутфилд'],
  [/to deep center field/gi, 'глубоко в центрфилд'],
  [/to left center field/gi, 'в левый центрфилд'],
  [/to right center field/gi, 'в правый центрфилд'],
  [/to left field/gi, 'в левый аутфилд'],
  [/to right field/gi, 'в правый аутфилд'],
  [/to center field/gi, 'в центрфилд'],
  [/down the left field line/gi, 'вдоль левой линии поля'],
  [/down the right field line/gi, 'вдоль правой линии поля'],

  // Fielders & Positions
  [/first baseman/gi, '1-й бейзмен'],
  [/second baseman/gi, '2-й бейзмен'],
  [/third baseman/gi, '3-й бейзмен'],
  [/shortstop/gi, 'шортстоп'],
  [/catcher/gi, 'кэтчер'],
  [/pitcher/gi, 'питчер'],
  [/left fielder/gi, 'левый аутфилдер'],
  [/center fielder/gi, 'центрфилдер'],
  [/right fielder/gi, 'правый аутфилдер'],

  // Bases & locations
  [/at first base/gi, 'на 1-й базе'],
  [/at second base/gi, 'на 2-й базе'],
  [/at third base/gi, 'на 3-й базе'],
  [/at home plate/gi, 'в доме'],
  [/at the plate/gi, 'в доме'],
  [/to first base/gi, 'к 1-й базе'],
  [/to second base/gi, 'ко 2-й базе'],
  [/to third base/gi, 'к 3-й базе'],
  [/to the plate/gi, 'в дом'],
  [/to home/gi, 'в дом'],

  // Movements & Outcomes
  [/advances to second/gi, 'продвигается на 2-ю базу'],
  [/advances to third/gi, 'продвигается на 3-ю базу'],
  [/advances to home/gi, 'забегает в дом'],
  [/out at first/gi, 'аут на 1-й'],
  [/out at second/gi, 'аут на 2-й'],
  [/out at third/gi, 'аут на 3-й'],
  [/out at home/gi, 'аут в доме'],
  [/unassisted/gi, 'самостоятельно'],
  [/in foul territory/gi, 'в фаул-зоне'],
  [/foul ball/gi, 'фаул-бол'],
  [/foul tip/gi, 'фаул-тип'],
  [/fielding error/gi, 'ошибка в поле'],
  [/throwing error/gi, 'ошибка броска'],
  [/missed catch error/gi, 'ошибка при ловле'],
  [/deflected by/gi, 'рикошетом от'],
  [/bases loaded/gi, 'полные базы'],
  [/with bases loaded/gi, 'при полных базах'],
];

const PITCH_TYPES: Record<string, string> = {
  'Four-Seam Fastball': '4-сим фастбол',
  '4-Seam Fastball': '4-сим фастбол',
  'Two-Seam Fastball': '2-сим фастбол',
  '2-Seam Fastball': '2-сим фастбол',
  'Fastball': 'Фастбол',
  'Slider': 'Слайдер',
  'Changeup': 'Чейнджап',
  'Curveball': 'Кервбол',
  'Knuckle Curve': 'Накл-керв',
  'Sinker': 'Синкер',
  'Cutter': 'Каттер',
  'Sweeper': 'Свипер',
  'Splitter': 'Сплиттер',
  'Knuckleball': 'Наклбол',
  'Slurve': 'Слерв',
  'Pitch': 'Бросок',
};

export function translatePitchType(pitchType?: string): string {
  if (!pitchType) return 'Бросок';
  return PITCH_TYPES[pitchType] || pitchType;
}

/**
 * Fast synchronous translation using domain baseball rules.
 * Runs instantly (0ms) without network.
 */
export function translateBaseballPlay(text: string): string {
  if (!text) return text;
  // If already Cyrillic, no need to translate
  if (/[а-яё]/i.test(text)) return text;

  let result = text;
  for (const [pattern, replacement] of BASEBALL_TERMS) {
    result = result.replace(pattern, replacement);
  }

  // Common prepositions and conjunctions in baseball context
  result = result
    .replace(/\bto\s+([А-Яа-яЁё])/g, 'к $1')
    .replace(/\bto\b/g, 'к')
    .replace(/\bfrom\b/g, 'от')
    .replace(/\bwith\b/g, 'с')
    .replace(/\band\b/g, 'и')
    .replace(/\bby\b/g, 'игрока');

  return result;
}

/**
 * Online translation with fallback:
 * 1. Google Translate GTX
 * 2. MyMemory Translated API
 * 3. Local baseball translator fallback
 */
export async function fetchOnlineTranslation(text: string): Promise<string> {
  if (!text || /[а-яё]/i.test(text)) return text;

  // 1. Google Translate
  try {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`;
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(gUrl, { signal: ctrl.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = (data[0] as Array<[string, string]>)
          .map((seg) => (seg && seg[0] ? seg[0] : ''))
          .join('');
        if (translated && translated.trim().length > 0) {
          return translated;
        }
      }
    }
  } catch {
    // Fallback to secondary source
  }

  // 2. MyMemory Translated API
  try {
    const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`;
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(mUrl, { signal: ctrl.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const match = data?.responseData?.translatedText;
      if (match && typeof match === 'string' && match.trim().length > 0 && !match.includes('MYMEMORY WARNING')) {
        return match;
      }
    }
  } catch {
    // Fallback to local
  }

  // 3. Fallback to instant baseball rule translation
  return translateBaseballPlay(text);
}
