# Grind English

План английского на год (7.11.2026 — 6.11.2027): занятия по учебникам и аудио с твоего устройства, отметки, слова (FSRS) и прогресс.
Работает без интернета после первого открытия (service worker). Синхронизация между устройствами — через Supabase, когда есть сеть.

## Как выложить на GitHub Pages
1. github.com → New repository → имя `grind-english`, Public → Create.
2. «uploading an existing file» → перетащи ВСЁ содержимое этой папки (index.html, css, js, vendor, icons, sw.js, manifest.webmanifest) → Commit.
3. Settings → Pages → Source: Deploy from a branch → Branch: main, папка / (root) → Save.
4. Через 1–2 минуты сайт откроется по адресу https://ИМЯ.github.io/grind-english/

## iPad без интернета
1. Открой адрес сайта в Safari (с интернетом), кнопка «Поделиться» → «На экран Домой».
2. Запусти Grind English с экрана Домой, вкладка «Материалы» → «Выбрать файлы или архив» → «Grind English — материалы для iPad.zip».
3. Дальше всё работает без интернета.

Тесты: `node --test tests/*.test.mjs`. Сборка версии для артефакта Claude: `node tools/build-artifact.mjs`.
pdf.js (vendor/) — Mozilla, Apache License 2.0.
