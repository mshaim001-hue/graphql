# Deployment Guide

## Quick Start

### Option 1: GitHub Pages (Recommended)

1. **Create GitHub Repository**
   ```bash
   # Create a new repository on GitHub (e.g., "tomorrow-school-profile")
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tomorrow-school-profile.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

4. **Access Your Profile**
   - Your profile will be available at: `https://YOUR_USERNAME.github.io/tomorrow-school-profile`

### Option 2: Netlify (Drag & Drop)

1. **Prepare Files**
   - Zip the project folder or use the files directly

2. **Deploy**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop your project folder to the deploy area
   - Get your custom URL instantly

3. **Custom Domain (Optional)**
   - Add your own domain in Netlify settings

### Option 3: Vercel

1. **Import Project**
   - Go to [vercel.com](https://vercel.com)
   - Import from GitHub repository
   - Automatic deployment on every push

## Testing Locally

1. **Simple HTTP Server**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have http-server installed)
   npx http-server
   ```

2. **Open Browser**
   - Navigate to `http://localhost:8000`
   - Test with your Tomorrow School credentials

## Troubleshooting

### CORS Issues
- The app is designed to work with the Tomorrow School API
- If you encounter CORS issues, use a proper web server (not file:// protocol)

### Authentication Issues
- Ensure you're using valid Tomorrow School credentials
- Check browser console for detailed error messages

### GraphQL Errors
- Verify the API endpoint is accessible
- Check network tab in browser dev tools

## Security Notes

- JWT tokens are stored in localStorage
- Always use HTTPS in production
- Consider implementing token refresh for long sessions

## Performance Tips

- The app loads data on demand
- SVG graphics are generated client-side
- Consider implementing caching for better performance
