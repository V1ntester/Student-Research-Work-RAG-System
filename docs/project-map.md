# Карта планируемого проекта и трассируемость

> **Простыми словами.** Карта проекта: какие папки появятся в коде, как цели связаны с требованиями, сценариями и тестами (матрица трассируемости) и в каком порядке реализовывать систему.

Дата: 2026-10-11, дополнено 2026-10-19. Сейчас существуют документация, исходный README и демо-версия интерфейса [Web/](../Web/index.html) по макету SRC-005. Её объём описан в [interface.md](interface.md#вёрстка-заглушка-web): ответы имитирует заглушка API в браузере, Backend и база знаний не подключены. Работающего приложения, тестов, конфигурации запуска и корпуса для эксперимента нет. Направление разделения Frontend/Backend/RAG CONFIRMED, SRC-002; пути ниже PROPOSED, SRC-003.

## Планируемые расположения

Все пути в этой таблице — **планируемые**, не ссылки на существующие файлы. Они не выбирают язык/фреймворк.

| Планируемый путь | Назначение | Граница |
|---|---|---|
| `frontend/` | Экран чата, состояние запросов и источников, API-клиент | ARCH-FRONTEND-001 |
| `backend/api/` | HTTP, схемы и ошибки | ARCH-BACKEND-001 |
| `backend/application/` | Оркестратор вопроса | ARCH-BACKEND-002 |
| `backend/storage/` | Manifest и чтение снимков | ARCH-BACKEND-003 |
| `backend/config/` | Валидируемая конфигурация, safe logging | ARCH-BACKEND-004 |
| `backend/rag/ingestion/` | Извлечение, фрагменты, сборка индекса | ARCH-RAG-001 |
| `backend/rag/retrieval/` | BM25 и отбор контекста | ARCH-RAG-002, ARCH-RAG-003 |
| `backend/rag/generation/` | Prompt, provider-adapter и проверка | ARCH-RAG-004 |
| `evaluation/` | Запуск исследовательской оценки | ARCH-RAG-005 |
| `tests/` | Модульные, контрактные, интеграционные и UI-проверки | План TEST в behavior.md |
| `data/corpus/`, `data/indexes/`, `data/reports/` | Разрешённые локальные данные и артефакты | Не публиковать автоматически в Git |
| `config/` | Будущий безопасный пример конфигурации без секретов | OPEN-007, OPEN-008 |

Существующие [docs/](README.md), [Update/](../Update/README.md), [Service/](../Service/README.md) относятся к спецификациям и рабочим источникам, не к runtime. Существующий каталог Web/ — демонстрационный прототип ARCH-FRONTEND-001 на заглушках (SRC-006, SRC-009). Станет ли он основой `frontend/` или будет перенесён, решается вместе со стеком OPEN-007. В матрице ниже он не отмечен как реализация: прототип имитирует только UI-часть сценариев на заглушке API (перечень в interface.md), сквозные сценарии BEH не выполняются, автоматизированных тестов в репозитории нет.

## Границы и связи

Frontend → HTTP API → оркестратор → snapshot/retrieval/context/generation → проверенный результат → Frontend. Offline ingestion → готовый snapshot; evaluation вызывает те же модули и при необходимости API. Модель не имеет доступа к инструментам и полному архиву. Frontend не обращается к провайдеру напрямую.

Владельцы определений: GOAL/REQ — [product-context.md](product-context.md); RULE — [rules.md](rules.md); BEH/TEST — [behavior.md](behavior.md); UI/ARCH-FRONTEND — [interface.md](interface.md); API — [backend/api.md](backend/api.md); ARCH-BACKEND — [backend/architecture.md](backend/architecture.md); ARCH-RAG — [rag/architecture.md](rag/architecture.md); ADR/OPEN — [decisions/README.md](decisions/README.md); HYP — [research/hypotheses.md](research/hypotheses.md); SRC — [README.md](README.md).

## Матрица трассируемости

Матрица DRAFT, SRC-003. В каждой строке приведены основные связи; дополнительные BEH/TEST указаны в документах-владельцах. Знак «—» в реализации означает отсутствие кода. TEST — запланирован, без ссылки на несуществующий файл.

| Цель | Требование | Поведение/правило | UI/API | Архитектура | Реализация | Будущий тест |
|---|---|---|---|---|---|---|
| GOAL-001, GOAL-002 | REQ-001 | BEH-CHAT-001, BEH-CHAT-002, BEH-CHAT-003, BEH-CHAT-013 | UI-CHAT-001; API-CHAT-001 | ARCH-FRONTEND-001; ARCH-BACKEND-001 | — | TEST-CHAT-001, TEST-CHAT-002, TEST-CHAT-003, TEST-CHAT-013 |
| GOAL-001, GOAL-005 | REQ-002 | BEH-CHAT-001, BEH-CHAT-004, BEH-CHAT-006 | API-CHAT-001 | ARCH-RAG-002, ARCH-RAG-003 | — | TEST-RAG-002; TEST-CHAT-004, TEST-CHAT-006 |
| GOAL-002, GOAL-003, GOAL-004 | REQ-003 | BEH-CHAT-001, BEH-CHAT-005, BEH-CHAT-011, BEH-CHAT-012, BEH-CHAT-014 | UI-CHAT-003; API-CHAT-001 | ARCH-RAG-004; ARCH-BACKEND-002 | — | TEST-CHAT-001, TEST-CHAT-005, TEST-CHAT-011, TEST-CHAT-012, TEST-CHAT-014 |
| GOAL-004 | REQ-004 | BEH-CHAT-010, BEH-CHAT-015 | UI-CHAT-004; API-SOURCE-001 | ARCH-BACKEND-003 | — | TEST-CHAT-010, TEST-CHAT-015 |
| GOAL-004 | REQ-005 | BEH-CHAT-004, BEH-CHAT-005, BEH-CHAT-011, BEH-CHAT-012 | UI-CHAT-003; API-CHAT-001 | ARCH-RAG-003, ARCH-RAG-004 | — | TEST-CHAT-004, TEST-CHAT-005, TEST-CHAT-011, TEST-CHAT-012 |
| GOAL-001, GOAL-004 | REQ-006 | BEH-CHAT-006, BEH-CHAT-007, BEH-CHAT-008, BEH-CHAT-009, BEH-CHAT-014, BEH-CHAT-015 | UI-CHAT-002, UI-CHAT-003, UI-CHAT-004; API-CHAT-001 | ARCH-BACKEND-001, ARCH-BACKEND-002 | — | TEST-CHAT-006, TEST-CHAT-007, TEST-CHAT-008, TEST-CHAT-009, TEST-CHAT-014, TEST-CHAT-015 |
| GOAL-005 | REQ-007 | BEH-INDEX-001, BEH-INDEX-002 | — | ARCH-RAG-001 | — | TEST-INDEX-001, TEST-INDEX-002; TEST-RAG-001 |
| GOAL-005 | REQ-008 | RULE-EVAL-001 | — | ARCH-RAG-005 | — | TEST-EVAL-001 |
| GOAL-001, GOAL-004 | REQ-018 | BEH-CHAT-016, BEH-INDEX-001; RULE-RAG-002, RULE-RAG-004; ADR-004 | UI-CHAT-005; API-CHAT-001, API-SOURCE-001 | ARCH-BACKEND-002; ARCH-RAG-001, ARCH-RAG-002 | — (в Web/ режим передаётся только в заглушку API) | TEST-CHAT-016, TEST-INDEX-001, TEST-API-001 |
| GOAL-005 | REQ-009 | BEH-INDEX-001; RULE-RAG-001, RULE-RAG-002 | API-CHAT-001 | ARCH-RAG-001, ARCH-RAG-002, ARCH-RAG-003 | — | TEST-INDEX-001; TEST-RAG-002 |
| GOAL-004, GOAL-005 | REQ-010 | RULE-SEC-001 | API-CHAT-001 | ARCH-BACKEND-004 | — | TEST-SEC-001 |
| GOAL-001 | REQ-011 | BEH-CHAT-003, BEH-CHAT-007, BEH-CHAT-009, BEH-CHAT-014 | UI-CHAT-002; API-CHAT-001 | ARCH-BACKEND-002, ARCH-BACKEND-004 | — | TEST-CHAT-003, TEST-CHAT-007, TEST-CHAT-009, TEST-CHAT-014 |
| GOAL-005 | REQ-012 | План проверок всех ключевых сценариев | API-CHAT-001 | Все границы модулей | — | TEST-API-001; TEST-RAG-002; TEST-INDEX-002 |
| GOAL-005 | REQ-013 | RULE-SCOPE-001; будущая инструкция запуска | — | ARCH-BACKEND-004 | — | TEST-RUN-001 |
| GOAL-005 | REQ-014 | BEH-CHAT-013; RULE-CHAT-001 | API-CHAT-001/ API-SOURCE-001 | ARCH-FRONTEND-001; ARCH-BACKEND-001, ARCH-BACKEND-002, ARCH-BACKEND-003 | — | TEST-API-001; TEST-CHAT-013 |
| GOAL-005 | REQ-015 | RULE-SCOPE-001; процесс change/review | — | Документационный процесс | — | Проверка ID/ссылок и ручная сверка покрытия |
| GOAL-001, GOAL-002 | REQ-016 | BEH-CHAT-001, BEH-CHAT-010 | UI-CHAT-001, UI-CHAT-002, UI-CHAT-003, UI-CHAT-004 | ARCH-FRONTEND-001 | — | TEST-UI-001 |
| GOAL-004, GOAL-005 | REQ-017 | RULE-LOG-001 | API-CHAT-001 | ARCH-BACKEND-004 | — | TEST-SEC-001 |

## Переход к реализации

План DRAFT, SRC-003. Это небольшие этапы с отдельной приёмкой, а не утверждение их полной независимости. Приложение не разрабатывается сейчас.

| Этап | Результат | Зависимости до старта | Проверки |
|---|---|---|---|
| 1. Корпус/индекс | Сборка снимков двух баз знаний и отчёты, безопасный пример запуска | OPEN-002, OPEN-007, OPEN-008, OPEN-010 (состав баз), APPROVED REQ-007, REQ-009, REQ-018 и соответствующие сценарии | TEST-INDEX-001, TEST-INDEX-002; TEST-RAG-001 |
| 2. Retrieval/оценка | Детерминированный поиск и базовые измерения | Этап 1; фиксированный development-набор; APPROVED REQ-002, REQ-008 | TEST-RAG-002; TEST-EVAL-001 |
| 3. Генерация | Adapter, prompt-version, источники и исходы | Этап 2; OPEN-003, OPEN-007, OPEN-008; APPROVED REQ-003, REQ-004, REQ-005 | TEST-CHAT-005, TEST-CHAT-007, TEST-CHAT-011, TEST-CHAT-012, TEST-CHAT-014; TEST-RAG-003 |
| 4. Backend API | Проверенные контракты и сквозной оркестратор | Контракты можно тестировать с заглушками раньше; для сквозного результата этапы 1–3; APPROVED API и REQ-006, REQ-010, REQ-011, REQ-014, REQ-017 | TEST-API-001; TEST-SEC-001 |
| 5. Frontend | Чат/источники со всеми состояниями | Согласованные BEH/UI/API; разработка с mock API возможна параллельно 1–4 после разрешения | TEST-CHAT-001…015; TEST-UI-001 |
| 6. Сквозной запуск/исследование | Воспроизводимый запуск и отчёт, без обещания роста конверсии | Этапы 1–5; OPEN-004, OPEN-005, OPEN-006, OPEN-009; APPROVED исследовательский протокол | TEST-RUN-001, полная проверка выбранного MVP, экспертная оценка |

Для каждой задачи: требование → уточнение → правила → сценарии → дизайн → план/подготовка тестов → реализация → проверки → документация → рабочая запись. Отдельный разрешённый срез может стартовать до решения всех OPEN проекта, но не своих блокирующих вопросов.

## Обновление карты

После появления кода заменить только соответствующие планируемые пути проверенными существующими, добавить ссылки и тесты, отметить реализованный объём. Не описывать всю будущую архитектуру как существующую из-за одного модуля. При изменении требований сначала обновить документы-владельцы, затем матрицу. При отмене связи оставить причину в истории/рабочей записи.
