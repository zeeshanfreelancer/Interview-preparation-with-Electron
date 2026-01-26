# Interview Preparation Backend Server

This is the backend server for the Interview Preparation Electron app with MongoDB Atlas integration.

## Project Structure

```
server/
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   └── Question.js          # Question schema and model
├── routes/
│   └── questions.js         # API routes for questions
├── server.js                # Main Express server
├── package.json             # Dependencies and scripts
├── README.md                # This file
└── .env                     # Environment variables (create from .env.example)
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **MongoDB Atlas Setup:**
   - Create a MongoDB Atlas account at [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create a new cluster
   - Get your connection string from Atlas dashboard

3. **Environment Configuration:**
   - Copy `.env.example` to `.env`
   - Update the `MONGODB_URI` with your Atlas connection string:
```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/interview-prep?retryWrites=true&w=majority
NODE_ENV=development
```

4. **Network Access (Atlas):**
   - In Atlas dashboard, go to Network Access
   - Add IP address `0.0.0.0/0` (allow from anywhere) for development
   - For production, restrict to your server IP

5. **Start the server:**
```bash
npm run dev  # Development with nodemon
# or
npm start    # Production
```

## API Endpoints

### Questions
- `GET /api/questions/:language` - Get all questions for a language
- `POST /api/questions` - Create a new question
- `PUT /api/questions/:id` - Update a question
- `DELETE /api/questions/:id` - Delete a question
- `GET /api/questions/search/:language?q=searchTerm` - Search questions

### Languages
- `GET /api/languages` - Get all available languages

### Health Check
- `GET /api/health` - Server health check

## Data Structure

### Question Model
```javascript
{
  language: String,      // Required: e.g., "React", "JavaScript"
  question: String,      // Required: The question text
  answer: String,        // Optional: The answer text (defaults to '')
  createdAt: Date,       // Auto-generated: Creation timestamp
  updatedAt: Date        // Auto-updated: Last modification timestamp
}
```

## Database Features

- **Indexing**: Language field is indexed for faster queries
- **Timestamps**: Automatic createdAt and updatedAt fields
- **Validation**: Required fields validation
- **Error Handling**: Comprehensive error responses

## Development

- **Hot Reload**: Uses nodemon for development
- **CORS**: Enabled for cross-origin requests
- **JSON Parsing**: Automatic JSON body parsing
- **Error Middleware**: Global error handling

## Deployment

For production deployment:
1. Set `NODE_ENV=production` in `.env`
2. Restrict MongoDB Atlas network access to your server IP
3. Use a process manager like PM2
4. Set up proper logging and monitoring