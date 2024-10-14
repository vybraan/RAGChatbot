import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import Papa from 'papaparse'; 

const modelIds = {
  mistral: 'mistral.mistral-large-2402-v1:0',
  claude: 'anthropic.claude-3-haiku-20240307-v1:0',
};

let affirmations = [];


const modelId = modelIds.claude;

const systemPrompt = `If the user requests an affirmation, return only the affirmation text, omitting any additional commentary or prompts.`;
let client = null;

let conversationHistory = [];

async function fetchResponseFromModel(conversation) {
  try {
    const response = await client.send(new ConverseCommand({
      modelId,
      messages: conversation,
    }));
    return response;
  } catch (err) {
    console.error(err);
    throw new Error('Unable to fetch response');
  }
}

async function sendMessage() {
  const userInput = document.querySelector("#userInput").value.trim();

  const tag = userInput.split(' ').pop(); // Assuming the last word is the tag
  const retrievedAffirmations = retrieveAffirmations(tag);

  let userMessageContent = [{ text: userInput }];
  if (retrievedAffirmations.length > 0) {
    userMessageContent.push({ text: "RAG - Here are some related affirmations:" });
    retrievedAffirmations.forEach(a => {
      userMessageContent.push({ text: a.affirmation });
    });
    userMessageContent.push({ text: "Give me an affirmation to boost motivation today, referencing plants, animals, or flowers by adding emoji. Don't show the prompt, only the quote. Do not add anything like Here is an affirmation... just return the affirmation alone" });
  }

  if (userInput) {
    // alert(`You said: ${userInput}`);
    addChatBubble(userInput, 'user'); 
    document.querySelector("#userInput").value = '';  

    const userMessage = {
      role: "user",
      system: systemPrompt,
      content: userMessageContent,
    };

    conversationHistory.push(userMessage);

    try {
      const response = await fetchResponseFromModel(conversationHistory);
      const botMessage = response.output.message.content[0].text;
      addChatBubble(botMessage, 'bot');  // Display bot response

      // Add bot message to the conversation history
      const botMessageObj = {
        role: "assistant",
        content: [{ text: botMessage }],
      };
      conversationHistory.push(botMessageObj);

    } catch (err) {
      console.error(err);
      addChatBubble('Error: Unable to fetch response', 'bot');
    }
  }
}

async function loadAffirmations() {

  const response = await fetch('/dev/possitive_affirmation.csv');
  const text = await response.text();

  Papa.parse(text, {
    header: false, // Since we are not using a header in this case
    complete: (results) => {
      results.data.forEach(row => {
        if (row.length >= 2) {
          const affirmation = row[0].trim();
          const tag = row[1].trim();
          
                    
          affirmations.push({ affirmation, tag });
        }
      });
    },
    error: (error) => {
      console.error('Error parsing CSV:', error);
    }
  });
}

function retrieveAffirmations(tag) {
  if (!Array.isArray(affirmations) || affirmations.length === 0) {
    console.warn("Affirmations have not been loaded yet.");
    return [];
  }
  return affirmations.filter(affirmation => affirmation.tag.toLowerCase() === tag.toLowerCase());
}

function addChatBubble(text, type) {
  const chatbox = document.querySelector("#chatbox");
  const chat = document.createElement('div');

  const bubble = document.createElement('div');
  
  bubble.classList.add('chat-bubble');
  bubble.textContent = text;

  if ('bot' === type) {
    chat.classList.add('chat','chat-start');
    bubble.classList.add('chat-bubble-info');
  } else {
    chat.classList.add('chat','chat-end');
    bubble.classList.add('chat-bubble-primary');
  }

  chat.appendChild(bubble)

  chatbox.appendChild(chat);
  chatbox.scrollTop = chatbox.scrollHeight;  // Auto-scroll to bottom
}


async function init() {
  try {
    await loadAffirmations(); 
    const creds = await fetchCredentials();
    client = await createBedrockClient(creds);
  } catch (err) {
    console.error(err);
    addChatBubble('Error: Unable to initialize chat', 'assistant');
  }
  
  const sendButton = document.querySelector("#sendMessage");
  sendButton.addEventListener("click", sendMessage);

  document.querySelector("#userInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
  });


}

async function createBedrockClient(creds) {  
  return new BedrockRuntimeClient({
    credentials: creds.credentials,
    region: creds.region
  });
}

async function fetchCredentials() {
  return {
    region: "us-west-2",
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN,
    },
  };
}

init();
