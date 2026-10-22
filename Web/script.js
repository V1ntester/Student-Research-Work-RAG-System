/**
 * Предварительный интерфейс с имитацией чата.
 * Vanilla JS - no dependencies.
 *
 * База знаний не подключена: ответы формирует mockChatQuery() по контракту
 * API-CHAT-001 (docs/backend/api.md). Исход выбирается по кодовым словам,
 * их список показан в чате «Как проверить демо». Чаты живут только в памяти
 * вкладки и очищаются перезагрузкой (BEH-CHAT-013).
 */

(function() {
  'use strict';

  // Десктопный интерфейс: окно не вытянуто вертикально и не уже 700px (совпадает с styles.css)
  const DESKTOP_QUERY = window.matchMedia('(min-width: 700px) and (min-aspect-ratio: 7/10)');

  // Elements
  const body = document.body;
  const main = document.getElementById('main');
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const chatsList = document.getElementById('chatsList');
  const conversation = document.getElementById('conversation');
  const composer = document.getElementById('composer');
  const questionInput = document.getElementById('questionInput');
  const sendBtn = document.getElementById('sendBtn');
  const composerHint = document.getElementById('composerHint');
  const composerError = document.getElementById('composerError');
  const topbarSwitcher = document.querySelector('.switcher--topbar');

  /* ------------------------------------------------------------------------
     Mobile sidebar
     ------------------------------------------------------------------------ */
  let isOpen = false;

  function getFocusable(element) {
    return element.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  // Focus trapping for accessibility
  function handleTrapKeydown(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable(sidebar);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('sidebar--open');
    overlay.classList.add('sidebar-overlay--visible');
    body.classList.add('sidebar-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    sidebar.addEventListener('keydown', handleTrapKeydown);

    const first = getFocusable(sidebar)[0];
    if (first) first.focus();
  }

  function closeSidebar(options) {
    if (!isOpen) return;
    isOpen = false;
    sidebar.classList.remove('sidebar--open');
    overlay.classList.remove('sidebar-overlay--visible');
    body.classList.remove('sidebar-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    sidebar.removeEventListener('keydown', handleTrapKeydown);

    if (!options || options.restoreFocus !== false) {
      menuBtn.focus();
    }
  }

  menuBtn.addEventListener('click', function() {
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', function(e) {
    // Escape в меню чата, поле переименования или окне подтверждения закрывает их, а не панель
    if (e.key === 'Escape' && isOpen && !isChatUiOpen()) {
      closeSidebar();
    }
  });

  // Switched to desktop: the sidebar becomes permanent
  DESKTOP_QUERY.addEventListener('change', function(e) {
    if (e.matches) {
      closeSidebar({ restoreFocus: false });
    }
  });

  /* ------------------------------------------------------------------------
     Demo API stub (API-CHAT-001)
     Для подключения Backend заменить на:
     fetch('/api/chat/query', { method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ question, mode }) })
     ------------------------------------------------------------------------ */
  const MODES = { ask: 'Спросить', sell: 'Продавать' };

  // Демонстрационные задержки. Настоящие UI_WAIT_HINT_MS и таймауты не выбраны (OPEN-008).
  const DEMO_TIMING = { answerMs: 1200, waitHintMs: 2500, slowAnswerMs: 5000 };

  const DEMO_NOTE = '\n\nЭто демонстрационный ответ: база знаний не подключена, сведения вымышлены.';

  const ANSWERS = {
    ask: 'Чтобы забронировать квартиру, проверьте в системе учёта, что объект свободен, ' +
      'зафиксируйте данные клиента и оформите заявку на бронь. Срок бесплатной брони ' +
      'и перечень документов задаёт внутренний регламент компании.',
    sell: 'Если клиент говорит «дорого», уточните, с чем он сравнивает цену, и покажите ' +
      'ценность объекта: расположение, сроки сдачи, планировку, условия оплаты. ' +
      'Предложите рассчитать ежемесячный платёж по доступным программам.'
  };

  const OUTCOME_MESSAGES = {
    partial: 'Подтверждено: заявку на бронь оформляет менеджер, который ведёт клиента.\n\n' +
      'Не найдено: срок бесплатной брони — этих сведений в доступных материалах нет. ' +
      'Уточните у руководителя отдела.',
    insufficient: 'В доступных материалах не найдены сведения для ответа. ' +
      'Уточните объект или формулировку вопроса.',
    clarification: 'Вопрос подходит к нескольким объектам. Укажите жилой комплекс и корпус ' +
      'и задайте вопрос заново полностью: предыдущие сообщения при поиске не учитываются.',
    conflict: 'В материалах есть несовместимые сведения: в одном документе срок бесплатной брони — ' +
      '3 дня, в другом — 7 дней. Система не выбирает вариант сама. ' +
      'Уточните актуальное правило у владельца регламента.'
  };

  const OUTCOME_REASONS = {
    answer: null,
    partial: 'incomplete_context',
    insufficient: 'no_candidates',
    clarification: 'ambiguous_question',
    conflict: 'conflicting_context'
  };

  // Кодовые слова: начало слова, любые окончания («ошибка», «ошибку»…).
  // wholeWord — только отдельное слово («долго», но не «долгосрочный»). Порядок — приоритет.
  const KEYWORDS = [
    { stem: 'нет связи', scenario: 'network' },
    { stem: 'ошибк', scenario: 'error' },
    { stem: 'нет данных', scenario: 'insufficient' },
    { stem: 'частичн', scenario: 'partial' },
    { stem: 'уточн', scenario: 'clarification' },
    { stem: 'противореч', scenario: 'conflict' },
    { stem: 'долго', scenario: 'slow', wholeWord: true }
  ];

  function detectScenario(question) {
    const text = question.toLowerCase().replace(/ё/g, 'е');
    for (const keyword of KEYWORDS) {
      const pattern = '(^|[^а-яa-z])' + keyword.stem + (keyword.wholeWord ? '($|[^а-яa-z])' : '');
      if (new RegExp(pattern).test(text)) {
        return keyword.scenario;
      }
    }
    return 'answer';
  }

  let requestSeq = 0;

  /**
   * Имитация POST /api/chat/query.
   * resolve — успешный envelope (HTTP 200); reject — HTTP-ошибка или сбой сети.
   * options.recovered: повтор после ошибки имитирует восстановление сервиса.
   */
  function mockChatQuery(request, options) {
    const scenario = options && options.recovered ? 'answer' : detectScenario(request.question);
    const requestId = 'demo-request-' + (++requestSeq);
    const delay = scenario === 'slow' ? DEMO_TIMING.slowAnswerMs : DEMO_TIMING.answerMs;

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        if (scenario === 'network') {
          reject(new TypeError('Failed to fetch'));
          return;
        }
        if (scenario === 'error') {
          reject({
            status: 503,
            body: {
              request_id: requestId,
              error: { code: 'LLM_UNAVAILABLE', message: 'Сервис ответа временно недоступен. Можно повторить вопрос.' }
            }
          });
          return;
        }

        const outcome = scenario === 'slow' ? 'answer' : scenario;
        resolve({
          request_id: requestId,
          mode: request.mode,
          index_version: 'demo-' + request.mode,
          outcome: outcome,
          reason: OUTCOME_REASONS[outcome],
          message: outcome === 'answer' ? ANSWERS[request.mode] + DEMO_NOTE : OUTCOME_MESSAGES[outcome],
          // Источники отложены (M-06 в docs/interface.md)
          sources: []
        });
      }, delay);
    });
  }

  /* ------------------------------------------------------------------------
     Chats: только в памяти вкладки
     ------------------------------------------------------------------------ */
  const GUIDE_TEXT = [
    'Это демонстрационная версия интерфейса. База знаний не подключена: ответы имитируются, сведения в них вымышлены.',
    '',
    'Задайте любой вопрос — придёт обычный демо-ответ. Переключатель «Спросить / Продавать» выбирает базу знаний, из которой «отвечает» система; режим запоминается в момент отправки.',
    '',
    'Кодовые слова (в любом месте вопроса) включают другие исходы:',
    '• «частично» — частичный ответ;',
    '• «нет данных» — недостаточно сведений;',
    '• «уточнить» — система просит уточнить вопрос;',
    '• «противоречие» — противоречивые сведения в материалах;',
    '• «долго» — долгая обработка с подсказкой об ожидании;',
    '• «ошибка» — ошибка сервиса и кнопка «Повторить»;',
    '• «нет связи» — результат не получен и кнопка «Повторить».',
    '',
    'Пример: «Какой срок брони? нет данных».',
    '',
    'Повтор после ошибки имитирует восстановление сервиса и даёт обычный ответ. Пустой вопрос не отправляется. Пока идёт обработка, отправка следующего вопроса недоступна. «Новый чат» создаёт пустой чат; перезагрузка страницы очищает всю переписку.',
    '',
    'У чатов в списке есть меню «⋯» (на компьютере появляется при наведении, в телефонном виде видно всегда): «Переименовать» и «Удалить». Чат с перепиской удаляется после подтверждения.'
  ].join('\n');

  const chats = [
    {
      id: 'guide',
      title: 'Как проверить демо',
      pending: false,
      messages: [
        { role: 'user', text: 'Как проверить демо-версию?' },
        { role: 'assistant', outcome: 'guide', text: GUIDE_TEXT }
      ]
    },
    { id: 'chat-1', title: 'Чат 1', pending: false, messages: [] },
    { id: 'chat-2', title: 'Чат 2', pending: false, messages: [] },
    { id: 'chat-3', title: 'Чат 3', pending: false, messages: [] },
    { id: 'chat-4', title: 'Чат 4', pending: false, messages: [] }
  ];
  let chatCounter = 4;
  let activeChatId = 'chat-1';
  let currentMode = 'ask';

  function getChat(id) {
    return chats.find(function(chat) { return chat.id === id; });
  }

  function activeChat() {
    return getChat(activeChatId);
  }

  function selectChat(id) {
    activeChatId = id;
    hideInputError();
    render();
    if (isOpen) {
      closeSidebar({ restoreFocus: false });
    }
  }

  function createChat() {
    const current = activeChat();
    // Пустой обычный чат не дублируем
    if (current.id !== 'guide' && current.messages.length === 0) {
      selectChat(current.id);
      return;
    }
    selectChat(addEmptyChat().id);
  }

  // Новый пустой чат сразу под чатом-инструкцией
  function addEmptyChat() {
    chatCounter += 1;
    const chat = { id: 'chat-' + chatCounter, title: 'Чат ' + chatCounter, pending: false, messages: [] };
    chats.splice(chats[0] && chats[0].id === 'guide' ? 1 : 0, 0, chat);
    return chat;
  }

  /* ------------------------------------------------------------------------
     Отправка вопроса
     ------------------------------------------------------------------------ */
  const OUTCOME_LABELS = {
    answer: 'Ответ',
    partial: 'Частичный ответ',
    insufficient: 'Недостаточно сведений',
    clarification: 'Нужно уточнение',
    conflict: 'Противоречивые сведения',
    error: 'Ошибка',
    result_unknown: 'Результат не получен'
  };

  function toResultMessage(response) {
    return { outcome: response.outcome, text: response.message };
  }

  function toFailureMessage(failure) {
    if (failure && failure.status) {
      return { outcome: 'error', text: failure.body.error.message };
    }
    return { outcome: 'result_unknown', text: 'Не удалось получить результат. Запрос мог быть обработан.' };
  }

  function sendQuestion(chat, question, mode, recovered) {
    if (chat.pending) return;

    chat.messages.push({ role: 'user', text: question });
    // Ответ привязан к своему сообщению и чату, даже если пользователь переключится
    const reply = { role: 'assistant', pending: true, slow: false, mode: mode, question: question };
    chat.messages.push(reply);
    chat.pending = true;
    render();

    const slowTimer = setTimeout(function() {
      reply.slow = true;
      render();
    }, DEMO_TIMING.waitHintMs);

    mockChatQuery({ question: question, mode: mode }, { recovered: recovered })
      .then(toResultMessage, toFailureMessage)
      .then(function(result) {
        clearTimeout(slowTimer);
        reply.pending = false;
        reply.outcome = result.outcome;
        reply.text = result.text;
        chat.pending = false;
        render();
      });
  }

  function showInputError(text) {
    composerError.textContent = text;
    composerHint.classList.add('is-error');
  }

  function hideInputError() {
    composerHint.classList.remove('is-error');
    composerError.textContent = '';
  }

  composer.addEventListener('submit', function(e) {
    e.preventDefault();
    const chat = activeChat();
    if (chat.pending) return;

    // RULE-INPUT-001: крайние пробелы удаляются. Лимит длины не задан (OPEN-008)
    const question = questionInput.value.trim();
    if (!question) {
      showInputError('Введите вопрос');
      questionInput.focus();
      return;
    }

    hideInputError();
    questionInput.value = '';
    sendQuestion(chat, question, currentMode, false);
  });

  questionInput.addEventListener('input', hideInputError);

  conversation.addEventListener('click', function(e) {
    const retry = e.target.closest('[data-retry]');
    if (!retry) return;
    const chat = activeChat();
    const message = chat.messages[Number(retry.dataset.retry)];
    // Повтор — новый запрос исходного вопроса в исходном режиме; прежний исход сохраняется
    sendQuestion(chat, message.question, message.mode, true);
  });

  /* ------------------------------------------------------------------------
     Rendering (только textContent: RULE-UI-001)
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderMessage(message, index, chat) {
    if (message.role === 'user') {
      return el('div', 'message message--question', message.text);
    }

    if (message.pending) {
      const pending = el('div', 'message message--answer message--pending');
      pending.append('Обработка запроса');
      const dots = el('span', 'typing');
      dots.setAttribute('aria-hidden', 'true');
      dots.append(el('span'), el('span'), el('span'));
      pending.append(dots);
      if (message.slow) {
        pending.append(el('span', 'message__slow', 'Обработка занимает больше времени'));
      }
      return pending;
    }

    const isFailure = message.outcome === 'error' || message.outcome === 'result_unknown';
    const node = el('div', 'message message--answer' + (isFailure ? ' message--error' : ''));
    const meta = message.outcome === 'guide'
      ? 'Инструкция · демо'
      : OUTCOME_LABELS[message.outcome] + ' · база «' + MODES[message.mode] + '» · демо';
    node.append(el('span', 'message__meta', meta), message.text);

    if (isFailure) {
      const retry = el('button', 'message__retry', 'Повторить');
      retry.type = 'button';
      retry.dataset.retry = String(index);
      retry.disabled = chat.pending;
      node.append(el('br'), retry);
    }
    return node;
  }

  // Список перерисовывается только при изменении состава, названий или выбора,
  // чтобы приход ответа не сбрасывал открытое меню и наведение
  let chatsListSignature = '';

  function renderChatsList(force) {
    const signature = JSON.stringify([chats.map(function(c) { return [c.id, c.title]; }), activeChatId, renamingChatId]);
    if (!force && signature === chatsListSignature) return;
    chatsListSignature = signature;
    closeChatMenu({ restoreFocus: false });

    chatsList.replaceChildren.apply(chatsList, chats.map(function(chat) {
      const isActive = chat.id === activeChatId;
      const item = el('li', 'chat-row' + (chat.id === 'guide' ? '' : ' chat-row--actions'));
      item.dataset.chatId = chat.id;

      if (chat.id === renamingChatId) {
        item.append(createRenameInput(chat, isActive));
        return item;
      }

      const button = el('button', 'chat-item' + (isActive ? ' is-active' : ''));
      button.type = 'button';
      button.append(el('span', 'chat-item__title', chat.title));
      if (isActive) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', function() { selectChat(chat.id); });
      item.append(button);

      // Чат-инструкцию не переименовываем и не удаляем: на неё ведёт подсказка под полем ввода
      if (chat.id !== 'guide') {
        const more = el('button', 'chat-row__more');
        more.type = 'button';
        more.setAttribute('aria-label', 'Действия с чатом «' + chat.title + '»');
        more.setAttribute('aria-haspopup', 'menu');
        more.setAttribute('aria-expanded', 'false');
        more.setAttribute('aria-controls', 'chatMenu');
        more.innerHTML = '<svg class="icon icon--16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
          '<circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>';
        more.addEventListener('click', function(e) {
          e.stopPropagation();
          if (menuChatId === chat.id) {
            closeChatMenu();
          } else {
            openChatMenu(chat.id, more);
          }
        });
        item.append(more);
      }
      return item;
    }));
  }

  /* ------------------------------------------------------------------------
     Действия с чатом: меню «⋯», переименование, удаление
     ------------------------------------------------------------------------ */
  const chatMenu = document.getElementById('chatMenu');
  const chatMenuItems = Array.prototype.slice.call(chatMenu.querySelectorAll('[role="menuitem"]'));
  const deleteDialog = document.getElementById('deleteDialog');
  const deleteDialogText = document.getElementById('deleteDialogText');
  const CHAT_TITLE_MAX = 40;
  let menuChatId = null;
  let menuAnchor = null;
  let renamingChatId = null;
  let deletingChatId = null;

  function isChatUiOpen() {
    return menuChatId !== null || renamingChatId !== null || deleteDialog.open;
  }

  function rowOf(id) {
    return chatsList.querySelector('[data-chat-id="' + id + '"]');
  }

  function openChatMenu(id, anchor) {
    closeChatMenu({ restoreFocus: false });
    menuChatId = id;
    menuAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    anchor.closest('.chat-row').classList.add('is-menu-open');
    chatMenu.hidden = false;

    // Под кнопкой «⋯», левый край меню на одной линии с левым краем кнопки.
    // Не помещается справа — прижимается к краю экрана; не помещается снизу — открывается вверх
    const a = anchor.getBoundingClientRect();
    const gap = 4;
    const edge = 8;
    const left = Math.min(a.left, window.innerWidth - edge - chatMenu.offsetWidth);
    let top = a.bottom + gap;
    if (top + chatMenu.offsetHeight > window.innerHeight - edge) {
      top = a.top - gap - chatMenu.offsetHeight;
    }
    chatMenu.style.left = Math.round(Math.max(edge, left)) + 'px';
    chatMenu.style.top = Math.round(Math.max(edge, top)) + 'px';
    chatMenuItems[0].focus();
  }

  function closeChatMenu(options) {
    if (menuChatId === null) return;
    const anchor = menuAnchor;
    chatMenu.hidden = true;
    menuChatId = null;
    menuAnchor = null;
    if (anchor) {
      anchor.setAttribute('aria-expanded', 'false');
      const row = anchor.closest('.chat-row');
      if (row) row.classList.remove('is-menu-open');
      if ((!options || options.restoreFocus !== false) && anchor.isConnected) anchor.focus();
    }
  }

  chatMenu.addEventListener('click', function(e) {
    const item = e.target.closest('[data-chat-action]');
    if (!item) return;
    const id = menuChatId;
    closeChatMenu({ restoreFocus: false });
    if (item.dataset.chatAction === 'rename') {
      startRename(id);
    } else {
      requestDelete(id);
    }
  });

  chatMenu.addEventListener('keydown', function(e) {
    const index = chatMenuItems.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      chatMenuItems[(index + step + chatMenuItems.length) % chatMenuItems.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      chatMenuItems[e.key === 'Home' ? 0 : chatMenuItems.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeChatMenu();
    } else if (e.key === 'Tab') {
      // Меню вне боковой панели: фокус возвращается на «⋯», а не уходит на страницу под затемнением
      e.preventDefault();
      closeChatMenu();
    }
  });

  // Клик мимо меню, прокрутка панели или изменение размера окна закрывают меню
  document.addEventListener('pointerdown', function(e) {
    if (menuChatId !== null && !chatMenu.contains(e.target) && e.target.closest('.chat-row__more') !== menuAnchor) {
      closeChatMenu({ restoreFocus: false });
    }
  });
  sidebar.addEventListener('scroll', function() { closeChatMenu({ restoreFocus: false }); }, { passive: true });
  window.addEventListener('resize', function() { closeChatMenu({ restoreFocus: false }); });

  function createRenameInput(chat, isActive) {
    const input = el('input', 'chat-item chat-item--editing' + (isActive ? ' is-active' : ''));
    input.type = 'text';
    input.value = chat.title;
    input.maxLength = CHAT_TITLE_MAX;
    input.setAttribute('aria-label', 'Название чата');
    input.autocomplete = 'off';
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename(chat.id, input.value, { restoreFocus: true });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finishRename(chat.id, null, { restoreFocus: true });
      }
    });
    input.addEventListener('blur', function() {
      finishRename(chat.id, input.value, { restoreFocus: false });
    });
    return input;
  }

  function startRename(id) {
    renamingChatId = id;
    renderChatsList(true);
    const input = rowOf(id).querySelector('input');
    input.focus();
    input.select();
  }

  // value === null — отмена. Пустое название не принимается
  function finishRename(id, value, options) {
    if (renamingChatId !== id) return;
    renamingChatId = null;
    const chat = getChat(id);
    const title = value === null ? '' : value.trim().slice(0, CHAT_TITLE_MAX);
    if (chat && title) chat.title = title;
    renderChatsList(true);
    if (options.restoreFocus) {
      const row = rowOf(id);
      if (row) row.querySelector('.chat-item').focus();
    }
  }

  // Чат с перепиской удаляется после подтверждения, пустой — сразу
  function requestDelete(id) {
    const chat = getChat(id);
    if (!chat) return;
    if (chat.messages.length === 0) {
      deleteChat(id);
      return;
    }
    deletingChatId = id;
    deleteDialogText.textContent = 'Чат «' + chat.title + '» и его переписка будут удалены. Восстановить их будет нельзя.';
    deleteDialog.returnValue = '';
    deleteDialog.showModal();
  }

  deleteDialog.addEventListener('close', function() {
    const id = deletingChatId;
    deletingChatId = null;
    if (deleteDialog.returnValue === 'confirm') {
      deleteChat(id);
    } else {
      const row = rowOf(id);
      const more = row && row.querySelector('.chat-row__more');
      if (more) more.focus();
    }
  });

  // Клик по затемнению вокруг окна — отмена
  deleteDialog.addEventListener('click', function(e) {
    if (e.target === deleteDialog) deleteDialog.close('cancel');
  });

  function deleteChat(id) {
    const index = chats.findIndex(function(chat) { return chat.id === id; });
    if (index === -1) return;
    chats.splice(index, 1);

    const isRegular = function(chat) { return chat.id !== 'guide'; };
    if (activeChatId === id) {
      // Ближайший обычный чат: следующий, иначе предыдущий; если обычных нет — новый пустой
      const next = chats.slice(index).find(isRegular) || chats.slice(0, index).reverse().find(isRegular);
      activeChatId = next ? next.id : addEmptyChat().id;
    } else if (!chats.some(isRegular)) {
      addEmptyChat();
    }

    hideInputError();
    render();
    const row = rowOf(activeChatId);
    if (row) row.querySelector('.chat-item').focus();
  }

  function render() {
    const chat = activeChat();
    main.dataset.state = chat.messages.length ? 'chat' : 'empty';
    sendBtn.disabled = chat.pending;
    renderChatsList();
    const inner = el('div', 'conversation__inner');
    inner.append.apply(inner, chat.messages.map(function(message, index) {
      return renderMessage(message, index, chat);
    }));
    conversation.replaceChildren(inner);
    measureChatChrome();
    conversation.scrollTop = conversation.scrollHeight;
    updateFades();
  }

  /* ------------------------------------------------------------------------
     Переписка на весь экран: зоны под шапкой и полем ввода, затухание краёв
     ------------------------------------------------------------------------ */
  // Высота зоны под шапкой (mobile) и под полем ввода с подсказкой — для отступов
  // сообщений и сплошного фона под этими элементами (см. .conversation в styles.css)
  function measureChatChrome() {
    if (main.dataset.state !== 'chat') return;
    const top = DESKTOP_QUERY.matches ? 0 : topbarSwitcher.getBoundingClientRect().bottom;
    const bottom = window.innerHeight - composer.getBoundingClientRect().top;
    conversation.style.setProperty('--chat-top', Math.round(top) + 'px');
    conversation.style.setProperty('--chat-bottom', Math.round(bottom) + 'px');
  }

  function updateFades() {
    const maxScroll = conversation.scrollHeight - conversation.clientHeight;
    conversation.classList.toggle('can-scroll-up', conversation.scrollTop > 1);
    conversation.classList.toggle('can-scroll-down', conversation.scrollTop < maxScroll - 1);
  }

  conversation.addEventListener('scroll', updateFades, { passive: true });

  window.addEventListener('resize', function() {
    measureChatChrome();
    updateFades();
  });

  // Шрифт меняет высоту подсказки под полем ввода
  if (document.fonts) {
    document.fonts.ready.then(function() {
      measureChatChrome();
      updateFades();
    });
  }

  /* ------------------------------------------------------------------------
     Controls
     ------------------------------------------------------------------------ */
  // «Новый чат» (кнопка в сайдбаре и «+» в мобильной панели)
  document.querySelectorAll('[data-action="new-chat"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      createChat();
      // На mobile не открываем экранную клавиатуру без явного действия
      if (DESKTOP_QUERY.matches) {
        questionInput.focus();
      }
    });
  });

  document.querySelectorAll('[data-action="open-guide"]').forEach(function(btn) {
    btn.addEventListener('click', function() { selectChat('guide'); });
  });

  // Переключатель режима: два экземпляра (сайдбар и мобильная панель) синхронизированы.
  // Режим действует на следующие вопросы (BEH-CHAT-016).
  const modeButtons = document.querySelectorAll('.switcher__item');

  modeButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      currentMode = button.dataset.mode;
      modeButtons.forEach(function(btn) {
        const active = btn.dataset.mode === currentMode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    });
  });

  render();

})();
