# Fabled Campaigns - AI-Powered Battle Map Generator

A modern web application that generates fantasy battle maps using Google's Imagen AI for tabletop RPG sessions.

## Features

- **AI-Powered Map Generation**: Uses Google Imagen 3.0 for high-quality fantasy battle maps
- **Customizable Parameters**: Choose terrain, setting, size, and add detailed descriptions
- **Instant Download**: Download generated maps in PNG format
- **Map Gallery**: Browse and filter previously generated maps
- **Responsive Design**: Works on desktop and mobile devices
- **Rate Limiting**: Built-in protection against API abuse

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Vercel Serverless Functions
- **AI**: Google Imagen 3.0 via Vertex AI
- **Deployment**: Vercel
- **Security**: Environment-based credential management

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
   npm run dev
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

### POST /api/maps/generate

Generate a new fantasy battle map.

**Request Body:**
```json
{
  "name": "The Whispering Woods",
  "description": "A mystical forest clearing with ancient stone circles",
  "terrain": "forest",
  "setting": "tavern",
  "size": "size-30x30"
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
    "size": "size-30x30",
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
   - Select map size (20x20, 30x30, 40x40)
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

MIT License - see LICENSE file for details.

## Acknowledgments

- Google Imagen AI for map generation
- Vercel for hosting and serverless functions
- The tabletop RPG community for inspiration