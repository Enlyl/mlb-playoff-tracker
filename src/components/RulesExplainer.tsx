import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Users,
  Trophy,
  Layers,
  HelpCircle,
  X,
  Info,
  MapPin,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { AnatomyBaseballFigure } from './AnatomyBaseballFigure';

interface ScenarioStep {
  title: string;
  description: string;
  ballPos: { x: number; y: number };
  runners: {
    first?: boolean;
    second?: boolean;
    third?: boolean;
    home?: boolean;
  };
  batterPos?: { x: number; y: number };
  count: { balls: number; strikes: number; outs: number };
  scoreChange?: number;
  soundType?: 'crack' | 'catch' | 'homerun' | 'strikeout' | 'score';
  highlightFieldZone?: 'strikezone' | 'outfield' | 'infield' | 'firstBase' | 'secondBase' | 'thirdBase' | 'homePlate';
  trajectory?: 'pitch' | 'hit' | 'homerun' | 'none';
  batSwing?: boolean;
}

interface RuleScenario {
  id: string;
  title: string;
  category: string;
  shortDesc: string;
  steps: ScenarioStep[];
}

const SCENARIOS: RuleScenario[] = [
  {
    id: 'strike-ball-walk',
    title: '1. Дуэль: Баттер vs Питчер (Страйки, Болы и Walk)',
    category: 'Базовые основы',
    shortDesc: 'Питчер бросает мяч. Если мяч в страйк-зоне — это страйк. 3 страйка = Аут. 4 бола = Бесплатная 1-я база.',
    steps: [
      {
        title: 'Исходное положение: Счет 0-0',
        description: 'Питчер готовится бросить мяч через воображаемый прямоугольник над домом (Страйк-зону). Баттер ждет броска.',
        ballPos: { x: 200, y: 220 },
        runners: {},
        count: { balls: 0, strikes: 0, outs: 0 },
        highlightFieldZone: 'strikezone',
        trajectory: 'none',
        batSwing: false,
      },
      {
        title: 'Шаг 1: Страйк! (Подача в зону 155 км/ч)',
        description: 'Мяч пролетел прямо через страйк-зону, баттер не махнул. Судья фиксирует Strike 1.',
        ballPos: { x: 200, y: 345 },
        runners: {},
        count: { balls: 0, strikes: 1, outs: 0 },
        soundType: 'catch',
        highlightFieldZone: 'strikezone',
        trajectory: 'pitch',
        batSwing: false,
      },
      {
        title: 'Шаг 2: Бол! (Подача мимо зоны)',
        description: 'Питчер бросил мяч слишком широко. Баттер прочитал траекторию и не стал махать. Счет 1 Бол, 1 Страйк.',
        ballPos: { x: 165, y: 345 },
        runners: {},
        count: { balls: 1, strikes: 1, outs: 0 },
        soundType: 'catch',
        trajectory: 'pitch',
        batSwing: false,
      },
      {
        title: 'Шаг 3: Страйкаут (Strikeout / K)!',
        description: '3-й страйк! Баттер машет мимо мяча и выбывает в АУТ. Три аута — и защита с нападением меняются местами.',
        ballPos: { x: 200, y: 345 },
        runners: {},
        count: { balls: 1, strikes: 3, outs: 1 },
        soundType: 'strikeout',
        highlightFieldZone: 'strikezone',
        trajectory: 'pitch',
        batSwing: true,
      },
      {
        title: 'Альтернатива: 4 Бола = Уок (Walk / База на болах)',
        description: 'Если питчер бросает 4 бола до 3-х страйков, баттер без удара автоматически занимает 1-ю базу!',
        ballPos: { x: 200, y: 345 },
        runners: { first: true },
        count: { balls: 4, strikes: 0, outs: 0 },
        highlightFieldZone: 'firstBase',
        trajectory: 'none',
        batSwing: false,
      },
    ],
  },
  {
    id: 'base-hit',
    title: '2. Удар в поле: Сингл и Дабл',
    category: 'Атака и хиты',
    shortDesc: 'Баттер отбивает мяч на траву поля и бежит по базам против часовой стрелки.',
    steps: [
      {
        title: 'Контакт: Мощный щелчок биты!',
        description: 'Баттер идеально подстраивается под мяч. Звучит звонкий хруст деревянной биты (Bat Crack)!',
        ballPos: { x: 200, y: 340 },
        runners: {},
        count: { balls: 1, strikes: 2, outs: 0 },
        soundType: 'crack',
        batSwing: true,
        trajectory: 'none',
      },
      {
        title: 'Мяч в аутфилде (Сингл / Single)',
        description: 'Мяч прошивает инфилд и катится по траве аутфилда. Баттер успевает добежать и коснуться 1-й базы!',
        ballPos: { x: 280, y: 140 },
        runners: { first: true },
        count: { balls: 1, strikes: 2, outs: 0 },
        highlightFieldZone: 'firstBase',
        trajectory: 'hit',
        batSwing: false,
      },
      {
        title: 'Дабл (Double) — рывок на 2-ю базу!',
        description: 'Мяч отскакивает от забора. Бегун включает спринт, срезает угол на 1-й базе и в подкате занимает 2-ю базу!',
        ballPos: { x: 110, y: 85 },
        runners: { second: true },
        count: { balls: 1, strikes: 2, outs: 0 },
        highlightFieldZone: 'secondBase',
        trajectory: 'hit',
        batSwing: false,
      },
    ],
  },
  {
    id: 'homerun',
    title: '3. Хоум-ран (Home Run) — Главный экшен!',
    category: 'Хиты',
    shortDesc: 'Мяч улетает за пределы забора игрового поля в трибуны. Автоматическое очко!',
    steps: [
      {
        title: 'Взрывной замах!',
        description: 'Баттер ловит ошибку питчера по центру зоны и запускает мяч по высоченной баллистической дуге.',
        ballPos: { x: 200, y: 340 },
        runners: { first: true },
        count: { balls: 2, strikes: 2, outs: 1 },
        soundType: 'crack',
        batSwing: true,
        trajectory: 'none',
      },
      {
        title: 'Полет над забором стадиона (125+ метров)!',
        description: 'Мяч перелетает забор аутфилда прямо к ликующим болельщикам на трибуны! Это Хоум-ран!',
        ballPos: { x: 200, y: 20 },
        runners: { first: true },
        count: { balls: 2, strikes: 2, outs: 1 },
        soundType: 'homerun',
        highlightFieldZone: 'outfield',
        trajectory: 'homerun',
        batSwing: false,
      },
      {
        title: 'Круг почёта: +2 очка (Runs) на табло!',
        description: 'Раннер с 1-й базы и сам бьющий не торопясь обегают все базы и наступают на дом. +2 очка команде!',
        ballPos: { x: 200, y: 345 },
        runners: {},
        count: { balls: 0, strikes: 0, outs: 1 },
        scoreChange: 2,
        soundType: 'score',
        highlightFieldZone: 'homePlate',
        trajectory: 'none',
        batSwing: false,
      },
    ],
  },
  {
    id: 'grand-slam',
    title: '4. Гранд-слэм (Grand Slam) — Королевский удар',
    category: 'Хиты',
    shortDesc: 'Хоум-ран при занятых ВСЕХ трех базах (Bases Loaded). Приносит сразу 4 очка одним взмахом биты!',
    steps: [
      {
        title: 'Базы загружены (Bases Loaded)',
        description: 'На 1-й, 2-й и 3-й базах стоят раннеры. Напряжение на стадионе накалено до предела.',
        ballPos: { x: 200, y: 220 },
        runners: { first: true, second: true, third: true },
        count: { balls: 3, strikes: 2, outs: 2 },
        highlightFieldZone: 'infield',
        trajectory: 'none',
        batSwing: false,
      },
      {
        title: 'Удар в космос!',
        description: 'Баттер выбивает мяч за дальний забор! Фредди Фримен в 1-й игре Мировой Серии 2024 сотворил именно это!',
        ballPos: { x: 310, y: 25 },
        runners: { first: true, second: true, third: true },
        count: { balls: 3, strikes: 2, outs: 2 },
        soundType: 'homerun',
        trajectory: 'homerun',
        batSwing: true,
      },
      {
        title: '4 очка забегают в дом!',
        description: 'Все 3 раннера плюс сам баттер по очереди наступают на дом. Команда зарабатывает сразу 4 рана!',
        ballPos: { x: 200, y: 345 },
        runners: {},
        count: { balls: 0, strikes: 0, outs: 2 },
        scoreChange: 4,
        soundType: 'score',
        highlightFieldZone: 'homePlate',
        trajectory: 'none',
        batSwing: false,
      },
    ],
  },
  {
    id: 'outs-defense',
    title: '5. Защита: Как выбивают ауты (Flyout, Force Out, Tag Out)',
    category: 'Защита',
    shortDesc: 'Защита должна сделать 3 аута, чтобы завершить половину иннинга. Вот основные способы.',
    steps: [
      {
        title: 'Способ 1: Флай-аут (Flyout)',
        description: 'Баттер подбил мяч в воздух. Полевой игрок ловит его на лету ДО касания земли = моментальный Аут!',
        ballPos: { x: 290, y: 110 },
        runners: {},
        count: { balls: 0, strikes: 1, outs: 1 },
        soundType: 'catch',
        trajectory: 'hit',
        batSwing: true,
      },
      {
        title: 'Способ 2: Форс-аут на 1-й базе (Force Out)',
        description: 'Мяч катится по траве. Защитник ловит его и пасует мяч на 1-ю базу раньше, чем бьющий коснется базы.',
        ballPos: { x: 275, y: 230 },
        runners: {},
        count: { balls: 0, strikes: 1, outs: 2 },
        soundType: 'catch',
        highlightFieldZone: 'firstBase',
        trajectory: 'hit',
        batSwing: false,
      },
      {
        title: 'Способ 3: Тег-аут (Tag Out / Осаливание)',
        description: 'При попытке украсть базу защитник должен прикоснуться ловушкой с мячом к бегуну до касания базы.',
        ballPos: { x: 200, y: 155 },
        runners: {},
        count: { balls: 0, strikes: 1, outs: 3 },
        soundType: 'strikeout',
        highlightFieldZone: 'secondBase',
        trajectory: 'hit',
        batSwing: false,
      },
    ],
  },
  {
    id: 'double-play',
    title: '6. Double Play (Двойной аут за 1 розыгрыш!)',
    category: 'Защита',
    shortDesc: 'Виртуозная комбинация защиты: 2 аута подряд за считанные секунды.',
    steps: [
      {
        title: 'Раннер на первой базе',
        description: 'Защита готова к приему низового мяча (граундбола) для двойного выбивания.',
        ballPos: { x: 200, y: 220 },
        runners: { first: true },
        count: { balls: 1, strikes: 1, outs: 0 },
        highlightFieldZone: 'firstBase',
        trajectory: 'none',
        batSwing: false,
      },
      {
        title: 'Пас на 2-ю базу: Аут №1!',
        description: 'Шортстоп ловит мяч и мгновенно пасует игроку на 2-й базе, выводя первого раннера в аут.',
        ballPos: { x: 200, y: 155 },
        runners: {},
        count: { balls: 1, strikes: 1, outs: 1 },
        soundType: 'catch',
        highlightFieldZone: 'secondBase',
        trajectory: 'hit',
        batSwing: false,
      },
      {
        title: 'Бросок на 1-ю базу: Аут №2! (Double Play)',
        description: 'Защитник 2-й базы в прыжке посылает мяч на 1-ю базу. Баттер не успел добежать. Сразу 2 аута!',
        ballPos: { x: 275, y: 230 },
        runners: {},
        count: { balls: 1, strikes: 1, outs: 2 },
        soundType: 'catch',
        highlightFieldZone: 'firstBase',
        trajectory: 'hit',
        batSwing: false,
      },
    ],
  },
];

export interface FieldInteractiveItem {
  id: string;
  type: 'position' | 'base' | 'zone';
  badge: string;
  badgeBg: string;
  name: string;
  subtitle: string;
  dimensions?: string;
  desc: string;
  tacticalNote?: string;
}

export const POSITIONS = [
  {
    num: 1,
    abbr: 'P',
    name: 'Pitcher (Питчер / Подающий)',
    desc: 'Бросает подачи в дом с горки, контролирует темп игры, главная фигура обороны команды.',
    tacticalNote: 'Диктует весь рисунок матча, чередуя фастболы (до 165 км/ч), слайдеры, чейнджапы и кервболы.',
  },
  {
    num: 2,
    abbr: 'C',
    name: 'Catcher (Кэтчер / Уловитель)',
    desc: 'Сидит на корточках за баттером в защитном снаряжении, принимает подачи, руководит тактикой бросков.',
    tacticalNote: 'Полевой генерал: пальцами шифрует питчеру тип броска и траекторию, блокирует отскоки и предотвращает кражи баз бросками на 2B.',
  },
  {
    num: 3,
    abbr: '1B',
    name: 'First Baseman (1-я база)',
    desc: 'Принимает подавляющее большинство передач инфилда для оформления форс-аутов.',
    tacticalNote: 'Обычно игрок высокого роста с длинным шагом и растяжкой, чтобы дотягиваться до неточных бросков партнеров, удерживая ногу на подушке.',
  },
  {
    num: 4,
    abbr: '2B',
    name: 'Second Baseman (2-я база)',
    desc: 'Охраняет правую часть инфилда, ключевой участник комбинаций двойного аута (Double Play).',
    tacticalNote: 'Чрезвычайно маневренный игрок с молниеносным разворотом корпуса для броска на 1B в воздухе или в падении.',
  },
  {
    num: 5,
    abbr: '3B',
    name: 'Third Baseman (3-я база / Hot Corner)',
    desc: 'Защитник "горячего угла", принимает мощнейшие прямые выстрелы от бьющих-правшей.',
    tacticalNote: 'Требует молниеносной реакции (мяч прилетает за 0.3 сек со скоростью 175 км/ч) и сильнейшей руки для броска через всё поле на 1B.',
  },
  {
    num: 6,
    abbr: 'SS',
    name: 'Shortstop (Шортстоп)',
    desc: 'Самый ловкий и атлетичный защитник, закрывает ключевую зону между 2-й и 3-й базами.',
    tacticalNote: 'Лидер инфилда: максимальный радиус перехвата граундболов и сложнейшие броски на бегу в противоход.',
  },
  {
    num: 7,
    abbr: 'LF',
    name: 'Left Fielder (Левый аутфилдер)',
    desc: 'Ловит флайболы и рикошеты у левой линии забора стадиона.',
    tacticalNote: 'Контролирует мощные пулл-удары праворуких бьющих и читает отскоки от высокого левого забора стадиона.',
  },
  {
    num: 8,
    abbr: 'CF',
    name: 'Center Fielder (Центрфилдер)',
    desc: 'Капитан аутфилда, самый быстрый бегун команды, покрывает гигантское пространство газона.',
    tacticalNote: 'Обладает приоритетом при ловле любых верховых мячей (Flyballs) между левым и правым аутфилдерами.',
  },
  {
    num: 9,
    abbr: 'RF',
    name: 'Right Fielder (Правый аутфилдер)',
    desc: 'Обладает самой мощной и точной рукой среди полевых игроков для прямых бросков на 3-ю базу и в дом.',
    tacticalNote: 'Должен уметь по воздуху без отскока бросить мяч на 90+ метров точно в ловушку кэтчера, чтобы ликвидировать бегущего в дом соперника.',
  },
];

export const FIELD_ZONES: Record<string, FieldInteractiveItem> = {
  'home-plate': {
    id: 'home-plate',
    type: 'base',
    badge: 'HOME',
    badgeBg: '#10b981',
    name: 'Дом (Home Plate)',
    subtitle: 'Финальная и главная база стадиона',
    dimensions: 'Ширина 17 дюймов (43.2 см), пятиугольная форма из белой резины',
    desc: 'Единственная пятиугольная база в бейсболе. Баттер начинает здесь розыгрыш на бите, и раннер должен коснуться дома, чтобы команде засчитали 1 очко (Run). За домом сидят кэтчер и главный судья (Home Plate Umpire).',
    tacticalNote: 'При близких розыгрышах раннеры применяют акробатические скольжения ("слайды") руками или ногами вперед, чтобы обойти перчатку кэтчера до касания пластины.',
  },
  'first-base': {
    id: 'first-base',
    type: 'base',
    badge: '1B',
    badgeBg: '#f59e0b',
    name: 'Первая база (First Base)',
    subtitle: 'Начальная цель бьющего после контакта с мячом',
    dimensions: '90 футов (27.43 м) от дома; увеличенный квадрат 18×18 дюймов (45.7 см)',
    desc: 'Сюда устремляется любой бьющий сразу после удара. Единственная база, которую раннеру разрешено пробегать на полной скорости насквозь без риска быть осаленным, если он сразу возвращается на подушку без попытки бежать на 2-ю базу.',
    tacticalNote: 'Большинство аутов в бейсболе оформляются именно здесь — защитники пасуют мяч на 1B до прикосновения бегуна (Force Out).',
  },
  'second-base': {
    id: 'second-base',
    type: 'base',
    badge: '2B',
    badgeBg: '#f59e0b',
    name: 'Вторая база (Second Base / Keystone)',
    subtitle: 'Скорринг-позиция (Scoring Position)',
    dimensions: '127 футов 3⅜ дюйма (38.8 м) от дома по диагонали через горку',
    desc: 'Находится на вершине квадрата инфилда ("Keystone"). Считается позицией для взятия очков: при любом сингле в аутфилд быстрый бегун со 2-й базы успевает забежать в дом и принести очко.',
    tacticalNote: 'Эпицентр попыток кражи баз (Stolen Base) и акробатических завершений двойных аутов (Double Play) шортстопом и вторым бейсменом.',
  },
  'third-base': {
    id: 'third-base',
    type: 'base',
    badge: '3B',
    badgeBg: '#f59e0b',
    name: 'Третья база (Third Base / Hot Corner)',
    subtitle: 'Предбанник дома — 27 метров до очка',
    dimensions: '90 футов (27.43 м) от второй базы и дома',
    desc: 'Последний рубеж перед взятием очка. Если раннер добрался до третьей базы, он может забежать в дом даже без полноценного удара — на жертвенном флае (Sac Fly), диком броске питчера (Wild Pitch) или пасболе кэтчера.',
    tacticalNote: 'Охраняется третьим бейсменом ("Hot Corner"), которому приходится отражать прямые пушечные выстрелы биты со скоростью до 175 км/ч.',
  },
  'mound': {
    id: 'mound',
    type: 'zone',
    badge: 'MOUND',
    badgeBg: '#b45309',
    name: 'Питчерская горка (Pitcher’s Mound)',
    subtitle: 'Центральная высота бейсбольного поля',
    dimensions: 'Диаметр 18 футов (5.5 м), высота 10 дюймов (25.4 см). Дистанция до дома: 60 футов 6 дюймов (18.44 м)',
    desc: 'Земляная насыпь в центре инфилда. В центре вмонтирована резиновая пластина (Pitcher’s Rubber, 24×6 дюймов). Питчер обязан держать опорную ногу на пластине в момент начала броска.',
    tacticalNote: 'Возвышение в 25.4 см позволяет питчеру атаковать страйк-зону под более крутым нисходящим углом с максимальным использованием инерции тела.',
  },
  'infield': {
    id: 'infield',
    type: 'zone',
    badge: 'INFIELD',
    badgeBg: '#92400e',
    name: 'Инфилд (Внутреннее поле / Diamond)',
    subtitle: 'Грунтовый ромб сверхвысокой динамики',
    dimensions: 'Квадрат 90×90 футов (27.43 × 27.43 м), покрыт глиняно-песчаной смесью',
    desc: 'Зона быстрой и плотной обороны. Здесь играют 4 полевых инфилдера (1B, 2B, SS, 3B), разыгрываются граундболы (низовые мячи), форс-ауты и виртуозные дабл-плеи.',
    tacticalNote: 'Поверхность инфилда поддерживается идеально ровной и поливается водой между иннингами, чтобы исключить случайные рикошеты при скорости мяча 150+ км/ч.',
  },
  'outfield': {
    id: 'outfield',
    type: 'zone',
    badge: 'OUTFIELD',
    badgeBg: '#059669',
    name: 'Аутфилд (Внешнее травяное поле)',
    subtitle: 'Огромный простор для дальних флайболов',
    dimensions: 'Глубина от 300 до 415+ футов (91–126+ м) от дома до дальнего забора',
    desc: 'Естественный или гибридный газон, патрулируемый тремя быстрыми аутфилдерами (LF, CF, RF). Любой мяч, пойманный здесь в воздухе до касания земли — автоматический аут (Flyout).',
    tacticalNote: 'Если мяч приземляется на траву в коридоре между защитниками, атакующий получает шанс забежать на 2-ю или 3-ю базу (Extra-base hit).',
  },
  'warning-track': {
    id: 'warning-track',
    type: 'zone',
    badge: 'WALL & TRACK',
    badgeBg: '#d97706',
    name: 'Предупредительная дорожка и забор (Warning Track & Wall)',
    subtitle: 'Граница игрового поля и трибун',
    dimensions: 'Ширина дорожки 10–15 футов (3–4.5 м), забор высотой от 2.4 до 11.3 м (Green Monster)',
    desc: 'Гравийная полоса перед дальним забором стадиона. Когда аутфилдер бежит спиной к стене, глядя вверх на мяч, звук и сопротивление гравия под шипами предупреждают о близости жесткого препятствия.',
    tacticalNote: 'Мяч, перелетевший через забор на лету в пределах фол-линий — это Хоум-ран. Если мяч перепрыгнул забор после отскока от поля — это Граунд-рул дабл (+2 базы).',
  },
  'batter-boxes': {
    id: 'batter-boxes',
    type: 'zone',
    badge: 'BOX',
    badgeBg: '#64748b',
    name: 'Бэттерс-боксы (Batter’s Boxes)',
    subtitle: 'Прямоугольники для бьющего по бокам дома',
    dimensions: '4×6 футов (1.22 × 1.83 м) слева и справа от дома',
    desc: 'Размеченные белым мелом зоны, в одной из которых обязан стоять бьющий во время подачи. Правый бокс — для правшей, левый бокс — для левшей или переключающихся бьющих (Switch-hitters).',
    tacticalNote: 'При ударе по мячу нога бьющего не должна полностью находиться за пределами линий бокса, иначе объявляется нелегальный удар и аут.',
  },
  'strike-zone': {
    id: 'strike-zone',
    type: 'zone',
    badge: 'STRIKE ZONE',
    badgeBg: '#ef4444',
    name: 'Страйк-зона (Strike Zone)',
    subtitle: 'Виртуальная мишень питчера над домом',
    dimensions: 'Ширина 17 дюймов (по ширине дома), от коленей до середины груди бьющего',
    desc: 'Невидимый вживую трехмерный объем над домом. Если мяч пересекает эту плоскость и бьющий не делает замаха, главный судья объявляет Страйк (Called Strike).',
    tacticalNote: '3 страйка = Страйкаут (Аут). 4 бола (броска мимо зоны без замаха) = Уок (Walk, свободный переход бьющего на 1-ю базу).',
  },
  'foul-lines': {
    id: 'foul-lines',
    type: 'zone',
    badge: 'FOUL LINES',
    badgeBg: '#e2e8f0',
    name: 'Фол-линии и фол-столбы (Foul Lines & Poles)',
    subtitle: 'Границы честной игры под углом 90 градусов',
    dimensions: 'Линии длиной 300–350 футов от дома до высоких желтых фол-столбов на дальнем заборе',
    desc: 'Меловые линии, определяющие игровую территорию (Fair territory). Мяч, приземлившийся за их пределами — это Фол-бол (Foul Ball).',
    tacticalNote: 'Сами меловые линии и желтые фол-столбы на заборе считаются ИГРОВЫМ полем! Мяч, ударившийся в фол-столб на заборе — стопроцентный Хоум-ран!',
  },
  'baselines': {
    id: 'baselines',
    type: 'zone',
    badge: 'BASEPATHS',
    badgeBg: '#fef08a',
    name: 'Базовые дорожки (Basepaths)',
    subtitle: 'Беговые коридоры между базами',
    dimensions: 'Прямые линии 90 футов (27.43 м), допустимый коридор 3 фута (0.9 м)',
    desc: 'Траектории перемещения раннеров. Бегун обязан двигаться по прямой линии. Если для уклонения от осаливания защитником бегун выбегает за пределы коридора более чем на 3 фута — фиксируется Аут.',
    tacticalNote: 'При беге на 1-ю базу бегун обязан бежать в специально размещенном внешнем коридоре, чтобы не мешать броску кэтчера.',
  },
};

export interface GlossaryItem {
  term: string;
  def: string;
  category: 'players' | 'leagues' | 'final' | 'basics';
}

const GLOSSARY: GlossaryItem[] = [
  // ── 1. ИГРОКИ И ИХ ФУНКЦИИ ──
  {
    category: 'players',
    term: 'Starting Pitcher (SP / Стартовый питчер)',
    def: 'Начинает матч, проводит на горке 5–7 иннингов (80–100 бросков). Ротация стартеров обычно состоит из 5 топ-питчеров, играющих раз в 5 дней.',
  },
  {
    category: 'players',
    term: 'Relief Pitcher & Bullpen (Реливер / Буллпен)',
    def: 'Питчеры смены, разминающиеся в буллпене (за пределами поля) и выходящие в средних иннингах (6–8) на замену уставшему стартеру.',
  },
  {
    category: 'players',
    term: 'Setup Man (Сетап-мен)',
    def: 'Ведущий реливер, бросающий решающий 8-й иннинг, чтобы подготовить выход клоузера на 9-й иннинг.',
  },
  {
    category: 'players',
    term: 'Closer (Клоузер)',
    def: 'Главный специалист концовки матча. Выходит в 9-м иннинге при минимальном перевесе команды в счете, чтобы оформить победу (Save / Сейв).',
  },
  {
    category: 'players',
    term: 'Catcher (Кэтчер / Уловитель)',
    def: 'Полевой генерал. Сидит на корточках за баттером в защитной маске и нагруднике. Жестами пальцев заказывает питчеру тип броска и скорость, блокирует отскоки и предотвращает кражи баз.',
  },
  {
    category: 'players',
    term: 'First Baseman (1B / Первая база)',
    def: 'Обычно высокий, физически мощный игрок с длинным шагом и растяжкой. Ловит почти все мячи от шортстопа и 2-й базы для оформления форс-аутов.',
  },
  {
    category: 'players',
    term: 'Second Baseman (2B / Вторая база)',
    def: 'Быстрый и маневренный защитник правой стороны центра поля. Ключевой участник комбинации "Дабл-плей" (Double Play).',
  },
  {
    category: 'players',
    term: 'Third Baseman (3B / Третья база / "Hot Corner")',
    def: 'Защитник "горячего угла". Сюда прилетают самые мощные прямые удары от праворуких бьющих со скоростью до 180 км/ч. Требует молниеносной реакции и мощной руки для броска через всё поле на 1B.',
  },
  {
    category: 'players',
    term: 'Shortstop (SS / Шортстоп)',
    def: 'Самый техничный и атлетичный защитник в бейсболе. Закрывает зону между 2-й и 3-й базами, перехватывает больше всего ударов соперника.',
  },
  {
    category: 'players',
    term: 'Center Fielder (CF / Центрфилдер)',
    def: 'Капитан аутфилда. Самый скоростной игрок команды, контролирующий гигантское пространство от левого до правого забора стадиона.',
  },
  {
    category: 'players',
    term: 'Corner Outfielders (LF / RF / Левый и Правый аутфилдеры)',
    def: 'Ловят дальние мячи у забора. Правый филдер (RF) традиционно обладает самой сильной рукой для прямых дальних бросков через всё поле на 3-ю базу и в дом.',
  },
  {
    category: 'players',
    term: 'Designated Hitter (DH / Назначенный бьющий)',
    def: 'Игрок атакующего лайн-апа, который только отбивает на бите вместо питчера, но сам не выходит играть в защите на поле.',
  },
  {
    category: 'players',
    term: 'Pinch Hitter (PH / Пинч-хиттер)',
    def: 'Запасной бьющий, выпускаемый главным тренером со скамейки в решающий момент иннинга вместо менее результативного партнера.',
  },
  {
    category: 'players',
    term: 'Pinch Runner (PR / Пинч-раннер)',
    def: 'Спринтер, выходящий на замену уже стоящего на базе игрока, чтобы украсть базу или занести решающее очко на последних секундах встречи.',
  },
  {
    category: 'players',
    term: 'Utility Player (Утилити-игрок)',
    def: 'Ценнейший универсальный солдат, способный одинаково качественно закрыть 3–5 разных позиций на поле (например, 2B, 3B, SS и аутфилд).',
  },

  // ── 2. ЛИГИ И СТРУКТУРА СЕЗОНА ──
  {
    category: 'leagues',
    term: 'MLB (Major League Baseball)',
    def: 'Главная бейсбольная лига планеты. Объединяет 30 клубов: 29 команд из США и 1 команду из Канады (Toronto Blue Jays).',
  },
  {
    category: 'leagues',
    term: 'AL (American League / Американская Лига)',
    def: 'Основана в 1901 году (15 клубов). Делится на три дивизиона: Восток (East), Центр (Central) и Запад (West).',
  },
  {
    category: 'leagues',
    term: 'NL (National League / Национальная Лига)',
    def: 'Старейшая профессиональная лига в мировом спорте (основана в 1876 г., так называемая "Старшая лига", 15 клубов). Также состоит из 3 дивизионов.',
  },
  {
    category: 'leagues',
    term: 'Regular Season (Регулярка: 162 матча)',
    def: 'Каждая команда проводит марафон из 162 игр за 6 месяцев (с конца марта по конец сентября), играя практически ежедневно.',
  },
  {
    category: 'leagues',
    term: 'Wild Card Series (Раунд Уайлд-кард)',
    def: 'Первый раунд плей-офф. 6 команд в каждой лиге (3 победителя дивизионов + 3 лучшие команды Wild Card). Серии длятся до 2 побед (Best of 3).',
  },
  {
    category: 'leagues',
    term: 'ALDS & NLDS (Division Series / Серии Дивизионов)',
    def: 'Второй раунд плей-офф. Серии проводятся до 3 побед (Best of 5). 2 лучшие команды регулярки пропускают первый раунд (Bye).',
  },
  {
    category: 'leagues',
    term: 'ALCS & NLCS (Championship Series / Финалы Лиг)',
    def: 'Финалы Американской и Национальной Лиг до 4 побед (Best of 7). Победитель каждой серии становится чемпионом своей лиги.',
  },
  {
    category: 'leagues',
    term: 'Pennant (Пенант / Вымпел чемпиона)',
    def: 'Исторический флаг-знамя чемпиона Американской или Национальной Лиги, дающий путевку в грандиозный финал года.',
  },

  // ── 3. ГЛАВНЫЙ ФИНАЛ (WORLD SERIES) ──
  {
    category: 'final',
    term: 'World Series (Мировая Серия)',
    def: 'Суперфинал бейсбола в конце октября. Битва до 4 побед (Best of 7) между чемпионом Американской Лиги и чемпионом Национальной Лиги.',
  },
  {
    category: 'final',
    term: 'Fall Classic ("Осенняя Классика")',
    def: 'Легендарное прозвище Мировой Серии, проводящейся ежегодно золотой осенью начиная с 1903 года.',
  },
  {
    category: 'final',
    term: 'Commissioner’s Trophy (Кубок Комиссара)',
    def: 'Главный серебряный трофей победителя Мировой Серии, созданный ювелирным домом Tiffany & Co. Украшен 30 золотыми флагами клубов MLB.',
  },
  {
    category: 'final',
    term: 'World Series MVP (Премия имени Уилли Мейса)',
    def: 'Награда лучшему игроку финальной Мировой Серии за ключевой вклад в чемпионство.',
  },
  {
    category: 'final',
    term: 'Championship Ring (Чемпионский перстень)',
    def: 'Уникальное массивное кольцо из белого и желтого золота с сотнями бриллиантов и сапфиров, изготавливаемое индивидуально для каждого игрока-чемпиона.',
  },

  // ── 4. БАЗОВЫЕ ПРАВИЛА И СТАТИСТИКА ──
  {
    category: 'basics',
    term: 'Inning (Иннинг)',
    def: 'Период матча (всего 9). Состоит из верха (Top, бьют гости) и низа (Bottom, бьют хозяева). Каждая половина идет ровно до 3 аутов защиты.',
  },
  {
    category: 'basics',
    term: 'Run (Ран / Очко)',
    def: 'Единица счета в бейсболе. Начисляется, когда бегун поочередно касается 1-й, 2-й, 3-й баз и возвращается в дом (Home Plate).',
  },
  {
    category: 'basics',
    term: 'Strikeout / K (Страйкаут)',
    def: 'Выбывание бьющего в аут после 3 страйков. Буква «K» — официальное обозначение страйкаута в бейсбольных протоколах.',
  },
  {
    category: 'basics',
    term: 'Walk / BB (Base on Balls)',
    def: 'Бесплатный переход бьющего на 1-ю базу после 4 неточных бросков питчера (болов) вне страйк-зоны.',
  },
  {
    category: 'basics',
    term: 'Home Run (HR / Хоум-ран)',
    def: 'Удар, после которого мяч перелетает внешний забор поля на трибуны. Автоматический ран бьющему и всем бегущим на базах.',
  },
  {
    category: 'basics',
    term: 'Grand Slam (Гранд-слэм)',
    def: 'Хоум-ран при занятых первой, второй и третьей базах (Bases Loaded). Приносит команде сразу 4 очка одним взмахом биты.',
  },
  {
    category: 'basics',
    term: 'Double Play (Дабл-плей)',
    def: 'Два аута в одном розыгрыше за 2–3 секунды. Чаще всего комбинация шортстопа и второй базы (6-4-3).',
  },
  {
    category: 'basics',
    term: 'RBI (Runs Batted In)',
    def: 'Очки, заработанные командой в результате результативного удара бьющего.',
  },
  {
    category: 'basics',
    term: 'ERA (Earned Run Average)',
    def: 'Главный показатель качества питчера: среднее число пропущенных очков за 9 иннингов. Показатель ниже 3.00 — уровень суперзвезды.',
  },
  {
    category: 'basics',
    term: 'OPS (On-base Plus Slugging)',
    def: 'Главная метрика силы баттера: процент выхода на базы (OBP) + дальность ударов (SLG). Значение выше .850 считается элитным.',
  },
  {
    category: 'basics',
    term: 'WHIP (Walks + Hits per Inning Pitched)',
    def: 'Сколько хитов и уоков питчер в среднем допускает за один иннинг. Меньше 1.05 — выдающийся результат.',
  },
];

export const RulesExplainer: React.FC = () => {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFieldItem, setSelectedFieldItem] = useState<FieldInteractiveItem | null>(null);
  const [glossaryFilter, setGlossaryFilter] = useState('');
  const [glossaryCategory, setGlossaryCategory] = useState<'all' | 'players' | 'leagues' | 'final' | 'basics'>('all');

  const handleSelectPosition = (pos: typeof POSITIONS[0]) => {
    setSelectedFieldItem({
      id: `pos-${pos.num}`,
      type: 'position',
      badge: pos.abbr,
      badgeBg: '#0284c7',
      name: pos.name,
      subtitle: `Позиция №${pos.num} в расстановке защиты`,
      dimensions: '9 игроков в обороне на поле одновременно',
      desc: pos.desc,
      tacticalNote: pos.tacticalNote,
    });
  };

  const handleSelectZone = (zoneKey: string) => {
    const item = FIELD_ZONES[zoneKey];
    if (item) {
      setSelectedFieldItem(item);
    }
  };

  const activeScenario = SCENARIOS[selectedScenarioIdx];
  const activeStep = activeScenario.steps[currentStepIdx] || activeScenario.steps[0];

  // Auto playback of steps
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStepIdx < activeScenario.steps.length - 1) {
          triggerSound(activeScenario.steps[currentStepIdx + 1]?.soundType);
          setCurrentStepIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2600);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, activeScenario]);

  const triggerSound = (type?: string) => {
    if (!type) return;
    if (type === 'crack') sounds.playBatCrack();
    if (type === 'catch') sounds.playGloveCatch();
    if (type === 'homerun') sounds.playHomeRunCelebration();
    if (type === 'strikeout') sounds.playStrikeout();
    if (type === 'score') sounds.playScoreChange();
  };

  const handleNextStep = () => {
    if (currentStepIdx < activeScenario.steps.length - 1) {
      triggerSound(activeScenario.steps[currentStepIdx + 1]?.soundType);
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setCurrentStepIdx(0);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  const handleSelectScenario = (idx: number) => {
    setSelectedScenarioIdx(idx);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const filteredGlossary = GLOSSARY.filter((g) => {
    const matchesCat = glossaryCategory === 'all' || g.category === glossaryCategory;
    const matchesSearch =
      g.term.toLowerCase().includes(glossaryFilter.toLowerCase()) ||
      g.def.toLowerCase().includes(glossaryFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      
      {/* ── INTRO BANNER ── */}
      <div
        className="glass-shell glass-card"
        style={{
          padding: '1px',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 40px rgba(16, 185, 129, 0.12)',
        }}
      >
        <div
          className="glass-core p-5 sm:p-7 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 600px 300px at 0% 0%, rgba(16, 185, 129, 0.14) 0%, rgba(15,18,26,0.92) 80%)',
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="eyebrow"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                }}
              >
                <BookOpen className="w-3 h-3 text-emerald-400" />
                Интерактивный тренажёр правил
              </span>
            </div>
            <h2
              className="text-display text-white"
              style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.8rem)' }}
            >
              Как устроен бейсбол: физика, тактика и роли игроков
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Бейсбол — шахматы на скорости 160 км/ч. 9 полевых игроков, 4 базы и бесконечная драма. Выбирайте сценарии слева и смотрите плавную анимацию каждого броска, удара и перемещения раннеров!
            </p>
          </div>
        </div>
      </div>

      {/* ── ANATOMY ISOMETRIC 3D SIMULATOR (Anatomy Skill) ── */}
      <AnatomyBaseballFigure />

      {/* ── MAIN INTERACTIVE STAGE: FIELD DIAMOND + CONTROLS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: Scenarios Navigation List (4 cols) */}
        <div className="lg:col-span-4 glass-shell" style={{ padding: '1px' }}>
          <div className="glass-core p-3.5 rounded-[calc(1.5rem-1px)] space-y-1.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
              Игровые ситуации
            </h3>
            <div className="space-y-1">
              {SCENARIOS.map((scen, idx) => {
                const isSelected = selectedScenarioIdx === idx;
                return (
                  <button
                    key={scen.id}
                    onClick={() => handleSelectScenario(idx)}
                    className="w-full text-left p-3 rounded-xl transition-all duration-300 flex items-start justify-between gap-2"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.08) 100%)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isSelected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.04)'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none',
                    }}
                  >
                    <div>
                      <div className="text-[10px] opacity-70 font-mono mb-0.5" style={{ color: isSelected ? '#a7f3d0' : '#94a3b8' }}>
                        {scen.category}
                      </div>
                      <div className="text-xs font-bold text-white">{scen.title}</div>
                      <div className="text-[11px] mt-0.5 line-clamp-2 text-slate-400">
                        {scen.shortDesc}
                      </div>
                    </div>
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0 mt-1 transition-transform"
                      style={{ color: isSelected ? '#10b981' : '#64748b' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Diamond SVG & Step Walkthrough (8 cols) */}
        <div className="lg:col-span-8 glass-shell" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-6 rounded-[calc(1.5rem-1px)] space-y-4">
            
            {/* Top Bar: Inning / Count / Scoreboard Indicator */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border"
              style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
            >
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Текущий сценарий:</span>
                <h4 className="text-xs sm:text-sm font-bold text-white">{activeScenario.title}</h4>
              </div>

              {/* Balls / Strikes / Outs Lights (B-S-O) */}
              <div
                className="flex items-center gap-3 px-3 py-1.5 rounded-full border font-mono text-xs"
                style={{ background: 'rgba(0, 0, 0, 0.4)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">B:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((b) => (
                      <div
                        key={b}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          activeStep.count.balls >= b
                            ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">S:</span>
                  <div className="flex gap-1">
                    {[1, 2].map((s) => (
                      <div
                        key={s}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          activeStep.count.strikes >= s
                            ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">O:</span>
                  <div className="flex gap-1">
                    {[1, 2].map((o) => (
                      <div
                        key={o}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          activeStep.count.outs >= o
                            ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── INTERACTIVE HINT BANNER ── */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white text-[11px] sm:text-xs">
                  Интерактивная карта поля
                </span>
                <span className="text-slate-400 text-[10px] sm:text-xs hidden md:inline">
                  — кликайте на базы, горку, газон, линии или защитников
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400/90 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Клик для деталей
              </span>
            </div>

            {/* ── ADVANCED HIGH-PRECISION BASEBALL DIAMOND SVG ── */}
            <div className="relative w-full aspect-[4/3] max-h-[430px] mx-auto rounded-2xl overflow-hidden border border-emerald-500/20 select-none flex items-center justify-center p-2"
              style={{
                background: 'radial-gradient(ellipse at 50% 60%, rgba(6, 78, 59, 0.4) 0%, rgba(2, 44, 34, 0.8) 60%, rgba(5, 5, 8, 0.98) 100%)',
              }}
            >
              <svg
                viewBox="0 0 400 380"
                className="w-full h-full object-contain filter drop-shadow-2xl"
                onClick={() => setSelectedFieldItem(null)}
              >
                <defs>
                  {/* Grass pattern */}
                  <radialGradient id="fieldGrass" cx="50%" cy="85%" r="80%">
                    <stop offset="0%" stopColor="#065f46" />
                    <stop offset="65%" stopColor="#044e39" />
                    <stop offset="100%" stopColor="#022c22" />
                  </radialGradient>

                  {/* Infield dirt gradient */}
                  <linearGradient id="infieldDirt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>

                  {/* Glow filter */}
                  <filter id="glowEffect" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Golden Home Run Glow */}
                  <linearGradient id="homerunTrail" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
                  </linearGradient>

                  {/* Pitch Laser Trail */}
                  <linearGradient id="pitchLaser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Outfield Grass Arc (Clickable) */}
                <path
                  d="M 35 350 L 35 180 C 95 15, 305 15, 365 180 L 365 350 Z"
                  fill="url(#fieldGrass)"
                  stroke={selectedFieldItem?.id === 'outfield' ? '#10b981' : 'transparent'}
                  strokeWidth="2.5"
                  className="cursor-pointer transition-all hover:opacity-90"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('outfield');
                  }}
                >
                  <title>Аутфилд (Травяной газон) — Нажмите для информации</title>
                </path>

                {/* Warning Track & Outer Wall (Clickable) */}
                <path
                  d="M 45 170 C 105 25, 295 25, 355 170"
                  fill="none"
                  stroke={selectedFieldItem?.id === 'warning-track' ? '#f59e0b' : '#d97706'}
                  strokeWidth={selectedFieldItem?.id === 'warning-track' ? 9 : 7}
                  strokeOpacity={selectedFieldItem?.id === 'warning-track' ? 0.95 : 0.45}
                  strokeDasharray="6 3"
                  className="cursor-pointer hover:stroke-amber-300 hover:stroke-[8.5px] transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('warning-track');
                  }}
                >
                  <title>Предупредительная дорожка и забор — Нажмите для информации</title>
                </path>

                {/* Infield Dirt Diamond (Clickable) */}
                <polygon
                  points="200,115 315,230 200,345 85,230"
                  fill="url(#infieldDirt)"
                  stroke={selectedFieldItem?.id === 'infield' ? '#f59e0b' : '#92400e'}
                  strokeWidth={selectedFieldItem?.id === 'infield' ? 4.5 : 3.5}
                  className="cursor-pointer hover:stroke-amber-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('infield');
                  }}
                >
                  <title>Инфилд (Внутреннее поле) — Нажмите для информации</title>
                </polygon>

                {/* Running baseline paths (Clickable) */}
                <g
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('baselines');
                  }}
                >
                  <line x1="200" y1="340" x2="275" y2="230" stroke={selectedFieldItem?.id === 'baselines' ? '#f59e0b' : '#fef08a'} strokeWidth={selectedFieldItem?.id === 'baselines' ? 3.5 : 2.5} strokeOpacity="0.75" strokeDasharray="3 2" className="group-hover:stroke-amber-300 transition-colors" />
                  <line x1="275" y1="230" x2="200" y2="155" stroke={selectedFieldItem?.id === 'baselines' ? '#f59e0b' : '#fef08a'} strokeWidth={selectedFieldItem?.id === 'baselines' ? 3.5 : 2.5} strokeOpacity="0.75" strokeDasharray="3 2" className="group-hover:stroke-amber-300 transition-colors" />
                  <line x1="200" y1="155" x2="125" y2="230" stroke={selectedFieldItem?.id === 'baselines' ? '#f59e0b' : '#fef08a'} strokeWidth={selectedFieldItem?.id === 'baselines' ? 3.5 : 2.5} strokeOpacity="0.75" strokeDasharray="3 2" className="group-hover:stroke-amber-300 transition-colors" />
                  <line x1="125" y1="230" x2="200" y2="340" stroke={selectedFieldItem?.id === 'baselines' ? '#f59e0b' : '#fef08a'} strokeWidth={selectedFieldItem?.id === 'baselines' ? 3.5 : 2.5} strokeOpacity="0.75" strokeDasharray="3 2" className="group-hover:stroke-amber-300 transition-colors" />
                  <title>Базовые дорожки — Нажмите для информации</title>
                </g>

                {/* Inner Grass Diamond (Clickable) */}
                <polygon
                  points="200,165 265,230 200,295 135,230"
                  fill="#065f46"
                  stroke="#047857"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:fill-emerald-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('infield');
                  }}
                >
                  <title>Внутренний газон инфилда — Нажмите для информации</title>
                </polygon>

                {/* Foul Lines (Left and Right) (Clickable) */}
                <g
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('foul-lines');
                  }}
                >
                  <line
                    x1="200" y1="340" x2="35" y2="175"
                    stroke={selectedFieldItem?.id === 'foul-lines' ? '#fbbf24' : '#ffffff'}
                    strokeWidth={selectedFieldItem?.id === 'foul-lines' ? 4 : 2.5}
                    strokeOpacity={selectedFieldItem?.id === 'foul-lines' ? 1 : 0.85}
                    className="group-hover:stroke-amber-300 transition-colors"
                  />
                  <line
                    x1="200" y1="340" x2="365" y2="175"
                    stroke={selectedFieldItem?.id === 'foul-lines' ? '#fbbf24' : '#ffffff'}
                    strokeWidth={selectedFieldItem?.id === 'foul-lines' ? 4 : 2.5}
                    strokeOpacity={selectedFieldItem?.id === 'foul-lines' ? 1 : 0.85}
                    className="group-hover:stroke-amber-300 transition-colors"
                  />
                  <title>Фол-линии (Foul Lines) — Нажмите для информации</title>
                </g>

                {/* Pitcher's Mound (Center) (Clickable) */}
                <g
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('mound');
                  }}
                >
                  {selectedFieldItem?.id === 'mound' && (
                    <circle cx="200" cy="230" r="18" fill="none" stroke="#fbbf24" strokeWidth="2" className="animate-pulse" />
                  )}
                  <circle
                    cx="200"
                    cy="230"
                    r="14"
                    fill="#b45309"
                    stroke={selectedFieldItem?.id === 'mound' ? '#fbbf24' : '#78350f'}
                    strokeWidth={selectedFieldItem?.id === 'mound' ? 3 : 2}
                    className="group-hover:stroke-amber-400 group-hover:fill-amber-700 transition-colors"
                  />
                  <rect x="194" y="228" width="12" height="4" fill="#ffffff" rx="1" />
                  <title>Питчерская горка (Pitcher's Mound) — Нажмите для информации</title>
                </g>

                {/* ── DYNAMIC TRAJECTORY TRAILS ── */}
                {/* 1. Pitch Trajectory Laser */}
                {activeStep.trajectory === 'pitch' && (
                  <line
                    x1="200"
                    y1="230"
                    x2={activeStep.ballPos.x}
                    y2={activeStep.ballPos.y}
                    stroke="url(#pitchLaser)"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    filter="url(#glowEffect)"
                  />
                )}

                {/* 2. Hit Trajectory Line */}
                {activeStep.trajectory === 'hit' && (
                  <path
                    d={`M 200 340 Q ${(200 + activeStep.ballPos.x) / 2 + 10} ${(340 + activeStep.ballPos.y) / 2 - 25} ${activeStep.ballPos.x} ${activeStep.ballPos.y}`}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    filter="url(#glowEffect)"
                  />
                )}

                {/* 3. High Soaring Home Run Arc */}
                {activeStep.trajectory === 'homerun' && (
                  <path
                    d={`M 200 340 Q ${activeStep.ballPos.x > 200 ? 270 : 180} 80 ${activeStep.ballPos.x} ${activeStep.ballPos.y}`}
                    fill="none"
                    stroke="url(#homerunTrail)"
                    strokeWidth="4"
                    strokeDasharray="5 2.5"
                    filter="url(#glowEffect)"
                  />
                )}

                {/* ── BASES WITH ACTIVE HIGHLIGHT AURA (Clickable) ── */}
                {/* Base 1 (Right): x=275, y=230 */}
                <g
                  transform="translate(275, 230) rotate(45)"
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('first-base');
                  }}
                >
                  {(activeStep.highlightFieldZone === 'firstBase' || selectedFieldItem?.id === 'first-base') && (
                    <rect x="-14" y="-14" width="28" height="28" fill="rgba(245,158,11,0.3)" stroke="#fbbf24" strokeWidth="1.5" rx="4" className="animate-pulse" />
                  )}
                  <rect
                    x="-8"
                    y="-8"
                    width="16"
                    height="16"
                    fill={activeStep.runners.first ? '#facc15' : '#ffffff'}
                    stroke={selectedFieldItem?.id === 'first-base' ? '#f59e0b' : '#1e293b'}
                    strokeWidth={selectedFieldItem?.id === 'first-base' ? 2.5 : 2}
                    filter={activeStep.runners.first ? 'url(#glowEffect)' : undefined}
                    className="group-hover:stroke-amber-400 transition-colors"
                  />
                  <title>1-я база (First Base) — Нажмите для информации</title>
                </g>

                {/* Base 2 (Top): x=200, y=155 */}
                <g
                  transform="translate(200, 155) rotate(45)"
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('second-base');
                  }}
                >
                  {(activeStep.highlightFieldZone === 'secondBase' || selectedFieldItem?.id === 'second-base') && (
                    <rect x="-14" y="-14" width="28" height="28" fill="rgba(245,158,11,0.3)" stroke="#fbbf24" strokeWidth="1.5" rx="4" className="animate-pulse" />
                  )}
                  <rect
                    x="-8"
                    y="-8"
                    width="16"
                    height="16"
                    fill={activeStep.runners.second ? '#facc15' : '#ffffff'}
                    stroke={selectedFieldItem?.id === 'second-base' ? '#f59e0b' : '#1e293b'}
                    strokeWidth={selectedFieldItem?.id === 'second-base' ? 2.5 : 2}
                    filter={activeStep.runners.second ? 'url(#glowEffect)' : undefined}
                    className="group-hover:stroke-amber-400 transition-colors"
                  />
                  <title>2-я база (Second Base) — Нажмите для информации</title>
                </g>

                {/* Base 3 (Left): x=125, y=230 */}
                <g
                  transform="translate(125, 230) rotate(45)"
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('third-base');
                  }}
                >
                  {(activeStep.highlightFieldZone === 'thirdBase' || selectedFieldItem?.id === 'third-base') && (
                    <rect x="-14" y="-14" width="28" height="28" fill="rgba(245,158,11,0.3)" stroke="#fbbf24" strokeWidth="1.5" rx="4" className="animate-pulse" />
                  )}
                  <rect
                    x="-8"
                    y="-8"
                    width="16"
                    height="16"
                    fill={activeStep.runners.third ? '#facc15' : '#ffffff'}
                    stroke={selectedFieldItem?.id === 'third-base' ? '#f59e0b' : '#1e293b'}
                    strokeWidth={selectedFieldItem?.id === 'third-base' ? 2.5 : 2}
                    filter={activeStep.runners.third ? 'url(#glowEffect)' : undefined}
                    className="group-hover:stroke-amber-400 transition-colors"
                  />
                  <title>3-я база (Third Base) — Нажмите для информации</title>
                </g>

                {/* Home Plate (Bottom): x=200, y=340 */}
                <g
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('home-plate');
                  }}
                >
                  {(activeStep.highlightFieldZone === 'homePlate' || selectedFieldItem?.id === 'home-plate') && (
                    <circle cx="200" cy="340" r="18" fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="1.5" className="animate-pulse" />
                  )}
                  <polygon
                    points="193,334 207,334 207,344 200,350 193,344"
                    fill="#ffffff"
                    stroke={selectedFieldItem?.id === 'home-plate' ? '#10b981' : '#1e293b'}
                    strokeWidth={selectedFieldItem?.id === 'home-plate' ? 2.5 : 1.5}
                    className="group-hover:stroke-emerald-400 transition-colors"
                  />
                  <title>Дом (Home Plate) — Нажмите для информации</title>
                </g>

                {/* Batter's Boxes (Clickable) */}
                <g
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('batter-boxes');
                  }}
                >
                  <rect
                    x="176"
                    y="326"
                    width="12"
                    height="26"
                    fill={selectedFieldItem?.id === 'batter-boxes' ? 'rgba(56, 189, 248, 0.15)' : 'none'}
                    stroke={selectedFieldItem?.id === 'batter-boxes' ? '#38bdf8' : '#f8fafc'}
                    strokeWidth={selectedFieldItem?.id === 'batter-boxes' ? 2 : 1.2}
                    strokeDasharray="3 1.5"
                    rx="2"
                    className="group-hover:stroke-sky-300 transition-colors"
                  />
                  <rect
                    x="212"
                    y="326"
                    width="12"
                    height="26"
                    fill={selectedFieldItem?.id === 'batter-boxes' ? 'rgba(56, 189, 248, 0.15)' : 'none'}
                    stroke={selectedFieldItem?.id === 'batter-boxes' ? '#38bdf8' : '#f8fafc'}
                    strokeWidth={selectedFieldItem?.id === 'batter-boxes' ? 2 : 1.2}
                    strokeDasharray="3 1.5"
                    rx="2"
                    className="group-hover:stroke-sky-300 transition-colors"
                  />
                  <title>Бэттерс-боксы — Нажмите для информации</title>
                </g>

                {/* Batter Figure with Animated Swing */}
                <g
                  transform="translate(178, 335)"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('batter-boxes');
                  }}
                >
                  {/* Batter head & body */}
                  <circle cx="0" cy="0" r="4.5" fill="#f8fafc" />
                  {/* Animated Bat */}
                  <line
                    x1="2"
                    y1="0"
                    x2={activeStep.batSwing ? '18' : '8'}
                    y2={activeStep.batSwing ? '-10' : '-16'}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                  {activeStep.batSwing && (
                    /* Bat swoosh wave */
                    <path d="M 6 -14 A 12 12 0 0 1 18 -6" fill="none" stroke="#fde047" strokeWidth="1.5" strokeOpacity="0.8" />
                  )}
                  <title>Бэттер (Бьющий) в боксе — Нажмите для информации</title>
                </g>

                {/* ── STATCAST 3x3 STRIKE ZONE (Clickable) ── */}
                <g
                  transform="translate(186, 314)"
                  className={`cursor-pointer group ${activeStep.highlightFieldZone === 'strikezone' ? 'animate-pulse' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectZone('strike-zone');
                  }}
                >
                  <rect
                    x="0"
                    y="0"
                    width="28"
                    height="24"
                    fill={
                      activeStep.highlightFieldZone === 'strikezone' || selectedFieldItem?.id === 'strike-zone'
                        ? 'rgba(239, 68, 68, 0.28)'
                        : 'rgba(239, 68, 68, 0.08)'
                    }
                    stroke={selectedFieldItem?.id === 'strike-zone' ? '#f87171' : '#ef4444'}
                    strokeWidth={selectedFieldItem?.id === 'strike-zone' ? 2 : 1.2}
                    strokeDasharray={activeStep.highlightFieldZone === 'strikezone' ? undefined : '2 2'}
                    rx="2"
                    className="group-hover:fill-red-500/25 group-hover:stroke-red-300 transition-all"
                  />
                  {/* 3x3 grid lines */}
                  <line x1="9.3" y1="0" x2="9.3" y2="24" stroke="#ef4444" strokeWidth="0.75" strokeOpacity={selectedFieldItem?.id === 'strike-zone' ? 0.9 : 0.45} />
                  <line x1="18.6" y1="0" x2="18.6" y2="24" stroke="#ef4444" strokeWidth="0.75" strokeOpacity={selectedFieldItem?.id === 'strike-zone' ? 0.9 : 0.45} />
                  <line x1="0" y1="8" x2="28" y2="8" stroke="#ef4444" strokeWidth="0.75" strokeOpacity={selectedFieldItem?.id === 'strike-zone' ? 0.9 : 0.45} />
                  <line x1="0" y1="16" x2="28" y2="16" stroke="#ef4444" strokeWidth="0.75" strokeOpacity={selectedFieldItem?.id === 'strike-zone' ? 0.9 : 0.45} />
                  <title>Страйк-зона (Strike Zone) — Нажмите для информации</title>
                </g>

                {/* ── DEFENSIVE POSITION MARKERS (Clickable) ── */}
                {POSITIONS.map((pos) => {
                  let px = 200;
                  let py = 200;
                  if (pos.num === 1) { px = 200; py = 215; } // P
                  if (pos.num === 2) { px = 200; py = 365; } // C
                  if (pos.num === 3) { px = 285; py = 215; } // 1B
                  if (pos.num === 4) { px = 245; py = 175; } // 2B
                  if (pos.num === 5) { px = 115; py = 215; } // 3B
                  if (pos.num === 6) { px = 155; py = 175; } // SS
                  if (pos.num === 7) { px = 110; py = 100; } // LF
                  if (pos.num === 8) { px = 200; py = 75; }  // CF
                  if (pos.num === 9) { px = 290; py = 100; } // RF

                  const isSelected = selectedFieldItem?.id === `pos-${pos.num}`;

                  return (
                    <g
                      key={pos.num}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPosition(pos);
                      }}
                    >
                      {isSelected && (
                        <circle cx={px} cy={py} r="14" fill="none" stroke="#38bdf8" strokeWidth="2" className="animate-pulse" />
                      )}
                      <circle
                        cx={px}
                        cy={py}
                        r="9.5"
                        fill={isSelected ? '#0284c7' : '#0b1120'}
                        stroke={isSelected ? '#7dd3fc' : '#38bdf8'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="group-hover:fill-sky-500 transition-colors"
                      />
                      <text
                        x={px}
                        y={py + 3.2}
                        textAnchor="middle"
                        className="fill-sky-300 group-hover:fill-white text-[8.5px] font-black font-mono pointer-events-none"
                      >
                        {pos.abbr}
                      </text>
                      <title>{pos.name} — Нажмите для информации</title>
                    </g>
                  );
                })}

                {/* ── SMOOTH ANIMATED BASEBALL WITH ROTATION & GLOW ── */}
                <g
                  style={{
                    transition: 'all 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
                    transform: `translate(${activeStep.ballPos.x}px, ${activeStep.ballPos.y}px)`,
                  }}
                >
                  {/* Outer Speed Ring */}
                  <circle cx="0" cy="0" r="11" fill="rgba(255,255,255,0.15)" filter="url(#glowEffect)" />
                  {/* Baseball Body */}
                  <circle cx="0" cy="0" r="6.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
                  {/* Red Stitches */}
                  <path d="M -3 -3 C -1 0, -1 0, -3 3" fill="none" stroke="#ef4444" strokeWidth="1.2" />
                  <path d="M 3 -3 C 1 0, 1 0, 3 3" fill="none" stroke="#ef4444" strokeWidth="1.2" />
                </g>

                {/* ── PULSING RUNNERS ON BASES ── */}
                {activeStep.runners.first && (
                  <g transform="translate(275, 230)">
                    <circle cx="0" cy="0" r="9" fill="rgba(250,204,21,0.4)" className="animate-ping" />
                    <circle cx="0" cy="0" r="6.5" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
                  </g>
                )}
                {activeStep.runners.second && (
                  <g transform="translate(200, 155)">
                    <circle cx="0" cy="0" r="9" fill="rgba(250,204,21,0.4)" className="animate-ping" />
                    <circle cx="0" cy="0" r="6.5" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
                  </g>
                )}
                {activeStep.runners.third && (
                  <g transform="translate(125, 230)">
                    <circle cx="0" cy="0" r="9" fill="rgba(250,204,21,0.4)" className="animate-ping" />
                    <circle cx="0" cy="0" r="6.5" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
                  </g>
                )}
              </svg>
            </div>

            {/* ── QUICK INTERACTIVE ZONE CHIPS ── */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider shrink-0 mr-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                Зоны:
              </span>
              {[
                { id: 'home-plate', label: 'Дом' },
                { id: 'first-base', label: '1B' },
                { id: 'second-base', label: '2B' },
                { id: 'third-base', label: '3B' },
                { id: 'mound', label: 'Горка' },
                { id: 'infield', label: 'Инфилд' },
                { id: 'outfield', label: 'Аутфилд' },
                { id: 'strike-zone', label: 'Страйк-зона' },
                { id: 'warning-track', label: 'Забор' },
                { id: 'foul-lines', label: 'Линии' },
              ].map((zone) => {
                const isSelected = selectedFieldItem?.id === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => handleSelectZone(zone.id)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all hover:border-amber-400/40"
                    style={{
                      background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isSelected ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: isSelected ? '#fcd34d' : '#94a3b8',
                    }}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>

            {/* Current Step Explanation Box */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Шаг {currentStepIdx + 1} из {activeScenario.steps.length}
                </span>
                {activeStep.scoreChange && (
                  <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40 animate-pulse">
                    +{activeStep.scoreChange} РАНА ДЛЯ АТАКИ!
                  </span>
                )}
              </div>

              <div>
                <h5 className="font-bold text-white text-sm sm:text-base mb-1">{activeStep.title}</h5>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{activeStep.description}</p>
              </div>

              {/* Stepper Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow"
                    style={{
                      background: isPlaying ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${isPlaying ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                      color: isPlaying ? '#fcd34d' : '#6ee7b7',
                    }}
                  >
                    <Play className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
                    <span>{isPlaying ? 'Пауза' : 'Авто-показ'}</span>
                  </button>

                  <button
                    onClick={handleNextStep}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-200 transition"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    Следующий шаг
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white transition"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    title="Сбросить к началу"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Step indicator dots */}
                <div className="flex items-center gap-1.5">
                  {activeScenario.steps.map((_, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIdx(sIdx);
                        triggerSound(activeScenario.steps[sIdx]?.soundType);
                      }}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: sIdx === currentStepIdx ? '18px' : '7px',
                        background:
                          sIdx === currentStepIdx
                            ? '#34d399'
                            : sIdx < currentStepIdx
                            ? '#059669'
                            : 'rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── SELECTED ZONE / BASE / POSITION DETAILS DRAWER ── */}
            {selectedFieldItem && (
              <div
                className="p-4 sm:p-5 rounded-xl border relative overflow-hidden animate-fade-in space-y-3"
                style={{
                  background:
                    selectedFieldItem.type === 'base'
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : selectedFieldItem.type === 'zone'
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  borderColor:
                    selectedFieldItem.type === 'base'
                      ? 'rgba(245, 158, 11, 0.4)'
                      : selectedFieldItem.type === 'zone'
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-md tracking-wider font-mono shrink-0"
                      style={{ background: selectedFieldItem.badgeBg }}
                    >
                      {selectedFieldItem.badge}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              selectedFieldItem.type === 'base'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : selectedFieldItem.type === 'zone'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(56, 189, 248, 0.2)',
                            color:
                              selectedFieldItem.type === 'base'
                                ? '#fcd34d'
                                : selectedFieldItem.type === 'zone'
                                ? '#6ee7b7'
                                : '#7dd3fc',
                          }}
                        >
                          {selectedFieldItem.type === 'base'
                            ? 'Бейсбольная база'
                            : selectedFieldItem.type === 'zone'
                            ? 'Зона игрового поля'
                            : 'Оборонительная позиция'}
                        </span>
                        {selectedFieldItem.subtitle && (
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            {selectedFieldItem.subtitle}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-sm sm:text-base mt-0.5">
                        {selectedFieldItem.name}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFieldItem(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors shrink-0"
                    title="Закрыть описание"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedFieldItem.dimensions && (
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <span className="font-bold text-amber-400">📏 Размеры:</span>
                    <span className="text-slate-200">{selectedFieldItem.dimensions}</span>
                  </div>
                )}

                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                  {selectedFieldItem.desc}
                </p>

                {selectedFieldItem.tacticalNote && (
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Тактика и правила: </span>
                      <span className="text-slate-300">{selectedFieldItem.tacticalNote}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── EXPANDED ENCYCLOPEDIC GLOSSARY ── */}
      <div className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 sm:p-7 rounded-[calc(1.5rem-1px)] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="eyebrow" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fcd34d' }}>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Полная бейсбольная энциклопедия
                </span>
              </div>
              <h3 className="text-display text-white" style={{ fontSize: '1.25rem' }}>
                Словарь новичка: роли игроков, лиги и Мировая Серия
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Все термины, чтобы понимать комментаторов, статистику и устройство MLB
              </p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Поиск (Closer, Pennant, World Series)..."
              value={glossaryFilter}
              onChange={(e) => setGlossaryFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 max-w-xs transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Все термины', icon: Layers },
              { id: 'players', label: 'Игроки и амплуа', icon: Users },
              { id: 'leagues', label: 'Лиги и дивизионы', icon: HelpCircle },
              { id: 'final', label: 'Мировая Серия (Финал)', icon: Trophy },
              { id: 'basics', label: 'Правила и статистика', icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => {
              const isSelected = glossaryCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setGlossaryCategory(id as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.05)'}`,
                    color: isSelected ? '#fcd34d' : 'rgba(148, 163, 184, 0.75)',
                    boxShadow: isSelected ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Glossary Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGlossary.map((item, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor:
                    item.category === 'final'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : item.category === 'players'
                      ? 'rgba(56, 189, 248, 0.18)'
                      : item.category === 'leagues'
                      ? 'rgba(168, 85, 247, 0.18)'
                      : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div
                    className="font-bold text-xs sm:text-sm tracking-tight"
                    style={{
                      color:
                        item.category === 'final'
                          ? '#fcd34d'
                          : item.category === 'players'
                          ? '#7dd3fc'
                          : item.category === 'leagues'
                          ? '#d8b4fe'
                          : '#6ee7b7',
                    }}
                  >
                    {item.term}
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-500 bg-white/[0.03]">
                    {item.category === 'final'
                      ? 'Финал'
                      : item.category === 'players'
                      ? 'Амплуа'
                      : item.category === 'leagues'
                      ? 'Лиги'
                      : 'Правила'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">{item.def}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 GOLDEN RULES ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: '3 Аута = Смена сторон',
            desc: 'В каждом иннинге атака длится ровно до тех пор, пока защита не наберет 3 аута. Никакого ограничения по таймеру!',
            color: '#10b981',
          },
          {
            title: '9 Иннингов до победы',
            desc: 'Ничьих в бейсболе не бывает! Если счет равный после 9-го иннинга, назначаются Extra Innings до победы одного из клубов.',
            color: '#3b82f6',
          },
          {
            title: 'Дом (Home Plate) решает всё',
            desc: 'Очки начисляются не за дальность удара, а за физическое касание бьющим или бегущими домашней пластины (Home Plate).',
            color: '#f59e0b',
          },
        ].map((rule, idx) => (
          <div
            key={idx}
            className="glass-shell glass-card"
            style={{ padding: '1px', borderColor: `${rule.color}30` }}
          >
            <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: rule.color }} />
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">{rule.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
