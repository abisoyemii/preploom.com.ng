const OpenAI = require('openai');
const { AppError } = require('../utils/errorHandler');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async gradeEssay(text, examType = 'ielts') {
    const prompt = `You are an IELTS examiner. Grade this essay (0-9 band score):
Exam: ${examType}
Essay: ${text}

Return ONLY JSON:
{
  "bandScore": 7.5,
  "criteria": {
    "taskResponse": 8.0,
    "coherence": 7.5,
    "lexical": 7.0,
    "grammar": 8.0
  },
  "feedback": "Good structure...",
  "suggestions": "Use more complex vocab"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return {
        score: result.bandScore,
        feedback: result.feedback,
        suggestions: result.suggestions,
        criteria: result.criteria,
        rawText: text.slice(0, 100) + '...'
      };
    } catch (error) {
      throw new AppError('AI grading failed', 500);
    }
  }

  async transcribeAudio(audioBuffer) {
    const form = new FormData();
    form.append('file', audioBuffer, 'speech.mp3');
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');

    try {
      const transcription = await this.openai.audio.transcriptions.create(form);
      return transcription.text;
    } catch (error) {
      throw new AppError('Speech-to-text failed', 500);
    }
  }

  async gradeSpeaking(transcript, examType = 'ielts') {
    const prompt = `Grade IELTS speaking response (0-9):
Exam: ${examType}
Transcript: ${transcript}

JSON only:
{
  "bandScore": 7.0,
  "criteria": {
    "fluency": 7.5,
    "pronunciation": 7.0,
    "vocabulary": 6.5,
    "grammar": 7.0
  },
  "feedback": "Good fluency...",
  "suggestions": "Work on pronunciation"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return {
        score: result.bandScore,
        feedback: result.feedback,
        suggestions: result.suggestions,
        criteria: result.criteria,
        transcript
      };
    } catch (error) {
      throw new AppError('AI speaking analysis failed', 500);
    }
  }

  async generateQuestions(examType, difficulty, numQuestions = 5) {
    const prompt = `You are an expert ${examType.toUpperCase()} exam question creator.
Generate exactly ${numQuestions} ${difficulty} level ${examType} practice questions.

Return ONLY valid JSON array:
[
  {
    "type": "mcq",
    "question": "Full question text?",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correctAnswer": "B",
    "explanation": "Detailed explanation why B is correct and others wrong."
  }
]

Question types: mcq only. Realistic ${examType} topics. Varied subjects.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content.trim();
      let questions;
      
      try {
        questions = JSON.parse(content);
      } catch {
        // Fallback: extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        questions = JSON.parse(jsonMatch[0]);
      }

      return {
        questions: Array.isArray(questions) ? questions.slice(0, numQuestions) : [],
        examType,
        difficulty,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new AppError(`Question generation failed: ${error.message}`, 500);
    }
  }
}

module.exports = new AIService();

