const API_URL =
  "https://197dow5b7h.execute-api.us-east-1.amazonaws.com/chat";


const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const questionInput = document.getElementById("question");
const sendButton = document.getElementById("send-button");


/*
  We keep a small conversation history in the browser.

  The Lambda currently accepts recent history in this form:

  [
    {
      role: "user",
      text: "..."
    },
    {
      role: "assistant",
      text: "..."
    }
  ]
*/
let history = [];


// Keep only a small rolling window.
// Your Lambda also limits history server-side.
const MAX_HISTORY_MESSAGES = 4;


function addMessage(role, text, extraClass = "") {

  const wrapper = document.createElement("div");

  wrapper.className =
    `message ${role === "user"
      ? "user-message"
      : "assistant-message"} ${extraClass}`;


  const label = document.createElement("div");

  label.className = "message-label";

  label.textContent =
    role === "user"
      ? "You"
      : "Planning Assistant";


  const content = document.createElement("div");

  content.className = "message-content";

  /*
    textContent is intentional.

    It prevents model output from injecting HTML or scripts
    into the webpage.
  */
  content.textContent = text;


  wrapper.appendChild(label);
  wrapper.appendChild(content);

  chat.appendChild(wrapper);

  chat.scrollTop = chat.scrollHeight;

  return wrapper;
}


function setLoading(isLoading) {

  questionInput.disabled = isLoading;
  sendButton.disabled = isLoading;

  sendButton.textContent =
    isLoading ? "Sending..." : "Send";
}


async function askQuestion(question) {

  const requestHistory =
    history.slice(-MAX_HISTORY_MESSAGES);


  const response = await fetch(API_URL, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      question: question,
      history: requestHistory
    })

  });


  if (!response.ok) {

    if (response.status === 429) {
      throw new Error(
        "The zoning assistant is receiving too many requests right now. Please wait a moment and try again."
      );
    }

    throw new Error(
      `The zoning assistant returned an error (${response.status}).`
    );
  }


  const data = await response.json();

  return data;
}


form.addEventListener("submit", async (event) => {

  event.preventDefault();


  const question = questionInput.value.trim();

  if (!question) {
    return;
  }


  /*
    Important:
    capture the history BEFORE adding the current
    user message to history.

    The current question is sent separately.
  */
  const previousHistory =
    history.slice(-MAX_HISTORY_MESSAGES);


  addMessage("user", question);


  questionInput.value = "";


  const loadingMessage =
    addMessage(
      "assistant",
      "Checking the Starkville UDC...",
      "loading"
    );


  setLoading(true);


  try {

    const response = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: question,
        history: previousHistory
      })

    });


    if (!response.ok) {

      if (response.status === 429) {

        throw new Error(
          "The zoning assistant is receiving too many requests right now. Please wait a moment and try again."
        );
      }

      throw new Error(
        `The zoning assistant returned an error (${response.status}).`
      );
    }


    const data = await response.json();


    loadingMessage.remove();


    const answer =
      data.answer ||
      "I was unable to generate an answer.";


    addMessage(
      "assistant",
      answer
    );


    /*
      Store both sides of the conversation so the
      next message can refer to this exchange.
    */
    history.push({
      role: "user",
      text: question
    });

    history.push({
      role: "assistant",
      text: answer
    });


    /*
      Keep the browser history small too.
    */
    history =
      history.slice(-MAX_HISTORY_MESSAGES);


  } catch (error) {

    loadingMessage.remove();


    addMessage(
      "assistant",
      "The zoning assistant is temporarily unavailable. " +
      "Please try again shortly.\n\n" +
      error.message
    );


    console.error(error);

  } finally {

    setLoading(false);

    questionInput.focus();
  }

});


/*
  Press Enter to submit.
  Shift + Enter creates a new line.
*/
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
