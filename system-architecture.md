# Prompt Crafter Pro - System Architecture

## Overview
Prompt Crafter Pro is a React-based web application that takes user-uploaded images (or image URLs) and generates highly detailed, descriptive prompts (such as for Midjourney or other AI image generators). It uses Vision Language Models (like Google's Gemini, and OpenAI's ChatGPT) to analyze the images and create complex prompt text based on various user-selected parameters (fidelity, art style, aspect ratio, etc.).

## Tech Stack
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (v4) + Lucide React for icons
- **AI Integration**:
  - `@google/genai` for Gemini API
  - `openai` for OpenAI API
- **State Management**: React `useState` hooks for extensive configuration panels.

## Core Files & Structure
- `src/App.tsx`: The main user interface. It handles image uploading, state management for numerous generation settings (generation mode, element retention, subject manipulation, styles, etc.), and renders the configuration panels and the output prompt areas.
- `src/lib/gemini.ts`: Contains the integration logic for the Gemini API. It defines functions like `generatePromptFromImage`, `generateFidelityPromptFromImage`, and `makePromptSafe` which take the image payloads and generation parameters, construct a detailed system instruction, and call the Gemini API.
- `src/lib/openai.ts`: (Newly added) Contains the integration logic for the OpenAI API using GPT-4o for vision tasks.

## Data Flow
1. **Input**: User uploads one or multiple images or provides an image URL.
2. **Configuration**: User sets parameters in the UI (e.g., style adherence, synthesis mode, advanced forensics).
3. **Processing**: The images are converted to base64. 
4. **AI Generation**: The base64 images and the user configurations are sent to the selected AI provider (Gemini or OpenAI). The AI analyzes the image and returns a detailed positive and negative prompt.
5. **Output**: The generated prompt is displayed to the user, who can then copy it or save it to their history.

## Configuration & Environment
API keys must be provided as environment variables to authenticate with the respective AI services. The application expects:
- `GEMINI_API_KEY`: For Google Gemini integration.
- `OPENAI_API_KEY`: For OpenAI ChatGPT integration.
