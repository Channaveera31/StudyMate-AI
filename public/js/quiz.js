// =================== Existing Quiz Data ===================
const quizData = {
  html: [
    {
      question: "What does HTML stand for?",
      options: [
        "Hyper Trainer Marking Language",
        "Hyper Text Marketing Language",
        "Hyper Text Markup Language",
        "Hyper Text Markup Leveler",
      ],
      answer: "Hyper Text Markup Language",
    },
    {
      question: "Which HTML tag is used to define an internal style sheet?",
      options: ["<style>", "<css>", "<script>", "<link>"],
      answer: "<style>",
    },
  ],
  css: [
    {
      question: "Which property is used to change the background color?",
      options: ["color", "bgcolor", "background-color", "background"],
      answer: "background-color",
    },
  ],
  javascript: [
    {
      question: "Which symbol is used for comments in JavaScript?",
      options: ["//", "<!-- -->", "#", "/* */"],
      answer: "//",
    },
  ],
  customFile: [], // placeholder for AI-generated quiz
};

// =================== DOM Elements ===================
const quizSetup = document.querySelector(".quiz-setup");
const quizContainer = document.querySelector(".quiz-container");
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const nextBtn = document.getElementById("next-btn");
const resultEl = document.querySelector(".result");

let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;

// =================== Quiz Logic ===================
function startQuiz(subject) {
  quizSetup.style.display = "none";
  quizContainer.style.display = "block";
  resultEl.style.display = "none";

  currentQuiz = quizData[subject];
  currentQuestionIndex = 0;
  score = 0;

  showQuestion();
}

function showQuestion() {
  const currentQuestion = currentQuiz[currentQuestionIndex];
  questionEl.textContent = currentQuestion.question;
  optionsEl.innerHTML = "";

  currentQuestion.options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.classList.add("option-btn");
    button.onclick = () => selectAnswer(option, currentQuestion.answer);
    optionsEl.appendChild(button);
  });
}

function selectAnswer(selected, correct) {
  if (selected === correct) score++;
  nextBtn.style.display = "block";
}

nextBtn.onclick = () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuiz.length) {
    nextBtn.style.display = "none";
    showQuestion();
  } else {
    showResult();
  }
};

function showResult() {
  quizContainer.style.display = "none";
  resultEl.style.display = "block";
  resultEl.textContent = `You scored ${score} out of ${currentQuiz.length}`;
}

// =================== AI Quiz From File ===================
async function extractText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file); // Start with .txt only
  });
}

async function generateQuizFromFile(file) {
  const text = await extractText(file);

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.GROQ_API_KEY, // Replace with your GroqCloud API key
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // You can change to llama-3/gemma depending on your account
        messages: [
          {
            role: "system",
            content: "You are a quiz generator AI.",
          },
          {
            role: "user",
            content: `Generate 5 multiple-choice quiz questions with 4 options each and specify the correct answer based on this text:\n\n${text}\n\nFormat:\nQuestion?\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: X`,
          },
        ],
      }),
    }
  );

  const data = await response.json();
  const aiOutput = data.choices[0].message.content;

  return parseQuestionsFromText(aiOutput);
}

// =================== Parse AI Output ===================
function parseQuestionsFromText(aiOutput) {
  const questions = [];
  const blocks = aiOutput.trim().split(/\n\n+/);

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 6) return;

    const question = lines[0];
    const options = lines.slice(1, 5).map((l) => l.replace(/^[A-D]\)\s*/, ""));
    const answerLine = lines.find((l) => l.startsWith("Answer"));
    const correctLetter = answerLine ? answerLine.split(":")[1].trim() : "A";

    const correctAnswer = options["ABCD".indexOf(correctLetter)];

    questions.push({
      question,
      options,
      answer: correctAnswer,
    });
  });

  return questions;
}

// =================== File Upload Handler ===================
async function handleFileQuiz() {
  const file = document.getElementById("fileUpload").files[0];
  if (!file) {
    alert("Please upload a file first!");
    return;
  }

  const questions = await generateQuizFromFile(file);
  if (!questions.length) {
    alert("Could not generate quiz from file.");
    return;
  }

  quizData["customFile"] = questions;
  startQuiz("customFile");
}
