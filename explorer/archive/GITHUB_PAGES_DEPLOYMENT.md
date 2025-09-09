# Deploying ASI Chain Explorer to GitHub Pages

## Overview

Yes, this app can absolutely be deployed as a frontend-only application on GitHub Pages! The Apollo GraphQL client runs entirely in the browser and connects to your Hasura GraphQL endpoint.

## Architecture

```
GitHub Pages (Static Site) → Browser (Apollo Client) → Hasura GraphQL API → PostgreSQL
```

## Prerequisites

1. **Hasura instance accessible from the internet** (not localhost)
   - Can be hosted on Hasura Cloud, Heroku, AWS, etc.
   - Must have CORS enabled for your GitHub Pages domain

2. **Public read access configured in Hasura** (or use admin secret)

## Deployment Steps

### 1. Configure Environment Variables

Create GitHub repository secrets:
- `REACT_APP_GRAPHQL_URL`: Your Hasura GraphQL endpoint (e.g., https://your-app.hasura.app/v1/graphql)
- `REACT_APP_GRAPHQL_WS_URL`: WebSocket endpoint (e.g., wss://your-app.hasura.app/v1/graphql)
- `REACT_APP_HASURA_ADMIN_SECRET`: Optional - can leave empty if using public role

### 2. Enable GitHub Pages

1. Go to Settings → Pages in your repository
2. Set source to "GitHub Actions"

### 3. Push to Main Branch

The GitHub Action will automatically:
1. Build the React app
2. Deploy to GitHub Pages

### 4. Configure Hasura CORS

In your Hasura instance, add CORS configuration:

```json
{
  "cors_config": {
    "allowed_origins": [
      "https://yourusername.github.io",
      "https://your-custom-domain.com"
    ]
  }
}
```

## Manual Deployment

```bash
# Build for production
npm run build

# Deploy to GitHub Pages manually
npm install -g gh-pages
gh-pages -d build
```

## Custom Domain

To use a custom domain:
1. Add a `CNAME` file in the `public/` folder with your domain
2. Configure DNS settings as per GitHub's documentation

## Security Considerations

### Option 1: Public Read Access (Recommended)
Configure Hasura to allow public read access:
- No admin secret needed in frontend
- More secure for public deployment
- Configure in Hasura Console → Permissions

### Option 2: Admin Secret (Less Secure)
- Store admin secret in GitHub Secrets
- Only use for private/internal deployments
- Consider using a read-only admin secret

## Hosting Hasura for Free/Low Cost

1. **Hasura Cloud** - Free tier available
2. **Railway** - Easy deployment with PostgreSQL
3. **Render** - Free PostgreSQL + Docker hosting
4. **Fly.io** - Generous free tier

## Example Hasura Cloud Setup

1. Sign up at https://cloud.hasura.io
2. Create new project
3. Connect your PostgreSQL database
4. Import metadata from your local setup
5. Enable public read permissions
6. Copy GraphQL endpoint URL

## Testing Production Build Locally

```bash
# Build the app
npm run build

# Serve locally
npx serve -s build

# Open http://localhost:3000
```

## Environment Variables for Production

The app automatically uses these in production:
- `REACT_APP_GRAPHQL_URL` - Your Hasura endpoint
- `REACT_APP_GRAPHQL_WS_URL` - WebSocket endpoint
- `REACT_APP_HASURA_ADMIN_SECRET` - Optional

## Limitations

1. **No server-side rendering** - Initial load might be slower
2. **API endpoint must be public** - Can't hide behind firewall
3. **CORS must be configured** - Hasura must allow your domain

## Benefits

1. **Free hosting** - GitHub Pages is free
2. **Automatic deployment** - Push to deploy
3. **CDN included** - Fast global delivery
4. **HTTPS by default** - Secure connection
5. **No server maintenance** - It's just static files

## Summary

Your ASI Chain Explorer is already a frontend-only app that:
- Runs entirely in the browser
- Uses Apollo Client for GraphQL
- Connects to Hasura from the browser
- Can be deployed to any static hosting service

Just point it to a publicly accessible Hasura instance instead of localhost, and you're ready to deploy!