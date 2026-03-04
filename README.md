# Migraine Sign

A web application that recognizes Swedish Sign Language (SSL) gestures for migraine sufferers, built as a thesis project.

## Overview

This app uses your device camera and a Google Teachable Machine pose model to detect hand/body gestures in real time. When a recognized gesture is held for 600 ms, it displays the corresponding Swedish message on screen — designed to help migraine patients communicate without speaking or using bright screens.

## Tech Stack

- **Next.js** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **TensorFlow.js 1.3.1** (CDN)
- **Google Teachable Machine** pose model (`@teachablemachine/pose`)

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
