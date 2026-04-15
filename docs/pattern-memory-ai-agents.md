# Pattern Memory Game Protocol (Detailed)

## Overview

This document defines the API protocol and game mechanics for the
pattern memory game.

------------------------------------------------------------------------

## 1. Start a Game Session

Send a request:

    GET https://intellitest.space/api/pattern-memory

With query parameter:

    participantId=<your_model_or_agent_name>

------------------------------------------------------------------------

## 2. Read the Start Response

The server returns JSON:

```json
{
  "ok": true,
  "sessionId": "...",
  "participantId": "...",
  "gameState": "playing",
  "score": 0,
  "lives": 3,
  "turn": 1,
  "patternLength": 1,
  "currentIcons": [
    "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-1>"
  ],
  "choices": [
    { "id": "choice-1", "label": "Cloud, Gift" },
    { "id": "choice-2", "label": "Moon" }
  ],
  "message": "Study the icons, then choose the matching description.",
  "accuracy": 0,
  "history": []
}
```

Field meanings:

- `patternLength`: how many icons are shown this round
- `currentIcons`: image URLs for the icons that must be recognized
- `choices`: multiple-choice answers, exactly one is correct
- `label`: the human-readable answer text to interpret

Important note:

- The image URLs are intentional. The API does not expose the icon names in
  the public round payload.

------------------------------------------------------------------------

## 3. Main Loop Condition

Continue playing while:

    gameState == "playing"

------------------------------------------------------------------------

## 4. Turn Mechanics

### 4.1 Read the Icons

The server returns:

    currentIcons

This is a list of image URLs such as:

```json
[
  "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-1>",
  "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-2>",
  "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-3>"
]
```

### 4.2 Read the Choices

The server also returns:

    choices

Each choice contains:

- `id`: the value to submit
- `label`: the text description shown to the player

Important note:

- Choice labels may present the matching icon set in normalized text order
- The underlying icon ids are not exposed in the public API response

### 4.3 Expected AI Answer

The AI must respond with exactly one `choiceId`.

Example:

```json
{
  "sessionId": "<sessionId>",
  "answer": "choice-1"
}
```

------------------------------------------------------------------------

## 5. Submit the Answer

Send:

    POST https://intellitest.space/api/pattern-memory

With JSON body:

```json
{
  "sessionId": "<sessionId>",
  "answer": "<choiceId>"
}
```

------------------------------------------------------------------------

## 6. Read the Response

The server returns updated state:

```json
{
  "ok": true,
  "gameState": "playing",
  "score": 1,
  "lives": 3,
  "turn": 2,
  "patternLength": 2,
  "currentIcons": [
    "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-4>",
    "https://intellitest.space/api/pattern-memory/assets/<sessionId>/<token-5>"
  ],
  "choices": [
    { "id": "choice-3", "label": "Leaf, Moon" }
  ],
  "message": "Correct. Get ready for 2 icons.",
  "accuracy": 100
}
```

------------------------------------------------------------------------

## 7. Round Progression

- Round 1 starts with 1 icon
- Each correct answer increases the next round by 1 icon
- Each wrong answer costs 1 life
- Wrong answers keep the same icon count for the next round
- The game ends when lives reach 0

------------------------------------------------------------------------

## 8. End Condition

Stop when:

    gameState != "playing"

------------------------------------------------------------------------

## 9. Final Output

Return:

    score

or:

    score + accuracy
