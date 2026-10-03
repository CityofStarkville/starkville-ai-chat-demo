const API_URL =
  "https://197dow5b7h.execute-api.us-east-1.amazonaws.com/chat";

const OFFICIAL_UDC_HOST = "starkville.municipalcodeonline.com";
const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const questionInput = document.getElementById("question");
const sendButton = document.getElementById("send-button");
const newChatButton = document.getElementById("new-chat-button");
const statusElement = document.getElementById("status");

const MAX_HISTORY_MESSAGES = 4;
let history = [];

function appendSafeInlineFormatting(parent, text) {
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
    }

    const strong = document.createElement("strong");
    strong.textContent = match[1];
    parent.appendChild(strong);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parent.appendChild(
      document.createTextNode(text.slice(lastIndex))
    );
  }
}

function renderSafeMarkdown(container, markdown) {
  container.replaceChildren();
  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  let currentList = null;

  function closeList() {
    currentList = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line === "---") {
      closeList();
      container.appendChild(document.createElement("hr"));
      continue;
    }

    if (line.startsWith("#### ")) {
      closeList();
      const heading = document.createElement("h4");
      appendSafeInlineFormatting(heading, line.slice(5));
      container.appendChild(heading);
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      const heading = document.createElement("h3");
      appendSafeInlineFormatting(heading, line.slice(4));
      container.appendChild(heading);
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      const heading = document.createElement("h2");
      appendSafeInlineFormatting(heading, line.slice(3));
      container.appendChild(heading);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!currentList) {
        currentList = document.createElement("ul");
        container.appendChild(currentList);
      }

      const item = document.createElement("li");
      appendSafeInlineFormatting(item, line.slice(2));
      currentList.appendChild(item);
      continue;
    }

    closeList();
    const paragraph = document.createElement("p");
    appendSafeInlineFormatting(paragraph, line);
    container.appendChild(paragraph);
  }
}

function isAllowedOfficialUrl(urlString) {
  try {
    const url = new URL(urlString);

    return (
      url.protocol === "https:" &&
      url.hostname === OFFICIAL_UDC_HOST &&
      url.pathname === "/book"
    );
  } catch {
    return false;
  }
}

function renderOfficialLinks(container, links) {
  if (!Array.isArray(links) || links.length === 0) {
    return;
  }

  const safeLinks = links.filter(
    (item) =>
      item &&
      typeof item.label === "string" &&
      typeof item.url === "string" &&
      isAllowedOfficialUrl(item.url)
  );

  if (safeLinks.length === 0) {
    return;
  }

  const references = document.createElement("div");
  references.className = "official-links";

  const title = document.createElement("div");
  title.className = "official-links-title";
  title.textContent = "Official UDC references";
  references.appendChild(title);

  const list = document.createElement("ul");

  for (const item of safeLinks) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");

    link.href = item.url;
    link.textContent = item.label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    listItem.appendChild(link);
    list.appendChild(listItem);
  }

  references.appendChild(list);
  container.appendChild(references);
}

function addMessage(role, text, options = {}) {
  const wrapper = document.createElement("div");

  wrapper.className =
    role === "user"
      ? "message user-message"
      : "message assistant-message";

  if (options.loading) {
    wrapper.classList.add("loading");
  }

  if (options.error) {
    wrapper.classList.add("error-message");
  }

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent =
    role === "user" ? "You" : "Planning Assistant";

  const content = document.createElement("div");
  content.className = "message-content";

  if (role === "assistant" && options.markdown) {
    renderSafeMarkdown(content, text);
  } else {
    content.textContent = text;
  }

  if (role === "assistant" && options.officialLinks) {
    renderOfficialLinks(
      content,
      options.officialLinks
    );
  }

  wrapper.appendChild(label);
  wrapper.appendChild(content);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;

  return wrapper;
}

function setLoading(isLoading) {
  questionInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  newChatButton.disabled = isLoading;

  sendButton.textContent =
    isLoading ? "Checking..." : "Send";

  statusElement.textContent = isLoading
    ? "Searching the Starkville UDC..."
    : "";
}

function trimHistory() {
  history = history.slice(-MAX_HISTORY_MESSAGES);
}

function resetConversation() {
  history = [];
  chat.replaceChildren();

  const welcome = document.createElement("div");
  welcome.className = "message assistant-message";

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = "Planning Assistant";

  const content = document.createElement("div");
  content.className = "message-content";

  const firstParagraph = document.createElement("p");
  firstParagraph.textContent =
    "Hello! Ask me a zoning question about land uses or requirements in Starkville.";

  const secondParagraph = document.createElement("p");
  secondParagraph.textContent =
    "For example: “Can I open a restaurant in TN-N?”";

  content.appendChild(firstParagraph);
  content.appendChild(secondParagraph);

  welcome.appendChild(label);
  welcome.appendChild(content);
  chat.appendChild(welcome);

  statusElement.textContent = "";
  questionInput.value = "";
  questionInput.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();

  if (!question) {
    return;
  }

  const previousHistory =
    history.slice(-MAX_HISTORY_MESSAGES);

  addMessage("user", question);
  questionInput.value = "";

  const loadingMessage = addMessage(
    "assistant",
    "Checking the Starkville UDC...",
    { loading: true }
  );

  setLoading(true);

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      30000
    );

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question,
        history: previousHistory
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "The assistant is receiving too many requests. Please wait a moment and try again."
        );
      }

      throw new Error(
        "The zoning assistant is temporarily unavailable."
      );
    }

    const data = await response.json();

    loadingMessage.remove();

    const answer =
      typeof data.answer === "string"
        ? data.answer
        : "I was unable to generate an answer.";

    addMessage("assistant", answer, {
      markdown: true,
      officialLinks: data.official_links
    });

    history.push({
      role: "user",
      text: question
    });

    history.push({
      role: "assistant",
      text: answer
    });

    trimHistory();

    statusElement.textContent =
      data.needs_clarification
        ? "The assistant needs a little more information before it can answer."
        : "";
  } catch (error) {
    loadingMessage.remove();

    let message =
      "The zoning assistant is temporarily unavailable. Please try again shortly.";

    if (error.name === "AbortError") {
      message =
        "The request took too long to complete. Please try again.";
    } else if (error.message) {
      message = error.message;
    }

    addMessage(
      "assistant",
      message,
      { error: true }
    );

    console.error(
      "Chat request failed:",
      error
    );
  } finally {
    setLoading(false);
    questionInput.focus();
  }
});

questionInput.addEventListener(
  "keydown",
  function (event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      form.requestSubmit();
    }
  }
);

newChatButton.addEventListener(
  "click",
  resetConversation
);
