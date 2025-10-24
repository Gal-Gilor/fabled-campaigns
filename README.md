# Fabled Campaigns

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)](https://www.fabledcampaigns.com)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Powered by Google Cloud](https://img.shields.io/badge/Powered%20by-Google%20Cloud-4285F4?logo=google-cloud)](https://cloud.google.com/vertex-ai)

> **Where Every Tale Rolls a Natural 20**

A comprehensive tabletop RPG toolkit that helps Dungeon Masters bring their campaigns to life. Currently featuring Gemini-powered battle map generation, with campaign writing assistance in development.

**[Visit www.fabledcampaigns.com](https://www.fabledcampaigns.com)**

## Why This Project Matters

Creating engaging content for tabletop RPG sessions is time-consuming and often requires skills most Dungeon Masters don't have or time to perfect. Fabled Campaigns solves this by leveraging Google's Gemini and Imagen models to help DMs prepare faster and run better games.

**The Problem:**
- Dungeon Masters spend hours creating maps and campaign content
- Pre-made content rarely matches the specific needs of a campaign
- Quality creation tools are expensive or have steep learning curves

**The Solution:**
- Generate custom battle maps in under 30 seconds
- Campaign writing assistance (coming soon) powered by Gemini

---

## Current Features

### Gemini-Powered Map Generation
Leverages Google's Imagen 3.0 to create detailed fantasy battle maps optimized for tabletop RPG gameplay.

### Smart Customization
- **Terrain Types**: Forest, mountain, desert, swamp, underground, and more
- **Settings**: Taverns, fortresses, temples, ruins, caves, villages
- **Detail Levels**: Close-up detailed view or wide-area bird's eye view
- **Generation Modes**: Quick generation or detailed rendering

### User-Friendly Experience
- Clean, modern interface designed for simplicity
- Responsive design works on desktop, tablet, and mobile
- Instant download in PNG format
- Browse and filter previously generated maps in the gallery

## Coming Soon

### Campaign Writing Assistant
Gemini-powered tools to help Dungeon Masters craft compelling narratives:
- Generate campaign hooks and story arcs
- Create detailed NPC backgrounds and motivations
- Develop session notes and adventure outlines
- Build interconnected story elements

### NPC Name and Personality Generator
Generate unique NPCs with contextually appropriate names and rich personalities.

### Magic Item and Treasure Generators
Create custom magic items, treasure hoards, and loot tables for your campaigns.

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Google Cloud Platform account
- Vercel account (for deployment)

### 2. Google Cloud Setup

1. **Create a Google Cloud Project**
   ```bash
   # Install Google Cloud CLI if not already installed
   # Visit: https://cloud.google.com/sdk/docs/install
   
   # Create new project
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

2. **Enable Required APIs**
   ```bash
   # Enable Vertex AI API
   gcloud services enable aiplatform.googleapis.com
   
   # Enable required authentication APIs
   gcloud services enable iam.googleapis.com
   ```

3. **Create Service Account**
   ```bash
   # Create service account
   gcloud iam service-accounts create fabled-campaigns-ai \
     --display-name="Fabled Campaigns AI Service Account"
   
   # Grant necessary roles
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:fabled-campaigns-ai@your-project-id.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   
   # Create and download key file
   gcloud iam service-accounts keys create ./service-account.json \
     --iam-account=fabled-campaigns-ai@your-project-id.iam.gserviceaccount.com
   ```

4. **Encode Service Account for Vercel**
   ```bash
   # Encode the service account JSON to base64
   base64 -i service-account.json
   
   # Copy the output for use in Vercel environment variables
   ```

### 3. Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd fabled-campaigns
   npm install
   ```

2. **Environment Variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your values
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   NODE_ENV=development
   ```

3. **Start Development Server**
   ```bash
   npm start
   # or
   npm run serve
   ```

### 4. Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel**
   
   Go to your Vercel project dashboard and add these environment variables:
   
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_SERVICE_ACCOUNT_KEY=<base64-encoded-service-account-json>
   NODE_ENV=production
   ```

## API Documentation

### POST /api/maps/generateMap

Generate a new fantasy battle map.

**Request Body:**
```json
{
  "name": "The Whispering Woods",
  "description": "A mystical forest clearing with ancient stone circles",
  "terrain": "forest",
  "setting": "tavern",
  "detailLevel": "detail-low",
  "generationMode": "detailed"
}
```

**Response:**
```json
{
  "success": true,
  "mapId": "map_1234567890_abc123",
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "metadata": {
    "name": "The Whispering Woods",
    "description": "A mystical forest clearing with ancient stone circles",
    "terrain": "forest",
    "setting": "tavern",
    "detailLevel": "detail-low",
    "generationMode": "detailed",
    "generatedAt": "2025-01-10T12:00:00.000Z",
    "model": "imagen-3.0-generate-002"
  }
}
```

## Security Features

- **Credential Security**: Service account keys stored as environment variables
- **Rate Limiting**: 5 requests per 15 minutes per IP
- **Input Validation**: Comprehensive parameter validation
- **CORS Protection**: Proper CORS headers configured
- **Error Handling**: No sensitive information exposed in errors

## Usage

1. **Access the Application**: Navigate to your deployed URL or `http://localhost:3000`

2. **Generate a Map**:
   - Fill in the map name and description
   - Select terrain type (forest, mountain, desert, etc.)
   - Choose setting (tavern, village, fortress, etc.)
   - Select detail level (close-up detailed or wide-area view)
   - Click "Roll to Quest"

3. **Download Maps**: Click the download button to save maps as PNG files

4. **Browse Gallery**: View and filter previously generated maps

## Troubleshooting

### Common Issues

1. **API Authentication Errors**
   - Verify `GOOGLE_SERVICE_ACCOUNT_KEY` is correctly base64 encoded
   - Check that the service account has `roles/aiplatform.user` permissions
   - Ensure Vertex AI API is enabled in your Google Cloud project

2. **Rate Limiting**
   - Wait 15 minutes between batches of requests
   - Consider implementing user authentication for higher limits

3. **Map Generation Fails**
   - Check Google Cloud quotas and billing
   - Verify the Imagen model is available in your selected region
   - Review server logs for detailed error messages

### Support

For technical issues:
1. Check the browser console for client-side errors
2. Review Vercel function logs for server-side issues
3. Verify all environment variables are set correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Copyright © 2025 Fabled Campaigns. All Rights Reserved.

This website, its code, content, and associated materials are proprietary and confidential. Unauthorized copying, distribution, modification, public display, or public performance via any medium is strictly prohibited.

## Acknowledgments

- Google Imagen AI for map generation
- Vercel for hosting and serverless functions
- The tabletop RPG community for inspiration