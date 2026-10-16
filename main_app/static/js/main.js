const socket = io();

// Элементы UI
const button = document.querySelector("#send-button");
const input = document.querySelector("#message-input");
const messagesContainer = document.querySelector("#messages");
const chatTitle = document.getElementById("current-chat-title");
const chatInputContainer = document.getElementById("chatInputContainer");
// 1. Socket.IO подключения
socket.on("connect", () => console.log("Socket connected"));
socket.on("disconnect", () => console.log("Socket disconnected"));

// 2. Обработка входящего сообщения
socket.on("message", (data) => {
  console.log("Получено сокет-событие message:", data);

  const incomingChatId = String(data.chat_id);

  const selectedChat = document.querySelector(".selected-chat, .active-chat");
  const activeChatId = selectedChat ? String(selectedChat.dataset.id) : null;

  if (activeChatId && activeChatId === incomingChatId) {
    appendMessage(data, true);
    return;
  }
  const targetChat = document.querySelector(`.chat-item[data-id="${incomingChatId}"]`);

  if (targetChat) {
    let badge = targetChat.querySelector(".unread-badge");

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = "0";
      targetChat.appendChild(badge);
    }


    let currentCount = parseInt(badge.textContent || "0", 10);
    if (isNaN(currentCount)) currentCount = 0;

    const newCount = currentCount + 1;
    badge.textContent = newCount > 99 ? "99+" : newCount;

    badge.style.display = "inline-flex";
    badge.classList.remove("hidden");
  }
});
// 3. Единственный и централизованный обработчик клика по чатам
document.querySelectorAll(".chat-item").forEach((chat) => {
  chat.addEventListener("click", async () => {
    if (window.innerWidth <= 1100){
      document.querySelector(".left-panel").style.display = "none"
      document.querySelector(".general-chat").style.display = "flex"
    }
    const chatId = chat.dataset.id;
    const chatName = chat.dataset.name;

    document.querySelectorAll(".chat-item").forEach((el) => {
      el.classList.remove("selected-chat", "active-chat");
    });
    chat.classList.add("selected-chat");
    if (chatInputContainer) {
      chatInputContainer.classList.remove("hidden");
    }


    if (chatName && chatTitle) {
      chatTitle.textContent = chatName;
    }

    const badge = chat.querySelector(".unread-badge");
    if (badge) {
      badge.textContent = "0";
      badge.classList.add("hidden");
      badge.style.display = "none";
    }

    socket.emit("connectChat", chatId);

    if (messagesContainer) messagesContainer.innerHTML = "";

    try {
      const response = await fetch(`/get_messages/?chat_id=${chatId}`);
      const list = await response.json();
      list.forEach((msg) => appendMessage(msg));
    } catch (err) {
      console.error("Ошибка при получении сообщений:", err);
    }
  });
});

// 4. Отправка сообщений
function sendMessage() {

  if (input && input.value.trim() !== "") {
    socket.emit("sendMessage", input.value);
    input.value = "";
    console.log(input)
  }
}
console.log(button)
if (button) {
  button.addEventListener("click", sendMessage);
}

if (input) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

// 5. Отрисовка сообщения
function appendMessage(data, isNew=false) {
  const msgData = typeof data === "string" ? { text: data } : data;

  const messageRow = document.createElement("div");
  messageRow.classList.add("message-row");

  const userName = msgData.username || "Пользователь";

  const avatar = document.createElement("img");
  avatar.classList.add("message-avatar");
  avatar.src = generateInitialAvatar(userName);
  avatar.alt = userName;

  const messageBody = document.createElement("div");
  messageBody.classList.add("message-body");

  const messageHeader = document.createElement("div");
  messageHeader.classList.add("message-header");

  const authorName = document.createElement("span");
  authorName.classList.add("message-author");
  authorName.textContent = userName;

  const messageTime = document.createElement("span");
  messageTime.classList.add("message-time");
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  messageTime.textContent = msgData.time || currentTime;

  messageHeader.appendChild(authorName);
  messageHeader.appendChild(messageTime);

  const messageText = document.createElement("div");
  messageText.classList.add("message-text");
  messageText.textContent = msgData.text || "";

  messageBody.appendChild(messageHeader);
  messageBody.appendChild(messageText);

  messageRow.appendChild(avatar);
  messageRow.appendChild(messageBody);

  if (messagesContainer) {
    messagesContainer.appendChild(messageRow);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  if (isNew) {
    const selectedChat = document.querySelector(".selected-chat");
    selectedChat.querySelector(".last-message").textContent=msgData.text
    selectedChat.querySelector(".time").textContent="щойно"
  }
}

// 6. Генерация SVG-аватарки по инициалам
function generateInitialAvatar(name) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const colors = ["#FF9500", "#FF3B30", "#5856D6", "#007AFF", "#34C759", "#AF52DE", "#FF2D55", "#5AC8FA"];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const backgroundColor = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="20" fill="${backgroundColor}"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="600">${initial}</text>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// 7. Дефолтная генерация аватарок при загрузке
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".chat-item .avatar").forEach((img) => {
    const chatItem = img.closest(".chat-item");
    const chatName = chatItem ? chatItem.querySelector(".chat-name")?.textContent : "Chat";

    if (!img.getAttribute("src") || img.src.includes("None") || img.src.includes("default.png") || img.src.includes("avatar.png")) {
      img.src = generateInitialAvatar(chatName);
    }
  });
});


socket.on("send_notification", (data) => {
  const chatId = data.chat_id
  const chat = document.querySelector(`.chat-item[data-id='${chatId}']`)
  if (!chat.classList.contains("selected-chat")){
    const count = chat.querySelector(".unread-badge")
    chat.querySelector(".last-message").textContent=data.text
    chat.querySelector(".time").textContent="щойно"
    count.textContent = Number(count.textContent) + 1
    count.classList.remove(".hidden")
    if (count.textContent > 99){
      count.textContent = 99
    }
  }
})


document.querySelectorAll('.avatar-letter').forEach(el => {
    const name = el.getAttribute('data-name');
    const svgDataUrl = generateInitialAvatar(name);

    const img = document.createElement('img');
    img.src = svgDataUrl;
    img.className = 'avatar';

    el.replaceWith(img);
});

document.querySelectorAll('.right-panel .user-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.right-panel .user-item').forEach(el => {
            el.classList.remove('active');
        });

        this.classList.add('active');

        const selectedUserId = this.getAttribute('data-user-id');
        console.log("Выбран пользователь с ID:", selectedUserId);
    });
});

const profileCard = document.getElementById("userProfileCard");
const closeProfileBtn = document.getElementById("closeProfileCard");

// 8. Закрытие карточки по крестику
if (closeProfileBtn) {
    closeProfileBtn.addEventListener("click", () => {
        profileCard.classList.remove("open");
        document.querySelectorAll('.right-panel .user-item').forEach(el => {
            el.classList.remove('active');
        });
    });
}

// 9. Обработка клика по пользователю в правой панели
document.querySelectorAll('.right-panel .user-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.right-panel .user-item').forEach(el => {
            el.classList.remove('active');
        });
        this.classList.add('active');

        const userId = this.getAttribute('data-user-id');
        const userName = this.querySelector('.user-name').textContent;
        const userAvatarSrc = this.querySelector('.avatar').src;
        const isOnline = this.querySelector('.status-dot').classList.contains('online');

        const userEmail = this.getAttribute('data-email') || (userName.toLowerCase() + "@example.com");
        const userBirthday = this.getAttribute('data-birthday') || "Не вказано";
        const userGender = this.getAttribute('data-gender') || "Не вказано";

        document.getElementById("profileName").textContent = userName;
        document.getElementById("profileUsername").textContent = "@" + userEmail.split('@')[0];
        document.getElementById("profileAvatar").src = userAvatarSrc;
        document.getElementById("profileBirthday").textContent = userBirthday;
        document.getElementById("profileGender").textContent = userGender;

        const cardStatusDot = document.getElementById("profileStatusDot");
        cardStatusDot.className = "status-dot " + (isOnline ? "online" : "offline");

        profileCard.classList.add("open");
    });
});

socket.on("online", (listId)=>{
  document.querySelectorAll(".user-item").forEach(user => {
    if (listId.includes(Number(user.dataset.userId))){
      user.querySelector(".status-dot").className = "status-dot online"
    }
    else{
      user.querySelector(".status-dot").className = "status-dot offline"
    }
  });
})


document.addEventListener('DOMContentLoaded', function() {

  const generalChat = document.querySelector(".general-chat");
  const rightPanel = document.querySelector(".right-panel");
  const leftPanel = document.querySelector(".left-panel");

  const newChatModal = document.querySelector("#new-chat-modal");
  const deleteChatModal = document.querySelector("#delete-chat-modal");
  const settingsModal = document.querySelector("#settings-modal");

  document.addEventListener('click', function(event) {

    const userListItem = event.target.closest('.user-item');
    if (userListItem) {
      event.preventDefault();

      const name = userListItem.getAttribute('data-name') || 'Користувач';
      const username = userListItem.getAttribute('data-username') || '';
      const age = userListItem.getAttribute('data-age') || 'Не вказано';
      const gender = userListItem.getAttribute('data-gender') || 'Не вказано';

      const profileName = document.querySelector('#profileName');
      const profileUsername = document.querySelector('#profileUsername');
      const profileBirthday = document.querySelector('#profileBirthday');
      const profileGender = document.querySelector('#profileGender');

      if (profileName) profileName.textContent = name;
      if (profileUsername) profileUsername.textContent = username;
      if (profileBirthday) profileBirthday.textContent = age;
      if (profileGender) profileGender.textContent = gender;

      return;
    }

    const saveSettingsBtn = event.target.closest('#settings-modal .btn-submit');
    if (saveSettingsBtn) {
      event.preventDefault();

      const name = document.querySelector('#settings-name')?.value.trim() || '';
      const surname = document.querySelector('#settings-surname')?.value.trim() || '';
      const username = document.querySelector('#settings-username')?.value.trim() || '';
      const gender = document.querySelector('#settings-gender')?.value || '';
      const age = document.querySelector('#settings-age')?.value || '';
      const formData = new FormData();
      formData.append('name', name);
      formData.append('surname', surname);
      formData.append('username', username);
      formData.append('gender', gender);
      formData.append('age', age);

      fetch('/settings/update', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (response.ok) {
          settingsModal.classList.add('hidden');
          window.location.reload();
        } else {
          alert('Помилка при збереженні налаштувань');
        }
      })
      .catch(error => {
        console.error('Помилка:', error);
      });

      return;
    }

    // 1. Открытие модального окна "Новий чат"
    const newChatBtn = event.target.closest('.new-chat-btn');
    if (newChatBtn) {
      event.preventDefault();
      if (newChatModal) {
        newChatModal.classList.remove('hidden');
      }
      return;
    }

    // 2. Открытие модального окна "Видалити чат" (по клику на иконку корзины)
    const deleteChatBtn = event.target.closest('.delete-chat-btn');
    if (deleteChatBtn) {
      event.preventDefault();
      if (deleteChatModal) {
        deleteChatModal.classList.remove('hidden');
      }
      return;
    }

    const settingsBtn = event.target.closest('header img[src*="settings"]') || event.target.closest('.settings-icon') || event.target.closest('header svg');
    const headerSettingsIcon = event.target.closest('header .options img, header button:nth-last-child(2) img, img[alt*="setting"], .fa-cog');

    const exactSettingsBtn = event.target.closest('.settings');

    if (exactSettingsBtn || event.target.closest('header svg:nth-of-type(1)')) {
      event.preventDefault();
      if (settingsModal) settingsModal.classList.remove('hidden');
      return;
    }

    // 3. Закрытие модальных окон (по крестику, кнопке "Скасувати" или клику на фон)
    const isCloseClick = event.target.closest('.close-modal') || event.target.closest('.btn-cancel');
    const isBackgroundClick = event.target === newChatModal || event.target === deleteChatModal;

    if (isCloseClick || isBackgroundClick) {
      if (newChatModal) newChatModal.classList.add('hidden');
      if (deleteChatModal) deleteChatModal.classList.add('hidden');
      if (settingsModal) settingsModal.classList.add('hidden');
      return;
    }

    // 4. Отправка формы создания чата ("Створити")
    const submitBtn = event.target.closest('.btn-submit');
    if (submitBtn) {
      event.preventDefault();
      const chatInput = document.querySelector('#chat-name-input');
      const chatName = chatInput ? chatInput.value.trim() : '';

      if (!chatName) {
        alert('Будь ласка, введіть назву чату');
        return;
      }

      const formData = new FormData();
      formData.append('chat_name', chatName);

      fetch('/chat/add', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (response.ok) {
          window.location.reload();
        } else {
          alert('Помилка при створенні чату');
        }
      })
      .catch(error => console.error('Помилка:', error));
      return;
    }

    // 5. Подтверждение удаления чата ("Видалити")
    const confirmDeleteBtn = event.target.closest('.btn-delete');
    if (confirmDeleteBtn) {
      event.preventDefault();

      console.log('Удаляем чат...');

      fetch('/chat/delete', { method: 'POST' })
        .then(response => {
          if (response.ok) window.location.reload();
        });

      if (deleteChatModal) deleteChatModal.classList.add('hidden');
      return;
    }

    const isMoreClick = event.target.closest('.general-chat .options img:last-child') || event.target.closest('.more-icon');
    if (isMoreClick) {
      if (window.innerWidth < 768) {
        if (generalChat) generalChat.style.display = "none";
        if (rightPanel) rightPanel.style.display = "flex";
      }
      return;
    }

    // 7. Возврат из general-chat в left-panel
    const exitGeneral = event.target.closest('.general-chat .exit-icon');
    if (exitGeneral) {
      if (leftPanel) leftPanel.style.display = "flex";
      if (generalChat) generalChat.style.display = "none";
      return;
    }

    // 8. Возврат из right-panel в general-chat
    const exitRight = event.target.closest('.right-panel .exit-icon');
    if (exitRight) {
      if (rightPanel) rightPanel.style.display = "none";
      if (generalChat) generalChat.style.display = "flex";
      return;
    }

  });

});
