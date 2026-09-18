const socket = io()
socket.on("connect", ()=>{
  console.log("connect")
})
socket.on("disconnect", ()=>{
  console.log("disconnect")
})
socket.on("message", (data) => {
  console.log(data)
  appendMessage(data)
})
const button = document.querySelector("#send-button")
const input = document.querySelector("#message-input")
const messagesContainer = document.querySelector("#messages")
// Отправка сообщения
button.addEventListener("click", () => {
  if (input.value.trim() !== "") {
    socket.emit("sendMessage", input.value)
    input.value = ""
  }
})
const chats = document.querySelectorAll(".chat-item")
chats.forEach(chat => {
  chat.addEventListener("click", () => {
    socket.emit("connectChat", chat.dataset.id)
    document.querySelector(".selected-chat")?.classList.remove("selected-chat")
    chat.classList.add("selected-chat")
    // Очистка предыдущих сообщений при смене чата
    messagesContainer.innerHTML = ""
  })
})
function appendMessage(data) {
  const msgData = typeof data === "string" ? { text: data } : data;

  const messageRow = document.createElement("div");
  messageRow.classList.add("message-row");

  // Имя пользователя
  const userName = msgData.username || "Пользователь";

  // Аватарка: берем URL из БД или генерируем круг с первой буквой
  const avatar = document.createElement("img");
  avatar.classList.add("message-avatar");

  if (msgData.avatarUrl && !msgData.avatarUrl.includes("avatar.png")) {
    avatar.src = msgData.avatarUrl;
  } else {
    avatar.src = generateInitialAvatar(userName);
  }

  avatar.alt = userName;

  // Остальная часть сборки сообщения...
  const messageBody = document.createElement("div");
  messageBody.classList.add("message-body");

  const messageHeader = document.createElement("div");
  messageHeader.classList.add("message-header");

  const authorName = document.createElement("span");
  authorName.classList.add("message-author");
  authorName.textContent = userName;

  const messageTime = document.createElement("span");
  messageTime.classList.add("message-time");
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const container = document.getElementById("messages") || messagesContainer;
  container.appendChild(messageRow);
  container.scrollTop = container.scrollHeight;
}

function generateInitialAvatar(name) {
  // 1. Берем первую букву имени (или '?' если имя пустое)
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  // 2. Набор приятных пастельных/ярких цветов
  const colors = [
    "#FF9500", "#FF3B30", "#5856D6", "#007AFF",
    "#34C759", "#AF52DE", "#FF2D55", "#5AC8FA"
  ];

  // 3. Вычисляем стабильный индекс цвета по символам имени
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const backgroundColor = colors[colorIndex];

  // 4. Формируем SVG кодировку для тега img
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="20" fill="${backgroundColor}"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="600">${initial}</text>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

document.addEventListener("DOMContentLoaded", () => {
  // Находим все аватарки чатов
  document.querySelectorAll(".chat-item .avatar").forEach(img => {
    const chatItem = img.closest(".chat-item");
    const chatName = chatItem ? chatItem.querySelector(".chat-name")?.textContent : "Chat";

    // Если пути к аватарке нет или она дефолтная/битая
    if (!img.getAttribute("src") || img.src.includes("None") || img.src.includes("default.png") || img.src.includes("avatar.png")) {
      img.src = generateInitialAvatar(chatName);
    }
  });
});