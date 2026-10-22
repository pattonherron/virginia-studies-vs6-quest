const TOPICS = window.VS6_GAME_DATA.topics;
const QUESTIONS = window.VS6_GAME_DATA.questions;

const startScreen = document.querySelector("#startScreen");
const gameScreen = document.querySelector("#gameScreen");
const resultScreen = document.querySelector("#resultScreen");
const startButton = document.querySelector("#startButton");
const playAgainButton = document.querySelector("#playAgainButton");
const changeQuestButton = document.querySelector("#changeQuestButton");
const homeButton = document.querySelector("#homeButton");
const soundButton = document.querySelector("#soundButton");
const soundIcon = document.querySelector("#soundIcon");
const soundLabel = document.querySelector("#soundLabel");
const questionCard = document.querySelector("#questionCard");
const questionText = document.querySelector("#questionText");
const answersGrid = document.querySelector("#answersGrid");
const feedback = document.querySelector("#feedback");
const topicPill = document.querySelector("#topicPill");
const sceneName = document.querySelector("#sceneName");
const sceneIcon = document.querySelector("#sceneIcon");
const questionNumber = document.querySelector("#questionNumber");
const questionTotal = document.querySelector("#questionTotal");
const progressBar = document.querySelector("#progressBar");
const scoreValue = document.querySelector("#scoreValue");
const streakValue = document.querySelector("#streakValue");
const streakChip = document.querySelector(".streak-chip");
const mascotGame = document.querySelector(".mascot-game");
const confettiLayer = document.querySelector("#confettiLayer");
const correctResult = document.querySelector("#correctResult");
const accuracyResult = document.querySelector("#accuracyResult");
const scoreResult = document.querySelector("#scoreResult");
const bestResult = document.querySelector("#bestResult");
const resultTitle = document.querySelector("#resultTitle");
const resultMessage = document.querySelector("#resultMessage");
const resultMedal = document.querySelector("#resultMedal");
const reviewPanel = document.querySelector("#reviewPanel");
const reviewList = document.querySelector("#reviewList");

let state = {
  round: [],
  index: 0,
  score: 0,
  correct: 0,
  streak: 0,
  locked: false,
  missed: [],
  sound: true,
  length: 10
};

let audioContext;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(screen) {
  [startScreen, gameScreen, resultScreen].forEach((section) => {
    const active = section === screen;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectedLength() {
  const selected = document.querySelector('input[name="roundLength"]:checked');
  return Number(selected?.value || 10);
}

function startQuiz(length = selectedLength()) {
  const safeLength = [10, 20, 36].includes(Number(length)) ? Number(length) : 10;
  state = {
    ...state,
    round: shuffle(QUESTIONS).slice(0, safeLength),
    index: 0,
    score: 0,
    correct: 0,
    streak: 0,
    locked: false,
    missed: [],
    length: safeLength
  };
  questionTotal.textContent = String(safeLength);
  scoreValue.textContent = "0";
  streakValue.textContent = "0";
  showScreen(gameScreen);
  renderQuestion();
  return { status: "started", questionCount: safeLength };
}

function makeOptions(question) {
  const topicPool = QUESTIONS
    .filter((item) => item.topic === question.topic && item.a !== question.a)
    .map((item) => item.a);
  const allPool = QUESTIONS.filter((item) => item.a !== question.a).map((item) => item.a);
  const candidatePool = question.wrong ? [...question.wrong] : shuffle(topicPool);
  for (const candidate of shuffle(allPool)) {
    if (candidatePool.length >= 3) break;
    if (!candidatePool.includes(candidate)) candidatePool.push(candidate);
  }
  const wrongAnswers = shuffle([...new Set(candidatePool)]).slice(0, 3);
  return shuffle([question.a, ...wrongAnswers]);
}

function applyTopic(topic) {
  const style = TOPICS[topic];
  document.documentElement.style.setProperty("--topic", style.color);
  document.documentElement.style.setProperty("--topic-pale", style.pale);
  topicPill.textContent = topic;
  sceneName.textContent = topic;
  sceneIcon.textContent = style.icon;
}

function renderQuestion() {
  const question = state.round[state.index];
  if (!question) {
    finishQuiz();
    return;
  }
  state.locked = false;
  applyTopic(question.topic);
  questionNumber.textContent = String(state.index + 1);
  progressBar.style.width = `${(state.index / state.round.length) * 100}%`;
  questionText.textContent = question.q;
  feedback.textContent = "";
  feedback.className = "feedback";
  answersGrid.replaceChildren();

  makeOptions(question).forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.answer = option;
    button.dataset.index = String(index);
    button.innerHTML = `<span class="answer-key" aria-hidden="true">${index + 1}</span><span class="answer-copy"></span>`;
    button.querySelector(".answer-copy").textContent = option;
    button.setAttribute("aria-label", `Answer ${index + 1}: ${option}`);
    button.addEventListener("click", () => chooseAnswer(index));
    answersGrid.append(button);
  });

  questionCard.classList.remove("entering");
  void questionCard.offsetWidth;
  questionCard.classList.add("entering");
  requestAnimationFrame(() => answersGrid.querySelector("button")?.focus({ preventScroll: true }));
}

function chooseAnswer(index) {
  if (state.locked || startScreen.classList.contains("is-active") || resultScreen.classList.contains("is-active")) {
    return { status: "ignored" };
  }
  const buttons = [...answersGrid.querySelectorAll(".answer-button")];
  const selected = buttons[index];
  if (!selected) throw new Error("Answer index must be between 0 and 3.");

  state.locked = true;
  buttons.forEach((button) => { button.disabled = true; });
  const question = state.round[state.index];
  const isCorrect = selected.dataset.answer === question.a;
  const correctButton = buttons.find((button) => button.dataset.answer === question.a);

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    const earned = 100 + Math.min(state.streak, 5) * 25;
    state.score += earned;
    selected.classList.add("correct");
    feedback.textContent = state.streak > 2 ? `Excellent! +${earned} points — streak bonus!` : `Correct! +${earned} points`;
    feedback.classList.add("correct-text");
    playCorrectTone();
    burstConfetti(state.streak >= 3 ? 55 : 30);
    mascotGame.classList.remove("celebrate");
    void mascotGame.offsetWidth;
    mascotGame.classList.add("celebrate");
  } else {
    state.streak = 0;
    state.missed.push(question);
    selected.classList.add("wrong");
    correctButton?.classList.add("correct");
    feedback.textContent = `Good try! The answer is: ${question.a}`;
    feedback.classList.add("wrong-text");
    playWrongTone();
  }

  buttons.forEach((button) => {
    if (!button.classList.contains("correct") && !button.classList.contains("wrong")) button.classList.add("dimmed");
  });
  scoreValue.textContent = state.score.toLocaleString();
  streakValue.textContent = String(state.streak);
  streakChip.classList.remove("bump");
  void streakChip.offsetWidth;
  streakChip.classList.add("bump");
  progressBar.style.width = `${((state.index + 1) / state.round.length) * 100}%`;

  window.setTimeout(() => {
    state.index += 1;
    if (state.index >= state.round.length) finishQuiz();
    else renderQuestion();
  }, isCorrect ? 1150 : 1700);

  return { status: "answered", correct: isCorrect, correctAnswer: question.a, score: state.score };
}

function finishQuiz() {
  const accuracy = Math.round((state.correct / state.round.length) * 100);
  const bestKey = `virginiaStudiesVS6Best-${state.round.length}`;
  const previousBest = Number(localStorage.getItem(bestKey) || 0);
  const best = Math.max(previousBest, state.score);
  localStorage.setItem(bestKey, String(best));

  correctResult.textContent = `${state.correct}/${state.round.length}`;
  accuracyResult.textContent = `${accuracy}%`;
  scoreResult.textContent = state.score.toLocaleString();
  bestResult.textContent = best.toLocaleString();

  if (accuracy >= 90) {
    resultTitle.textContent = "Virginia history hero";
    resultMessage.textContent = "Outstanding! You mastered Virginia's founding story and westward journey.";
    resultMedal.textContent = "🏆";
  } else if (accuracy >= 70) {
    resultTitle.textContent = "Nation trailblazer";
    resultMessage.textContent = "Great work! You know Virginia's people, documents, and ideas.";
    resultMedal.textContent = "🥇";
  } else if (accuracy >= 50) {
    resultTitle.textContent = "Clever explorer";
    resultMessage.textContent = "Nice quest! Review a few clues and your next score will climb.";
    resultMedal.textContent = "🧭";
  } else {
    resultTitle.textContent = "Brave beginner";
    resultMessage.textContent = "Every explorer starts somewhere. Review the clues and try again!";
    resultMedal.textContent = "🗺️";
  }

  reviewList.replaceChildren();
  if (state.missed.length) {
    reviewPanel.hidden = false;
    state.missed.slice(0, 5).forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong></strong> <span></span>`;
      li.querySelector("strong").textContent = item.q;
      li.querySelector("span").textContent = ` ${item.a}`;
      reviewList.append(li);
    });
    if (state.missed.length > 5) {
      const li = document.createElement("li");
      li.textContent = `Plus ${state.missed.length - 5} more clue${state.missed.length - 5 === 1 ? "" : "s"} to discover next round.`;
      reviewList.append(li);
    }
  } else {
    reviewPanel.hidden = true;
  }

  showScreen(resultScreen);
  burstConfetti(120);
  playVictoryTone();
}

function goHome() {
  state.locked = true;
  showScreen(startScreen);
}

function toggleSound() {
  state.sound = !state.sound;
  soundButton.setAttribute("aria-pressed", String(state.sound));
  soundIcon.textContent = state.sound ? "🔊" : "🔇";
  soundLabel.textContent = state.sound ? "Sound on" : "Sound off";
  if (state.sound) playNotes([440], 0.08, "sine");
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
  return audioContext;
}

function playNotes(frequencies, duration = 0.12, type = "triangle") {
  if (!state.sound) return;
  const context = ensureAudio();
  if (!context) return;
  frequencies.forEach((frequency, i) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + i * duration * 0.72;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  });
}

function playCorrectTone() { playNotes([523.25, 659.25, 783.99], 0.13, "triangle"); }
function playWrongTone() { playNotes([246.94, 196], 0.17, "sine"); }
function playVictoryTone() { playNotes([392, 523.25, 659.25, 783.99], 0.18, "triangle"); }

function burstConfetti(count) {
  const colors = ["#ffd34e", "#2476d5", "#33b86b", "#ef5b5e", "#8d49c7", "#ff8f2d", "#ffffff"];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--fall-time", `${1.9 + Math.random() * 1.7}s`);
    piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiLayer.append(piece);
    window.setTimeout(() => piece.remove(), 3900);
  }
}

function getQuizState() {
  const current = state.round[state.index];
  return {
    screen: startScreen.classList.contains("is-active") ? "start" : resultScreen.classList.contains("is-active") ? "results" : "game",
    questionNumber: current ? state.index + 1 : null,
    totalQuestions: state.round.length || null,
    topic: current?.topic || null,
    prompt: current?.q || null,
    answerChoices: current ? [...answersGrid.querySelectorAll(".answer-copy")].map((node) => node.textContent) : [],
    score: state.score,
    streak: state.streak,
    correctCount: state.correct
  };
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool) => {
    try {
      Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch (_) {
      // The visible game remains fully usable if WebMCP is unavailable.
    }
  };

  register({
    name: "start_quiz_round",
    title: "Start Virginia quiz round",
    description: "Start a new visible Virginia Studies Quest round with 10, 20, or 36 questions.",
    inputSchema: {
      type: "object",
      properties: { questionCount: { type: "integer", enum: [10, 20, 36] } },
      required: ["questionCount"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (![10, 20, 36].includes(input?.questionCount)) throw new Error("questionCount must be 10, 20, or 36.");
      return startQuiz(input.questionCount);
    }
  });

  register({
    name: "answer_current_question",
    title: "Answer current quiz question",
    description: "Choose answer 1, 2, 3, or 4 for the visible quiz question and update the game score.",
    inputSchema: {
      type: "object",
      properties: { answerNumber: { type: "integer", minimum: 1, maximum: 4 } },
      required: ["answerNumber"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!Number.isInteger(input?.answerNumber) || input.answerNumber < 1 || input.answerNumber > 4) {
        throw new Error("answerNumber must be an integer from 1 to 4.");
      }
      return chooseAnswer(input.answerNumber - 1);
    }
  });

  register({
    name: "read_quiz_state",
    title: "Read quiz state",
    description: "Read the visible quiz question, answer choices, progress, score, and streak without changing the game.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() { return getQuizState(); }
  });
}

startButton.addEventListener("click", () => startQuiz());
playAgainButton.addEventListener("click", () => startQuiz(state.length));
changeQuestButton.addEventListener("click", goHome);
homeButton.addEventListener("click", goHome);
soundButton.addEventListener("click", toggleSound);

document.addEventListener("keydown", (event) => {
  if (!gameScreen.classList.contains("is-active") || state.locked) return;
  const number = Number(event.key);
  if (number >= 1 && number <= 4) {
    event.preventDefault();
    chooseAnswer(number - 1);
  }
});

registerWebMcpTools();
