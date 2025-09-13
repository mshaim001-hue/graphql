# Tomorrow School Profile

A modern, interactive profile page for Tomorrow School students that displays personal learning statistics and achievements using GraphQL and SVG visualizations.

## Features

### 🔐 Authentication
- **Dual Login Support**: Works with both `username:password` and `email:password`
- **JWT Token Management**: Secure authentication using Bearer tokens
- **Session Persistence**: Remembers login state across browser sessions
- **Logout Functionality**: Clean session termination

### 📊 Profile Information
- **Basic User Info**: User ID and login display
- **XP Statistics**: Total experience points, transaction count, and averages
- **Progress Tracking**: Success rates for progress and results
- **Real-time Data**: Live data from Tomorrow School's GraphQL API

### 📈 Interactive SVG Visualizations
1. **XP Timeline Graph**: Shows cumulative XP earned over time with interactive data points
2. **Audit Ratio Pie Chart**: Displays the ratio between progress and result audits
3. **Project Success Bar Chart**: Visualizes passed vs failed projects
4. **Exercise Attempts Chart**: Shows top 10 exercises by attempt count with success rates

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Gradient Backgrounds**: Beautiful color schemes and animations
- **Interactive Elements**: Hover effects and smooth transitions
- **Loading States**: User feedback during data fetching
- **Error Handling**: Graceful error messages and recovery

## Technical Implementation

### GraphQL Integration
- **API Endpoint**: `https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql`
- **Authentication**: `https://01.tomorrow-school.ai/api/auth/signin`
- **Query Types**: Normal queries, nested queries, and queries with arguments
- **Data Tables**: `user`, `transaction`, `progress`, `result`, `object`

### SVG Graphics
- **Custom SVG Generation**: All graphs created programmatically
- **Interactive Elements**: Hover tooltips and click events
- **Responsive Scaling**: Adapts to different screen sizes
- **Smooth Animations**: CSS transitions and transforms

### Security
- **JWT Token Storage**: Secure localStorage implementation
- **Bearer Authentication**: Proper API authentication headers
- **Input Validation**: Form validation and error handling
- **CORS Handling**: Proper cross-origin request management

## File Structure

```
graphql/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript application logic
└── README.md           # Project documentation
```

## Getting Started

### Local Development
1. Clone or download the project files
2. Open `index.html` in a web browser
3. Enter your Tomorrow School credentials
4. Explore your learning statistics!

### Hosting Options

#### GitHub Pages
1. Create a new GitHub repository
2. Upload all project files
3. Enable GitHub Pages in repository settings
4. Access your profile at `https://username.github.io/repository-name`

#### Netlify
1. Drag and drop the project folder to Netlify
2. Or connect your GitHub repository
3. Automatic deployment and custom domain support

#### Vercel
1. Import project from GitHub
2. Automatic deployment on every push
3. Custom domain and SSL support

## API Usage Examples

### User Information Query
```graphql
query {
  user {
    id
    login
  }
}
```

### XP Transactions Query
```graphql
query {
  transaction(where: {type: {_eq: "xp"}}) {
    id
    amount
    createdAt
    path
  }
}
```

### Progress with Nested User Data
```graphql
query {
  progress {
    id
    grade
    createdAt
    path
    object {
      name
      type
    }
  }
}
```

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Technologies Used

- **HTML5**: Semantic markup and modern features
- **CSS3**: Flexbox, Grid, animations, and responsive design
- **JavaScript ES6+**: Classes, async/await, fetch API
- **GraphQL**: Query language for API communication
- **SVG**: Scalable vector graphics for data visualization
- **JWT**: JSON Web Tokens for authentication

## Future Enhancements

- [ ] Export statistics to PDF
- [ ] Additional graph types (scatter plots, heatmaps)
- [ ] Dark mode theme
- [ ] Data filtering and date range selection
- [ ] Social sharing features
- [ ] Mobile app version

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this project.

## License

This project is created for educational purposes as part of the Tomorrow School curriculum.
