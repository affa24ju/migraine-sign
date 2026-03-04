# Migraine Sign

A web application that recognizes Swedish Sign Language (SSL) gestures to support communication during severe migraine attacks.  
This project is developed as a final thesis project within the **Java Developer program at Jönköping University (Higher Vocational Education, Sweden)**, with a focus on accessibility, AI-assisted interaction, and low-stimulus interface design.

## Overview

This application uses the device camera together with a Google Teachable Machine pose detection model to recognize hand and body gestures in real time.

When a gesture is detected and held steadily for at least **600 ms**, the application displays the corresponding Swedish message on screen. The interface is intentionally designed using **low-stimulus design principles** to reduce visual and cognitive load for users experiencing migraine symptoms.

The goal is to enable communication without speaking, listening, or interacting with bright or complex interfaces.

## Tech Stack

- **Next.js** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **TensorFlow.js 1.3.1** (CDN)
- **Google Teachable Machine** pose model (`@teachablemachine/pose`)

## Project Scope

This is a **research prototype**, not a full sign language translation system.

The application focuses on:
- One-way communication (signer → viewer)
- A limited vocabulary of essential migraine-related gestures
- Accessibility and usability evaluation

## Thesis Context

This project investigates how AI-based gesture recognition can support communication in low-stimulus situations where speech and sound may be painful or difficult, such as during migraine attacks.

The research explores:
- AI-assisted accessibility tools
- Low-stimulus interface design
- Practical limitations of client-side gesture recognition  

## Gesture Model

- 11 gesture classes trained with PoseNet MobileNetV1
- Model files located in `public/model/` (`model.json`, `weights.bin`, `metadata.json`)
- Class `'Ingen gest'` (no gesture) shows nothing
- All other classes map to Swedish phrases displayed via `MessageDisplay`

## Project Structure

```
app/
  page.tsx              # Root — holds detectedClass state, wires components
  layout.tsx            # Loads TF.js + Teachable Machine from CDN
  components/
    PoseDetector.tsx    # Camera feed, pose inference loop, gesture debouncing
    MessageDisplay.tsx  # Maps gesture class name → Swedish message string
public/
  model/                # Teachable Machine model files
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Allow camera access when prompted. Hold a recognized gesture for ~0.6 seconds to trigger a message.

## Important Implementation Notes

- TF.js and `@teachablemachine/pose` are loaded via CDN (`<Script strategy="beforeInteractive">`) — **not** bundled by webpack, as that breaks internal TF.js module scope.
- TF.js version must be **1.3.1** (not 1.7.4), because the Teachable Machine bundle calls `tf.fromPixels()` which was removed in later versions.
- Inference runs on a horizontally-flipped off-screen canvas to match how the model was trained (selfie/mirror orientation).
- Gesture debounce: 600 ms of the same class before reporting.

## Disclaimer

This prototype is intended for research and educational purposes only and is not a medical device.
