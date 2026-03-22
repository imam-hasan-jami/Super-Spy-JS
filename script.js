const setupForm = document.getElementById("setupForm");
const playerCountInput = document.getElementById("playerCount");
const spyCountInput = document.getElementById("spyCount");
const timerSecondsInput = document.getElementById("timerSeconds");
const setupError = document.getElementById("setupError");
const startGameButton = setupForm.querySelector('button[type="submit"]');

const setupPanel = document.getElementById("setupPanel");
const gamePanel = document.getElementById("gamePanel");
const turnTitle = document.getElementById("turnTitle");
const instruction = document.getElementById("instruction");
const fortuneCard = document.getElementById("fortuneCard");
const revealButton = document.getElementById("revealButton");
const timerDisplay = document.getElementById("timerDisplay");
const gameMessage = document.getElementById("gameMessage");
const newGameButton = document.getElementById("newGameButton");

const PHASE = {
  WAITING_TO_REVEAL: "waiting-to-reveal",
  REVEALED: "revealed",
  DISCUSSION: "discussion",
  OVER: "over",
};

const gameState = {
  players: 0,
  spies: 0,
  secretWord: "",
  timerSeconds: 0,
  playerRoles: [],
  currentPlayer: 1,
  phase: PHASE.WAITING_TO_REVEAL,
  timerId: null,
  remainingSeconds: 0,
};

function clampSpyInputRange() {
  const players = Number(playerCountInput.value);
  const maxSpies = Math.max(1, players - 1);

  spyCountInput.max = String(maxSpies);

  if (players === 3) {
    spyCountInput.value = "1";
    spyCountInput.disabled = true;
  } else {
    spyCountInput.disabled = false;
    const currentSpies = Number(spyCountInput.value);
    if (currentSpies > maxSpies) {
      spyCountInput.value = String(maxSpies);
    }
    if (currentSpies < 1 || Number.isNaN(currentSpies)) {
      spyCountInput.value = "1";
    }
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clearRunningTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function validateSetup() {
  const players = Number(playerCountInput.value);
  const spies = Number(spyCountInput.value);
  const timerSeconds = Number(timerSecondsInput.value);

  if (!Number.isInteger(players) || players < 3 || players > 30) {
    return "Players must be between 3 and 30.";
  }

  if (!Number.isInteger(spies) || spies < 1 || spies >= players) {
    return "Spies must be at least 1 and less than total players.";
  }

  if (players === 3 && spies !== 1) {
    return "For 3 players, spy count must be exactly 1.";
  }

  if (!Number.isInteger(timerSeconds) || timerSeconds < 10) {
    return "Timer must be at least 10 seconds.";
  }

  return "";
}

function generateRoles(playerCount, spyCount) {
  const roles = Array(playerCount).fill("civilian");
  const usedIndexes = new Set();

  while (usedIndexes.size < spyCount) {
    const randomIndex = Math.floor(Math.random() * playerCount);
    usedIndexes.add(randomIndex);
  }

  usedIndexes.forEach((index) => {
    roles[index] = "spy";
  });

  return roles;
}

function resetGameUI() {
  gameMessage.textContent = "";
  timerDisplay.textContent = "--:--";
  fortuneCard.textContent = "";
  fortuneCard.classList.add("hidden");
  revealButton.disabled = false;
}

async function fetchRandomWord() {
  const response = await fetch("https://api.api-ninjas.com/v2/randomword", {
    method: "GET",
    headers: {
      "X-Api-Key": "3RiYiVIMzUJI33uDzPl4l2gLIg66sZVzkTbuGyFy",
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Word API failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload && typeof payload.word === "string" && payload.word.trim()) {
    return payload.word.trim();
  }

  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === "string" && payload[0].trim()) {
    return payload[0].trim();
  }

  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0]?.word === "string") {
    const randomWord = payload[0].word.trim();
    if (randomWord) {
      return randomWord;
    }
  }

  throw new Error("Word API returned an unexpected response format.");
}

function startGame(secretWord) {
  gameState.players = Number(playerCountInput.value);
  gameState.spies = Number(spyCountInput.value);
  gameState.secretWord = secretWord;
  gameState.timerSeconds = Number(timerSecondsInput.value);
  gameState.playerRoles = generateRoles(gameState.players, gameState.spies);
  gameState.currentPlayer = 1;
  gameState.phase = PHASE.WAITING_TO_REVEAL;
  gameState.remainingSeconds = gameState.timerSeconds;

  clearRunningTimer();
  resetGameUI();

  turnTitle.textContent = `Player ${gameState.currentPlayer}`;
  instruction.textContent = "Tap Reveal to see your fortune.";
  revealButton.textContent = "Reveal";

  setupPanel.classList.add("hidden");
  gamePanel.classList.remove("hidden");
}

function showCurrentPlayerFortune() {
  const index = gameState.currentPlayer - 1;
  const isSpy = gameState.playerRoles[index] === "spy";

  fortuneCard.textContent = isSpy ? "You are a spy" : gameState.secretWord;
  fortuneCard.classList.remove("hidden");

  instruction.textContent = "Memorize it, then tap Hide & Pass.";
  revealButton.textContent = "Hide & Pass";
  gameState.phase = PHASE.REVEALED;
}

function passToNextPlayerOrStartTimer() {
  fortuneCard.classList.add("hidden");
  fortuneCard.textContent = "";

  if (gameState.currentPlayer < gameState.players) {
    gameState.currentPlayer += 1;
    turnTitle.textContent = `Player ${gameState.currentPlayer}`;
    instruction.textContent = "Tap Reveal to see your fortune.";
    revealButton.textContent = "Reveal";
    gameState.phase = PHASE.WAITING_TO_REVEAL;
    return;
  }

  gameState.phase = PHASE.DISCUSSION;
  revealButton.disabled = true;
  instruction.textContent = "All players have seen their fortune.";
  gameMessage.textContent = "Discussion time has started.";
  startCountdown();
}

function startCountdown() {
  timerDisplay.textContent = formatTime(gameState.remainingSeconds);

  gameState.timerId = setInterval(() => {
    gameState.remainingSeconds -= 1;

    if (gameState.remainingSeconds <= 0) {
      clearRunningTimer();
      timerDisplay.textContent = "00:00";
      gameMessage.textContent = "Game Over";
      gameState.phase = PHASE.OVER;
      return;
    }

    timerDisplay.textContent = formatTime(gameState.remainingSeconds);
  }, 1000);
}

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const error = validateSetup();
  setupError.textContent = error;

  if (error) {
    return;
  }

  try {
    startGameButton.disabled = true;
    startGameButton.textContent = "Fetching word...";
    setupError.textContent = "Fetching random word...";

    const randomWord = await fetchRandomWord();
    setupError.textContent = "";
    startGame(randomWord);
  } catch {
    setupError.textContent = "Could not fetch random word. Please try again.";
  } finally {
    startGameButton.disabled = false;
    startGameButton.textContent = "Start Game";
  }
});

playerCountInput.addEventListener("input", () => {
  clampSpyInputRange();
});

revealButton.addEventListener("click", () => {
  if (gameState.phase === PHASE.WAITING_TO_REVEAL) {
    showCurrentPlayerFortune();
    return;
  }

  if (gameState.phase === PHASE.REVEALED) {
    passToNextPlayerOrStartTimer();
  }
});

newGameButton.addEventListener("click", () => {
  clearRunningTimer();
  setupForm.reset();
  playerCountInput.value = "3";
  timerSecondsInput.value = "60";
  clampSpyInputRange();

  setupError.textContent = "";
  gamePanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");
});

clampSpyInputRange();
