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


document.querySelector(".exit-icon").addEventListener('click', function() {
  document.querySelector(".left-panel").style.display = "flex"
  document.querySelector(".general-chat").style.display = "none"
}
)