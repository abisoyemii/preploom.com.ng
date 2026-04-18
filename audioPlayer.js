export function playAudio(text) {
  if (!text) return;

  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speech.pitch = 1;
  speech.lang = "en-US";

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}
