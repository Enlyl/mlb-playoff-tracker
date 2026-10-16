# ⚾ MLB Playoff Tracker 2026 — Live Hub & Playoff Companion

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MLB Stats API](https://img.shields.io/badge/Data-MLB_Stats_API-041E42)](https://statsapi.mlb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Современное интерактивное веб-приложение для отслеживания регулярного сезона и плей-офф Главной лиги бейсбола (MLB) 2026 года в реальном времени.

An interactive, high-performance web companion for tracking MLB 2026 games, playoff races, team dossiers, and player statistics in real time.

---

## 🌟 Ключевые возможности / Features

### 🔴 1. Live Match Center & Мониторинг матчей
- **Постоянный опрос актуальных матчей**: своевременное обновление счёта, иннингов, аутов, бейсраннеров и текущих питчеров/бьющих.
- **Главный Live-матч (Hero Match)**: визуально акцентированная плашка в центре с интерактивной бейсбольной анимацией поля.
- **Матчи на 24 часа**: календарная панель («Вчера», «Сегодня», «Завтра», «Послезавтра») + встроенный пикер дат с подсветкой.
- **Фильтрация и поиск**: моментальный поиск по названию клуба (`Dodgers`, `Yankees` и т.д.) и быстрый фильтр «Моя команда».

### 🏆 2. Интерактивная сетка плей-офф (Playoff Bracket)
- Наглядная сетка пути к Мировой Серии 2026:
  - **Wild Card Series** (до 2 побед)
  - **Division Series** (ALDS / NLDS, до 3 побед)
  - **Championship Series** (ALCS / NLCS, до 4 побед)
  - **World Series** (до 4 побед)
- Прогресс серий, текущий счёт, быстрый переход к досье участников.

### 📋 3. Полное досье на все 30 клубов MLB (Отдельная страница)
- **Сезон 2026**: положение в дивизионе, сплиты (дома/в гостях, против левшей/правшей, разница в 1 ран, экстра-иннинги, победные серии).
- **Лидеры клуба**: HR, RBI, AVG, Hits, SB, Wins, ERA, SO за любой выбранный сезон.
- **Ростер**: полный актуальный состав игроков с группировкой по позициям (питчеры, кэтчеры, инфилдеры, аутфилдеры, DH).
- **Тренерский штаб**: менеджер, бенч-коуч, тренеры питчеров и бьющих на русском языке.
- **Стадион (Ballpark)**: адрес, вместимость, тип покрытия (трава/турф), тип крыши, высота над уровнем моря, телефон и схема размеров поля (LF, LCF, CF, RCF, RF).
- **Переходы (Транзакции)**: последние обмены, подписания и переводы игроков.
- **Легенды & Селебрити**: исторические звёзды клуба + подтверждённые знаменитые болельщики (актёры, музыканты, режиссёры, президенты США).
- **Экспорт календаря**: кнопка скачивания расписания всех игр команды в формате `.ics` для Apple Calendar, Google Calendar, Outlook.

### 👤 4. Карточка игрока (Player Profile)
- Полная био-справка (место и дата рождения, дебют в MLB, сторона удара и броска).
- Сплиты по сезонам карьеры (Year-by-Year stats).
- Лог матчей сезона (Game Log) с результатами W/L и статистикой бьющего/питчера.
- Официальные награды (Awards) из базы MLB.

### 📊 5. Турнирные таблицы & Рейтинги
- Таблицы Американской и Национальной лиг по дивизионам (Восток, Центр, Запад) и Wild Card.
- Расчёт Magic Number и Elimination Number.
- Общие рейтинги клубов и лидеров лиги по статистическим категориям.

### 🎨 6. Тёмная и Светлая темы (Dark & Light Themes)
- Премиальный дизайн с эффектом матового стекла (Ethereal Glassmorphism).
- Быстрый переключатель темы (Солнце / Луна) в шапке сайта и в настройках с сохранением выбора в `localStorage`.
- Динамическая адаптация цветовых акцентов под выбранную любимую команду.

### 🔊 7. Звуковые эффекты & Push-уведомления
- Процедурный синтез звуков через Web Audio API (звук удара биты, свист страйкаута, ликование трибун).
- Браузерные Web Notifications при изменении счёта матча любимой команды.

### 🧭 8. Удобная SPA-навигация и History API
- Поддержка браузерных кнопок «Назад» / «Вперёд» (`popstate`): модалки и страницы команд закрываются естественно, не выбивая пользователя с сайта.
- Кнопка быстрого возврата «← На главную» и кликабельный логотип из любого раздела.

---

## 🛠 Стек технологий / Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Язык**: [TypeScript 6](https://www.typescriptlang.org/)
- **Сборщик**: [Vite 8](https://vitejs.dev/)
- **Стилизация**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Анимации**: [Motion](https://motion.dev/)
- **Иконки**: [Lucide React](https://lucide.dev/)
- **Конфетти**: [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti)
- **API Данных**: [MLB Stats API](https://statsapi.mlb.com/) (официальный REST API)

---

## 🚀 Установка и запуск / Getting Started

### Требования
- [Node.js](https://nodejs.org/) версии 18+ или 20+
- Менеджер пакетов `npm`, `pnpm` или `yarn`

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-username/mlb-playoff-tracker.git
cd mlb-playoff-tracker
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Запуск локального сервера разработки
```bash
npm run dev
```
Сервер запустится по адресу: `http://localhost:5173/`

### 4. Сборка для продакшена (Production Build)
```bash
npm run build
```
Готовая статическая сборка будет скомпилирована в директорию `dist/`.

### 5. Предпросмотр сборки
```bash
npm run preview
```

---

## 📁 Структура проекта / Project Structure

```
mlb-playoff-tracker/
├── public/                 # Статические файлы (favicon, логотипы)
├── src/
│   ├── components/         # React-компоненты
│   │   ├── Header.tsx             # Шапка с навигацией, темами и звуком
│   │   ├── MatchesView.tsx        # Центр матчей с календарём и поиском
│   │   ├── GameDetailModal.tsx    # Подробности матча, питчеры, линейка
│   │   ├── PlayoffBracketView.tsx # Сетка плей-офф MLB 2026
│   │   ├── StandingsView.tsx      # Таблицы дивизионов и Wild Card
│   │   ├── RankingsView.tsx       # Рейтинги команд и игроков
│   │   ├── TeamProfilePage.tsx    # Полное досье клуба (страница)
│   │   ├── PlayerDetailModal.tsx  # Детальный профиль игрока и карьера
│   │   ├── MyTeamTracker.tsx      # Трекер любимой команды
│   │   ├── RulesExplainer.tsx     # Интерактивный справочник правил бейсбола
│   │   ├── SettingsView.tsx       # Настройки (тема, звук, уведомления)
│   │   └── WinsToFinalBanner.tsx  # Счётчик побед до финала
│   ├── services/           # Сервисы и API
│   │   ├── mlbApi.ts              # Клиент к MLB Stats API
│   │   ├── teamData.ts            # Метаданные (цвета, легенды, фанаты)
│   │   ├── soundEffects.ts        # Синтезатор звуков Web Audio API
│   │   └── notifications.ts       # Менеджер Web Push уведомлений
│   ├── utils/              # Вспомогательные утилиты
│   │   ├── calendarExport.ts      # Генератор календарей .ics и Google Cal
│   │   └── dateUtils.ts           # Форматирование времени (Киев/UTC)
│   ├── App.tsx             # Главный контейнер и роутинг
│   ├── main.tsx            # Точка входа приложения
│   └── index.css           # Базовые стили и токены (Dark & Light)
├── package.json            # Манифест зависимостей и скриптов
├── tsconfig.json           # Конфигурация TypeScript
└── vite.config.ts          # Конфигурация Vite
```

---

## ⚾ Источник данных / Data Attribution

Данные о расписании, счетах, составах команд и статистике предоставлены официальным [MLB Stats API](https://statsapi.mlb.com/).
MLB и связанные торговые марки являются собственностью Major League Baseball. Проект разработан в образовательных и информационных целях.

---

## 📄 Лицензия / License

Распространяется под лицензией [MIT](LICENSE).
