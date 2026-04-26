<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/66573eaa-a1ce-4bf8-8a8b-ed0ebd42e96c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` and `OPENAI_API_KEY` in `.env` to your API keys.
3. (Optional) Set `VITE_APP_PASSWORD` in `.env` to protect your app with a password.
4. Run the app:
   `npm run dev`

## Authentication & Security

To protect your app from unauthorized users on Render, we've implemented a simple password gate.

### Setup on Render:
1. Go to your **Render Dashboard**.
2. Select your `promptcrafter` service.
3. Go to **Environment**.
4. Add a new environment variable:
   - Key: `VITE_APP_PASSWORD`
   - Value: `your-secure-password`
5. Save changes. The app will redeploy and prompt for this password on the first visit.

For professional-grade authentication (Google Login, User Management), we recommend integrating **Clerk**.
